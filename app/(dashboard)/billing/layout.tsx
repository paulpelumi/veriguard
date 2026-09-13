import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient } from "@/lib/supabase/server"
import { navItemsForRole } from "@/lib/utils/navigation"
import { homeForRole } from "@/lib/utils/role-routing"

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single()

  // Admin has no subscription of its own - see navItemsForRole's own note.
  if (!profile || profile.role === "admin") {
    redirect(homeForRole(profile?.role))
  }

  return (
    <DashboardShell
      navItems={navItemsForRole(profile.role)}
      homeHref={homeForRole(profile.role)}
      fullName={profile.full_name}
      email={profile.email}
      role={profile.role}
    >
      {children}
    </DashboardShell>
  )
}
