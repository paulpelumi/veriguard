"use client"

import { useState } from "react"

import { PricingCard } from "@/components/billing/pricing-card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Database } from "@/types/database"

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"]
type BillableRole = SubscriptionPlan["role"]

interface PricingPlansProps {
  plans: SubscriptionPlan[]
  defaultRole: BillableRole
  isAuthenticated: boolean
  // When the visitor is logged in, only their own role's tab makes sense
  // to offer (a business account can't subscribe to a manufacturer plan -
  // see /api/payments/initialize's own role_mismatch check), so the other
  // two tabs are hidden entirely instead of shown-then-rejected.
  lockToRole: boolean
  currentPlanId: string | null
}

const ROLE_LABELS: Record<BillableRole, string> = {
  consumer: "Consumer",
  business: "Business",
  manufacturer: "Manufacturer",
}

export function PricingPlans({ plans, defaultRole, isAuthenticated, lockToRole, currentPlanId }: PricingPlansProps) {
  const [role, setRole] = useState<BillableRole>(defaultRole)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  const roles: BillableRole[] = lockToRole ? [defaultRole] : ["consumer", "business", "manufacturer"]
  const visiblePlans = plans.filter((plan) => plan.role === role)
  const highlightedPlanId = visiblePlans.find((plan) => plan.tier === "professional" || plan.tier === "premium")?.id

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex flex-col items-center gap-4">
        {roles.length > 1 && (
          <Tabs value={role} onValueChange={(value) => setRole(value as BillableRole)}>
            <TabsList>
              {roles.map((r) => (
                <TabsTrigger key={r} value={r}>
                  {ROLE_LABELS[r]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as "monthly" | "yearly")}>
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly (save 20%)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* One row regardless of plan count - four cards (the manufacturer
          tab's worst case) never fit three-per-row without wrapping to a
          second line, so this scrolls horizontally instead of wrapping. */}
      <div className="w-full max-w-6xl overflow-x-auto pb-2">
        <div className="mx-auto flex w-fit gap-6 px-1">
          {visiblePlans.map((plan) => (
            <div key={plan.id} className="w-72 shrink-0">
              <PricingCard
                plan={plan}
                billingCycle={billingCycle}
                isCurrentPlan={plan.id === currentPlanId}
                isHighlighted={plan.id === highlightedPlanId}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
