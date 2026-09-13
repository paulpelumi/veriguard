import type { createClient } from "@/lib/supabase/server"
import { daysAgoIso, daysAgoLabel } from "@/lib/utils/date"
import { stateNameToMapId } from "@/lib/intelligence/nigeria-states-map"
import type { SerialisedProductStatus } from "@/types/database"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface ManufacturerDashboardStats {
  totalBatches: number
  codesGeneratedThisMonth: number
  totalScans: number
  unresolvedDuplicateAlerts: number
  monthlyUnitLimit: number
  unitsGeneratedThisMonth: number
}

export interface RecentBatchRow {
  id: string
  productName: string
  batchNumber: string
  codesGenerated: number
  scans: number
  duplicates: number
  status: SerialisedProductStatus
}

export interface ScanActivityPoint {
  date: string
  scans: number
  duplicates: number
}

export type ScanDensityTier = "none" | "low" | "medium" | "high"

export interface ManufacturerStateScanSummary {
  state: string
  mapId: string | null
  scanCount: number
  tier: ScanDensityTier
}

// Every metric here ultimately traces back to this manufacturer's own
// batches (serialised_products.manufacturer_id) - there's no direct
// manufacturer_id column on product_serials or serial_scan_events, so each
// helper below walks batches -> serials -> scan events. Two round trips
// instead of a single joined query because supabase-js has no server-side
// join across three tables in one call; fine at pilot scale, worth revisiting
// as an RPC once Module 4 is generating real volume.
async function getBatchIds(supabase: SupabaseServerClient, manufacturerId: string): Promise<string[]> {
  const { data } = await supabase
    .from("serialised_products")
    .select("id")
    .eq("manufacturer_id", manufacturerId)
  return (data ?? []).map((row) => row.id)
}

async function getSerialIds(supabase: SupabaseServerClient, batchIds: string[]): Promise<string[]> {
  if (batchIds.length === 0) return []
  const { data } = await supabase.from("product_serials").select("id").in("batch_id", batchIds)
  return (data ?? []).map((row) => row.id)
}

export async function getManufacturerDashboardStats(
  supabase: SupabaseServerClient,
  manufacturerId: string
): Promise<ManufacturerDashboardStats> {
  const [{ count: totalBatches }, profileResult, { count: unresolvedDuplicateAlerts }, batchIds] =
    await Promise.all([
      supabase
        .from("serialised_products")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturerId),
      supabase
        .from("manufacturer_profiles")
        .select("monthly_unit_limit, units_generated_this_month")
        .eq("id", manufacturerId)
        .single(),
      // Manufacturer-facing alerts reuse the platform's existing
      // notifications table (see 0015_manufacturer_portal_schema.sql) rather
      // than a separate manufacturer_notifications table - there is no such
      // table in this schema.
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", manufacturerId)
        .eq("type", "duplicate_detected")
        .eq("is_read", false),
      getBatchIds(supabase, manufacturerId),
    ])

  const serialIds = await getSerialIds(supabase, batchIds)
  let totalScans = 0
  if (serialIds.length > 0) {
    const { count } = await supabase
      .from("serial_scan_events")
      .select("id", { count: "exact", head: true })
      .in("serial_id", serialIds)
    totalScans = count ?? 0
  }

  return {
    totalBatches: totalBatches ?? 0,
    codesGeneratedThisMonth: profileResult.data?.units_generated_this_month ?? 0,
    totalScans,
    unresolvedDuplicateAlerts: unresolvedDuplicateAlerts ?? 0,
    monthlyUnitLimit: profileResult.data?.monthly_unit_limit ?? 0,
    unitsGeneratedThisMonth: profileResult.data?.units_generated_this_month ?? 0,
  }
}

export async function getRecentBatches(
  supabase: SupabaseServerClient,
  manufacturerId: string,
  limit = 5
): Promise<RecentBatchRow[]> {
  const { data: batches } = await supabase
    .from("serialised_products")
    .select("id, product_name, batch_number, codes_generated, status")
    .eq("manufacturer_id", manufacturerId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (!batches || batches.length === 0) return []

  const batchIds = batches.map((b) => b.id)
  const { data: serials } = await supabase
    .from("product_serials")
    .select("batch_id, scan_count, duplicate_scan_count")
    .in("batch_id", batchIds)

  const totalsByBatch = new Map<string, { scans: number; duplicates: number }>()
  for (const serial of serials ?? []) {
    const entry = totalsByBatch.get(serial.batch_id) ?? { scans: 0, duplicates: 0 }
    entry.scans += serial.scan_count
    entry.duplicates += serial.duplicate_scan_count
    totalsByBatch.set(serial.batch_id, entry)
  }

  return batches.map((batch) => ({
    id: batch.id,
    productName: batch.product_name,
    batchNumber: batch.batch_number,
    codesGenerated: batch.codes_generated,
    scans: totalsByBatch.get(batch.id)?.scans ?? 0,
    duplicates: totalsByBatch.get(batch.id)?.duplicates ?? 0,
    status: batch.status,
  }))
}

export async function getScanActivitySeries(
  supabase: SupabaseServerClient,
  manufacturerId: string,
  windowDays = 30
): Promise<ScanActivityPoint[]> {
  const series: ScanActivityPoint[] = []
  const byDay = new Map<string, ScanActivityPoint>()
  for (let i = windowDays - 1; i >= 0; i--) {
    const point = { date: daysAgoLabel(i), scans: 0, duplicates: 0 }
    series.push(point)
    byDay.set(point.date, point)
  }

  const batchIds = await getBatchIds(supabase, manufacturerId)
  const serialIds = await getSerialIds(supabase, batchIds)
  if (serialIds.length === 0) return series

  const { data: events } = await supabase
    .from("serial_scan_events")
    .select("scanned_at, is_duplicate")
    .in("serial_id", serialIds)
    .gte("scanned_at", daysAgoIso(windowDays))

  for (const event of events ?? []) {
    const label = new Date(event.scanned_at).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
    })
    const point = byDay.get(label)
    if (!point) continue
    point.scans += 1
    if (event.is_duplicate) point.duplicates += 1
  }

  return series
}

function classifyScanDensity(scanCount: number, max: number): ScanDensityTier {
  if (scanCount === 0) return "none"
  if (max === 0) return "none"
  const ratio = scanCount / max
  if (ratio >= 0.66) return "high"
  if (ratio >= 0.33) return "medium"
  return "low"
}

export async function getManufacturerScanGeography(
  supabase: SupabaseServerClient,
  manufacturerId: string
): Promise<ManufacturerStateScanSummary[]> {
  const batchIds = await getBatchIds(supabase, manufacturerId)
  const serialIds = await getSerialIds(supabase, batchIds)

  const countsByState = new Map<string, number>()
  if (serialIds.length > 0) {
    const { data: events } = await supabase
      .from("serial_scan_events")
      .select("location_state")
      .in("serial_id", serialIds)
      .not("location_state", "is", null)

    for (const event of events ?? []) {
      if (!event.location_state) continue
      countsByState.set(event.location_state, (countsByState.get(event.location_state) ?? 0) + 1)
    }
  }

  const max = Math.max(0, ...countsByState.values())

  return Array.from(countsByState.entries()).map(([state, scanCount]) => ({
    state,
    mapId: stateNameToMapId(state),
    scanCount,
    tier: classifyScanDensity(scanCount, max),
  }))
}
