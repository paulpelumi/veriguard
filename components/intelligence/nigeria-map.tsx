"use client"

import { useState } from "react"

import { NIGERIA_MAP_VIEW_BOX, nigeriaStateLocations } from "@/lib/intelligence/nigeria-states-map"
import type { StateActivitySummary, StateActivityTier } from "@/lib/intelligence/geo-types"
import { cn } from "@/lib/utils"

interface NigeriaMapProps {
  states: StateActivitySummary[]
}

const TIER_FILL: Record<StateActivityTier, string> = {
  low: "fill-emerald-800",
  moderate: "fill-amber-500",
  high: "fill-red-600",
  critical: "fill-red-600",
}

const TIER_LABEL: Record<StateActivityTier, string> = {
  low: "Low activity",
  moderate: "Moderate counterfeit reports",
  high: "High counterfeit reports",
  critical: "Active anomaly",
}

export function NigeriaMap({ states }: NigeriaMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const byMapId = new Map(states.filter((s) => s.mapId).map((s) => [s.mapId as string, s]))
  const hovered = hoveredId ? byMapId.get(hoveredId) : null

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={NIGERIA_MAP_VIEW_BOX}
        role="img"
        aria-label="Map of Nigeria coloured by verification and counterfeit-report activity"
        className="h-auto w-full"
      >
        {nigeriaStateLocations.map((location) => {
          const summary = byMapId.get(location.id)
          const tier = summary?.tier ?? "low"
          return (
            <path
              key={location.id}
              d={location.path}
              className={cn(
                TIER_FILL[tier],
                "cursor-pointer stroke-background stroke-[0.75] transition-opacity hover:opacity-80",
                tier === "critical" && "animate-pulse"
              )}
              onMouseEnter={() => setHoveredId(location.id)}
              onMouseLeave={() => setHoveredId((current) => (current === location.id ? null : current))}
            >
              <title>{summary?.state ?? location.name}</title>
            </path>
          )
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <LegendSwatch tier="low" />
        <LegendSwatch tier="moderate" />
        <LegendSwatch tier="high" />
        <LegendSwatch tier="critical" />
      </div>

      {hovered && (
        <div className="rounded-md border bg-card p-3 text-sm">
          <p className="font-semibold text-foreground">{hovered.state}</p>
          <p className="text-muted-foreground">
            {hovered.verificationCount} verifications &middot; {hovered.counterfeitReports} counterfeit
            reports &middot; {TIER_LABEL[hovered.tier]}
          </p>
        </div>
      )}
    </div>
  )
}

function LegendSwatch({ tier }: { tier: StateActivityTier }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", TIER_FILL[tier])} />
      {TIER_LABEL[tier]}
    </span>
  )
}
