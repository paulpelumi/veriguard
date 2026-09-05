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

export type NafdacCacheSource = "live" | "manual"

export type ScrapeLogResult = "success" | "timeout" | "not_found" | "parse_error" | "network_error"

export type NotificationType =
  | "expiry_warning"
  | "recall_alert"
  | "verification_complete"
  | "counterfeit_confirmed"

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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "verification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "counterfeit_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      alert_settings: {
        Row: {
          id: string
          business_id: string
          expiry_alerts_enabled: boolean
          alert_90_days: boolean
          alert_60_days: boolean
          alert_30_days: boolean
          alert_expired: boolean
          email_alerts: boolean
          per_category_thresholds: boolean
          drug_alert_days: number
          food_alert_days: number
          cosmetic_alert_days: number
          drink_alert_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_id: string
          expiry_alerts_enabled?: boolean
          alert_90_days?: boolean
          alert_60_days?: boolean
          alert_30_days?: boolean
          alert_expired?: boolean
          email_alerts?: boolean
          per_category_thresholds?: boolean
          drug_alert_days?: number
          food_alert_days?: number
          cosmetic_alert_days?: number
          drink_alert_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          business_id?: string
          expiry_alerts_enabled?: boolean
          alert_90_days?: boolean
          alert_60_days?: boolean
          alert_30_days?: boolean
          alert_expired?: boolean
          email_alerts?: boolean
          per_category_thresholds?: boolean
          drug_alert_days?: number
          food_alert_days?: number
          cosmetic_alert_days?: number
          drink_alert_days?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          link: string | null
          is_read: boolean
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          link?: string | null
          is_read?: boolean
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string
          link?: string | null
          is_read?: boolean
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nafdac_cache: {
        Row: {
          id: string
          nafdac_number: string
          product_name: string
          company_name: string
          product_category: string
          registration_status: string
          additional_info: Record<string, unknown> | null
          source: NafdacCacheSource
          last_verified_at: string
          verification_count: number
          created_at: string
        }
        Insert: {
          id?: string
          nafdac_number: string
          product_name: string
          company_name: string
          product_category: string
          registration_status: string
          additional_info?: Record<string, unknown> | null
          source?: NafdacCacheSource
          last_verified_at?: string
          verification_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          nafdac_number?: string
          product_name?: string
          company_name?: string
          product_category?: string
          registration_status?: string
          additional_info?: Record<string, unknown> | null
          source?: NafdacCacheSource
          last_verified_at?: string
          verification_count?: number
          created_at?: string
        }
        Relationships: []
      }
      scrape_logs: {
        Row: {
          id: string
          nafdac_number: string
          attempt_number: number
          result: ScrapeLogResult
          response_time_ms: number | null
          used_cache: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nafdac_number: string
          attempt_number: number
          result: ScrapeLogResult
          response_time_ms?: number | null
          used_cache?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nafdac_number?: string
          attempt_number?: number
          result?: ScrapeLogResult
          response_time_ms?: number | null
          used_cache?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      upsert_nafdac_cache: {
        Args: {
          p_nafdac_number: string
          p_product_name: string
          p_company_name: string
          p_product_category: string
          p_registration_status: string
          p_additional_info: Record<string, unknown> | null
          p_source?: NafdacCacheSource
        }
        Returns: Database["public"]["Tables"]["nafdac_cache"]["Row"]
      }
      increment_nafdac_cache_hit: {
        Args: { p_nafdac_number: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
