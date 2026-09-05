"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { ReportConfirmation } from "@/components/reports/report-confirmation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import {
  counterfeitReportSchema,
  suspicionReasonOptions,
  type CounterfeitReportFormValues,
} from "@/lib/validations/counterfeit-report"
import { productTypeOptions } from "@/lib/validations/inventory"
import { nigerianStates } from "@/lib/utils/nigerian-states"

interface CounterfeitReportFormProps {
  initialNafdacNumber?: string
  initialProductName?: string
}

export function CounterfeitReportForm({
  initialNafdacNumber,
  initialProductName,
}: CounterfeitReportFormProps) {
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)

  const form = useForm<CounterfeitReportFormValues>({
    resolver: zodResolver(counterfeitReportSchema),
    defaultValues: {
      productName: initialProductName ?? "",
      nafdacNumber: initialNafdacNumber ?? "",
      productType: "other",
      brandName: "",
      purchaseLocation: "",
      state: "",
      lga: "",
      suspicionReason: undefined,
      description: "",
      confirmGoodFaith: undefined,
    },
  })

  const suspicionReason = useWatch({ control: form.control, name: "suspicionReason" })

  async function onSubmit(values: CounterfeitReportFormValues) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from("counterfeit_reports")
      .insert({
        reporter_id: user?.id ?? null,
        product_name: values.productName,
        nafdac_number: values.nafdacNumber || null,
        product_type: values.productType,
        brand_name: values.brandName || null,
        purchase_location: values.purchaseLocation,
        state: values.state,
        lga: values.lga || null,
        suspicion_reason: values.suspicionReason,
        description: values.description || null,
      })
      .select("id")
      .single()

    if (error || !data) {
      toast.error(error?.message ?? "Couldn't submit your report. Try again.")
      return
    }

    setReferenceNumber(data.id.slice(0, 8))
  }

  if (referenceNumber) {
    return (
      <ReportConfirmation
        referenceNumber={referenceNumber}
        onNewReport={() => {
          form.reset()
          setReferenceNumber(null)
        }}
      />
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.productName}>
          <FieldLabel htmlFor="productName">Product Name</FieldLabel>
          <Input id="productName" {...form.register("productName")} />
          <FieldError errors={[form.formState.errors.productName]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="nafdacNumber">NAFDAC Number</FieldLabel>
          <Input id="nafdacNumber" {...form.register("nafdacNumber")} />
        </Field>

        <Field data-invalid={!!form.formState.errors.productType}>
          <FieldLabel htmlFor="productType">Product Type</FieldLabel>
          <Controller
            control={form.control}
            name="productType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="productType" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {productTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[form.formState.errors.productType]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="brandName">Brand Name</FieldLabel>
          <Input id="brandName" {...form.register("brandName")} />
        </Field>

        <Field data-invalid={!!form.formState.errors.purchaseLocation}>
          <FieldLabel htmlFor="purchaseLocation">Where did you purchase this product?</FieldLabel>
          <Input
            id="purchaseLocation"
            placeholder="e.g. Shop name, market, or online platform"
            {...form.register("purchaseLocation")}
          />
          <FieldError errors={[form.formState.errors.purchaseLocation]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.state}>
            <FieldLabel htmlFor="state">State</FieldLabel>
            <Controller
              control={form.control}
              name="state"
              render={({ field }) => (
                <Select value={field.value || null} onValueChange={field.onChange}>
                  <SelectTrigger id="state" className="w-full">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[form.formState.errors.state]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="lga">LGA</FieldLabel>
            <Input id="lga" {...form.register("lga")} />
          </Field>
        </div>

        <Field data-invalid={!!form.formState.errors.suspicionReason}>
          <FieldLabel htmlFor="suspicionReason">
            Why do you suspect this is counterfeit?
          </FieldLabel>
          <Controller
            control={form.control}
            name="suspicionReason"
            render={({ field }) => (
              <Select value={field.value ?? null} onValueChange={field.onChange}>
                <SelectTrigger id="suspicionReason" className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {suspicionReasonOptions.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[form.formState.errors.suspicionReason]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="description">
            Additional description
            {suspicionReason === "Other (specify)" && " (please specify)"}
          </FieldLabel>
          <Textarea id="description" rows={3} {...form.register("description")} />
        </Field>

        <Field data-invalid={!!form.formState.errors.confirmGoodFaith}>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <Controller
              control={form.control}
              name="confirmGoodFaith"
              render={({ field }) => (
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  className="mt-0.5"
                />
              )}
            />
            I confirm this report is made in good faith.
          </label>
          <FieldError errors={[form.formState.errors.confirmGoodFaith]} />
        </Field>
      </FieldGroup>

      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {form.formState.isSubmitting ? "Submitting..." : "Submit Report"}
      </Button>
    </form>
  )
}
