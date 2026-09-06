"use client"

import { useEffect, useState } from "react"
import { Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// iOS Safari never fires beforeinstallprompt at all - there's no
// programmatic install API on iOS, only the manual Share -> "Add to Home
// Screen" flow, so this is detected separately via user agent to show a
// text instruction instead of an Install button. Not gated to mobile
// screen sizes specifically (spec: "for mobile users") - beforeinstallprompt
// already only fires in contexts the browser itself considers installable,
// so an extra viewport check would only suppress a legitimate case (e.g. an
// installable desktop PWA) without meaningfully improving targeting.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    const nav = window.navigator as Navigator & { standalone?: boolean }
    const isIOS = /iPad|iPhone|iPod/.test(window.navigator.userAgent)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
    // Detecting iOS + standalone-display state on mount is exactly what
    // this effect synchronizes; the setState here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowIOSInstructions(isIOS && !isStandalone)

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
  }, [])

  if (dismissed || (!deferredPrompt && !showIOSInstructions)) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setDeferredPrompt(null)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-primary/5 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Download className="size-4 shrink-0 text-primary" />
        {showIOSInstructions
          ? 'Add VeriGuard to your home screen: tap Share, then "Add to Home Screen".'
          : "Add VeriGuard to your home screen for quick access."}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!showIOSInstructions && (
          <Button size="sm" onClick={handleInstall}>
            Install
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
