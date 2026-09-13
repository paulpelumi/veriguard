import type { SerialisationLevel } from "@/types/database"

const GENERIC_NAME_WORDS = new Set([
  "ltd",
  "limited",
  "plc",
  "inc",
  "incorporated",
  "company",
  "co",
  "nigeria",
  "nig",
  "group",
])

// Best-effort 2-letter shorthand for the serial format's readable prefix -
// not a guaranteed-unique manufacturer identifier (there's no registry of
// issued codes to check against). Two manufacturers landing on the same
// code in the same year is the known, accepted pilot-scale collision risk
// noted in 0018_manufacturer_products_and_batch_generation.sql's unique
// index comment; the DB constraint is what actually catches it.
export function deriveManufacturerCode(companyName: string): string {
  const words = companyName
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, ""))
    .filter((word) => word.length > 0 && !GENERIC_NAME_WORDS.has(word.toLowerCase()))

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase()
  }
  return "VG"
}

export function formatSerialCode(manufacturerCode: string, year: number, sequence: number): string {
  return `VG-${year}-${manufacturerCode}-${String(sequence).padStart(6, "0")}`
}

export interface QrPayloadInput {
  serialCode: string
  nafdacNumber: string
  productName: string
  manufacturerName: string
  batchNumber: string
  productionDate: string
  expiryDate: string
  serialisationLevel: SerialisationLevel
}

// Short single-letter keys keep the encoded QR payload as small as
// possible - every byte here multiplies across however many codes get
// generated and printed.
export function buildQrPayload(input: QrPayloadInput) {
  return {
    vg: input.serialCode,
    n: input.nafdacNumber,
    p: input.productName,
    m: input.manufacturerName,
    b: input.batchNumber,
    d: input.productionDate,
    e: input.expiryDate,
    l: input.serialisationLevel,
    t: new Date().toISOString(),
  }
}
