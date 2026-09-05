import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import type { ReportStatus } from "@/types/database"

const VALID_STATUSES: ReportStatus[] = ["pending", "reviewed", "confirmed", "dismissed"]

// Lists every counterfeit report (all reporters) for the admin review page,
// with the reporter's name/email embedded - needs the "Admin can view all
// counterfeit reports" and "Admin can view all profiles" policies added in
// Modules 6/7, since counterfeit_reports and profiles both previously only
// exposed a user's own rows.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("counterfeit_reports")
    .select("*, reporter:profiles!counterfeit_reports_reporter_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })

  if (status && VALID_STATUSES.includes(status as ReportStatus)) {
    query = query.eq("status", status as ReportStatus)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "query_failed" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ reports: data })
}

// Updates a report's status. Confirming a report additionally flags the
// NAFDAC number as counterfeit platform-wide via admin_confirm_counterfeit
// (a security-definer function - see 0012_admin_dashboard.sql for why this
// isn't a plain table write).
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : ""
  const status = typeof body?.status === "string" ? body.status : ""

  if (!id || !VALID_STATUSES.includes(status as ReportStatus)) {
    return NextResponse.json(
      { error: { message: "id and a valid status are required", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("counterfeit_reports")
    .update({ status: status as ReportStatus })
    .eq("id", id)
    .select("*")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "update_failed" } },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: { message: "Report not found", code: "not_found" } },
      { status: 404 }
    )
  }

  if (status === "confirmed" && data.nafdac_number) {
    const { error: flagError } = await supabase.rpc("admin_confirm_counterfeit", {
      p_nafdac_number: data.nafdac_number,
    })
    if (flagError) {
      return NextResponse.json(
        {
          report: data,
          warning: `Report confirmed, but flagging ${data.nafdac_number} failed: ${flagError.message}`,
        },
        { status: 207 }
      )
    }
  }

  return NextResponse.json({ report: data })
}
