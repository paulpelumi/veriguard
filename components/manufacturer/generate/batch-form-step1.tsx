import { Controller, type UseFormReturn } from "react-hook-form"

import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SERIALISATION_LEVEL_LABELS } from "@/lib/manufacturers/machine-types"
import type { GenerateBatchValues } from "@/lib/validations/manufacturer-batch"
import type { ManufacturerMachine, ManufacturerProduct } from "@/types"

interface BatchFormStep1Props {
  form: UseFormReturn<GenerateBatchValues>
  products: ManufacturerProduct[]
  machines: ManufacturerMachine[]
}

export function BatchFormStep1({ form, products, machines }: BatchFormStep1Props) {
  const serialisationLevel = form.watch("serialisationLevel")

  return (
    <FieldGroup>
      <Field data-invalid={!!form.formState.errors.productId}>
        <FieldLabel htmlFor="productId">Product</FieldLabel>
        <Controller
          control={form.control}
          name="productId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="productId" className="w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.product_name} ({product.nafdac_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[form.formState.errors.productId]} />
      </Field>

      <Field data-invalid={!!form.formState.errors.batchNumber}>
        <FieldLabel htmlFor="batchNumber">Batch Number</FieldLabel>
        <Input id="batchNumber" {...form.register("batchNumber")} />
        <FieldError errors={[form.formState.errors.batchNumber]} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field data-invalid={!!form.formState.errors.productionDate}>
          <FieldLabel htmlFor="productionDate">Production Date</FieldLabel>
          <Input id="productionDate" type="date" {...form.register("productionDate")} />
          <FieldError errors={[form.formState.errors.productionDate]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.expiryDate}>
          <FieldLabel htmlFor="expiryDate">Expiry Date</FieldLabel>
          <Input id="expiryDate" type="date" {...form.register("expiryDate")} />
          <FieldError errors={[form.formState.errors.expiryDate]} />
        </Field>
      </div>

      <Field data-invalid={!!form.formState.errors.serialisationLevel}>
        <FieldLabel htmlFor="serialisationLevel">Serialisation Level</FieldLabel>
        <Controller
          control={form.control}
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
        <FieldError errors={[form.formState.errors.serialisationLevel]} />
      </Field>

      {serialisationLevel === "carton" && (
        <Field data-invalid={!!form.formState.errors.unitsPerCarton}>
          <FieldLabel htmlFor="unitsPerCarton">Units per Carton</FieldLabel>
          <Input id="unitsPerCarton" type="number" min={1} {...form.register("unitsPerCarton")} />
          <FieldError errors={[form.formState.errors.unitsPerCarton]} />
        </Field>
      )}

      {serialisationLevel === "pallet" && (
        <Field data-invalid={!!form.formState.errors.cartonsPerPallet}>
          <FieldLabel htmlFor="cartonsPerPallet">Cartons per Pallet</FieldLabel>
          <Input id="cartonsPerPallet" type="number" min={1} {...form.register("cartonsPerPallet")} />
          <FieldError errors={[form.formState.errors.cartonsPerPallet]} />
        </Field>
      )}

      <Field data-invalid={!!form.formState.errors.quantity}>
        <FieldLabel htmlFor="quantity">Number of Codes to Generate</FieldLabel>
        <Input id="quantity" type="number" min={1} {...form.register("quantity")} />
        <FieldError errors={[form.formState.errors.quantity]} />
      </Field>

      <Field data-invalid={!!form.formState.errors.machineId}>
        <FieldLabel htmlFor="machineId">Machine</FieldLabel>
        <Controller
          control={form.control}
          name="machineId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="machineId" className="w-full">
                <SelectValue placeholder="Select machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.machine_name}
                    {machine.is_primary ? " (Primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError errors={[form.formState.errors.machineId]} />
      </Field>
    </FieldGroup>
  )
}
