"use client"

import * as React from "react"
import {
  BellRing,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  X,
} from "lucide-react"

export const DEFAULT_PUBLIC_VAPID_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BIZ_IMFjP249T3BdUCaWwZVwdptwEZnwnQxKgkl_lGR2SsKGdid2Nri8CLI7vTre4_LnqoGQkkYP_XcRPqSfewg"

const SESSION_SYNCED_ENDPOINT_KEY = "caim_pwa_push_synced_endpoint_v1"

export interface EnsurePushSubscriptionResult {
  success: boolean
  endpoint?: string
  permission?: NotificationPermission
  cached?: boolean
  error?: string
}

// Module-level singleton / in-flight lock + per-session endpoint guard
// Ensures POST /api/push/subscribe executes at most once per session per endpoint
// with zero duplicate concurrent calls or retry storms.
let inFlightPushSubscribePromise: Promise<EnsurePushSubscriptionResult> | null = null
const syncedEndpointsInMemory = new Set<string>()
let autoSyncAttemptedInSession = false
let cachedPublicVapidKey: string | null = null

function hasSyncedEndpointInSession(endpoint: string): boolean {
  if (!endpoint) return false
  if (syncedEndpointsInMemory.has(endpoint)) return true
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(SESSION_SYNCED_ENDPOINT_KEY)
      if (stored === endpoint) {
        syncedEndpointsInMemory.add(endpoint)
        return true
      }
    } catch {
      // ignore restricted storage modes
    }
  }
  return false
}

function markEndpointSyncedInSession(endpoint: string): void {
  if (!endpoint) return
  syncedEndpointsInMemory.add(endpoint)
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(SESSION_SYNCED_ENDPOINT_KEY, endpoint)
    } catch {
      // ignore restricted storage modes
    }
  }
}

export function clearSyncedEndpointInSession(endpoint?: string): void {
  if (endpoint) {
    syncedEndpointsInMemory.delete(endpoint)
  } else {
    syncedEndpointsInMemory.clear()
  }
  autoSyncAttemptedInSession = false
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_SYNCED_ENDPOINT_KEY)
    } catch {
      // ignore restricted storage modes
    }
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = typeof window !== "undefined" ? window.atob(base64) : ""
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Detects whether the web app is running as an installed standalone PWA
 * across Android Chrome, iOS Safari Home Screen, and Desktop PWA Window Controls Overlay.
 */
export function isStandalonePwaMode(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

/**
 * Ensures the Service Worker is registered, retrieves or creates an active PushSubscription,
 * and syncs it with POST /api/push/subscribe at most once per session per endpoint.
 */
export async function ensureActivePushSubscription(options?: {
  requestPermissionIfNeeded?: boolean
  sendWelcome?: boolean
  force?: boolean
}): Promise<EnsurePushSubscriptionResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return {
      success: false,
      error: "อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับระบบ Web Push Notifications",
    }
  }

  const isUserInitiated = Boolean(
    options?.force || options?.requestPermissionIfNeeded || options?.sendWelcome
  )

  // Fast-path permission check before acquiring any network/SW resources
  if (Notification.permission !== "granted" && !options?.requestPermissionIfNeeded) {
    return {
      success: false,
      permission: Notification.permission,
      error:
        Notification.permission === "denied"
          ? "สิทธิ์การแจ้งเตือนถูกปฏิเสธ กรุณาเปิดอนุญาตในการตั้งค่าของโทรศัพท์"
          : "ยังไม่ได้รับสิทธิ์การแสดงการแจ้งเตือน",
    }
  }

  // Deduplicate all concurrent callers via module-level singleton promise
  if (inFlightPushSubscribePromise) {
    return inFlightPushSubscribePromise
  }

  const run = async (): Promise<EnsurePushSubscriptionResult> => {
    try {
      let permission = Notification.permission
      if (permission === "default" && options?.requestPermissionIfNeeded) {
        permission = await Notification.requestPermission()
      }

      if (permission !== "granted") {
        return {
          success: false,
          permission,
          error:
            permission === "denied"
              ? "สิทธิ์การแจ้งเตือนถูกปฏิเสธ กรุณาเปิดอนุญาตในการตั้งค่าของโทรศัพท์"
              : "ยังไม่ได้รับสิทธิ์การแสดงการแจ้งเตือน",
        }
      }

      // Ensure Service Worker (/sw.js) is registered prior to awaiting .ready
      const existingReg = await navigator.serviceWorker.getRegistration("/")
      if (!existingReg) {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" })
      }

      const registration = await navigator.serviceWorker.ready
      let sub = await registration.pushManager.getSubscription()

      // Session guard: if this exact subscription endpoint was already synced this session
      // and this is a background auto-sync, skip GET & POST /api/push/subscribe completely.
      if (sub && !isUserInitiated && hasSyncedEndpointInSession(sub.endpoint)) {
        return {
          success: true,
          endpoint: sub.endpoint,
          permission: "granted",
          cached: true,
        }
      }

      // Prevent background auto-sync retry storms if an earlier attempt in this session failed
      if (!isUserInitiated && autoSyncAttemptedInSession) {
        return {
          success: Boolean(sub),
          endpoint: sub?.endpoint,
          permission: "granted",
          cached: true,
        }
      }

      if (!isUserInitiated) {
        autoSyncAttemptedInSession = true
      }

      if (!sub) {
        let publicKey = cachedPublicVapidKey || DEFAULT_PUBLIC_VAPID_KEY
        if (!cachedPublicVapidKey) {
          try {
            const keyRes = await fetch("/api/push/subscribe", { cache: "no-store" })
            if (keyRes.ok) {
              const keyData = await keyRes.json()
              if (keyData?.publicKey) {
                publicKey = keyData.publicKey
                cachedPublicVapidKey = keyData.publicKey
              }
            }
          } catch {
            // Fallback to bundled VAPID public key when offline/transient
          }
        }

        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })
      }

      // Re-check session guard in case the newly retrieved endpoint was already synced
      if (!isUserInitiated && hasSyncedEndpointInSession(sub.endpoint)) {
        return {
          success: true,
          endpoint: sub.endpoint,
          permission: "granted",
          cached: true,
        }
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          sendWelcome: Boolean(options?.sendWelcome),
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        return {
          success: false,
          permission,
          error: data?.error || "ไม่สามารถซิงก์ข้อมูล Push Subscription กับเซิร์ฟเวอร์ได้",
        }
      }

      markEndpointSyncedInSession(sub.endpoint)

      window.dispatchEvent(
        new CustomEvent("caim:pwa:push-changed", {
          detail: { subscribed: true, permission: "granted" },
        })
      )

      return {
        success: true,
        endpoint: sub.endpoint,
        permission: "granted",
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  }

  inFlightPushSubscribePromise = run().finally(() => {
    inFlightPushSubscribePromise = null
  })

  return inFlightPushSubscribePromise
}

/**
 * Global Push Notification Bootstrapper & Mobile Standalone Permission Gate.
 * Mounted inside RootLayout (src/app/layout.tsx):
 * 1. Whenever Notification.permission === 'granted', silently retrieves/creates the
 *    PushSubscription and syncs it to POST /api/push/subscribe on every launch & foreground resume.
 * 2. On installed mobile/standalone PWAs where Notification.permission === 'default',
 *    immediately presents a high-priority single-tap activation overlay (satisfying iOS Safari &
 *    Android Chrome user-gesture rules without requiring navigation into System Settings).
 * 3. If Notification.permission === 'denied' in standalone PWA mode, renders a clear OS settings
 *    recovery banner.
 */
export function PwaPushAutoSubscriber() {
  const [isStandalone, setIsStandalone] = React.useState(false)
  const [isIos, setIsIos] = React.useState(false)
  const [permissionState, setPermissionState] =
    React.useState<NotificationPermission | "unsupported">("default")
  const [isSubscribed, setIsSubscribed] = React.useState(false)
  const [isActivating, setIsActivating] = React.useState(false)
  const [activationError, setActivationError] = React.useState<string | null>(null)
  const [deniedBannerDismissed, setDeniedBannerDismissed] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  const hasInitializedRef = React.useRef(false)

  const syncSubscriptionState = React.useCallback(async (force = false) => {
    if (typeof window === "undefined") return

    const standalone = isStandalonePwaMode()
    setIsStandalone(standalone)

    const ua = window.navigator.userAgent || ""
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window))

    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setPermissionState("unsupported")
      return
    }

    const currentPerm = Notification.permission
    setPermissionState(currentPerm)

    if (currentPerm === "granted") {
      const res = await ensureActivePushSubscription({
        requestPermissionIfNeeded: false,
        sendWelcome: false,
        force,
      })
      if (res.success) {
        setIsSubscribed(true)
        setActivationError(null)
      }
    }
  }, [])

  React.useEffect(() => {
    setMounted(true)

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      void syncSubscriptionState(false)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Lightweight local permission/display-mode check; session guard prevents duplicate POSTs
        void syncSubscriptionState(false)
      }
    }

    const handlePushChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as
        | { subscribed?: boolean; permission?: NotificationPermission }
        | undefined
      if (typeof detail?.subscribed === "boolean") {
        setIsSubscribed(detail.subscribed)
      }
      if (detail?.permission) {
        setPermissionState(detail.permission)
      } else if (typeof window !== "undefined" && "Notification" in window) {
        setPermissionState(Notification.permission)
      }
    }

    const displayModeQuery = window.matchMedia("(display-mode: standalone)")
    const handleDisplayModeChange = () => {
      setIsStandalone(isStandalonePwaMode())
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("caim:pwa:push-changed", handlePushChanged)
    displayModeQuery.addEventListener?.("change", handleDisplayModeChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("caim:pwa:push-changed", handlePushChanged)
      displayModeQuery.removeEventListener?.("change", handleDisplayModeChange)
    }
  }, [syncSubscriptionState])

  // Direct user-gesture handler required by iOS Safari & Android Chrome
  const handleActivateImmediately = async () => {
    setIsActivating(true)
    setActivationError(null)
    try {
      const res = await ensureActivePushSubscription({
        requestPermissionIfNeeded: true,
        sendWelcome: true,
        force: true,
      })
      if (res.permission) {
        setPermissionState(res.permission)
      } else if ("Notification" in window) {
        setPermissionState(Notification.permission)
      }

      if (res.success) {
        setIsSubscribed(true)
      } else if (res.error) {
        setActivationError(res.error)
      }
    } finally {
      setIsActivating(false)
    }
  }

  if (!mounted || !isStandalone || permissionState === "unsupported") {
    return null
  }

  // 1. Mandatory First-Launch Activation Modal for Installed Standalone PWA (permission === 'default')
  if (permissionState === "default" && !isSubscribed) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-first-launch-push-title"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-blue-500/30 bg-white dark:bg-slate-900 p-6 text-slate-900 dark:text-slate-100 shadow-2xl">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500" />

          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25 ring-4 ring-blue-500/15">
              <BellRing className="size-7 animate-pulse" />
            </span>

            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>PWA 2.0.0 Always-On Alerts</span>
            </span>

            <h2
              id="pwa-first-launch-push-title"
              className="mt-3 text-lg font-bold tracking-tight text-slate-900 dark:text-white"
            >
              เปิดรับการแจ้งเตือนงานเคลมแบบเรียลไทม์
            </h2>

            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              แอปพลิเคชัน <strong>CLAIMS</strong> บังคับเปิดระบบแจ้งเตือนอัตโนมัติสำหรับอุปกรณ์ที่ติดตั้งแอป
              กรุณาแตะปุ่มด้านล่าง 1 ครั้งเพื่ออนุญาตให้ระบบส่งแจ้งเตือนทันทีเมื่อมีเคสใหม่หรืออัปเดตสถานะงานซ่อม
            </p>

            {activationError && (
              <div className="mt-3 w-full rounded-xl border border-rose-500/30 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
                {activationError}
              </div>
            )}

            <button
              type="button"
              onClick={handleActivateImmediately}
              disabled={isActivating}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {isActivating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>กำลังเปิดใช้งานการแจ้งเตือน...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>เปิดใช้งานการแจ้งเตือนทันที</span>
                </>
              )}
            </button>

            <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
              ตั้งค่าครั้งเดียว ระบบจะซิงก์การแจ้งเตือนให้อัตโนมัติทุกครั้งที่เปิดแอป
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 2. Concise OS Permission Recovery Banner if Notification.permission === 'denied'
  if (permissionState === "denied" && !deniedBannerDismissed) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-lg rounded-2xl border border-amber-500/40 bg-amber-50/95 dark:bg-slate-900/95 p-3.5 text-xs text-slate-900 dark:text-slate-100 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-3">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 dark:text-amber-300">
              การแจ้งเตือนผ่านแอปถูกปิดกั้นในการตั้งค่าโทรศัพท์
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
              {isIos
                ? "วิธีเปิดรับแจ้งเตือนบน iPhone/iPad: ไปที่ การตั้งค่า (Settings) → การแจ้งเตือน (Notifications) → เลือกแอป CLAIMS → เปิด อนุญาตการแจ้งเตือน (Allow Notifications)"
                : "วิธีเปิดรับแจ้งเตือนบนมือถือ: ไปที่ การตั้งค่าแอป (App Info / Site Settings) → การแจ้งเตือน (Notifications) → เปิดอนุญาต แล้วกดปุ่มตรวจสอบอีกครั้ง"}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void syncSubscriptionState(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-500 cursor-pointer"
              >
                <RefreshCw className="size-3" />
                <span>ตรวจสอบอีกครั้ง</span>
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeniedBannerDismissed(true)}
            aria-label="ปิดคำแนะนำ"
            className="rounded-lg p-1 text-slate-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}
