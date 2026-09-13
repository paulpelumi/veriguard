"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { createClient } from "@/lib/supabase/client"
import type { SerialisedProductStatus, SerialisationLevel } from "@/types"

export interface ManufacturerBatchRow {
  id: string
  productName: string
  batchNumber: string
  serialisationLevel: SerialisationLevel
  codesGenerated: number
  scans: number
  duplicates: number
  status: SerialisedProductStatus
  createdAt: string
}

function batchesKey(manufacturerId: string | null) {
  return ["manufacturer-batches", manufacturerId] as const
}

// Mirrors lib/manufacturers/get-dashboard-data.ts's getRecentBatches (same
// batch -> serials rollup), but as a client hook returning every batch for
// the Batches tab rather than a server-fetched top 5 for the dashboard.
export function useManufacturerBatches(manufacturerId: string | null) {
  const supabase = useMemo(() => createClient(), [])

  const { data: batches = [], isLoading, error, refetch } = useQuery({
    queryKey: batchesKey(manufacturerId),
    enabled: !!manufacturerId,
    queryFn: async (): Promise<ManufacturerBatchRow[]> => {
      const { data: rows, error: fetchError } = await supabase
        .from("serialised_products")
        .select("id, product_name, batch_number, serialisation_level, codes_generated, status, created_at")
        .eq("manufacturer_id", manufacturerId!)
        .order("created_at", { ascending: false })

      if (fetchError) throw new Error(fetchError.message)
      if (!rows || rows.length === 0) return []

      const batchIds = rows.map((row) => row.id)
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

      return rows.map((row) => ({
        id: row.id,
        productName: row.product_name,
        batchNumber: row.batch_number,
        serialisationLevel: row.serialisation_level,
        codesGenerated: row.codes_generated,
        scans: totalsByBatch.get(row.id)?.scans ?? 0,
        duplicates: totalsByBatch.get(row.id)?.duplicates ?? 0,
        status: row.status,
        createdAt: row.created_at,
      }))
    },
  })

  return {
    batches,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
