// The Greenbook portal (https://greenbook.nafdac.gov.ng) is a server-rendered
// site whose product table is powered by a jQuery DataTables server-side
// endpoint at the same URL. It responds to a plain GET with DataTables'
// standard query params and returns JSON directly - no HTML parsing needed,
// and no auth/CSRF is required for a read-only search.

const GREENBOOK_URL = "https://greenbook.nafdac.gov.ng"
const TIMEOUT_MS = 10_000
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

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
  | { ok: false; reason: "timeout" | "unreachable" }
  | { ok: false; reason: "unexpected_shape" }

interface GreenbookRow {
  product_name?: string
  NAFDAC?: string
  status?: string
  approval_date?: string
  applicant?: { name?: string }
  product_category?: { name?: string }
  form?: { name?: string }
}

function cleanProductName(name: string): string {
  return name.replace(/[#*]/g, "").trim()
}

function toProduct(row: GreenbookRow, fallbackNumber: string): NafdacProduct {
  return {
    name: cleanProductName(row.product_name ?? "Unknown product"),
    company: row.applicant?.name ?? "Unknown company",
    category: row.product_category?.name ?? "Unknown",
    registrationNumber: row.NAFDAC ?? fallbackNumber,
    additionalInfo: {
      status: row.status ?? "",
      approvalDate: row.approval_date ?? "",
      dosageForm: row.form?.name ?? "",
    },
  }
}

export async function searchNafdacGreenbook(nafdacNumber: string): Promise<ScrapeResult> {
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
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/javascript, */*; q=0.01",
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      return { ok: false, reason: "unreachable" }
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      return { ok: false, reason: "unexpected_shape" }
    }

    const rows = (payload as { data?: unknown })?.data
    if (!Array.isArray(rows)) {
      return { ok: false, reason: "unexpected_shape" }
    }

    const normalized = nafdacNumber.toUpperCase()
    const exactMatch = rows.find(
      (row: GreenbookRow) =>
        typeof row?.NAFDAC === "string" && row.NAFDAC.toUpperCase() === normalized
    )
    const match = exactMatch ?? rows[0]

    if (!match) {
      return { ok: true, found: false }
    }

    return { ok: true, found: true, product: toProduct(match, nafdacNumber) }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "timeout" }
    }
    return { ok: false, reason: "unreachable" }
  } finally {
    clearTimeout(timeoutId)
  }
}
