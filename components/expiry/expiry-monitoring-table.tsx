"use client"

import { CalendarClock, Pencil, ShieldCheck } from "lucide-react"

import { ExpiryBadge } from "@/components/inventory/expiry-badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { productTypeOptions } from "@/lib/validations/inventory"
import { daysUntil, formatDate } from "@/lib/utils/date"
import type { ExpiryTab } from "@/hooks/use-expiry-monitoring"
import type { InventoryItem } from "@/types"

interface ExpiryMonitoringTableProps {
  items: InventoryItem[]
  activeTab: ExpiryTab
  onTabChange: (tab: ExpiryTab) => void
  counts: { critical: number; warning: number; expiringSoon: number; expired: number }
  totalMonitored: number
  onEdit: (item: InventoryItem) => void
  onVerify: (item: InventoryItem) => void
}

const productTypeLabels = Object.fromEntries(
  productTypeOptions.map((option) => [option.value, option.label])
)

const tabs: { value: ExpiryTab; label: (counts: ExpiryMonitoringTableProps["counts"], total: number) => string }[] = [
  { value: "all", label: (_counts, total) => `All (${total})` },
  { value: "critical", label: (counts) => `Critical (${counts.critical})` },
  { value: "warning", label: (counts) => `Warning (${counts.warning})` },
  { value: "expiring_soon", label: (counts) => `Expiring Soon (${counts.expiringSoon})` },
  { value: "expired", label: (counts) => `Expired (${counts.expired})` },
]

export function ExpiryMonitoringTable({
  items,
  activeTab,
  onTabChange,
  counts,
  totalMonitored,
  onEdit,
  onVerify,
}: ExpiryMonitoringTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as ExpiryTab)}>
        <TabsList className="w-full sm:w-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label(counts, totalMonitored)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing here"
          description="No products match this filter right now."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Batch No.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
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
                      {formatDate(item.expiry_date)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.batch_number ?? "—"}
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
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
