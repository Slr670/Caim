import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { TicketDocument, EquipmentDocument, StationDocument } from "@/types/database"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

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
          return NextResponse.json({ success: true, ticket: item }, { headers: NO_CACHE_HEADERS })
        }
        const tickets = await collection.find({}).sort({ createdAt: -1 }).toArray()
        return NextResponse.json(
          {
            success: true,
            source: "mongodb",
            tickets,
            deletedIds: Array.from(serverDeletedTicketIds),
          },
          { headers: NO_CACHE_HEADERS }
        )
      }
    }

    if (id) {
      const found = fallbackTickets.find((t) => t.id === id)
      return NextResponse.json({ success: true, ticket: found || null }, { headers: NO_CACHE_HEADERS })
    }

    return NextResponse.json(
      {
        success: true,
        source: "local",
        tickets: fallbackTickets.filter((t) => !serverDeletedTicketIds.has(t.id)),
        deletedIds: Array.from(serverDeletedTicketIds),
      },
      { headers: NO_CACHE_HEADERS }
    )
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

    const ticketId = body.id || `CLM-${Date.now().toString().slice(-4)}`
    const nowIso = new Date().toISOString()
    const serialNo = String(body.serialNo || "").trim()

    let stationId = body.stationId ? String(body.stationId).trim() : undefined
    let stationName = body.station ? String(body.station).trim() : undefined
    let province = body.province ? String(body.province).trim() : undefined
    let district = body.district ? String(body.district).trim() : undefined
    let subdistrict = body.subdistrict ? String(body.subdistrict).trim() : undefined

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        // 1. Resolve Station Reference if stationId is missing but station name is provided
        if (!stationId && stationName) {
          const foundStation = await db.collection<StationDocument>("stations").findOne({
            name: { $regex: new RegExp(`^${stationName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          })
          if (foundStation) {
            stationId = foundStation.id
            province = province || foundStation.province
            district = district || foundStation.district
            subdistrict = subdistrict || foundStation.subdistrict
          }
        } else if (stationId && !stationName) {
          const foundStation = await db.collection<StationDocument>("stations").findOne({ id: stationId })
          if (foundStation) {
            stationName = foundStation.name
            province = province || foundStation.province
            district = district || foundStation.district
            subdistrict = subdistrict || foundStation.subdistrict
          }
        }

        // 2. Validate and Update Equipment Reference
        if (serialNo && serialNo !== "-") {
          const equipCol = db.collection<EquipmentDocument>("equipments")
          await equipCol.updateOne(
            { serial: { $regex: new RegExp(`^${serialNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            {
              $set: {
                status: "in_claim",
                currentClaimId: ticketId,
                stationId: stationId || undefined,
                stationName: stationName || undefined,
                updatedAt: nowIso,
              },
            }
          )
        }

        // 3. Insert Ticket Document
        const newTicketDoc: TicketDocument = {
          id: ticketId,
          title: body.title,
          problemDesc: body.problemDesc || "",
          vendor: body.vendor || "Other",
          model: body.model || "-",
          serialNo: serialNo || "-",
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
          stationId,
          station: stationName,
          province,
          district,
          subdistrict,
          createdAt: nowIso,
          updatedAt: nowIso,
        }

        await db.collection<TicketDocument>("tickets").insertOne(newTicketDoc)

        // 4. Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-CLAIM-OPEN-${Date.now()}`,
          action: "CLAIM_OPENED",
          targetType: "ticket",
          targetId: ticketId,
          details: {
            title: newTicketDoc.title,
            serialNo: newTicketDoc.serialNo,
            stationId: newTicketDoc.stationId,
            station: newTicketDoc.station,
            status: newTicketDoc.status,
          },
          timestamp: nowIso,
        })

        // 5. Real-Time Broadcast
        realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
          type: "ticket",
          action: "create",
          data: newTicketDoc,
          timestamp: nowIso,
        })
        realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
          type: "metrics",
          action: "update",
          data: {},
          timestamp: nowIso,
        })

        return NextResponse.json(
          {
            success: true,
            ticket: newTicketDoc,
            savedTo: "mongodb",
            message: "เปิดเคสแจ้งเคลมและบันทึกประวัติการทำรายการเรียบร้อยแล้ว",
          },
          { status: 201, headers: NO_CACHE_HEADERS }
        )
      }
    }

    // Fallback store
    const fallbackDoc: TicketDocument = {
      id: ticketId,
      title: body.title,
      problemDesc: body.problemDesc || "",
      vendor: body.vendor || "Other",
      model: body.model || "-",
      serialNo: serialNo || "-",
      status: body.status || "รับแจ้ง",
      statusCode: body.statusCode || 1,
      date: body.date || new Date().toLocaleDateString("th-TH"),
      ageDays: body.ageDays || "0 วัน",
      stationId,
      station: stationName,
      province,
      district,
      subdistrict,
      createdAt: nowIso,
    }
    fallbackTickets.unshift(fallbackDoc)

    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "create",
      data: fallbackDoc,
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        ticket: fallbackDoc,
        savedTo: "local-memory",
        message: "บันทึกเคสแจ้งเคลมเรียบร้อยแล้ว",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
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

    const nowIso = new Date().toISOString()
    const setFields = { ...updates, updatedAt: nowIso }

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("tickets").updateOne({ id }, { $set: setFields })

        // If status changed to closed ("ปิดเคส"), free up equipment
        if (updates.status === "ปิดเคส") {
          const currentTicket = await db.collection<TicketDocument>("tickets").findOne({ id })
          if (currentTicket && currentTicket.serialNo) {
            await db.collection<EquipmentDocument>("equipments").updateOne(
              { serial: currentTicket.serialNo },
              { $set: { status: "active", currentClaimId: undefined, updatedAt: nowIso } }
            )
          }
        }

        // Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-CLAIM-UPD-${Date.now()}`,
          action: "CLAIM_UPDATED",
          targetType: "ticket",
          targetId: id,
          details: updates,
          timestamp: nowIso,
        })
      }
    }

    const idx = fallbackTickets.findIndex((t) => t.id === id)
    if (idx !== -1) {
      fallbackTickets[idx] = { ...fallbackTickets[idx], ...setFields }
    }

    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "update",
      data: { id, updates: setFields },
      timestamp: nowIso,
    })
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      data: {},
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        message: `อัปเดตข้อมูลเคส ${id} เรียบร้อยแล้ว`,
      },
      { headers: NO_CACHE_HEADERS }
    )
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

    const nowIso = new Date().toISOString()
    serverDeletedTicketIds.add(id)

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const currentTicket = await db.collection<TicketDocument>("tickets").findOne({ id })
        if (currentTicket && currentTicket.serialNo) {
          // Free equipment
          await db.collection<EquipmentDocument>("equipments").updateOne(
            { serial: currentTicket.serialNo },
            { $set: { status: "active", currentClaimId: undefined, updatedAt: nowIso } }
          )
        }

        await db.collection("tickets").deleteOne({ id })

        // Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-CLAIM-DEL-${Date.now()}`,
          action: "CLAIM_DELETED",
          targetType: "ticket",
          targetId: id,
          details: { deletedAt: nowIso },
          timestamp: nowIso,
        })
      }
    }

    const idx = fallbackTickets.findIndex((t) => t.id === id)
    if (idx !== -1) {
      fallbackTickets.splice(idx, 1)
    }

    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "delete",
      data: { id },
      timestamp: nowIso,
    })
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      data: {},
      timestamp: nowIso,
    })

    return NextResponse.json(
      {
        success: true,
        id,
        message: `Ticket record ${id} has been permanently deleted from database.`,
        timestamp: nowIso,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete ticket record"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
