import type { SupabaseClient } from "@supabase/supabase-js"

import type { SerialVerificationResult } from "@/types"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

// Extracted from app/api/serials/verify/route.ts so the WhatsApp router
// (Module 8) can run the exact same lookup without an HTTP round-trip - see
// the longer note in that route file for why the write goes through
// record_serial_scan() rather than direct table access.
//
// Known limitation for WhatsApp callers: record_serial_scan() attributes
// the scan via auth.uid() internally, which is null under a service-role
// client (there's no logged-in session to have a uid at all). A WhatsApp
// scan is therefore always recorded as scanned_by = null, even when the
// sender's phone number matches a registered account - unlike
// verification_logs, which this module links to the matched account
// directly since that insert doesn't go through a function hardcoded to
// auth.uid(). Fixing this would mean changing record_serial_scan's
// signature to accept an explicit user id, which is out of scope here.
export async function verifySerial(
  supabase: Client,
  serial: string,
  location: { state: string | null; lga: string | null } = { state: null, lga: null }
): Promise<SerialVerificationResult> {
  const { data: scanRows, error: scanError } = await supabase.rpc("record_serial_scan", {
    p_serial_code: serial,
    p_location_state: location.state ?? undefined,
    p_location_lga: location.lga ?? undefined,
    p_scan_source: "web",
  })

  if (scanError) {
    throw new Error(scanError.message)
  }

  const scan = scanRows?.[0]

  if (!scan) {
    return {
      status: "not_found",
      serial,
      product: null,
      manufacturer: null,
      scan_count: 0,
      first_scanned_at: null,
      message:
        "This serial code was not found in VeriGuard's registry. It may be counterfeit, or not yet activated by the manufacturer.",
    }
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

  return {
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
}
