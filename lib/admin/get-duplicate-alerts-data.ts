import type { createClient } from "@/lib/supabase/server"
import { stateNameToMapId } from "@/lib/intelligence/nigeria-states-map"
import type {
  ManufacturerStateScanSummary,
  ScanDensityTier,
} from "@/lib/manufacturers/get-dashboard-data"
import type { ReportStatus } from "@/types/database"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface AdminDuplicateAlert {
  reportId: string
  serialCode: string
  productName: string
  nafdacNumber: string | null
  manufacturerName: string
  duplicateScanCount: number
  isFlagged: boolean
  status: ReportStatus
  createdAt: string
}

const REPORT_LIMIT = 200

// counterfeit_reports.serial_code is only ever set on the auto-generated
// duplicate reports record_serial_scan() creates (Module 5 / 0020) - a
// user-submitted report (the general /admin/reports flow) always leaves
// it null, which is what tells the two apart here without a fragile
// string match on suspicion_reason.
export async function getDuplicateAlerts(supabase: SupabaseServerClient): Promise<AdminDuplicateAlert[]> {
  const { data: reports } = await supabase
    .from("counterfeit_reports")
    .select("id, serial_code, product_name, nafdac_number, status, created_at")
    .not("serial_code", "is", null)
    .order("created_at", { ascending: false })
    .limit(REPORT_LIMIT)

  if (!reports || reports.length === 0) return []

  const serialCodes = reports.map((r) => r.serial_code as string)
  const { data: serials } = await supabase
    .from("product_serials")
    .select("serial_code, duplicate_scan_count, is_flagged, batch_id")
    .in("serial_code", serialCodes)

  const serialByCode = new Map((serials ?? []).map((s) => [s.serial_code, s]))

  const batchIds = Array.from(new Set((serials ?? []).map((s) => s.batch_id)))
  const { data: batches } = await supabase
    .from("serialised_products")
    .select("id, manufacturer_id")
    .in("id", batchIds)

  const manufacturerByBatch = new Map((batches ?? []).map((b) => [b.id, b.manufacturer_id]))

  const manufacturerIds = Array.from(new Set(Array.from(manufacturerByBatch.values())))
  const { data: manufacturers } = await supabase
    .from("manufacturer_profiles")
    .select("id, company_name")
    .in("id", manufacturerIds)

  const nameByManufacturer = new Map((manufacturers ?? []).map((m) => [m.id, m.company_name]))

  return reports.map((report) => {
    const serial = serialByCode.get(report.serial_code as string)
    const manufacturerId = serial ? manufacturerByBatch.get(serial.batch_id) : undefined

    return {
      reportId: report.id,
      serialCode: report.serial_code as string,
      productName: report.product_name,
      nafdacNumber: report.nafdac_number,
      manufacturerName: (manufacturerId && nameByManufacturer.get(manufacturerId)) ?? "Unknown",
      duplicateScanCount: serial?.duplicate_scan_count ?? 0,
      isFlagged: serial?.is_flagged ?? false,
      status: report.status,
      createdAt: report.created_at,
    }
  })
}

function classifyDensity(count: number, max: number): ScanDensityTier {
  if (count === 0 || max === 0) return "none"
  const ratio = count / max
  if (ratio >= 0.66) return "high"
  if (ratio >= 0.33) return "medium"
  return "low"
}

// Platform-wide duplicate-scan density per state, for the same
// ManufacturerGeoMap component Modules 2/6 already built - reused as-is
// here (it only ever needed {state, mapId, scanCount, tier}), just fed
// scan events for flagged/duplicate serials across every manufacturer
// instead of one.
export async function getDuplicateGeography(
  supabase: SupabaseServerClient
): Promise<ManufacturerStateScanSummary[]> {
  const { data: flaggedSerials } = await supabase.from("product_serials").select("id").eq("is_flagged", true)
  const serialIds = (flaggedSerials ?? []).map((s) => s.id)
  if (serialIds.length === 0) return []

  const { data: events } = await supabase
    .from("serial_scan_events")
    .select("location_state")
    .in("serial_id", serialIds)
    .eq("is_duplicate", true)
    .not("location_state", "is", null)

  const countsByState = new Map<string, number>()
  for (const event of events ?? []) {
    if (!event.location_state) continue
    countsByState.set(event.location_state, (countsByState.get(event.location_state) ?? 0) + 1)
  }

  const max = Math.max(0, ...countsByState.values())

  return Array.from(countsByState.entries()).map(([state, scanCount]) => ({
    state,
    mapId: stateNameToMapId(state),
    scanCount,
    tier: classifyDensity(scanCount, max),
  }))
}
