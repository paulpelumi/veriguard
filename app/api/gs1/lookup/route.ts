import { NextResponse, type NextRequest } from "next/server"

import { extractGs1Prefix, lookupGs1Company } from "@/lib/gs1/prefix-checker"
import { createClient } from "@/lib/supabase/server"

// Standalone GS1 lookup - given an EAN-13/UPC-A barcode, returns which
// company (if any) its GS1 Nigeria prefix belongs to. Used on its own here
// (e.g. for the admin GS1 database page in Module 7 to test a prefix), and
// internally by the NAFDAC verify route when a barcode accompanies a
// verification request.
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
  const barcode = typeof body?.barcode === "string" ? body.barcode.trim() : ""

  if (!barcode) {
    return NextResponse.json(
      { error: { message: "Barcode is required", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const eligiblePrefix = extractGs1Prefix(barcode)

  if (!eligiblePrefix) {
    return NextResponse.json({
      barcode,
      is_nigerian: false,
      company: null,
      message: "This barcode doesn't carry a Nigeria-assigned GS1 country prefix (615-619).",
    })
  }

  const company = await lookupGs1Company(supabase, eligiblePrefix)

  return NextResponse.json({
    barcode,
    is_nigerian: true,
    company,
    message: company
      ? `This barcode is registered to ${company}.`
      : "This barcode's manufacturer prefix isn't in our GS1 Nigeria registry yet.",
  })
}
