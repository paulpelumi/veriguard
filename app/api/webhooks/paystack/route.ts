import { NextResponse } from "next/server"

import { verifyWebhookSignature } from "@/lib/payments/paystack"
import { activateSubscriptionFromPayment } from "@/lib/payments/subscription-manager"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

interface PaystackChargeSuccessEvent {
  event: string
  data: {
    id: number
    reference: string
    amount: number
    customer: { customer_code: string }
    authorization: { authorization_code: string } | null
    metadata: Record<string, unknown> | null
  }
}

// Paystack expects a fast 200 for every delivery, same reasoning as the
// WhatsApp webhook (app/api/webhooks/whatsapp/route.ts) - a non-200 makes
// it retry the same event repeatedly, which would re-run activation logic
// against a payment that's already been processed. Every failure branch
// here still returns 200 for that reason; the signature check is the one
// exception since letting an unsigned request through at all would be
// worse than a retry storm.
export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature")

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error("[paystack webhook] invalid signature")
    return NextResponse.json({ error: "invalid signature" }, { status: 401 })
  }

  const payload = (() => {
    try {
      return JSON.parse(rawBody) as PaystackChargeSuccessEvent
    } catch {
      return null
    }
  })()

  if (!payload) {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  if (payload.event !== "charge.success") {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  try {
    const serviceClient = createServiceRoleClient()
    const { data } = payload

    const { data: alreadyProcessed } = await serviceClient
      .from("payment_history")
      .select("id")
      .eq("paystack_reference", data.reference)
      .maybeSingle()

    if (alreadyProcessed) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 })
    }

    const metadata = data.metadata ?? {}
    const userId = typeof metadata.userId === "string" ? metadata.userId : null
    const planId = typeof metadata.planId === "string" ? metadata.planId : null
    const billingCycle = metadata.billingCycle === "yearly" ? "yearly" : "monthly"

    if (!userId || !planId) {
      console.error("[paystack webhook] charge.success missing userId/planId metadata", data.reference)
      return NextResponse.json({ status: "missing_metadata" }, { status: 200 })
    }

    await activateSubscriptionFromPayment(serviceClient, {
      userId,
      planId,
      billingCycle,
      paystackReference: data.reference,
      paystackTransactionId: String(data.id),
      amountKobo: data.amount,
      customerCode: data.customer.customer_code,
      authorizationCode: data.authorization?.authorization_code ?? null,
    })

    return NextResponse.json({ status: "ok" }, { status: 200 })
  } catch (error) {
    console.error("[paystack webhook] failed to process charge.success", error)
    return NextResponse.json({ status: "error" }, { status: 200 })
  }
}
