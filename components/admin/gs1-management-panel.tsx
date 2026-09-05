"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Barcode, Loader2, Plus, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/shared/empty-state"
import { createClient } from "@/lib/supabase/client"
import type { GS1Prefix } from "@/types"

// Direct client-side Supabase CRUD, not a custom API route - gs1_prefixes'
// RLS already has an "Admin only can manage GS1 prefixes" policy (Module 3)
// covering select/insert/update/delete for an admin session, so a route
// here would just be a thin, redundant wrapper around what RLS already
// permits directly.
export function Gs1ManagementPanel() {
  const supabase = createClient()
  const [prefixes, setPrefixes] = useState<GS1Prefix[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newPrefix, setNewPrefix] = useState("")
  const [newCompany, setNewCompany] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingCompany, setEditingCompany] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchPrefixes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase.from("gs1_prefixes").select("*").order("prefix")
    if (fetchError) setError(fetchError.message)
    setPrefixes(data ?? [])
    setIsLoading(false)
    // supabase client is stable across renders; re-creating it isn't a
    // dependency that should re-trigger this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Fetch-on-mount is what this effect synchronizes; the setState inside
    // fetchPrefixes is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPrefixes()
  }, [fetchPrefixes])

  async function handleAdd() {
    if (!newPrefix.trim() || !newCompany.trim()) {
      toast.error("Both prefix and company name are required.")
      return
    }
    setIsSaving(true)
    const { data, error: insertError } = await supabase
      .from("gs1_prefixes")
      .insert({ prefix: newPrefix.trim(), company_name: newCompany.trim() })
      .select("*")
      .single()
    setIsSaving(false)
    if (insertError) {
      toast.error(insertError.message)
      return
    }
    setPrefixes((current) => [...current, data].sort((a, b) => a.prefix.localeCompare(b.prefix)))
    toast.success("Prefix added")
    setNewPrefix("")
    setNewCompany("")
    setAddOpen(false)
  }

  async function handleEditSave(id: string) {
    if (!editingCompany.trim()) return
    const { data, error: updateError } = await supabase
      .from("gs1_prefixes")
      .update({ company_name: editingCompany.trim() })
      .eq("id", id)
      .select("*")
      .single()
    if (updateError) {
      toast.error(updateError.message)
      return
    }
    setPrefixes((current) => current.map((p) => (p.id === id ? data : p)))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from("gs1_prefixes").delete().eq("id", id)
    if (deleteError) {
      toast.error(deleteError.message)
      return
    }
    setPrefixes((current) => current.filter((p) => p.id !== id))
    toast.success("Prefix removed")
  }

  // Expected format: two columns, prefix,company_name - a header row is
  // tolerated and skipped (detected by its first column not being a
  // GS1-shaped digit string).
  async function handleCsvImport(file: File) {
    const text = await file.text()
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")))
      .filter((cells) => cells.length >= 2 && cells[0] && cells[1])
      .filter((cells) => /^\d{4,10}$/.test(cells[0]))
      .map(([prefix, company_name]) => ({ prefix, company_name }))

    if (rows.length === 0) {
      toast.error("No valid rows found. Expected columns: prefix,company_name")
      return
    }

    const { data, error: importError } = await supabase
      .from("gs1_prefixes")
      .upsert(rows, { onConflict: "prefix" })
      .select("*")

    if (importError) {
      toast.error(importError.message)
      return
    }
    toast.success(`Imported ${data?.length ?? 0} prefix(es)`)
    fetchPrefixes()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Add Prefix
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add GS1 Prefix</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Prefix</Label>
                <Input value={newPrefix} onChange={(e) => setNewPrefix(e.target.value)} placeholder="e.g. 6151234" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Company Name</Label>
                <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={isSaving}>
                {isSaving ? "Saving..." : "Add Prefix"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleCsvImport(file)
            event.target.value = ""
          }}
        />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" />
          Import from CSV
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : prefixes.length === 0 && !error ? (
        <EmptyState icon={Barcode} title="No GS1 prefixes yet" description="Add one manually or import a CSV." />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prefix</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prefixes.map((prefix) => (
                <TableRow key={prefix.id}>
                  <TableCell className="font-mono">{prefix.prefix}</TableCell>
                  <TableCell>
                    {editingId === prefix.id ? (
                      <Input
                        value={editingCompany}
                        onChange={(e) => setEditingCompany(e.target.value)}
                        onBlur={() => handleEditSave(prefix.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleEditSave(prefix.id)}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => {
                          setEditingId(prefix.id)
                          setEditingCompany(prefix.company_name)
                        }}
                      >
                        {prefix.company_name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>{prefix.country_code}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(prefix.id)}>
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
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
