import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { HotspotData, HotspotEntry } from "@/lib/intelligence/geo-types"

interface HotspotPanelProps {
  hotspots: HotspotData
}

export function HotspotPanel({ hotspots }: HotspotPanelProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <HotspotList
        title="Top States by Counterfeit Density"
        entries={hotspots.topStatesByCounterfeitDensity}
        emptyMessage="No counterfeit reports in this window."
      />
      <HotspotList
        title="Most-Flagged NAFDAC Numbers"
        entries={hotspots.topFlaggedNafdacNumbers}
        emptyMessage="No flagged NAFDAC numbers in this window."
      />
      <HotspotList
        title="Most-Reported Categories"
        entries={hotspots.topReportedCategories}
        emptyMessage="No reported categories in this window."
      />
    </div>
  )
}

function HotspotList({
  title,
  entries,
  emptyMessage,
}: {
  title: string
  entries: HotspotEntry[]
  emptyMessage: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((entry, index) => (
              <li key={entry.label} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-foreground">
                  <span className="text-muted-foreground">{index + 1}.</span> {entry.label}
                  {entry.sublabel && (
                    <span className="block text-xs text-muted-foreground">{entry.sublabel}</span>
                  )}
                </span>
                <span className="shrink-0 font-medium text-foreground">{entry.count}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
