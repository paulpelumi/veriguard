import type { SupabaseClient } from "@supabase/supabase-js"

import { sendWhatsAppTemplate } from "@/lib/whatsapp/message-sender"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>
type RecallRow = Database["public"]["Tables"]["recall_alerts"]["Row"]

const LOOKBACK_DAYS = 180
const TEMPLATE_NAME = process.env.WHATSAPP_RECALL_TEMPLATE_NAME ?? "product_recall_alert"

// Finds every distinct WhatsApp number that verified this recall's NAFDAC
// number (as a source='whatsapp' verification_logs row) within the
// lookback window, and pushes each one a template message - the only
// message type Meta allows outside an active 24-hour customer-service
// conversation (see WhatsAppSendTemplatePayload's own comment), which a
// recall notification always is.
//
// Requires a template named WHATSAPP_RECALL_TEMPLATE_NAME to already be
// approved in Meta Business Manager - see .env.local.example for the exact
// body text to submit. English only for now: Meta approves a template per
// language, and getting the other four approved is a separate manual step
// outside what a single build session can do.
//
// Never throws - a failed or unconfigured send here must not block recall
// creation, which is why the one caller (app/api/admin/recalls POST) also
// wraps its own call to this in a try/catch on top of this function's own.
export async function notifyWhatsAppUsersOfRecall(serviceClient: Client, recall: RecallRow): Promise<void> {
  if (!recall.nafdac_number) return

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs, error } = await serviceClient
    .from("verification_logs")
    .select("phone_number")
    .eq("nafdac_number", recall.nafdac_number)
    .eq("source", "whatsapp")
    .not("phone_number", "is", null)
    .gte("created_at", since)

  if (error || !logs || logs.length === 0) return

  const phoneNumbers = [...new Set(logs.map((log) => log.phone_number).filter((p): p is string => !!p))]

  for (const phoneNumber of phoneNumbers) {
    const { data: alreadyNotified } = await serviceClient
      .from("whatsapp_recall_notifications")
      .select("phone_number")
      .eq("recall_id", recall.id)
      .eq("phone_number", phoneNumber)
      .maybeSingle()

    if (alreadyNotified) continue

    try {
      await sendWhatsAppTemplate(phoneNumber, TEMPLATE_NAME, "en_US", [
        recall.product_name,
        recall.nafdac_number ?? "N/A",
      ])
      await serviceClient
        .from("whatsapp_recall_notifications")
        .insert({ recall_id: recall.id, phone_number: phoneNumber })
    } catch (sendError) {
      console.error("[whatsapp/recall-notifier] send failed", phoneNumber, sendError)
    }
  }
}
