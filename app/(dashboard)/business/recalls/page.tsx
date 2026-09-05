"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"

import { AffectedStockBanner } from "@/components/recalls/affected-stock-banner"
import { RecallCard } from "@/components/recalls/recall-card"
import { EmptyState } from "@/components/shared/empty-state"
import { useRecalls } from "@/hooks/use-recalls"
import { createClient } from "@/lib/supabase/client"

export default function RecallsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setBusinessId(data.user?.id ?? null)
    })
  }, [])

  const { allRecalls, affectedRecalls, matchesByRecallId, isLoading, error } =
    useRecalls(businessId)

  const affectedIds = new Set(affectedRecalls.map((r) => r.id))
  const unaffectedRecalls = allRecalls.filter((recall) => !affectedIds.has(recall.id))

  if (!businessId || isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <EmptyState icon={ShieldAlert} title="Couldn't load recalls" description={error} />
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recalls &amp; Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay ahead of NAFDAC recalls affecting your products.
        </p>
      </div>

      <AffectedStockBanner count={affectedRecalls.length} />

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">Affecting Your Stock</h2>
        {affectedRecalls.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No recalls affect your inventory"
            description="We'll flag it here if an active recall matches a product you stock."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {affectedRecalls.map((recall) => (
              <RecallCard
                key={recall.id}
                recall={recall}
                isAffecting
                matchedProductNames={matchesByRecallId.get(recall.id) ?? []}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">All Active Recalls</h2>
        {unaffectedRecalls.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="No other active recalls" />
        ) : (
          <div className="flex flex-col gap-3">
            {unaffectedRecalls.map((recall) => (
              <RecallCard key={recall.id} recall={recall} isAffecting={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
