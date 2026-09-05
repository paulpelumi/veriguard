import * as cheerio from "cheerio"

import { classifyRecallSeverity } from "@/lib/recalls/severity-classifier"
import type { RecallSeverity } from "@/types/database"

// Step 3 of the spec: used only to decide whether an unstructured
// press-release headline is recall-related at all. NAFDAC's own
// "Recalls and Alerts" category (see parseStructuredAlertsTable) already
// filters this by construction - every entry there is relevant by
// definition - so this list is only consulted for the press-release source.
const RECALL_DETECTION_KEYWORDS = [
  "recall",
  "withdraw",
  "seizure",
  "ban",
  "counterfeit",
  "substandard",
  "falsified",
  "unregistered",
  "embargo",
]

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(text)
}

export function isRecallRelated(text: string): boolean {
  return RECALL_DETECTION_KEYWORDS.some((word) => containsWord(text, word))
}

export interface ScrapedRecallCandidate {
  productName: string
  companyName: string | null
  recallReason: string
  severity: RecallSeverity
  issuedDate: string | null
  sourceUrl: string
  rawContent: string
}

// NAFDAC's tables use "DD-Mon-YY" (e.g. "19-Aug-26"). The two-digit year is
// unambiguous for the range this site actually covers (2018-2026-ish), so a
// simple century split at 50 is safe without needing a full date library.
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

// NAFDAC's "Recalls and Alerts" category (nafdac.gov.ng/category/
// recalls-and-alerts/) - the spec's original "public-health-alerts" category
// URL returns a 404 on the live site, so this replaces it as the primary
// structured source. Each row already carries date, title+link, alert type,
// product type, and manufacturer as separate columns, which is far more
// reliable than extracting a company name from free text.
export function parseStructuredAlertsTable(html: string, baseUrl: string): ScrapedRecallCandidate[] {
  const $ = cheerio.load(html)
  const candidates: ScrapedRecallCandidate[] = []

  $("tr").each((_, row) => {
    const cells = $(row).find("td")
    if (cells.length < 2) return

    const dateText = $(cells[0]).text().trim()
    const link = $(cells[1]).find("a").first()
    const title = link.text().trim()
    const href = link.attr("href")
    if (!title || !href) return

    const alertType = cells.length > 2 ? $(cells[2]).text().trim() : ""
    const productType = cells.length > 3 ? $(cells[3]).text().trim() : ""
    const manufacturer = cells.length > 4 ? $(cells[4]).text().trim() : ""

    candidates.push({
      productName: title,
      companyName: manufacturer && manufacturer !== "-" ? manufacturer : null,
      recallReason: alertType || (isRecallRelated(title) ? "NAFDAC public alert" : "NAFDAC notice"),
      severity: classifyRecallSeverity(`${title} ${alertType} ${productType}`),
      issuedDate: parseNafdacDate(dateText),
      sourceUrl: resolveUrl(href, baseUrl),
      rawContent: [dateText, title, alertType, productType, manufacturer].filter(Boolean).join(" | "),
    })
  })

  return candidates
}

// NAFDAC's press-release category has no structured columns beyond date and
// title+link (confirmed by inspection - "Excerpt/Summary: None present"), so
// entries here are only kept if the title itself contains a recall-related
// keyword (spec step 3), and company/reason both fall back to the title
// text since nothing more specific is available without fetching each
// individual article page.
export function parsePressReleaseTable(html: string, baseUrl: string): ScrapedRecallCandidate[] {
  const $ = cheerio.load(html)
  const candidates: ScrapedRecallCandidate[] = []

  $("tr").each((_, row) => {
    const cells = $(row).find("td")
    if (cells.length < 2) return

    const dateText = $(cells[0]).text().trim()
    const link = $(cells[1]).find("a").first()
    const title = link.text().trim()
    const href = link.attr("href")
    if (!title || !href || !isRecallRelated(title)) return

    candidates.push({
      productName: title,
      companyName: null,
      recallReason: "NAFDAC press release",
      severity: classifyRecallSeverity(title),
      issuedDate: parseNafdacDate(dateText),
      sourceUrl: resolveUrl(href, baseUrl),
      rawContent: [dateText, title].join(" | "),
    })
  })

  return candidates
}

// Applied to whichever source's candidates after parsing - filters to
// entries published within the given window (spec: "last 7 days").
export function withinDays(candidate: ScrapedRecallCandidate, days: number): boolean {
  if (!candidate.issuedDate) return false
  const issuedMs = new Date(candidate.issuedDate).getTime()
  if (Number.isNaN(issuedMs)) return false
  return Date.now() - issuedMs <= days * 24 * 60 * 60 * 1000
}
