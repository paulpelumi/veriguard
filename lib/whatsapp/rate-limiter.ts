import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/types/database"

const REQUESTS_PER_WINDOW = 10
const WINDOW_MINUTES = 60

// Delegates to a security-definer SQL function (0013_whatsapp_bot.sql) that
// does the increment-or-reset atomically in one statement - checking then
// separately updating from application code would race under concurrent
// webhook deliveries for the same sender.
export async function checkWhatsAppRateLimit(
  supabase: SupabaseClient<Database>,
  phoneNumber: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("whatsapp_check_rate_limit", {
    p_phone_number: phoneNumber,
    p_limit: REQUESTS_PER_WINDOW,
    p_window_minutes: WINDOW_MINUTES,
  })

  // Fails open: a rate-limiter outage shouldn't take down verification
  // entirely. The window is short (1 hour) and the cost of occasionally
  // missing a limit is far lower than falsely blocking every legitimate
  // request during a transient DB hiccup.
  if (error) return true

  return data
}
