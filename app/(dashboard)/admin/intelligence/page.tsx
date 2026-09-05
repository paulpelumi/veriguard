import { getIntelligenceData } from "@/lib/intelligence/get-intelligence-data"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HotspotPanel } from "@/components/intelligence/hotspot-panel"
import { NigeriaMap } from "@/components/intelligence/nigeria-map"
import { StateStatsChart } from "@/components/intelligence/state-stats-chart"

// Admin-only access is enforced by the layout above (which itself calls
// requireAdmin()) and by proxy.ts's route-level guard for every /admin/*
// path - no need for a third check here.
export default async function GeographicIntelligencePage() {
  const supabase = await createClient()
  const { states, hotspots, windowDays } = await getIntelligenceData(supabase)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Geographic Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verification activity and counterfeit hotspots across Nigeria, last {windowDays} days.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Map</CardTitle>
        </CardHeader>
        <CardContent>
          <NigeriaMap states={states} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verifications by State</CardTitle>
        </CardHeader>
        <CardContent>
          <StateStatsChart states={states} />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Counterfeit Hotspots</h2>
        <HotspotPanel hotspots={hotspots} />
      </div>
    </div>
  )
}
