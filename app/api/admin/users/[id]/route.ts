import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import type { UserRole } from "@/types/database"

const VALID_ROLES: UserRole[] = ["consumer", "business", "manufacturer", "admin"]

// Suspend/unsuspend a user or change their role - the two per-user admin
// actions in the spec ("View Profile" is just navigating to the existing
// profile view, not a distinct write).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const body = await request.json().catch(() => null)
  const updates: { role?: UserRole; is_suspended?: boolean } = {}

  if (typeof body?.role === "string" && VALID_ROLES.includes(body.role as UserRole)) {
    updates.role = body.role as UserRole
  }
  if (typeof body?.is_suspended === "boolean") {
    updates.is_suspended = body.is_suspended
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: { message: "No valid fields to update", code: "invalid_request" } },
      { status: 400 }
    )
  }

  // An admin locking themselves out (demoting their own role, or suspending
  // their own account) has no recovery path short of direct database
  // access - block it here rather than let it happen by a misclick.
  if (user?.id === id && (updates.role !== undefined || updates.is_suspended === true)) {
    return NextResponse.json(
      {
        error: {
          message: "You can't change your own role or suspend your own account.",
          code: "self_action_forbidden",
        },
      },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(
      "id, email, full_name, role, business_name, state, subscription_tier, is_verified, is_suspended, created_at"
    )
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "update_failed" } },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json(
      { error: { message: "User not found", code: "not_found" } },
      { status: 404 }
    )
  }

  return NextResponse.json({ user: data })
}
