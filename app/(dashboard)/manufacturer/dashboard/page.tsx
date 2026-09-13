import { AlertTriangle, Clock } from "lucide-react"

import { ManufacturerGeoMap } from "@/components/manufacturer/dashboard/manufacturer-geo-map"
import { ManufacturerStatCards } from "@/components/manufacturer/dashboard/manufacturer-stat-cards"
import { RecentBatchesTable } from "@/components/manufacturer/dashboard/recent-batches-table"
import { ScanActivityChart } from "@/components/manufacturer/dashboard/scan-activity-chart"
import { UsageBar } from "@/components/manufacturer/dashboard/usage-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getManufacturerDashboardStats,
  getManufacturerScanGeography,
  getRecentBatches,
  getScanActivitySeries,
} from "@/lib/manufacturers/get-dashboard-data"
import { createClient } from "@/lib/supabase/server"

// Module 1's scope was registration + verification only, landing everyone
// on the three placeholder states below regardless of status. Module 2
// fills in the "approved" branch with the real dashboard (stats, usage,
// batches, scan chart, geo map) - the pending/rejected branches are
// untouched since those states have nothing to show yet.
export default async function ManufacturerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: manufacturer } = await supabase
    .from("manufacturer_profiles")
    .select("company_name, verification_status, rejection_reason, auto_check_result")
    .eq("id", user!.id)
    .maybeSingle()

  const status = manufacturer?.verification_status ?? "pending"

  if (status === "rejected") {
    return (
      <div className="flex flex-col gap-6">
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-5" />
              <span className="text-sm font-semibold tracking-wide uppercase">
                Application Rejected
              </span>
            </div>
            <p className="text-sm text-foreground">
              {manufacturer?.rejection_reason ??
                "Your manufacturer application was not approved. Contact support for details."}
            </p>
            <div className="pt-1">
              <Button size="sm" render={<a href="mailto:paulpelumi@gmail.com" />}>
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "approved") {
    const [stats, recentBatches, scanActivity, scanGeography] = await Promise.all([
      getManufacturerDashboardStats(supabase, user!.id),
      getRecentBatches(supabase, user!.id),
      getScanActivitySeries(supabase, user!.id),
      getManufacturerScanGeography(supabase, user!.id),
    ])

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{manufacturer?.company_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your VeriGuard manufacturer overview.</p>
        </div>

        <ManufacturerStatCards stats={stats} />

        <UsageBar used={stats.unitsGeneratedThisMonth} limit={stats.monthlyUnitLimit} />

        <RecentBatchesTable batches={recentBatches} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan Activity (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanActivityChart data={scanActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where Your Products Are Being Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <ManufacturerGeoMap states={scanGeography} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const autoCheckResult = manufacturer?.auto_check_result as { passed?: boolean } | null
  const autoCheckLabel =
    autoCheckResult == null
      ? "Not run"
      : autoCheckResult.passed
        ? "Passed ✅"
        : "Requires Manual Review ⚠️"

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-warning">
            <Clock className="size-5" />
            <span className="text-sm font-semibold tracking-wide uppercase">
              Application Under Review
            </span>
          </div>
          <p className="text-sm text-foreground">
            Your manufacturer application is being reviewed by the VeriGuard team. You will
            receive an email once approved. Review typically takes 24&ndash;48 hours.
          </p>
          <p className="text-sm text-muted-foreground">Auto-check: {autoCheckLabel}</p>
        </CardContent>
      </Card>
    </div>
  )
}
