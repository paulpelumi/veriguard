import { NextResponse } from "next/server"

import type { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

// API-route counterpart to require-admin.ts's page-level guard, which uses
// redirect() - not usable here since these routes return JSON to fetch()
// callers, not pages. Returns a ready-to-return NextResponse when the
// caller isn't an authorized admin, or null when the check passes. Was
// previously copy-pasted into each admin API route (anomalies, recalls,
// gs1); extracted here once a fourth (users) needed the same check.
export async function requireAdminApi(supabase: SupabaseServerClient): Promise<NextResponse | null> {
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
  return null
}
