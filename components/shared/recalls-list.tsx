import { AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { RecallSeverity } from "@/types/database"

export interface RecallListItem {
  id: string
  productName: string
  companyName: string | null
  recallReason: string | null
  severity: RecallSeverity | null
  issuedDate: string | null
}

const severityVariant: Record<RecallSeverity, "destructive" | "default"> = {
  critical: "destructive",
  high: "destructive",
  medium: "default",
  low: "default",
}

export function RecallsList({ items }: { items: RecallListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="No active recalls"
        description="You'll be notified here if a recall is issued."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-1 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">{item.productName}</span>
            {item.severity && (
              <Badge variant={severityVariant[item.severity]} className="capitalize">
                {item.severity}
              </Badge>
            )}
          </div>
          {item.companyName && (
            <span className="text-xs text-muted-foreground">{item.companyName}</span>
          )}
          {item.recallReason && (
            <p className="text-sm text-muted-foreground">{item.recallReason}</p>
          )}
          {item.issuedDate && (
            <span className="text-xs text-muted-foreground">
              Issued {formatDate(item.issuedDate)}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
