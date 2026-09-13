import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { CurrentPlanCard } from "@/components/billing/current-plan-card"
import { PaymentHistoryTable } from "@/components/billing/payment-history-table"
import { UsageMeters } from "@/components/billing/usage-meters"
import {
  getCurrentSubscription,
  getImplicitPlan,
  getPaymentHistory,
  getUsageForCurrentPeriod,
} from "@/lib/payments/subscription-manager"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/types/database"

export const metadata: Metadata = {
  title: "Billing | VeriGuard",
}

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  const [subscription, payments] = await Promise.all([
    getCurrentSubscription(supabase, user.id),
    getPaymentHistory(supabase, user.id),
  ])

  const billableRole = profile?.role as UserRole | undefined
  const fallbackPlan =
    !subscription && billableRole && billableRole !== "admin"
      ? await getImplicitPlan(supabase, billableRole)
      : null

  const usage = await getUsageForCurrentPeriod(supabase, user.id)
  const limits = (subscription?.plan.limits ?? fallbackPlan?.limits ?? {}) as Record<string, number>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-muted-foreground text-sm">Manage your plan, usage, and payment history.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CurrentPlanCard subscription={subscription} fallbackPlan={fallbackPlan} />
        <UsageMeters limits={limits} usage={usage} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Payment History</h2>
        <PaymentHistoryTable payments={payments} />
      </div>
    </div>
  )
}
