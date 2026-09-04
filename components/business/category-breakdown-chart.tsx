"use client"

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { PackageSearch } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"

export interface CategoryBreakdownSlice {
  category: string
  count: number
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function CategoryBreakdownChart({ data }: { data: CategoryBreakdownSlice[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="No inventory yet"
        description="Add products to your inventory to see a category breakdown."
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={220} className="sm:max-w-[220px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="category"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />
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
          <li key={entry.category} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="flex-1 capitalize text-foreground">
              {entry.category.replace(/_/g, " ")}
            </span>
            <span className="text-muted-foreground">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
