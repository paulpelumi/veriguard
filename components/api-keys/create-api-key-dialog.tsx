"use client"

import { useState } from "react"
import { Copy, KeyRound, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useApiKeys } from "@/hooks/use-api-keys"

interface CreateApiKeyDialogProps {
  createKey: ReturnType<typeof useApiKeys>["createKey"]
  isCreating: boolean
}

export function CreateApiKeyDialog({ createKey, isCreating }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [rawKey, setRawKey] = useState<string | null>(null)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      // Closing clears everything, including the raw key still in memory -
      // it was already shown once, and this dialog is the only place it
      // will ever be shown again.
      setName("")
      setRawKey(null)
    }
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Give this key a name")
      return
    }
    try {
      const result = await createKey(name.trim())
      setRawKey(result.rawKey)
    } catch {
      // Already surfaced via the hook's onError toast.
    }
  }

  async function handleCopy() {
    if (!rawKey) return
    try {
      await navigator.clipboard.writeText(rawKey)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Couldn't copy. Select and copy the key manually.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New API Key
          </Button>
        }
      />
      <DialogContent>
        {rawKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Your new API key</DialogTitle>
              <DialogDescription>
                Copy this now - for your security, it won&apos;t be shown again. If you lose it, revoke this
                key and create a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <KeyRound className="text-muted-foreground size-4 shrink-0" />
              <code className="flex-1 overflow-x-auto text-sm">{rawKey}</code>
              <Button size="icon-sm" variant="ghost" onClick={handleCopy} aria-label="Copy API key">
                <Copy className="size-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create an API key</DialogTitle>
              <DialogDescription>
                Name it after where it&apos;ll be used (e.g. &quot;POS integration&quot;) so you can tell keys
                apart later.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. POS integration"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? "Creating…" : "Create Key"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
