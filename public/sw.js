/**
 * CLAIMS Portal — PWA 2.0.0 Service Worker (claims-pwa-v2.0.0)
 *
 * Caching Strategies:
 * 1. API & Live Data (/api/*): Network-First with cache fallback (bypasses SSE event streams).
 * 2. Static Assets & Local Fonts (/fonts/*, /icons/*, /images/*, /_next/static/*):
 *    Cache-First / Stale-While-Revalidate for instant load speed.
 * 3. Navigation Routes: Network-First with cached page fallback and /offline fallback screen.
 */

const CACHE_PREFIX = "claims-pwa-v2.0.0"
const STATIC_CACHE = `${CACHE_PREFIX}-static`
const API_CACHE = `${CACHE_PREFIX}-api`
const PAGES_CACHE = `${CACHE_PREFIX}-pages`
const OFFLINE_URL = "/offline"

const PRECACHE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-maskable-192x192.png",
  "/icons/icon-maskable-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon.svg",
  "/fonts/THSarabunNew.ttf",
  "/fonts/THSarabunNew-Bold.ttf",
  "/images/forth-logo.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            cache.add(new Request(url, { cache: "reload" })).catch(() => null)
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_PREFIX))
            .map((staleKey) => caches.delete(staleKey))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
  if (event.data && event.data.type === "CLEAR_PWA_CACHE") {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    )
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Only handle standard GET requests
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.protocol !== "http:" && url.protocol !== "https:") return
  if (url.origin !== self.location.origin) return

  // Never intercept Server-Sent Events (SSE) streams or Next.js HMR endpoints
  const acceptHeader = request.headers.get("accept") || ""
  if (
    acceptHeader.includes("text/event-stream") ||
    url.pathname.startsWith("/api/realtime/stream") ||
    url.pathname.startsWith("/api/dashboard/stream") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return
  }

  // 1. API & Live Data (/api/*): Network-First Strategy
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone()
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, cloned).catch(() => null)
            })
          }
          return networkResponse
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            return cachedResponse
          }
          return new Response(
            JSON.stringify({
              success: false,
              offline: true,
              pwaVersion: "2.0.0",
              error: "ขณะนี้อุปกรณ์อยู่ในโหมดออฟไลน์ (Offline Mode)",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json; charset=utf-8" },
            }
          )
        })
    )
    return
  }

  // 2. Static Assets, Icons & Local Fonts: Cache-First / Stale-While-Revalidate Strategy
  const isStaticAsset =
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|ttf|woff|woff2|css|js)$/i.test(url.pathname)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const cloned = networkResponse.clone()
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, cloned).catch(() => null)
              })
            }
            return networkResponse
          })
          .catch(() => cachedResponse)

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  // 3. Page Navigation Requests: Network-First with Cache & /offline Fallback
  if (request.mode === "navigate" || acceptHeader.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone()
            caches.open(PAGES_CACHE).then((cache) => {
              cache.put(request, cloned).catch(() => null)
            })
          }
          return networkResponse
        })
        .catch(async () => {
          const cachedPage = await caches.match(request)
          if (cachedPage) return cachedPage

          const offlineFallback = await caches.match(OFFLINE_URL)
          if (offlineFallback) return offlineFallback

          return caches.match("/")
        })
    )
  }
})
