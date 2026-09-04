import Link from "next/link"
import { CheckCircle2, History, ShieldCheck, XCircle } from "lucide-react"

import { RecentVerificationsList } from "@/components/consumer/recent-verifications-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecallsList } from "@/components/shared/recalls-list"
import { StatCard } from "@/components/shared/stat-card"
import { VerificationActivityChart } from "@/components/shared/verification-activity-chart"
import { createClient } from "@/lib/supabase/server"
import { buildVerificationActivitySeries } from "@/lib/utils/analytics"
import { daysAgoIso } from "@/lib/utils/date"

const ACTIVITY_WINDOW_DAYS = 14
const RECENT_RECALLS_LIMIT = 5

export default async function ConsumerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const [{ data: allLogs }, { data: recentLogs }, { data: recalls }] = await Promise.all([
    supabase
      .from("verification_logs")
      .select("verification_status, created_at")
      .eq("user_id", user.id)
      .gte("created_at", daysAgoIso(ACTIVITY_WINDOW_DAYS)),
    supabase
      .from("verification_logs")
      .select("id, product_name, nafdac_number, verification_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("recall_alerts")
      .select("id, product_name, company_name, recall_reason, severity, issued_date")
      .eq("is_active", true)
      .order("issued_date", { ascending: false })
      .limit(RECENT_RECALLS_LIMIT),
  ])

  const { count: totalCount } = await supabase
    .from("verification_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)

  const { count: verifiedCount } = await supabase
    .from("verification_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("verification_status", "verified")

  const { count: notFoundCount } = await supabase
    .from("verification_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("verification_status", "not_found")

  const activityData = buildVerificationActivitySeries(allLogs ?? [], ACTIVITY_WINDOW_DAYS)

  const recentVerificationItems = (recentLogs ?? []).map((log) => ({
    id: log.id,
    productName: log.product_name,
    nafdacNumber: log.nafdac_number,
    status: log.verification_status,
    createdAt: log.created_at,
  }))

  const recallItems = (recalls ?? []).map((recall) => ({
    id: recall.id,
    productName: recall.product_name,
    companyName: recall.company_name,
    recallReason: recall.recall_reason,
    severity: recall.severity,
    issuedDate: recall.issued_date,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify products and keep an eye on recalls.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/consumer/verify" />}>
          <ShieldCheck className="size-4" />
          Verify a Product
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Verifications" value={totalCount ?? 0} icon={History} />
        <StatCard
          label="Verified"
          value={verifiedCount ?? 0}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Not Found"
          value={notFoundCount ?? 0}
          icon={XCircle}
          tone="destructive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationActivityChart data={activityData} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Verifications</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentVerificationsList items={recentVerificationItems} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Recalls</CardTitle>
          </CardHeader>
          <CardContent>
            <RecallsList items={recallItems} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
