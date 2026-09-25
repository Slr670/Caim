"use client"

import * as React from "react"

export type RealtimeConnectionStatus = "connected" | "connecting" | "disconnected"

export interface RealtimeEventHandlers {
  onStationChange?: (data: unknown) => void
  onEquipmentChange?: (data: unknown) => void
  onTicketChange?: (data: unknown) => void
  onRmaChange?: (data: unknown) => void
  onMetricsChange?: (data: unknown) => void
}

let globalEventSource: EventSource | null = null
let connectionRefCount = 0
let currentStatus: RealtimeConnectionStatus = "disconnected"
const statusListeners = new Set<(status: RealtimeConnectionStatus) => void>()

function broadcastStatus(status: RealtimeConnectionStatus) {
  currentStatus = status
  statusListeners.forEach((fn) => fn(status))
}

function initGlobalSSE() {
  if (typeof window === "undefined") return
  if (globalEventSource) return

  broadcastStatus("connecting")

  try {
    globalEventSource = new EventSource("/api/realtime/stream")

    globalEventSource.addEventListener("open", () => {
      broadcastStatus("connected")
    })

    globalEventSource.addEventListener("station", (e) => {
      try {
        const payload = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent("caim:realtime:station", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("equipment", (e) => {
      try {
        const payload = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent("caim:realtime:equipment", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("ticket", (e) => {
      try {
        const payload = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent("caim:realtime:ticket", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("rma", (e) => {
      try {
        const payload = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent("caim:realtime:rma", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("metrics", (e) => {
      try {
        const payload = JSON.parse(e.data)
        window.dispatchEvent(new CustomEvent("caim:realtime:metrics", { detail: payload }))
      } catch {
        // ignore
      }
    })

    globalEventSource.addEventListener("error", () => {
      broadcastStatus("disconnected")
      if (globalEventSource) {
        globalEventSource.close()
        globalEventSource = null
      }
      // Reconnect after 3 seconds if there are active listeners
      if (connectionRefCount > 0) {
        setTimeout(initGlobalSSE, 3000)
      }
    })
  } catch {
    broadcastStatus("disconnected")
  }
}

function releaseGlobalSSE() {
  if (connectionRefCount <= 0 && globalEventSource) {
    globalEventSource.close()
    globalEventSource = null
    broadcastStatus("disconnected")
  }
}

/**
 * React hook to subscribe to centralized real-time changes
 */
export function useRealtimeSync(handlers?: RealtimeEventHandlers) {
  const [status, setStatus] = React.useState<RealtimeConnectionStatus>(currentStatus)
  const handlersRef = React.useRef(handlers)
  handlersRef.current = handlers

  React.useEffect(() => {
    if (typeof window === "undefined") return

    connectionRefCount++
    statusListeners.add(setStatus)
    initGlobalSSE()

    const handleStation = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onStationChange?.(custom.detail)
    }
    const handleEquipment = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onEquipmentChange?.(custom.detail)
    }
    const handleTicket = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onTicketChange?.(custom.detail)
    }
    const handleRma = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onRmaChange?.(custom.detail)
    }
    const handleMetrics = (e: Event) => {
      const custom = e as CustomEvent
      handlersRef.current?.onMetricsChange?.(custom.detail)
    }

    window.addEventListener("caim:realtime:station", handleStation)
    window.addEventListener("caim:realtime:equipment", handleEquipment)
    window.addEventListener("caim:realtime:ticket", handleTicket)
    window.addEventListener("caim:realtime:rma", handleRma)
    window.addEventListener("caim:realtime:metrics", handleMetrics)

    // Revalidate on tab focus
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (!globalEventSource || globalEventSource.readyState === EventSource.CLOSED) {
          initGlobalSSE()
        }
      }
    }
    window.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleVisibility)

    return () => {
      connectionRefCount--
      statusListeners.delete(setStatus)
      window.removeEventListener("caim:realtime:station", handleStation)
      window.removeEventListener("caim:realtime:equipment", handleEquipment)
      window.removeEventListener("caim:realtime:ticket", handleTicket)
      window.removeEventListener("caim:realtime:rma", handleRma)
      window.removeEventListener("caim:realtime:metrics", handleMetrics)
      window.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleVisibility)
      releaseGlobalSSE()
    }
  }, [])

  return {
    status,
    isConnected: status === "connected",
  }
}
