import type { MachineCategory, SerialisationLevel } from "@/types/database"

export const MACHINE_CATEGORIES = [
  "industrial_coder",
  "label_printer",
  "laser_coder",
  "thermal_inkjet",
  "continuous_inkjet",
  "thermal_transfer",
  "direct_thermal",
  "uv_inkjet",
  "other",
] as const satisfies readonly MachineCategory[]

export const MACHINE_CATEGORY_LABELS: Record<MachineCategory, string> = {
  industrial_coder: "Industrial Coder",
  label_printer: "Label Printer",
  laser_coder: "Laser Coder",
  thermal_inkjet: "Thermal Inkjet (TIJ)",
  continuous_inkjet: "Continuous Inkjet (CIJ)",
  thermal_transfer: "Thermal Transfer Overprinter",
  direct_thermal: "Direct Thermal Printer",
  uv_inkjet: "UV Inkjet",
  other: "Other",
}

export const SERIALISATION_LEVEL_LABELS: Record<SerialisationLevel, string> = {
  unit: "Unit level (one code per individual product)",
  carton: "Carton level (one code per outer carton/box)",
  pallet: "Pallet level (one code per pallet)",
}

// Every export format Module 4's generation/export engine will need to
// support - defined here, not there, since the AI analysis (this module)
// is what first recommends one of these per machine.
export const EXPORT_FORMATS = [
  "CSV_VIDEOJET",
  "CSV_DOMINO",
  "CSV_MARKEM",
  "CSV_GENERIC",
  "TXT_SEQUENTIAL",
  "ZPL_ZEBRA",
  "EPL_ZEBRA",
  "XML_SATO",
  "PDF_LABELS",
  "SVG_PACK",
] as const

export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  CSV_VIDEOJET: "CSV (Videojet-compatible)",
  CSV_DOMINO: "CSV (Domino-compatible)",
  CSV_MARKEM: "CSV (Markem-Imaje-compatible)",
  CSV_GENERIC: "CSV (generic, any machine)",
  TXT_SEQUENTIAL: "Plain TXT (one serial per line)",
  ZPL_ZEBRA: "ZPL (Zebra label printers)",
  EPL_ZEBRA: "EPL2 (older Zebra models)",
  XML_SATO: "XML (SATO printers)",
  PDF_LABELS: "Print-ready PDF labels",
  SVG_PACK: "ZIP of individual SVG files",
}

export const MACHINE_BRAND_QUICK_SELECT = [
  "Videojet",
  "Domino",
  "Markem-Imaje",
  "Linx",
  "Hitachi",
  "Matthews",
  "Imaje",
  "Zebra",
  "SATO",
  "Honeywell",
  "Datamax",
  "Epson",
  "Brother",
  "TSC",
  "Citizen",
  "Other",
]

export interface MachineAnalysisResult {
  detected_brand: string
  detected_model: string | null
  machine_category: MachineCategory
  primary_format: ExportFormat
  secondary_format: ExportFormat
  confidence: number
  reasoning: string
  operator_instructions: string
  software_hint: string | null
}
