"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  manufacturerProductSchema,
  type ManufacturerProductValues,
} from "@/lib/validations/manufacturer-product"

interface AddProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: ManufacturerProductValues) => Promise<{ success: boolean }>
}

const emptyValues: ManufacturerProductValues = {
  productName: "",
  nafdacNumber: "",
  productCategory: "",
  description: "",
  standardBatchSize: "",
  storageConditions: "",
}

export function AddProductDrawer({ open, onOpenChange, onSubmit }: AddProductDrawerProps) {
  const form = useForm<ManufacturerProductValues>({
    resolver: zodResolver(manufacturerProductSchema),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) form.reset(emptyValues)
  }, [open, form])

  async function handleSubmit(values: ManufacturerProductValues) {
    const result = await onSubmit(values)
    if (result.success) onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add Product</SheetTitle>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-5 px-4 pb-4">
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.productName}>
              <FieldLabel htmlFor="productName">Product Name</FieldLabel>
              <Input id="productName" {...form.register("productName")} />
              <FieldError errors={[form.formState.errors.productName]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.nafdacNumber}>
              <FieldLabel htmlFor="nafdacNumber">NAFDAC Registration Number</FieldLabel>
              <Input id="nafdacNumber" placeholder="e.g. A1-1234 or 04-12345" {...form.register("nafdacNumber")} />
              <FieldError errors={[form.formState.errors.nafdacNumber]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="productCategory">Product Category</FieldLabel>
              <Input id="productCategory" {...form.register("productCategory")} />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea id="description" rows={2} {...form.register("description")} />
            </Field>

            <Field data-invalid={!!form.formState.errors.standardBatchSize}>
              <FieldLabel htmlFor="standardBatchSize">Standard Batch Size (units)</FieldLabel>
              <Input id="standardBatchSize" type="number" min={1} {...form.register("standardBatchSize")} />
              <FieldError errors={[form.formState.errors.standardBatchSize]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="storageConditions">Storage Conditions</FieldLabel>
              <Textarea
                id="storageConditions"
                rows={2}
                placeholder="e.g. Store below 30°C, away from sunlight"
                {...form.register("storageConditions")}
              />
            </Field>
          </FieldGroup>

          <SheetFooter className="px-0">
            <Button type="submit">Add Product</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
