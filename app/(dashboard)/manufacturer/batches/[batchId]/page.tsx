import { notFound } from "next/navigation"
import { Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EXPORT_FORMAT_LABELS, EXPORT_FORMATS, type ExportFormat } from "@/lib/manufacturers/machine-types"
import { IMPLEMENTED_EXPORT_FORMATS } from "@/lib/manufacturers/export-engine"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/utils/date"

export default async function BatchDetailPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: batch } = await supabase
    .from("serialised_products")
    .select("*")
    .eq("id", batchId)
    .eq("manufacturer_id", user!.id)
    .maybeSingle()

  if (!batch) notFound()

  const recommendedFormat = batch.export_format as ExportFormat | null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{batch.batch_number}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{batch.product_name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <dt className="text-muted-foreground">NAFDAC No.</dt>
            <dd className="text-foreground">{batch.nafdac_number}</dd>
            <dt className="text-muted-foreground">Codes Generated</dt>
            <dd className="text-foreground">{batch.codes_generated.toLocaleString()}</dd>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge className="border-transparent bg-primary/10 text-primary capitalize">{batch.status}</Badge>
            </dd>
            <dt className="text-muted-foreground">Production Date</dt>
            <dd className="text-foreground">{formatDate(batch.production_date)}</dd>
            <dt className="text-muted-foreground">Expiry Date</dt>
            <dd className="text-foreground">{formatDate(batch.expiry_date)}</dd>
            <dt className="text-muted-foreground">Serialisation</dt>
            <dd className="text-foreground capitalize">{batch.serialisation_level}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Serial Codes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {recommendedFormat && IMPLEMENTED_EXPORT_FORMATS.includes(recommendedFormat) && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">⭐ Recommended for your machine</p>
              <Button
                nativeButton={false}
                render={<a href={`/api/manufacturers/batches/${batch.id}/export?format=${recommendedFormat}`} />}
              >
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
                    render={isImplemented ? <a href={`/api/manufacturers/batches/${batch.id}/export?format=${format}`} /> : undefined}
                    title={isImplemented ? undefined : "Coming soon"}
                  >
                    {EXPORT_FORMAT_LABELS[format]}
                  </Button>
                )
              })}
            </div>
          </div>

          {batch.last_exported_at && (
            <p className="text-sm text-muted-foreground">
              Last exported {formatDate(batch.last_exported_at)} · {batch.export_count} time
              {batch.export_count === 1 ? "" : "s"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
