import { NextResponse } from "next/server"

import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Scheduled by vercel.json's crons entry (00:05 UTC on the 1st of every
// month). Vercel automatically attaches "Authorization: Bearer
// $CRON_SECRET" to its own cron-triggered requests whenever an env var
// named exactly CRON_SECRET is set on the project - this check is what
// stops anyone who finds this URL from forcing an early reset for every
// manufacturer's monthly_unit_limit and every WhatsApp session on demand.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const serviceClient = createServiceRoleClient()
  const { error } = await serviceClient.rpc("reset_monthly_usage_counters")

  if (error) {
    console.error("[cron/reset-usage] failed", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: "ok" })
}
