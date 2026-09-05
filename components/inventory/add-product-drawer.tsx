"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm, useWatch } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import {
  buildInventorySchema,
  productSubtypeHints,
  productTypeOptions,
  unitOptions,
  type InventoryFormValues,
} from "@/lib/validations/inventory"
import type { InventoryItem } from "@/types"

interface AddProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  item?: InventoryItem | null
  onSubmit: (values: InventoryFormValues) => Promise<{ success: boolean }>
}

const emptyValues: InventoryFormValues = {
  productName: "",
  productType: "food",
  productSubtype: "",
  nafdacNumber: "",
  batchNumber: "",
  productionDate: "",
  expiryDate: "",
  quantity: 1,
  unit: "units",
  supplier: "",
  notes: "",
}

function itemToFormValues(item: InventoryItem): InventoryFormValues {
  return {
    productName: item.product_name,
    productType: item.product_type,
    productSubtype: item.product_subtype ?? "",
    nafdacNumber: item.nafdac_number ?? "",
    batchNumber: item.batch_number ?? "",
    productionDate: item.production_date ?? "",
    expiryDate: item.expiry_date,
    quantity: item.quantity,
    unit: item.unit as InventoryFormValues["unit"],
    supplier: item.supplier ?? "",
    notes: item.notes ?? "",
  }
}

export function AddProductDrawer({
  open,
  onOpenChange,
  mode,
  item,
  onSubmit,
}: AddProductDrawerProps) {
  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(buildInventorySchema(mode)),
    defaultValues: emptyValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(item ? itemToFormValues(item) : emptyValues)
    }
  }, [open, item, form])

  const productType = useWatch({ control: form.control, name: "productType" })

  async function handleSubmit(values: InventoryFormValues) {
    const result = await onSubmit(values)
    if (result.success) {
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "add" ? "Add Product" : "Edit Product"}</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5 px-4 pb-4"
        >
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.productName}>
              <FieldLabel htmlFor="productName">Product Name</FieldLabel>
              <Input id="productName" {...form.register("productName")} />
              <FieldError errors={[form.formState.errors.productName]} />
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
              <FieldLabel htmlFor="productSubtype">Product Subtype</FieldLabel>
              <Input
                id="productSubtype"
                placeholder={productSubtypeHints[productType] ?? ""}
                {...form.register("productSubtype")}
              />
            </Field>

            <Field data-invalid={!!form.formState.errors.nafdacNumber}>
              <FieldLabel htmlFor="nafdacNumber">NAFDAC Registration Number</FieldLabel>
              <Input
                id="nafdacNumber"
                placeholder="e.g. A1-1234 or 04-12345"
                {...form.register("nafdacNumber")}
              />
              <FieldError errors={[form.formState.errors.nafdacNumber]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="batchNumber">Batch Number</FieldLabel>
              <Input id="batchNumber" {...form.register("batchNumber")} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="productionDate">Production Date</FieldLabel>
                <Input id="productionDate" type="date" {...form.register("productionDate")} />
              </Field>

              <Field data-invalid={!!form.formState.errors.expiryDate}>
                <FieldLabel htmlFor="expiryDate">Expiry Date</FieldLabel>
                <Input id="expiryDate" type="date" {...form.register("expiryDate")} />
                <FieldError errors={[form.formState.errors.expiryDate]} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field data-invalid={!!form.formState.errors.quantity}>
                <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  {...form.register("quantity")}
                />
                <FieldError errors={[form.formState.errors.quantity]} />
              </Field>

              <Field>
                <FieldLabel htmlFor="unit">Unit</FieldLabel>
                <Controller
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="unit" className="w-full">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="supplier">Supplier</FieldLabel>
              <Input id="supplier" {...form.register("supplier")} />
            </Field>

            <Field>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" rows={3} {...form.register("notes")} />
            </Field>
          </FieldGroup>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting
                ? "Saving..."
                : mode === "add"
                  ? "Add Product"
                  : "Save Changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
