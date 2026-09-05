"use client"

import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { productTypeOptions } from "@/lib/validations/inventory"

export type ExpiryStatusFilter =
  | "all"
  | "expired"
  | "critical"
  | "warning"
  | "expiring_soon"
  | "good"

export interface InventoryFilterState {
  search: string
  productType: string
  expiryStatus: ExpiryStatusFilter
}

interface InventoryFiltersProps {
  filters: InventoryFilterState
  onChange: (filters: InventoryFilterState) => void
}

const expiryStatusOptions: { value: ExpiryStatusFilter; label: string }[] = [
  { value: "all", label: "All Expiry Statuses" },
  { value: "expired", label: "Expired" },
  { value: "critical", label: "Critical (≤30d)" },
  { value: "warning", label: "Warning (31–60d)" },
  { value: "expiring_soon", label: "Expiring Soon (61–90d)" },
  { value: "good", label: "Good (90d+)" },
]

export function InventoryFilters({ filters, onChange }: InventoryFiltersProps) {
  const hasActiveFilters =
    filters.search !== "" || filters.productType !== "all" || filters.expiryStatus !== "all"

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search product name, NAFDAC number, batch number..."
          className="pl-9"
        />
      </div>

      <Select
        value={filters.productType}
        onValueChange={(value) => onChange({ ...filters, productType: value as string })}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Product Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {productTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.expiryStatus}
        onValueChange={(value) =>
          onChange({ ...filters, expiryStatus: value as ExpiryStatusFilter })
        }
      >
        <SelectTrigger className="w-full sm:w-52">
          <SelectValue placeholder="Expiry Status" />
        </SelectTrigger>
        <SelectContent>
          {expiryStatusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onChange({ search: "", productType: "all", expiryStatus: "all" })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
          Clear filters
        </button>
      )}
    </div>
  )
}
