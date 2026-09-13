"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { Radio } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import type { SourceBreakdownPoint } from "@/lib/manufacturers/get-analytics-data"
import type { ScanEventSource } from "@/types/database"

// Genuine categorical identity (which channel, not which state) - uses the
// app's existing chart-1/2/3 categorical slots, matching
// CategoryBreakdownChart's precedent, rather than the status colors
// ScanOverviewCards uses for its authentic/re-scan/duplicate breakdown.
const SOURCE_LABELS: Record<ScanEventSource, string> = {
  web: "Web App",
  whatsapp: "WhatsApp",
  api: "API",
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]

export function ScanSourceChart({ data }: { data: SourceBreakdownPoint[] }) {
  if (data.length === 0) {
    return <EmptyState icon={Radio} title="No scans in this period" />
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="source"
            innerRadius={50}
            outerRadius={75}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
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
        {data.map((entry, index) => (
          <li key={entry.source} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="flex-1 text-foreground">{SOURCE_LABELS[entry.source]}</span>
            <span className="text-muted-foreground">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
