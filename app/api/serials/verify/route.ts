import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Stub for Phase 4. The serialisation tables (manufacturer_profiles,
// serialised_products, product_serials, serial_scan_events) already exist in
// Supabase, but I don't have their confirmed column names/shapes - they were
// created outside this codebase. Querying them with guessed column names
// would just produce runtime errors, so this route only parses the scanned
// value's own format and returns that, rather than attempting a fabricated
// DB lookup. Phase 4 should replace the body of this handler with the real
// lookup once the actual schema is provided.
const SERIAL_PATTERN = /^VG-(\d{4})-([A-Z]{2})-(\d{6})$/i

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
  const serial = typeof body?.serial === "string" ? body.serial.trim().toUpperCase() : ""

  if (!serial) {
    return NextResponse.json(
      { error: { message: "Serial is required", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const match = serial.match(SERIAL_PATTERN)

  return NextResponse.json({
    status: "coming_soon",
    serial,
    parsed: match ? { year: match[1], regionCode: match[2], sequence: match[3] } : null,
    message:
      "Serial verification is coming in Phase 4. This code was recognized as a VeriGuard serial, but can't be checked against the manufacturer database yet.",
  })
}
