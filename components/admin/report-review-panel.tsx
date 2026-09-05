"use client"

import { useCallback, useEffect, useState } from "react"
import { Flag, Loader2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { downloadCsv } from "@/lib/utils/csv"
import { formatDate } from "@/lib/utils/date"
import type { ReportStatus } from "@/types/database"

interface AdminReportRow {
  id: string
  nafdac_number: string | null
  product_name: string
  brand_name: string | null
  purchase_location: string | null
  state: string | null
  lga: string | null
  suspicion_reason: string
  description: string | null
  status: ReportStatus
  created_at: string
  reporter: { full_name: string | null; email: string } | null
}

const STATUS_OPTIONS: ReportStatus[] = ["pending", "reviewed", "confirmed", "dismissed"]

const STATUS_BADGE: Record<ReportStatus, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  reviewed: "bg-warning/10 text-warning border-transparent",
  confirmed: "bg-destructive/10 text-destructive border-transparent",
  dismissed: "bg-success/10 text-success border-transparent",
}

export function ReportReviewPanel() {
  const [reports, setReports] = useState<AdminReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [viewingReport, setViewingReport] = useState<AdminReportRow | null>(null)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (statusFilter) params.set("status", statusFilter)

    try {
      const response = await fetch(`/api/admin/reports?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Failed to load reports")
      setReports(data.reports ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports")
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    // Fetch-on-mount/filter-change is what this effect synchronizes; the
    // setState inside fetchReports is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReports()
  }, [fetchReports])

  async function updateStatus(id: string, status: ReportStatus) {
    setPendingActionId(id)
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Update failed")
      if (data.warning) toast.warning(data.warning)
      else toast.success(`Report marked as ${status}`)
      setReports((current) => current.map((r) => (r.id === id ? { ...r, status } : r)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    } finally {
      setPendingActionId(null)
    }
  }

  function handleExport() {
    downloadCsv(
      `counterfeit-reports-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Reference No.", "Product Name", "NAFDAC No.", "Reporter", "Location", "Status", "Date"],
      reports.map((report) => [
        report.id.slice(0, 8),
        report.product_name,
        report.nafdac_number ?? "",
        report.reporter?.full_name ?? report.reporter?.email ?? "Anonymous",
        [report.lga, report.state].filter(Boolean).join(", "),
        report.status,
        formatDate(report.created_at),
      ])
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter && (
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter(null)}>
            Clear filter
          </Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto" onClick={handleExport} disabled={reports.length === 0}>
          Export CSV
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 && !error ? (
        <EmptyState icon={Flag} title="No reports found" description="Try adjusting your filters." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference No.</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-mono text-xs">{report.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{report.product_name}</TableCell>
                  <TableCell>{report.reporter?.full_name ?? report.reporter?.email ?? "Anonymous"}</TableCell>
                  <TableCell>{[report.lga, report.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>{formatDate(report.created_at)}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${STATUS_BADGE[report.status]}`}>{report.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewingReport(report)}>
                          View Full Report
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingActionId === report.id}
                          onClick={() => updateStatus(report.id, "reviewed")}
                        >
                          Mark as Reviewed
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingActionId === report.id}
                          onClick={() => updateStatus(report.id, "confirmed")}
                        >
                          Confirm Counterfeit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={pendingActionId === report.id}
                          onClick={() => updateStatus(report.id, "dismissed")}
                        >
                          Dismiss
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewingReport?.product_name}</DialogTitle>
            <DialogDescription>Reference {viewingReport?.id.slice(0, 8)}</DialogDescription>
          </DialogHeader>
          {viewingReport && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">NAFDAC No.</dt>
              <dd>{viewingReport.nafdac_number ?? "—"}</dd>
              <dt className="text-muted-foreground">Brand</dt>
              <dd>{viewingReport.brand_name ?? "—"}</dd>
              <dt className="text-muted-foreground">Purchased At</dt>
              <dd>{viewingReport.purchase_location ?? "—"}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd>{[viewingReport.lga, viewingReport.state].filter(Boolean).join(", ") || "—"}</dd>
              <dt className="text-muted-foreground">Reporter</dt>
              <dd>{viewingReport.reporter?.full_name ?? viewingReport.reporter?.email ?? "Anonymous"}</dd>
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="col-span-2">{viewingReport.suspicion_reason}</dd>
              {viewingReport.description && (
                <>
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="col-span-2">{viewingReport.description}</dd>
                </>
              )}
            </dl>
          )}
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </div>
  )
}
