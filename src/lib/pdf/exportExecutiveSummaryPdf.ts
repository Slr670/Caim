"use client"

import * as React from "react"
import type { DocumentProps } from "@react-pdf/renderer"
import type { ExecutiveSummaryReportData } from "./types"

export interface GeneratedPdfBlobResult {
  blob: Blob
  filename: string
  reportNumber: string
}

/**
 * Triggers a browser file download from an in-memory PDF Blob and revokes the temporary URL.
 */
export function triggerPdfBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return

  const url = URL.createObjectURL(blob)
  const downloadAnchor = document.createElement("a")
  downloadAnchor.href = url
  downloadAnchor.download = filename
  downloadAnchor.style.display = "none"
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  document.body.removeChild(downloadAnchor)

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 3000)
}

/**
 * Client-side dynamic Blob generator for the Single-Page A4 Executive Summary Report PDF.
 * Uses dynamic imports for @react-pdf/renderer to prevent SSR hydration conflicts.
 */
export async function generateExecutiveSummaryPdfBlob(
  data: ExecutiveSummaryReportData
): Promise<GeneratedPdfBlobResult> {
  if (typeof window === "undefined") {
    throw new Error("PDF generation is only supported in the browser")
  }

  const [{ pdf }, { CaimExecutiveSummaryPDF }, { registerPdfFonts }] =
    await Promise.all([
      import("@react-pdf/renderer"),
      import("./CaimExecutiveSummaryPDF"),
      import("./registerFonts"),
    ])

  await registerPdfFonts()

  const element = React.createElement(CaimExecutiveSummaryPDF, {
    data,
  }) as unknown as React.ReactElement<DocumentProps>
  const blob = await pdf(element).toBlob()

  const normalizedNumber = data.reportNumber?.startsWith("CAIM-RPT-")
    ? data.reportNumber.replace("CAIM-RPT-", "CLAIMS-RPT-")
    : data.reportNumber || "CLAIMS-RPT"
  const sanitizedNumber = normalizedNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
  const filename = `${sanitizedNumber}.pdf`

  return {
    blob,
    filename,
    reportNumber: normalizedNumber,
  }
}

/**
 * Client-side dynamic exporter for immediate download of the Single-Page A4 Executive Summary Report PDF.
 */
export async function exportExecutiveSummaryPdf(
  data: ExecutiveSummaryReportData
): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const { blob, filename } = await generateExecutiveSummaryPdfBlob(data)
    triggerPdfBlobDownload(blob, filename)
  } catch (error) {
    console.error("[CLAIMS Executive Summary PDF] Export failed:", error)
    throw error
  }
}

