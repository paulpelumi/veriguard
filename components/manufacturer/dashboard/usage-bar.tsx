import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface UsageBarProps {
  used: number
  limit: number
}

export function UsageBar({ used, limit }: UsageBarProps) {
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const isNearLimit = percentage >= 90

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Serial Codes Used This Month</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", isNearLimit ? "bg-destructive" : "bg-primary")}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()} ({percentage}%)
        </p>
      </CardContent>
    </Card>
  )
}
