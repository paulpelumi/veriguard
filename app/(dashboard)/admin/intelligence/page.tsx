import { getIntelligenceData } from "@/lib/intelligence/get-intelligence-data"
import { requireAdmin } from "@/lib/supabase/require-admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HotspotPanel } from "@/components/intelligence/hotspot-panel"
import { NigeriaMap } from "@/components/intelligence/nigeria-map"
import { StateStatsChart } from "@/components/intelligence/state-stats-chart"

export default async function GeographicIntelligencePage() {
  const { supabase } = await requireAdmin()
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
