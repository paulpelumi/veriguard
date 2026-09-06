import { WifiOff } from "lucide-react"

import { Logo } from "@/components/shared/logo"

// Served by the service worker (public/sw.js) when a navigation request
// fails with no cached match for the requested page - this page itself is
// pre-cached on install specifically so it's always available offline.
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Logo />
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">You&apos;re offline</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This page hasn&apos;t been saved for offline use. Reconnect to the internet and try
          again - your inventory and expiry pages stay available while offline if you&apos;ve
          visited them before.
        </p>
      </div>
    </div>
  )
}
