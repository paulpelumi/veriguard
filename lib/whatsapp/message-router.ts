import type { SupabaseClient } from "@supabase/supabase-js"

import { decodeBarcodeFromImage } from "@/lib/whatsapp/barcode-decoder"
import { classifyIntent } from "@/lib/whatsapp/intent-classifier"
import { localizeMessage } from "@/lib/whatsapp/localize"
import {
  formatLanguageConfirmedMessage,
  formatLanguagePickerMessage,
  formatLanguagePickerRetryMessage,
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
import {
  touchSession,
  setSessionLanguage,
  updateSessionContext,
  type WhatsAppLanguage,
  type WhatsAppSession,
} from "@/lib/whatsapp/session-manager"
import { analyzeProductImage } from "@/lib/whatsapp/vision-analyzer"
import type { WhatsAppImageMessage, WhatsAppInboundMessage, WhatsAppTextMessage } from "@/lib/whatsapp/whatsapp-types"
import { detectScanFormat } from "@/lib/nafdac/format-detector"
import { searchNafdacGreenbook } from "@/lib/nafdac/scraper"
import { verifyNafdacNumber } from "@/lib/nafdac/verify-service"
import { verifySerial } from "@/lib/serials/verify-service"
import type { Database } from "@/types/database"

type Client = SupabaseClient<Database>

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://veriguard.ng"

const LANGUAGE_BY_SELECTION: Record<string, WhatsAppLanguage> = {
  "1": "en",
  "2": "pidgin",
  "3": "yoruba",
  "4": "hausa",
  "5": "igbo",
  english: "en",
  pidgin: "pidgin",
  yoruba: "yoruba",
  hausa: "hausa",
  igbo: "igbo",
}

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

// Every outbound reply goes through here rather than calling
// sendWhatsAppText directly - it's the one point where the session's
// language preference actually gets applied, so no handler below has to
// remember to localize its own message.
async function reply(from: string, session: WhatsAppSession, text: string): Promise<void> {
  await sendWhatsAppText(from, await localizeMessage(text, session.language))
}

async function getActiveRecallsMessage(supabase: Client): Promise<string> {
  const { data: recalls } = await supabase
    .from("recall_alerts")
    .select("product_name, company_name, severity")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(5)
  return formatRecallsMessage(recalls ?? [])
}

// Text sent while context.awaiting_language is set gets interpreted purely
// as a language selection, not run through any other handling - a user who
// just typed LANGUAGE is answering that prompt, not asking a new question.
async function handleLanguageSelection(supabase: Client, from: string, session: WhatsAppSession, lower: string) {
  const selected = LANGUAGE_BY_SELECTION[lower]

  if (!selected) {
    await sendWhatsAppText(from, formatLanguagePickerRetryMessage())
    return
  }

  await setSessionLanguage(supabase, from, selected)
  await updateSessionContext(supabase, from, { ...session.context, awaiting_language: false })
  await reply(from, { ...session, language: selected }, formatLanguageConfirmedMessage())
}

async function handleVerificationKeywords(
  supabase: Client,
  from: string,
  session: WhatsAppSession,
  lower: string
): Promise<boolean> {
  if (["hi", "hello", "help", "menu"].includes(lower)) {
    await reply(from, session, formatWelcomeMessage())
    return true
  }

  if (lower === "register") {
    await reply(from, session, `Create your free VeriGuard account: ${APP_URL}/register`)
    return true
  }

  if (lower === "language") {
    await updateSessionContext(supabase, from, { ...session.context, awaiting_language: true })
    await sendWhatsAppText(from, formatLanguagePickerMessage())
    return true
  }

  if (lower.includes("report")) {
    await reply(from, session, formatReportInstructionsMessage())
    return true
  }

  if (lower.includes("recall") || lower.includes("alert")) {
    await reply(from, session, await getActiveRecallsMessage(supabase))
    return true
  }

  return false
}

async function runVerification(
  supabase: Client,
  from: string,
  session: WhatsAppSession,
  value: string,
  sender: SenderContext
): Promise<void> {
  const allowed = await checkWhatsAppRateLimit(supabase, from)
  if (!allowed) {
    await reply(from, session, formatRateLimitMessage())
    return
  }

  const format = detectScanFormat(value)

  if (format === "nafdac_number") {
    const result = await verifyNafdacNumber(supabase, {
      rawNumber: value,
      userId: sender.userId,
      location: sender.location,
      source: "whatsapp",
      phoneNumber: from,
    })
    await reply(from, session, formatVerificationResultMessage(result))
    return
  }

  if (format === "veriguard_serial") {
    const result = await verifySerial(supabase, value, sender.location, "whatsapp")
    await reply(from, session, formatSerialResultMessage(result))
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
        phoneNumber: from,
      })
      await reply(from, session, formatVerificationResultMessage(result))
      return
    }
    await reply(
      from,
      session,
      "This barcode doesn't map to a known NAFDAC number yet. Please type the NAFDAC number printed on the product instead."
    )
    return
  }

  await reply(from, session, formatUnrecognizedMessage())
}

// Last resort, after keyword matching and format detection have both come
// up empty - one AI call to actually understand a free-form message
// ("can you check A1-1234 for me", "is my paracetamol safe") instead of
// giving up immediately. Deliberately not on the hot path for every
// message: the keyword/format checks above catch the large majority of
// real traffic (an exact NAFDAC number, a serial code, "recalls") for free.
async function handleFreeformMessage(
  supabase: Client,
  from: string,
  session: WhatsAppSession,
  trimmed: string,
  sender: SenderContext
): Promise<void> {
  const classified = await classifyIntent(trimmed)

  if (!classified) {
    await reply(from, session, formatUnrecognizedMessage())
    return
  }

  switch (classified.intent) {
    case "verify":
      if (classified.extracted_code) {
        await runVerification(supabase, from, session, classified.extracted_code, sender)
      } else {
        await reply(from, session, formatUnrecognizedMessage())
      }
      return
    case "report":
      await reply(from, session, formatReportInstructionsMessage())
      return
    case "recalls":
      await reply(from, session, await getActiveRecallsMessage(supabase))
      return
    case "greeting":
      await reply(from, session, formatWelcomeMessage())
      return
    case "general_question":
      await reply(
        from,
        session,
        classified.answer
          ? `${classified.answer}\n\n_This is general guidance, not a specific product check - send a NAFDAC number to verify one directly._`
          : formatUnrecognizedMessage()
      )
      return
    default:
      await reply(from, session, formatUnrecognizedMessage())
  }
}

async function handleTextMessage(
  supabase: Client,
  message: WhatsAppTextMessage,
  session: WhatsAppSession,
  sender: SenderContext
): Promise<void> {
  const from = message.from
  const trimmed = message.text.body.trim()
  const lower = trimmed.toLowerCase()

  if (session.context.awaiting_language) {
    await handleLanguageSelection(supabase, from, session, lower)
    return
  }

  const handledAsKeyword = await handleVerificationKeywords(supabase, from, session, lower)
  if (handledAsKeyword) return

  const format = detectScanFormat(trimmed)
  if (format === "unknown") {
    await handleFreeformMessage(supabase, from, session, trimmed, sender)
    return
  }

  await runVerification(supabase, from, session, trimmed, sender)
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
  session: WhatsAppSession,
  sender: SenderContext
): Promise<void> {
  const from = message.from

  let imageBuffer: Buffer | null = null
  try {
    imageBuffer = await downloadMedia(message.image.id)
  } catch {
    imageBuffer = null
  }

  if (!imageBuffer) {
    await reply(from, session, formatNoBarcodeFoundMessage())
    return
  }

  const barcodeValue = await decodeBarcodeFromImage(imageBuffer).catch(() => null)
  if (barcodeValue) {
    await runVerification(supabase, from, session, barcodeValue, sender)
    return
  }

  // zxing found nothing decodable - fall back to asking Claude to read the
  // label directly (see vision-analyzer.ts's own comment on why this
  // catches real cases zxing alone doesn't).
  const vision = await analyzeProductImage(imageBuffer, message.image.mime_type)
  if (vision?.code) {
    await runVerification(supabase, from, session, vision.code, sender)
    return
  }

  // A caption on an otherwise-unreadable photo ("is this real?") still
  // carries real intent - worth one more classification attempt instead of
  // an immediate dead end.
  if (message.image.caption?.trim()) {
    await handleFreeformMessage(supabase, from, session, message.image.caption.trim(), sender)
    return
  }

  await reply(from, session, formatNoBarcodeFoundMessage())
}

export async function routeIncomingMessage(supabase: Client, message: WhatsAppInboundMessage): Promise<void> {
  const [sender, { session }] = await Promise.all([
    resolveSender(supabase, message.from),
    touchSession(supabase, message.from),
  ])

  if (message.type === "text") {
    await handleTextMessage(supabase, message as WhatsAppTextMessage, session, sender)
    return
  }

  if (message.type === "image") {
    await handleImageMessage(supabase, message as WhatsAppImageMessage, session, sender)
    return
  }

  await reply(message.from, session, formatUnrecognizedMessage())
}
