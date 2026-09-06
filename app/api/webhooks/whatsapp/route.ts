import { NextResponse, type NextRequest } from "next/server"

import { routeIncomingMessage } from "@/lib/whatsapp/message-router"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import type { WhatsAppWebhookPayload } from "@/lib/whatsapp/whatsapp-types"

// Meta's one-time subscription handshake when the webhook URL is registered
// in the developer console: echo back hub.challenge only if the verify
// token matches, proving we control this endpoint.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse("Forbidden", { status: 403 })
}

// Meta expects a fast 200 for every delivery regardless of what happens
// downstream - a non-200 (or a slow one) makes it retry the same delivery,
// which would re-send whatever reply we already sent the first time. Every
// message is processed inside a try/catch for exactly this reason: a
// failure verifying one number shouldn't turn into Meta re-delivering (and
// this handler re-processing) the same webhook payload repeatedly.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const body = (() => {
    try {
      return JSON.parse(rawBody) as WhatsAppWebhookPayload
    } catch {
      return null
    }
  })()

  if (!body) {
    console.error("[whatsapp webhook] received non-JSON body", rawBody.slice(0, 500))
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  let supabase
  try {
    supabase = createServiceRoleClient()
  } catch (error) {
    // Must still return 200 - an uncaught throw here would surface as a
    // 500 to Meta, which retries the same delivery repeatedly instead of
    // giving up, turning one misconfigured env var into a retry storm.
    console.error("[whatsapp webhook] failed to create service-role client", error)
    return NextResponse.json({ status: "config_error" }, { status: 200 })
  }

  let messageCount = 0
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value.messages ?? []) {
        messageCount++
        try {
          await routeIncomingMessage(supabase, message)
        } catch (error) {
          console.error("[whatsapp webhook] failed to process message", message.id, error)
        }
      }
    }
  }

  // Zero messages found in an otherwise-valid payload usually means either
  // a status/read-receipt update (expected, harmless) or that Meta's real
  // payload shape doesn't match whatsapp-types.ts's assumptions (not
  // expected - logging the raw body here is the fastest way to tell which,
  // without waiting on Meta's retry behavior or guessing blind).
  if (messageCount === 0) {
    console.log("[whatsapp webhook] no messages found in payload", rawBody.slice(0, 1000))
  }

  return NextResponse.json({ status: "ok", messages_processed: messageCount }, { status: 200 })
}
