import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import type { AnomalySeverity, AnomalyType } from "@/types/database"

const VALID_SEVERITIES: AnomalySeverity[] = ["elevated", "high", "critical"]
const VALID_TYPES: AnomalyType[] = [
  "high_frequency",
  "geographic_spike",
  "velocity_spike",
  "multi_state_surge",
]

// Lists verification_anomalies for the admin dashboard (Module 7). RLS
// already restricts this table to admins via is_admin(), but an explicit
// check here lets a non-admin caller get a clear 403 instead of a silently
// empty list that could be misread as "no anomalies exist".
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const severity = searchParams.get("severity")
  const anomalyType = searchParams.get("type")
  const resolvedParam = searchParams.get("resolved")

  let query = supabase
    .from("verification_anomalies")
    .select("*")
    .order("created_at", { ascending: false })

  if (severity && VALID_SEVERITIES.includes(severity as AnomalySeverity)) {
    query = query.eq("severity", severity as AnomalySeverity)
  }
  if (anomalyType && VALID_TYPES.includes(anomalyType as AnomalyType)) {
    query = query.eq("anomaly_type", anomalyType as AnomalyType)
  }
  if (resolvedParam === "true" || resolvedParam === "false") {
    query = query.eq("is_resolved", resolvedParam === "true")
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "query_failed" } },
      { status: 500 }
    )
  }

  // "View details: ... list of states where verifications occurred" (spec).
  // window_start was recorded on the anomaly itself at detection time
  // (Module 4), so this answers "which states touched this NAFDAC number
  // during the window that triggered this specific anomaly" rather than
  // some arbitrary lookback.
  const anomaliesWithStates = await Promise.all(
    (data ?? []).map(async (anomaly) => {
      const windowStart =
        (anomaly.details as Record<string, unknown> | null)?.window_start ?? anomaly.created_at
      const { data: states } = await supabase.rpc("anomaly_states_touched", {
        p_nafdac_number: anomaly.nafdac_number,
        p_since: typeof windowStart === "string" ? windowStart : anomaly.created_at,
      })
      return { ...anomaly, states_touched: states ?? [] }
    })
  )

  return NextResponse.json({ anomalies: anomaliesWithStates })
}
