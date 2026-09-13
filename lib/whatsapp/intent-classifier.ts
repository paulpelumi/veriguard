import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const IntentSchema = z.object({
  intent: z.enum(["verify", "report", "recalls", "greeting", "general_question", "unknown"]),
  extracted_code: z.string().nullable(),
  answer: z.string().nullable(),
})

export type ClassifiedIntent = z.infer<typeof IntentSchema>

const SYSTEM_PROMPT = `You are the intent classifier for VeriGuard, a WhatsApp bot that helps Nigerians verify NAFDAC-registered food, drug, and cosmetic products are genuine.

The message you're given did NOT match any of the bot's exact keyword commands or a recognizable NAFDAC number/serial code/barcode format. Classify what the sender actually wants.

Return ONLY a JSON object, no markdown fences, matching exactly:
{
  "intent": "verify" | "report" | "recalls" | "greeting" | "general_question" | "unknown",
  "extracted_code": string | null,
  "answer": string | null
}

Rules:
- "verify": the sender wants to check a specific product/number but it's embedded in a sentence (e.g. "can you check A1-1234 for me", "is 04-12345 genuine"). Extract the exact code into extracted_code.
- "report": sender wants to report a fake/suspicious product but didn't type the exact word REPORT.
- "recalls": sender is asking about recalls/alerts in general terms.
- "greeting": a greeting/small talk with no other clear intent.
- "general_question": a genuine question about product safety, NAFDAC, counterfeits, or how VeriGuard works, answerable directly. Put a concise, helpful, WhatsApp-appropriate answer (2-4 sentences, no markdown headers) in "answer". Never invent a specific product's registration status - if the question is really "is X registered", classify it as "verify" or "unknown" instead of guessing.
- "unknown": anything else, or if you're not reasonably confident.

extracted_code and answer are null unless their matching intent is chosen.`

// Only ever called as a last resort, after the bot's own exact keyword
// checks and format detection have both failed to make sense of a message
// (see message-router.ts) - this is the one place in the bot that costs an
// AI call per invocation, so it's deliberately not on the hot path for
// every message.
export async function classifyIntent(message: string): Promise<ClassifiedIntent | null> {
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 512,
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    })

    const textBlock = response.content.find((block) => block.type === "text")
    const rawJson = textBlock?.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = rawJson ? JSON.parse(rawJson) : null
    const result = IntentSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch (error) {
    console.error("[whatsapp/intent-classifier] classification failed", error)
    return null
  }
}
