// Phase 3, Module 4: Verification Frequency Anomaly Detection.
// Deploy via the Supabase Dashboard's Edge Functions "Via Editor" flow (this
// project doesn't use the CLI for functions), then schedule it with pg_cron
// + pg_net to run every 6 hours, same pattern as expiry-checker.
//
// Detects three signals over verification_logs (see lib/intelligence/
// anomaly-types.ts in the Next.js app for the shared thresholds/rationale -
// duplicated here since Edge Functions run in an isolated Deno runtime and
// can't import from the app):
//   1. high_frequency  - raw verification count for one NAFDAC number in 24h
//   2. geographic_spike - same number verified from 5+ distinct states in 6h
//   3. velocity_spike  - today's count is 2x+ the trailing 7-day daily average
//
// 'multi_state_surge' exists in the verification_anomalies check constraint
// but has no defined detection rule in the spec, so it's never emitted here
// - see the longer note in lib/intelligence/anomaly-types.ts for why that's
// deliberate rather than an oversight.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const HIGH_FREQUENCY_THRESHOLDS: { count: number; severity: string }[] = [
  { count: 500, severity: "critical" },
  { count: 200, severity: "high" },
  { count: 50, severity: "elevated" },
]
const GEOGRAPHIC_SPIKE_MIN_STATES = 5
const GEOGRAPHIC_SPIKE_WINDOW_HOURS = 6
const VELOCITY_SPIKE_MULTIPLIER = 2
const VELOCITY_SPIKE_MIN_BASELINE = 5
const ELEVATED_MONITORING_HOURS = 72
// How far back to look for an existing unresolved anomaly of the same type
// before flagging again - keeps a persistent condition from re-inserting
// (and re-notifying the admin) every single 6-hour run.
const DEDUP_WINDOW_HOURS = 24

interface FrequencyRow {
  nafdac_number: string
  verification_count: number
  unique_users: number
}
interface GeoRow {
  nafdac_number: string
  distinct_states: number
}
interface BaselineRow {
  nafdac_number: string
  baseline_daily_avg: number
}

interface AnomalyToInsert {
  nafdac_number: string
  anomaly_type: string
  severity: string
  verification_count: number
  unique_users: number | null
  distinct_states: number | null
  time_window_hours: number
  details: Record<string, unknown>
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
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const since6h = new Date(now.getTime() - GEOGRAPHIC_SPIKE_WINDOW_HOURS * 60 * 60 * 1000)
  const baselineSince = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
  const baselineUntil = since24h

  const [freq24Res, freq6Res, geoRes, baselineRes, dedupRes] = await Promise.all([
    supabase.rpc("anomaly_frequency_stats", { p_since: since24h.toISOString() }),
    supabase.rpc("anomaly_frequency_stats", { p_since: since6h.toISOString() }),
    supabase.rpc("anomaly_geo_stats", { p_since: since6h.toISOString() }),
    supabase.rpc("anomaly_baseline_stats", {
      p_since: baselineSince.toISOString(),
      p_until: baselineUntil.toISOString(),
    }),
    supabase
      .from("verification_anomalies")
      .select("nafdac_number, anomaly_type")
      .eq("is_resolved", false)
      .gte("created_at", new Date(now.getTime() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000).toISOString()),
  ])

  for (const [label, res] of [
    ["freq24", freq24Res],
    ["freq6", freq6Res],
    ["geo", geoRes],
    ["baseline", baselineRes],
    ["dedup", dedupRes],
  ] as const) {
    if (res.error) {
      return new Response(JSON.stringify({ error: `${label} query failed: ${res.error.message}` }), {
        status: 500,
      })
    }
  }

  const freq24 = (freq24Res.data ?? []) as FrequencyRow[]
  const freq6ByNumber = new Map(((freq6Res.data ?? []) as FrequencyRow[]).map((r) => [r.nafdac_number, r]))
  const geo = (geoRes.data ?? []) as GeoRow[]
  const baselineByNumber = new Map(
    ((baselineRes.data ?? []) as BaselineRow[]).map((r) => [r.nafdac_number, r.baseline_daily_avg])
  )
  const alreadyFlagged = new Set(
    (dedupRes.data ?? []).map((r: { nafdac_number: string; anomaly_type: string }) => `${r.anomaly_type}:${r.nafdac_number}`)
  )

  const toInsert: AnomalyToInsert[] = []

  for (const row of freq24) {
    const threshold = HIGH_FREQUENCY_THRESHOLDS.find((t) => row.verification_count >= t.count)
    if (!threshold) continue
    const key = `high_frequency:${row.nafdac_number}`
    if (alreadyFlagged.has(key)) continue
    toInsert.push({
      nafdac_number: row.nafdac_number,
      anomaly_type: "high_frequency",
      severity: threshold.severity,
      verification_count: row.verification_count,
      unique_users: row.unique_users,
      distinct_states: null,
      time_window_hours: 24,
      details: { window_start: since24h.toISOString(), window_end: now.toISOString() },
    })
  }

  for (const row of geo) {
    if (row.distinct_states < GEOGRAPHIC_SPIKE_MIN_STATES) continue
    const key = `geographic_spike:${row.nafdac_number}`
    if (alreadyFlagged.has(key)) continue
    const freq = freq6ByNumber.get(row.nafdac_number)
    toInsert.push({
      nafdac_number: row.nafdac_number,
      anomaly_type: "geographic_spike",
      // No explicit severity rule is given for this signal in the spec (only
      // the frequency thresholds map to specific severities) - 'high' is a
      // deliberate, documented choice: a single number scanned from 5+
      // states within 6 hours is a meaningfully wide, fast spread regardless
      // of raw volume.
      severity: "high",
      verification_count: freq?.verification_count ?? row.distinct_states,
      unique_users: freq?.unique_users ?? null,
      distinct_states: row.distinct_states,
      time_window_hours: GEOGRAPHIC_SPIKE_WINDOW_HOURS,
      details: { window_start: since6h.toISOString(), window_end: now.toISOString() },
    })
  }

  for (const row of freq24) {
    const baseline = baselineByNumber.get(row.nafdac_number) ?? 0
    if (baseline < VELOCITY_SPIKE_MIN_BASELINE) continue
    if (row.verification_count < baseline * VELOCITY_SPIKE_MULTIPLIER) continue
    const key = `velocity_spike:${row.nafdac_number}`
    if (alreadyFlagged.has(key)) continue
    toInsert.push({
      nafdac_number: row.nafdac_number,
      anomaly_type: "velocity_spike",
      // Same reasoning as geographic_spike above - this is a rate-of-change
      // signal independent of absolute volume, so it doesn't reuse the
      // high_frequency severity ladder. 'elevated' is the conservative
      // default; a velocity spike large enough to also cross a frequency
      // threshold will additionally show up as its own high_frequency row.
      severity: "elevated",
      verification_count: row.verification_count,
      unique_users: row.unique_users,
      distinct_states: null,
      time_window_hours: 24,
      details: {
        window_start: since24h.toISOString(),
        window_end: now.toISOString(),
        baseline_daily_avg: baseline,
      },
    })
  }

  if (toInsert.length === 0) {
    return new Response(JSON.stringify({ anomalies_detected: 0 }), { status: 200 })
  }

  const { data: inserted, error: insertError } = await supabase
    .from("verification_anomalies")
    .insert(toInsert)
    .select("id, nafdac_number, anomaly_type, severity")

  if (insertError) {
    return new Response(JSON.stringify({ error: `insert failed: ${insertError.message}` }), {
      status: 500,
    })
  }

  // Originally gated to severity === "critical" only, matching the spec's
  // literal text. Changed to any severity per explicit user decision, since
  // the spec's own test instructions (insert 60 rows, confirm the banner
  // shows) only cross the lowest "elevated" tier - critical-only would make
  // that test impossible without inserting 500+ rows.
  const flaggedNumbers = (inserted ?? []).map((row) => row.nafdac_number)

  if (flaggedNumbers.length > 0) {
    const elevatedUntil = new Date(now.getTime() + ELEVATED_MONITORING_HOURS * 60 * 60 * 1000).toISOString()
    await supabase
      .from("nafdac_cache")
      .update({ elevated_until: elevatedUntil })
      .in("nafdac_number", flaggedNumbers)
  }

  const adminEmail = Deno.env.get("ADMIN_EMAIL")
  let notificationsCreated = 0
  if (adminEmail) {
    const { data: admin } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", adminEmail)
      .maybeSingle()

    if (admin) {
      const notifications = (inserted ?? []).map((row) => ({
        user_id: admin.id,
        type: "verification_anomaly",
        title: `${row.severity.toUpperCase()} anomaly: ${row.nafdac_number}`,
        message: `Unusual verification activity detected for NAFDAC number ${row.nafdac_number} (${row.anomaly_type.replace(/_/g, " ")}).`,
        link: `/admin/anomalies?id=${row.id}`,
        metadata: { anomaly_id: row.id, anomaly_type: row.anomaly_type, severity: row.severity },
      }))
      const { error: notifyError } = await supabase.from("notifications").insert(notifications)
      if (!notifyError) notificationsCreated = notifications.length
    }
  }

  return new Response(
    JSON.stringify({
      anomalies_detected: inserted?.length ?? 0,
      critical_elevated: criticalNumbers.length,
      notifications_created: notificationsCreated,
    }),
    { status: 200 }
  )
})
