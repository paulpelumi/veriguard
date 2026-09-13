import { AlertTriangle, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { DuplicateAlert } from "@/hooks/use-duplicate-alerts"
import { formatDate } from "@/lib/utils/date"

export function DuplicateAlertCard({
  alert,
  onResolve,
}: {
  alert: DuplicateAlert
  onResolve: (id: string) => void
}) {
  return (
    <Card className={alert.isRead ? undefined : "border-destructive/30 bg-destructive/5"}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {alert.isRead ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <AlertTriangle className="size-4 text-destructive" />
            )}
            <p className="font-medium text-foreground">{alert.title}</p>
          </div>
          <Badge className={alert.isRead ? "border-transparent bg-success/10 text-success" : "border-transparent bg-destructive/10 text-destructive"}>
            {alert.isRead ? "Resolved" : "Open"}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{alert.message}</p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {alert.serialCode && (
            <div>
              <dt className="text-muted-foreground">Serial Code</dt>
              <dd className="font-mono text-foreground">{alert.serialCode}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">First Scan</dt>
            <dd className="text-foreground">{alert.firstScannedLocation ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Duplicate Scan</dt>
            <dd className="text-foreground">{alert.currentScanLocation ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Detected</dt>
            <dd className="text-foreground">{formatDate(alert.createdAt)}</dd>
          </div>
        </dl>

        {!alert.isRead && (
          <div className="pt-1">
            <Button variant="outline" size="sm" onClick={() => onResolve(alert.id)}>
              Mark as Resolved
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
