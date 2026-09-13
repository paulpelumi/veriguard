import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface UsageMetersProps {
  limits: Record<string, number>
  usage: Record<string, number>
}

// Plan limits (subscription_plans.limits) and usage_records.metric use
// different naming - limits describe the business concept ("how many
// codes a manufacturer may generate a month"), usage describes the event
// that gets counted (see MODULE 2's recordUsage). Only limit keys with a
// tracked counterpart render a meter here; per-seat/live-count limits like
// "users" or "inventory_items" (Module 2 tracks the latter as a live table
// count, not a period event) have nothing to show yet.
const LIMIT_TO_USAGE_METRIC: Record<string, string> = {
  monthly_verifications: "verifications",
  monthly_codes: "serial_codes_generated",
}

const METRIC_LABELS: Record<string, string> = {
  verifications: "Verifications",
  serial_codes_generated: "Serial Codes Generated",
}

export function UsageMeters({ limits, usage }: UsageMetersProps) {
  const meters = Object.entries(limits)
    .filter(([key]) => key in LIMIT_TO_USAGE_METRIC)
    .map(([limitKey, limit]) => {
      const metric = LIMIT_TO_USAGE_METRIC[limitKey]
      return { metric, limit, used: usage[metric] ?? 0 }
    })

  if (meters.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {meters.map(({ metric, limit, used }) => {
          const isUnlimited = limit < 0
          const percentage = isUnlimited ? 0 : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100
          const isNearLimit = !isUnlimited && percentage >= 90

          return (
            <div key={metric} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{METRIC_LABELS[metric] ?? metric}</span>
                <span className="text-muted-foreground">
                  {used.toLocaleString()} / {isUnlimited ? "Unlimited" : limit.toLocaleString()}
                </span>
              </div>
              {!isUnlimited && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", isNearLimit ? "bg-destructive" : "bg-primary")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
