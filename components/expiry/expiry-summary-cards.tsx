import { AlertTriangle, CalendarClock, Clock } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"

interface ExpirySummaryCardsProps {
  counts: {
    critical: number
    warning: number
    expiringSoon: number
  }
}

export function ExpirySummaryCards({ counts }: ExpirySummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Critical (≤30 days)"
        value={counts.critical}
        icon={AlertTriangle}
        tone={counts.critical > 0 ? "destructive" : "default"}
      />
      <StatCard
        label="Warning (31–60 days)"
        value={counts.warning}
        icon={CalendarClock}
        tone={counts.warning > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Expiring Soon (61–90 days)"
        value={counts.expiringSoon}
        icon={Clock}
        tone="default"
      />
    </div>
  )
}
