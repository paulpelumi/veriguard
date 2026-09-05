import { isValidNafdacFormat } from "@/lib/nafdac/validator"
import type { NafdacVerificationResult } from "@/types"

export type ScanFormat =
  | "veriguard_serial" // Starts with "VG-" e.g. VG-2025-NE-000247
  | "nafdac_number" // Matches NAFDAC patterns e.g. A1-1234, 04-12345
  | "ean_barcode" // 8, 12, or 13 digit numeric string
  | "qr_url" // A URL - may be a VeriGuard product page URL
  | "unknown" // Cannot determine format

const VERIGUARD_SERIAL_PREFIX = /^VG-/i
const EAN_LENGTHS = new Set([8, 12, 13])

export function detectScanFormat(scannedValue: string): ScanFormat {
  const trimmed = scannedValue.trim()
  if (!trimmed) return "unknown"

  if (VERIGUARD_SERIAL_PREFIX.test(trimmed)) return "veriguard_serial"

  if (/^https?:\/\//i.test(trimmed)) return "qr_url"

  // Checked before the (deliberately lenient) NAFDAC format regex: a bare
  // 8/12/13-digit string is unambiguously a retail barcode length, but the
  // NAFDAC regex allows an all-digit body too (it accepts a missing hyphen
  // for manual-entry flexibility), so length-exact-match must win first or
  // every EAN-8 code would misclassify as a NAFDAC number.
  if (/^\d+$/.test(trimmed) && EAN_LENGTHS.has(trimmed.length)) return "ean_barcode"

  if (isValidNafdacFormat(trimmed)) return "nafdac_number"

  return "unknown"
}

export interface ParsedScanUrl {
  format: Exclude<ScanFormat, "qr_url">
  value: string
}

/**
 * Extracts a serial or NAFDAC number from a scanned URL - either our own
 * /consumer/verify?nafdacNumber=... / /verify/[nafdacNumber] links, or a
 * third-party QR pointing at similarly-shaped query params.
 */
export function parseScanUrl(url: string): ParsedScanUrl | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const candidateParams = ["serial", "nafdacNumber", "nafdac"]
  for (const key of candidateParams) {
    const value = parsed.searchParams.get(key)
    if (value) {
      const format = detectScanFormat(value)
      if (format !== "qr_url" && format !== "unknown") {
        return { format, value }
      }
    }
  }

  // Fall back to the last path segment, e.g. /verify/A1-1234 or /s/VG-2025-NE-000247
  const segments = parsed.pathname.split("/").filter(Boolean)
  const lastSegment = segments.at(-1)
  if (lastSegment) {
    const decoded = decodeURIComponent(lastSegment)
    const format = detectScanFormat(decoded)
    if (format !== "qr_url" && format !== "unknown") {
      return { format, value: decoded }
    }
  }

  return null
}

export interface SerialVerificationResult {
  status: string
  serial: string
  parsed: { year: string; regionCode: string; sequence: string } | null
  message: string
}

export interface BarcodeResolutionResult {
  barcode: string
  nafdac_number: string | null
  message: string
}

export async function resolveVeriGuardSerial(serial: string): Promise<SerialVerificationResult> {
  const response = await fetch("/api/serials/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ serial }),
  })
  return response.json()
}

export async function resolveNafdacNumber(
  nafdacNumber: string,
  options?: { productType?: string; labelCompany?: string }
): Promise<NafdacVerificationResult> {
  const response = await fetch("/api/nafdac/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nafdacNumber, ...options }),
  })
  return response.json()
}

export async function resolveEanBarcode(barcode: string): Promise<BarcodeResolutionResult> {
  const response = await fetch("/api/nafdac/resolve-barcode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ barcode }),
  })
  return response.json()
}
