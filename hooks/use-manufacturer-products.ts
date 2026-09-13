"use client"

import { useCallback, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import type { ManufacturerProductValues } from "@/lib/validations/manufacturer-product"
import type { ManufacturerProduct } from "@/types"

type MutationResult = { success: boolean }

function productsKey(manufacturerId: string | null) {
  return ["manufacturer-products", manufacturerId] as const
}

function toProductRow(values: ManufacturerProductValues) {
  return {
    product_name: values.productName,
    nafdac_number: values.nafdacNumber,
    product_category: values.productCategory || null,
    description: values.description || null,
    standard_batch_size: values.standardBatchSize ? Number(values.standardBatchSize) : null,
    storage_conditions: values.storageConditions || null,
  }
}

export function useManufacturerProducts(manufacturerId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const queryKey = productsKey(manufacturerId)

  const {
    data: products = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    enabled: !!manufacturerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manufacturer_products")
        .select("*")
        .eq("manufacturer_id", manufacturerId!)
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  const addMutation = useMutation({
    mutationFn: async (values: ManufacturerProductValues) => {
      if (!manufacturerId) throw new Error("Could not identify your account. Try refreshing the page.")
      const { data, error } = await supabase
        .from("manufacturer_products")
        .insert({ manufacturer_id: manufacturerId, ...toProductRow(values) })
        .select()
        .single()
      if (error || !data) throw new Error(error?.message ?? "Could not add product")
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ManufacturerProduct[]>(queryKey, (current = []) => [data, ...current])
      toast.success("Product added")
    },
    onError: (mutationError) => toast.error(mutationError.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manufacturer_products").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ManufacturerProduct[]>(queryKey)
      queryClient.setQueryData<ManufacturerProduct[]>(queryKey, (current = []) =>
        current.filter((product) => product.id !== id)
      )
      return { previous }
    },
    onError: (mutationError, _id, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
      toast.error(mutationError.message)
    },
    onSuccess: () => toast.success("Product removed"),
  })

  const addProduct = useCallback(
    async (values: ManufacturerProductValues): Promise<MutationResult> => {
      try {
        await addMutation.mutateAsync(values)
        return { success: true }
      } catch {
        return { success: false }
      }
    },
    [addMutation]
  )

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id)
      } catch {
        // Already surfaced via the mutation's onError toast.
      }
    },
    [deleteMutation]
  )

  return {
    products,
    isLoading,
    error: queryError instanceof Error ? queryError.message : null,
    addProduct,
    deleteProduct,
  }
}
