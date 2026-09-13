"use client"

import { Activity } from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { EmptyState } from "@/components/shared/empty-state"
import type { ScanActivityPoint } from "@/lib/manufacturers/get-dashboard-data"

export function ScanActivityChart({ data }: { data: ScanActivityPoint[] }) {
  const hasActivity = data.some((point) => point.scans > 0)

  if (!hasActivity) {
    return (
      <EmptyState
        icon={Activity}
        title="No scan activity yet"
        description="Once your serial codes are scanned, daily activity will show up here."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          className="text-xs"
          tick={{ fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            borderColor: "var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--popover-foreground)",
            fontSize: 12,
          }}
        />
        <Line type="monotone" dataKey="scans" name="Scans" stroke="var(--primary)" strokeWidth={2} dot={false} />
        <Line
          type="monotone"
          dataKey="duplicates"
          name="Duplicates"
          stroke="var(--destructive)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
