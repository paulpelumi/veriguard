"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Loader2, Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/shared/empty-state"
import { formatDate } from "@/lib/utils/date"
import type { RecallAlert, RecallSeverity } from "@/types"

const SEVERITY_OPTIONS: RecallSeverity[] = ["low", "medium", "high", "critical"]

const SEVERITY_BADGE: Record<RecallSeverity, string> = {
  low: "bg-muted text-muted-foreground border-transparent",
  medium: "bg-warning/10 text-warning border-transparent",
  high: "bg-destructive/10 text-destructive border-transparent",
  critical: "bg-destructive text-destructive-foreground border-transparent",
}

interface RecallFormState {
  product_name: string
  nafdac_number: string
  company_name: string
  recall_reason: string
  severity: RecallSeverity
}

const EMPTY_FORM: RecallFormState = {
  product_name: "",
  nafdac_number: "",
  company_name: "",
  recall_reason: "",
  severity: "medium",
}

export function RecallManagementPanel() {
  const [recalls, setRecalls] = useState<RecallAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isScraping, setIsScraping] = useState(false)
  const [editingRecall, setEditingRecall] = useState<RecallAlert | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [form, setForm] = useState<RecallFormState>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)

  const fetchRecalls = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/recalls")
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Failed to load recalls")
      setRecalls(data.recalls ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recalls")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetch-on-mount is what this effect synchronizes; the setState inside
    // fetchRecalls is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecalls()
  }, [fetchRecalls])

  async function toggleActive(recall: RecallAlert) {
    try {
      const response = await fetch("/api/admin/recalls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recall.id, is_active: !recall.is_active }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Update failed")
      setRecalls((current) => current.map((r) => (r.id === recall.id ? data.recall : r)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed")
    }
  }

  function openEdit(recall: RecallAlert) {
    setEditingRecall(recall)
    setForm({
      product_name: recall.product_name,
      nafdac_number: recall.nafdac_number ?? "",
      company_name: recall.company_name ?? "",
      recall_reason: recall.recall_reason ?? "",
      severity: recall.severity ?? "medium",
    })
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setAddDialogOpen(true)
  }

  async function handleSave() {
    if (!form.product_name.trim()) {
      toast.error("Product name is required.")
      return
    }
    setIsSaving(true)
    try {
      const isEditing = Boolean(editingRecall)
      const response = await fetch("/api/admin/recalls", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { id: editingRecall!.id } : {}),
          product_name: form.product_name.trim(),
          nafdac_number: form.nafdac_number.trim() || null,
          company_name: form.company_name.trim() || null,
          recall_reason: form.recall_reason.trim() || null,
          severity: form.severity,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Save failed")
      const saved = data.recall as RecallAlert
      setRecalls((current) =>
        isEditing ? current.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...current]
      )
      toast.success(isEditing ? "Recall updated" : "Recall added")
      setEditingRecall(null)
      setAddDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleScrape() {
    setIsScraping(true)
    try {
      const response = await fetch("/api/admin/recalls/scrape", { method: "POST" })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error?.message ?? "Scrape failed")
      toast.success(`Scrape complete: ${data.inserted} new recall(s) found.`)
      fetchRecalls()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scrape failed")
    } finally {
      setIsScraping(false)
    }
  }

  const formFields = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Product Name</Label>
        <Input
          value={form.product_name}
          onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>NAFDAC Number</Label>
        <Input
          value={form.nafdac_number}
          onChange={(e) => setForm((f) => ({ ...f, nafdac_number: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Company</Label>
        <Input
          value={form.company_name}
          onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Reason</Label>
        <Textarea
          value={form.recall_reason}
          onChange={(e) => setForm((f) => ({ ...f, recall_reason: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Severity</Label>
        <Select value={form.severity} onValueChange={(v) => setForm((f) => ({ ...f, severity: v as RecallSeverity }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((severity) => (
              <SelectItem key={severity} value={severity} className="capitalize">
                {severity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger render={<Button onClick={openAdd} />}>
            <Plus className="size-4" />
            Add Recall
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Manual Recall</DialogTitle>
            </DialogHeader>
            {formFields}
            <DialogFooter>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Recall"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={handleScrape} disabled={isScraping}>
          <RefreshCw className={isScraping ? "size-4 animate-spin" : "size-4"} />
          {isScraping ? "Scraping..." : "Trigger Manual Scrape"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : recalls.length === 0 && !error ? (
        <EmptyState icon={AlertTriangle} title="No recalls yet" description="Add one manually or trigger a scrape." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recalls.map((recall) => (
                <TableRow key={recall.id}>
                  <TableCell className="max-w-xs truncate font-medium">{recall.product_name}</TableCell>
                  <TableCell>{recall.company_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={`capitalize ${SEVERITY_BADGE[recall.severity ?? "medium"]}`}>
                      {recall.severity ?? "medium"}
                    </Badge>
                  </TableCell>
                  <TableCell>{recall.auto_detected ? "Auto-scraped" : "Manual"}</TableCell>
                  <TableCell>{formatDate(recall.issued_date ?? recall.created_at)}</TableCell>
                  <TableCell>
                    <Switch checked={recall.is_active} onCheckedChange={() => toggleActive(recall)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(recall)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!editingRecall} onOpenChange={(open) => !open && setEditingRecall(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recall</DialogTitle>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
