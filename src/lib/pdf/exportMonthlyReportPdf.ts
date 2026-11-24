"use client"

import * as React from "react"
import type { DocumentProps } from "@react-pdf/renderer"
import type { CaimMonthlyReportData } from "./types"
import {
  triggerPdfBlobDownload,
  type GeneratedPdfBlobResult,
} from "./exportExecutiveSummaryPdf"

/**
 * Client-side dynamic Blob generator for the 4-Page CLAIMS Monthly Report PDF.
 * Uses dynamic imports for @react-pdf/renderer to prevent SSR hydration conflicts.
 */
export async function generateMonthlyReportPdfBlob(
  data: CaimMonthlyReportData
): Promise<GeneratedPdfBlobResult> {
  if (typeof window === "undefined") {
    throw new Error("PDF generation is only supported in the browser")
  }

  const [{ pdf }, { CaimMonthlyReportPDF, registerPdfFonts }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./CaimMonthlyReportPDF"),
  ])

  await registerPdfFonts()

  const element = React.createElement(CaimMonthlyReportPDF, {
    data,
  }) as unknown as React.ReactElement<DocumentProps>
  const blob = await pdf(element).toBlob()

  const normalizedNumber = data.reportNumber?.startsWith("CAIM-RPT-")
    ? data.reportNumber.replace("CAIM-RPT-", "CLAIMS-RPT-")
    : data.reportNumber || "CLAIMS-RPT"
  const sanitizedNumber = normalizedNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
  const filename = `${sanitizedNumber}-Monthly.pdf`

  return {
    blob,
    filename,
    reportNumber: normalizedNumber,
  }
}

/**
 * Client-side dynamic exporter for immediate download of the 4-Page CLAIMS Monthly Report PDF.
 */
export async function exportMonthlyReportPdf(data: CaimMonthlyReportData): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const { blob, filename } = await generateMonthlyReportPdfBlob(data)
    triggerPdfBlobDownload(blob, filename)
  } catch (error) {
    console.error("[CLAIMS Monthly Report PDF] Export failed:", error)
    throw error
  }
}
