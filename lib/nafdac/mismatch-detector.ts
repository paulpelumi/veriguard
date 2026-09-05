import type { MismatchSeverity, MismatchType, NafdacMismatch } from "@/types"
import type { ProductType } from "@/types/database"

export interface MismatchInput {
  claimedProductType: ProductType
  foundCategory: string
  foundCompany: string
  labelCompany?: string
  /**
   * The category this same NAFDAC number was found under the last time it
   * was verified (from cache/history), if different from foundCategory.
   */
  previousCategory?: string | null
}

// Maps NAFDAC Greenbook's own category labels to the VeriGuard product types
// they're compatible with. An unmapped NAFDAC category means we genuinely
// don't know how it relates to our categories - we don't flag what we can't
// confidently map, rather than guess and risk a false positive.
const CATEGORY_COMPATIBILITY: Record<string, ProductType[]> = {
  drugs: ["drug"],
  "vaccines and biologics": ["drug"],
  "medical devices": ["medical_device"],
  veterinary: ["other"],
  "herbals and nutraceuticals": ["herbal"],
  disinfectants: ["cosmetic", "other"],
}

function categoriesAreCompatible(claimed: ProductType, found: string): boolean {
  const compatible = CATEGORY_COMPATIBILITY[found.trim().toLowerCase()]
  if (!compatible) return true
  return compatible.includes(claimed)
}

function normalizeCompanyName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function companiesAreSimilar(a: string, b: string): boolean {
  const na = normalizeCompanyName(a)
  const nb = normalizeCompanyName(b)
  if (!na || !nb) return true
  return na.includes(nb) || nb.includes(na)
}

function buildMismatch(
  type: MismatchType,
  expected: string,
  found: string,
  severity: MismatchSeverity,
  message: string
): NafdacMismatch {
  return { type, expected, found, severity, message }
}

export function detectMismatches(input: MismatchInput): NafdacMismatch[] {
  const mismatches: NafdacMismatch[] = []

  if (!categoriesAreCompatible(input.claimedProductType, input.foundCategory)) {
    mismatches.push(
      buildMismatch(
        "category_mismatch",
        input.claimedProductType,
        input.foundCategory,
        "critical",
        `NAFDAC lists this number under "${input.foundCategory}", but you selected "${input.claimedProductType}". This is a strong signal the number may be misused on this product.`
      )
    )
  }

  if (input.labelCompany && !companiesAreSimilar(input.labelCompany, input.foundCompany)) {
    mismatches.push(
      buildMismatch(
        "company_mismatch",
        input.labelCompany,
        input.foundCompany,
        "critical",
        `The company on the label ("${input.labelCompany}") doesn't match NAFDAC's registered company ("${input.foundCompany}") for this number.`
      )
    )
  }

  // "format_mismatch" per the original spec ("format pattern doesn't match
  // expected pattern for the claimed category") isn't something we can
  // verify - NAFDAC doesn't publish a documented category-to-format-prefix
  // rule, and fabricating one risks false positives on genuine products.
  // What we CAN verify from our own data: whether this exact number has
  // previously been seen under a different category. That's a real,
  // data-driven inconsistency signal.
  if (
    input.previousCategory &&
    input.previousCategory.trim().toLowerCase() !== input.foundCategory.trim().toLowerCase()
  ) {
    mismatches.push(
      buildMismatch(
        "format_mismatch",
        input.previousCategory,
        input.foundCategory,
        "warning",
        `This NAFDAC number was previously verified under a different category ("${input.previousCategory}"). Inconsistent category reporting can indicate number reuse or a data entry issue.`
      )
    )
  }

  return mismatches
}
