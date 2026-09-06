import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import { startOfTodayIso } from "@/lib/utils/date"

// Usage stats for the admin dashboard. verification_logs doesn't store the
// WhatsApp sender's phone number (only whether it matched a registered
// account), so "distinct senders" isn't directly derivable from it -
// whatsapp_rate_limits' row count is used as the closest available proxy
// instead. It's not a true all-time unique-sender count (a row's counter
// resets hourly rather than being deleted), but every sender who has ever
// messaged the bot has a row there, so the row count is at least a correct
// lower bound.
export async function GET() {
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const [totalResult, todayResult, linkedResult, rateLimitResult] = await Promise.all([
    supabase
      .from("verification_logs")
      .select("id", { count: "exact", head: true })
      .eq("source", "whatsapp"),
    supabase
      .from("verification_logs")
      .select("id", { count: "exact", head: true })
      .eq("source", "whatsapp")
      .gte("created_at", startOfTodayIso()),
    supabase
      .from("verification_logs")
      .select("id", { count: "exact", head: true })
      .eq("source", "whatsapp")
      .not("user_id", "is", null),
    supabase.from("whatsapp_rate_limits").select("phone_number", { count: "exact", head: true }),
  ])

  const total = totalResult.count ?? 0
  const linked = linkedResult.count ?? 0

  return NextResponse.json({
    total_verifications: total,
    verifications_today: todayResult.count ?? 0,
    linked_to_account: linked,
    anonymous: total - linked,
    known_senders: rateLimitResult.count ?? 0,
  })
}
