"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Package, Pencil, ShieldCheck, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { ExpiryBadge } from "@/components/inventory/expiry-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { productTypeOptions } from "@/lib/validations/inventory"
import { daysUntil, formatDate } from "@/lib/utils/date"
import type { InventoryItem } from "@/types"

type SortColumn = "product_name" | "expiry_date" | "days_left"
type SortDirection = "asc" | "desc"

interface InventoryTableProps {
  items: InventoryItem[]
  onEdit: (item: InventoryItem) => void
  onVerify: (item: InventoryItem) => void
  onDelete: (id: string) => Promise<unknown> | void
}

const PAGE_SIZE = 25

const productTypeLabels = Object.fromEntries(
  productTypeOptions.map((option) => [option.value, option.label])
)

function SortButton({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string
  column: SortColumn
  activeColumn: SortColumn
  direction: SortDirection
  onSort: (column: SortColumn) => void
}) {
  const isActive = column === activeColumn
  const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
    >
      {label}
      <Icon className="size-3" />
    </button>
  )
}

export function InventoryTable({ items, onEdit, onVerify, onDelete }: InventoryTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("expiry_date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [page, setPage] = useState(1)
  const [pendingDelete, setPendingDelete] = useState<InventoryItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleSort(column: SortColumn) {
    if (column === sortColumn) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
    setPage(1)
  }

  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      let comparison = 0
      if (sortColumn === "product_name") {
        comparison = a.product_name.localeCompare(b.product_name)
      } else if (sortColumn === "expiry_date") {
        comparison = a.expiry_date.localeCompare(b.expiry_date)
      } else {
        comparison = daysUntil(a.expiry_date) - daysUntil(b.expiry_date)
      }
      return sortDirection === "asc" ? comparison : -comparison
    })
    return sorted
  }, [items, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageItems = sortedItems.slice(pageStart, pageStart + PAGE_SIZE)

  async function confirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    await onDelete(pendingDelete.id)
    setIsDeleting(false)
    setPendingDelete(null)
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No products in inventory"
        description="Add your first product to start tracking expiry dates and NAFDAC verification."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton
                  label="Product Name"
                  column="product_name"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>NAFDAC No.</TableHead>
              <TableHead>Batch No.</TableHead>
              <TableHead>
                <SortButton
                  label="Expiry Date"
                  column="expiry_date"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>
                <SortButton
                  label="Days Left"
                  column="days_left"
                  activeColumn={sortColumn}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((item) => {
              const days = daysUntil(item.expiry_date)
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">
                    {item.product_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {productTypeLabels[item.product_type] ?? item.product_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.nafdac_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.batch_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(item.expiry_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                  </TableCell>
                  <TableCell>
                    <ExpiryBadge expiryDate={item.expiry_date} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit product"
                        onClick={() => onEdit(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Verify NAFDAC number"
                        disabled={!item.nafdac_number}
                        onClick={() => onVerify(item)}
                      >
                        <ShieldCheck className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete product"
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Showing {sortedItems.length === 0 ? 0 : pageStart + 1}–
          {Math.min(pageStart + PAGE_SIZE, sortedItems.length)} of {sortedItems.length} products
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>
              This will permanently remove &quot;{pendingDelete?.product_name}&quot; from your
              inventory. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? "Deleting..." : "Delete Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
