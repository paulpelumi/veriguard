import { NextResponse, type NextRequest } from "next/server"

import { verifyNafdacNumber } from "@/lib/nafdac/verify-service"
import { createClient } from "@/lib/supabase/server"
import type { NafdacVerificationResult } from "@/types"
import type { ProductType } from "@/types/database"

function respond(result: NafdacVerificationResult, httpStatus = 200) {
  return NextResponse.json(result, { status: httpStatus })
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, lga")
    .eq("id", user.id)
    .single()

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

  // Matches the original route's status codes exactly: only invalid_format
  // was ever a 400 - not_found/unavailable/etc. are still 200s, since they
  // are legitimate, successfully-produced results, not request failures.
  return respond(result, result.status === "invalid_format" ? 400 : 200)
}
