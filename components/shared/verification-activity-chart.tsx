"use client"

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
import { Activity } from "lucide-react"

export interface VerificationActivityPoint {
  date: string
  verified: number
  notFound: number
}

export function VerificationActivityChart({
  data,
}: {
  data: VerificationActivityPoint[]
}) {
  const hasActivity = data.some((point) => point.verified > 0 || point.notFound > 0)

  if (!hasActivity) {
    return (
      <EmptyState
        icon={Activity}
        title="No verification activity yet"
        description="Verify a product's NAFDAC number to see activity here."
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
        <Line
          type="monotone"
          dataKey="verified"
          name="Verified"
          stroke="var(--success)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="notFound"
          name="Not found"
          stroke="var(--destructive)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
