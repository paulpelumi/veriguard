"use client"

import { useMemo, useState } from "react"

import { useInventory } from "@/hooks/use-inventory"
import { daysUntil } from "@/lib/utils/date"
import type { InventoryItem } from "@/types"

export type ExpiryTab = "all" | "critical" | "warning" | "expiring_soon" | "expired"

function matchesTab(item: InventoryItem, tab: ExpiryTab): boolean {
  const days = daysUntil(item.expiry_date)
  if (tab === "all") return true
  if (tab === "expired") return days < 0
  if (tab === "critical") return days >= 0 && days <= 30
  if (tab === "warning") return days > 30 && days <= 60
  return days > 60 && days <= 90 // expiring_soon
}

export function useExpiryMonitoring(businessId: string | null) {
  const { items, isLoading, error, updateItem, deleteItem, verifyItem } = useInventory(businessId)
  const [activeTab, setActiveTab] = useState<ExpiryTab>("all")

  // Only products expired or expiring within the 90-day monitoring window -
  // the far-future "Good" items belong on the main Inventory page, not here.
  const monitored = useMemo(
    () => items.filter((item) => daysUntil(item.expiry_date) <= 90),
    [items]
  )

  const counts = useMemo(
    () => ({
      critical: monitored.filter((item) => matchesTab(item, "critical")).length,
      warning: monitored.filter((item) => matchesTab(item, "warning")).length,
      expiringSoon: monitored.filter((item) => matchesTab(item, "expiring_soon")).length,
      expired: monitored.filter((item) => matchesTab(item, "expired")).length,
    }),
    [monitored]
  )

  const filteredItems = useMemo(() => {
    const sorted = [...monitored].sort(
      (a, b) => daysUntil(a.expiry_date) - daysUntil(b.expiry_date)
    )
    return sorted.filter((item) => matchesTab(item, activeTab))
  }, [monitored, activeTab])

  return {
    items: filteredItems,
    totalMonitored: monitored.length,
    counts,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    updateItem,
    deleteItem,
    verifyItem,
  }
}
