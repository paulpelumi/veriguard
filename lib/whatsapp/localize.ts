import Anthropic from "@anthropic-ai/sdk"

import type { WhatsAppLanguage } from "@/lib/whatsapp/session-manager"

const LANGUAGE_NAMES: Record<Exclude<WhatsAppLanguage, "en">, string> = {
  pidgin: "Nigerian Pidgin English",
  yoruba: "Yoruba",
  hausa: "Hausa",
  igbo: "Igbo",
}

// English is the source of truth for every message template
// (message-sender.ts) - translating once, right before sending, means
// every formatter stays simple and only needs to be written/maintained in
// one language, instead of hand-authoring and keeping four more
// translation tables in sync as copy changes. Falls back to the English
// text on any failure (including a missing ANTHROPIC_API_KEY) rather than
// blocking the reply - a WhatsApp bot that can't send an intelligible
// message is worse than one that replies in the "wrong" language.
export async function localizeMessage(text: string, language: WhatsAppLanguage): Promise<string> {
  if (language === "en") return text

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system:
        `Translate the given WhatsApp message into ${LANGUAGE_NAMES[language]}, ` +
        "as it would naturally be written by a Nigerian speaker. " +
        "Keep every number, NAFDAC registration number, URL, and product/company name EXACTLY unchanged. " +
        "Keep emoji and WhatsApp formatting (*bold*, _italic_) in place. " +
        "Respond with ONLY the translated message text - no preamble, no explanation, no quotes around it.",
      messages: [{ role: "user", content: text }],
    })

    const textBlock = response.content.find((block) => block.type === "text")
    return textBlock?.text.trim() || text
  } catch (error) {
    console.error("[whatsapp/localize] translation failed, sending English", error)
    return text
  }
}
