import { NextRequest, NextResponse } from "next/server"
import { getPrecomputedDashboardMetrics } from "@/lib/dashboard/dashboardStatsService"
import { NO_CACHE_HEADERS, METRICS_MICROCACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
export const maxDuration = 15

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh =
      searchParams.get("refresh") === "true" || searchParams.get("force") === "true"

    const metrics = await getPrecomputedDashboardMetrics({ forceRefresh })
    const responseTimeMs = Math.round((performance.now() - startTime) * 100) / 100

    const cacheHeaders = forceRefresh ? NO_CACHE_HEADERS : METRICS_MICROCACHE_HEADERS

    return NextResponse.json(
      {
        success: true,
        metrics,
        ticketsCount: metrics.summary.total,
        responseTimeMs,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          ...cacheHeaders,
          "X-Response-Time": `${responseTimeMs}ms`,
        },
      }
    )
  } catch (error: unknown) {
    const errObj = error as { code?: string | number; name?: string; message?: string; stack?: string } | null
    const errorCode = errObj?.code !== undefined ? String(errObj.code) : errObj?.name || "STATS_COMPUTE_ERROR"
    const message =
      error instanceof Error ? error.message : "Failed to compute dashboard metrics"

    console.error("[API /dashboard/stats] Error:", {
      code: errorCode,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    })

    const isConfigOrSchemaError =
      /MONGODB_URI|auth|unauthorized|schema|syntax|cannot read properties/i.test(message) ||
      errorCode === "CONFIG_ERROR" ||
      errorCode === "SCHEMA_ERROR"

    return NextResponse.json(
      {
        success: false,
        code: isConfigOrSchemaError ? "SCHEMA_OR_CONFIG_ERROR" : errorCode,
        error: message,
        retryable: !isConfigOrSchemaError,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: NO_CACHE_HEADERS,
      }
    )
  }
}

