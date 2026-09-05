import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"
import type { NafdacCache } from "@/types"

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function isCacheFresh(lastVerifiedAt: string): boolean {
  return Date.now() - new Date(lastVerifiedAt).getTime() < CACHE_MAX_AGE_MS
}

export async function getCachedEntry(
  supabase: SupabaseClient<Database>,
  nafdacNumber: string
): Promise<NafdacCache | null> {
  const { data } = await supabase
    .from("nafdac_cache")
    .select("*")
    .eq("nafdac_number", nafdacNumber)
    .maybeSingle()

  return data
}

interface UpsertCacheInput {
  nafdacNumber: string
  productName: string
  companyName: string
  productCategory: string
  registrationStatus: string
  additionalInfo?: Record<string, string> | null
}

export async function upsertCachedEntry(
  supabase: SupabaseClient<Database>,
  entry: UpsertCacheInput
): Promise<void> {
  await supabase.rpc("upsert_nafdac_cache", {
    p_nafdac_number: entry.nafdacNumber,
    p_product_name: entry.productName,
    p_company_name: entry.companyName,
    p_product_category: entry.productCategory,
    p_registration_status: entry.registrationStatus,
    p_additional_info: entry.additionalInfo ?? null,
    p_source: "live",
  })
}

export async function recordCacheHit(
  supabase: SupabaseClient<Database>,
  nafdacNumber: string
): Promise<void> {
  await supabase.rpc("increment_nafdac_cache_hit", { p_nafdac_number: nafdacNumber })
}
