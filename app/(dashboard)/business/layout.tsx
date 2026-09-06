import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ProfileCompletionModal } from "@/components/shared/profile-completion-modal"
import { createClient } from "@/lib/supabase/server"
import { businessNavItems } from "@/lib/utils/navigation"
import { shouldShowProfileCompletionModal } from "@/lib/utils/profile-completion"

export default async function BusinessLayout({
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
    .select("full_name, email, role, phone, state, profile_completion_skipped_at")
    .eq("id", user.id)
    .single()

  // See the matching note in consumer/layout.tsx: this predates the
  // admin/manufacturer roles (Module 7) and only ever considered two roles.
  // An admin belongs at /admin, not bounced to /consumer/dashboard, which
  // would otherwise bounce them right back here forever.
  if (profile?.role === "admin") {
    redirect("/admin")
  }

  if (!profile || profile.role !== "business") {
    redirect("/consumer/dashboard")
  }

  return (
    <>
      <ProfileCompletionModal
        userId={user.id}
        role={profile.role}
        defaultOpen={shouldShowProfileCompletionModal(profile)}
      />
      <DashboardShell
        navItems={businessNavItems}
        homeHref="/business/dashboard"
        fullName={profile.full_name}
        email={profile.email}
        role={profile.role}
      >
        {children}
      </DashboardShell>
    </>
  )
}
