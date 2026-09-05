import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "unauthorized" } },
      { status: 401 }
    )
  }

  const { data: isAdmin } = await supabase.rpc("is_admin")
  if (!isAdmin) {
    return NextResponse.json(
      { error: { message: "Admin access required", code: "forbidden" } },
      { status: 403 }
    )
  }

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

  return NextResponse.json({ anomalies: data })
}
