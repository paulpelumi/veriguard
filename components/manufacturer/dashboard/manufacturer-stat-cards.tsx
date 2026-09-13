import { AlertTriangle, Package, QrCode, ScanLine } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import type { ManufacturerDashboardStats } from "@/lib/manufacturers/get-dashboard-data"

export function ManufacturerStatCards({ stats }: { stats: ManufacturerDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Batches Created" value={stats.totalBatches} icon={Package} />
      <StatCard label="Codes Generated This Month" value={stats.codesGeneratedThisMonth} icon={QrCode} />
      <StatCard label="Total Scans (All Time)" value={stats.totalScans} icon={ScanLine} />
      <StatCard
        label="Duplicate Alerts"
        value={stats.unresolvedDuplicateAlerts}
        icon={AlertTriangle}
        tone={stats.unresolvedDuplicateAlerts > 0 ? "warning" : "default"}
      />
    </div>
  )
}
