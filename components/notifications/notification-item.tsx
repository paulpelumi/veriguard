"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, Activity, CalendarClock, ShieldAlert, ShieldCheck } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/utils/date"
import type { Notification, NotificationType } from "@/types"

const typeIcons: Record<NotificationType, typeof CalendarClock> = {
  expiry_warning: CalendarClock,
  recall_alert: AlertTriangle,
  verification_complete: ShieldCheck,
  counterfeit_confirmed: ShieldAlert,
  verification_anomaly: Activity,
}

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter()
  const Icon = typeIcons[notification.type]

  function handleClick() {
    if (!notification.is_read) {
      onRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-medium text-foreground">{notification.title}</span>
        <span className="text-xs text-muted-foreground">{notification.message}</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(notification.created_at)}
        </span>
      </div>
      {!notification.is_read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
      )}
    </button>
  )
}
