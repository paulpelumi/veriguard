import { nigerianStates } from "@/lib/utils/nigerian-states"
import { stateNameToMapId } from "@/lib/intelligence/nigeria-states-map"
import { classifyStateTier, type HotspotEntry, type IntelligenceData } from "@/lib/intelligence/geo-types"
import type { createClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

const WINDOW_DAYS = 30

function topN(counts: Map<string, number>, n: number): { key: string; count: number }[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}

// Assembles everything the /admin/intelligence page needs in one pass:
// per-state activity for the map + bar chart, and the hotspot panel's three
// top-5 lists. Reads geographic_stats' aggregation functions directly
// (rather than the geographic_stats table itself) for the trailing window,
// and a live query for "active anomaly" states so the map's most alarming
// indicator isn't stale until tomorrow's aggregator run.
export async function getIntelligenceData(supabase: SupabaseServerClient): Promise<IntelligenceData> {
  const now = new Date()
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = now.toISOString()

  const [verificationStats, reportStats, activeAnomalyStates, reportRows] = await Promise.all([
    supabase.rpc("geo_verification_stats", { p_since: since, p_until: nowIso }),
    supabase.rpc("geo_counterfeit_report_stats", { p_since: since, p_until: nowIso }),
    supabase.rpc("active_anomaly_states", { p_since: since }),
    supabase
      .from("counterfeit_reports")
      .select("nafdac_number, product_name, product_type")
      .gte("created_at", since),
  ])

  const verificationByState = new Map(
    (verificationStats.data ?? []).map((row) => [row.state, row])
  )
  const reportCountByState = new Map((reportStats.data ?? []).map((row) => [row.state, row.report_count]))
  const anomalyStateSet = new Set((activeAnomalyStates.data ?? []).map((row) => row.state))

  const states = nigerianStates.map((state) => {
    const verification = verificationByState.get(state)
    const counterfeitReports = reportCountByState.get(state) ?? 0
    const hasActiveAnomaly = anomalyStateSet.has(state)
    return {
      state,
      mapId: stateNameToMapId(state),
      verificationCount: verification?.verification_count ?? 0,
      notFoundCount: verification?.not_found_count ?? 0,
      counterfeitReports,
      hasActiveAnomaly,
      tier: classifyStateTier(counterfeitReports, hasActiveAnomaly),
    }
  })

  const nafdacNumberCounts = new Map<string, number>()
  const nafdacNumberProductNames = new Map<string, string>()
  const categoryCounts = new Map<string, number>()

  for (const row of reportRows.data ?? []) {
    if (row.nafdac_number) {
      nafdacNumberCounts.set(row.nafdac_number, (nafdacNumberCounts.get(row.nafdac_number) ?? 0) + 1)
      if (!nafdacNumberProductNames.has(row.nafdac_number)) {
        nafdacNumberProductNames.set(row.nafdac_number, row.product_name)
      }
    }
    if (row.product_type) {
      categoryCounts.set(row.product_type, (categoryCounts.get(row.product_type) ?? 0) + 1)
    }
  }

  const topFlaggedNafdacNumbers: HotspotEntry[] = topN(nafdacNumberCounts, 5).map(({ key, count }) => ({
    label: key,
    count,
    sublabel: nafdacNumberProductNames.get(key),
  }))

  const topReportedCategories: HotspotEntry[] = topN(categoryCounts, 5).map(({ key, count }) => ({
    label: key,
    count,
  }))

  const topStatesByCounterfeitDensity: HotspotEntry[] = states
    .filter((s) => s.counterfeitReports > 0)
    .sort((a, b) => b.counterfeitReports - a.counterfeitReports)
    .slice(0, 5)
    .map((s) => ({ label: s.state, count: s.counterfeitReports }))

  return {
    states,
    hotspots: { topStatesByCounterfeitDensity, topFlaggedNafdacNumbers, topReportedCategories },
    windowDays: WINDOW_DAYS,
  }
}
