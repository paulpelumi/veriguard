import { DashboardShell } from "@/components/layout/dashboard-shell"
import { requireAdmin } from "@/lib/supabase/require-admin"
import { adminNavItems } from "@/lib/utils/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", user.id)
    .single()

  return (
    <DashboardShell
      navItems={adminNavItems}
      homeHref="/admin"
      fullName={profile?.full_name ?? null}
      email={profile?.email ?? user.email ?? ""}
      role="admin"
    >
      {children}
    </DashboardShell>
  )
}
