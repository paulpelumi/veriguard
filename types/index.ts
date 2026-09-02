import type { Database } from "@/types/database"

export * from "@/types/database"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type InventoryItem = Database["public"]["Tables"]["inventory"]["Row"]
export type VerificationLog = Database["public"]["Tables"]["verification_logs"]["Row"]
export type CounterfeitReport = Database["public"]["Tables"]["counterfeit_reports"]["Row"]
export type RecallAlert = Database["public"]["Tables"]["recall_alerts"]["Row"]

export interface NafdacVerificationResult {
  nafdacNumber: string
  productName: string
  companyName: string
  productCategory: string
  status: "verified" | "not_found"
  registrationDate?: string
  expiryDate?: string
}

export interface ApiErrorResponse {
  error: {
    message: string
    code: string
  }
}
