"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { MachineAnalysisResult } from "@/components/manufacturer/machines/machine-analysis-result"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import type { NewMachineInput } from "@/hooks/use-manufacturer-machines"
import { MACHINE_BRAND_QUICK_SELECT, SERIALISATION_LEVEL_LABELS, type MachineAnalysisResult as MachineAnalysisResultType } from "@/lib/manufacturers/machine-types"
import {
  machineConfirmSchema,
  machineDescriptionSchema,
  type MachineConfirmValues,
  type MachineDescriptionValues,
} from "@/lib/validations/manufacturer-machine"

interface AddMachineDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: NewMachineInput) => Promise<{ success: boolean }>
}

export function AddMachineDrawer({ open, onOpenChange, onSave }: AddMachineDrawerProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analysis, setAnalysis] = useState<MachineAnalysisResultType | null>(null)
  const [descriptionValues, setDescriptionValues] = useState<MachineDescriptionValues | null>(null)

  const descriptionForm = useForm<MachineDescriptionValues>({
    resolver: zodResolver(machineDescriptionSchema),
    defaultValues: { description: "", serialisationLevel: "unit", unitsPerHour: "" },
  })

  const confirmForm = useForm<MachineConfirmValues>({
    resolver: zodResolver(machineConfirmSchema),
    defaultValues: { machineName: "", notes: "" },
  })

  function reset() {
    setStep(1)
    setAnalysis(null)
    setDescriptionValues(null)
    descriptionForm.reset({ description: "", serialisationLevel: "unit", unitsPerHour: "" })
    confirmForm.reset({ machineName: "", notes: "" })
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  function appendBrand(brand: string) {
    const current = descriptionForm.getValues("description")
    descriptionForm.setValue("description", current ? `${current} ${brand}` : brand)
  }

  async function handleAnalyse(values: MachineDescriptionValues) {
    setIsAnalysing(true)
    try {
      const response = await fetch("/api/manufacturers/machines/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: values.description,
          serialisationLevel: values.serialisationLevel,
          unitsPerHour: values.unitsPerHour || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Analysis failed")

      setAnalysis(data.analysis)
      setDescriptionValues(values)
      confirmForm.setValue(
        "machineName",
        [data.analysis.detected_brand, data.analysis.detected_model].filter(Boolean).join(" ")
      )
      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setIsAnalysing(false)
    }
  }

  async function handleConfirm(values: MachineConfirmValues) {
    if (!analysis || !descriptionValues) return
    setIsSaving(true)
    const result = await onSave({
      machineName: values.machineName,
      serialisationLevel: descriptionValues.serialisationLevel,
      unitsPerHour: descriptionValues.unitsPerHour ? Number(descriptionValues.unitsPerHour) : undefined,
      notes: values.notes,
      analysis,
    })
    setIsSaving(false)
    if (result.success) handleOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add Machine</SheetTitle>
        </SheetHeader>

        {step === 1 && (
          <form
            onSubmit={descriptionForm.handleSubmit(handleAnalyse)}
            className="flex flex-col gap-5 px-4 pb-4"
          >
            <FieldGroup>
              <Field data-invalid={!!descriptionForm.formState.errors.description}>
                <FieldLabel htmlFor="description">
                  Describe your machine or enter the brand and model
                </FieldLabel>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder='e.g. "Videojet 1580 continuous inkjet printer" or "our inkjet printer on the production line"'
                  {...descriptionForm.register("description")}
                />
                <FieldError errors={[descriptionForm.formState.errors.description]} />
              </Field>

              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Common brands — click to add to description:</p>
                <div className="flex flex-wrap gap-2">
                  {MACHINE_BRAND_QUICK_SELECT.map((brand) => (
                    <Button
                      key={brand}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendBrand(brand)}
                    >
                      {brand}
                    </Button>
                  ))}
                </div>
              </div>

              <Field data-invalid={!!descriptionForm.formState.errors.serialisationLevel}>
                <FieldLabel htmlFor="serialisationLevel">Serialisation level for this machine</FieldLabel>
                <Controller
                  control={descriptionForm.control}
                  name="serialisationLevel"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="serialisationLevel" className="w-full">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(SERIALISATION_LEVEL_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError errors={[descriptionForm.formState.errors.serialisationLevel]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="unitsPerHour">Estimated units per hour (optional)</FieldLabel>
                <Input id="unitsPerHour" type="number" min={1} {...descriptionForm.register("unitsPerHour")} />
              </Field>
            </FieldGroup>

            <SheetFooter className="px-0">
              <Button type="submit" disabled={isAnalysing}>
                {isAnalysing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analysing...
                  </>
                ) : (
                  "Analyse Machine"
                )}
              </Button>
            </SheetFooter>
          </form>
        )}

        {step === 2 && analysis && (
          <form onSubmit={confirmForm.handleSubmit(handleConfirm)} className="flex flex-col gap-5 px-4 pb-4">
            <MachineAnalysisResult analysis={analysis} />

            <FieldGroup>
              <Field data-invalid={!!confirmForm.formState.errors.machineName}>
                <FieldLabel htmlFor="machineName">Machine Name</FieldLabel>
                <Input id="machineName" {...confirmForm.register("machineName")} />
                <FieldError errors={[confirmForm.formState.errors.machineName]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder='e.g. "Line 3, Building A"'
                  {...confirmForm.register("notes")}
                />
              </Field>
            </FieldGroup>

            <SheetFooter className="flex-row px-0">
              <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSaving}>
                Re-analyse
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Confirm & Save Machine"
                )}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
