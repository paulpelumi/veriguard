"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"

import { createClient } from "@/lib/supabase/client"
import { isRecallMatch } from "@/lib/utils/recall-matching"
import type { RecallAlert } from "@/types"

interface InventoryRef {
  product_name: string
  nafdac_number: string | null
}

export function useRecalls(businessId: string | null) {
  const supabase = useMemo(() => createClient(), [])

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ["recalls", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const [recallsResult, inventoryResult] = await Promise.all([
        supabase
          .from("recall_alerts")
          .select("*")
          .eq("is_active", true)
          .order("issued_date", { ascending: false }),
        supabase
          .from("inventory")
          .select("product_name, nafdac_number")
          .eq("business_id", businessId!),
      ])

      if (recallsResult.error) throw new Error(recallsResult.error.message)

      return {
        allRecalls: recallsResult.data ?? [],
        inventoryRefs: inventoryResult.data ?? [],
      }
    },
  })

  const allRecalls = useMemo<RecallAlert[]>(() => data?.allRecalls ?? [], [data])
  const inventoryRefs = useMemo<InventoryRef[]>(() => data?.inventoryRefs ?? [], [data])

  const matchesByRecallId = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const recall of allRecalls) {
      const matches = inventoryRefs.filter((item) => isRecallMatch(recall, item))
      if (matches.length > 0) {
        map.set(recall.id, [...new Set(matches.map((item) => item.product_name))])
      }
    }
    return map
  }, [allRecalls, inventoryRefs])

  const affectedRecalls = useMemo<RecallAlert[]>(
    () => allRecalls.filter((recall) => matchesByRecallId.has(recall.id)),
    [allRecalls, matchesByRecallId]
  )

  return {
    allRecalls,
    affectedRecalls,
    matchesByRecallId,
    isLoading,
    error: queryError instanceof Error ? queryError.message : null,
  }
}
