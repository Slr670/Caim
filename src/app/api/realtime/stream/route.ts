import { NextRequest } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { calculateDashboardMetrics, TicketItem } from "@/lib/dashboard/calculateMetrics"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  async function getMetrics() {
    let tickets: TicketItem[] = []
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        tickets = await db
          .collection<TicketItem>("tickets")
          .find({})
          .sort({ createdAt: -1 })
          .toArray()
      }
    }
    return calculateDashboardMetrics(tickets)
  }

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false

      const safeEnqueue = (str: string) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(str))
        } catch {
          isClosed = true
        }
      }

      // 1. Initial snapshot push
      try {
        const initialMetrics = await getMetrics()
        safeEnqueue(`event: metrics\ndata: ${JSON.stringify(initialMetrics)}\n\n`)
      } catch (err) {
        console.error("SSE initial data error:", err)
      }

      // 2. Event listeners for instant DB mutations
      const onStationChanged = (payload: unknown) => {
        safeEnqueue(`event: station\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      const onEquipmentChanged = (payload: unknown) => {
        safeEnqueue(`event: equipment\ndata: ${JSON.stringify(payload)}\n\n`)
      }

      const onTicketChanged = async (payload: unknown) => {
        safeEnqueue(`event: ticket\ndata: ${JSON.stringify(payload)}\n\n`)
        try {
          const freshMetrics = await getMetrics()
          safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
        } catch {
          // ignore
        }
      }

      const onRmaChanged = async (payload: unknown) => {
        safeEnqueue(`event: rma\ndata: ${JSON.stringify(payload)}\n\n`)
        try {
          const freshMetrics = await getMetrics()
          safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
        } catch {
          // ignore
        }
      }

      const onMetricsChanged = async () => {
        try {
          const freshMetrics = await getMetrics()
          safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
        } catch {
          // ignore
        }
      }

      realtimeEmitter.on(REALTIME_EVENTS.STATIONS_CHANGED, onStationChanged)
      realtimeEmitter.on(REALTIME_EVENTS.EQUIPMENTS_CHANGED, onEquipmentChanged)
      realtimeEmitter.on(REALTIME_EVENTS.TICKETS_CHANGED, onTicketChanged)
      realtimeEmitter.on(REALTIME_EVENTS.RMA_CHANGED, onRmaChanged)
      realtimeEmitter.on(REALTIME_EVENTS.METRICS_CHANGED, onMetricsChanged)

      // 3. Heartbeat keepalive ping every 15s
      const pingInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(pingInterval)
          return
        }
        safeEnqueue(`: ping\n\n`)
      }, 15000)

      // 4. Background revalidation poll every 8s to catch direct external DB mutations
      let lastTicketCount = -1
      const pollInterval = setInterval(async () => {
        if (isClosed) {
          clearInterval(pollInterval)
          return
        }
        try {
          if (isMongoConfigured()) {
            const db = await getDb()
            if (db) {
              const count = await db.collection("tickets").countDocuments()
              if (count !== lastTicketCount) {
                lastTicketCount = count
                const freshMetrics = await getMetrics()
                safeEnqueue(`event: metrics\ndata: ${JSON.stringify(freshMetrics)}\n\n`)
              }
            }
          }
        } catch {
          // ignore
        }
      }, 8000)

      // Cleanup on client abort
      req.signal.addEventListener("abort", () => {
        isClosed = true
        realtimeEmitter.off(REALTIME_EVENTS.STATIONS_CHANGED, onStationChanged)
        realtimeEmitter.off(REALTIME_EVENTS.EQUIPMENTS_CHANGED, onEquipmentChanged)
        realtimeEmitter.off(REALTIME_EVENTS.TICKETS_CHANGED, onTicketChanged)
        realtimeEmitter.off(REALTIME_EVENTS.RMA_CHANGED, onRmaChanged)
        realtimeEmitter.off(REALTIME_EVENTS.METRICS_CHANGED, onMetricsChanged)
        clearInterval(pingInterval)
        clearInterval(pollInterval)
        try {
          controller.close()
        } catch {
          // ignore
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
