"use client"

import * as React from "react"
import { Download, X, Share, PlusSquare, CheckCircle2, Smartphone, ShieldCheck, BellRing } from "lucide-react"
import {
  ensureActivePushSubscription,
  isStandalonePwaMode,
  urlBase64ToUint8Array,
} from "./PwaPushAutoSubscriber"

export { urlBase64ToUint8Array, isStandalonePwaMode }

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

const DISMISS_KEY = "claims_pwa_v2_dismissed_at"

export async function subscribeBrowserToWebPush(sendWelcome = false): Promise<{
  success: boolean
  endpoint?: string
  error?: string
}> {
  const res = await ensureActivePushSubscription({
    requestPermissionIfNeeded: true,
    sendWelcome,
  })
  return {
    success: res.success,
    endpoint: res.endpoint,
    error: res.error,
  }
}

export async function unsubscribeBrowserFromWebPush(): Promise<{
  success: boolean
  error?: string
}> {
  if (isStandalonePwaMode()) {
    return {
      success: false,
      error: "ระบบบังคับเปิดการแจ้งเตือนอัตโนมัติ (Always On) สำหรับแอปที่ติดตั้งแล้ว",
    }
  }

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { success: false, error: "Service Worker not available" }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe().catch(() => null)
      await fetch("/api/push/unsubscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => null)
    }

    window.dispatchEvent(new CustomEvent("caim:pwa:push-changed", { detail: { subscribed: false } }))
    return { success: true }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

export function triggerPwaInstallPrompt() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("caim:pwa:open-prompt"))
  }
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = React.useState(false)
  const [isIos, setIsIos] = React.useState(false)
  const [showBanner, setShowBanner] = React.useState(false)
  const [showIosGuide, setShowIosGuide] = React.useState(false)
  const [swActive, setSwActive] = React.useState(false)
  const [pushSubscribed, setPushSubscribed] = React.useState(false)
  const [isSubscribingPush, setIsSubscribingPush] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Register PWA 2.0.0 Service Worker (/sw.js) and auto-subscribe if permission is already granted
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then(async (registration) => {
          setSwActive(true)
          registration.update().catch(() => null)
          if ("Notification" in window && Notification.permission === "granted") {
            const subRes = await ensureActivePushSubscription({
              requestPermissionIfNeeded: false,
              sendWelcome: false,
            })
            if (subRes.success) {
              setPushSubscribed(true)
            }
          } else if ("pushManager" in registration) {
            const existingSub = await registration.pushManager.getSubscription().catch(() => null)
            if (existingSub) {
              setPushSubscribed(true)
            }
          }
        })
        .catch((err) => {
          console.warn("[PWA 2.0.0] Service Worker registration notice:", err)
        })
    }

    // Clear unread app badge on window focus
    const clearBadge = () => {
      if ("clearAppBadge" in navigator && typeof navigator.clearAppBadge === "function") {
        navigator.clearAppBadge().catch(() => null)
      }
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CLEAR_APP_BADGE" })
      }
    }
    clearBadge()
    window.addEventListener("focus", clearBadge)

    // 2. Detect standalone installed state
    const navWithStandalone = window.navigator as Navigator & { standalone?: boolean }
    const standaloneMatch =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      Boolean(navWithStandalone.standalone)
    setIsStandalone(standaloneMatch)

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent || ""
    const iosDevice = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)
    setIsIos(iosDevice)

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || "0")
    const recentlyDismissed = dismissedAt > 0 && Date.now() - dismissedAt < 1000 * 60 * 60 * 24 * 3

    if (iosDevice && !standaloneMatch && !recentlyDismissed) {
      setShowBanner(true)
    }

    // 4. Capture beforeinstallprompt on Desktop / Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) || "0")
      const isDismissed = dismissed > 0 && Date.now() - dismissed < 1000 * 60 * 60 * 24 * 3
      if (!standaloneMatch && !isDismissed) {
        setShowBanner(true)
      }
    }

    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
      setShowBanner(false)
      setShowIosGuide(false)
    }

    const handleManualOpen = () => {
      if (iosDevice && !standaloneMatch) {
        setShowIosGuide(true)
        setShowBanner(true)
      } else {
        setShowBanner(true)
      }
    }

    const handlePushChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as { subscribed?: boolean } | undefined
      if (typeof detail?.subscribed === "boolean") {
        setPushSubscribed(detail.subscribed)
      }
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    window.addEventListener("caim:pwa:open-prompt", handleManualOpen)
    window.addEventListener("caim:pwa:push-changed", handlePushChanged)

    return () => {
      window.removeEventListener("focus", clearBadge)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("caim:pwa:open-prompt", handleManualOpen)
      window.removeEventListener("caim:pwa:push-changed", handlePushChanged)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null)
          setShowBanner(false)
        }
      } catch (err) {
        console.warn("[PWA 2.0.0] Install prompt failed:", err)
      }
      return
    }

    if (isIos) {
      setShowIosGuide((prev) => !prev)
    }
  }

  const handleQuickEnablePush = async () => {
    setIsSubscribingPush(true)
    try {
      const res = await subscribeBrowserToWebPush(true)
      if (res.success) {
        setPushSubscribed(true)
      }
    } finally {
      setIsSubscribingPush(false)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setShowIosGuide(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // ignore storage error
    }
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-blue-500/30 bg-white/95 dark:bg-[#0f172a]/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
            <Smartphone className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                ติดตั้งแอป CLAIMS
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-sky-300">
                PWA v2.0.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              {isStandalone
                ? "ทำงานในโหมดแอปติดตั้งแล้ว พร้อมระบบแจ้งเตือน Push & แคชออฟไลน์"
                : "ใช้งานแบบแอปเต็มหน้าจอ โหลดไว พร้อมรับการแจ้งเตือนผ่านแอปแบบเรียลไทม์"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          aria-label="ปิดแถบติดตั้งแอป"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Quick-Enable Web Push Banner inside PWA Prompt */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-500/25 px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <BellRing className="size-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
          <span className="font-medium">
            {pushSubscribed ? "เปิดรับการแจ้งเตือน Push แล้ว" : "รับการแจ้งเตือนงานเคลมผ่านแอป"}
          </span>
        </div>
        {!pushSubscribed ? (
          <button
            type="button"
            onClick={handleQuickEnablePush}
            disabled={isSubscribingPush}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            {isSubscribingPush ? "กำลังเปิด..." : "เปิดแจ้งเตือน"}
          </button>
        ) : (
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
            เปิดอยู่
          </span>
        )}
      </div>

      {/* iOS Safari Step-by-Step Guide */}
      {(isIos || showIosGuide) && !deferredPrompt && !isStandalone && (
        <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/10 p-3 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            วิธีติดตั้งบน iOS / Safari หรือเบราว์เซอร์ปัจจุบัน:
          </p>
          <div className="flex items-center gap-2">
            <Share className="size-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
            <span>1. แตะปุ่ม <strong>แชร์ (Share)</strong> หรือเมนูมุมขวาบนของเบราว์เซอร์</span>
          </div>
          <div className="flex items-center gap-2">
            <PlusSquare className="size-3.5 text-blue-600 dark:text-sky-400 shrink-0" />
            <span>2. เลือก <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen / Install App)</strong></span>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
        <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3.5" />
          <span>{swActive ? "Offline & Push Ready" : "PWA 2.0.0 Enabled"}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            ไว้ภายหลัง
          </button>

          {isStandalone ? (
            <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" />
              <span>ติดตั้งแล้ว</span>
            </span>
          ) : deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-semibold shadow-sm shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>ติดตั้งทันที</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowIosGuide((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-semibold shadow-sm shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{showIosGuide ? "ซ่อนวิธีติดตั้ง" : "ดูวิธีติดตั้ง"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
