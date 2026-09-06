import { MessageCircle, Settings, UserCheck, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { StatCard } from "@/components/shared/stat-card"
import { createClient } from "@/lib/supabase/server"
import { startOfTodayIso } from "@/lib/utils/date"

// The spec names "Platform Settings" only as a sidebar nav entry - no
// specific fields or behavior are defined anywhere in Phase 3. Rather than
// invent settings that don't actually control anything, that part stays an
// honest placeholder. The WhatsApp usage numbers below are real, though:
// Module 8's spec asks for an admin stats endpoint
// (app/api/admin/whatsapp/stats) but never gives the admin sidebar its own
// WhatsApp nav item or page, so this is the most sensible existing place
// to surface it without inventing new nav structure.
export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const [totalResult, todayResult, linkedResult, knownSendersResult] = await Promise.all([
    supabase.from("verification_logs").select("id", { count: "exact", head: true }).eq("source", "whatsapp"),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">WhatsApp Bot Usage</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Verifications" value={total} icon={MessageCircle} />
          <StatCard label="Today" value={todayResult.count ?? 0} icon={MessageCircle} />
          <StatCard label="Linked to an Account" value={linked} icon={UserCheck} tone="success" />
          <StatCard label="Known Senders" value={knownSendersResult.count ?? 0} icon={Users} />
        </CardContent>
      </Card>

      <EmptyState
        icon={Settings}
        title="Nothing to configure yet"
        description="No platform-wide settings have been defined yet. This page is reserved for future configuration options."
      />
    </div>
  )
}
