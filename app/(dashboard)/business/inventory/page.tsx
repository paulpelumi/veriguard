"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Package, Plus } from "lucide-react"

import { AddProductDrawer } from "@/components/inventory/add-product-drawer"
import {
  InventoryFilters,
  type InventoryFilterState,
} from "@/components/inventory/inventory-filters"
import { InventoryStats } from "@/components/inventory/inventory-stats"
import { InventoryTable } from "@/components/inventory/inventory-table"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { useInventory } from "@/hooks/use-inventory"
import { createClient } from "@/lib/supabase/client"
import { daysUntil } from "@/lib/utils/date"
import type { InventoryFormValues } from "@/lib/validations/inventory"
import type { InventoryItem } from "@/types"

function matchesExpiryStatus(
  item: InventoryItem,
  status: InventoryFilterState["expiryStatus"]
) {
  if (status === "all") return true
  const days = daysUntil(item.expiry_date)
  if (status === "expired") return days < 0
  if (status === "critical") return days >= 0 && days <= 30
  if (status === "warning") return days > 30 && days <= 60
  if (status === "expiring_soon") return days > 60 && days <= 90
  return days > 90
}

const defaultFilters: InventoryFilterState = {
  search: "",
  productType: "all",
  expiryStatus: "all",
}

export default function InventoryPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [filters, setFilters] = useState<InventoryFilterState>(defaultFilters)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setBusinessId(data.user?.id ?? null)
    })
  }, [])

  const { items, isLoading, error, addItem, updateItem, deleteItem, verifyItem } =
    useInventory(businessId)

  const filteredItems = useMemo(() => {
    const search = filters.search.trim().toLowerCase()

    return items.filter((item) => {
      const matchesSearch =
        !search ||
        item.product_name.toLowerCase().includes(search) ||
        (item.nafdac_number ?? "").toLowerCase().includes(search) ||
        (item.batch_number ?? "").toLowerCase().includes(search)

      const matchesType = filters.productType === "all" || item.product_type === filters.productType

      return matchesSearch && matchesType && matchesExpiryStatus(item, filters.expiryStatus)
    })
  }, [items, filters])

  function handleAddClick() {
    setEditingItem(null)
    setDrawerOpen(true)
  }

  function handleEditClick(item: InventoryItem) {
    setEditingItem(item)
    setDrawerOpen(true)
  }

  function handleVerifyClick(item: InventoryItem) {
    verifyItem(item)
  }

  async function handleSubmit(values: InventoryFormValues) {
    if (editingItem) {
      return updateItem(editingItem.id, values)
    }
    return addItem(values)
  }

  if (!businessId || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon={Package} title="Couldn't load inventory" description={error} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your stock, expiry dates, and NAFDAC verification status.
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="size-4" />
          Add Product
        </Button>
      </div>

      <InventoryStats items={items} />

      <InventoryFilters filters={filters} onChange={setFilters} />

      <InventoryTable
        items={filteredItems}
        onEdit={handleEditClick}
        onVerify={handleVerifyClick}
        onDelete={deleteItem}
      />

      <AddProductDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={editingItem ? "edit" : "add"}
        item={editingItem}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
