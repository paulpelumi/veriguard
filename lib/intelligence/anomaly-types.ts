// 'multi_state_surge' is reserved by the verification_anomalies table's own
// check constraint but has no distinct detection rule defined anywhere in
// the Phase 3 spec - only 'high_frequency', 'geographic_spike', and
// 'velocity_spike' have concrete thresholds. Rather than invent a fourth
// rule with made-up numbers, the detector only ever emits these three; the
// type union still includes it so admin UI (Module 7) can render a row of
// that type if one is ever added by hand or by a future rule.
export type AnomalyType =
  | "high_frequency"
  | "geographic_spike"
  | "velocity_spike"
  | "multi_state_surge"

export type AnomalySeverity = "elevated" | "high" | "critical"

export interface AnomalyDetails {
  window_start: string
  window_end: string
  [key: string]: unknown
}

export interface VerificationAnomalyInput {
  nafdac_number: string
  anomaly_type: AnomalyType
  severity: AnomalySeverity
  verification_count: number
  unique_users?: number
  distinct_states?: number
  time_window_hours: number
  details?: AnomalyDetails
}

// Frequency thresholds - verification count within a 24-hour window.
export const HIGH_FREQUENCY_THRESHOLDS: { count: number; severity: AnomalySeverity }[] = [
  { count: 500, severity: "critical" },
  { count: 200, severity: "high" },
  { count: 50, severity: "elevated" },
]

export const GEOGRAPHIC_SPIKE_MIN_STATES = 5
export const GEOGRAPHIC_SPIKE_WINDOW_HOURS = 6

export const VELOCITY_SPIKE_MULTIPLIER = 2
// A baseline this small makes the "doubled" test meaningless (going from 1
// verification/day to 3 isn't a spike, it's noise) - require a minimum
// trailing average before velocity-spike logic applies at all.
export const VELOCITY_SPIKE_MIN_BASELINE = 5

export const ELEVATED_MONITORING_HOURS = 72
