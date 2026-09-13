"use client"

import { useState } from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  EXPORT_FORMAT_LABELS,
  EXPORT_FORMATS,
  type ExportFormat,
} from "@/lib/manufacturers/machine-types"
import { FORMATS_WITH_QR_TOGGLE, IMPLEMENTED_EXPORT_FORMATS } from "@/lib/manufacturers/export-engine"
import { formatDate } from "@/lib/utils/date"

interface ExportOptionsProps {
  batchId: string
  recommendedFormat: ExportFormat | null
  lastExportedAt: string | null
  exportCount: number
}

export function ExportOptions({ batchId, recommendedFormat, lastExportedAt, exportCount }: ExportOptionsProps) {
  const [includeQr, setIncludeQr] = useState(true)

  function exportUrl(format: ExportFormat) {
    const params = new URLSearchParams({ format })
    if (FORMATS_WITH_QR_TOGGLE.includes(format)) params.set("includeQr", String(includeQr))
    return `/api/manufacturers/batches/${batchId}/export?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">
        <Checkbox
          className="mt-0.5"
          checked={includeQr}
          onCheckedChange={(checked) => setIncludeQr(checked === true)}
        />
        <span>
          <span className="font-medium">Include QR code data</span>
          <span className="block text-muted-foreground">
            Only matters if your machine&apos;s software can render a 2D barcode from a data field.
          </span>
        </span>
      </label>

      {recommendedFormat && IMPLEMENTED_EXPORT_FORMATS.includes(recommendedFormat) && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">⭐ Recommended for your machine</p>
          <Button nativeButton={false} render={<a href={exportUrl(recommendedFormat)} />} className="w-fit">
            <Download className="size-4" />
            Download {EXPORT_FORMAT_LABELS[recommendedFormat]}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">All formats</p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_FORMATS.map((format) => {
            const isImplemented = IMPLEMENTED_EXPORT_FORMATS.includes(format)
            return (
              <Button
                key={format}
                variant="outline"
                size="sm"
                nativeButton={!isImplemented}
                disabled={!isImplemented}
                render={isImplemented ? <a href={exportUrl(format)} /> : undefined}
                title={isImplemented ? undefined : "Coming soon"}
              >
                {EXPORT_FORMAT_LABELS[format]}
              </Button>
            )
          })}
        </div>
      </div>

      {lastExportedAt && (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          Last exported {formatDate(lastExportedAt)} · {exportCount} time{exportCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  )
}
