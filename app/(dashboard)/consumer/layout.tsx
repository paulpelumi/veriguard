import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { createClient } from "@/lib/supabase/server"
import { consumerNavItems } from "@/lib/utils/navigation"

export default async function ConsumerLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  // This predates the admin/manufacturer roles (Module 7) and only ever
  // considered two roles - an admin visiting here isn't "wrong", they
  // just belong at /admin instead of being bounced to /business/dashboard,
  // which would in turn bounce them right back here forever (neither
  // layout's check can ever pass for a role that is genuinely neither).
  if (profile?.role === "admin") {
    redirect("/admin")
  }

  if (!profile || profile.role !== "consumer") {
    redirect("/business/dashboard")
  }

  return (
    <DashboardShell
      navItems={consumerNavItems}
      homeHref="/consumer/dashboard"
      fullName={profile.full_name}
      email={profile.email}
      role={profile.role}
    >
      {children}
    </DashboardShell>
  )
}
