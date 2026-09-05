import type { RecallSeverity } from "@/types/database"

// Exact keyword ladder from the Phase 3 spec, checked most-severe first so a
// single announcement that mentions both a "critical" and a "high" word
// (common - a poisoning report will usually also say "recall") lands at the
// more severe tier. Matched as whole words to avoid a term like "ban"
// matching inside unrelated words (e.g. "urban", "banking").
const SEVERITY_KEYWORDS: { severity: RecallSeverity; words: string[] }[] = [
  { severity: "critical", words: ["toxic", "death", "fatality", "poisoning", "banned"] },
  { severity: "high", words: ["recall", "withdraw", "counterfeit", "falsified"] },
  { severity: "medium", words: ["substandard", "unregistered", "seizure"] },
]

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(text)
}

// Falls back to 'low' - the spec describes this as the tier for "general
// public health notices" that don't match any of the more specific ladders.
export function classifyRecallSeverity(text: string): RecallSeverity {
  for (const { severity, words } of SEVERITY_KEYWORDS) {
    if (words.some((word) => containsWord(text, word))) return severity
  }
  return "low"
}
