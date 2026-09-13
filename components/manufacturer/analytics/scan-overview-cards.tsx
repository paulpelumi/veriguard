"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Activity, ScanLine, ShieldAlert, ShieldCheck } from "lucide-react"

import { StatCard } from "@/components/shared/stat-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import type { ScanOverview } from "@/lib/manufacturers/get-analytics-data"

// Authentic/re-scan/duplicate is a state gradient (good -> warning ->
// bad), not an arbitrary category - status colors are the right fit here,
// unlike ScanSourceChart's Web/WhatsApp/API breakdown, which is genuine
// identity and uses the app's categorical chart-1/2/3 slots instead.
const SLICES: { key: keyof Pick<ScanOverview, "authentic" | "reScans" | "duplicates">; label: string; color: string }[] = [
  { key: "authentic", label: "Authentic (first scans)", color: "var(--success)" },
  { key: "reScans", label: "Re-scans", color: "var(--warning)" },
  { key: "duplicates", label: "Flagged duplicates", color: "var(--destructive)" },
]

export function ScanOverviewCards({ overview }: { overview: ScanOverview }) {
  const pieData = SLICES.map((slice) => ({ name: slice.label, value: overview[slice.key], color: slice.color }))
  const hasData = overview.totalScans > 0

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Scans" value={overview.totalScans} icon={ScanLine} />
        <StatCard label="Authentic (First Scans)" value={overview.authentic} icon={ShieldCheck} tone="success" />
        <StatCard label="Re-scans" value={overview.reScans} icon={Activity} tone="warning" />
        <StatCard
          label="Flagged Duplicates"
          value={overview.duplicates}
          icon={ShieldAlert}
          tone={overview.duplicates > 0 ? "destructive" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scan Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <EmptyState icon={ScanLine} title="No scans in this period" />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      borderRadius: "var(--radius)",
                      color: "var(--popover-foreground)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="flex flex-1 flex-col gap-2">
                {pieData.map((entry) => (
                  <li key={entry.name} className="flex items-center gap-2 text-sm">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="flex-1 text-foreground">{entry.name}</span>
                    <span className="text-muted-foreground">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
