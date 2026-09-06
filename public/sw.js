// Minimal, hand-rolled service worker for the PWA offline support
// (Global Improvement 4) - no next-pwa/serwist dependency. The scope here
// is narrow (cache two specific pages + an offline fallback), which a
// ~40-line worker covers without pulling in a build-time plugin whose
// Turbopack compatibility isn't guaranteed.
const CACHE_NAME = "veriguard-v1"
const OFFLINE_URL = "/offline"

// Routes cached only once actually visited while online (spec: "inventory
// list, expiry monitoring page") - not pre-cached on install, since these
// are authenticated, dynamically-rendered pages and a blind install-time
// fetch would have no session to render them with.
const CACHEABLE_PATHS = ["/business/inventory", "/business/expiry"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  // Only navigations (actual page loads) are handled specially - API
  // calls, RSC data fetches, and static assets pass straight through to
  // the network untouched, so nothing here risks serving stale data for
  // anything other than the two pages this feature targets.
  if (request.mode !== "navigate") return

  const url = new URL(request.url)
  const isCacheable = CACHEABLE_PATHS.some((path) => url.pathname.startsWith(path))

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (isCacheable && response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        return cached ?? (await caches.match(OFFLINE_URL))
      })
  )
})
