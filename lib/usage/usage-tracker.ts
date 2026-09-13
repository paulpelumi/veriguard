import type { SupabaseClient } from "@supabase/supabase-js"

import { getEffectivePlan, getUsageForCurrentPeriod } from "@/lib/payments/subscription-manager"
import type { Database } from "@/types/database"

type TypedClient = SupabaseClient<Database>
type UsageMetric = Database["public"]["Tables"]["usage_records"]["Row"]["metric"]
type BillableRole = Database["public"]["Tables"]["subscription_plans"]["Row"]["role"]

// Maps a period-tracked usage_records metric to the limits key that
// governs it on subscription_plans.limits. Not every metric has a seeded
// ceiling yet (report_exports and api_calls aren't gated by any plan
// today), so a metric with no entry here always reads as unlimited rather
// than silently blocking on an undefined limit.
const LIMIT_KEY_FOR_METRIC: Partial<Record<UsageMetric, string>> = {
  verifications: "monthly_verifications",
  serial_codes_generated: "monthly_codes",
}

export interface UsageCheckResult {
  allowed: boolean
  used: number
  limit: number
  isUnlimited: boolean
}

export async function checkUsageLimit(
  supabase: TypedClient,
  userId: string,
  role: BillableRole,
  metric: UsageMetric
): Promise<UsageCheckResult> {
  const limitKey = LIMIT_KEY_FOR_METRIC[metric]
  if (!limitKey) {
    return { allowed: true, used: 0, limit: -1, isUnlimited: true }
  }

  const plan = await getEffectivePlan(supabase, userId, role)
  const limits = (plan?.limits ?? {}) as Record<string, number>
  const limit = limits[limitKey] ?? -1

  if (limit < 0) {
    return { allowed: true, used: 0, limit, isUnlimited: true }
  }

  const usage = await getUsageForCurrentPeriod(supabase, userId)
  const used = usage[metric] ?? 0

  return { allowed: used < limit, used, limit, isUnlimited: false }
}

// Best-effort: a failed count increment shouldn't fail the action that
// already succeeded (the verification happened, the codes were generated)
// - it just means this one call is undercounted, logged here so it's at
// least visible. Atomic increment lives in the record_usage RPC (migration
// 0022), not a read-then-write here - see that migration's own comment.
export async function recordUsage(
  supabase: TypedClient,
  userId: string,
  metric: UsageMetric,
  count = 1
): Promise<void> {
  const { error } = await supabase.rpc("record_usage", {
    p_user_id: userId,
    p_metric: metric,
    p_count: count,
  })

  if (error) {
    console.error("[usage-tracker] recordUsage failed", metric, error.message)
  }
}
