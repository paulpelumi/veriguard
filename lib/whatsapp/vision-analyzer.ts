import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

const VisionResultSchema = z.object({
  code: z.string().nullable(),
  code_type: z.enum(["barcode", "nafdac_number"]).nullable(),
})

export type ProductImageAnalysis = z.infer<typeof VisionResultSchema>

const SYSTEM_PROMPT = `You are looking at a photo a Nigerian consumer sent to a product-verification WhatsApp bot. A barcode scanner already tried and failed to read a clean barcode from this image - it may be blurry, angled, or the barcode itself may be too damaged/small to decode as data, but the printed text may still be legible to you.

Look for, in priority order:
1. A NAFDAC registration number printed on the label (formats like "NAFDAC REG. NO: A1-1234" or "04-12345")
2. The digits printed underneath a barcode (EAN-8/12/13, all-numeric)

Return ONLY a JSON object, no markdown fences:
{
  "code": string | null,
  "code_type": "nafdac_number" | "barcode" | null
}

If you can't confidently read either, return {"code": null, "code_type": null}. Never guess or invent digits you can't actually read.`

// zxing (barcode-decoder.ts) is tried first and is free/instant when it
// works - this only runs as a fallback when that decode comes back empty,
// covering the (very common, in practice) case of a real barcode photo
// that's too blurry/angled/damaged for a pure image-processing decoder but
// still readable to a vision model, or a photo of the label text with no
// scannable barcode in frame at all.
function mimeTypeToAnthropicMediaType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/gif") return mimeType
  return "image/jpeg"
}

export async function analyzeProductImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ProductImageAnalysis | null> {
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 256,
      output_config: { effort: "low" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeTypeToAnthropicMediaType(mimeType),
                data: imageBuffer.toString("base64"),
              },
            },
            { type: "text", text: "Read any NAFDAC number or barcode digits visible in this image." },
          ],
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === "text")
    const rawJson = textBlock?.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
    const parsed = rawJson ? JSON.parse(rawJson) : null
    const result = VisionResultSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch (error) {
    console.error("[whatsapp/vision-analyzer] analysis failed", error)
    return null
  }
}
