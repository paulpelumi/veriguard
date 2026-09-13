"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Status = "verifying" | "success" | "failed"

export default function BillingVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 className="text-muted-foreground size-10 animate-spin" />
        </div>
      }
    >
      <BillingVerifyContent />
    </Suspense>
  )
}

function BillingVerifyContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get("reference") ?? searchParams.get("trxref")
  const [status, setStatus] = useState<Status>(reference ? "verifying" : "failed")
  const [message, setMessage] = useState<string | null>(
    reference ? null : "No payment reference was provided."
  )

  useEffect(() => {
    if (!reference) return

    fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error?.message ?? "Could not verify this payment.")
        }
        setStatus("success")
      })
      .catch((error: Error) => {
        setStatus("failed")
        setMessage(error.message)
      })
  }, [reference])

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === "verifying" && "Confirming your payment…"}
            {status === "success" && "Payment successful"}
            {status === "failed" && "Payment could not be confirmed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {status === "verifying" && <Loader2 className="text-muted-foreground size-10 animate-spin" />}
          {status === "success" && <CheckCircle2 className="text-success size-10" />}
          {status === "failed" && <XCircle className="text-destructive size-10" />}

          {status === "success" && (
            <p className="text-muted-foreground text-sm">
              Your subscription is now active. Thanks for supporting VeriGuard.
            </p>
          )}
          {status === "failed" && <p className="text-muted-foreground text-sm">{message}</p>}

          {status !== "verifying" && (
            <Button
              nativeButton={false}
              render={<Link href={status === "success" ? "/billing" : "/pricing"} />}
            >
              {status === "success" ? "Go to Billing" : "Back to Pricing"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
