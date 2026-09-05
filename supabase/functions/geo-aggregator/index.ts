// Phase 3, Module 6: Geographic Intelligence Layer.
// Deploy via the Supabase Dashboard's Edge Functions "Via Editor" flow, then
// schedule it with pg_cron + pg_net to run daily (same pattern as
// expiry-checker, anomaly-detector, recall-scraper). Re-running it later the
// same day is safe - the upsert just refreshes today's row per state.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface StateStats {
  verification_count: number
  not_found_count: number
  counterfeit_reports: number
  anomaly_count: number
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500 }
    )
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const now = new Date()
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  const periodDate = todayStart.toISOString().slice(0, 10)

  const [verificationRes, reportRes, anomalyRes] = await Promise.all([
    supabase.rpc("geo_verification_stats", {
      p_since: todayStart.toISOString(),
      p_until: tomorrowStart.toISOString(),
    }),
    supabase.rpc("geo_counterfeit_report_stats", {
      p_since: todayStart.toISOString(),
      p_until: tomorrowStart.toISOString(),
    }),
    supabase.rpc("geo_anomaly_state_touches", {
      p_since: todayStart.toISOString(),
      p_until: tomorrowStart.toISOString(),
    }),
  ])

  for (const [label, res] of [
    ["verification", verificationRes],
    ["report", reportRes],
    ["anomaly", anomalyRes],
  ] as const) {
    if (res.error) {
      return new Response(JSON.stringify({ error: `${label} query failed: ${res.error.message}` }), {
        status: 500,
      })
    }
  }

  const statsByState = new Map<string, StateStats>()
  const getOrInit = (state: string): StateStats => {
    let stats = statsByState.get(state)
    if (!stats) {
      stats = { verification_count: 0, not_found_count: 0, counterfeit_reports: 0, anomaly_count: 0 }
      statsByState.set(state, stats)
    }
    return stats
  }

  for (const row of verificationRes.data ?? []) {
    const stats = getOrInit(row.state)
    stats.verification_count = row.verification_count
    stats.not_found_count = row.not_found_count
  }
  for (const row of reportRes.data ?? []) {
    getOrInit(row.state).counterfeit_reports = row.report_count
  }
  for (const row of anomalyRes.data ?? []) {
    getOrInit(row.state).anomaly_count = row.anomaly_touch_count
  }

  if (statsByState.size === 0) {
    return new Response(JSON.stringify({ upserted: 0 }), { status: 200 })
  }

  const rows = [...statsByState.entries()].map(([state, stats]) => ({
    state,
    period_date: periodDate,
    ...stats,
    updated_at: new Date().toISOString(),
  }))

  const { data: upserted, error } = await supabase
    .from("geographic_stats")
    .upsert(rows, { onConflict: "state,period_date" })
    .select("id")

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify({ upserted: upserted?.length ?? 0 }), { status: 200 })
})
