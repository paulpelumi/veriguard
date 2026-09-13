"use client"

import { useMemo, useState } from "react"
import { ShieldAlert } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminDuplicateAlert } from "@/lib/admin/get-duplicate-alerts-data"
import { formatDate } from "@/lib/utils/date"
import type { ReportStatus } from "@/types/database"

type SeverityFilter = "all" | "single" | "3plus" | "10plus"

const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: "all", label: "All severities" },
  { value: "single", label: "Single duplicate" },
  { value: "3plus", label: "3+ duplicates (flagged)" },
  { value: "10plus", label: "10+ duplicates" },
]

const STATUS_BADGE: Record<ReportStatus, string> = {
  pending: "bg-warning/10 text-warning border-transparent",
  reviewed: "bg-muted text-muted-foreground border-transparent",
  confirmed: "bg-destructive/10 text-destructive border-transparent",
  dismissed: "bg-muted text-muted-foreground border-transparent",
}

function matchesSeverity(alert: AdminDuplicateAlert, filter: SeverityFilter): boolean {
  if (filter === "all") return true
  if (filter === "single") return alert.duplicateScanCount <= 2
  if (filter === "3plus") return alert.duplicateScanCount >= 3
  return alert.duplicateScanCount >= 10
}

// "Escalate" reuses the existing /api/admin/reports PATCH endpoint
// (components/admin/report-review-panel.tsx's own pattern) rather than a
// new one - a duplicate alert IS a counterfeit_reports row (Module 5 auto-
// generates it), so escalating it is exactly "mark as confirmed" in that
// same, already-built workflow. No PDF/formatted-report generation here,
// consistent with this phase's other PDF deferrals (Module 4 exports,
// Module 5's duplicate map).
export function DuplicateAlertPanel({ initialAlerts }: { initialAlerts: AdminDuplicateAlert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = useMemo(
    () => alerts.filter((alert) => matchesSeverity(alert, severityFilter)),
    [alerts, severityFilter]
  )

  async function escalate(reportId: string) {
    setPendingId(reportId)
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId, status: "confirmed" }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error?.message ?? "Escalation failed")

      setAlerts((current) => current.map((a) => (a.reportId === reportId ? { ...a, status: "confirmed" } : a)))
      toast.success("Escalated - marked as confirmed counterfeit")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Escalation failed")
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SEVERITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No duplicate alerts at this severity" />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serial Code</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Duplicate Scans</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((alert) => (
                <TableRow key={alert.reportId}>
                  <TableCell className="font-mono text-sm">{alert.serialCode}</TableCell>
                  <TableCell>{alert.productName}</TableCell>
                  <TableCell>{alert.manufacturerName}</TableCell>
                  <TableCell className={alert.isFlagged ? "text-destructive font-medium" : undefined}>
                    {alert.duplicateScanCount}
                    {alert.isFlagged && " (flagged)"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${STATUS_BADGE[alert.status]}`}>{alert.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(alert.createdAt)}</TableCell>
                  <TableCell>
                    {alert.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pendingId === alert.reportId}
                        onClick={() => escalate(alert.reportId)}
                      >
                        Escalate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
