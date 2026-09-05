import { CheckCircle2, History, XCircle } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { VerificationLog } from "@/types"

export function RecentVerificationsList({ logs }: { logs: VerificationLog[] }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No checks yet"
        description="Products you verify will show up here."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {logs.map((log) => {
        const isVerified = log.verification_status === "verified"
        return (
          <li key={log.id} className="flex items-center gap-3 py-3">
            {isVerified ? (
              <CheckCircle2 className="size-4 shrink-0 text-success" />
            ) : (
              <XCircle className="size-4 shrink-0 text-destructive" />
            )}
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-medium text-foreground">
                {log.product_name ?? log.nafdac_number}
              </span>
              <span className="text-xs text-muted-foreground">
                {log.nafdac_number} &bull; {formatDate(log.created_at)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
