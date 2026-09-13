"use client"

import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

// Deliberately excludes key_hash - there's no reason for it to ever reach
// the browser, even hashed, once the key row exists.
export interface ApiKeySummary {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  rate_limit_per_hour: number
  calls_total: number
  last_used_at: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

const SAFE_COLUMNS =
  "id, name, key_prefix, permissions, rate_limit_per_hour, calls_total, last_used_at, expires_at, is_active, created_at"

function apiKeysQueryKey(userId: string | null) {
  return ["api-keys", userId] as const
}

export function useApiKeys(userId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const queryKey = apiKeysQueryKey(userId)

  const {
    data: keys = [],
    isLoading,
    error,
  } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async (): Promise<ApiKeySummary[]> => {
      const { data, error: fetchError } = await supabase
        .from("api_keys")
        .select(SAFE_COLUMNS)
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })

      if (fetchError) throw new Error(fetchError.message)
      return data ?? []
    },
  })

  // Creation goes through the server route (see app/api/business/api-keys)
  // rather than a direct insert - it's the one operation here that needs
  // secret generation and a plan-gate check the client can't be trusted to
  // enforce itself.
  const createMutation = useMutation({
    mutationFn: async (name: string): Promise<{ key: ApiKeySummary; rawKey: string }> => {
      const response = await fetch("/api/business/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error?.message ?? "Could not create API key")
      }
      return result
    },
    onSuccess: ({ key }) => {
      queryClient.setQueryData<ApiKeySummary[]>(queryKey, (current = []) => [key, ...current])
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  })

  // A plain update, unlike creation - RLS ("Users manage own API keys")
  // already lets the owning user flip their own key's is_active, no secret
  // material involved.
  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: updateError } = await supabase.from("api_keys").update({ is_active: false }).eq("id", id)
      if (updateError) throw new Error(updateError.message)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<ApiKeySummary[]>(queryKey)
      queryClient.setQueryData<ApiKeySummary[]>(queryKey, (current = []) =>
        current.map((key) => (key.id === id ? { ...key, is_active: false } : key))
      )
      return { previous }
    },
    onError: (mutationError: Error, _id, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
      toast.error(mutationError.message)
    },
    onSuccess: () => toast.success("API key revoked"),
  })

  return {
    keys,
    isLoading,
    error: error instanceof Error ? error.message : null,
    createKey: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    revokeKey: revokeMutation.mutate,
  }
}
