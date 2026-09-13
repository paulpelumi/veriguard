import { AlertTriangle } from "lucide-react"

import { UsageBar } from "@/components/manufacturer/dashboard/usage-bar"
import { Card, CardContent } from "@/components/ui/card"
import { EXPORT_FORMAT_LABELS, SERIALISATION_LEVEL_LABELS, type ExportFormat } from "@/lib/manufacturers/machine-types"
import { formatDate } from "@/lib/utils/date"
import type { GenerateBatchValues } from "@/lib/validations/manufacturer-batch"
import type { ManufacturerMachine, ManufacturerProduct } from "@/types"

interface BatchFormStep2Props {
  values: Partial<GenerateBatchValues>
  product: ManufacturerProduct | undefined
  machine: ManufacturerMachine | undefined
  monthlyUnitLimit: number
  unitsGeneratedThisMonth: number
}

export function BatchFormStep2({ values, product, machine, monthlyUnitLimit, unitsGeneratedThisMonth }: BatchFormStep2Props) {
  const quantity = Number(values.quantity) || 0
  const usageAfter = unitsGeneratedThisMonth + quantity
  const wouldExceedLimit = usageAfter > monthlyUnitLimit

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-2 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <dt className="text-muted-foreground">Product</dt>
            <dd className="font-medium text-foreground">{product?.product_name ?? "—"}</dd>
            <dt className="text-muted-foreground">NAFDAC No.</dt>
            <dd className="text-foreground">{product?.nafdac_number ?? "—"}</dd>
            <dt className="text-muted-foreground">Batch Number</dt>
            <dd className="text-foreground">{values.batchNumber}</dd>
            <dt className="text-muted-foreground">Production</dt>
            <dd className="text-foreground">{values.productionDate ? formatDate(values.productionDate) : "—"}</dd>
            <dt className="text-muted-foreground">Expiry</dt>
            <dd className="text-foreground">{values.expiryDate ? formatDate(values.expiryDate) : "—"}</dd>
            <dt className="text-muted-foreground">Serialisation</dt>
            <dd className="text-foreground">
              {values.serialisationLevel ? SERIALISATION_LEVEL_LABELS[values.serialisationLevel] : "—"}
            </dd>
            <dt className="text-muted-foreground">Codes to Generate</dt>
            <dd className="font-medium text-foreground">{quantity.toLocaleString()}</dd>
            <dt className="text-muted-foreground">Machine</dt>
            <dd className="text-foreground">{machine?.machine_name ?? "—"}</dd>
            <dt className="text-muted-foreground">Export Format</dt>
            <dd className="text-foreground">
              {machine?.ai_recommended_format
                ? EXPORT_FORMAT_LABELS[machine.ai_recommended_format as ExportFormat]
                : "—"}
            </dd>
          </dl>
        </CardContent>
      </Card>

      <UsageBar used={usageAfter} limit={monthlyUnitLimit} />

      {wouldExceedLimit && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          This would exceed your monthly code generation limit.
        </div>
      )}
    </div>
  )
}
