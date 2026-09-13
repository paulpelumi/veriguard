"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"

import { DuplicateAlertCard } from "@/components/manufacturer/alerts/duplicate-alert-card"
import { EmptyState } from "@/components/shared/empty-state"
import { useDuplicateAlerts } from "@/hooks/use-duplicate-alerts"
import { createClient } from "@/lib/supabase/client"

export default function DuplicateAlertsPage() {
  const [manufacturerId, setManufacturerId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setManufacturerId(data.user?.id ?? null)
    })
  }, [])

  const { alerts, isLoading, resolveAlert } = useDuplicateAlerts(manufacturerId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Duplicate Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Serial codes that were scanned more than once - a strong signal of counterfeiting.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No duplicate alerts"
          description="You'll be notified here the moment any of your serial codes gets scanned more than once."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {alerts.map((alert) => (
            <DuplicateAlertCard key={alert.id} alert={alert} onResolve={resolveAlert} />
          ))}
        </div>
      )}
    </div>
  )
}
