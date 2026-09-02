export type UserRole = "consumer" | "business"

export type BusinessType =
  | "pharmacy"
  | "supermarket"
  | "food_retail"
  | "distributor"
  | "mall"
  | "other"

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise"

export type ProductType =
  | "food"
  | "drink"
  | "drug"
  | "cosmetic"
  | "herbal"
  | "medical_device"
  | "other"

export type VerificationStatus = "verified" | "unverified" | "failed" | "pending"

export type LogVerificationStatus = "verified" | "not_found" | "failed" | "error"

export type LogSource = "web" | "whatsapp" | "api"

export type ReportStatus = "pending" | "reviewed" | "confirmed" | "dismissed"

export type RecallSeverity = "low" | "medium" | "high" | "critical"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: UserRole
          business_name: string | null
          business_type: BusinessType | null
          phone: string | null
          state: string | null
          lga: string | null
          subscription_tier: SubscriptionTier
          is_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role: UserRole
          business_name?: string | null
          business_type?: BusinessType | null
          phone?: string | null
          state?: string | null
          lga?: string | null
          subscription_tier?: SubscriptionTier
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: UserRole
          business_name?: string | null
          business_type?: BusinessType | null
          phone?: string | null
          state?: string | null
          lga?: string | null
          subscription_tier?: SubscriptionTier
          is_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: string
          business_id: string
          product_name: string
          product_type: ProductType
          product_subtype: string | null
          nafdac_number: string | null
          batch_number: string | null
          barcode: string | null
          production_date: string | null
          expiry_date: string
          quantity: number
          unit: string
          supplier: string | null
          purchase_price: number | null
          is_verified: boolean
          verification_status: VerificationStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          product_name: string
          product_type: ProductType
          product_subtype?: string | null
          nafdac_number?: string | null
          batch_number?: string | null
          barcode?: string | null
          production_date?: string | null
          expiry_date: string
          quantity?: number
          unit?: string
          supplier?: string | null
          purchase_price?: number | null
          is_verified?: boolean
          verification_status?: VerificationStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          product_name?: string
          product_type?: ProductType
          product_subtype?: string | null
          nafdac_number?: string | null
          batch_number?: string | null
          barcode?: string | null
          production_date?: string | null
          expiry_date?: string
          quantity?: number
          unit?: string
          supplier?: string | null
          purchase_price?: number | null
          is_verified?: boolean
          verification_status?: VerificationStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      verification_logs: {
        Row: {
          id: string
          user_id: string
          nafdac_number: string
          product_name: string | null
          company_name: string | null
          product_category: string | null
          verification_status: LogVerificationStatus
          raw_response: Record<string, unknown> | null
          source: LogSource
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nafdac_number: string
          product_name?: string | null
          company_name?: string | null
          product_category?: string | null
          verification_status: LogVerificationStatus
          raw_response?: Record<string, unknown> | null
          source?: LogSource
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nafdac_number?: string
          product_name?: string | null
          company_name?: string | null
          product_category?: string | null
          verification_status?: LogVerificationStatus
          raw_response?: Record<string, unknown> | null
          source?: LogSource
          created_at?: string
        }
      }
      counterfeit_reports: {
        Row: {
          id: string
          reporter_id: string | null
          nafdac_number: string | null
          product_name: string
          product_type: string | null
          brand_name: string | null
          purchase_location: string | null
          state: string | null
          lga: string | null
          suspicion_reason: string
          description: string | null
          status: ReportStatus
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id?: string | null
          nafdac_number?: string | null
          product_name: string
          product_type?: string | null
          brand_name?: string | null
          purchase_location?: string | null
          state?: string | null
          lga?: string | null
          suspicion_reason: string
          description?: string | null
          status?: ReportStatus
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string | null
          nafdac_number?: string | null
          product_name?: string
          product_type?: string | null
          brand_name?: string | null
          purchase_location?: string | null
          state?: string | null
          lga?: string | null
          suspicion_reason?: string
          description?: string | null
          status?: ReportStatus
          created_at?: string
        }
      }
      recall_alerts: {
        Row: {
          id: string
          nafdac_number: string | null
          product_name: string
          company_name: string | null
          recall_reason: string | null
          severity: RecallSeverity | null
          issued_date: string | null
          source_url: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nafdac_number?: string | null
          product_name: string
          company_name?: string | null
          recall_reason?: string | null
          severity?: RecallSeverity | null
          issued_date?: string | null
          source_url?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nafdac_number?: string | null
          product_name?: string
          company_name?: string | null
          recall_reason?: string | null
          severity?: RecallSeverity | null
          issued_date?: string | null
          source_url?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}
