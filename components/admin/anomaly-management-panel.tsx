"use client"

import { useCallback, useEffect, useState } from "react"
import { Activity, Check, Copy, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { AnomalySeverity } from "@/types/database"
import type { VerificationAnomaly } from "@/types"

interface AnomalyRow extends VerificationAnomaly {
  states_touched: string[]
}

const SEVERITY_OPTIONS: AnomalySeverity[] = ["elevated", "high", "critical"]

const SEVERITY_BADGE: Record<AnomalySeverity, string> = {
  elevated: "bg-warning/10 text-warning border-transparent",
  high: "bg-destructive/10 text-destructive border-transparent",
  critical: "bg-destructive text-destructive-foreground border-transparent",
}

function buildNafdacEscalationReport(anomaly: AnomalyRow): string {
  const details = (anomaly.details as Record<string, unknown> | null) ?? {}
  return [
    "VeriGuard Verification Anomaly Report",
    "=====================================",
    `NAFDAC Number: ${anomaly.nafdac_number}`,
    `Anomaly Type: ${anomaly.anomaly_type.replace(/_/g, " ")}`,
    `Severity: ${anomaly.severity}`,
    `Verification Count: ${anomaly.verification_count}`,
    anomaly.unique_users != null ? `Unique Users: ${anomaly.unique_users}` : null,
    anomaly.distinct_states != null ? `Distinct States: ${anomaly.distinct_states}` : null,
    `Time Window: ${anomaly.time_window_hours} hours`,
    `States Where Verifications Occurred: ${anomaly.states_touched.join(", ") || "Unknown"}`,
    `Detected At: ${formatDate(anomaly.created_at)}`,
    details.window_start ? `Window Start: ${String(details.window_start)}` : null,
    details.window_end ? `Window End: ${String(details.window_end)}` : null,
    "",
    "This pattern of verification activity suggests a possible counterfeiting or",
    "distribution anomaly involving this NAFDAC registration number. Submitted by",
    "VeriGuard for NAFDAC's review.",
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
}

export function AnomalyManagementPanel() {
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string | null>(null)
  const [resolvedFilter, setResolvedFilter] = useState<string | null>(null)
  const [resolvingAnomaly, setResolvingAnomaly] = useState<AnomalyRow | null>(null)
  const [resolutionNote, setResolutionNote] = useState("")
  const [isResolving, setIsResolving] = useState(false)
  const [escalatingAnomaly, setEscalatingAnomaly] = useState<AnomalyRow | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchAnomalies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (severityFilter) params.set("severity", severityFilter)
    if (resolvedFilter) params.set("resolved", resolvedFilter)

    try {
      const response = await fetch(`/api/admin/anomalies?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Failed to load anomalies")
      setAnomalies(data.anomalies ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load anomalies")
    } finally {
      setIsLoading(false)
    }
  }, [severityFilter, resolvedFilter])

  useEffect(() => {
    // Fetch-on-mount/filter-change is what this effect synchronizes; the
    // setState inside fetchAnomalies is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnomalies()
  }, [fetchAnomalies])

  async function handleResolve() {
    if (!resolvingAnomaly) return
    setIsResolving(true)
    try {
      const response = await fetch(`/api/admin/anomalies/${resolvingAnomaly.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: resolutionNote.trim() || undefined }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Resolve failed")
      setAnomalies((current) =>
        current.map((a) => (a.id === resolvingAnomaly.id ? { ...a, ...data.anomaly } : a))
      )
      toast.success("Anomaly resolved")
      setResolvingAnomaly(null)
      setResolutionNote("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resolve failed")
    } finally {
      setIsResolving(false)
    }
  }

  async function copyReport(anomaly: AnomalyRow) {
    try {
      await navigator.clipboard.writeText(buildNafdacEscalationReport(anomaly))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy to clipboard.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((severity) => (
              <SelectItem key={severity} value={severity} className="capitalize">
                {severity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Unresolved</SelectItem>
            <SelectItem value="true">Resolved</SelectItem>
          </SelectContent>
        </Select>
        {(severityFilter || resolvedFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSeverityFilter(null)
              setResolvedFilter(null)
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : anomalies.length === 0 && !error ? (
        <EmptyState icon={Activity} title="No anomalies found" description="Try adjusting your filters." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAFDAC Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>States</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {anomalies.map((anomaly) => (
                <TableRow key={anomaly.id}>
                  <TableCell className="font-medium">{anomaly.nafdac_number}</TableCell>
                  <TableCell className="capitalize">{anomaly.anomaly_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${SEVERITY_BADGE[anomaly.severity]}`}>{anomaly.severity}</Badge>
                  </TableCell>
                  <TableCell>{anomaly.verification_count}</TableCell>
                  <TableCell className="max-w-40 truncate">
                    {anomaly.states_touched.join(", ") || "Unknown"}
                  </TableCell>
                  <TableCell>{formatDate(anomaly.created_at)}</TableCell>
                  <TableCell>
                    {anomaly.is_resolved ? (
                      <Badge className="border-transparent bg-success/10 text-success">Resolved</Badge>
                    ) : (
                      <Badge variant="outline">Unresolved</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setEscalatingAnomaly(anomaly)}>
                      <Mail className="size-4" />
                      Escalate
                    </Button>
                    {!anomaly.is_resolved && (
                      <Button variant="ghost" size="sm" onClick={() => setResolvingAnomaly(anomaly)}>
                        Resolve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!resolvingAnomaly} onOpenChange={(open) => !open && setResolvingAnomaly(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Anomaly</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Optional resolution note..."
            />
          </div>
          <DialogFooter>
            <Button onClick={handleResolve} disabled={isResolving}>
              {isResolving ? "Resolving..." : "Mark Resolved"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!escalatingAnomaly} onOpenChange={(open) => !open && setEscalatingAnomaly(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>NAFDAC Escalation Report</DialogTitle>
          </DialogHeader>
          {escalatingAnomaly && (
            <Textarea
              readOnly
              value={buildNafdacEscalationReport(escalatingAnomaly)}
              className="h-64 font-mono text-xs"
            />
          )}
          <DialogFooter>
            <Button onClick={() => escalatingAnomaly && copyReport(escalatingAnomaly)}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy to Clipboard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
