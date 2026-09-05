export type StateActivityTier = "low" | "moderate" | "high" | "critical"

export interface StateActivitySummary {
  state: string
  mapId: string | null
  verificationCount: number
  counterfeitReports: number
  notFoundCount: number
  tier: StateActivityTier
  hasActiveAnomaly: boolean
}

export interface HotspotEntry {
  label: string
  count: number
  sublabel?: string
}

export interface HotspotData {
  topStatesByCounterfeitDensity: HotspotEntry[]
  topFlaggedNafdacNumbers: HotspotEntry[]
  topReportedCategories: HotspotEntry[]
}

export interface IntelligenceData {
  states: StateActivitySummary[]
  hotspots: HotspotData
  windowDays: number
}

// The spec names four colour tiers ("deep green: low", "amber: moderate",
// "red: high ... or active anomalies", "pulsing red: critical anomaly
// active") but never gives numeric thresholds for what counts as
// "moderate" vs "high" counterfeit-report density - there's no baseline
// distribution to calibrate against yet. These are a documented, easily
// adjustable starting point, not a derived statistic: a state needs zero
// reports to stay "low", 1-4 to read as "moderate", and 5+ to read as
// "high" over the trailing window. An active unresolved anomaly always
// wins regardless of report count, since that's a stronger and more
// specific signal than volume alone.
const MODERATE_THRESHOLD = 1
const HIGH_THRESHOLD = 5

export function classifyStateTier(counterfeitReports: number, hasActiveAnomaly: boolean): StateActivityTier {
  if (hasActiveAnomaly) return "critical"
  if (counterfeitReports >= HIGH_THRESHOLD) return "high"
  if (counterfeitReports >= MODERATE_THRESHOLD) return "moderate"
  return "low"
}
