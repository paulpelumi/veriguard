import Link from "next/link"

import { ManufacturerGeoMap } from "@/components/manufacturer/dashboard/manufacturer-geo-map"
import { ScanActivityChart } from "@/components/manufacturer/dashboard/scan-activity-chart"
import { BatchPerformanceTable } from "@/components/manufacturer/analytics/batch-performance-table"
import { ProductPerformanceTable } from "@/components/manufacturer/analytics/product-performance-table"
import { ScanOverviewCards } from "@/components/manufacturer/analytics/scan-overview-cards"
import { ScanSourceChart } from "@/components/manufacturer/analytics/scan-source-chart"
import { TimeAnalysisChart } from "@/components/manufacturer/analytics/time-analysis-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getBatchPerformance,
  getGeographicDistribution,
  getProductPerformance,
  getScanOverview,
  getScanSourceBreakdown,
  getTimeOfDayDistribution,
} from "@/lib/manufacturers/get-analytics-data"
import { createClient } from "@/lib/supabase/server"

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: "7", days: 7 },
  { label: "Last 30 days", value: "30", days: 30 },
  { label: "Last 90 days", value: "90", days: 90 },
]

export default async function ManufacturerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range } = await searchParams
  const selected = RANGE_OPTIONS.find((option) => option.value === range) ?? RANGE_OPTIONS[1]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [overview, productRows, batchRows, geography, timeOfDay, sourceBreakdown] = await Promise.all([
    getScanOverview(supabase, user!.id, selected.days),
    getProductPerformance(supabase, user!.id),
    getBatchPerformance(supabase, user!.id),
    getGeographicDistribution(supabase, user!.id, selected.days),
    getTimeOfDayDistribution(supabase, user!.id, selected.days),
    getScanSourceBreakdown(supabase, user!.id, selected.days),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Scan Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How your products are being verified across Nigeria.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
          {RANGE_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={`/manufacturer/analytics?range=${option.value}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                option.value === selected.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      <ScanOverviewCards overview={overview} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Scan Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ScanActivityChart data={overview.dailyTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductPerformanceTable rows={productRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchPerformanceTable rows={batchRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geographic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ManufacturerGeoMap states={geography} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time of Day</CardTitle>
          </CardHeader>
          <CardContent>
            <TimeAnalysisChart data={timeOfDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scan Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanSourceChart data={sourceBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
