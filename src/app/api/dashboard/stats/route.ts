import { NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { calculateDashboardMetrics, TicketItem } from "@/lib/dashboard/calculateMetrics"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { getPersistentTickets } from "@/lib/storage/serverTicketStorage"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function GET() {
  try {
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

    // If MongoDB didn't return any, use server persistent tickets file
    if (tickets.length === 0) {
      tickets = getPersistentTickets() as unknown as TicketItem[]
    }

    const metrics = calculateDashboardMetrics(tickets)

    return NextResponse.json(
      {
        success: true,
        metrics,
        ticketsCount: tickets.length,
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to compute dashboard metrics"
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_CACHE_HEADERS })
  }
}
