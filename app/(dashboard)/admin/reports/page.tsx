import { ReportReviewPanel } from "@/components/admin/report-review-panel"

export default function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Counterfeit Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and act on counterfeit reports submitted by users.
        </p>
      </div>
      <ReportReviewPanel />
    </div>
  )
}
