import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ProfileCompletionModal } from "@/components/shared/profile-completion-modal"
import { createClient } from "@/lib/supabase/server"
import { consumerNavItems } from "@/lib/utils/navigation"
import { shouldShowProfileCompletionModal } from "@/lib/utils/profile-completion"
import { homeForRole } from "@/lib/utils/role-routing"

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
    .select("full_name, email, role, phone, state, profile_completion_skipped_at")
    .eq("id", user.id)
    .single()

  // homeForRole covers every role generically - see role-routing.ts.
  if (!profile || profile.role !== "consumer") {
    redirect(homeForRole(profile?.role))
  }

  return (
    <>
      <ProfileCompletionModal
        userId={user.id}
        role={profile.role}
        defaultOpen={shouldShowProfileCompletionModal(profile)}
      />
      <DashboardShell
        navItems={consumerNavItems}
        homeHref="/consumer/dashboard"
        fullName={profile.full_name}
        email={profile.email}
        role={profile.role}
      >
        {children}
      </DashboardShell>
    </>
  )
}
