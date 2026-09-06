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
  const body = (await request.json().catch(() => null)) as WhatsAppWebhookPayload | null
  if (!body) {
    return NextResponse.json({ status: "ignored" }, { status: 200 })
  }

  const supabase = createServiceRoleClient()

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value.messages ?? []) {
        try {
          await routeIncomingMessage(supabase, message)
        } catch (error) {
          console.error("[whatsapp webhook] failed to process message", message.id, error)
        }
      }
    }
  }

  return NextResponse.json({ status: "ok" }, { status: 200 })
}
