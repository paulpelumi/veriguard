import type { Database } from "@/types/database"

export * from "@/types/database"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"]
export type VerificationLog = Database["public"]["Tables"]["verification_logs"]["Row"]
export type CounterfeitReport = Database["public"]["Tables"]["counterfeit_reports"]["Row"]
export type RecallAlert = Database["public"]["Tables"]["recall_alerts"]["Row"]

export type NafdacVerificationStatus =
  | "verified"
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

export interface NafdacVerificationResult {
  status: NafdacVerificationStatus
  nafdac_number: string
  product?: NafdacVerificationProduct
  message: string
  timestamp: string
  source: NafdacVerificationSource
  // True when status is "not_found" only because the queried product
  // category (e.g. food, drink, cosmetic) isn't covered by NAFDAC's public
  // Greenbook registry - not because the number is actually unregistered.
  coverage_gap?: boolean
}

export interface ApiErrorResponse {
  error: {
    message: string
    code: string
  }
}
