import { CounterfeitReportForm } from "@/components/reports/counterfeit-report-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ConsumerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ nafdacNumber?: string; productName?: string }>
}) {
  const { nafdacNumber, productName } = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Report a Counterfeit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Help protect others by flagging a product you suspect isn&apos;t genuine.
        </p>
      </div>

      <Card className="max-w-xl">
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
    </div>
  )
}
