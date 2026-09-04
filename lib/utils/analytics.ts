import { daysAgoLabel } from "@/lib/utils/date"
import type { LogVerificationStatus } from "@/types/database"

interface VerificationLogLike {
  verification_status: LogVerificationStatus
  created_at: string
}

export function buildVerificationActivitySeries(
  logs: VerificationLogLike[],
  windowDays: number
) {
  const byDay = new Map<string, { verified: number; notFound: number }>()

  for (let i = windowDays - 1; i >= 0; i--) {
    byDay.set(daysAgoLabel(i), { verified: 0, notFound: 0 })
  }

  for (const log of logs) {
    const key = new Date(log.created_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    })
    const bucket = byDay.get(key)
    if (!bucket) continue
    if (log.verification_status === "verified") bucket.verified += 1
    if (log.verification_status === "not_found") bucket.notFound += 1
  }

  return Array.from(byDay.entries()).map(([date, counts]) => ({ date, ...counts }))
}
