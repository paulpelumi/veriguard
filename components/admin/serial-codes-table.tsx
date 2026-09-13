import { QrCode } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminBatchRow } from "@/lib/admin/get-serial-codes-data"
import { formatDate } from "@/lib/utils/date"
import type { SerialisedProductStatus } from "@/types/database"

const STATUS_BADGE: Record<SerialisedProductStatus, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  generated: "bg-primary/10 text-primary border-transparent",
  distributed: "bg-success/10 text-success border-transparent",
  recalled: "bg-destructive/10 text-destructive border-transparent",
}

export function SerialCodesTable({ batches }: { batches: AdminBatchRow[] }) {
  if (batches.length === 0) {
    return <EmptyState icon={QrCode} title="No batches generated yet" />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Manufacturer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Batch No.</TableHead>
            <TableHead>Codes Generated</TableHead>
            <TableHead>Scans</TableHead>
            <TableHead>Duplicates</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">{batch.manufacturerName}</TableCell>
              <TableCell>{batch.productName}</TableCell>
              <TableCell>{batch.batchNumber}</TableCell>
              <TableCell>{batch.codesGenerated.toLocaleString()}</TableCell>
              <TableCell>{batch.scans.toLocaleString()}</TableCell>
              <TableCell className={batch.duplicates > 0 ? "text-destructive font-medium" : undefined}>
                {batch.duplicates.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge className={`capitalize ${STATUS_BADGE[batch.status]}`}>{batch.status}</Badge>
              </TableCell>
              <TableCell>{formatDate(batch.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
