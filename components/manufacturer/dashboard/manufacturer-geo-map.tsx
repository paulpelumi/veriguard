"use client"

import { useState } from "react"

import { NIGERIA_MAP_VIEW_BOX, nigeriaStateLocations } from "@/lib/intelligence/nigeria-states-map"
import type { ManufacturerStateScanSummary, ScanDensityTier } from "@/lib/manufacturers/get-dashboard-data"
import { cn } from "@/lib/utils"

interface ManufacturerGeoMapProps {
  states: ManufacturerStateScanSummary[]
}

const TIER_FILL: Record<ScanDensityTier, string> = {
  none: "fill-muted",
  low: "fill-emerald-800",
  medium: "fill-amber-500",
  high: "fill-primary",
}

const TIER_LABEL: Record<ScanDensityTier, string> = {
  none: "No scans yet",
  low: "Low scan volume",
  medium: "Moderate scan volume",
  high: "High scan volume",
}

// Colours states by how much of THIS manufacturer's own scan volume
// happened there - not the platform-wide counterfeit/anomaly tiers that
// components/intelligence/nigeria-map.tsx uses. Shares the underlying SVG
// geometry (nigeriaStateLocations) with that component, not its colour
// semantics, since the two answer different questions.
export function ManufacturerGeoMap({ states }: ManufacturerGeoMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const byMapId = new Map(states.filter((s) => s.mapId).map((s) => [s.mapId as string, s]))
  const hovered = hoveredId ? byMapId.get(hoveredId) : null

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={NIGERIA_MAP_VIEW_BOX}
        role="img"
        aria-label="Map of Nigeria coloured by this manufacturer's scan volume per state"
        className="h-auto w-full"
      >
        {nigeriaStateLocations.map((location) => {
          const summary = byMapId.get(location.id)
          const tier = summary?.tier ?? "none"
          return (
            <path
              key={location.id}
              d={location.path}
              className={cn(
                TIER_FILL[tier],
                "cursor-pointer stroke-background stroke-[0.75] transition-opacity hover:opacity-80"
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
        <LegendSwatch tier="none" />
        <LegendSwatch tier="low" />
        <LegendSwatch tier="medium" />
        <LegendSwatch tier="high" />
      </div>

      {hovered && (
        <div className="rounded-md border bg-card p-3 text-sm">
          <p className="font-semibold text-foreground">{hovered.state}</p>
          <p className="text-muted-foreground">
            {hovered.scanCount.toLocaleString()} scans &middot; {TIER_LABEL[hovered.tier]}
          </p>
        </div>
      )}
    </div>
  )
}

function LegendSwatch({ tier }: { tier: ScanDensityTier }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-3 rounded-sm", TIER_FILL[tier])} />
      {TIER_LABEL[tier]}
    </span>
  )
}
