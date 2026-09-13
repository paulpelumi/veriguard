import { ManufacturerReviewPanel } from "@/components/admin/manufacturer-review-panel"

export default function AdminManufacturersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Manufacturers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review manufacturer applications and manage verified accounts.
        </p>
      </div>
      <ManufacturerReviewPanel />
    </div>
  )
}
