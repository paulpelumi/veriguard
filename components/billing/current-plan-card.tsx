import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils/date"
import { formatNaira } from "@/lib/utils/currency"
import type { SubscriptionWithPlan } from "@/lib/payments/subscription-manager"
import type { Database } from "@/types/database"

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"]

interface CurrentPlanCardProps {
  subscription: SubscriptionWithPlan | null
  // Falls back to this when there's no paid subscription row yet - every
  // role has an implicit $0 plan from signup (Consumer Free, Business
  // Free, Manufacturer Pilot - see migration 0022). Both can still be
  // null in principle (e.g. an admin, who has no billable plan at all),
  // so the "not subscribed" branch below stays as a defensive fallback
  // rather than the expected path.
  fallbackPlan: SubscriptionPlan | null
}

export function CurrentPlanCard({ subscription, fallbackPlan }: CurrentPlanCardProps) {
  const plan = subscription?.plan ?? fallbackPlan

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">You don&apos;t have an active subscription yet.</p>
        </CardContent>
        <CardFooter>
          <Button nativeButton={false} render={<Link href="/pricing" />}>
            Choose a Plan
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const priceKobo = subscription
    ? subscription.billing_cycle === "yearly"
      ? plan.price_yearly_kobo
      : plan.price_monthly_kobo
    : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current Plan</CardTitle>
          {subscription && <Badge className="capitalize">{subscription.status}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-semibold">{plan.name}</p>
        <p className="text-muted-foreground text-sm">
          {priceKobo > 0
            ? `${formatNaira(priceKobo)} / ${subscription?.billing_cycle === "yearly" ? "year" : "month"}`
            : "Free"}
        </p>
        {subscription?.current_period_end && (
          <p className="text-muted-foreground text-sm">
            Renews {formatDate(subscription.current_period_end)}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" nativeButton={false} render={<Link href="/pricing" />}>
          {subscription ? "Change Plan" : "Upgrade"}
        </Button>
      </CardFooter>
    </Card>
  )
}
