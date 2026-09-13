"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { Loader2, Package } from "lucide-react"
import { toast } from "sonner"

import { BatchFormStep1 } from "@/components/manufacturer/generate/batch-form-step1"
import { BatchFormStep2 } from "@/components/manufacturer/generate/batch-form-step2"
import { GenerationProgress } from "@/components/manufacturer/generate/generation-progress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { useManufacturerMachines } from "@/hooks/use-manufacturer-machines"
import { useManufacturerProducts } from "@/hooks/use-manufacturer-products"
import { createClient } from "@/lib/supabase/client"
import { generateBatchSchema, type GenerateBatchValues } from "@/lib/validations/manufacturer-batch"

const STEPS = ["Batch Details", "Preview & Confirm"]

export default function GenerateCodesPage() {
  const router = useRouter()
  const [manufacturerId, setManufacturerId] = useState<string | null>(null)
  const [usage, setUsage] = useState({ monthlyUnitLimit: 0, unitsGeneratedThisMonth: 0 })
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id ?? null
      setManufacturerId(userId)
      if (!userId) return
      const { data: profile } = await supabase
        .from("manufacturer_profiles")
        .select("monthly_unit_limit, units_generated_this_month")
        .eq("id", userId)
        .maybeSingle()
      if (profile) {
        setUsage({ monthlyUnitLimit: profile.monthly_unit_limit, unitsGeneratedThisMonth: profile.units_generated_this_month })
      }
    })
  }, [])

  const { products, isLoading: productsLoading } = useManufacturerProducts(manufacturerId)
  const { machines, isLoading: machinesLoading } = useManufacturerMachines(manufacturerId)

  const form = useForm<GenerateBatchValues>({
    resolver: zodResolver(generateBatchSchema),
    defaultValues: {
      productId: "",
      batchNumber: "",
      productionDate: "",
      expiryDate: "",
      serialisationLevel: "unit",
      unitsPerCarton: "",
      cartonsPerPallet: "",
      quantity: 1000,
      machineId: "",
    },
  })

  useEffect(() => {
    if (machines.length > 0 && !form.getValues("machineId")) {
      const primary = machines.find((m) => m.is_primary) ?? machines[0]
      form.setValue("machineId", primary.id)
    }
  }, [machines, form])

  const values = useWatch({ control: form.control })
  const selectedProduct = products.find((p) => p.id === values.productId)
  const selectedMachine = machines.find((m) => m.id === values.machineId)

  const isLoading = productsLoading || machinesLoading

  if (!isLoading && products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products registered"
        description="Register a product on the Products & Batches page before generating codes."
      />
    )
  }

  if (!isLoading && machines.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No machines registered"
        description="Add a coding machine or label printer on the My Machines page before generating codes."
      />
    )
  }

  async function handleNext() {
    const fieldsToValidate: (keyof GenerateBatchValues)[] = [
      "productId",
      "batchNumber",
      "productionDate",
      "expiryDate",
      "serialisationLevel",
      "unitsPerCarton",
      "cartonsPerPallet",
      "quantity",
      "machineId",
    ]
    if (await form.trigger(fieldsToValidate)) setStep(2)
  }

  async function handleGenerate() {
    const values = form.getValues()
    setIsGenerating(true)
    try {
      const response = await fetch("/api/manufacturers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          unitsPerCarton: values.unitsPerCarton ? Number(values.unitsPerCarton) : undefined,
          cartonsPerPallet: values.cartonsPerPallet ? Number(values.cartonsPerPallet) : undefined,
          quantity: Number(values.quantity),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Generation failed")

      toast.success(`${data.generated.toLocaleString()} codes generated`)
      router.push(`/manufacturer/batches/${data.batchId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed")
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Generate Codes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new batch of serialised QR codes.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isGenerating ? (
        <Card>
          <CardContent>
            <GenerationProgress quantity={Number(values.quantity) || 0} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{STEPS[step - 1]}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {step === 1 && <BatchFormStep1 form={form} products={products} machines={machines} />}
            {step === 2 && (
              <BatchFormStep2
                values={values}
                product={selectedProduct}
                machine={selectedMachine}
                monthlyUnitLimit={usage.monthlyUnitLimit}
                unitsGeneratedThisMonth={usage.unitsGeneratedThisMonth}
              />
            )}

            <div className="flex justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={step === 1}
              >
                Back
              </Button>
              {step === 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="button" onClick={handleGenerate}>
                  Generate Codes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
