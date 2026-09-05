"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { EmptyState } from "@/components/shared/empty-state"
import { BarChart3 } from "lucide-react"
import type { StateActivitySummary } from "@/lib/intelligence/geo-types"

interface StateStatsChartProps {
  states: StateActivitySummary[]
}

const TOP_STATES_SHOWN = 15

export function StateStatsChart({ states }: StateStatsChartProps) {
  const data = [...states]
    .sort((a, b) => b.verificationCount - a.verificationCount)
    .slice(0, TOP_STATES_SHOWN)
    .map((s) => ({ state: s.state, verifications: s.verificationCount }))

  const hasActivity = data.some((point) => point.verifications > 0)

  if (!hasActivity) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No verification activity yet"
        description="State-level verification counts will appear here once users start verifying products."
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ left: -20, right: 12, top: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="state"
          className="text-xs"
          tick={{ fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          angle={-40}
          textAnchor="end"
          interval={0}
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
        <Bar dataKey="verifications" name="Verifications" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
