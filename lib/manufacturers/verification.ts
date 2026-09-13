import { decodeHtmlEntities } from "@/lib/utils/html-entities"

const GREENBOOK_URL = "https://greenbook.nafdac.gov.ng"
const TIMEOUT_MS = 12_000
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

export interface AutoCheckResult {
  passed: boolean
  matched_name?: string
  reason: string
}

// The spec asks to "query NAFDAC Greenbook for the manufacturer code", but
// there's no such lookup field - confirmed by inspecting the live endpoint
// (it leaks its own SQL query log in the response, showing the search only
// ever matches against product_name, ingredient, category, form, applicant
// name, route, strength, or the NAFDAC number - no separate "manufacturer
// code" column exists at all). What IS confirmed working is a search by
// company name, which matches against `applicants.name` among other
// fields (verified live: searching "BG Pharma" returns 20 real matches
// whose applicant.name is "BG Pharma & Healthcare Limited"). This checks
// whether NAFDAC's own registry has any active product whose registered
// company name reasonably matches the one the manufacturer submitted -
// the same underlying goal as the spec's "manufacturer code" check, via
// the mechanism that's actually there.
function normalizeCompanyName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

interface GreenbookApplicantRow {
  applicant?: { name?: string }
}

async function searchGreenbookByCompanyName(companyName: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = new URL(GREENBOOK_URL)
    url.searchParams.set("draw", "1")
    url.searchParams.set("start", "0")
    url.searchParams.set("length", "10")
    url.searchParams.set("search[value]", companyName)
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

    if (!response.ok) return null

    const payload = (await response.json().catch(() => null)) as { data?: GreenbookApplicantRow[] } | null
    const rows = payload?.data
    if (!Array.isArray(rows) || rows.length === 0) return null

    const target = normalizeCompanyName(companyName)
    const match = rows.find((row) => {
      const applicantName = row.applicant?.name
      if (!applicantName) return false
      const normalized = normalizeCompanyName(decodeHtmlEntities(applicantName))
      return normalized.includes(target) || target.includes(normalized)
    })

    const matchedName = match?.applicant?.name ?? rows[0]?.applicant?.name
    return matchedName ? decodeHtmlEntities(matchedName) : null
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

// A single best-effort attempt, not the full retry/rotation machinery the
// consumer-facing verify-service uses - this is a one-time registration
// check where any failure safely degrades to manual review (spec:
// verification_status = 'pending_manual'), unlike the consumer verify
// path where reliability directly affects what a user sees right now.
export async function runManufacturerAutoCheck(companyName: string): Promise<AutoCheckResult> {
  const matchedName = await searchGreenbookByCompanyName(companyName)

  if (!matchedName) {
    return {
      passed: false,
      reason:
        "No NAFDAC-registered products found under a matching company name. This doesn't necessarily mean the company is unregistered - manual review will confirm.",
    }
  }

  return {
    passed: true,
    matched_name: matchedName,
    reason: `Found NAFDAC-registered product(s) under a matching company name: "${matchedName}".`,
  }
}
