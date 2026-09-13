"use client"

import { useCallback, useEffect, useState } from "react"
import { Factory, Loader2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { ManufacturerVerificationStatus } from "@/types/database"

interface AdminManufacturerRow {
  id: string
  company_name: string
  nafdac_manufacturer_code: string | null
  cac_number: string | null
  state: string | null
  verification_status: ManufacturerVerificationStatus
  auto_check_result: { passed?: boolean; matched_name?: string; reason?: string } | null
  created_at: string
  rejection_reason: string | null
}

type StatusFilter = "all" | "pending" | "approved" | "rejected"
const PENDING_STATUSES: ManufacturerVerificationStatus[] = ["pending", "auto_checking", "pending_manual"]

const STATUS_BADGE: Record<ManufacturerVerificationStatus, string> = {
  pending: "bg-muted text-muted-foreground border-transparent",
  auto_checking: "bg-muted text-muted-foreground border-transparent",
  pending_manual: "bg-warning/10 text-warning border-transparent",
  approved: "bg-success/10 text-success border-transparent",
  rejected: "bg-destructive/10 text-destructive border-transparent",
}

export function ManufacturerReviewPanel() {
  const [manufacturers, setManufacturers] = useState<AdminManufacturerRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [reviewing, setReviewing] = useState<AdminManufacturerRow | null>(null)
  const [documentUrls, setDocumentUrls] = useState<{ nafdac: string | null; cac: string | null }>({
    nafdac: null,
    cac: null,
  })
  const [rejectionReason, setRejectionReason] = useState("")
  const [isActing, setIsActing] = useState(false)

  const fetchManufacturers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/manufacturers")
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Failed to load manufacturers")
      setManufacturers(data.manufacturers ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manufacturers")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetch-on-mount is what this effect synchronizes; the setState inside
    // fetchManufacturers is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchManufacturers()
  }, [fetchManufacturers])

  const filtered = manufacturers.filter((m) => {
    if (statusFilter === "all") return true
    if (statusFilter === "pending") return PENDING_STATUSES.includes(m.verification_status)
    return m.verification_status === statusFilter
  })

  async function openReview(manufacturer: AdminManufacturerRow) {
    setReviewing(manufacturer)
    setRejectionReason("")
    setDocumentUrls({ nafdac: null, cac: null })

    const response = await fetch(`/api/admin/manufacturers/${manufacturer.id}/documents`)
    const data = await response.json().catch(() => null)
    if (response.ok && data) {
      setDocumentUrls({ nafdac: data.nafdac_certificate_url, cac: data.cac_certificate_url })
    }
  }

  async function handleDecision(action: "approve" | "reject") {
    if (!reviewing) return
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Enter a reason for rejecting this application.")
      return
    }

    setIsActing(true)
    try {
      const response = await fetch(`/api/admin/manufacturers/${reviewing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejection_reason: action === "reject" ? rejectionReason.trim() : undefined,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error?.message ?? "Action failed")

      toast.success(action === "approve" ? "Manufacturer approved" : "Application rejected")
      setManufacturers((current) =>
        current.map((m) =>
          m.id === reviewing.id
            ? { ...m, verification_status: action === "approve" ? "approved" : "rejected" }
            : m
        )
      )
      setReviewing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setIsActing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
        <SelectTrigger className="sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 && !error ? (
        <EmptyState
          icon={Factory}
          title="No manufacturer applications found"
          description="Try adjusting your filter."
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>NAFDAC Code</TableHead>
                <TableHead>CAC Number</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Auto-check</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((manufacturer) => (
                <TableRow key={manufacturer.id}>
                  <TableCell className="font-medium">{manufacturer.company_name}</TableCell>
                  <TableCell>{manufacturer.nafdac_manufacturer_code ?? "—"}</TableCell>
                  <TableCell>{manufacturer.cac_number ?? "—"}</TableCell>
                  <TableCell>{manufacturer.state ?? "—"}</TableCell>
                  <TableCell>{formatDate(manufacturer.created_at)}</TableCell>
                  <TableCell>
                    {manufacturer.auto_check_result == null
                      ? "—"
                      : manufacturer.auto_check_result.passed
                        ? "Passed ✅"
                        : "Manual ⚠️"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${STATUS_BADGE[manufacturer.verification_status]}`}>
                      {manufacturer.verification_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openReview(manufacturer)}>Review</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{reviewing?.company_name}</SheetTitle>
          </SheetHeader>

          {reviewing && (
            <div className="flex flex-col gap-4 px-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">NAFDAC Code</dt>
                <dd>{reviewing.nafdac_manufacturer_code ?? "—"}</dd>
                <dt className="text-muted-foreground">CAC Number</dt>
                <dd>{reviewing.cac_number ?? "—"}</dd>
                <dt className="text-muted-foreground">State</dt>
                <dd>{reviewing.state ?? "—"}</dd>
                <dt className="text-muted-foreground">Applied</dt>
                <dd>{formatDate(reviewing.created_at)}</dd>
              </dl>

              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  Auto-check: {reviewing.auto_check_result?.passed ? "Passed ✅" : "Requires manual review ⚠️"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {reviewing.auto_check_result?.reason ?? "Auto-check has not run yet."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!documentUrls.nafdac}
                  render={<a href={documentUrls.nafdac ?? undefined} target="_blank" rel="noreferrer" />}
                >
                  View NAFDAC Certificate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!documentUrls.cac}
                  render={<a href={documentUrls.cac ?? undefined} target="_blank" rel="noreferrer" />}
                >
                  View CAC Certificate
                </Button>
              </div>

              {reviewing.verification_status !== "approved" && reviewing.verification_status !== "rejected" && (
                <div className="flex flex-col gap-2">
                  <Textarea
                    placeholder="Rejection reason (required to reject)"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <SheetFooter>
            {reviewing && reviewing.verification_status !== "approved" && reviewing.verification_status !== "rejected" ? (
              <div className="flex w-full gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={isActing}
                  onClick={() => handleDecision("reject")}
                >
                  Reject
                </Button>
                <Button className="flex-1" disabled={isActing} onClick={() => handleDecision("approve")}>
                  Approve
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This application has already been {reviewing?.verification_status}.
              </p>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
