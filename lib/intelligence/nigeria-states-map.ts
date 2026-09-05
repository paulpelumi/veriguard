// Real state-boundary SVG path data (CC-BY-4.0), not hand-drawn or
// approximated - accurate geography isn't something to guess at. See
// node_modules/@svg-maps/nigeria/LICENSE.md for attribution.
import nigeriaMap from "@svg-maps/nigeria"

export interface NigeriaStateLocation {
  id: string
  name: string
  path: string
}

export const NIGERIA_MAP_VIEW_BOX = nigeriaMap.viewBox
export const nigeriaStateLocations = nigeriaMap.locations as NigeriaStateLocation[]

// The map package's `name` field matches this app's nigerianStates list
// (lib/utils/nigerian-states.ts) for every state except two real spelling/
// naming variants - not a bug in either list, just two different
// conventions in use for the same states.
const STATE_NAME_TO_MAP_ID: Record<string, string> = {
  "FCT (Abuja)": "fct",
  Nasarawa: "nassarawa",
}

export function stateNameToMapId(stateName: string): string | null {
  const override = STATE_NAME_TO_MAP_ID[stateName]
  if (override) return override
  const normalized = stateName.trim().toLowerCase()
  return nigeriaStateLocations.find((loc) => loc.name.toLowerCase() === normalized)?.id ?? null
}
