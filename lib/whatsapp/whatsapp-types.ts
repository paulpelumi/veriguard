// Shapes for Meta's WhatsApp Cloud API - both the inbound webhook payload
// and the outbound Send Message API. Only the fields this bot actually
// reads/sends are modeled; Meta's real payloads carry more than this.

export interface WhatsAppWebhookPayload {
  object: string
  entry: WhatsAppWebhookEntry[]
}

export interface WhatsAppWebhookEntry {
  id: string
  changes: WhatsAppWebhookChange[]
}

export interface WhatsAppWebhookChange {
  field: string
  value: {
    messaging_product: string
    metadata: { display_phone_number: string; phone_number_id: string }
    contacts?: { profile: { name: string }; wa_id: string }[]
    messages?: WhatsAppInboundMessage[]
  }
}

export type WhatsAppInboundMessage = WhatsAppTextMessage | WhatsAppImageMessage | WhatsAppUnhandledMessage

interface WhatsAppMessageBase {
  from: string
  id: string
  timestamp: string
}

export interface WhatsAppTextMessage extends WhatsAppMessageBase {
  type: "text"
  text: { body: string }
}

export interface WhatsAppImageMessage extends WhatsAppMessageBase {
  type: "image"
  image: { id: string; mime_type: string; sha256: string; caption?: string }
}

// Covers message types this bot doesn't have handling for (audio, video,
// document, location, sticker, ...) - routed to the "didn't understand"
// reply rather than silently dropped. `type` is a plain string here (not a
// literal) since it's whatever Meta sends for any type this union doesn't
// name explicitly; narrowing still works fine on the other two members'
// literal "text"/"image" types.
export interface WhatsAppUnhandledMessage extends WhatsAppMessageBase {
  type: string
}

export interface WhatsAppSendTextPayload {
  messaging_product: "whatsapp"
  to: string
  type: "text"
  text: { body: string; preview_url?: boolean }
}

export interface WhatsAppInteractiveButton {
  type: "reply"
  reply: { id: string; title: string }
}

export interface WhatsAppSendInteractivePayload {
  messaging_product: "whatsapp"
  to: string
  type: "interactive"
  interactive: {
    type: "button"
    body: { text: string }
    action: { buttons: WhatsAppInteractiveButton[] }
  }
}

export type WhatsAppSendPayload = WhatsAppSendTextPayload | WhatsAppSendInteractivePayload
