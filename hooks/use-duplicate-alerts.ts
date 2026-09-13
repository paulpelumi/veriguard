"use client"

import { useCallback, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

export interface DuplicateAlert {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  serialCode: string | null
  batchId: string | null
  firstScannedLocation: string | null
  currentScanLocation: string | null
}

function alertsKey(manufacturerId: string | null) {
  return ["duplicate-alerts", manufacturerId] as const
}

export function useDuplicateAlerts(manufacturerId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const queryKey = alertsKey(manufacturerId)

  const {
    data: alerts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    enabled: !!manufacturerId,
    queryFn: async (): Promise<DuplicateAlert[]> => {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("id, title, message, is_read, created_at, metadata")
        .eq("user_id", manufacturerId!)
        .eq("type", "duplicate_detected")
        .order("created_at", { ascending: false })

      if (fetchError) throw new Error(fetchError.message)

      return (data ?? []).map((row) => {
        const metadata = (row.metadata ?? {}) as Record<string, unknown>
        return {
          id: row.id,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          createdAt: row.created_at,
          serialCode: typeof metadata.serial_code === "string" ? metadata.serial_code : null,
          batchId: typeof metadata.batch_id === "string" ? metadata.batch_id : null,
          firstScannedLocation:
            typeof metadata.first_scanned_location === "string" ? metadata.first_scanned_location : null,
          currentScanLocation:
            typeof metadata.current_scan_location === "string" ? metadata.current_scan_location : null,
        }
      })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: updateError } = await supabase.from("notifications").update({ is_read: true }).eq("id", id)
      if (updateError) throw new Error(updateError.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<DuplicateAlert[]>(queryKey)
      queryClient.setQueryData<DuplicateAlert[]>(queryKey, (current = []) =>
        current.map((alert) => (alert.id === id ? { ...alert, isRead: true } : alert))
      )
      return { previous }
    },
    onError: (mutationError, _id, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
      toast.error(mutationError.message)
    },
    onSuccess: () => toast.success("Marked as resolved"),
  })

  const resolveAlert = useCallback(
    async (id: string) => {
      try {
        await resolveMutation.mutateAsync(id)
      } catch {
        // Already surfaced via the mutation's onError toast.
      }
    },
    [resolveMutation]
  )

  return {
    alerts,
    isLoading,
    error: error instanceof Error ? error.message : null,
    resolveAlert,
  }
}
