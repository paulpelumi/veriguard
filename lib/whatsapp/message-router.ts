import type { SupabaseClient } from "@supabase/supabase-js"

import { decodeBarcodeFromImage } from "@/lib/whatsapp/barcode-decoder"
import {
  formatNoBarcodeFoundMessage,
  formatRateLimitMessage,
  formatRecallsMessage,
  formatReportInstructionsMessage,
  formatSerialResultMessage,
  formatUnrecognizedMessage,
  formatVerificationResultMessage,
  formatWelcomeMessage,
  sendWhatsAppText,
} from "@/lib/whatsapp/message-sender"
import { checkWhatsAppRateLimit } from "@/lib/whatsapp/rate-limiter"
import type { WhatsAppImageMessage, WhatsAppInboundMessage, WhatsAppTextMessage } from "@/lib/whatsapp/whatsapp-types"
import { detectScanFormat } from "@/lib/nafdac/format-detector"
import { searchNafdacGreenbook } from "@/lib/nafdac/scraper"
import { verifyNafdacNumber } from "@/lib/nafdac/verify-service"
import { verifySerial } from "@/lib/serials/verify-service"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://veriguard.ng"

interface SenderContext {
  userId: string | null
  location: { state: string | null; lga: string | null }
}

// Best-effort match: compares the last 10 digits of the WhatsApp sender's
// number against profiles.phone, ignoring formatting differences (leading
// "0" vs "+234" vs "234", spaces, dashes). profiles.phone is free-text with
// no normalization enforced at signup, so this can miss a real match (e.g.
// a user who typed extra digits by mistake) - documented here rather than
// silently assumed reliable. A full user base scan is fine at this
// project's current scale; it would need a normalized/indexed column to
// stay cheap at real scale.
function last10Digits(value: string): string {
  return value.replace(/\D/g, "").slice(-10)
}

async function resolveSender(supabase: Client, waPhone: string): Promise<SenderContext> {
  const targetDigits = last10Digits(waPhone)
  const { data: candidates } = await supabase
    .from("profiles")
    .select("id, phone, state, lga")
    .not("phone", "is", null)

  const match = (candidates ?? []).find((profile) => last10Digits(profile.phone ?? "") === targetDigits)

  if (!match) return { userId: null, location: { state: null, lga: null } }
  return { userId: match.id, location: { state: match.state, lga: match.lga } }
}

async function handleVerificationKeywords(
  supabase: Client,
  from: string,
  lower: string
): Promise<boolean> {
  if (["hi", "hello", "help", "menu"].includes(lower)) {
    await sendWhatsAppText(from, formatWelcomeMessage())
    return true
  }

  if (lower === "register") {
    await sendWhatsAppText(from, `Create your free VeriGuard account: ${APP_URL}/register`)
    return true
  }

  if (lower.includes("report")) {
    await sendWhatsAppText(from, formatReportInstructionsMessage())
    return true
  }

  if (lower.includes("recall") || lower.includes("alert")) {
    const { data: recalls } = await supabase
      .from("recall_alerts")
      .select("product_name, company_name, severity")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(5)
    await sendWhatsAppText(from, formatRecallsMessage(recalls ?? []))
    return true
  }

  return false
}

async function runVerification(
  supabase: Client,
  from: string,
  value: string,
  sender: SenderContext
): Promise<void> {
  const allowed = await checkWhatsAppRateLimit(supabase, from)
  if (!allowed) {
    await sendWhatsAppText(from, formatRateLimitMessage())
    return
  }

  const format = detectScanFormat(value)

  if (format === "nafdac_number") {
    const result = await verifyNafdacNumber(supabase, {
      rawNumber: value,
      userId: sender.userId,
      location: sender.location,
      source: "whatsapp",
    })
    await sendWhatsAppText(from, formatVerificationResultMessage(result))
    return
  }

  if (format === "veriguard_serial") {
    const result = await verifySerial(supabase, value, sender.location)
    await sendWhatsAppText(from, formatSerialResultMessage(result))
    return
  }

  if (format === "ean_barcode") {
    // Same weak best-effort resolution as the web app's
    // /api/nafdac/resolve-barcode (Module 2): Greenbook has no real
    // barcode-to-NAFDAC-number index, so this only succeeds if the
    // barcode happens to appear as text somewhere in a Greenbook record.
    const { result: scrapeResult } = await searchNafdacGreenbook(value)
    if (scrapeResult.ok && scrapeResult.found) {
      const result = await verifyNafdacNumber(supabase, {
        rawNumber: scrapeResult.product.registrationNumber,
        barcode: value,
        userId: sender.userId,
        location: sender.location,
        source: "whatsapp",
      })
      await sendWhatsAppText(from, formatVerificationResultMessage(result))
      return
    }
    await sendWhatsAppText(
      from,
      "This barcode doesn't map to a known NAFDAC number yet. Please type the NAFDAC number printed on the product instead."
    )
    return
  }

  await sendWhatsAppText(from, formatUnrecognizedMessage())
}

async function handleTextMessage(
  supabase: Client,
  message: WhatsAppTextMessage,
  sender: SenderContext
): Promise<void> {
  const from = message.from
  const trimmed = message.text.body.trim()
  const lower = trimmed.toLowerCase()

  const handledAsKeyword = await handleVerificationKeywords(supabase, from, lower)
  if (handledAsKeyword) return

  const format = detectScanFormat(trimmed)
  if (format === "unknown") {
    await sendWhatsAppText(from, formatUnrecognizedMessage())
    return
  }

  await runVerification(supabase, from, trimmed, sender)
}

async function downloadMedia(mediaId: string): Promise<Buffer> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken) throw new Error("Missing WHATSAPP_ACCESS_TOKEN")

  const metaResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!metaResponse.ok) {
    throw new Error(`Failed to look up media ${mediaId}: HTTP ${metaResponse.status}`)
  }
  const { url } = (await metaResponse.json()) as { url: string }

  const mediaResponse = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!mediaResponse.ok) {
    throw new Error(`Failed to download media ${mediaId}: HTTP ${mediaResponse.status}`)
  }
  return Buffer.from(await mediaResponse.arrayBuffer())
}

async function handleImageMessage(
  supabase: Client,
  message: WhatsAppImageMessage,
  sender: SenderContext
): Promise<void> {
  const from = message.from

  let barcodeValue: string | null
  try {
    const imageBuffer = await downloadMedia(message.image.id)
    barcodeValue = await decodeBarcodeFromImage(imageBuffer)
  } catch {
    // A download/decode failure gets the same friendly response as "no
    // barcode found" - the sender can't act on an internal error message
    // any differently than on "please retake the photo".
    barcodeValue = null
  }

  if (!barcodeValue) {
    await sendWhatsAppText(from, formatNoBarcodeFoundMessage())
    return
  }

  await runVerification(supabase, from, barcodeValue, sender)
}

export async function routeIncomingMessage(supabase: Client, message: WhatsAppInboundMessage): Promise<void> {
  const sender = await resolveSender(supabase, message.from)

  if (message.type === "text") {
    await handleTextMessage(supabase, message as WhatsAppTextMessage, sender)
    return
  }

  if (message.type === "image") {
    await handleImageMessage(supabase, message as WhatsAppImageMessage, sender)
    return
  }

  await sendWhatsAppText(message.from, formatUnrecognizedMessage())
}
