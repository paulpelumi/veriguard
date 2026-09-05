import { CounterfeitReportForm } from "@/components/reports/counterfeit-report-form"
import { MyReportsList } from "@/components/reports/my-reports-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

export default async function BusinessReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ nafdacNumber?: string; productName?: string }>
}) {
  const { nafdacNumber, productName } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: reports } = user
    ? await supabase
        .from("counterfeit_reports")
        .select("*")
        .eq("reporter_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Report a Counterfeit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Flag a product you suspect isn&apos;t genuine.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Report</CardTitle>
          </CardHeader>
          <CardContent>
            <CounterfeitReportForm
              initialNafdacNumber={nafdacNumber}
              initialProductName={productName}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <MyReportsList reports={reports ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
