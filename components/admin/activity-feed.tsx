import Link from "next/link"
import { Activity, AlertTriangle, Flag, UserPlus } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { ActivityEvent, ActivityEventType } from "@/lib/admin/get-overview-data"

const TYPE_ICON: Record<ActivityEventType, typeof UserPlus> = {
  user_registered: UserPlus,
  report_submitted: Flag,
  recall_added: AlertTriangle,
  anomaly_detected: Activity,
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity"
        description="New signups, reports, recalls, and anomalies will appear here."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {events.map((event, index) => {
        const Icon = TYPE_ICON[event.type]
        return (
          <li key={`${event.type}-${event.timestamp}-${index}`}>
            <Link
              href={event.href}
              className="flex items-center gap-3 py-3 text-sm transition-colors hover:bg-muted/50"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{event.label}</p>
                {event.sublabel && (
                  <p className="truncate text-xs text-muted-foreground">{event.sublabel}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDate(event.timestamp)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
