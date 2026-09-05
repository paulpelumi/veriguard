// NAFDAC registration numbers vary in the wild: 1-2 leading letters, 1-2
// leading digits, an optional hyphen, 3-6 trailing digits, and an optional
// trailing letter. e.g. A1-1234, B1-5678, 04-12345, A7-1234L.
const NAFDAC_NUMBER_REGEX = /^[A-Za-z]{0,2}\d{1,2}-?\d{3,6}[A-Za-z]?$/

export function isValidNafdacFormat(value: string): boolean {
  return NAFDAC_NUMBER_REGEX.test(value.trim())
}

export function normalizeNafdacNumber(value: string): string {
  return value.trim().toUpperCase()
}
