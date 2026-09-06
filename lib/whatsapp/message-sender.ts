import type { NafdacVerificationResult, RecallAlert, SerialVerificationResult } from "@/types"
import type {
  WhatsAppInteractiveButton,
  WhatsAppSendPayload,
} from "@/lib/whatsapp/whatsapp-types"

// Pin an exact version rather than "latest" - Meta deprecates Graph API
// versions on a schedule, and an unpinned call would silently start
// failing (or behaving differently) whenever Meta retires whatever
// "latest" happened to mean. Bump deliberately, not implicitly.
const GRAPH_API_VERSION = "v21.0"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://veriguard.ng"

function graphApiUrl(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneNumberId) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID")
  }
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`
}

async function sendPayload(payload: WhatsAppSendPayload): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error("Missing WHATSAPP_ACCESS_TOKEN")
  }

  const response = await fetch(graphApiUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(`WhatsApp send failed (${response.status}): ${body}`)
  }
}

export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await sendPayload({ messaging_product: "whatsapp", to, type: "text", text: { body } })
}

export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  const replyButtons: WhatsAppInteractiveButton[] = buttons.map((button) => ({
    type: "reply",
    reply: button,
  }))
  await sendPayload({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: { type: "button", body: { text: bodyText }, action: { buttons: replyButtons } },
  })
}

// --- Message templates -----------------------------------------------

export function formatWelcomeMessage(): string {
  return (
    "Welcome to VeriGuard ✅\n" +
    "Nigeria's product safety assistant\n\n" +
    "Send me any of these:\n" +
    "1️⃣ A NAFDAC number (e.g. A1-1234) to verify a product\n" +
    "2️⃣ A photo of a product barcode to scan and verify\n" +
    "3️⃣ Type RECALLS to see current NAFDAC recalls\n" +
    "4️⃣ Type REPORT to report a suspicious product\n" +
    "5️⃣ Type REGISTER to create a VeriGuard account\n\n" +
    "Powered by VeriGuard.ng 🇳🇬"
  )
}

export function formatUnrecognizedMessage(): string {
  return `Sorry, I didn't understand that.\n\n${formatWelcomeMessage()}`
}

export function formatRateLimitMessage(): string {
  return (
    "You've reached the verification limit (10/hour). " +
    "Sign up at veriguard.ng for unlimited verifications."
  )
}

export function formatReportInstructionsMessage(): string {
  return (
    "🚨 *Report a suspicious product*\n\n" +
    "Please visit veriguard.ng/report to file a counterfeit report with full details " +
    "(photos, purchase location, and description help us investigate).\n\n" +
    "_Powered by VeriGuard.ng 🇳🇬_"
  )
}

export function formatVerificationResultMessage(result: NafdacVerificationResult): string {
  if (result.status === "verified" && result.product) {
    const { product } = result
    return (
      "✅ *PRODUCT VERIFIED*\n\n" +
      `*Product:* ${product.name}\n` +
      `*Company:* ${product.company}\n` +
      `*NAFDAC No:* ${product.registration_number}\n` +
      `*Category:* ${product.category}\n` +
      "*Status:* ✅ Registered & Valid\n\n" +
      "This product is authentic and registered with NAFDAC.\n\n" +
      `🔗 View full details: ${APP_URL}/verify/${product.registration_number}\n` +
      `📱 Sign up for recall alerts: ${APP_URL}/register`
    )
  }

  if (result.status === "verified_with_warnings" && result.product) {
    const { product } = result
    const mismatchLines = (result.mismatches ?? []).map((m) => `• ${m.message}`).join("\n")
    return (
      "⚠️ *REGISTERED BUT SUSPICIOUS*\n\n" +
      `*Product:* ${product.name}\n` +
      `*Company:* ${product.company}\n` +
      `*NAFDAC No:* ${product.registration_number}\n\n` +
      "This NAFDAC number is registered, but inconsistencies were detected:\n" +
      `${mismatchLines}\n\n` +
      "Exercise caution - this product may be misusing a valid NAFDAC number.\n\n" +
      "🚨 To report this product, type: REPORT"
    )
  }

  if (result.status === "not_found") {
    return (
      "⚠️ *PRODUCT NOT FOUND*\n\n" +
      `NAFDAC number *${result.nafdac_number}* is not in the registry.\n` +
      "This product may be *counterfeit or unregistered*.\n\n" +
      "🚨 To report this product, type: REPORT\n" +
      `📱 Sign up for alerts: ${APP_URL}/register\n\n` +
      "_Powered by VeriGuard.ng 🇳🇬_"
    )
  }

  if (result.status === "invalid_format") {
    return (
      "That doesn't look like a valid NAFDAC number. " +
      "Try a format like A1-1234 or 04-12345, or type HELP for the menu."
    )
  }

  // unavailable
  return (
    "🔄 *NAFDAC service is temporarily unavailable*\n" +
    `Your request for *${result.nafdac_number}* has been queued.\n` +
    "We will send you the result when the service resumes.\n" +
    "_Usually within 30 minutes._"
  )
}

export function formatSerialResultMessage(result: SerialVerificationResult): string {
  if (result.status === "verified_first_scan" && result.product) {
    return (
      "✅ *AUTHENTIC - FIRST SCAN*\n\n" +
      `*Product:* ${result.product.name}\n` +
      `*NAFDAC No:* ${result.product.nafdac_number}\n` +
      `*Batch:* ${result.product.batch_number}\n\n` +
      "This is the first time this exact unit has been scanned - a strong signal of authenticity."
    )
  }

  if (result.status === "verified_duplicate_scan" && result.product) {
    return (
      "🚨 *SERIAL ALREADY SCANNED*\n\n" +
      `*Product:* ${result.product.name}\n` +
      `This serial has already been scanned ${result.scan_count} time(s) before.\n\n` +
      "Multiple scans of the same unit can indicate counterfeiting or a relabeled product. " +
      "To report this product, type: REPORT"
    )
  }

  if (result.status === "not_found") {
    return (
      "⚠️ *SERIAL NOT FOUND*\n\n" +
      "This serial code isn't in our records. It may be invalid, or from an unregistered product.\n\n" +
      "To report this product, type: REPORT"
    )
  }

  return "Something went wrong checking that serial. Please try again shortly."
}

export function formatRecallsMessage(recalls: Pick<RecallAlert, "product_name" | "company_name" | "severity">[]): string {
  if (recalls.length === 0) {
    return "✅ There are no active NAFDAC recalls right now."
  }
  const lines = recalls
    .slice(0, 5)
    .map((r) => `• *${r.product_name}*${r.company_name ? ` (${r.company_name})` : ""} - ${r.severity}`)
    .join("\n")
  return (
    "🚨 *Active NAFDAC Recalls*\n\n" +
    `${lines}\n\n` +
    `See the full list: ${APP_URL}/business/recalls\n\n` +
    "_Powered by VeriGuard.ng 🇳🇬_"
  )
}

export function formatNoBarcodeFoundMessage(): string {
  return (
    "I couldn't find a readable barcode in that photo. " +
    "Please try a clearer photo, or type the NAFDAC number printed on the product instead."
  )
}
