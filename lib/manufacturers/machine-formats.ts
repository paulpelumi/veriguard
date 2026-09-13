import type { ExportFormat } from "@/lib/manufacturers/machine-types"

interface KnownFormat {
  brandMatch: string
  modelMatch?: string
  primary: ExportFormat
  software: string
}

// Substring-matched against the AI's own detected brand/model, used only
// as a fallback when its confidence comes back below CONFIDENCE_THRESHOLD
// - a known-good answer for the common machines beats a shaky AI guess,
// but the AI's reasoning/operator_instructions/category still stand since
// this table doesn't attempt to duplicate those in plain English.
const KNOWN_FORMATS: KnownFormat[] = [
  { brandMatch: "videojet", modelMatch: "1000", primary: "CSV_VIDEOJET", software: "CLARiSUITE" },
  { brandMatch: "videojet", modelMatch: "1580", primary: "CSV_VIDEOJET", software: "CLARiSUITE" },
  { brandMatch: "videojet", modelMatch: "1610", primary: "CSV_VIDEOJET", software: "DataFlex Pro" },
  { brandMatch: "videojet", primary: "CSV_VIDEOJET", software: "CLARiSUITE" },
  { brandMatch: "domino", modelMatch: "ax350", primary: "CSV_DOMINO", software: "QuickDesign" },
  { brandMatch: "domino", modelMatch: "ax550", primary: "CSV_DOMINO", software: "QuickDesign" },
  { brandMatch: "domino", modelMatch: "a420", primary: "CSV_DOMINO", software: "QuickDesign" },
  { brandMatch: "domino", primary: "CSV_DOMINO", software: "QuickDesign" },
  { brandMatch: "markem", modelMatch: "9232", primary: "CSV_MARKEM", software: "SmartLase" },
  { brandMatch: "markem", modelMatch: "9450", primary: "CSV_MARKEM", software: "SmartLase" },
  { brandMatch: "markem", primary: "CSV_MARKEM", software: "Imaje Connect" },
  { brandMatch: "imaje", primary: "CSV_MARKEM", software: "Imaje Connect" },
  { brandMatch: "linx", primary: "CSV_GENERIC", software: "Linx PLC" },
  { brandMatch: "hitachi", primary: "TXT_SEQUENTIAL", software: "Hitachi UX" },
  { brandMatch: "zebra", primary: "ZPL_ZEBRA", software: "ZebraDesigner" },
  { brandMatch: "sato", primary: "XML_SATO", software: "SATO All-In-One" },
  { brandMatch: "honeywell", primary: "CSV_GENERIC", software: "Honeywell Print" },
  { brandMatch: "datamax", primary: "CSV_GENERIC", software: "NiceLabel" },
  { brandMatch: "epson", primary: "PDF_LABELS", software: "Epson TM Utility" },
  { brandMatch: "brother", primary: "PDF_LABELS", software: "P-touch Editor" },
]

export function lookupKnownFormat(
  brand: string,
  model: string | null
): { primary: ExportFormat; software: string } | null {
  const brandLower = brand.toLowerCase()
  const modelLower = model?.toLowerCase() ?? ""

  const withModel = KNOWN_FORMATS.find(
    (entry) =>
      entry.modelMatch &&
      brandLower.includes(entry.brandMatch) &&
      modelLower.includes(entry.modelMatch)
  )
  if (withModel) return { primary: withModel.primary, software: withModel.software }

  const brandOnly = KNOWN_FORMATS.find(
    (entry) => !entry.modelMatch && brandLower.includes(entry.brandMatch)
  )
  if (brandOnly) return { primary: brandOnly.primary, software: brandOnly.software }

  return null
}
