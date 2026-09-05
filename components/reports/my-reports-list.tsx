import { FileText } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { CounterfeitReport, ReportStatus } from "@/types"

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pending",
  reviewed: "Under Review",
  confirmed: "Confirmed",
  dismissed: "Dismissed",
}

const statusClasses: Record<ReportStatus, string> = {
  pending: "border-transparent bg-muted text-muted-foreground",
  reviewed: "border-transparent bg-warning/10 text-warning",
  confirmed: "border-transparent bg-destructive/10 text-destructive",
  dismissed: "border-transparent bg-success/10 text-success",
}

export function MyReportsList({ reports }: { reports: CounterfeitReport[] }) {
  if (reports.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No reports yet"
        description="Reports you submit will show up here."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {reports.map((report) => (
        <li key={report.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{report.product_name}</span>
            <span className="text-xs text-muted-foreground">
              Ref {report.id.slice(0, 8).toUpperCase()} &bull; {formatDate(report.created_at)}
            </span>
          </div>
          <Badge className={statusClasses[report.status]}>{statusLabels[report.status]}</Badge>
        </li>
      ))}
    </ul>
  )
}
