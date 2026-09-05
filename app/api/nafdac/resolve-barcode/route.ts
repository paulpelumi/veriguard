import { NextResponse, type NextRequest } from "next/server"

import { searchNafdacGreenbook } from "@/lib/nafdac/scraper"
import { createClient } from "@/lib/supabase/server"

// Phase 3, Module 2: no dedicated barcode->NAFDAC-number mapping table
// exists yet (that's real GS1/barcode registry work), but we can at least
// attempt a Greenbook search using the barcode itself as the query - its
// search matches against product name, ingredient, and NAFDAC number
// fields, so this occasionally surfaces a match (e.g. if a product's
// listed name happens to include the barcode). In practice this will
// usually come back empty since barcodes rarely appear as substrings of
// product records - that's expected and honestly reported, not a bug.
// Module 3 (GS1 prefix cross-check) adds a real, purpose-built path for
// EAN-13 barcodes specifically.
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

  const format = /^\d{8}$/.test(barcode)
    ? "EAN-8"
    : /^\d{12}$/.test(barcode)
      ? "UPC-A/EAN-12"
      : /^\d{13}$/.test(barcode)
        ? "EAN-13"
        : "unknown"

  const { result } = await searchNafdacGreenbook(barcode)

  if (result.ok && result.found) {
    return NextResponse.json({
      barcode,
      format,
      nafdac_number: result.product.registrationNumber,
      product: result.product,
      message: `Found a possible match in the NAFDAC registry for this barcode.`,
    })
  }

  return NextResponse.json({
    barcode,
    format,
    nafdac_number: null,
    message:
      "This barcode doesn't map to a known NAFDAC number yet. GS1 manufacturer cross-checking is coming next - for now, enter the NAFDAC number printed on the product manually.",
  })
}
