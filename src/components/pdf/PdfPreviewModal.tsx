"use client"

import * as React from "react"
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react"
import { triggerPdfBlobDownload } from "@/lib/pdf/exportExecutiveSummaryPdf"

export interface PdfPreviewModalProps {
  open: boolean
  onClose: () => void
  reportTitle: string
  filename: string
  blob: Blob | null
  isLoading: boolean
  errorMessage?: string | null
  onRetry?: () => void
  locale?: string
}

export function PdfPreviewModal({
  open,
  onClose,
  reportTitle,
  filename,
  blob,
  isLoading,
  errorMessage,
  onRetry,
  locale = "th",
}: PdfPreviewModalProps) {
  const [blobUrl, setBlobUrl] = React.useState<string | null>(null)

  // Manage Blob URL creation and strict revocation on modal close or unmount
  React.useEffect(() => {
    if (!open || !blob) {
      setBlobUrl(null)
      return
    }

    const url = URL.createObjectURL(blob)
    setBlobUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [open, blob])

  // Keyboard Escape dismissal and body scroll lock while modal is open
  React.useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  const handleDownload = React.useCallback(() => {
    if (!blob) return
    triggerPdfBlobDownload(blob, filename || "CLAIMS-RPT.pdf")
  }, [blob, filename])

  const handleOpenNewTab = React.useCallback(() => {
    if (!blobUrl) return
    window.open(blobUrl, "_blank", "noopener,noreferrer")
  }, [blobUrl])

  if (!open) return null

  const fullHeaderTitle = filename
    ? `${reportTitle} — ${filename}`
    : reportTitle

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={fullHeaderTitle}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2.5 backdrop-blur-xs sm:p-5 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        {/* Modal Header & Action Controls */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400">
              <FileText className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 sm:text-base">
                {fullHeaderTitle}
              </h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {locale === "th"
                  ? "ตรวจสอบความถูกต้องของเอกสาร PDF ก่อนบันทึกไฟล์ลงเครื่อง"
                  : "Inspect the generated PDF document before saving"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isLoading || !blob}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>{locale === "th" ? "ดาวน์โหลด PDF" : "Download PDF"}</span>
            </button>

            {/* Open in New Tab Button (Mobile / PWA Fallback) */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={isLoading || !blobUrl}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
              <span>{locale === "th" ? "เปิดแท็บใหม่" : "Open in New Tab"}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:border-rose-800 dark:hover:text-rose-400 cursor-pointer"
            >
              <X className="size-3.5" />
              <span>{locale === "th" ? "ปิด" : "Close"}</span>
            </button>
          </div>
        </div>

        {/* PDF Viewport Body */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950">
          {isLoading ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <Loader2 className="size-7 animate-spin text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {locale === "th"
                    ? "กำลังประมวลผลและสร้างตัวอย่างรายงาน PDF..."
                    : "Rendering PDF preview..."}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === "th"
                    ? "ระบบกำลังดึงข้อมูลล่าสุดและจัดหน้ากระดาษมาตรฐาน A4"
                    : "Fetching live claims data and formatting A4 layout"}
                </p>
              </div>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <AlertCircle className="size-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {locale === "th"
                    ? "ไม่สามารถสร้างตัวอย่างเอกสาร PDF ได้"
                    : "Failed to generate PDF preview"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {errorMessage}
                </p>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  <span>{locale === "th" ? "ลองใหม่อีกครั้ง" : "Try Again"}</span>
                </button>
              )}
            </div>
          ) : blobUrl ? (
            <iframe
              src={blobUrl}
              title={fullHeaderTitle}
              className="w-full h-full border-0"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
