import { AlertTriangle, CalendarClock, Package, ShieldCheck } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import { daysUntil } from "@/lib/utils/date"
import type { InventoryItem } from "@/types"

export function InventoryStats({ items }: { items: InventoryItem[] }) {
  const expiringSoon = items.filter((item) => {
    const days = daysUntil(item.expiry_date)
    return days >= 0 && days <= 30
  }).length

  const expired = items.filter((item) => daysUntil(item.expiry_date) < 0).length

  const verified = items.filter((item) => item.verification_status === "verified").length

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Products" value={items.length} icon={Package} />
      <StatCard
        label="Expiring Soon"
        value={expiringSoon}
        icon={CalendarClock}
        tone={expiringSoon > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Expired"
        value={expired}
        icon={AlertTriangle}
        tone={expired > 0 ? "destructive" : "default"}
      />
      <StatCard label="Verified Products" value={verified} icon={ShieldCheck} tone="success" />
    </div>
  )
}
