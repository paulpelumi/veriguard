"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

import { NotificationPanel } from "@/components/notifications/notification-panel"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useNotifications } from "@/hooks/use-notifications"
import { createClient } from "@/lib/supabase/client"

export function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onRead={markAsRead}
          onMarkAllRead={markAllAsRead}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
