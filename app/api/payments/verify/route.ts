import { NextResponse } from "next/server"

import { activateSubscriptionFromPayment } from "@/lib/payments/subscription-manager"
import { verifyTransaction } from "@/lib/payments/paystack"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const reference = searchParams.get("reference")

  if (!reference) {
    return NextResponse.json({ error: { message: "Missing reference", code: "invalid_request" } }, { status: 400 })
  }

  const serviceClient = createServiceRoleClient()

  // The browser redirect and the webhook (route.ts in ../../webhooks/paystack)
  // both race to activate the same successful charge - whichever gets here
  // first wins, and this check stops the second one from creating a
  // duplicate payment_history row or double-extending the billing period.
  const { data: alreadyProcessed } = await serviceClient
    .from("payment_history")
    .select("id")
    .eq("paystack_reference", reference)
    .maybeSingle()

  if (alreadyProcessed) {
    return NextResponse.json({ success: true, alreadyProcessed: true })
  }

  const result = await verifyTransaction(reference)

  if (!result.status || !result.data || result.data.status !== "success") {
    return NextResponse.json(
      { error: { message: "Payment was not successful", code: "payment_failed" } },
      { status: 402 }
    )
  }

  const { data } = result
  const metadata = data.metadata ?? {}
  const metadataUserId = typeof metadata.userId === "string" ? metadata.userId : null
  const planId = typeof metadata.planId === "string" ? metadata.planId : null
  const billingCycle = metadata.billingCycle === "yearly" ? "yearly" : "monthly"

  // Trust the session, not the metadata, for whose account gets credited -
  // metadata is set by our own /initialize call and Paystack echoes it back
  // verbatim, but this still guards against a stale reference from a
  // different session being replayed against the current one.
  if (metadataUserId !== user.id || !planId) {
    return NextResponse.json(
      { error: { message: "This payment doesn't belong to your account", code: "user_mismatch" } },
      { status: 403 }
    )
  }

  await activateSubscriptionFromPayment(serviceClient, {
    userId: user.id,
    planId,
    billingCycle,
    paystackReference: data.reference,
    paystackTransactionId: String(data.id),
    amountKobo: data.amount,
    customerCode: data.customer.customer_code,
    authorizationCode: data.authorization?.authorization_code ?? null,
  })

  return NextResponse.json({ success: true })
}
