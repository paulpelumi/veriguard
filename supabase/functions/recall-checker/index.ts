// Supabase Edge Function: recall-checker
//
// Intended schedule: daily. Deploy with: supabase functions deploy recall-checker
// Scheduling: see the note in supabase/functions/expiry-checker/index.ts -
// use the Dashboard's Edge Functions/Database Cron Jobs UI to be safe
// against CLI syntax drift.
//
// Phase 2: recalls come from the recall_alerts table only (manually curated
// / seeded). Phase 3 is expected to populate that table by scraping
// NAFDAC's own recall announcements - this function's job doesn't change
// when that happens, only where recall_alerts rows come from.
//
// For every active recall, finds businesses whose inventory matches it
// (by NAFDAC number exact match, or a bidirectional product-name substring
// match - the same heuristic used by the Recalls page's client-side
// cross-referencing) and inserts one "recall_alert" notification per
// affected business. Idempotent via checking for an existing notification
// carrying the same {recall_id} in its metadata first.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

interface RecallRow {
  id: string
  product_name: string
  company_name: string | null
  nafdac_number: string | null
  severity: string | null
}

interface InventoryRow {
  business_id: string
  product_name: string
  nafdac_number: string | null
}

function isMatch(recall: RecallRow, item: InventoryRow): boolean {
  if (
    recall.nafdac_number &&
    item.nafdac_number &&
    recall.nafdac_number.toUpperCase() === item.nafdac_number.toUpperCase()
  ) {
    return true
  }

  const recallName = recall.product_name.toLowerCase().trim()
  const itemName = item.product_name.toLowerCase().trim()
  if (!recallName || !itemName) return false

  return recallName.includes(itemName) || itemName.includes(recallName)
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: recalls, error: recallsError } = await supabase
    .from("recall_alerts")
    .select("id, product_name, company_name, nafdac_number, severity")
    .eq("is_active", true)

  if (recallsError) {
    return new Response(JSON.stringify({ error: recallsError.message }), { status: 500 })
  }

  const { data: inventory, error: inventoryError } = await supabase
    .from("inventory")
    .select("business_id, product_name, nafdac_number")

  if (inventoryError) {
    return new Response(JSON.stringify({ error: inventoryError.message }), { status: 500 })
  }

  let created = 0

  for (const recall of (recalls ?? []) as RecallRow[]) {
    const affectedBusinessIds = new Set<string>()
    for (const item of (inventory ?? []) as InventoryRow[]) {
      if (isMatch(recall, item)) {
        affectedBusinessIds.add(item.business_id)
      }
    }

    for (const businessId of affectedBusinessIds) {
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", businessId)
        .eq("type", "recall_alert")
        .contains("metadata", { recall_id: recall.id })
        .maybeSingle()

      if (existing) continue

      const { error: insertError } = await supabase.from("notifications").insert({
        user_id: businessId,
        type: "recall_alert",
        title: `Recall: ${recall.product_name}`,
        message: recall.company_name
          ? `${recall.company_name} - a product matching your inventory has been recalled.`
          : "A product matching your inventory has been recalled.",
        link: "/business/recalls",
        metadata: { recall_id: recall.id, severity: recall.severity },
      })

      if (!insertError) created += 1
    }
  }

  return new Response(JSON.stringify({ ok: true, notifications_created: created }), {
    headers: { "Content-Type": "application/json" },
  })
})
