import type { SupabaseClient } from "@supabase/supabase-js"

import { verifyQrSignature } from "@/lib/manufacturers/crypto-signer"
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
  location: { state: string | null; lga: string | null } = { state: null, lga: null },
  source: "web" | "api" = "web"
): Promise<SerialVerificationResult> {
  const { data: scanRows, error: scanError } = await supabase.rpc("record_serial_scan", {
    p_serial_code: serial,
    p_location_state: location.state ?? undefined,
    p_location_lga: location.lga ?? undefined,
    p_scan_source: source,
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
      first_scanned_location: null,
      signature_valid: null,
      is_flagged: false,
      report_reference: null,
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
        .select("company_name, verification_status")
        .eq("id", batch.manufacturer_id)
        .maybeSingle()
    : { data: null }

  // Verified only when both the batch and a signature actually exist -
  // legacy serials generated before Module 4 (no qr_payload/signature at
  // all) read as "unknown" (null) rather than false, since there's
  // nothing to have tampered with. An explicit verify() failure on a
  // signed serial is what actually means "tampered".
  let signatureValid: boolean | null = null
  if (batch && scan.qr_payload && scan.signature) {
    const { data: keyRow } = await supabase
      .from("manufacturer_keys")
      .select("public_key")
      .eq("manufacturer_id", batch.manufacturer_id)
      .maybeSingle()

    if (keyRow?.public_key) {
      try {
        signatureValid = verifyQrSignature(JSON.parse(scan.qr_payload), scan.signature, keyRow.public_key)
      } catch {
        signatureValid = false
      }
    }
  }

  const product = batch
    ? {
        name: batch.product_name,
        nafdac_number: batch.nafdac_number,
        batch_number: batch.batch_number,
        expiry_date: batch.expiry_date,
      }
    : null

  const manufacturerInfo = manufacturer
    ? { name: manufacturer.company_name, is_verified: manufacturer.verification_status === "approved" }
    : null

  // Only set on the one call that actually inserted a new report (the
  // first duplicate detected for this serial) - repeat scans of an
  // already-flagged code don't create a second report to reference.
  const reportReference = scan.report_id ? `VG-RPT-${scan.report_id.slice(0, 8).toUpperCase()}` : null

  if (signatureValid === false) {
    return {
      status: "tampered",
      serial,
      product,
      manufacturer: manufacturerInfo,
      scan_count: scan.new_scan_count,
      first_scanned_at: scan.first_scanned_at,
      first_scanned_location: scan.first_scanned_location,
      signature_valid: false,
      is_flagged: scan.is_flagged,
      report_reference: reportReference,
      message:
        "This QR code's signature could not be verified. The data may have been altered or forged - this product may not be genuine.",
    }
  }

  return {
    status: scan.is_first_scan ? "verified_first_scan" : "verified_duplicate_scan",
    serial,
    product,
    manufacturer: manufacturerInfo,
    scan_count: scan.new_scan_count,
    first_scanned_at: scan.first_scanned_at,
    first_scanned_location: scan.first_scanned_location,
    signature_valid: signatureValid,
    is_flagged: scan.is_flagged,
    report_reference: reportReference,
    message: scan.is_first_scan
      ? "This is the first scan of this serial code - a strong signal of authenticity."
      : `DUPLICATE DETECTED: this serial code was already scanned ${scan.new_scan_count} time(s), first ${
          scan.first_scanned_location ? `in ${scan.first_scanned_location}` : "at an earlier date"
        }${
          scan.first_scanned_at ? ` on ${new Date(scan.first_scanned_at).toLocaleDateString()}` : ""
        }. The same code cannot genuinely be on two different products - this is likely counterfeit. A report has been sent to the manufacturer.`,
  }
}
