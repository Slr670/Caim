"use client"

import * as React from "react"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
  TicketItem,
} from "@/lib/dashboard/calculateMetrics"

export type ConnectionStatus = "connected" | "connecting" | "fallback-polling"

export function useRealtimeDashboard() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics>(() =>
    calculateDashboardMetrics([])
  )
  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("connecting")
  const [lastSyncTime, setLastSyncTime] = React.useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Direct calculation from authoritative server tickets without local device storage skew
  const applyServerTickets = React.useCallback(
    (serverTickets?: TicketItem[]) => {
      if (typeof window === "undefined") return
      if (serverTickets && Array.isArray(serverTickets)) {
        const computed = calculateDashboardMetrics(serverTickets)
        setMetrics(computed)
        setLastSyncTime(new Date())
      }
    },
    []
  )

  // Fetch stats directly via REST fallback
  const fetchStats = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch("/api/tickets", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
        },
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.tickets)) {
          applyServerTickets(data.tickets)
          return
        }
      }
    } catch (err) {
      console.warn("Direct stats fetch warning:", err)
    } finally {
      setIsRefreshing(false)
    }
  }, [applyServerTickets])

  // Setup Real-Time Server-Sent Events (SSE) + Auto-Revalidation Fallback
  React.useEffect(() => {
    if (typeof window === "undefined") return

    // 1. Initial fast sync from API
    fetchStats()

    let eventSource: EventSource | null = null
    let fallbackPollTimer: NodeJS.Timeout | null = null

    function startFallbackPolling() {
      if (fallbackPollTimer) return
      setConnectionStatus("fallback-polling")
      fallbackPollTimer = setInterval(() => {
        fetchStats()
      }, 8000)
    }

    function stopFallbackPolling() {
      if (fallbackPollTimer) {
        clearInterval(fallbackPollTimer)
        fallbackPollTimer = null
      }
    }

    try {
      setConnectionStatus("connecting")
      eventSource = new EventSource("/api/dashboard/stream")

      eventSource.addEventListener("open", () => {
        setConnectionStatus("connected")
        stopFallbackPolling()
      })

      eventSource.addEventListener("update", (event) => {
        try {
          const freshMetrics: DashboardMetrics = JSON.parse(event.data)
          if (freshMetrics && freshMetrics.summary) {
            setMetrics(freshMetrics)
            setLastSyncTime(new Date())
            setConnectionStatus("connected")
          }
        } catch (e) {
          console.warn("Failed to parse SSE payload", e)
        }
      })

      eventSource.addEventListener("error", () => {
        // SSE disconnected or unsupported, start fallback polling
        startFallbackPolling()
      })
    } catch {
      startFallbackPolling()
    }

    // Window focus / visibility change listener for immediate revalidation
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchStats()
      }
    }
    window.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)

    // Real-time custom event listeners from SSE & cross-client sync
    const handleTicketChange = () => {
      fetchStats()
    }
    window.addEventListener("caim:realtime:ticket", handleTicketChange)
    window.addEventListener("caim:realtime:metrics", handleTicketChange)

    return () => {
      if (eventSource) {
        eventSource.close()
      }
      stopFallbackPolling()
      window.removeEventListener("caim:realtime:ticket", handleTicketChange)
      window.removeEventListener("caim:realtime:metrics", handleTicketChange)
      window.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [fetchStats])

  return {
    metrics,
    connectionStatus,
    lastSyncTime,
    isRefreshing,
    refresh: fetchStats,
  }
}
