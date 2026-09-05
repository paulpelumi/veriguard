import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { requireAdminApi } from "@/lib/supabase/require-admin-api"
import type { SubscriptionTier, UserRole } from "@/types/database"

const VALID_ROLES: UserRole[] = ["consumer", "business", "manufacturer", "admin"]
const VALID_TIERS: SubscriptionTier[] = ["free", "starter", "professional", "enterprise"]

// Lists every user for the admin user-management table. profiles' RLS now
// has an "Admin can view all profiles" policy (Module 7) alongside the
// existing self-only one, so this only ever returns something for an
// actual admin caller regardless of this explicit check - but the check
// still gets us a clear 403 instead of a silently empty table.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const authError = await requireAdminApi(supabase)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role")
  const tier = searchParams.get("tier")
  const state = searchParams.get("state")
  const search = searchParams.get("search")?.trim()

  let query = supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, business_name, state, subscription_tier, is_verified, is_suspended, created_at"
    )
    .order("created_at", { ascending: false })

  if (role && VALID_ROLES.includes(role as UserRole)) {
    query = query.eq("role", role as UserRole)
  }
  if (tier && VALID_TIERS.includes(tier as SubscriptionTier)) {
    query = query.eq("subscription_tier", tier as SubscriptionTier)
  }
  if (state) {
    query = query.eq("state", state)
  }
  if (search) {
    const term = `%${search}%`
    query = query.or(`full_name.ilike.${term},email.ilike.${term},business_name.ilike.${term}`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { message: error.message, code: "query_failed" } },
      { status: 500 }
    )
  }

  return NextResponse.json({ users: data })
}
