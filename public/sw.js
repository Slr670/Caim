/**
 * CLAIMS Portal — PWA 2.0.0 Service Worker (claims-pwa-v2.0.0)
 *
 * Capabilities:
 * 1. API & Live Data (/api/*): Network-First with cache fallback (bypasses SSE event streams).
 * 2. Static Assets & Local Fonts (/fonts/*, /icons/*, /images/*, /_next/static/*):
 *    Cache-First / Stale-While-Revalidate for instant load speed.
 * 3. Navigation Routes: Network-First with cached page fallback and /offline fallback screen.
 * 4. Web Push Notifications (push & notificationclick): Real-time desktop/mobile push alerts
 *    with App Badge support (navigator.setAppBadge) and deep-link window focusing (/tickets/[id]).
 */

const CACHE_PREFIX = "claims-pwa-v2.0.1"
const STATIC_CACHE = `${CACHE_PREFIX}-static`
const API_CACHE = `${CACHE_PREFIX}-api`
const PAGES_CACHE = `${CACHE_PREFIX}-pages`
const OFFLINE_URL = "/offline"

let unreadPushCount = 0

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
  if (event.data && event.data.type === "CLEAR_APP_BADGE") {
    unreadPushCount = 0
    if (self.navigator && typeof self.navigator.clearAppBadge === "function") {
      self.navigator.clearAppBadge().catch(() => null)
    }
  }
})

/**
 * Web Push Event Listener (PWA 2.0.0 Real-Time Transactional Alerts)
 */
self.addEventListener("push", (event) => {
  let payload = {
    title: "[CLAIMS] แจ้งเตือนระบบบริหารงานเคลมอุปกรณ์",
    body: "มีการอัปเดตข้อมูลเคสเคลมอุปกรณ์ในระบบ CLAIMS",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: `claims-push-${Date.now()}`,
    data: {
      url: "/tickets",
    },
  }

  if (event.data) {
    try {
      const parsed = event.data.json()
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        icon: parsed.icon || "/icons/icon-192x192.png",
        badge: parsed.badge || "/icons/icon-192x192.png",
        tag: parsed.tag || payload.tag,
        data: {
          url: (parsed.data && parsed.data.url) || parsed.url || "/tickets",
          ...(parsed.data || {}),
        },
      }
    } catch {
      const rawText = event.data.text()
      if (rawText) {
        payload.body = rawText
      }
    }
  }

  unreadPushCount += 1

  const showNotificationPromise = self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag,
    renotify: true,
    vibrate: [180, 80, 180],
    data: payload.data,
  })

  const badgePromise =
    self.navigator && typeof self.navigator.setAppBadge === "function"
      ? self.navigator.setAppBadge(unreadPushCount).catch(() => null)
      : Promise.resolve()

  event.waitUntil(Promise.all([showNotificationPromise, badgePromise]))
})

/**
 * Notification Click Deep-Link Handler
 * Closes the banner, clears the app badge, and focuses an existing CLAIMS window
 * or opens the exact target route (e.g. /tickets/CLM-2026-001) directly.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  unreadPushCount = Math.max(0, unreadPushCount - 1)
  if (self.navigator && typeof self.navigator.clearAppBadge === "function") {
    if (unreadPushCount === 0) {
      self.navigator.clearAppBadge().catch(() => null)
    } else if (typeof self.navigator.setAppBadge === "function") {
      self.navigator.setAppBadge(unreadPushCount).catch(() => null)
    }
  }

  const rawUrl =
    (event.notification.data && event.notification.data.url) || "/dashboard"
  const targetUrl = new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            if ("navigate" in client) {
              return client
                .navigate(targetUrl)
                .then((navigated) => (navigated ? navigated.focus() : client.focus()))
                .catch(() => client.focus())
            }
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return null
      })
  )
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

  // 1. API & Live Data (/api/*): Network-First Strategy with normalized cache key
  // Strip volatile `_t` cache-buster query params so offline/transient fallback actually hits cached JSON
  // instead of fabricating synthetic 503 responses.
  if (url.pathname.startsWith("/api/")) {
    const normalizedUrl = new URL(url.href)
    normalizedUrl.searchParams.delete("_t")
    normalizedUrl.searchParams.delete("refresh")
    normalizedUrl.searchParams.delete("force")
    const cacheKey = new Request(normalizedUrl.toString(), { method: "GET" })

    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone()
            caches.open(API_CACHE).then((cache) => {
              cache.put(cacheKey, cloned).catch(() => null)
            })
          }
          return networkResponse
        })
        .catch(async (networkErr) => {
          const cachedResponse =
            (await caches.match(cacheKey)) ||
            (await caches.match(request, { ignoreSearch: true }))
          if (cachedResponse) {
            const headers = new Headers(cachedResponse.headers)
            headers.set("X-CLAIMS-Cache-Fallback", "1")
            return new Response(cachedResponse.body, {
              status: cachedResponse.status,
              statusText: cachedResponse.statusText,
              headers,
            })
          }

          const isOffline =
            typeof self.navigator !== "undefined" && self.navigator.onLine === false

          return new Response(
            JSON.stringify({
              success: false,
              offline: isOffline,
              code: isOffline ? "OFFLINE_NO_CACHE" : "NETWORK_UNREACHABLE",
              retryable: !isOffline,
              pwaVersion: "2.0.1",
              error: isOffline
                ? "ขณะนี้อุปกรณ์อยู่ในโหมดออฟไลน์ (Offline Mode)"
                : `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ชั่วคราว (${networkErr instanceof Error ? networkErr.message : "Network error"})`,
            }),
            {
              status: 503,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "X-CLAIMS-SW-Fallback": "1",
              },
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
