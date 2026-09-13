"use client"

import { useEffect, useState } from "react"
import { Factory, Loader2, Plus } from "lucide-react"

import { AddMachineDrawer } from "@/components/manufacturer/machines/add-machine-drawer"
import { MachineCard } from "@/components/manufacturer/machines/machine-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { useManufacturerMachines } from "@/hooks/use-manufacturer-machines"
import { createClient } from "@/lib/supabase/client"
import type { ManufacturerVerificationStatus } from "@/types"

export default function ManufacturerMachinesPage() {
  const [manufacturerId, setManufacturerId] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<ManufacturerVerificationStatus | null>(null)
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

  const { machines, isLoading, addMachine, deleteMachine } = useManufacturerMachines(manufacturerId)

  if (verificationStatus !== null && verificationStatus !== "approved") {
    return (
      <EmptyState
        icon={Factory}
        title="Approval required"
        description="Your manufacturer application needs to be approved before you can add coding machines. Check your dashboard for status."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Machines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register your coding machines and label printers to get AI-recommended export formats.
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <Plus className="size-4" /> Add Machine
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : machines.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No machines added yet"
          description="Add your first coding machine or label printer to start generating serial codes."
          action={<Button onClick={() => setDrawerOpen(true)}>Add Machine</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine) => (
            <MachineCard key={machine.id} machine={machine} onDelete={deleteMachine} />
          ))}
        </div>
      )}

      <AddMachineDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSave={addMachine} />
    </div>
  )
}
