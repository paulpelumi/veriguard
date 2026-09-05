"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types"

const FETCH_LIMIT = 20

export function useNotifications(userId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(FETCH_LIMIT)

    setNotifications(data ?? [])
    setIsLoading(false)
  }, [userId, supabase])

  useEffect(() => {
    // Fetch-on-mount/dependency-change is what this effect synchronizes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications()
  }, [fetchNotifications])

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
          setNotifications((current) => {
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
  }, [userId, supabase])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((current) =>
        current.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    },
    [supabase]
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    setNotifications((current) => current.map((n) => ({ ...n, is_read: true })))
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
  }, [userId, supabase])

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead }
}
