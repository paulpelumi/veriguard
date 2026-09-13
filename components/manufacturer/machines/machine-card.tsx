import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  EXPORT_FORMAT_LABELS,
  MACHINE_CATEGORY_LABELS,
  SERIALISATION_LEVEL_LABELS,
  type ExportFormat,
} from "@/lib/manufacturers/machine-types"
import type { ManufacturerMachine } from "@/types"

export function MachineCard({
  machine,
  onDelete,
}: {
  machine: ManufacturerMachine
  onDelete: (id: string) => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{machine.machine_name}</p>
              {machine.is_primary && <Badge className="border-transparent bg-primary/10 text-primary">Primary</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {machine.machine_brand}
              {machine.machine_model ? ` · ${machine.machine_model}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove machine"
            onClick={() => onDelete(machine.id)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Category</dt>
          <dd className="text-foreground">{MACHINE_CATEGORY_LABELS[machine.machine_category]}</dd>
          <dt className="text-muted-foreground">Serialisation</dt>
          <dd className="text-foreground">{SERIALISATION_LEVEL_LABELS[machine.serialisation_level]}</dd>
          <dt className="text-muted-foreground">Export Format</dt>
          <dd className="text-foreground">
            {machine.ai_recommended_format
              ? EXPORT_FORMAT_LABELS[machine.ai_recommended_format as ExportFormat]
              : "—"}
          </dd>
        </dl>
      </CardContent>
    </Card>
  )
}
