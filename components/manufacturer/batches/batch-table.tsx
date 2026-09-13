import Link from "next/link"
import { Layers } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SERIALISATION_LEVEL_LABELS } from "@/lib/manufacturers/machine-types"
import { formatDate } from "@/lib/utils/date"
import type { ManufacturerBatchRow } from "@/hooks/use-manufacturer-batches"
import type { SerialisedProductStatus } from "@/types"

const STATUS_BADGE: Record<SerialisedProductStatus, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  generated: "bg-primary/10 text-primary border-transparent",
  distributed: "bg-success/10 text-success border-transparent",
  recalled: "bg-destructive/10 text-destructive border-transparent",
}

export function BatchTable({ batches }: { batches: ManufacturerBatchRow[] }) {
  if (batches.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No batches yet"
        description="Generate your first batch of serial codes to see it here."
        action={<Button render={<Link href="/manufacturer/generate" />}>Generate Codes</Button>}
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch No.</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Codes Generated</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scanned</TableHead>
            <TableHead>Duplicates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">
                <Link href={`/manufacturer/batches/${batch.id}`} className="text-primary hover:underline">
                  {batch.batchNumber}
                </Link>
              </TableCell>
              <TableCell>{batch.productName}</TableCell>
              <TableCell>{batch.codesGenerated.toLocaleString()}</TableCell>
              <TableCell>{SERIALISATION_LEVEL_LABELS[batch.serialisationLevel].split(" ")[0]}</TableCell>
              <TableCell>{formatDate(batch.createdAt)}</TableCell>
              <TableCell>
                <Badge className={`capitalize ${STATUS_BADGE[batch.status]}`}>{batch.status}</Badge>
              </TableCell>
              <TableCell>{batch.scans.toLocaleString()}</TableCell>
              <TableCell className={batch.duplicates > 0 ? "text-destructive font-medium" : undefined}>
                {batch.duplicates.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
