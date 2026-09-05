// The Greenbook portal (https://greenbook.nafdac.gov.ng) is a server-rendered
// site whose product table is powered by a jQuery DataTables server-side
// endpoint at the same URL. It responds to a plain GET with DataTables'
// standard query params and returns JSON directly - no HTML parsing needed,
// and no auth/CSRF is required for a read-only search.

import type { ScrapeLogResult } from "@/types/database"

const GREENBOOK_URL = "https://greenbook.nafdac.gov.ng"
const TIMEOUT_MS = 12_000
const MAX_ATTEMPTS = 3 // 1 initial attempt + 2 retries
const RETRY_DELAY_MS = 2000

// Rotated one per attempt, not per session - see MAX_ATTEMPTS above.
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
]

export interface NafdacProduct {
  name: string
  company: string
  category: string
  registrationNumber: string
  additionalInfo?: Record<string, string>
}

export type ScrapeResult =
  | { ok: true; found: true; product: NafdacProduct }
  | { ok: true; found: false }
  | { ok: false; reason: "timeout" | "network_error" | "parse_error" }

export interface ScrapeAttemptLog {
  attemptNumber: number
  result: ScrapeLogResult
  responseTimeMs: number
}

export interface ScrapeOutcome {
  result: ScrapeResult
  attempts: ScrapeAttemptLog[]
}

interface GreenbookRow {
  product_name?: string
  NAFDAC?: string
  status?: string
  approval_date?: string
  applicant?: { name?: string }
  product_category?: { name?: string }
  form?: { name?: string }
}

// Greenbook's own data contains literal HTML entities (e.g. "BG Pharma
// &amp; Healthcare Limited") rather than the actual characters - this
// decodes the handful that show up in practice in product/company names.
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&apos;": "'",
  "&quot;": '"',
  "&lt;": "<",
  "&gt;": ">",
  "&#039;": "'",
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&amp;|&apos;|&quot;|&lt;|&gt;|&#039;/g, (match) => HTML_ENTITIES[match])
}

function cleanProductName(name: string): string {
  return decodeHtmlEntities(name.replace(/[#*]/g, "").trim())
}

function toProduct(row: GreenbookRow, fallbackNumber: string): NafdacProduct {
  return {
    name: cleanProductName(row.product_name ?? "Unknown product"),
    company: decodeHtmlEntities(row.applicant?.name ?? "Unknown company"),
    category: decodeHtmlEntities(row.product_category?.name ?? "Unknown"),
    registrationNumber: row.NAFDAC ?? fallbackNumber,
    additionalInfo: {
      status: row.status ?? "",
      approvalDate: row.approval_date ?? "",
      dosageForm: row.form?.name ?? "",
    },
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type RequestOutcome =
  | { kind: "found"; product: NafdacProduct }
  | { kind: "not_found" }
  | { kind: "parse_error" }

async function performRequest(nafdacNumber: string, userAgent: string): Promise<RequestOutcome> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = new URL(GREENBOOK_URL)
    url.searchParams.set("draw", "1")
    url.searchParams.set("start", "0")
    url.searchParams.set("length", "5")
    url.searchParams.set("search[value]", nafdacNumber)
    url.searchParams.set("search[regex]", "false")

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": userAgent,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      // Treat a hard HTTP rejection the same as a network-level failure -
      // the caller's retry loop handles both identically.
      throw new Error(`Greenbook responded with HTTP ${response.status}`)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { kind: "parse_error" }
    }

    const rows = (payload as { data?: unknown })?.data
    if (!Array.isArray(rows)) {
      return { kind: "parse_error" }
    }

    const normalized = nafdacNumber.toUpperCase()
    const exactMatch = rows.find(
      (row: GreenbookRow) =>
        typeof row?.NAFDAC === "string" && row.NAFDAC.toUpperCase() === normalized
    )
    const match = exactMatch ?? rows[0]

    if (!match) {
      return { kind: "not_found" }
    }

    return { kind: "found", product: toProduct(match, nafdacNumber) }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function searchNafdacGreenbook(nafdacNumber: string): Promise<ScrapeOutcome> {
  const attempts: ScrapeAttemptLog[] = []

  for (let attemptNumber = 1; attemptNumber <= MAX_ATTEMPTS; attemptNumber++) {
    const start = Date.now()
    const userAgent = USER_AGENTS[(attemptNumber - 1) % USER_AGENTS.length]
    const isLastAttempt = attemptNumber === MAX_ATTEMPTS

    try {
      const outcome = await performRequest(nafdacNumber, userAgent)
      const responseTimeMs = Date.now() - start

      if (outcome.kind === "parse_error") {
        attempts.push({ attemptNumber, result: "parse_error", responseTimeMs })
        if (!isLastAttempt) {
          await sleep(RETRY_DELAY_MS)
          continue
        }
        return { result: { ok: false, reason: "parse_error" }, attempts }
      }

      if (outcome.kind === "not_found") {
        attempts.push({ attemptNumber, result: "not_found", responseTimeMs })
        return { result: { ok: true, found: false }, attempts }
      }

      attempts.push({ attemptNumber, result: "success", responseTimeMs })
      return { result: { ok: true, found: true, product: outcome.product }, attempts }
    } catch (error) {
      const responseTimeMs = Date.now() - start
      const reason: "timeout" | "network_error" =
        error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error"
      attempts.push({ attemptNumber, result: reason, responseTimeMs })

      if (!isLastAttempt) {
        await sleep(RETRY_DELAY_MS)
        continue
      }
      return { result: { ok: false, reason }, attempts }
    }
  }

  // Unreachable in practice (the loop always returns by the last attempt),
  // but keeps the function's return type total for TypeScript.
  return { result: { ok: false, reason: "network_error" }, attempts }
}
