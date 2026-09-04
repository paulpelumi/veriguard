import { Badge } from "@/components/ui/badge"
import { daysUntil } from "@/lib/utils/date"

export function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const days = daysUntil(expiryDate)

  if (days < 0) {
    return <Badge variant="destructive">Expired</Badge>
  }

  if (days <= 7) {
    return <Badge variant="destructive">{days === 0 ? "Expires today" : `${days}d left`}</Badge>
  }

  if (days <= 30) {
    return (
      <Badge className="border-transparent bg-warning/10 text-warning hover:bg-warning/10">
        {days}d left
      </Badge>
    )
  }

  return (
    <Badge className="border-transparent bg-success/10 text-success hover:bg-success/10">
      {days}d left
    </Badge>
  )
}
