import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

// The real admin-area route protection (middleware-level, covering every
// /admin/* route) is Module 7's job - it doesn't exist yet, so this page-
// level guard exists only so /admin/intelligence itself is never reachable
// unprotected in the meantime. Deliberately minimal and scoped to one page
// rather than touching proxy.ts (this project's Next.js 16 middleware
// equivalent), so it doesn't preempt Module 7's broader implementation.
// Mirrors the existing business/consumer redirect pattern in
// lib/supabase/middleware.ts.
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
    redirect(profile?.role === "business" ? "/business/dashboard" : "/consumer/dashboard")
  }

  return { supabase, user }
}
