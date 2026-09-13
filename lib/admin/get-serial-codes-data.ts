import type { createClient } from "@/lib/supabase/server"
import type { SerialisedProductStatus } from "@/types/database"

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export interface AdminBatchRow {
  id: string
  manufacturerName: string
  productName: string
  batchNumber: string
  codesGenerated: number
  scans: number
  duplicates: number
  status: SerialisedProductStatus
  createdAt: string
}

const BATCH_LIMIT = 200

// Platform-wide equivalent of the manufacturer-facing Batches tab (Module
// 4) and BatchPerformanceTable (Module 6) - same batch -> serials rollup,
// across every manufacturer instead of one, with a manufacturer name
// column added. Capped at the 200 most recent batches rather than
// paginated - consistent with this project's other admin list pages at
// pilot scale.
export async function getAllBatches(supabase: SupabaseServerClient): Promise<AdminBatchRow[]> {
  const { data: batches } = await supabase
    .from("serialised_products")
    .select("id, manufacturer_id, product_name, batch_number, codes_generated, status, created_at")
    .order("created_at", { ascending: false })
    .limit(BATCH_LIMIT)

  if (!batches || batches.length === 0) return []

  const manufacturerIds = Array.from(new Set(batches.map((b) => b.manufacturer_id)))
  const { data: manufacturers } = await supabase
    .from("manufacturer_profiles")
    .select("id, company_name")
    .in("id", manufacturerIds)

  const nameByManufacturer = new Map((manufacturers ?? []).map((m) => [m.id, m.company_name]))

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
    manufacturerName: nameByManufacturer.get(batch.manufacturer_id) ?? "Unknown",
    productName: batch.product_name,
    batchNumber: batch.batch_number,
    codesGenerated: batch.codes_generated,
    scans: totalsByBatch.get(batch.id)?.scans ?? 0,
    duplicates: totalsByBatch.get(batch.id)?.duplicates ?? 0,
    status: batch.status,
    createdAt: batch.created_at,
  }))
}
