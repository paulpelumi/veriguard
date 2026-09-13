import { NextResponse, type NextRequest } from "next/server"

import { sendManufacturerApprovedEmail, sendManufacturerRejectedEmail } from "@/lib/email/manufacturer-emails"
import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const { data, error } = await supabase
    .from("manufacturer_profiles")
    .select("*, profile:profiles!manufacturer_profiles_id_fkey(full_name, email)")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "query_failed" } },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: { message: "Manufacturer not found", code: "not_found" } },
      { status: 404 }
    )
  }

  return NextResponse.json({ manufacturer: data })
}

// Approve or reject an application. The manufacturer_profiles write goes
// through the admin's own session (0017_admin_manufacturer_review.sql
// grants this); the notification insert needs the service role since it
// writes to the MANUFACTURER's own notifications row, not the admin's.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser()

  const body = await request.json().catch(() => null)
  const action = body?.action

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json(
      { error: { message: "action must be 'approve' or 'reject'", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const rejectionReason = typeof body?.rejection_reason === "string" ? body.rejection_reason.trim() : ""
  if (action === "reject" && !rejectionReason) {
    return NextResponse.json(
      { error: { message: "rejection_reason is required to reject", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const updates =
    action === "approve"
      ? {
          verification_status: "approved" as const,
          manual_reviewed_by: adminUser!.id,
          manual_reviewed_at: new Date().toISOString(),
          subscription_started_at: new Date().toISOString(),
          rejection_reason: null,
        }
      : {
          verification_status: "rejected" as const,
          manual_reviewed_by: adminUser!.id,
          manual_reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        }

  const { data: manufacturer, error: updateError } = await supabase
    .from("manufacturer_profiles")
    .update(updates)
    .eq("id", id)
    .select("company_name")
    .maybeSingle()

  if (updateError) {
    return NextResponse.json(
      { error: { message: updateError.message, code: "update_failed" } },
      { status: 500 }
    )
  }
  if (!manufacturer) {
    return NextResponse.json(
      { error: { message: "Manufacturer not found", code: "not_found" } },
      { status: 404 }
    )
  }

  const serviceClient = createServiceRoleClient()
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .single()

  if (profile) {
    if (action === "approve") {
      await sendManufacturerApprovedEmail(profile.email, profile.full_name ?? "there", manufacturer.company_name)
      await serviceClient.from("notifications").insert({
        user_id: id,
        type: "verification_approved",
        title: "Your manufacturer application was approved",
        message: `${manufacturer.company_name} is now approved on VeriGuard.`,
        link: "/manufacturer/dashboard",
      })
    } else {
      await sendManufacturerRejectedEmail(
        profile.email,
        profile.full_name ?? "there",
        manufacturer.company_name,
        rejectionReason
      )
      await serviceClient.from("notifications").insert({
        user_id: id,
        type: "verification_rejected",
        title: "Your manufacturer application was not approved",
        message: rejectionReason,
        link: "/manufacturer/dashboard",
      })
    }
  }

  return NextResponse.json({ status: action === "approve" ? "approved" : "rejected" })
}
