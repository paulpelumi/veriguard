import type { Database } from "@/types/database"
import type { Gs1CrossCheckResult } from "@/lib/gs1/gs1-types"

export * from "@/types/database"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"]
export type VerificationLog = Database["public"]["Tables"]["verification_logs"]["Row"]
export type CounterfeitReport = Database["public"]["Tables"]["counterfeit_reports"]["Row"]
export type RecallAlert = Database["public"]["Tables"]["recall_alerts"]["Row"]
export type AlertSettings = Database["public"]["Tables"]["alert_settings"]["Row"]
export type Notification = Database["public"]["Tables"]["notifications"]["Row"]
export type NafdacCache = Database["public"]["Tables"]["nafdac_cache"]["Row"]
export type ScrapeLog = Database["public"]["Tables"]["scrape_logs"]["Row"]
export type GS1Prefix = Database["public"]["Tables"]["gs1_prefixes"]["Row"]
export type ManufacturerProfile = Database["public"]["Tables"]["manufacturer_profiles"]["Row"]
export type SerialisedProduct = Database["public"]["Tables"]["serialised_products"]["Row"]
export type ProductSerial = Database["public"]["Tables"]["product_serials"]["Row"]
export type SerialScanEvent = Database["public"]["Tables"]["serial_scan_events"]["Row"]
export type VerificationAnomaly = Database["public"]["Tables"]["verification_anomalies"]["Row"]
export type GeographicStats = Database["public"]["Tables"]["geographic_stats"]["Row"]

export type NafdacVerificationStatus =
  | "verified"
  | "verified_with_warnings"
  | "not_found"
  | "unavailable"
  | "invalid_format"
  | "error"

export type NafdacVerificationSource = "nafdac_live" | "cache" | "mock"

export interface NafdacVerificationProduct {
  name: string
  company: string
  category: string
  registration_number: string
  additional_info?: Record<string, string>
}

export type MismatchType =
  | "category_mismatch"
  | "company_mismatch"
  | "format_mismatch"
  | "gs1_company_mismatch"
export type MismatchSeverity = "warning" | "critical"

export interface NafdacMismatch {
  type: MismatchType
  expected: string
  found: string
  severity: MismatchSeverity
  message: string
}

export interface NafdacVerificationResult {
  status: NafdacVerificationStatus
  nafdac_number: string
  product?: NafdacVerificationProduct
  mismatches?: NafdacMismatch[]
  message: string
  timestamp: string
  source: NafdacVerificationSource
  // True when status is "not_found" only because the queried product
  // category (e.g. food, drink, cosmetic) isn't covered by NAFDAC's public
  // Greenbook registry - not because the number is actually unregistered.
  coverage_gap?: boolean
  // Present only when the verification request included a scanned barcode.
  gs1_check?: Gs1CrossCheckResult
  // Present when this number has an active anomaly flag (Module 4) - shown
  // regardless of the underlying verified/verified_with_warnings
  // status, since it's an independent activity signal, not a registration
  // problem.
  elevated_monitoring?: boolean
  // Present when an admin has confirmed a counterfeit report against this
  // number (Module 7). Forces status to "verified_with_warnings" even with
  // zero ordinary mismatches, so a confirmed-counterfeit number never shows
  // the plain green card.
  confirmed_counterfeit?: boolean
}

export type SerialVerificationStatus =
  | "verified_first_scan"
  | "verified_duplicate_scan"
  | "not_found"
  | "error"

export interface SerialVerificationResult {
  status: SerialVerificationStatus
  serial: string
  product: {
    name: string
    nafdac_number: string
    batch_number: string
    expiry_date: string
  } | null
  manufacturer: {
    name: string
    is_verified: boolean
  } | null
  scan_count: number
  first_scanned_at: string | null
  message: string
}

export interface ApiErrorResponse {
  error: {
    message: string
    code: string
  }
}
