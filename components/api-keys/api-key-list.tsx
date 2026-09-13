"use client"

import { useState } from "react"
import { KeyRound } from "lucide-react"

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
import { EmptyState } from "@/components/shared/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ApiKeySummary } from "@/hooks/use-api-keys"
import { formatDate } from "@/lib/utils/date"

interface ApiKeyListProps {
  keys: ApiKeySummary[]
  onRevoke: (id: string) => void
}

export function ApiKeyList({ keys, onRevoke }: ApiKeyListProps) {
  const [pendingRevoke, setPendingRevoke] = useState<ApiKeySummary | null>(null)

  if (keys.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No API keys yet"
        description="Create one to start verifying products from your own systems."
      />
    )
  }

  function handleConfirmRevoke() {
    if (!pendingRevoke) return
    onRevoke(pendingRevoke.id)
    setPendingRevoke(null)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Rate Limit</TableHead>
              <TableHead>Total Calls</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.name}</TableCell>
                <TableCell className="font-mono text-xs">{key.key_prefix}…</TableCell>
                <TableCell>{key.rate_limit_per_hour}/hr</TableCell>
                <TableCell>{key.calls_total.toLocaleString()}</TableCell>
                <TableCell>{key.last_used_at ? formatDate(key.last_used_at) : "Never"}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      key.is_active
                        ? "bg-success/10 text-success border-transparent"
                        : "bg-muted text-muted-foreground border-transparent"
                    }
                  >
                    {key.is_active ? "Active" : "Revoked"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {key.is_active && (
                    <Button variant="ghost" size="sm" onClick={() => setPendingRevoke(key)}>
                      Revoke
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!pendingRevoke} onOpenChange={(open) => !open && setPendingRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke &quot;{pendingRevoke?.name}&quot;?</DialogTitle>
            <DialogDescription>
              Any integration using this key will immediately stop working. This can&apos;t be undone - you&apos;d
              need to create a new key and update your integration with it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRevoke(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmRevoke}>
              Revoke Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
