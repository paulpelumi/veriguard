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
