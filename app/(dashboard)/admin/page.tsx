import Link from "next/link"
import { AlertTriangle, Activity, Copy, Factory, Flag, Package, QrCode, ScanLine, ShieldCheck, Users } from "lucide-react"

import { ActivityFeed } from "@/components/admin/activity-feed"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import {
  getAdminOverviewStats,
  getAdminSerialisationStats,
  getRecentActivity,
} from "@/lib/admin/get-overview-data"
import { createClient } from "@/lib/supabase/server"

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const [stats, serialisationStats, activity] = await Promise.all([
    getAdminOverviewStats(supabase),
    getAdminSerialisationStats(supabase),
    getRecentActivity(supabase),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide activity and health at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
        <StatCard label="Verifications Today" value={stats.verificationsToday} icon={ShieldCheck} tone="success" />
        <StatCard label="Total Verifications" value={stats.totalVerifications} icon={ShieldCheck} />
        <StatCard
          label="Pending Reports"
          value={stats.pendingReports}
          icon={Flag}
          tone={stats.pendingReports > 0 ? "warning" : "default"}
        />
        <StatCard label="Inventory Items" value={stats.totalInventoryItems} icon={Package} />
        <StatCard
          label="Active Recalls"
          value={stats.activeRecalls}
          icon={AlertTriangle}
          tone={stats.activeRecalls > 0 ? "destructive" : "default"}
        />
        <StatCard
          label="Active Anomalies"
          value={stats.activeAnomalies}
          icon={Activity}
          tone={stats.activeAnomalies > 0 ? "destructive" : "default"}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground">Serialisation</h2>
        <p className="mt-1 text-sm text-muted-foreground">Manufacturer portal activity platform-wide.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Serial Codes Generated" value={serialisationStats.totalSerialCodesGenerated} icon={QrCode} />
        <StatCard label="Total Scans" value={serialisationStats.totalScans} icon={ScanLine} />
        <StatCard
          label="Flagged Duplicates"
          value={serialisationStats.totalDuplicates}
          icon={Copy}
          tone={serialisationStats.totalDuplicates > 0 ? "destructive" : "default"}
        />
        <StatCard label="Approved Manufacturers" value={serialisationStats.manufacturersApproved} icon={Factory} tone="success" />
        <StatCard label="Pending Manufacturers" value={serialisationStats.manufacturersPending} icon={Factory} tone="warning" />
        <StatCard label="Rejected Manufacturers" value={serialisationStats.manufacturersRejected} icon={Factory} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href="/admin/reports" />}>
          Review Reports
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/recalls" />}>
          Manage Recalls
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/anomalies" />}>
          View Anomalies
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/serial-codes" />}>
          Serial Codes
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/duplicates" />}>
          Duplicate Alerts
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed events={activity} />
        </CardContent>
      </Card>
    </div>
  )
}
