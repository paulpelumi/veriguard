import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

// Shared body for every route's loading.tsx (Global Improvement 3) - a
// distinct loading.tsx file is required per route directory by Next.js's
// routing convention, but the content itself doesn't need to be
// reinvented each time. `fullPage` covers routes rendered outside the
// dashboard shell (auth, landing, public pages), which need their own
// viewport-height centering instead of relying on a parent layout's.
export function PageSpinner({ fullPage = false }: { fullPage?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-center py-24",
        fullPage && "min-h-dvh py-0"
      )}
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
