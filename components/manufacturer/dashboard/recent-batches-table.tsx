import { Package } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { RecentBatchRow } from "@/lib/manufacturers/get-dashboard-data"
import type { SerialisedProductStatus } from "@/types/database"

const STATUS_BADGE: Record<SerialisedProductStatus, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  generated: "bg-primary/10 text-primary border-transparent",
  distributed: "bg-success/10 text-success border-transparent",
  recalled: "bg-destructive/10 text-destructive border-transparent",
}

export function RecentBatchesTable({ batches }: { batches: RecentBatchRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Batches</CardTitle>
      </CardHeader>
      <CardContent>
        {batches.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No batches yet"
            description="Batches you create will appear here once you start generating serial codes."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch No.</TableHead>
                  <TableHead>Codes Generated</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead>Duplicates</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.productName}</TableCell>
                    <TableCell>{batch.batchNumber}</TableCell>
                    <TableCell>{batch.codesGenerated.toLocaleString()}</TableCell>
                    <TableCell>{batch.scans.toLocaleString()}</TableCell>
                    <TableCell className={batch.duplicates > 0 ? "text-destructive font-medium" : undefined}>
                      {batch.duplicates.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${STATUS_BADGE[batch.status]}`}>{batch.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
