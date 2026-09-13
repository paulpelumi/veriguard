"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Clock } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import type { TimeOfDayPoint } from "@/lib/manufacturers/get-analytics-data"

function formatHour(hour: number): string {
  if (hour === 0) return "12am"
  if (hour === 12) return "12pm"
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
}

export function TimeAnalysisChart({ data }: { data: TimeOfDayPoint[] }) {
  const hasActivity = data.some((point) => point.count > 0)

  if (!hasActivity) {
    return (
      <EmptyState
        icon={Clock}
        title="No scan activity yet"
        description="Once your products are scanned, this shows which hours of the day they're checked most."
      />
    )
  }

  const chartData = data.map((point) => ({ hour: formatHour(point.hour), count: point.count }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="hour"
          className="text-xs"
          tick={{ fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          interval={2}
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
        <Bar dataKey="count" name="Scans" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
