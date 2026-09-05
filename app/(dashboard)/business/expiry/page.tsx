"use client"

import { useEffect, useState } from "react"
import { Download, Loader2, Package } from "lucide-react"

import { AddProductDrawer } from "@/components/inventory/add-product-drawer"
import { ExpiryMonitoringTable } from "@/components/expiry/expiry-monitoring-table"
import { ExpirySummaryCards } from "@/components/expiry/expiry-summary-cards"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { useExpiryMonitoring } from "@/hooks/use-expiry-monitoring"
import { createClient } from "@/lib/supabase/client"
import { downloadCsv } from "@/lib/utils/csv"
import { daysUntil, formatDate } from "@/lib/utils/date"
import type { InventoryFormValues } from "@/lib/validations/inventory"
import type { InventoryItem } from "@/types"

export default function ExpiryMonitoringPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setBusinessId(data.user?.id ?? null)
    })
  }, [])

  const {
    items,
    totalMonitored,
    counts,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    updateItem,
    verifyItem,
  } = useExpiryMonitoring(businessId)

  function handleEdit(item: InventoryItem) {
    setEditingItem(item)
    setDrawerOpen(true)
  }

  async function handleSubmit(values: InventoryFormValues) {
    if (!editingItem) return { success: false }
    return updateItem(editingItem.id, values)
  }

  function handleExport() {
    downloadCsv(
      `expiry-monitoring-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Product Name", "Type", "Expiry Date", "Days Left", "Batch No.", "NAFDAC No."],
      items.map((item) => [
        item.product_name,
        item.product_type,
        formatDate(item.expiry_date),
        daysUntil(item.expiry_date),
        item.batch_number ?? "",
        item.nafdac_number ?? "",
      ])
    )
  }

  if (!businessId || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon={Package} title="Couldn't load expiry data" description={error} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expiry Monitoring</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track products approaching or past their expiry date.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
          <Download className="size-4" />
          Export
        </Button>
      </div>

      <ExpirySummaryCards counts={counts} />

      <ExpiryMonitoringTable
        items={items}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
        totalMonitored={totalMonitored}
        onEdit={handleEdit}
        onVerify={verifyItem}
      />

      <AddProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode="edit"
        item={editingItem}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
