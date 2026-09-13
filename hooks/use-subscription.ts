"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { openPaystackCheckout } from "@/lib/payments/paystack-inline"

interface CheckoutParams {
  planId: string
  billingCycle: "monthly" | "yearly"
}

interface InitializeResult {
  reference: string
  amountKobo: number
  email: string
  planId: string
  billingCycle: "monthly" | "yearly"
}

// The popup never navigates the page away, so "success" here just means
// the charge was captured - activation still runs through the same
// /api/payments/verify call the webhook races against (see that route's
// own idempotency comment), triggered here from the popup's callback
// instead of a page load.
export function useSubscriptionCheckout() {
  const router = useRouter()
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)

  const mutation = useMutation({
    mutationFn: async (params: CheckoutParams): Promise<InitializeResult> => {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Could not start checkout")
      }
      return result as InitializeResult
    },
    onMutate: (params) => setPendingPlanId(params.planId),
    onSuccess: async (result) => {
      try {
        await openPaystackCheckout({
          email: result.email,
          amountKobo: result.amountKobo,
          reference: result.reference,
          metadata: { planId: result.planId, billingCycle: result.billingCycle },
          onSuccess: (reference) => {
            setIsVerifying(true)
            fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
              .then(async (verifyResponse) => {
                const verifyResult = await verifyResponse.json()
                if (!verifyResponse.ok) {
                  throw new Error(verifyResult?.error?.message ?? "Could not confirm your payment")
                }
                toast.success("Subscription activated")
                router.push("/billing")
                router.refresh()
              })
              .catch((error: Error) => toast.error(error.message))
              .finally(() => {
                setIsVerifying(false)
                setPendingPlanId(null)
              })
          },
          onClose: () => setPendingPlanId(null),
        })
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not open checkout")
        setPendingPlanId(null)
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setPendingPlanId(null)
    },
  })

  const startCheckout = (params: CheckoutParams) => mutation.mutate(params)

  return {
    startCheckout,
    isProcessing: mutation.isPending || isVerifying,
    pendingPlanId,
  }
}
