"use client"

import { Controller, useWatch, type UseFormReturn } from "react-hook-form"

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
import { nigerianStates } from "@/lib/utils/nigerian-states"
import {
  productCategoryOptions,
  productionVolumeOptions,
  type ManufacturerRegistrationValues,
} from "@/lib/validations/manufacturer-registration"

interface StepCompanyProps {
  form: UseFormReturn<ManufacturerRegistrationValues>
  // True when Step 1 (Account) was skipped because the caller is already
  // authenticated (the OAuth role picker) - phone is otherwise collected
  // there, so this is the only place left to ask for it.
  showPhoneField?: boolean
}

export function StepCompany({ form, showPhoneField = false }: StepCompanyProps) {
  const { errors } = form.formState
  const selectedCategories = useWatch({ control: form.control, name: "productCategories" }) ?? []

  function toggleCategory(category: (typeof productCategoryOptions)[number], checked: boolean) {
    const current = form.getValues("productCategories") ?? []
    const next = checked ? [...current, category] : current.filter((c) => c !== category)
    form.setValue("productCategories", next, { shouldValidate: true })
  }

  return (
    <FieldGroup>
      {showPhoneField && (
        <Field data-invalid={!!errors.phone}>
          <FieldLabel htmlFor="phone">Phone number</FieldLabel>
          <Input id="phone" type="tel" placeholder="080..." autoComplete="tel" {...form.register("phone")} />
          <FieldError errors={[errors.phone]} />
        </Field>
      )}

      <Field data-invalid={!!errors.companyName}>
        <FieldLabel htmlFor="companyName">Business / Company name</FieldLabel>
        <Input id="companyName" {...form.register("companyName")} />
        <FieldError errors={[errors.companyName]} />
      </Field>

      <Field data-invalid={!!errors.cacNumber}>
        <FieldLabel htmlFor="cacNumber">CAC Registration Number</FieldLabel>
        <Input id="cacNumber" placeholder="RC-XXXXXX or BN-XXXXXX" {...form.register("cacNumber")} />
        <FieldError errors={[errors.cacNumber]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="nafdacManufacturerCode">NAFDAC Manufacturer Code (optional)</FieldLabel>
        <Input id="nafdacManufacturerCode" {...form.register("nafdacManufacturerCode")} />
      </Field>

      <Field data-invalid={!!errors.productCategories}>
        <FieldLabel>Product categories manufactured</FieldLabel>
        <div className="flex flex-col gap-2">
          {productCategoryOptions.map((category) => (
            <label key={category} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={selectedCategories.includes(category)}
                onCheckedChange={(checked) => toggleCategory(category, checked === true)}
              />
              {category}
            </label>
          ))}
        </div>
        <FieldError errors={[errors.productCategories]} />
      </Field>

      {selectedCategories.includes("Other") && (
        <Field>
          <FieldLabel htmlFor="otherCategoryDetail">Specify other category</FieldLabel>
          <Input id="otherCategoryDetail" {...form.register("otherCategoryDetail")} />
        </Field>
      )}

      <Field data-invalid={!!errors.productionVolume}>
        <FieldLabel htmlFor="productionVolume">Monthly production volume</FieldLabel>
        <Controller
          control={form.control}
          name="productionVolume"
          render={({ field }) => (
            <Select value={field.value ?? null} onValueChange={field.onChange}>
              <SelectTrigger id="productionVolume" className="w-full">
                <SelectValue placeholder="Select a range" />
              </SelectTrigger>
              <SelectContent>
                {productionVolumeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[errors.productionVolume]} />
      </Field>

      <Field data-invalid={!!errors.state}>
        <FieldLabel htmlFor="state">State of operation</FieldLabel>
        <Controller
          control={form.control}
          name="state"
          render={({ field }) => (
            <Select value={field.value ?? null} onValueChange={field.onChange}>
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
        <FieldError errors={[errors.state]} />
      </Field>

      <Field data-invalid={!!errors.address}>
        <FieldLabel htmlFor="address">Factory / office address</FieldLabel>
        <Input id="address" {...form.register("address")} />
        <FieldError errors={[errors.address]} />
      </Field>

      <Field>
        <FieldLabel htmlFor="website">Company website (optional)</FieldLabel>
        <Input id="website" placeholder="https://" {...form.register("website")} />
      </Field>
    </FieldGroup>
  )
}
