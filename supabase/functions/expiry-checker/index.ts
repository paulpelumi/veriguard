// Supabase Edge Function: expiry-checker
//
// Intended schedule: daily at 8am WAT (07:00 UTC).
//
// Deploy with: supabase functions deploy expiry-checker
//
// Scheduling: I'm not fully confident of the current exact CLI syntax for
// cron-scheduling an Edge Function (this has changed across CLI versions),
// so verify against Supabase's current docs rather than trusting a
// remembered flag here. The reliable path: Dashboard -> Edge Functions ->
// expiry-checker -> Schedules (or Database -> Cron Jobs), which lets you
// set a cron expression against this function's URL without needing exact
// CLI flags. Cron expression for 8am WAT: "0 7 * * *" (WAT is UTC+1).
//
// Scans all inventory across every business, and for each item that has
// just crossed a 90/60/30-day-or-expired threshold, inserts one
// "expiry_warning" notification for that business - honoring each
// business's alert_settings (or sane defaults if they haven't configured
// any yet). Idempotent: re-running the same day won't create duplicates,
// since it checks for an existing notification carrying the same
// {inventory_id, threshold} pair in its metadata first.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

interface InventoryRow {
  id: string
  business_id: string
  product_name: string
  product_type: string
  expiry_date: string
}

interface AlertSettingsRow {
  business_id: string
  expiry_alerts_enabled: boolean
  alert_90_days: boolean
  alert_60_days: boolean
  alert_30_days: boolean
  alert_expired: boolean
  per_category_thresholds: boolean
  drug_alert_days: number
  food_alert_days: number
  cosmetic_alert_days: number
  drink_alert_days: number
}

const DEFAULT_SETTINGS: Omit<AlertSettingsRow, "business_id"> = {
  expiry_alerts_enabled: true,
  alert_90_days: true,
  alert_60_days: true,
  alert_30_days: true,
  alert_expired: true,
  per_category_thresholds: false,
  drug_alert_days: 90,
  food_alert_days: 30,
  cosmetic_alert_days: 60,
  drink_alert_days: 30,
}

function daysUntil(dateString: string): number {
  const target = new Date(dateString)
  target.setUTCHours(0, 0, 0, 0)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** 0 stands in for "expired" as a threshold value. */
function matchedThreshold(daysLeft: number): 0 | 30 | 60 | 90 | null {
  if (daysLeft < 0) return 0
  if (daysLeft <= 30) return 30
  if (daysLeft <= 60) return 60
  if (daysLeft <= 90) return 90
  return null
}

function isThresholdEnabled(
  settings: AlertSettingsRow,
  threshold: number,
  productType: string
): boolean {
  if (!settings.expiry_alerts_enabled) return false
  if (threshold === 0) return settings.alert_expired

  if (settings.per_category_thresholds) {
    const categoryDays: Record<string, number> = {
      drug: settings.drug_alert_days,
      food: settings.food_alert_days,
      cosmetic: settings.cosmetic_alert_days,
      drink: settings.drink_alert_days,
    }
    const days = categoryDays[productType]
    return typeof days === "number" && threshold <= days
  }

  if (threshold === 90) return settings.alert_90_days
  if (threshold === 60) return settings.alert_60_days
  if (threshold === 30) return settings.alert_30_days
  return false
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: items, error: itemsError } = await supabase
    .from("inventory")
    .select("id, business_id, product_name, product_type, expiry_date")

  if (itemsError) {
    return new Response(JSON.stringify({ error: itemsError.message }), { status: 500 })
  }

  const { data: settingsRows, error: settingsError } = await supabase
    .from("alert_settings")
    .select("*")

  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 })
  }

  const settingsByBusiness = new Map<string, AlertSettingsRow>(
    (settingsRows ?? []).map((row: AlertSettingsRow) => [row.business_id, row])
  )

  let created = 0

  for (const item of (items ?? []) as InventoryRow[]) {
    const threshold = matchedThreshold(daysUntil(item.expiry_date))
    if (threshold === null) continue

    const settings =
      settingsByBusiness.get(item.business_id) ??
      ({ business_id: item.business_id, ...DEFAULT_SETTINGS } as AlertSettingsRow)

    if (!isThresholdEnabled(settings, threshold, item.product_type)) continue

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", item.business_id)
      .eq("type", "expiry_warning")
      .contains("metadata", { inventory_id: item.id, threshold })
      .maybeSingle()

    if (existing) continue

    const title =
      threshold === 0
        ? `${item.product_name} has expired`
        : `${item.product_name} expires in ${threshold} days or less`

    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: item.business_id,
      type: "expiry_warning",
      title,
      message: `Expiry date: ${item.expiry_date}`,
      link: "/business/expiry",
      metadata: { inventory_id: item.id, threshold },
    })

    if (!insertError) created += 1
  }

  return new Response(JSON.stringify({ ok: true, notifications_created: created }), {
    headers: { "Content-Type": "application/json" },
  })
})
