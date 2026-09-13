"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

interface CheckoutParams {
  planId: string
  billingCycle: "monthly" | "yearly"
}

// Paystack's flow is a full-page redirect (not a modal SDK popup), so
// success here means "the browser is about to navigate away," not "the
// subscription is active" - activation happens server-side once the user
// lands back on /billing/verify and that page calls /api/payments/verify.
export function useSubscriptionCheckout() {
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (params: CheckoutParams) => {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Could not start checkout")
      }
      return result as { authorizationUrl: string }
    },
    onMutate: (params) => setPendingPlanId(params.planId),
    onSuccess: (result) => {
      window.location.href = result.authorizationUrl
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setPendingPlanId(null)
    },
  })

  const startCheckout = (params: CheckoutParams) => mutation.mutate(params)

  return {
    startCheckout,
    isRedirecting: mutation.isPending,
    pendingPlanId,
  }
}
