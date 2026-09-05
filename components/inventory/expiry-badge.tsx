import { Badge } from "@/components/ui/badge"
import { daysUntil } from "@/lib/utils/date"

export function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const days = daysUntil(expiryDate)

  if (days < 0) {
    return <Badge variant="destructive">Expired</Badge>
  }

  if (days <= 30) {
    return <Badge variant="destructive">Critical</Badge>
  }

  if (days <= 60) {
    return (
      <Badge className="border-transparent bg-warning/10 text-warning hover:bg-warning/10">
        Warning
      </Badge>
    )
  }

  if (days <= 90) {
    return (
      <Badge className="border-transparent bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/10 dark:text-yellow-500">
        Expiring Soon
      </Badge>
    )
  }

  return (
    <Badge className="border-transparent bg-success/10 text-success hover:bg-success/10">
      Good
    </Badge>
  )
}
