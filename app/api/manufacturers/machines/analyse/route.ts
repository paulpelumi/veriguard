import Anthropic from "@anthropic-ai/sdk"
import { NextResponse } from "next/server"
import { z } from "zod"

import { lookupKnownFormat } from "@/lib/manufacturers/machine-formats"
import { EXPORT_FORMATS, MACHINE_CATEGORIES } from "@/lib/manufacturers/machine-types"
import { createClient } from "@/lib/supabase/server"
import type { SerialisationLevel } from "@/types/database"

// Below this, a known-brand lookup table (lib/manufacturers/machine-formats.ts)
// overrides the AI's format pick rather than trusting a shaky guess -
// matching the spec's "AI confidence below 70%" fallback rule. The AI's
// own category/reasoning/instructions still stand either way.
const CONFIDENCE_FALLBACK_THRESHOLD = 70

const MachineAnalysisSchema = z.object({
  detected_brand: z.string(),
  detected_model: z.string().nullable(),
  machine_category: z.enum(MACHINE_CATEGORIES),
  primary_format: z.enum(EXPORT_FORMATS),
  secondary_format: z.enum(EXPORT_FORMATS),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  operator_instructions: z.string(),
  software_hint: z.string().nullable(),
})

const SYSTEM_PROMPT = `You are VeriGuard's machine intelligence system. Your job is to analyse descriptions of industrial coding machines and label printers used in Nigerian manufacturing, and determine the optimal serial code export format for each machine.

You have deep knowledge of:
- Industrial continuous inkjet (CIJ) printers: Videojet (1000, 1580, 1610 series), Domino (A-Series, Ax-Series), Markem-Imaje (9000, 9232, 9450 series), Linx (8900, CJ400 series), Hitachi (PX, UX series), Matthews, Imaje
- Laser coders: Videojet (3000 series), Domino (D-Series), Markem-Imaje (7000 series)
- Thermal inkjet (TIJ): Videojet (8000 series), Markem-Imaje (1000 series)
- Thermal transfer overprinters (TTO): Markem-Imaje (9000 series), Domino (V-Series)
- Industrial label printers: Zebra (ZT410, ZT411, ZT610, ZT620), SATO (CL4NX, GL4), Honeywell (PD45, PX940), Datamax (H-Class, I-Class), TSC, Citizen, Epson TM series
- Desktop label printers: Zebra (GK420, GX430), Brother (QL series), Epson (LW series), DYMO
- UV inkjet and specialty printers

For each machine, determine:
1. Brand (exact brand name)
2. Model series (if determinable, else null)
3. Machine category - exactly one of: industrial_coder, label_printer, laser_coder, thermal_inkjet, continuous_inkjet, thermal_transfer, direct_thermal, uv_inkjet, other
4. Recommended primary export format - exactly one of:
   - CSV_VIDEOJET: CSV with columns Serial,QRData,BatchNo,ExpiryDate,ProductName
   - CSV_DOMINO: CSV with columns INDEX,DATA1,DATA2,DATA3,DATA4
   - CSV_MARKEM: Tab-delimited with Markem-specific field order
   - CSV_GENERIC: Standard CSV, one serial per row with headers
   - TXT_SEQUENTIAL: Plain text, one serial code per line
   - ZPL_ZEBRA: Zebra Programming Language for Zebra label printers
   - EPL_ZEBRA: EPL2 for older Zebra models
   - XML_SATO: SATO-specific XML job format
   - PDF_LABELS: Print-ready PDF (for desktop printers and manual operations)
   - SVG_PACK: ZIP of individual SVG files (for design-integrated workflows)
5. Secondary/fallback format (same list)
6. Confidence percentage (0-100)
7. Plain-language explanation of why this format works for this machine, written for a non-technical factory operator in Nigeria
8. Brief operator instructions for loading/using the exported file
9. software_hint - the machine's typical job-authoring software, or null if unknown

Respond with ONLY a single valid JSON object - no markdown code fences, no explanation outside the JSON - matching exactly this shape:
{
  "detected_brand": string,
  "detected_model": string | null,
  "machine_category": string,
  "primary_format": string,
  "secondary_format": string,
  "confidence": number,
  "reasoning": string,
  "operator_instructions": string,
  "software_hint": string | null
}`

function buildUserPrompt(description: string, serialisationLevel: SerialisationLevel, unitsPerHour?: number) {
  return `Machine description: "${description}"
Serialisation level: "${serialisationLevel}"
Units per hour: ${unitsPerHour ?? "not specified"}

Analyse this machine and return the structured result.`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "unauthorized" } },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null)
  const description = typeof body?.description === "string" ? body.description.trim() : ""
  const serialisationLevel = body?.serialisationLevel as SerialisationLevel | undefined
  const unitsPerHour = typeof body?.unitsPerHour === "number" ? body.unitsPerHour : undefined

  if (!description || description.length < 10 || !serialisationLevel) {
    return NextResponse.json(
      { error: { message: "Missing or invalid machine description", code: "invalid_request" } },
      { status: 400 }
    )
  }

  const client = new Anthropic()

  let response
  try {
    response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(description, serialisationLevel, unitsPerHour) }],
    })
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? "Machine analysis is not configured (invalid or missing API key)."
        : err instanceof Anthropic.RateLimitError
          ? "Machine analysis is temporarily rate-limited. Try again shortly."
          : "Machine analysis service is unavailable right now."
    console.error("[machines/analyse] Anthropic API call failed", err)
    return NextResponse.json({ error: { message, code: "analysis_unavailable" } }, { status: 502 })
  }

  const textBlock = response.content.find((block) => block.type === "text")
  const rawJson = textBlock?.text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")

  let parsed: unknown
  try {
    parsed = rawJson ? JSON.parse(rawJson) : null
  } catch {
    parsed = null
  }

  const result = MachineAnalysisSchema.safeParse(parsed)
  if (!result.success) {
    return NextResponse.json(
      { error: { message: "Machine analysis failed to parse. Try rephrasing the description.", code: "analysis_failed" } },
      { status: 502 }
    )
  }

  let analysis = result.data
  if (analysis.confidence < CONFIDENCE_FALLBACK_THRESHOLD) {
    const known = lookupKnownFormat(analysis.detected_brand, analysis.detected_model)
    if (known) {
      analysis = { ...analysis, primary_format: known.primary, software_hint: known.software }
    }
  }

  return NextResponse.json({ analysis })
}
