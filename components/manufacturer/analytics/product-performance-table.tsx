import { PackageSearch } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ProductPerformanceRow } from "@/lib/manufacturers/get-analytics-data"

export function ProductPerformanceTable({ rows }: { rows: ProductPerformanceRow[] }) {
  if (rows.length === 0) {
    return <EmptyState icon={PackageSearch} title="No scan activity yet" />
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product Name</TableHead>
            <TableHead>Total Scans</TableHead>
            <TableHead>Authentic</TableHead>
            <TableHead>Duplicates</TableHead>
            <TableHead>Duplicate Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.productName}>
              <TableCell className="font-medium">{row.productName}</TableCell>
              <TableCell>{row.totalScans.toLocaleString()}</TableCell>
              <TableCell>{row.authenticScans.toLocaleString()}</TableCell>
              <TableCell className={row.duplicateScans > 0 ? "text-destructive font-medium" : undefined}>
                {row.duplicateScans.toLocaleString()}
              </TableCell>
              <TableCell>{row.duplicateRate}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
