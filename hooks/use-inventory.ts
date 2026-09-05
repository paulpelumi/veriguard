"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import type { InventoryFormValues } from "@/lib/validations/inventory"
import type { InventoryItem, NafdacVerificationResult } from "@/types"
import type { VerificationStatus } from "@/types/database"

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

  const verifyItem = useCallback(
    async (item: InventoryItem) => {
      if (!item.nafdac_number) {
        toast.error("This product has no NAFDAC number to verify.")
        return
      }

      const toastId = toast.loading(`Verifying ${item.nafdac_number}...`)

      try {
        const response = await fetch("/api/nafdac/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nafdacNumber: item.nafdac_number }),
        })
        const result: NafdacVerificationResult = await response.json()

        const newStatus: VerificationStatus =
          result.status === "verified"
            ? "verified"
            : result.status === "not_found"
              ? "failed"
              : "pending"

        let previousSnapshot: InventoryItem[] = []
        setItems((current) => {
          previousSnapshot = current
          return current.map((row) =>
            row.id === item.id
              ? { ...row, verification_status: newStatus, is_verified: newStatus === "verified" }
              : row
          )
        })

        const { error: verifyUpdateError } = await supabase
          .from("inventory")
          .update({ verification_status: newStatus, is_verified: newStatus === "verified" })
          .eq("id", item.id)

        if (verifyUpdateError) {
          setItems(previousSnapshot)
        }

        toast.dismiss(toastId)
        if (result.status === "verified") {
          toast.success(`Verified: ${result.product?.name ?? item.product_name}`)
        } else if (result.status === "not_found") {
          toast.error(result.message)
        } else {
          toast.warning(result.message)
        }
      } catch {
        toast.dismiss(toastId)
        toast.error("Couldn't reach the verification service.")
      }
    },
    [supabase]
  )

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    verifyItem,
    refetch: fetchItems,
  }
}
