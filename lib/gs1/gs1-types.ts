export type Gs1MatchResult = "confirmed" | "mismatch" | "unknown" | "not_nigerian"
export type Gs1Confidence = "high" | "medium" | "low"

export interface Gs1CrossCheckResult {
  match: Gs1MatchResult
  gs1_company: string | null
  nafdac_company: string
  confidence: Gs1Confidence
  message: string
}
