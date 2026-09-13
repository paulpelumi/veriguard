import Link from "next/link"
import { Layers } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { BatchPerformanceRow } from "@/lib/manufacturers/get-analytics-data"

export function BatchPerformanceTable({ rows }: { rows: BatchPerformanceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={Layers} title="No batches yet" />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch No.</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Codes Generated</TableHead>
            <TableHead>Scanned</TableHead>
            <TableHead>Duplicates</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">
                <Link href={`/manufacturer/batches/${row.id}`} className="text-primary hover:underline">
                  {row.batchNumber}
                </Link>
              </TableCell>
              <TableCell>{row.productName}</TableCell>
              <TableCell>{row.codesGenerated.toLocaleString()}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", row.scanPercent >= 100 ? "bg-success" : "bg-primary")}
                      style={{ width: `${Math.min(100, row.scanPercent)}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {row.scanned.toLocaleString()} ({row.scanPercent}%)
                  </span>
                </div>
              </TableCell>
              <TableCell className={row.duplicates > 0 ? "text-destructive font-medium" : undefined}>
                {row.duplicates.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
