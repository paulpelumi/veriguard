import type { SupabaseClient } from "@supabase/supabase-js"

import { crossCheckGs1WithNafdac, extractGs1Prefix, lookupGs1Company } from "@/lib/gs1/prefix-checker"
import type { Gs1CrossCheckResult } from "@/lib/gs1/gs1-types"
import {
  getCachedEntry,
  isCacheFresh,
  isUnderElevatedMonitoring,
  recordCacheHit,
  upsertCachedEntry,
} from "@/lib/nafdac/cache"
import { getMockProduct } from "@/lib/nafdac/mock-data"
import { detectMismatches } from "@/lib/nafdac/mismatch-detector"
import { searchNafdacGreenbook, type ScrapeAttemptLog } from "@/lib/nafdac/scraper"
import { isCategoryCoveredByGreenbook, isValidNafdacFormat, normalizeNafdacNumber } from "@/lib/nafdac/validator"
import { decodeHtmlEntities } from "@/lib/utils/html-entities"
import type {
  LogSource,
  LogVerificationStatus,
  NafdacMismatch,
  NafdacVerificationResult,
  NafdacVerificationStatus,
} from "@/types"
import type { Database, ProductType } from "@/types/database"

type Client = SupabaseClient<Database>

function toLogStatus(status: NafdacVerificationStatus): LogVerificationStatus {
  if (status === "verified" || status === "verified_with_warnings") return "verified"
  if (status === "not_found") return "not_found"
  if (status === "unavailable") return "failed"
  return "error"
}

function statusFromMismatches(mismatches: NafdacMismatch[]): "verified" | "verified_with_warnings" {
  return mismatches.length > 0 ? "verified_with_warnings" : "verified"
}

async function logScrapeAttempts(supabase: Client, nafdacNumber: string, attempts: ScrapeAttemptLog[]) {
  if (attempts.length === 0) return
  await supabase.from("scrape_logs").insert(
    attempts.map((attempt) => ({
      nafdac_number: nafdacNumber,
      attempt_number: attempt.attemptNumber,
      result: attempt.result,
      response_time_ms: attempt.responseTimeMs,
      used_cache: false,
    }))
  )
}

export interface VerifyNafdacNumberInput {
  rawNumber: string
  productType?: ProductType
  labelCompany?: string
  // Present when this verification originated from an EAN-13 barcode scan
  // (Module 2) - lets us cross-check the barcode's GS1 manufacturer prefix
  // against the NAFDAC-registered company for the resolved number.
  barcode?: string
  // null for a WhatsApp sender whose phone number doesn't match any
  // registered VeriGuard account (spec, Module 8) - verification_logs.
  // user_id was NOT NULL before this; see 0013_whatsapp_bot.sql.
  userId: string | null
  location?: { state: string | null; lga: string | null }
  source?: LogSource
}

async function logVerification(
  supabase: Client,
  nafdacNumber: string,
  result: NafdacVerificationResult,
  input: VerifyNafdacNumberInput
) {
  await supabase.from("verification_logs").insert({
    user_id: input.userId,
    nafdac_number: nafdacNumber,
    product_name: result.product?.name ?? null,
    company_name: result.product?.company ?? null,
    product_category: result.product?.category ?? null,
    verification_status: toLogStatus(result.status),
    raw_response: result as unknown as Record<string, unknown>,
    source: input.source ?? "web",
    user_state: input.location?.state ?? null,
    user_lga: input.location?.lga ?? null,
  })
}

// The full verification pipeline (cache -> live scrape -> mismatch/GS1/
// anomaly checks -> logging), extracted from app/api/nafdac/verify/route.ts
// so it can run outside an HTTP request/response cycle - the WhatsApp
// webhook (Module 8) needs the exact same logic when a message contains a
// NAFDAC number, but there's no browser request to parse a JSON body from
// or NextResponse to return. The route now just handles the HTTP-specific
// bits and calls this.
export async function verifyNafdacNumber(
  supabase: Client,
  input: VerifyNafdacNumberInput
): Promise<NafdacVerificationResult> {
  const { rawNumber, productType, labelCompany, barcode } = input
  const timestamp = new Date().toISOString()

  if (!rawNumber.trim()) {
    return {
      status: "invalid_format",
      nafdac_number: rawNumber,
      message: "Enter a NAFDAC number to verify.",
      timestamp,
      source: "mock",
    }
  }

  const nafdacNumber = normalizeNafdacNumber(rawNumber)

  if (!isValidNafdacFormat(nafdacNumber)) {
    const result: NafdacVerificationResult = {
      status: "invalid_format",
      nafdac_number: nafdacNumber,
      message: "That doesn't look like a valid NAFDAC number. Try a format like A1-1234 or 04-12345.",
      timestamp,
      source: "mock",
    }
    await logVerification(supabase, nafdacNumber, result, input)
    return result
  }

  async function runGs1CrossCheck(companyName: string): Promise<Gs1CrossCheckResult | undefined> {
    if (!barcode) return undefined

    const eligiblePrefix = extractGs1Prefix(barcode)
    if (!eligiblePrefix) {
      return {
        match: "not_nigerian",
        gs1_company: null,
        nafdac_company: companyName,
        confidence: "low",
        message:
          "This barcode doesn't carry a Nigeria-assigned GS1 country prefix, so no cross-check was performed.",
      }
    }

    const gs1Company = await lookupGs1Company(supabase, eligiblePrefix)
    return crossCheckGs1WithNafdac(gs1Company, companyName)
  }

  async function buildVerifiedResult(
    rawProductName: string,
    rawCompanyName: string,
    rawProductCategory: string,
    additionalInfo: Record<string, string> | undefined,
    source: NafdacVerificationResult["source"],
    previousCategory?: string | null
  ): Promise<NafdacVerificationResult> {
    const productName = decodeHtmlEntities(rawProductName)
    const companyName = decodeHtmlEntities(rawCompanyName)
    const productCategory = decodeHtmlEntities(rawProductCategory)

    const mismatches = productType
      ? detectMismatches({
          claimedProductType: productType,
          foundCategory: productCategory,
          foundCompany: companyName,
          labelCompany,
          previousCategory,
        })
      : []

    const gs1Check = await runGs1CrossCheck(companyName)
    if (gs1Check?.match === "mismatch") {
      mismatches.push({
        type: "gs1_company_mismatch",
        expected: gs1Check.gs1_company ?? "unknown",
        found: companyName,
        severity: "critical",
        message: gs1Check.message,
      })
    }

    const isConfirmedCounterfeit = cached?.confirmed_counterfeit ?? false
    const status = isConfirmedCounterfeit ? "verified_with_warnings" : statusFromMismatches(mismatches)

    return {
      status,
      nafdac_number: nafdacNumber,
      product: {
        name: productName,
        company: companyName,
        category: productCategory,
        registration_number: nafdacNumber,
        additional_info: additionalInfo,
      },
      mismatches: mismatches.length > 0 ? mismatches : undefined,
      message:
        status === "verified_with_warnings"
          ? "This NAFDAC number is registered, but inconsistencies were detected. Exercise caution."
          : "This product is registered with NAFDAC and is authentic.",
      timestamp,
      source,
      gs1_check: gs1Check,
      elevated_monitoring: isUnderElevatedMonitoring(cached?.elevated_until ?? null),
      confirmed_counterfeit: isConfirmedCounterfeit,
    }
  }

  const cached = await getCachedEntry(supabase, nafdacNumber)

  let result: NafdacVerificationResult

  if (cached && isCacheFresh(cached.last_verified_at)) {
    await recordCacheHit(supabase, nafdacNumber)
    result = await buildVerifiedResult(
      cached.product_name,
      cached.company_name,
      cached.product_category,
      (cached.additional_info as Record<string, string> | null) ?? undefined,
      "cache"
    )
    await logVerification(supabase, nafdacNumber, result, input)
    return result
  }

  // Cache miss, or stale (>= 7 days old) - attempt a live lookup.
  const { result: scrapeResult, attempts } = await searchNafdacGreenbook(nafdacNumber)
  await logScrapeAttempts(supabase, nafdacNumber, attempts)

  if (!scrapeResult.ok) {
    if (scrapeResult.reason === "parse_error") {
      const mock = getMockProduct(nafdacNumber)
      result = await buildVerifiedResult(mock.name, mock.company, mock.category, undefined, "mock")
    } else if (cached) {
      result = await buildVerifiedResult(
        cached.product_name,
        cached.company_name,
        cached.product_category,
        (cached.additional_info as Record<string, string> | null) ?? undefined,
        "cache"
      )
    } else {
      result = {
        status: "unavailable",
        nafdac_number: nafdacNumber,
        message:
          "The NAFDAC verification service is temporarily unavailable. Your query has been logged and you can try again shortly.",
        timestamp,
        source: "mock",
      }
    }
  } else if (!scrapeResult.found) {
    const covered = isCategoryCoveredByGreenbook(productType)
    result = covered
      ? {
          status: "not_found",
          nafdac_number: nafdacNumber,
          message: `No NAFDAC registration found for ${nafdacNumber}. This product may be counterfeit or unregistered.`,
          timestamp,
          source: "nafdac_live",
        }
      : {
          status: "not_found",
          nafdac_number: nafdacNumber,
          message:
            "NAFDAC's public registry currently covers Drugs, Vaccines, Medical Devices, Veterinary, Herbal, and Disinfectant products. This category isn't in that data source yet, so this result doesn't necessarily mean the product is unregistered.",
          timestamp,
          source: "nafdac_live",
          coverage_gap: true,
        }
  } else {
    result = await buildVerifiedResult(
      scrapeResult.product.name,
      scrapeResult.product.company,
      scrapeResult.product.category,
      scrapeResult.product.additionalInfo,
      "nafdac_live",
      cached?.product_category
    )

    await upsertCachedEntry(supabase, {
      nafdacNumber,
      productName: scrapeResult.product.name,
      companyName: scrapeResult.product.company,
      productCategory: scrapeResult.product.category,
      registrationStatus: scrapeResult.product.additionalInfo?.status ?? "Active",
      additionalInfo: scrapeResult.product.additionalInfo,
    })
  }

  await logVerification(supabase, nafdacNumber, result, input)

  return result
}
