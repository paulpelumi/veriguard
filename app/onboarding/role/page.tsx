import { redirect } from "next/navigation"

import { RoleOnboardingForm } from "@/components/auth/role-onboarding-form"
import { createClient } from "@/lib/supabase/server"

export default async function OnboardingRolePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Welcome to VeriGuard</h1>
        <p className="mt-1 text-sm text-muted-foreground">How will you be using VeriGuard?</p>
      </div>
      <RoleOnboardingForm userId={user.id} />
    </div>
  )
}
