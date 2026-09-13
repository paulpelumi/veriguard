import { NextResponse, type NextRequest } from "next/server"

import { verifyNafdacNumber } from "@/lib/nafdac/verify-service"
import { createClient } from "@/lib/supabase/server"
import { checkUsageLimit, recordUsage } from "@/lib/usage/usage-tracker"
import type { NafdacVerificationResult } from "@/types"
import type { ProductType } from "@/types/database"

function respond(result: NafdacVerificationResult, httpStatus = 200) {
  return NextResponse.json(result, { status: httpStatus })
}

// Only these statuses represent a lookup that actually resolved to
// something - "unavailable" (the scraper/cache pipeline failed) isn't the
// user's fault and shouldn't burn their monthly quota, and "invalid_format"
// never reaches this far (it 400s before any usage check runs at all).
const BILLABLE_STATUSES = new Set(["verified", "verified_with_warnings", "not_found"])

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, lga, role")
    .eq("id", user.id)
    .single()

  if (profile?.role && profile.role !== "admin") {
    const usage = await checkUsageLimit(supabase, user.id, profile.role, "verifications")
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: {
            message: `You've used all ${usage.limit} free verifications this month. Upgrade to keep verifying.`,
            code: "limit_reached",
          },
        },
        { status: 403 }
      )
    }
  }

  const body = await request.json().catch(() => null)
  const rawNumber = typeof body?.nafdacNumber === "string" ? body.nafdacNumber : ""
  const productType: ProductType | undefined =
    typeof body?.productType === "string" ? (body.productType as ProductType) : undefined
  const labelCompany: string | undefined =
    typeof body?.labelCompany === "string" && body.labelCompany.trim()
      ? body.labelCompany.trim()
      : undefined
  const barcode: string | undefined =
    typeof body?.barcode === "string" && body.barcode.trim() ? body.barcode.trim() : undefined

  const result = await verifyNafdacNumber(supabase, {
    rawNumber,
    productType,
    labelCompany,
    barcode,
    userId: user.id,
    location: { state: profile?.state ?? null, lga: profile?.lga ?? null },
    source: "web",
  })

  if (BILLABLE_STATUSES.has(result.status)) {
    await recordUsage(supabase, user.id, "verifications")
  }

  // Matches the original route's status codes exactly: only invalid_format
  // was ever a 400 - not_found/unavailable/etc. are still 200s, since they
  // are legitimate, successfully-produced results, not request failures.
  return respond(result, result.status === "invalid_format" ? 400 : 200)
}
