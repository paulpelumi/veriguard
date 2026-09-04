import { CheckCircle2, History, XCircle } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { LogVerificationStatus } from "@/types/database"

export interface RecentVerificationItem {
  id: string
  productName: string | null
  nafdacNumber: string
  status: LogVerificationStatus
  createdAt: string
}

export function RecentVerificationsList({ items }: { items: RecentVerificationItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No verifications yet"
        description="Products you verify will show up here."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => {
        const isVerified = item.status === "verified"
        return (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-3">
              {isVerified ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : (
                <XCircle className="size-4 shrink-0 text-destructive" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  {item.productName ?? item.nafdacNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.nafdacNumber} &bull; {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
