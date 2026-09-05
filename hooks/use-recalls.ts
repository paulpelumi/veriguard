"use client"

import { useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { RecallAlert } from "@/types"

interface InventoryRef {
  product_name: string
  nafdac_number: string | null
}

// Mirrors an ilike '%term%' style fuzzy match (bidirectional substring),
// done in memory since both datasets - one business's inventory and the
// (small) set of active recalls - are small enough that this avoids an
// N-query round trip per recall.
function isRecallMatch(recall: RecallAlert, item: InventoryRef): boolean {
  if (
    recall.nafdac_number &&
    item.nafdac_number &&
    recall.nafdac_number.toUpperCase() === item.nafdac_number.toUpperCase()
  ) {
    return true
  }

  const recallName = recall.product_name.toLowerCase().trim()
  const itemName = item.product_name.toLowerCase().trim()
  if (!recallName || !itemName) return false

  return recallName.includes(itemName) || itemName.includes(recallName)
}

export function useRecalls(businessId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [allRecalls, setAllRecalls] = useState<RecallAlert[]>([])
  const [inventoryRefs, setInventoryRefs] = useState<InventoryRef[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId) return
    const currentBusinessId = businessId

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      const [recallsResult, inventoryResult] = await Promise.all([
        supabase
          .from("recall_alerts")
          .select("*")
          .eq("is_active", true)
          .order("issued_date", { ascending: false }),
        supabase
          .from("inventory")
          .select("product_name, nafdac_number")
          .eq("business_id", currentBusinessId),
      ])

      if (cancelled) return

      if (recallsResult.error) {
        setError(recallsResult.error.message)
      } else {
        setAllRecalls(recallsResult.data ?? [])
        setInventoryRefs(inventoryResult.data ?? [])
      }
      setIsLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [businessId, supabase])

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

  const affectedRecalls = useMemo(
    () => allRecalls.filter((recall) => matchesByRecallId.has(recall.id)),
    [allRecalls, matchesByRecallId]
  )

  return { allRecalls, affectedRecalls, matchesByRecallId, isLoading, error }
}
