"use client"

import { useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import type { InventoryFormValues } from "@/lib/validations/inventory"
import type { InventoryItem, NafdacVerificationResult } from "@/types"
import type { VerificationStatus } from "@/types/database"

type MutationResult = { success: boolean }

function inventoryKey(businessId: string | null) {
  return ["inventory", businessId] as const
}

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

// React Query owns the cache/loading state (Global Improvement 3); the
// Supabase realtime subscription still exists (React Query has no realtime
// primitive of its own) but now patches the query cache via
// queryClient.setQueryData instead of local useState, so it and the
// mutations below share one source of truth.
export function useInventory(businessId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const router = useRouter()
  const queryKey = inventoryKey(businessId)

  const {
    data: items = [],
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey,
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from("inventory")
        .select("*")
        .eq("business_id", businessId!)
        .order("expiry_date", { ascending: true })

      if (fetchError) throw new Error(fetchError.message)
      return data ?? []
    },
  })

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
          queryClient.setQueryData<InventoryItem[]>(queryKey, (current = []) => {
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
    // queryKey is derived from businessId, already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, supabase, queryClient])

  const addMutation = useMutation({
    mutationFn: async (values: InventoryFormValues) => {
      if (!businessId) throw new Error("Could not identify your account. Try refreshing the page.")
      const { data, error: insertError } = await supabase
        .from("inventory")
        .insert({ business_id: businessId, ...toInventoryRow(values) })
        .select()
        .single()
      if (insertError || !data) throw new Error(insertError?.message ?? "Could not add product")
      return data
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<InventoryItem[]>(queryKey)
      if (businessId) {
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
        queryClient.setQueryData<InventoryItem[]>(queryKey, (current = []) => [
          ...current,
          optimisticItem,
        ])
        return { previous, optimisticId }
      }
      return { previous, optimisticId: null }
    },
    onError: (mutationError, _values, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)

      // Raised by the enforce_inventory_limit trigger (migration 0022) -
      // the insert never happened, so this is the one addMutation error
      // that should point at /pricing instead of just naming the failure.
      if (mutationError.message.includes("Inventory limit reached")) {
        toast.error(mutationError.message, {
          action: { label: "Upgrade", onClick: () => router.push("/pricing") },
        })
        return
      }

      toast.error(mutationError.message)
    },
    onSuccess: (data, _values, context) => {
      queryClient.setQueryData<InventoryItem[]>(queryKey, (current = []) =>
        current.map((item) => (item.id === context?.optimisticId ? data : item))
      )
      toast.success("Product added")
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: InventoryFormValues }) => {
      const { error: updateError } = await supabase
        .from("inventory")
        .update(toInventoryRow(values))
        .eq("id", id)
      if (updateError) throw new Error(updateError.message)
    },
    onMutate: async ({ id, values }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<InventoryItem[]>(queryKey)
      queryClient.setQueryData<InventoryItem[]>(queryKey, (current = []) =>
        current.map((item) => (item.id === id ? { ...item, ...toInventoryRow(values) } : item))
      )
      return { previous }
    },
    onError: (mutationError, _vars, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
      toast.error(mutationError.message)
    },
    onSuccess: () => toast.success("Product updated"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: deleteError } = await supabase.from("inventory").delete().eq("id", id)
      if (deleteError) throw new Error(deleteError.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<InventoryItem[]>(queryKey)
      queryClient.setQueryData<InventoryItem[]>(queryKey, (current = []) =>
        current.filter((item) => item.id !== id)
      )
      return { previous }
    },
    onError: (mutationError, _id, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
      toast.error(mutationError.message)
    },
    onSuccess: () => toast.success("Product deleted"),
  })

  const verifyMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      if (!item.nafdac_number) {
        throw new Error("This product has no NAFDAC number to verify.")
      }
      const response = await fetch("/api/nafdac/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nafdacNumber: item.nafdac_number, productType: item.product_type }),
      })
      const result: NafdacVerificationResult = await response.json()

      // A "not found" caused by a registry coverage gap (e.g. food/drink
      // products aren't in NAFDAC's public drug registry) isn't evidence
      // the product is unverified - leave it pending rather than failed.
      // "verified_with_warnings" is still a registered number (just with
      // detected inconsistencies), so it counts as verified too - the
      // warning is surfaced via the toast below, not the status field.
      const newStatus: VerificationStatus =
        result.status === "verified" || result.status === "verified_with_warnings"
          ? "verified"
          : result.status === "not_found" && !result.coverage_gap
            ? "failed"
            : "pending"

      const { error: verifyUpdateError } = await supabase
        .from("inventory")
        .update({ verification_status: newStatus, is_verified: newStatus === "verified" })
        .eq("id", item.id)

      return { result, newStatus, verifyUpdateError }
    },
    onMutate: async (item) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<InventoryItem[]>(queryKey)
      return { previous, itemId: item.id }
    },
    onSuccess: ({ result, newStatus, verifyUpdateError }, item, context) => {
      if (verifyUpdateError) {
        if (context) queryClient.setQueryData(queryKey, context.previous)
      } else {
        queryClient.setQueryData<InventoryItem[]>(queryKey, (current = []) =>
          current.map((row) =>
            row.id === item.id
              ? { ...row, verification_status: newStatus, is_verified: newStatus === "verified" }
              : row
          )
        )
      }

      if (result.status === "verified") {
        toast.success(`Verified: ${result.product?.name ?? item.product_name}`)
      } else if (result.status === "verified_with_warnings") {
        toast.warning(
          `Registered but suspicious: ${result.product?.name ?? item.product_name}. Check the Verification page for details.`
        )
      } else if (result.status === "not_found" && !result.coverage_gap) {
        toast.error(result.message)
      } else {
        toast.warning(result.message)
      }
    },
    onError: () => toast.error("Couldn't reach the verification service."),
  })

  const addItem = useCallback(
    async (values: InventoryFormValues): Promise<MutationResult> => {
      try {
        await addMutation.mutateAsync(values)
        return { success: true }
      } catch {
        return { success: false }
      }
    },
    [addMutation]
  )

  const updateItem = useCallback(
    async (id: string, values: InventoryFormValues): Promise<MutationResult> => {
      try {
        await updateMutation.mutateAsync({ id, values })
        return { success: true }
      } catch {
        return { success: false }
      }
    },
    [updateMutation]
  )

  const deleteItem = useCallback(
    async (id: string): Promise<MutationResult> => {
      try {
        await deleteMutation.mutateAsync(id)
        return { success: true }
      } catch {
        return { success: false }
      }
    },
    [deleteMutation]
  )

  const verifyItem = useCallback(
    async (item: InventoryItem) => {
      try {
        await verifyMutation.mutateAsync(item)
      } catch {
        // Already surfaced via the mutation's onError toast.
      }
    },
    [verifyMutation]
  )

  return {
    items,
    isLoading,
    error: queryError instanceof Error ? queryError.message : null,
    addItem,
    updateItem,
    deleteItem,
    verifyItem,
    refetch,
  }
}
