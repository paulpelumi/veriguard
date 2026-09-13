"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Factory, Loader2, Plus } from "lucide-react"

import { AddProductDrawer } from "@/components/manufacturer/products/add-product-drawer"
import { ProductTable } from "@/components/manufacturer/products/product-table"
import { BatchTable } from "@/components/manufacturer/batches/batch-table"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useManufacturerBatches } from "@/hooks/use-manufacturer-batches"
import { useManufacturerProducts } from "@/hooks/use-manufacturer-products"
import { createClient } from "@/lib/supabase/client"
import type { ManufacturerVerificationStatus } from "@/types"

type TabValue = "products" | "batches"

export default function ManufacturerBatchesPage() {
  const [manufacturerId, setManufacturerId] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<ManufacturerVerificationStatus | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>("products")
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id ?? null
      setManufacturerId(userId)
      if (!userId) return
      const { data: profile } = await supabase
        .from("manufacturer_profiles")
        .select("verification_status")
        .eq("id", userId)
        .maybeSingle()
      setVerificationStatus(profile?.verification_status ?? null)
    })
  }, [])

  const { products, isLoading: productsLoading, addProduct, deleteProduct } = useManufacturerProducts(manufacturerId)
  const { batches, isLoading: batchesLoading } = useManufacturerBatches(manufacturerId)

  if (verificationStatus !== null && verificationStatus !== "approved") {
    return (
      <EmptyState
        icon={Factory}
        title="Approval required"
        description="Your manufacturer application needs to be approved before you can register products or generate codes."
      />
    )
  }

  const isLoading = activeTab === "products" ? productsLoading : batchesLoading

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Products & Batches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register your products, then generate serialised codes for each batch.
          </p>
        </div>
        {activeTab === "products" ? (
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" /> Add Product
          </Button>
        ) : (
          <Button render={<Link href="/manufacturer/generate" />}>
            <Plus className="size-4" /> Generate Codes
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="batches">Batches</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : activeTab === "products" ? (
        <ProductTable products={products} onAddProduct={() => setDrawerOpen(true)} onDelete={deleteProduct} />
      ) : (
        <BatchTable batches={batches} />
      )}

      <AddProductDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSubmit={addProduct} />
    </div>
  )
}
