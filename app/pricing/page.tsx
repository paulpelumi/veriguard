import type { Metadata } from "next"

import { PricingPlans } from "@/components/billing/pricing-plans"
import { getCurrentSubscription } from "@/lib/payments/subscription-manager"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/database"

export const metadata: Metadata = {
  title: "Pricing | VeriGuard",
}

const BILLABLE_ROLES = ["consumer", "business", "manufacturer"] as const

export default async function PricingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: plans } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("price_monthly_kobo", { ascending: true })

  let userRole: UserRole | null = null
  let currentPlanId: string | null = null

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role ?? null

    if (userRole && (BILLABLE_ROLES as readonly string[]).includes(userRole)) {
      const subscription = await getCurrentSubscription(supabase, user.id)
      currentPlanId = subscription?.plan.id ?? null
    }
  }

  // An admin has no billable plan of their own - fall back to showing the
  // consumer tab (unlocked) rather than crashing on a role the pricing
  // grid was never meant to gate.
  const defaultRole = (userRole && (BILLABLE_ROLES as readonly string[]).includes(userRole)
    ? userRole
    : "consumer") as (typeof BILLABLE_ROLES)[number]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-xl">
          Choose the plan that fits how you use VeriGuard - as a shopper, a retailer, or a manufacturer.
        </p>
      </div>

      <PricingPlans
        plans={plans ?? []}
        defaultRole={defaultRole}
        isAuthenticated={!!user}
        lockToRole={!!user && userRole !== "admin"}
        currentPlanId={currentPlanId}
      />
    </div>
  )
}
