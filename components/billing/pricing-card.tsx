"use client"

import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useSubscriptionCheckout } from "@/hooks/use-subscription"
import { formatNaira } from "@/lib/utils/currency"
import { cn } from "@/lib/utils"
import type { Database } from "@/types/database"

type SubscriptionPlan = Database["public"]["Tables"]["subscription_plans"]["Row"]

interface PricingCardProps {
  plan: SubscriptionPlan
  billingCycle: "monthly" | "yearly"
  isCurrentPlan: boolean
  isHighlighted?: boolean
  // Absent for a signed-out visitor - clicking a paid plan then just sends
  // them to sign up instead of attempting a checkout with no account to
  // attach the subscription to.
  isAuthenticated: boolean
}

export function PricingCard({ plan, billingCycle, isCurrentPlan, isHighlighted, isAuthenticated }: PricingCardProps) {
  const { startCheckout, isProcessing, pendingPlanId } = useSubscriptionCheckout()

  const priceKobo = billingCycle === "yearly" ? plan.price_yearly_kobo : plan.price_monthly_kobo
  const isFree = priceKobo <= 0
  const features = Object.entries((plan.features as Record<string, boolean>) ?? {}).filter(([, enabled]) => enabled)

  return (
    <Card className={cn("flex flex-col", isHighlighted && "border-primary shadow-md")}>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>{plan.name}</CardTitle>
          {isHighlighted && <Badge>Most Popular</Badge>}
        </div>
        <div>
          <span className="text-3xl font-bold">{isFree ? "Free" : formatNaira(priceKobo)}</span>
          {!isFree && (
            <span className="text-muted-foreground text-sm"> /{billingCycle === "yearly" ? "year" : "month"}</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="flex flex-col gap-2 text-sm">
          {features.map(([feature]) => (
            <li key={feature} className="flex items-center gap-2">
              <Check className="text-success size-4 shrink-0" />
              <span className="capitalize">{feature.replaceAll("_", " ")}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrentPlan ? (
          <Button className="w-full" variant="outline" disabled>
            Current Plan
          </Button>
        ) : !isAuthenticated ? (
          // Manufacturer signup is its own multi-step wizard (Phase 4), not
          // the plain consumer/business /register form - see
          // register-form.tsx's own note that it never offers "manufacturer"
          // as a selectable role.
          <Button
            className="w-full"
            nativeButton={false}
            render={
              <a href={plan.role === "manufacturer" ? "/register/manufacturer" : `/register?role=${plan.role}`} />
            }
          >
            Get Started
          </Button>
        ) : isFree ? (
          <Button className="w-full" variant="outline" disabled>
            Included by default
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => startCheckout({ planId: plan.id, billingCycle })}
            disabled={isProcessing}
          >
            {isProcessing && pendingPlanId === plan.id ? "Opening checkout…" : "Subscribe"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
