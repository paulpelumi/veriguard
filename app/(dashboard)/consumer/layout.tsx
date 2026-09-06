import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/dashboard-shell"
import { ProfileCompletionModal } from "@/components/shared/profile-completion-modal"
import { createClient } from "@/lib/supabase/server"
import { consumerNavItems } from "@/lib/utils/navigation"
import { shouldShowProfileCompletionModal } from "@/lib/utils/profile-completion"

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
