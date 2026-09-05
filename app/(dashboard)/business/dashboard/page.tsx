import { AlertTriangle, CalendarClock, Package, ShieldCheck } from "lucide-react"

import { CategoryBreakdownChart } from "@/components/business/category-breakdown-chart"
import { ExpiryAlertsList } from "@/components/business/expiry-alerts-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { VerificationActivityChart } from "@/components/shared/verification-activity-chart"
import { createClient } from "@/lib/supabase/server"
import { buildVerificationActivitySeries } from "@/lib/utils/analytics"
import { daysAgoIso, daysUntil, startOfTodayIso } from "@/lib/utils/date"
import { isRecallMatch } from "@/lib/utils/recall-matching"

const EXPIRY_WINDOW_DAYS = 30
const ACTIVITY_WINDOW_DAYS = 7

export default async function BusinessDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [{ data: inventory }, { data: verificationLogs }, verifiedTodayResult, { data: activeRecalls }] =
    await Promise.all([
      supabase
        .from("inventory")
        .select("id, product_name, product_type, nafdac_number, expiry_date, quantity, unit, verification_status")
        .eq("business_id", user.id),
      supabase
        .from("verification_logs")
        .select("verification_status, created_at")
        .eq("user_id", user.id)
        .gte("created_at", daysAgoIso(ACTIVITY_WINDOW_DAYS)),
      supabase
        .from("verification_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("verification_status", "verified")
        .gte("created_at", startOfTodayIso()),
      supabase.from("recall_alerts").select("id, product_name, nafdac_number").eq("is_active", true),
    ])

  const items = inventory ?? []

  const expiringSoon = items.filter((item) => {
    const days = daysUntil(item.expiry_date)
    return days >= 0 && days <= EXPIRY_WINDOW_DAYS
  })

  const verifiedToday = verifiedTodayResult.count ?? 0

  const recalledItemsCount = (activeRecalls ?? []).filter((recall) =>
    items.some((item) => isRecallMatch(recall, item))
  ).length

  const categoryCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.product_type] = (acc[item.product_type] ?? 0) + 1
    return acc
  }, {})

  const categoryData = Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
  }))

  const activityData = buildVerificationActivitySeries(
    verificationLogs ?? [],
    ACTIVITY_WINDOW_DAYS
  )

  const expiryAlertItems = expiringSoon
    .sort((a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      productName: item.product_name,
      expiryDate: item.expiry_date,
      quantity: item.quantity,
      unit: item.unit,
    }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          An overview of your inventory, verifications, and recalls.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Products" value={items.length} icon={Package} />
        <StatCard
          label="Expiring Soon"
          value={expiringSoon.length}
          icon={CalendarClock}
          tone={expiringSoon.length > 0 ? "warning" : "default"}
        />
        <StatCard label="Verified Today" value={verifiedToday} icon={ShieldCheck} tone="success" />
        <StatCard
          label="Recalled Items"
          value={recalledItemsCount}
          icon={AlertTriangle}
          tone={recalledItemsCount > 0 ? "destructive" : "default"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Verification Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <VerificationActivityChart data={activityData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryBreakdownChart data={categoryData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expiry Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpiryAlertsList items={expiryAlertItems} />
        </CardContent>
      </Card>
    </div>
  )
}
