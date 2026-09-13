"use client"

import { useCallback, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import type { MachineAnalysisResult } from "@/lib/manufacturers/machine-types"
import { createClient } from "@/lib/supabase/client"
import type { ManufacturerMachine, SerialisationLevel } from "@/types"

type MutationResult = { success: boolean }

function machinesKey(manufacturerId: string | null) {
  return ["manufacturer-machines", manufacturerId] as const
}

export interface NewMachineInput {
  machineName: string
  serialisationLevel: SerialisationLevel
  unitsPerHour?: number
  notes?: string
  analysis: MachineAnalysisResult
}

export function useManufacturerMachines(manufacturerId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const queryKey = machinesKey(manufacturerId)

  const {
    data: machines = [],
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey,
    enabled: !!manufacturerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manufacturer_machines")
        .select("*")
        .eq("manufacturer_id", manufacturerId!)
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  const addMutation = useMutation({
    mutationFn: async (input: NewMachineInput) => {
      if (!manufacturerId) throw new Error("Could not identify your account. Try refreshing the page.")

      // The first machine a manufacturer ever adds becomes their primary
      // automatically - Module 4's generate wizard pre-selects it. No
      // manual "set primary" toggle exists yet since nothing downstream
      // needs one before then.
      const isPrimary = machines.length === 0

      const { data, error } = await supabase
        .from("manufacturer_machines")
        .insert({
          manufacturer_id: manufacturerId,
          machine_name: input.machineName,
          machine_brand: input.analysis.detected_brand,
          machine_model: input.analysis.detected_model,
          machine_category: input.analysis.machine_category,
          serialisation_level: input.serialisationLevel,
          units_per_hour: input.unitsPerHour ?? null,
          ai_detected_brand: input.analysis.detected_brand,
          ai_detected_model: input.analysis.detected_model,
          ai_recommended_format: input.analysis.primary_format,
          ai_format_confidence: input.analysis.confidence,
          ai_format_reasoning: input.analysis.reasoning,
          ai_detected_at: new Date().toISOString(),
          custom_format_notes: input.notes ?? null,
          is_primary: isPrimary,
        })
        .select()
        .single()

      if (error || !data) throw new Error(error?.message ?? "Could not save machine")
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData<ManufacturerMachine[]>(queryKey, (current = []) => [data, ...current])
      toast.success("Machine added")
    },
    onError: (mutationError) => toast.error(mutationError.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manufacturer_machines").delete().eq("id", id)
      if (error) throw new Error(error.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ManufacturerMachine[]>(queryKey)
      queryClient.setQueryData<ManufacturerMachine[]>(queryKey, (current = []) =>
        current.filter((machine) => machine.id !== id)
      )
      return { previous }
    },
    onError: (mutationError, _id, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
      toast.error(mutationError.message)
    },
    onSuccess: () => toast.success("Machine removed"),
  })

  const addMachine = useCallback(
    async (input: NewMachineInput): Promise<MutationResult> => {
      try {
        await addMutation.mutateAsync(input)
        return { success: true }
      } catch {
        return { success: false }
      }
    },
    [addMutation]
  )

  const deleteMachine = useCallback(
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
    machines,
    isLoading,
    error: queryError instanceof Error ? queryError.message : null,
    addMachine,
    deleteMachine,
  }
}
