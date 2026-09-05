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

  const { data: serialRow, error: serialError } = await supabase
    .from("product_serials")
    .select(
      "id, batch_id, serial_code, status, first_scanned_at, first_scanned_by, first_scanned_location, scan_count"
    )
    .eq("serial_code", serial)
    .maybeSingle()

  if (serialError) {
    return NextResponse.json(
      { error: { message: serialError.message, code: "db_error" } },
      { status: 500 }
    )
  }

  if (!serialRow) {
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
    .eq("id", serialRow.batch_id)
    .maybeSingle()

  const { data: manufacturer } = batch
    ? await supabase
        .from("manufacturer_profiles")
        .select("company_name, is_verified")
        .eq("id", batch.manufacturer_id)
        .maybeSingle()
    : { data: null }

  const { data: profile } = await supabase
    .from("profiles")
    .select("state, lga")
    .eq("id", user.id)
    .maybeSingle()

  const isFirstScan = serialRow.status === "unscanned"
  const newScanCount = (serialRow.scan_count ?? 0) + 1
  const nowIso = new Date().toISOString()

  await supabase.from("serial_scan_events").insert({
    serial_id: serialRow.id,
    scanned_by: user.id,
    location_state: profile?.state ?? null,
    location_lga: profile?.lga ?? null,
    scan_source: "web",
    result: isFirstScan ? "first_scan" : "duplicate",
  })

  await supabase
    .from("product_serials")
    .update(
      isFirstScan
        ? {
            status: "first_scanned",
            first_scanned_at: nowIso,
            first_scanned_by: user.id,
            first_scanned_location: profile?.state ?? null,
            scan_count: newScanCount,
          }
        : { scan_count: newScanCount }
    )
    .eq("id", serialRow.id)

  const result: SerialVerificationResult = {
    status: isFirstScan ? "verified_first_scan" : "verified_duplicate_scan",
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
    scan_count: newScanCount,
    first_scanned_at: isFirstScan ? nowIso : serialRow.first_scanned_at,
    message: isFirstScan
      ? "This is the first scan of this serial code - a strong signal of authenticity."
      : `This serial code has been scanned ${newScanCount} time(s), first on ${serialRow.first_scanned_at ? new Date(serialRow.first_scanned_at).toLocaleDateString() : "an earlier date"}. Seeing the same code on multiple physical products is a counterfeiting red flag - though re-scanning your own item is also normal.`,
  }

  return NextResponse.json(result)
}
