import { NextResponse } from "next/server"

import {
  parsePressReleaseTable,
  parseStructuredAlertsTable,
  withinDays,
  type ScrapedRecallCandidate,
} from "@/lib/recalls/recall-parser"
import { createClient } from "@/lib/supabase/server"

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
const FETCH_TIMEOUT_MS = 12000
const LOOKBACK_DAYS = 7

const SOURCES = [
  { url: "https://nafdac.gov.ng/category/recalls-and-alerts/", parser: parseStructuredAlertsTable },
  { url: "https://nafdac.gov.ng/category/press-release/", parser: parsePressReleaseTable },
] as const

interface SourceResult {
  source: string
  ok: boolean
  candidates: number
  error?: string
}

async function fetchSource(url: string): Promise<string | { error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    })
    if (!response.ok) return { error: `HTTP ${response.status}` }
    return await response.text()
  } catch (error) {
    return { error: error instanceof Error ? error.message : "network_error" }
  } finally {
    clearTimeout(timeout)
  }
}

// Manual equivalent of the scheduled supabase/functions/recall-scraper Edge
// Function, for the admin dashboard's "Trigger manual scrape run" button
// (Module 7). Runs the same shared parsing logic directly rather than
// proxying to the deployed function, so this works without an admin needing
// the function's URL/secret. The Edge Function still owns the daily
// schedule - this route is purely for on-demand runs and local testing.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "unauthorized" } },
      { status: 401 }
    )
  }

  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) {
    return NextResponse.json(
      { error: { message: "Admin access required", code: "forbidden" } },
      { status: 403 }
    )
  }

  const sourceResults: SourceResult[] = []
  const allCandidates: ScrapedRecallCandidate[] = []

  for (const { url, parser } of SOURCES) {
    const fetched = await fetchSource(url)
    if (typeof fetched !== "string") {
      sourceResults.push({ source: url, ok: false, candidates: 0, error: fetched.error })
      continue
    }
    const candidates = parser(fetched, url).filter((c) => withinDays(c, LOOKBACK_DAYS))
    allCandidates.push(...candidates)
    sourceResults.push({ source: url, ok: true, candidates: candidates.length })
  }

  if (allCandidates.length === 0) {
    return NextResponse.json({ inserted: 0, sources: sourceResults })
  }

  const rows = allCandidates.map((c) => ({
    nafdac_number: null,
    product_name: c.productName,
    company_name: c.companyName,
    recall_reason: c.recallReason,
    severity: c.severity,
    issued_date: c.issuedDate,
    source_url: c.sourceUrl,
    raw_content: c.rawContent,
    auto_detected: true,
    scraped_at: new Date().toISOString(),
    is_active: true,
  }))

  const { data: inserted, error } = await supabase
    .from("recall_alerts")
    .upsert(rows, { onConflict: "source_url", ignoreDuplicates: true })
    .select("id")

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "insert_failed" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ inserted: inserted?.length ?? 0, sources: sourceResults })
}
