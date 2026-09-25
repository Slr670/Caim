import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { RmaDocument, EquipmentDocument, TicketDocument } from "@/types/database"

export const dynamic = "force-dynamic"

const fallbackRmaList: RmaDocument[] = []
const serverDeletedRmaIds = new Set<string>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<RmaDocument>("rma")
        if (id) {
          const item = await collection.findOne({ id })
          return NextResponse.json({ success: true, rma: item })
        }
        const list = await collection.find({}).sort({ createdAt: -1 }).toArray()
        return NextResponse.json({
          success: true,
          source: "mongodb",
          items: list,
          deletedIds: Array.from(serverDeletedRmaIds),
        })
      }
    }

    if (id) {
      const found = fallbackRmaList.find((r) => r.id === id)
      return NextResponse.json({ success: true, rma: found || null })
    }

    return NextResponse.json({
      success: true,
      source: "local",
      items: fallbackRmaList.filter((r) => !serverDeletedRmaIds.has(r.id)),
      deletedIds: Array.from(serverDeletedRmaIds),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch RMA items"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || !body.rmaNo) {
      return NextResponse.json(
        { success: false, error: "Missing required RMA data (rmaNo)" },
        { status: 400 }
      )
    }

    const rmaId = body.id || `RMA-${Date.now()}`
    const serialNo = String(body.serialNo || "").trim()
    const ticketId = body.ticketId ? String(body.ticketId).trim() : undefined
    const nowIso = new Date().toISOString()

    const newRma: RmaDocument = {
      id: rmaId,
      rmaNo: body.rmaNo,
      caseName: body.caseName || "",
      ticketId,
      serialNo,
      vendor: body.vendor || "N/A",
      model: body.model || "-",
      destination: body.destination || "ต่างประเทศ",
      status: body.status || "กำลังดำเนินการ",
      statusBadge: body.statusBadge || "in_progress",
      statusBadgeText: body.statusBadgeText || "กำลังดำเนินการ",
      currentStageNumber: body.currentStageNumber || 1,
      totalStages: body.totalStages || 8,
      currentStageName: body.currentStageName || "1. ระบบใบ RMA",
      stageWaitDays: body.stageWaitDays || "ค้างมา 0 วัน",
      openDate: body.openDate || new Date().toLocaleDateString("th-TH"),
      sentDate: body.sentDate || new Date().toLocaleDateString("th-TH"),
      trackNo: body.trackNo || "-",
      carrier: body.carrier || "-",
      notes: body.notes || body.remarks || "",
      remarks: body.remarks || body.notes || "",
      totalDays: body.totalDays || "0 วัน",
      penaltyDays: body.penaltyDays || "0 วัน",
      penaltyStandard: body.penaltyStandard || "จาก 14 วัน",
      isOverduePenalty: Boolean(body.isOverduePenalty),
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    let savedToMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        // 1. Insert RMA record
        await db.collection<RmaDocument>("rma").insertOne(newRma)

        // 2. Link with ticket if ticketId provided
        if (ticketId) {
          await db.collection<TicketDocument>("tickets").updateOne(
            { id: ticketId },
            { $set: { rmaId, updatedAt: nowIso } }
          )
        }

        // 3. Update Equipment status to in_rma
        if (serialNo) {
          await db.collection<EquipmentDocument>("equipments").updateOne(
            { serial: { $regex: new RegExp(`^${serialNo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
            { $set: { status: "in_rma", currentRmaId: rmaId, updatedAt: nowIso } }
          )
        }

        // 4. Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-RMA-DISPATCH-${Date.now()}`,
          action: "RMA_DISPATCHED",
          targetType: "rma",
          targetId: rmaId,
          details: {
            rmaNo: newRma.rmaNo,
            ticketId,
            serialNo,
            vendor: newRma.vendor,
            destination: newRma.destination,
          },
          timestamp: nowIso,
        })

        savedToMongo = true
      }
    }

    fallbackRmaList.unshift(newRma)

    // Broadcast real-time update
    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "create",
      data: newRma,
      timestamp: nowIso,
    })

    return NextResponse.json({
      success: true,
      rma: newRma,
      savedTo: savedToMongo ? "mongodb" : "local-memory",
      message: "บันทึกใบส่งเคลมต่างประเทศและประวัติการส่งซ่อมเรียบร้อยแล้ว",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save RMA"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing RMA id for update" },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    const setFields = { ...updates, updatedAt: nowIso }

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("rma").updateOne({ id }, { $set: setFields })

        // If returned or completed, update equipment status
        if (updates.statusBadge === "returned" || updates.status === "เสร็จสิ้น" || updates.status === "ของกลับถึงแล้ว") {
          const currentRma = await db.collection<RmaDocument>("rma").findOne({ id })
          if (currentRma && currentRma.serialNo) {
            await db.collection<EquipmentDocument>("equipments").updateOne(
              { serial: currentRma.serialNo },
              { $set: { status: "active", currentRmaId: undefined, updatedAt: nowIso } }
            )
          }
        }

        // Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-RMA-UPD-${Date.now()}`,
          action: "RMA_UPDATED",
          targetType: "rma",
          targetId: id,
          details: updates,
          timestamp: nowIso,
        })
      }
    }

    const idx = fallbackRmaList.findIndex((r) => r.id === id)
    if (idx !== -1) {
      fallbackRmaList[idx] = { ...fallbackRmaList[idx], ...setFields }
    }

    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "update",
      data: { id, updates: setFields },
      timestamp: nowIso,
    })

    return NextResponse.json({
      success: true,
      message: `อัปเดตข้อมูลใบส่งซ่อมต่างประเทศ ${id} เรียบร้อยแล้ว`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update RMA record"
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
        { success: false, error: "Missing RMA id parameter" },
        { status: 400 }
      )
    }

    const nowIso = new Date().toISOString()
    serverDeletedRmaIds.add(id)

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const currentRma = await db.collection<RmaDocument>("rma").findOne({ id })
        if (currentRma && currentRma.serialNo) {
          await db.collection<EquipmentDocument>("equipments").updateOne(
            { serial: currentRma.serialNo },
            { $set: { status: "active", currentRmaId: undefined, updatedAt: nowIso } }
          )
        }

        await db.collection("rma").deleteOne({ id })

        // Record Transaction Log
        await db.collection("transaction_logs").insertOne({
          id: `TX-RMA-DEL-${Date.now()}`,
          action: "RMA_DELETED",
          targetType: "rma",
          targetId: id,
          details: { deletedAt: nowIso },
          timestamp: nowIso,
        })
      }
    }

    const idx = fallbackRmaList.findIndex((r) => r.id === id)
    if (idx !== -1) {
      fallbackRmaList.splice(idx, 1)
    }

    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "delete",
      data: { id },
      timestamp: nowIso,
    })

    return NextResponse.json({
      success: true,
      id,
      message: `RMA record ${id} has been permanently deleted from database.`,
      timestamp: nowIso,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete RMA record"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
