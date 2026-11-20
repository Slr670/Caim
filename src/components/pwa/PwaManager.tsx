"use client"

import * as React from "react"
import { Download, X, Share, PlusSquare, CheckCircle2, Smartphone, ShieldCheck } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed"
    platform: string
  }>
  prompt(): Promise<void>
}

const DISMISS_KEY = "claims_pwa_v2_dismissed_at"

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

  React.useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Register PWA 2.0.0 Service Worker (/sw.js)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          setSwActive(true)
          registration.update().catch(() => null)
        })
        .catch((err) => {
          console.warn("[PWA 2.0.0] Service Worker registration notice:", err)
        })
    }

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

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)
    window.addEventListener("caim:pwa:open-prompt", handleManualOpen)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
      window.removeEventListener("caim:pwa:open-prompt", handleManualOpen)
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
                ? "ทำงานในโหมดแอปติดตั้งแล้ว พร้อมระบบแคชออฟไลน์อัจฉริยะ"
                : "ใช้งานแบบแอปเต็มหน้าจอ โหลดไว และรองรับโหมดออฟไลน์ภาคสนาม"}
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
          <span>{swActive ? "Offline Cache Ready" : "PWA 2.0.0 Enabled"}</span>
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
