import { CalendarClock } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { ExpiryBadge } from "@/components/inventory/expiry-badge"
import { formatDate } from "@/lib/utils/date"

export interface ExpiryAlertItem {
  id: string
  productName: string
  expiryDate: string
  quantity: number
  unit: string
}

export function ExpiryAlertsList({ items }: { items: ExpiryAlertItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="Nothing expiring soon"
        description="Products nearing their expiry date will show up here."
      />
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{item.productName}</span>
            <span className="text-xs text-muted-foreground">
              {item.quantity} {item.unit} &bull; Expires {formatDate(item.expiryDate)}
            </span>
          </div>
          <ExpiryBadge expiryDate={item.expiryDate} />
        </li>
      ))}
    </ul>
  )
}
