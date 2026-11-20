"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { WifiOff, RefreshCw, LayoutDashboard, Radar, ShieldCheck } from "lucide-react"

export default function OfflineFallbackPage() {
  const router = useRouter()
  const [isChecking, setIsChecking] = React.useState(false)
  const [isOnline, setIsOnline] = React.useState(false)

  React.useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const handleRetry = () => {
    setIsChecking(true)
    setTimeout(() => {
      router.push("/dashboard")
      router.refresh()
    }, 350)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#0b0f19] p-4 text-slate-900 dark:text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#1e293b] p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-500/30 text-blue-600 dark:text-sky-400 shadow-inner">
          <WifiOff className="size-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/70 border border-blue-200/70 dark:border-blue-500/30 px-3 py-1 text-[11px] font-semibold text-blue-700 dark:text-sky-300">
          <ShieldCheck className="size-3.5" />
          <span>CLAIMS PWA v2.0.0 · Offline Resilience</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            อุปกรณ์ของคุณอยู่ในโหมดออฟไลน์
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            ไม่สามารถเชื่อมต่อเครือข่ายอินเทอร์เน็ตได้ในขณะนี้ ระบบ PWA 2.0.0 ได้สำรองแคชข้อมูลล่าสุดไว้แล้ว คุณสามารถเปิดดูหน้าที่เคยเข้าใช้งาน หรือลองเชื่อมต่อใหม่อีกครั้ง
          </p>
        </div>

        {isOnline && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            ตรวจพบสัญญาณอินเทอร์เน็ตแล้ว กดปุ่มด้านล่างเพื่อซิงค์ข้อมูลล่าสุด
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isChecking}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-semibold shadow-md shadow-blue-600/20 transition-all active:scale-98 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`size-4 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "กำลังตรวจสอบการเชื่อมต่อ..." : "ลองเชื่อมต่อใหม่อีกครั้ง (Retry)"}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <LayoutDashboard className="size-3.5 text-blue-600 dark:text-sky-400" />
              <span>แดชบอร์ดที่แคชไว้</span>
            </Link>
            <Link
              href="/tickets"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
            >
              <Radar className="size-3.5 text-blue-600 dark:text-sky-400" />
              <span>รายการเคลมที่แคชไว้</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
