"use client"

import * as React from "react"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
  TicketItem,
} from "@/lib/dashboard/calculateMetrics"

export type ConnectionStatus = "connected" | "connecting" | "fallback-polling"

const INITIAL_FALLBACK_TICKETS: TicketItem[] = [
  {
    id: "1",
    title: "หัวข้อเลขที่เคลม",
    problemDesc: "หัวข้ออาการเสีย ปัญหาที่พบ",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "รับแจ้ง",
    statusCode: 1,
    date: "13 ก.ย. 2569",
    ageDays: "10 วัน",
    isOverdue: false,
  },
  {
    id: "2",
    title: "ทดสอบระบบ",
    problemDesc: "ทดสอบระบบทดสอบระบบ",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "ปิดเคส",
    statusCode: 5,
    date: "10 ก.ย. 2569",
    ageDays: "19 วัน",
    isOverdue: false,
  },
  {
    id: "3",
    title: "test2",
    problemDesc: "testtest",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "ส่งศูนย์",
    statusCode: 2,
    date: "9 ก.ย. 2569",
    ageDays: "13 วัน",
    isOverdue: false,
  },
  {
    id: "4",
    title: "FORTH-2026-002",
    problemDesc: "บอร์ดเสีย",
    vendor: "Huawei",
    model: "PAC80S12-CN",
    serialNo: "2102131835USR8305867",
    status: "ส่งศูนย์",
    statusCode: 2,
    date: "9 ก.ย. 2569",
    ageDays: "13 วัน",
    isOverdue: true,
    overdueText: "เกินกำหนด 8 วัน",
  },
  {
    id: "5",
    title: "test",
    problemDesc: "testtest",
    vendor: "Huawei",
    model: "PAC80S12-CN",
    serialNo: "2102131835USR8305867",
    status: "ปฏิเสธเคลม",
    statusCode: 6,
    date: "8 ก.ย. 2569",
    ageDays: "15 วัน",
    isOverdue: false,
  },
]

export function useRealtimeDashboard() {
  const [metrics, setMetrics] = React.useState<DashboardMetrics>(() =>
    calculateDashboardMetrics(INITIAL_FALLBACK_TICKETS)
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
