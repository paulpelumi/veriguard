import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface ReportConfirmationProps {
  referenceNumber: string
  onNewReport: () => void
}

export function ReportConfirmation({ referenceNumber, onNewReport }: ReportConfirmationProps) {
  return (
    <Card className="border-success/30 bg-success/5">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h2 className="text-lg font-semibold text-foreground">Report Submitted</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Thank you for helping keep the market safe. Your report has been logged and will be
          reviewed.
        </p>
        <div className="rounded-lg border border-border bg-card px-4 py-2">
          <span className="text-xs text-muted-foreground">Reference Number</span>
          <p className="font-mono text-sm font-medium text-foreground">
            {referenceNumber.toUpperCase()}
          </p>
        </div>
        <Button variant="outline" onClick={onNewReport}>
          Submit Another Report
        </Button>
      </CardContent>
    </Card>
  )
}
