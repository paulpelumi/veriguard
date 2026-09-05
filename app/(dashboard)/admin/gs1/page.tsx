import { Gs1ManagementPanel } from "@/components/admin/gs1-management-panel"

export default function AdminGs1Page() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">GS1 Database</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the known GS1 Nigeria company-prefix registry used for barcode cross-checks.
        </p>
      </div>
      <Gs1ManagementPanel />
    </div>
  )
}
