import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import type { SerialVerificationResult } from "@/types"

// Real lookup against the serialisation schema (manufacturer_profiles,
// serialised_products, product_serials, serial_scan_events). A "first scan"
// is a strong authenticity signal - a serial is meant to be printed on
// exactly one physical unit, so the first time it's ever scanned is the
// expected, legitimate case. Any scan after that is flagged as a duplicate:
// it could be a customer re-scanning their own item (benign), or the same
// code cloned onto multiple counterfeit units (not benign) - we surface the
// fact honestly and let the human judge, rather than asserting counterfeit.
//
// The actual scan-tracking write (status/scan_count/first_scanned_* update
// + serial_scan_events insert) happens atomically inside the
// record_serial_scan() Postgres function, not via direct table writes -
// these tables only grant clients read access via RLS. Writing directly
// would let any authenticated user reset a serial's status via a raw REST
// call, defeating the whole anti-counterfeiting signal. The function also
// row-locks the serial during the check, closing a race where two
// simultaneous scans could both believe they're the legitimate first one.
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
  const serial = typeof body?.serial === "string" ? body.serial.trim() : ""

  if (!serial) {
    return NextResponse.json(
      { error: { message: "Serial is required", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, lga")
    .eq("id", user.id)
    .maybeSingle()

  const { data: scanRows, error: scanError } = await supabase.rpc("record_serial_scan", {
    p_serial_code: serial,
    p_location_state: profile?.state ?? undefined,
    p_location_lga: profile?.lga ?? undefined,
    p_scan_source: "web",
  })

  if (scanError) {
    return NextResponse.json(
      { error: { message: scanError.message, code: "db_error" } },
      { status: 500 }
    )
  }

  const scan = scanRows?.[0]

  if (!scan) {
    const result: SerialVerificationResult = {
      status: "not_found",
      serial,
      product: null,
      manufacturer: null,
      scan_count: 0,
      first_scanned_at: null,
      message:
        "This serial code was not found in VeriGuard's registry. It may be counterfeit, or not yet activated by the manufacturer.",
    }
    return NextResponse.json(result)
  }

  const { data: batch } = await supabase
    .from("serialised_products")
    .select("manufacturer_id, nafdac_number, product_name, batch_number, expiry_date")
    .eq("id", scan.batch_id)
    .maybeSingle()

  const { data: manufacturer } = batch
    ? await supabase
        .from("manufacturer_profiles")
        .select("company_name, is_verified")
        .eq("id", batch.manufacturer_id)
        .maybeSingle()
    : { data: null }

  const result: SerialVerificationResult = {
    status: scan.is_first_scan ? "verified_first_scan" : "verified_duplicate_scan",
    serial,
    product: batch
      ? {
          name: batch.product_name,
          nafdac_number: batch.nafdac_number,
          batch_number: batch.batch_number,
          expiry_date: batch.expiry_date,
        }
      : null,
    manufacturer: manufacturer
      ? { name: manufacturer.company_name, is_verified: manufacturer.is_verified }
      : null,
    scan_count: scan.new_scan_count,
    first_scanned_at: scan.first_scanned_at,
    message: scan.is_first_scan
      ? "This is the first scan of this serial code - a strong signal of authenticity."
      : `This serial code has been scanned ${scan.new_scan_count} time(s), first on ${scan.first_scanned_at ? new Date(scan.first_scanned_at).toLocaleDateString() : "an earlier date"}. Seeing the same code on multiple physical products is a counterfeiting red flag - though re-scanning your own item is also normal.`,
  }

  return NextResponse.json(result)
}
