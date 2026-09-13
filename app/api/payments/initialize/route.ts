import { NextResponse } from "next/server"

import { generatePaymentReference } from "@/lib/payments/paystack"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { message: "Unauthorized", code: "unauthorized" } }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const planId = typeof body?.planId === "string" ? body.planId : null
  const billingCycle = body?.billingCycle === "yearly" ? "yearly" : "monthly"

  if (!planId) {
    return NextResponse.json({ error: { message: "Missing planId", code: "invalid_request" } }, { status: 400 })
  }

  const { data: profile } = await supabase.from("profiles").select("role, email").eq("id", user.id).single()
  const { data: plan } = await supabase.from("subscription_plans").select("*").eq("id", planId).maybeSingle()

  if (!profile || !plan) {
    return NextResponse.json({ error: { message: "Plan not found", code: "not_found" } }, { status: 404 })
  }

  // A consumer must not be able to check out a manufacturer plan (or vice
  // versa) just by posting a different planId - the plan picker only ever
  // shows plans for the visitor's own role, so a mismatch here means the
  // request didn't come from that UI.
  if (plan.role !== profile.role) {
    return NextResponse.json(
      { error: { message: "This plan isn't available for your account type", code: "role_mismatch" } },
      { status: 403 }
    )
  }

  const amountKobo = billingCycle === "yearly" ? plan.price_yearly_kobo : plan.price_monthly_kobo

  if (amountKobo <= 0) {
    return NextResponse.json(
      { error: { message: "This plan doesn't require payment", code: "free_plan" } },
      { status: 400 }
    )
  }

  // No server-side call to Paystack's own /transaction/initialize here -
  // checkout runs through Paystack's Inline popup (see
  // lib/payments/paystack-inline.ts), which opens its own charge directly
  // from the browser using the public key and this reference. This route's
  // job is just the trust boundary: compute the authoritative amount from
  // the DB (never trust a client-supplied amount) and hand back only what
  // the popup needs.
  return NextResponse.json({
    reference: generatePaymentReference(),
    amountKobo,
    email: profile.email ?? user.email ?? "",
    planId: plan.id,
    billingCycle,
  })
}
