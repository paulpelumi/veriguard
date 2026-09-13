import {
  getBatchIds,
  getSerialIds,
  type ManufacturerStateScanSummary,
  type ScanActivityPoint,
  type ScanDensityTier,
} from "@/lib/manufacturers/get-dashboard-data"
import { stateNameToMapId } from "@/lib/intelligence/nigeria-states-map"
import type { createClient } from "@/lib/supabase/server"
import { daysAgoIso, daysAgoLabel } from "@/lib/utils/date"
import type { ScanEventResult, ScanEventSource } from "@/types/database"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface ScanOverview {
  totalScans: number
  authentic: number
  reScans: number
  duplicates: number
  dailyTrend: ScanActivityPoint[]
}

export interface ProductPerformanceRow {
  productName: string
  totalScans: number
  authenticScans: number
  duplicateScans: number
  duplicateRate: number
}

export interface BatchPerformanceRow {
  id: string
  batchNumber: string
  productName: string
  codesGenerated: number
  scanned: number
  scanPercent: number
  duplicates: number
}

export interface TimeOfDayPoint {
  hour: number
  count: number
}

export interface SourceBreakdownPoint {
  source: ScanEventSource
  count: number
}

// All-time performance (product/batch tables) reads the cumulative
// scan_count/duplicate_scan_count columns already maintained on every
// serial by record_serial_scan() (Module 5) - "how much of this batch has
// ever been scanned" isn't something a date-range selector should reset.
// Everything else (overview, trend, geography, time-of-day, source) is
// scoped to the selected window via serial_scan_events.scanned_at, which
// is what the date range selector actually controls.
export async function getProductPerformance(
  supabase: SupabaseServerClient,
  manufacturerId: string
): Promise<ProductPerformanceRow[]> {
  const { data: batches } = await supabase
    .from("serialised_products")
    .select("id, product_name")
    .eq("manufacturer_id", manufacturerId)

  if (!batches || batches.length === 0) return []

  const batchIds = batches.map((b) => b.id)
  const { data: serials } = await supabase
    .from("product_serials")
    .select("batch_id, scan_count, duplicate_scan_count")
    .in("batch_id", batchIds)

  const productByBatch = new Map(batches.map((b) => [b.id, b.product_name]))
  const totals = new Map<string, { totalScans: number; duplicateScans: number }>()

  for (const serial of serials ?? []) {
    const productName = productByBatch.get(serial.batch_id)
    if (!productName) continue
    const entry = totals.get(productName) ?? { totalScans: 0, duplicateScans: 0 }
    entry.totalScans += serial.scan_count
    entry.duplicateScans += serial.duplicate_scan_count
    totals.set(productName, entry)
  }

  return Array.from(totals.entries())
    .map(([productName, { totalScans, duplicateScans }]) => ({
      productName,
      totalScans,
      authenticScans: totalScans - duplicateScans,
      duplicateScans,
      duplicateRate: totalScans > 0 ? Math.round((duplicateScans / totalScans) * 100) : 0,
    }))
    .sort((a, b) => b.totalScans - a.totalScans)
}

export async function getBatchPerformance(
  supabase: SupabaseServerClient,
  manufacturerId: string
): Promise<BatchPerformanceRow[]> {
  const { data: batches } = await supabase
    .from("serialised_products")
    .select("id, batch_number, product_name, codes_generated")
    .eq("manufacturer_id", manufacturerId)
    .order("created_at", { ascending: false })

  if (!batches || batches.length === 0) return []

  const batchIds = batches.map((b) => b.id)
  const { data: serials } = await supabase
    .from("product_serials")
    .select("batch_id, status, duplicate_scan_count")
    .in("batch_id", batchIds)

  const totalsByBatch = new Map<string, { scanned: number; duplicates: number }>()
  for (const serial of serials ?? []) {
    const entry = totalsByBatch.get(serial.batch_id) ?? { scanned: 0, duplicates: 0 }
    if (serial.status !== "unscanned") entry.scanned += 1
    entry.duplicates += serial.duplicate_scan_count
    totalsByBatch.set(serial.batch_id, entry)
  }

  return batches.map((batch) => {
    const totals = totalsByBatch.get(batch.id) ?? { scanned: 0, duplicates: 0 }
    return {
      id: batch.id,
      batchNumber: batch.batch_number,
      productName: batch.product_name,
      codesGenerated: batch.codes_generated,
      scanned: totals.scanned,
      scanPercent: batch.codes_generated > 0 ? Math.round((totals.scanned / batch.codes_generated) * 100) : 0,
      duplicates: totals.duplicates,
    }
  })
}

async function getWindowedEvents(supabase: SupabaseServerClient, manufacturerId: string, windowDays: number) {
  const batchIds = await getBatchIds(supabase, manufacturerId)
  const serialIds = await getSerialIds(supabase, batchIds)
  if (serialIds.length === 0) return []

  const { data } = await supabase
    .from("serial_scan_events")
    .select("scanned_at, result, location_state, scan_source, is_duplicate")
    .in("serial_id", serialIds)
    .gte("scanned_at", daysAgoIso(windowDays))

  return data ?? []
}

export async function getScanOverview(
  supabase: SupabaseServerClient,
  manufacturerId: string,
  windowDays: number
): Promise<ScanOverview> {
  const events = await getWindowedEvents(supabase, manufacturerId, windowDays)

  const byDay = new Map<string, ScanActivityPoint>()
  for (let i = windowDays - 1; i >= 0; i--) {
    const point = { date: daysAgoLabel(i), scans: 0, duplicates: 0 }
    byDay.set(point.date, point)
  }

  let authentic = 0
  let reScans = 0
  let duplicates = 0

  for (const event of events) {
    const label = new Date(event.scanned_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })
    const point = byDay.get(label)
    if (point) {
      point.scans += 1
      if (event.is_duplicate) point.duplicates += 1
    }

    const result = event.result as ScanEventResult
    if (result === "authentic") authentic += 1
    else if (result === "flagged") duplicates += 1
    else reScans += 1
  }

  return {
    totalScans: events.length,
    authentic,
    reScans,
    duplicates,
    dailyTrend: Array.from(byDay.values()),
  }
}

function classifyScanDensity(scanCount: number, max: number): ScanDensityTier {
  if (scanCount === 0 || max === 0) return "none"
  const ratio = scanCount / max
  if (ratio >= 0.66) return "high"
  if (ratio >= 0.33) return "medium"
  return "low"
}

export async function getGeographicDistribution(
  supabase: SupabaseServerClient,
  manufacturerId: string,
  windowDays: number
): Promise<ManufacturerStateScanSummary[]> {
  const events = await getWindowedEvents(supabase, manufacturerId, windowDays)

  const countsByState = new Map<string, number>()
  for (const event of events) {
    if (!event.location_state) continue
    countsByState.set(event.location_state, (countsByState.get(event.location_state) ?? 0) + 1)
  }

  const max = Math.max(0, ...countsByState.values())

  return Array.from(countsByState.entries())
    .map(([state, scanCount]) => ({
      state,
      mapId: stateNameToMapId(state),
      scanCount,
      tier: classifyScanDensity(scanCount, max),
    }))
    .sort((a, b) => b.scanCount - a.scanCount)
}

export async function getTimeOfDayDistribution(
  supabase: SupabaseServerClient,
  manufacturerId: string,
  windowDays: number
): Promise<TimeOfDayPoint[]> {
  const events = await getWindowedEvents(supabase, manufacturerId, windowDays)

  const counts = new Array(24).fill(0)
  for (const event of events) {
    const hour = new Date(event.scanned_at).getHours()
    counts[hour] += 1
  }

  return counts.map((count, hour) => ({ hour, count }))
}

export async function getScanSourceBreakdown(
  supabase: SupabaseServerClient,
  manufacturerId: string,
  windowDays: number
): Promise<SourceBreakdownPoint[]> {
  const events = await getWindowedEvents(supabase, manufacturerId, windowDays)

  const counts = new Map<ScanEventSource, number>()
  for (const event of events) {
    const source = event.scan_source as ScanEventSource
    counts.set(source, (counts.get(source) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([source, count]) => ({ source, count }))
}
