import { DuplicateAlertPanel } from "@/components/admin/duplicate-alert-panel"
import { ManufacturerGeoMap } from "@/components/manufacturer/dashboard/manufacturer-geo-map"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDuplicateAlerts, getDuplicateGeography } from "@/lib/admin/get-duplicate-alerts-data"
import { createClient } from "@/lib/supabase/server"

export default async function AdminDuplicatesPage() {
  const supabase = await createClient()
  const [alerts, geography] = await Promise.all([
    getDuplicateAlerts(supabase),
    getDuplicateGeography(supabase),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Duplicate Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every VeriGuard serial code caught being scanned more than once, across all manufacturers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duplicate Scan Clusters</CardTitle>
        </CardHeader>
        <CardContent>
          <ManufacturerGeoMap states={geography} />
        </CardContent>
      </Card>

      <DuplicateAlertPanel initialAlerts={alerts} />
    </div>
  )
}
