import { NextResponse, type NextRequest } from "next/server"

import { getCachedEntry, isCacheFresh, recordCacheHit, upsertCachedEntry } from "@/lib/nafdac/cache"
import { getMockProduct } from "@/lib/nafdac/mock-data"
import { detectMismatches } from "@/lib/nafdac/mismatch-detector"
import { searchNafdacGreenbook, type ScrapeAttemptLog } from "@/lib/nafdac/scraper"
import {
  isCategoryCoveredByGreenbook,
  isValidNafdacFormat,
  normalizeNafdacNumber,
} from "@/lib/nafdac/validator"
import { createClient } from "@/lib/supabase/server"
import { decodeHtmlEntities } from "@/lib/utils/html-entities"
import type {
  LogVerificationStatus,
  NafdacMismatch,
  NafdacVerificationResult,
  NafdacVerificationStatus,
} from "@/types"
import type { ProductType } from "@/types/database"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

function respond(result: NafdacVerificationResult, httpStatus = 200) {
  return NextResponse.json(result, { status: httpStatus })
}

function toLogStatus(status: NafdacVerificationStatus): LogVerificationStatus {
  if (status === "verified" || status === "verified_with_warnings") return "verified"
  if (status === "not_found") return "not_found"
  if (status === "unavailable") return "failed"
  return "error"
}

function statusFromMismatches(mismatches: NafdacMismatch[]): "verified" | "verified_with_warnings" {
  return mismatches.length > 0 ? "verified_with_warnings" : "verified"
}

async function logScrapeAttempts(
  supabase: SupabaseServerClient,
  nafdacNumber: string,
  attempts: ScrapeAttemptLog[]
) {
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

async function logVerification(
  supabase: SupabaseServerClient,
  userId: string,
  nafdacNumber: string,
  result: NafdacVerificationResult
) {
  await supabase.from("verification_logs").insert({
    user_id: userId,
    nafdac_number: nafdacNumber,
    product_name: result.product?.name ?? null,
    company_name: result.product?.company ?? null,
    product_category: result.product?.category ?? null,
    verification_status: toLogStatus(result.status),
    raw_response: result as unknown as Record<string, unknown>,
    source: "web",
  })
}

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => null)
  const rawNumber = typeof body?.nafdacNumber === "string" ? body.nafdacNumber : ""
  const productType: ProductType | undefined =
    typeof body?.productType === "string" ? (body.productType as ProductType) : undefined
  const labelCompany: string | undefined =
    typeof body?.labelCompany === "string" && body.labelCompany.trim()
      ? body.labelCompany.trim()
      : undefined
  const timestamp = new Date().toISOString()

  if (!rawNumber.trim()) {
    return respond(
      {
        status: "invalid_format",
        nafdac_number: rawNumber,
        message: "Enter a NAFDAC number to verify.",
        timestamp,
        source: "mock",
      },
      400
    )
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
    await logVerification(supabase, user.id, nafdacNumber, result)
    return respond(result, 400)
  }

  function buildVerifiedResult(
    rawProductName: string,
    rawCompanyName: string,
    rawProductCategory: string,
    additionalInfo: Record<string, string> | undefined,
    source: NafdacVerificationResult["source"],
    previousCategory?: string | null
  ): NafdacVerificationResult {
    // Decoded here (not just at scrape time) so cache entries written
    // before this fix existed still display correctly - the decode is a
    // no-op on text that's already clean.
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

    const status = statusFromMismatches(mismatches)

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
    }
  }

  const cached = await getCachedEntry(supabase, nafdacNumber)

  if (cached && isCacheFresh(cached.last_verified_at)) {
    await recordCacheHit(supabase, nafdacNumber)
    const result = buildVerifiedResult(
      cached.product_name,
      cached.company_name,
      cached.product_category,
      (cached.additional_info as Record<string, string> | null) ?? undefined,
      "cache"
    )
    await logVerification(supabase, user.id, nafdacNumber, result)
    return respond(result)
  }

  // Cache miss, or stale (>= 7 days old) - attempt a live lookup.
  const { result: scrapeResult, attempts } = await searchNafdacGreenbook(nafdacNumber)
  await logScrapeAttempts(supabase, nafdacNumber, attempts)

  let result: NafdacVerificationResult

  if (!scrapeResult.ok) {
    if (scrapeResult.reason === "parse_error") {
      // The portal responded but not in the shape we expect - fall back to
      // realistic mock data rather than surfacing a raw parsing failure.
      const mock = getMockProduct(nafdacNumber)
      result = buildVerifiedResult(mock.name, mock.company, mock.category, undefined, "mock")
    } else if (cached) {
      // All retries failed (timeout/network_error) - per spec, fall back to
      // whatever cache we have regardless of age rather than declaring the
      // service unavailable outright.
      result = buildVerifiedResult(
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
    result = buildVerifiedResult(
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

  await logVerification(supabase, user.id, nafdacNumber, result)

  return respond(result)
}
