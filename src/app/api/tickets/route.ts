import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { dashboardEmitter, DASHBOARD_EVENTS } from "@/lib/events/dashboardEmitter"

// Runtime fallback storage for created & deleted tickets when DB is connecting/offline
interface TicketDocument {
  id: string
  title: string
  problemDesc: string
  vendor: string
  model: string
  serialNo: string
  status: string
  statusCode: number
  date: string
  ageDays: string
  isOverdue?: boolean
  overdueText?: string
  station?: string
  province?: string
  district?: string
  subdistrict?: string
  createdAt?: string
}

const fallbackTickets: TicketDocument[] = []
const serverDeletedTicketIds = new Set<string>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<TicketDocument>("tickets")
        if (id) {
          const item = await collection.findOne({ id })
          return NextResponse.json({ success: true, ticket: item })
        }
        const tickets = await collection.find({}).sort({ createdAt: -1 }).toArray()
        return NextResponse.json({
          success: true,
          source: "mongodb",
          tickets,
          deletedIds: Array.from(serverDeletedTicketIds),
        })
      }
    }

    // Fallback if MongoDB is not configured or in transition
    if (id) {
      const found = fallbackTickets.find((t) => t.id === id)
      return NextResponse.json({ success: true, ticket: found || null })
    }

    return NextResponse.json({
      success: true,
      source: "local",
      tickets: fallbackTickets.filter((t) => !serverDeletedTicketIds.has(t.id)),
      deletedIds: Array.from(serverDeletedTicketIds),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tickets"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || !body.title) {
      return NextResponse.json(
        { success: false, error: "Missing required ticket information" },
        { status: 400 }
      )
    }

    const newTicket: TicketDocument = {
      id: body.id || `TICKET-${Date.now()}`,
      title: body.title,
      problemDesc: body.problemDesc || "",
      vendor: body.vendor || "Other",
      model: body.model || "",
      serialNo: body.serialNo || "",
      status: body.status || "รับแจ้ง",
      statusCode: body.statusCode || 1,
      date: body.date || new Date().toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      ageDays: body.ageDays || "0 วัน",
      isOverdue: Boolean(body.isOverdue),
      overdueText: body.overdueText || "",
      station: body.station || "",
      province: body.province || "",
      district: body.district || "",
      subdistrict: body.subdistrict || "",
      createdAt: new Date().toISOString(),
    }

    let savedToMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection<TicketDocument>("tickets").insertOne(newTicket)
        savedToMongo = true
      }
    }

    // Also cache in fallback store
    fallbackTickets.unshift(newTicket)

    // Broadcast instant update to all connected dashboard SSE subscribers
    dashboardEmitter.emit(DASHBOARD_EVENTS.TICKETS_CHANGED, { action: "create", ticket: newTicket })

    return NextResponse.json({
      success: true,
      ticket: newTicket,
      savedTo: savedToMongo ? "mongodb" : "local-memory",
      message: "บันทึกเคสแจ้งเคลมเรียบร้อยแล้ว",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create ticket"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ticket id" },
        { status: 400 }
      )
    }

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("tickets").updateOne({ id }, { $set: updates })
      }
    }

    const idx = fallbackTickets.findIndex((t) => t.id === id)
    if (idx !== -1) {
      fallbackTickets[idx] = { ...fallbackTickets[idx], ...updates }
    }

    dashboardEmitter.emit(DASHBOARD_EVENTS.TICKETS_CHANGED, { action: "update", id, updates })

    return NextResponse.json({
      success: true,
      message: `อัปเดตข้อมูลเคส ${id} เรียบร้อยแล้ว`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update ticket"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get("id")

    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = body.id
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing ticket id parameter" },
        { status: 400 }
      )
    }

    serverDeletedTicketIds.add(id)

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("tickets").deleteOne({ id })
      }
    }

    const idx = fallbackTickets.findIndex((t) => t.id === id)
    if (idx !== -1) {
      fallbackTickets.splice(idx, 1)
    }

    dashboardEmitter.emit(DASHBOARD_EVENTS.TICKETS_CHANGED, { action: "delete", id })

    return NextResponse.json({
      success: true,
      id,
      message: `Ticket record ${id} has been permanently deleted from database.`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete ticket record"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
