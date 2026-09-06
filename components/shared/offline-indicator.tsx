"use client"

import { useEffect, useState } from "react"

// navigator.onLine starts true during SSR/hydration (there's no window),
// so this only ever flips to the offline banner client-side once the
// browser's actual connectivity events fire - never renders incorrectly
// on the server.
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Reading the browser's current connectivity state on mount is exactly
    // what this effect synchronizes; the setState here is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOffline(!navigator.onLine)

    function handleOnline() {
      setIsOffline(false)
    }
    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="flex h-8 shrink-0 items-center justify-center bg-warning/15 px-4 text-xs font-medium text-warning">
      📴 Offline — changes will sync when connected
    </div>
  )
}
