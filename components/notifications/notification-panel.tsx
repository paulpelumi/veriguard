import { Bell } from "lucide-react"

import { NotificationItem } from "@/components/notifications/notification-item"
import { EmptyState } from "@/components/shared/empty-state"
import type { Notification } from "@/types"

interface NotificationPanelProps {
  notifications: Notification[]
  unreadCount: number
  onRead: (id: string) => void
  onMarkAllRead: () => void
}

export function NotificationPanel({
  notifications,
  unreadCount,
  onRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  return (
    <div className="flex max-h-96 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium text-foreground">Notifications</span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-primary hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" />
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-y-auto">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onRead={onRead} />
          ))}
        </div>
      )}
    </div>
  )
}
