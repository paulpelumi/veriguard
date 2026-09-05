import { RecallManagementPanel } from "@/components/admin/recall-management-panel"

export default function AdminRecallsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recall Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review auto-scraped recalls, add manual entries, and manage their active status.
        </p>
      </div>
      <RecallManagementPanel />
    </div>
  )
}
