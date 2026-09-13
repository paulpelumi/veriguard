import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>
export type WhatsAppSession = Database["public"]["Tables"]["whatsapp_sessions"]["Row"]
export type WhatsAppLanguage = WhatsAppSession["language"]

const MONTHLY_RESET_DAYS = 30

function defaultSession(phoneNumber: string): WhatsAppSession {
  const now = new Date().toISOString()
  return {
    id: "",
    phone_number: phoneNumber,
    user_id: null,
    language: "en",
    last_message_at: now,
    message_count: 1,
    monthly_count: 1,
    monthly_reset_at: now,
    is_blocked: false,
    context: {},
    created_at: now,
  }
}

// Every inbound message touches this once, at the top of
// routeIncomingMessage - it's the one place session state (language
// preference, running message counts, and free-form context like
// "awaiting language selection") gets read and updated, rather than each
// handler managing its own slice of it. Returns isNew so the router can
// tell a brand-new sender from a returning one without a second query.
export async function touchSession(
  supabase: Client,
  phoneNumber: string
): Promise<{ session: WhatsAppSession; isNew: boolean }> {
  const { data: existing } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle()

  const now = new Date()

  if (!existing) {
    const { data: created } = await supabase
      .from("whatsapp_sessions")
      .insert({
        phone_number: phoneNumber,
        message_count: 1,
        monthly_count: 1,
        last_message_at: now.toISOString(),
      })
      .select("*")
      .single()

    return { session: created ?? defaultSession(phoneNumber), isNew: true }
  }

  const monthlyResetDue =
    new Date(existing.monthly_reset_at).getTime() < now.getTime() - MONTHLY_RESET_DAYS * 24 * 60 * 60 * 1000

  const { data: updated } = await supabase
    .from("whatsapp_sessions")
    .update({
      message_count: existing.message_count + 1,
      monthly_count: monthlyResetDue ? 1 : existing.monthly_count + 1,
      monthly_reset_at: monthlyResetDue ? now.toISOString() : existing.monthly_reset_at,
      last_message_at: now.toISOString(),
    })
    .eq("phone_number", phoneNumber)
    .select("*")
    .single()

  return { session: updated ?? existing, isNew: false }
}

export async function setSessionLanguage(
  supabase: Client,
  phoneNumber: string,
  language: WhatsAppLanguage
): Promise<void> {
  await supabase.from("whatsapp_sessions").update({ language }).eq("phone_number", phoneNumber)
}

export async function updateSessionContext(
  supabase: Client,
  phoneNumber: string,
  context: Record<string, unknown>
): Promise<void> {
  await supabase.from("whatsapp_sessions").update({ context }).eq("phone_number", phoneNumber)
}
