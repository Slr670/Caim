import { NextRequest } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { calculateDashboardMetrics, TicketItem } from "@/lib/dashboard/calculateMetrics"
import { dashboardEmitter, DASHBOARD_EVENTS } from "@/lib/events/dashboardEmitter"

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
        const initial = await getMetrics()
        safeEnqueue(`event: update\ndata: ${JSON.stringify(initial)}\n\n`)
      } catch (err) {
        console.error("SSE initial data error:", err)
      }

      // 2. Event listener for instant DB updates
      const onTicketsChanged = async () => {
        if (isClosed) return
        try {
          const updated = await getMetrics()
          safeEnqueue(`event: update\ndata: ${JSON.stringify(updated)}\n\n`)
        } catch (err) {
          console.error("SSE emit error:", err)
        }
      }

      dashboardEmitter.on(DASHBOARD_EVENTS.TICKETS_CHANGED, onTicketsChanged)

      // 3. Heartbeat keepalive ping every 20s
      const pingInterval = setInterval(() => {
        if (isClosed) {
          clearInterval(pingInterval)
          return
        }
        safeEnqueue(`: ping\n\n`)
      }, 20000)

      // 4. Background revalidation poll every 10s to capture external MongoDB mutations
      const pollInterval = setInterval(async () => {
        if (isClosed) {
          clearInterval(pollInterval)
          return
        }
        try {
          const fresh = await getMetrics()
          safeEnqueue(`event: update\ndata: ${JSON.stringify(fresh)}\n\n`)
        } catch {
          // ignore
        }
      }, 10000)

      // Cleanup on client abort
      req.signal.addEventListener("abort", () => {
        isClosed = true
        dashboardEmitter.off(DASHBOARD_EVENTS.TICKETS_CHANGED, onTicketsChanged)
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
