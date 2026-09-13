import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import type { ManufacturerVerificationStatus } from "@/types/database"

const VALID_STATUSES: ManufacturerVerificationStatus[] = [
  "pending",
  "auto_checking",
  "pending_manual",
  "approved",
  "rejected",
]

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  let query = supabase
    .from("manufacturer_profiles")
    .select(
      "id, company_name, nafdac_manufacturer_code, cac_number, state, verification_status, auto_check_result, created_at, rejection_reason"
    )
    .order("created_at", { ascending: false })

  if (status && VALID_STATUSES.includes(status as ManufacturerVerificationStatus)) {
    query = query.eq("verification_status", status as ManufacturerVerificationStatus)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "query_failed" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ manufacturers: data })
}
