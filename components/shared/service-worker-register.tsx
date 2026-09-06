"use client"

import { useEffect } from "react"

// Registers public/sw.js once the page has finished loading. Silently
// no-ops in browsers without service worker support rather than throwing -
// this is a progressive enhancement, not a hard requirement for the app
// to function.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    function register() {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed", error)
      })
    }

    if (document.readyState === "complete") {
      register()
    } else {
      window.addEventListener("load", register)
      return () => window.removeEventListener("load", register)
    }
  }, [])

  return null
}
