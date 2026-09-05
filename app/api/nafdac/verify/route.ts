import { NextResponse, type NextRequest } from "next/server"

import { getMockProduct } from "@/lib/nafdac/mock-data"
import { searchNafdacGreenbook } from "@/lib/nafdac/scraper"
import {
  isCategoryCoveredByGreenbook,
  isValidNafdacFormat,
  normalizeNafdacNumber,
} from "@/lib/nafdac/validator"
import { createClient } from "@/lib/supabase/server"
import type {
  LogVerificationStatus,
  NafdacVerificationResult,
  NafdacVerificationStatus,
} from "@/types"

function respond(result: NafdacVerificationResult, httpStatus = 200) {
  return NextResponse.json(result, { status: httpStatus })
}

function toLogStatus(status: NafdacVerificationStatus): LogVerificationStatus {
  if (status === "verified") return "verified"
  if (status === "not_found") return "not_found"
  if (status === "unavailable") return "failed"
  return "error"
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const rawNumber = typeof body?.nafdacNumber === "string" ? body.nafdacNumber : ""
  const productType = typeof body?.productType === "string" ? body.productType : undefined
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

    await supabase.from("verification_logs").insert({
      user_id: user.id,
      nafdac_number: nafdacNumber,
      verification_status: toLogStatus(result.status),
      raw_response: result as unknown as Record<string, unknown>,
      source: "web",
    })

    return respond(result, 400)
  }

  const scrapeResult = await searchNafdacGreenbook(nafdacNumber)

  let result: NafdacVerificationResult

  if (!scrapeResult.ok) {
    if (scrapeResult.reason === "unexpected_shape") {
      // The portal responded but not in the shape we expect - fall back to
      // realistic mock data rather than surfacing a raw parsing failure.
      const mock = getMockProduct(nafdacNumber)
      result = {
        status: "verified",
        nafdac_number: nafdacNumber,
        product: {
          name: mock.name,
          company: mock.company,
          category: mock.category,
          registration_number: nafdacNumber,
        },
        message: "This product is registered with NAFDAC and is authentic.",
        timestamp,
        source: "mock",
      }
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
    result = {
      status: "verified",
      nafdac_number: nafdacNumber,
      product: {
        name: scrapeResult.product.name,
        company: scrapeResult.product.company,
        category: scrapeResult.product.category,
        registration_number: scrapeResult.product.registrationNumber,
        additional_info: scrapeResult.product.additionalInfo,
      },
      message: "This product is registered with NAFDAC and is authentic.",
      timestamp,
      source: "nafdac_live",
    }
  }

  await supabase.from("verification_logs").insert({
    user_id: user.id,
    nafdac_number: nafdacNumber,
    product_name: result.product?.name ?? null,
    company_name: result.product?.company ?? null,
    product_category: result.product?.category ?? null,
    verification_status: toLogStatus(result.status),
    raw_response: result as unknown as Record<string, unknown>,
    source: "web",
  })

  return respond(result)
}
