"use client"

import { useEffect, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types"

const FETCH_LIMIT = 20

function notificationsKey(userId: string | null) {
  return ["notifications", userId] as const
}

export function useNotifications(userId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const queryClient = useQueryClient()
  const queryKey = notificationsKey(userId)

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(FETCH_LIMIT)
      return data ?? []
    },
  })

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          queryClient.setQueryData<Notification[]>(queryKey, (current = []) => {
            if (payload.eventType === "INSERT") {
              const newRow = payload.new as Notification
              if (current.some((n) => n.id === newRow.id)) return current
              return [newRow, ...current].slice(0, FETCH_LIMIT)
            }
            if (payload.eventType === "UPDATE") {
              const updated = payload.new as Notification
              return current.map((n) => (n.id === updated.id ? updated : n))
            }
            if (payload.eventType === "DELETE") {
              const removedId = (payload.old as { id: string }).id
              return current.filter((n) => n.id !== removedId)
            }
            return current
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // queryKey is derived from userId, already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabase, queryClient])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData<Notification[]>(queryKey, (current = []) =>
        current.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false)
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData<Notification[]>(queryKey, (current = []) =>
        current.map((n) => ({ ...n, is_read: true }))
      )
    },
  })

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  }
}
