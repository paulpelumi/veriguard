import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { homeForRole } from "@/lib/utils/role-routing"

// Module 7's middleware-level guard (lib/supabase/middleware.ts) is the
// real admin-area route protection covering every /admin/* route - this
// page-level guard is defense in depth, not the security boundary.
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.rpc("is_admin"),
  ])

  if (!isAdmin) {
    redirect(homeForRole(profile?.role))
  }

  return { supabase, user }
}
