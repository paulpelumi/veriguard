import { AlertTriangle } from "lucide-react"

export function AffectedStockBanner({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
      <AlertTriangle className="size-5 shrink-0 text-warning" />
      <p className="text-sm text-foreground">
        <span className="font-semibold">
          {count} active recall{count === 1 ? "" : "s"}
        </span>{" "}
        {count === 1 ? "matches" : "match"} products in your inventory. Review the &quot;Affecting
        Your Stock&quot; section below.
      </p>
    </div>
  )
}
