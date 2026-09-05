// Phase 3, Module 5: NAFDAC Recall Scraper.
// Deploy via the Supabase Dashboard's Edge Functions "Via Editor" flow, then
// schedule it with pg_cron + pg_net to run daily at 7am WAT (same pattern
// as expiry-checker and anomaly-detector).
//
// Uses the same `cheerio` library as the Next.js-side lib/recalls/
// recall-parser.ts (via Supabase's supported `npm:` specifier) rather than a
// different Deno HTML parser, so the two implementations behave identically
// even though the code itself is duplicated here (Edge Functions run in an
// isolated Deno runtime and can't import from the app - see the same note
// in anomaly-detector/index.ts).
//
// The spec's original second source URL
// (nafdac.gov.ng/category/public-health-alerts/) returns a 404 on the live
// site. nafdac.gov.ng/category/recalls-and-alerts/ is the real, working
// equivalent - confirmed by inspection - and its table already has
// separate Date / Title+link / Alert Type / Product Type / Manufacturer
// columns, which is far more reliable than extracting a company name from
// free text. The press-release category has no such columns, so entries
// from it are only kept when the title itself matches a recall keyword
// (spec step 3).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as cheerio from "npm:cheerio@1"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
const FETCH_TIMEOUT_MS = 12000
const LOOKBACK_DAYS = 7

const SOURCES = [
  { url: "https://nafdac.gov.ng/category/recalls-and-alerts/", structured: true },
  { url: "https://nafdac.gov.ng/category/press-release/", structured: false },
] as const

const RECALL_DETECTION_KEYWORDS = [
  "recall", "withdraw", "seizure", "ban", "counterfeit",
  "substandard", "falsified", "unregistered", "embargo",
]

const SEVERITY_KEYWORDS: { severity: string; words: string[] }[] = [
  { severity: "critical", words: ["toxic", "death", "fatality", "poisoning", "banned"] },
  { severity: "high", words: ["recall", "withdraw", "counterfeit", "falsified"] },
  { severity: "medium", words: ["substandard", "unregistered", "seizure"] },
]

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(text)
}

function isRecallRelated(text: string): boolean {
  return RECALL_DETECTION_KEYWORDS.some((word) => containsWord(text, word))
}

function classifySeverity(text: string): string {
  for (const { severity, words } of SEVERITY_KEYWORDS) {
    if (words.some((word) => containsWord(text, word))) return severity
  }
  return "low"
}

function parseNafdacDate(text: string): string | null {
  const match = text.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/)
  if (!match) return null
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  }
  const month = months[match[2].toLowerCase()]
  if (!month) return null
  const yearNum = Number(match[3])
  const year = yearNum < 50 ? 2000 + yearNum : 1900 + yearNum
  const day = match[1].padStart(2, "0")
  return `${year}-${month}-${day}`
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return href
  }
}

interface Candidate {
  product_name: string
  company_name: string | null
  recall_reason: string
  severity: string
  issued_date: string | null
  source_url: string
  raw_content: string
}

function withinDays(issuedDate: string | null, days: number): boolean {
  if (!issuedDate) return false
  const issuedMs = new Date(issuedDate).getTime()
  if (Number.isNaN(issuedMs)) return false
  return Date.now() - issuedMs <= days * 24 * 60 * 60 * 1000
}

function parseTable(html: string, baseUrl: string, structured: boolean): Candidate[] {
  const $ = cheerio.load(html)
  const candidates: Candidate[] = []

  $("tr").each((_: number, row: unknown) => {
    const cells = $(row as never).find("td")
    if (cells.length < 2) return

    const dateText = $(cells[0]).text().trim()
    const link = $(cells[1]).find("a").first()
    const title = link.text().trim()
    const href = link.attr("href")
    if (!title || !href) return

    if (!structured && !isRecallRelated(title)) return

    const alertType = structured && cells.length > 2 ? $(cells[2]).text().trim() : ""
    const productType = structured && cells.length > 3 ? $(cells[3]).text().trim() : ""
    const manufacturer = structured && cells.length > 4 ? $(cells[4]).text().trim() : ""

    candidates.push({
      product_name: title,
      company_name: manufacturer && manufacturer !== "-" ? manufacturer : null,
      recall_reason: alertType || (structured ? "NAFDAC public alert" : "NAFDAC press release"),
      severity: classifySeverity(`${title} ${alertType} ${productType}`),
      issued_date: parseNafdacDate(dateText),
      source_url: resolveUrl(href, baseUrl),
      raw_content: [dateText, title, alertType, productType, manufacturer].filter(Boolean).join(" | "),
    })
  })

  return candidates
}

async function fetchSource(url: string): Promise<string | { error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal })
    if (!response.ok) return { error: `HTTP ${response.status}` }
    return await response.text()
  } catch (error) {
    return { error: error instanceof Error ? error.message : "network_error" }
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500 }
    )
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const sourceResults: { source: string; ok: boolean; candidates: number; error?: string }[] = []
  const allCandidates: Candidate[] = []

  for (const { url, structured } of SOURCES) {
    const fetched = await fetchSource(url)
    // A single unreachable source doesn't fail the whole run - log it and
    // move on to the next source, per spec ("do not crash, retry next run").
    if (typeof fetched !== "string") {
      sourceResults.push({ source: url, ok: false, candidates: 0, error: fetched.error })
      continue
    }
    const candidates = parseTable(fetched, url, structured).filter((c) => withinDays(c.issued_date, LOOKBACK_DAYS))
    allCandidates.push(...candidates)
    sourceResults.push({ source: url, ok: true, candidates: candidates.length })
  }

  if (allCandidates.length === 0) {
    return new Response(JSON.stringify({ inserted: 0, sources: sourceResults }), { status: 200 })
  }

  const rows = allCandidates.map((c) => ({
    ...c,
    nafdac_number: null,
    auto_detected: true,
    scraped_at: new Date().toISOString(),
    is_active: true,
  }))

  const { data: inserted, error } = await supabase
    .from("recall_alerts")
    .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id")

  if (error) {
    return new Response(JSON.stringify({ error: `insert failed: ${error.message}`, sources: sourceResults }), {
      status: 500,
    })
  }

  return new Response(
    JSON.stringify({ inserted: inserted?.length ?? 0, sources: sourceResults }),
    { status: 200 }
  )
})
