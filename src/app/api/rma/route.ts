import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"

interface RmaDocument {
  id: string
  rmaNo: string
  status: string
  vendor: string
  destination: string
  sentDate: string
  trackNo: string
  carrier: string
  notes?: string
  ticketId?: string
  createdAt?: string
}

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
        { success: false, error: "Missing required RMA data" },
        { status: 400 }
      )
    }

    const newRma: RmaDocument = {
      id: body.id || `RMA-${Date.now()}`,
      rmaNo: body.rmaNo,
      status: body.status || "กำลังดำเนินการ",
      vendor: body.vendor || "N/A",
      destination: body.destination || "ต่างประเทศ",
      sentDate: body.sentDate || new Date().toLocaleDateString("th-TH"),
      trackNo: body.trackNo || "-",
      carrier: body.carrier || "-",
      notes: body.notes || "",
      ticketId: body.ticketId || "",
      createdAt: new Date().toISOString(),
    }

    let savedToMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection<RmaDocument>("rma").insertOne(newRma)
        savedToMongo = true
      }
    }

    fallbackRmaList.unshift(newRma)

    return NextResponse.json({
      success: true,
      rma: newRma,
      savedTo: savedToMongo ? "mongodb" : "local-memory",
      message: "บันทึกใบส่งเคลมต่างประเทศเรียบร้อยแล้ว",
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save RMA"
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

    serverDeletedRmaIds.add(id)

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        await db.collection("rma").deleteOne({ id })
      }
    }

    const idx = fallbackRmaList.findIndex((r) => r.id === id)
    if (idx !== -1) {
      fallbackRmaList.splice(idx, 1)
    }

    return NextResponse.json({
      success: true,
      id,
      message: `RMA record ${id} has been permanently deleted from database.`,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete RMA record"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
