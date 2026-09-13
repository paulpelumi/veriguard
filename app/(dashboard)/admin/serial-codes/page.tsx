import { SerialCodesTable } from "@/components/admin/serial-codes-table"
import { getAllBatches } from "@/lib/admin/get-serial-codes-data"
import { createClient } from "@/lib/supabase/server"

export default async function AdminSerialCodesPage() {
  const supabase = await createClient()
  const batches = await getAllBatches(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Serial Codes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every batch of serialised codes generated across all manufacturers, most recent first.
        </p>
      </div>
      <SerialCodesTable batches={batches} />
    </div>
  )
}
