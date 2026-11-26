"use client"

import * as React from "react"
import useSWR, { mutate as globalMutate } from "swr"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
} from "@/lib/dashboard/calculateMetrics"

export type ConnectionStatus = "connected" | "connecting" | "fallback-polling"

export const DASHBOARD_STATS_API_KEY = "/api/dashboard/stats"
export const CLAIMS_OVERVIEW_API_KEY = "/api/claims/overview"

/**
 * Global Instant Cache Invalidator:
 * Dispatched whenever a claim, ticket, permit, or RMA is created, updated, or deleted.
 * Invalidates SWR memory caches, dispatches in-window events, and triggers cross-tab sync.
 */
export async function invalidateGlobalDashboardCache(): Promise<void> {
  if (typeof window === "undefined") return

  try {
    // 1. Immediately invalidate all SWR keys matching stats and overview
    globalMutate(DASHBOARD_STATS_API_KEY)
    globalMutate(CLAIMS_OVERVIEW_API_KEY)
    globalMutate(
      (key) =>
        typeof key === "string" &&
        (key.includes("/api/dashboard/stats") || key.includes("/api/claims/overview"))
    )

    // 2. Dispatch in-window real-time metrics invalidation event
    // NOTE: DO NOT dispatch caim:realtime:ticket here, as tickets hooks call this function,
    // which would create a synchronous infinite recursion loop!
    window.dispatchEvent(
      new CustomEvent("caim:realtime:metrics", { detail: { action: "invalidate" } })
    )

    // 3. Broadcast to other open browser tabs via BroadcastChannel
    if (typeof BroadcastChannel !== "undefined") {
      try {
        const bc = new BroadcastChannel("caim_global_sync")
        bc.postMessage({ type: "invalidate_dashboard", timestamp: Date.now() })
        bc.close()
      } catch {
        // ignore BroadcastChannel errors in unsupported environments
      }
    }
  } catch (err) {
    console.warn("[GlobalSync] Cache invalidation warning:", err)
  }
}

export interface DashboardFetchError extends Error {
  status?: number
  code?: string
  offline?: boolean
  retryable?: boolean
}

const MAX_STATS_RETRY_COUNT = 2
const BASE_STATS_RETRY_INTERVAL_MS = 5000

/**
 * Fast SWR fetcher targeting pre-aggregated stats endpoint.
 * Preserves clean URL (without volatile `?_t=` cache-buster) so PWA SW offline cache can match cleanly,
 * while attaching structured HTTP status & error metadata for smart retry throttling.
 */
const dashboardFetcher = async (url: string): Promise<DashboardMetrics> => {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  })

  if (!res.ok) {
    let errorBody: {
      error?: string
      code?: string
      offline?: boolean
      retryable?: boolean
    } | null = null
    try {
      errorBody = (await res.json()) as {
        error?: string
        code?: string
        offline?: boolean
        retryable?: boolean
      }
    } catch {
      // non-JSON response body
    }

    const err: DashboardFetchError = new Error(
      errorBody?.error ||
        `ไม่สามารถโหลดข้อมูลแดชบอร์ดได้ (HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ""})`
    )
    err.status = res.status
    err.code = errorBody?.code || `HTTP_${res.status}`
    err.offline = Boolean(errorBody?.offline) || (typeof navigator !== "undefined" && !navigator.onLine)
    err.retryable =
      errorBody?.retryable !== undefined
        ? Boolean(errorBody.retryable)
        : res.status >= 500 && !err.offline
    throw err
  }

  const data = await res.json()
  if (data.success && (data.metrics || data.summary)) {
    return (data.metrics || data) as DashboardMetrics
  }

  const payloadErr: DashboardFetchError = new Error("ข้อมูลสถิติแดชบอร์ดไม่อยู่ในรูปแบบที่ถูกต้อง")
  payloadErr.code = "INVALID_PAYLOAD"
  payloadErr.retryable = false
  throw payloadErr
}

export interface UseRealtimeDashboardOptions {
  initialMetrics?: DashboardMetrics
}

function areMetricsEqual(a?: DashboardMetrics, b?: DashboardMetrics): boolean {
  if (!a || !b) return false
  const sA = a.summary
  const sB = b.summary
  if (!sA || !sB) return false
  return (
    sA.total === sB.total &&
    sA.inProgress === sB.inProgress &&
    sA.closed === sB.closed &&
    sA.rejected === sB.rejected &&
    a.kpi?.overdueCount === b.kpi?.overdueCount
  )
}

export function useRealtimeDashboard(options: UseRealtimeDashboardOptions = {}) {
  const { initialMetrics } = options
  const retryExhaustedRef = React.useRef(false)

  // Throttled SWR Sync: caps retries at max 2 with exponential backoff (5s -> 10s)
  // and immediately halts retries on persistent config/schema failures or offline states.
  const {
    data: metrics,
    error: statsError,
    mutate,
    isValidating: isRefreshing,
  } = useSWR<DashboardMetrics, DashboardFetchError>(
    DASHBOARD_STATS_API_KEY,
    dashboardFetcher,
    {
      fallbackData: initialMetrics,
      revalidateOnMount: true,
      revalidateOnFocus: false, // Controlled explicitly via throttled listener below
      revalidateIfStale: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      focusThrottleInterval: 10000,
      keepPreviousData: true,
      shouldRetryOnError: true,
      errorRetryCount: MAX_STATS_RETRY_COUNT,
      errorRetryInterval: BASE_STATS_RETRY_INTERVAL_MS,
      onSuccess: () => {
        retryExhaustedRef.current = false
      },
      onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
        // 1. Stop immediately on persistent config/schema/client errors or offline state
        const isPersistentFailure =
          error.retryable === false ||
          error.offline === true ||
          error.code === "SCHEMA_OR_CONFIG_ERROR" ||
          error.code === "OFFLINE_NO_CACHE" ||
          (typeof error.status === "number" && error.status >= 400 && error.status < 500) ||
          (typeof navigator !== "undefined" && !navigator.onLine)

        if (isPersistentFailure || retryCount >= MAX_STATS_RETRY_COUNT) {
          retryExhaustedRef.current = true
          return
        }

        // 2. Exponential backoff: 5s (retry 0) -> 10s (retry 1), then halt
        const backoffMs = BASE_STATS_RETRY_INTERVAL_MS * Math.pow(2, retryCount)
        setTimeout(() => {
          if (typeof navigator !== "undefined" && !navigator.onLine) {
            retryExhaustedRef.current = true
            return
          }
          revalidate({ retryCount })
        }, backoffMs)
      },
    }
  )

  // Safe fallback ensuring metrics are always defined
  const safeMetrics = React.useMemo(() => {
    return metrics ?? initialMetrics ?? calculateDashboardMetrics([])
  }, [metrics, initialMetrics])

  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("connecting")
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)

  React.useEffect(() => {
    if (statsError) {
      setConnectionStatus("fallback-polling")
    } else if (metrics) {
      setConnectionStatus("connected")
    }
  }, [statsError, metrics])

  // Keep a stable ref to current metrics to compare before re-rendering
  const currentMetricsRef = React.useRef<DashboardMetrics | undefined>(metrics ?? initialMetrics)
  React.useEffect(() => {
    currentMetricsRef.current = metrics ?? initialMetrics
  }, [metrics, initialMetrics])

  // Hydrate lastSyncTime on client after mount (only once) to prevent SSR/client time differences
  const initialHydratedRef = React.useRef(false)
  React.useEffect(() => {
    if (!initialHydratedRef.current && initialMetrics) {
      initialHydratedRef.current = true
      setLastSyncTime(new Date())
    }
  }, [initialMetrics])

  // Real-Time Server-Sent Events (SSE) & Cross-Tab Broadcast Synchronization
  React.useEffect(() => {
    if (typeof window === "undefined") return

    let mutateDebounceTimer: NodeJS.Timeout | null = null
    let syncBc: BroadcastChannel | null = null

    // Debounced mutate helper to coalesce high-frequency events.
    // Skips automatic background re-fetches once retries are exhausted to prevent retry storms.
    const throttledMutate = () => {
      if (retryExhaustedRef.current) return
      if (typeof navigator !== "undefined" && !navigator.onLine) return
      if (mutateDebounceTimer) return
      mutateDebounceTimer = setTimeout(() => {
        mutateDebounceTimer = null
        if (!retryExhaustedRef.current) {
          mutate()
        }
      }, 600)
    }

    const handleOnlineRecovery = () => {
      retryExhaustedRef.current = false
      throttledMutate()
    }
    window.addEventListener("online", handleOnlineRecovery)

    const applyFreshMetrics = (payload: unknown) => {
      if (!payload || typeof payload !== "object") {
        throttledMutate()
        return
      }
      const raw = payload as Record<string, unknown>
      const freshMetrics: DashboardMetrics | undefined =
        raw.metrics && typeof raw.metrics === "object" && (raw.metrics as DashboardMetrics).summary
          ? (raw.metrics as DashboardMetrics)
          : raw.summary
          ? (raw as unknown as DashboardMetrics)
          : undefined

      if (freshMetrics && freshMetrics.summary) {
        // Only update state if metrics data actually changed to avoid infinite re-render loops
        if (!areMetricsEqual(currentMetricsRef.current, freshMetrics)) {
          mutate(freshMetrics, { revalidate: false })
          setLastSyncTime(new Date())
        }
        setConnectionStatus((prev) => (prev !== "connected" ? "connected" : prev))
      } else {
        throttledMutate()
      }
    }

    // Centralized event bus is managed by useRealtimeSync; mark connected and listen for events
    setConnectionStatus("connected")

    // Cross-tab synchronization via BroadcastChannel
    try {
      if (typeof BroadcastChannel !== "undefined") {
        syncBc = new BroadcastChannel("caim_global_sync")
        syncBc.onmessage = (event) => {
          if (event.data?.type === "invalidate_dashboard") {
            throttledMutate()
          }
        }
      }
    } catch {
      // ignore BroadcastChannel errors in unsupported environments
    }

    // Window focus / visibility listener: revalidate cache silently with throttle
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        throttledMutate()
      }
    }
    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    // Real-time custom event listeners from global sync and mutations
    const handleRealtimeMetricsEvent = (e: Event) => {
      const customEvent = e as CustomEvent<DashboardMetrics | { action?: string; metrics?: DashboardMetrics }>
      if (customEvent.detail && "action" in customEvent.detail && customEvent.detail.action === "invalidate") {
        throttledMutate()
      } else if (customEvent.detail) {
        applyFreshMetrics(customEvent.detail)
      } else {
        throttledMutate()
      }
    }

    const handleTicketChangeEvent = () => {
      throttledMutate()
    }

    window.addEventListener("caim:realtime:metrics", handleRealtimeMetricsEvent)
    window.addEventListener("caim:realtime:ticket", handleTicketChangeEvent)
    window.addEventListener("caim:realtime:rma", handleTicketChangeEvent)

    return () => {
      if (syncBc) {
        syncBc.close()
        syncBc = null
      }
      if (mutateDebounceTimer) {
        clearTimeout(mutateDebounceTimer)
        mutateDebounceTimer = null
      }
      window.removeEventListener("online", handleOnlineRecovery)
      window.removeEventListener("caim:realtime:metrics", handleRealtimeMetricsEvent)
      window.removeEventListener("caim:realtime:ticket", handleTicketChangeEvent)
      window.removeEventListener("caim:realtime:rma", handleTicketChangeEvent)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [mutate])

  /**
   * Optimized Refresh Handler:
   * Triggers an instant server re-fetch bypassing memory cache & intermediate proxies,
   * updating state immediately without waiting for background deduping windows.
   */
  const refresh = React.useCallback(async () => {
    retryExhaustedRef.current = false
    try {
      const freshData = await mutate(
        async () => dashboardFetcher(`/api/dashboard/stats?refresh=true`),
        { revalidate: false }
      )
      if (freshData) {
        setLastSyncTime(new Date())
        setConnectionStatus("connected")
      }
    } catch {
      // Error is captured by SWR statsError state for clean inline UI display
      setConnectionStatus("fallback-polling")
    }
  }, [mutate])

  return {
    metrics: safeMetrics,
    error: statsError ?? null,
    connectionStatus,
    lastSyncTime,
    isRefreshing,
    refresh,
  }
}
