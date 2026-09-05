"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import type { InventoryFormValues } from "@/lib/validations/inventory"
import type { InventoryItem } from "@/types"

type MutationResult = { success: boolean }

function toInventoryRow(values: InventoryFormValues) {
  return {
    product_name: values.productName,
    product_type: values.productType,
    product_subtype: values.productSubtype || null,
    nafdac_number: values.nafdacNumber || null,
    batch_number: values.batchNumber || null,
    production_date: values.productionDate || null,
    expiry_date: values.expiryDate,
    quantity: values.quantity,
    unit: values.unit,
    supplier: values.supplier || null,
    notes: values.notes || null,
  }
}

export function useInventory(businessId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!businessId) return

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from("inventory")
      .select("*")
      .eq("business_id", businessId)
      .order("expiry_date", { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setItems(data ?? [])
    }
    setIsLoading(false)
  }, [businessId, supabase])

  useEffect(() => {
    // Fetch-on-mount/dependency-change is exactly what this effect
    // synchronizes; the resulting setState inside fetchItems is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    if (!businessId) return

    const channel = supabase
      .channel(`inventory-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          setItems((current) => {
            if (payload.eventType === "INSERT") {
              const newItem = payload.new as InventoryItem
              if (current.some((item) => item.id === newItem.id)) return current
              return [...current, newItem]
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as InventoryItem
              return current.map((item) => (item.id === updated.id ? updated : item))
            }
            if (payload.eventType === "DELETE") {
              const removedId = (payload.old as { id: string }).id
              return current.filter((item) => item.id !== removedId)
            }
            return current
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [businessId, supabase])

  const addItem = useCallback(
    async (values: InventoryFormValues): Promise<MutationResult> => {
      if (!businessId) {
        toast.error("Could not identify your account. Try refreshing the page.")
        return { success: false }
      }

      const optimisticId = `optimistic-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      const optimisticItem: InventoryItem = {
        id: optimisticId,
        business_id: businessId,
        is_verified: false,
        verification_status: "unverified",
        barcode: null,
        purchase_price: null,
        created_at: now,
        updated_at: now,
        ...toInventoryRow(values),
      }

      setItems((current) => [...current, optimisticItem])

      const { data, error: insertError } = await supabase
        .from("inventory")
        .insert({ business_id: businessId, ...toInventoryRow(values) })
        .select()
        .single()

      if (insertError || !data) {
        setItems((current) => current.filter((item) => item.id !== optimisticId))
        toast.error(insertError?.message ?? "Could not add product")
        return { success: false }
      }

      setItems((current) => current.map((item) => (item.id === optimisticId ? data : item)))
      toast.success("Product added")
      return { success: true }
    },
    [businessId, supabase]
  )

  const updateItem = useCallback(
    async (id: string, values: InventoryFormValues): Promise<MutationResult> => {
      let previousSnapshot: InventoryItem[] = []
      setItems((current) => {
        previousSnapshot = current
        return current.map((item) =>
          item.id === id ? { ...item, ...toInventoryRow(values) } : item
        )
      })

      const { error: updateError } = await supabase
        .from("inventory")
        .update(toInventoryRow(values))
        .eq("id", id)

      if (updateError) {
        setItems(previousSnapshot)
        toast.error(updateError.message)
        return { success: false }
      }

      toast.success("Product updated")
      return { success: true }
    },
    [supabase]
  )

  const deleteItem = useCallback(
    async (id: string): Promise<MutationResult> => {
      let previousSnapshot: InventoryItem[] = []
      setItems((current) => {
        previousSnapshot = current
        return current.filter((item) => item.id !== id)
      })

      const { error: deleteError } = await supabase.from("inventory").delete().eq("id", id)

      if (deleteError) {
        setItems(previousSnapshot)
        toast.error(deleteError.message)
        return { success: false }
      }

      toast.success("Product deleted")
      return { success: true }
    },
    [supabase]
  )

  return { items, isLoading, error, addItem, updateItem, deleteItem, refetch: fetchItems }
}
