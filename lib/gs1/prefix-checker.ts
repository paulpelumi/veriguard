import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import type { Gs1CrossCheckResult } from "@/lib/gs1/gs1-types"

// GS1 country prefixes 615-619 are assigned to Nigeria (GS1 Nigeria).
const NIGERIA_COUNTRY_CODE_RANGE: [number, number] = [615, 619]

/**
 * Validates that a barcode is EAN-13/UPC-A shaped and carries a
 * Nigeria-assigned GS1 country prefix. Returns the full digit string (not
 * just the country code) for lookupGs1Company to match against, or null if
 * the barcode isn't eligible for a Nigerian GS1 cross-check at all.
 */
export function extractGs1Prefix(barcode: string): string | null {
  const digitsOnly = barcode.trim()
  if (!/^\d{12,13}$/.test(digitsOnly)) return null

  const countryCode = Number(digitsOnly.slice(0, 3))
  if (countryCode < NIGERIA_COUNTRY_CODE_RANGE[0] || countryCode > NIGERIA_COUNTRY_CODE_RANGE[1]) {
    return null
  }

  return digitsOnly
}

/**
 * Looks up which company a barcode's GS1 company prefix belongs to, using
 * the admin-managed gs1_prefixes table (not a hardcoded list, so it grows
 * as VeriGuard's team adds prefixes via the admin dashboard without a code
 * deploy). Real GS1 company-prefix length varies by allocation (6-10
 * digits) and isn't derivable from the barcode alone without GS1's own
 * allocation table, which isn't publicly available - matching known
 * prefixes against the start of the barcode (longest first, for
 * specificity) sidesteps needing to know the "correct" length.
 */
export async function lookupGs1Company(
  supabase: SupabaseClient<Database>,
  barcodeOrPrefix: string
): Promise<string | null> {
  const { data } = await supabase
    .from("gs1_prefixes")
    .select("prefix, company_name")
    .eq("is_verified", true)

  if (!data || data.length === 0) return null

  const sorted = [...data].sort((a, b) => b.prefix.length - a.prefix.length)
  const match = sorted.find((row) => barcodeOrPrefix.startsWith(row.prefix))
  return match?.company_name ?? null
}

function normalizeCompanyName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

export function crossCheckGs1WithNafdac(
  gs1Company: string | null,
  nafdacCompany: string
): Gs1CrossCheckResult {
  if (gs1Company === null) {
    return {
      match: "unknown",
      gs1_company: null,
      nafdac_company: nafdacCompany,
      confidence: "low",
      message:
        "This barcode's manufacturer prefix isn't in our GS1 Nigeria registry yet, so it can't be cross-checked against the NAFDAC record.",
    }
  }

  const a = normalizeCompanyName(gs1Company)
  const b = normalizeCompanyName(nafdacCompany)
  const isMatch = Boolean(a) && Boolean(b) && (a.includes(b) || b.includes(a))

  if (isMatch) {
    return {
      match: "confirmed",
      gs1_company: gs1Company,
      nafdac_company: nafdacCompany,
      confidence: "high",
      message: `Barcode is registered to ${gs1Company}, matching the NAFDAC record.`,
    }
  }

  return {
    match: "mismatch",
    gs1_company: gs1Company,
    nafdac_company: nafdacCompany,
    confidence: "high",
    message: `Barcode is registered to ${gs1Company}, but the NAFDAC record shows ${nafdacCompany}. This is a strong indicator of counterfeiting.`,
  }
}
