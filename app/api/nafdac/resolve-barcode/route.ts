import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Phase 2: no barcode-to-NAFDAC-number mapping exists yet. This endpoint is
// a stable contract for the scanner to call so Phase 3 can slot in a real
// lookup (e.g. against a barcode registry) without changing the client.
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

  return NextResponse.json({
    barcode,
    nafdac_number: null,
    message: "Barcode-to-NAFDAC-number mapping is coming in Phase 3. Enter the NAFDAC number manually for now.",
  })
}
