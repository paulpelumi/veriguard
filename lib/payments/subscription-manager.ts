import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type TypedClient = SupabaseClient<Database>
type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"]
type UserSubscription = Database["public"]["Tables"]["user_subscriptions"]["Row"]
type BillableRole = SubscriptionPlan["role"]

export interface SubscriptionWithPlan extends UserSubscription {
  plan: SubscriptionPlan
}

export async function getPlansForRole(
  supabase: TypedClient,
  role: BillableRole
): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("role", role)
    .eq("is_active", true)
    .order("price_monthly_kobo", { ascending: true })

  if (error) throw error
  return data
}

// No embedded PostgREST join (project convention - see get-dashboard-data.ts
// and friends) - two queries plus a JS-side merge instead.
export async function getCurrentSubscription(
  supabase: TypedClient,
  userId: string
): Promise<SubscriptionWithPlan | null> {
  const { data: subscription } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["active", "trial"])
    .order("created_at", { ascending: false })
    .maybeSingle()

  if (!subscription) return null

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("id", subscription.plan_id)
    .maybeSingle()

  if (!plan) return null

  return { ...subscription, plan }
}

// Every role has a real $0 tier seeded in subscription_plans (Consumer
// Free, Business Free, Manufacturer Pilot) that a new signup is implicitly
// on before ever paying. Business's free tier was added later (Module 2,
// migration 0022) specifically so this map could stay uniform instead of
// business being a permanent null-plan special case - see that
// migration's own comment.
const IMPLICIT_FREE_TIER: Partial<Record<BillableRole, string>> = {
  consumer: "free",
  business: "free",
  manufacturer: "pilot",
}

export async function getImplicitPlan(
  supabase: TypedClient,
  role: BillableRole
): Promise<SubscriptionPlan | null> {
  const tier = IMPLICIT_FREE_TIER[role]
  if (!tier) return null

  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("role", role)
    .eq("tier", tier)
    .maybeSingle()

  return data
}

// A user's free-tier plan is implicit (no row in user_subscriptions until
// they've paid at least once), so callers that need "the plan governing
// this account right now" - not just "do they have a paid subscription" -
// go through this instead of getCurrentSubscription directly.
export async function getEffectivePlan(
  supabase: TypedClient,
  userId: string,
  role: BillableRole
): Promise<SubscriptionPlan | null> {
  const current = await getCurrentSubscription(supabase, userId)
  if (current) return current.plan

  return getImplicitPlan(supabase, role)
}

interface ActivateSubscriptionParams {
  userId: string
  planId: string
  billingCycle: "monthly" | "yearly"
  paystackReference: string
  paystackTransactionId: string
  amountKobo: number
  customerCode: string
  authorizationCode: string | null
}

// Called only from the verify route and the webhook handler, both of which
// use the service-role client - a user's own session can read
// user_subscriptions but never write it directly, so every activation goes
// through server code that has already confirmed payment with Paystack.
export async function activateSubscriptionFromPayment(
  serviceClient: TypedClient,
  params: ActivateSubscriptionParams
): Promise<void> {
  const periodEnd = new Date()
  if (params.billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  const { data: existing } = await serviceClient
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", params.userId)
    .in("status", ["active", "trial"])
    .maybeSingle()

  const subscriptionRow = {
    user_id: params.userId,
    plan_id: params.planId,
    paystack_customer_code: params.customerCode,
    paystack_authorization_code: params.authorizationCode,
    status: "active" as const,
    billing_cycle: params.billingCycle,
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd.toISOString(),
    updated_at: new Date().toISOString(),
  }

  let subscriptionId: string
  if (existing) {
    await serviceClient.from("user_subscriptions").update(subscriptionRow).eq("id", existing.id)
    subscriptionId = existing.id
  } else {
    const { data: inserted, error } = await serviceClient
      .from("user_subscriptions")
      .insert(subscriptionRow)
      .select("id")
      .single()
    if (error || !inserted) throw error ?? new Error("Failed to create subscription")
    subscriptionId = inserted.id
  }

  await serviceClient.from("payment_history").insert({
    user_id: params.userId,
    subscription_id: subscriptionId,
    paystack_reference: params.paystackReference,
    paystack_transaction_id: params.paystackTransactionId,
    amount_kobo: params.amountKobo,
    status: "success",
    description: "Subscription payment",
    paid_at: new Date().toISOString(),
  })
}

export async function getPaymentHistory(supabase: TypedClient, userId: string) {
  const { data, error } = await supabase
    .from("payment_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) throw error
  return data
}

const CURRENT_PERIOD_METRICS = [
  "verifications",
  "inventory_items",
  "serial_codes_generated",
  "api_calls",
  "whatsapp_queries",
  "report_exports",
] as const

export async function getUsageForCurrentPeriod(
  supabase: TypedClient,
  userId: string
): Promise<Record<(typeof CURRENT_PERIOD_METRICS)[number], number>> {
  const now = new Date()
  const { data } = await supabase
    .from("usage_records")
    .select("metric, count")
    .eq("user_id", userId)
    .eq("period_month", now.getMonth() + 1)
    .eq("period_year", now.getFullYear())

  const usage = Object.fromEntries(CURRENT_PERIOD_METRICS.map((metric) => [metric, 0])) as Record<
    (typeof CURRENT_PERIOD_METRICS)[number],
    number
  >

  for (const row of data ?? []) {
    usage[row.metric as (typeof CURRENT_PERIOD_METRICS)[number]] = row.count
  }

  return usage
}
