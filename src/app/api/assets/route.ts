import { NextRequest, NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { ASSETS } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/assetsData"

export const dynamic = "force-dynamic"

export interface AssetDocument {
  serial: string
  vendor: string
  model: string
  category: string
  name?: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

// Runtime in-memory fallback store when DB is offline or in transition
const fallbackAssets: AssetDocument[] = []
const serverDeletedSerials = new Set<string>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serial = searchParams.get("serial")
    const search = searchParams.get("search")?.toLowerCase().trim()
    const vendor = searchParams.get("vendor")
    const category = searchParams.get("category")

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<AssetDocument>("assets")

        if (serial) {
          const item = await collection.findOne({
            serial: { $regex: new RegExp(`^${serial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
          })
          if (item) {
            return NextResponse.json({ success: true, asset: item, source: "mongodb" })
          }
        }

        // Build query
        const query: Record<string, unknown> = {}
        if (vendor && vendor !== "all") {
          query.vendor = vendor
        }
        if (category && category !== "all") {
          query.category = category
        }
        if (search) {
          const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          query.$or = [
            { serial: { $regex: escapedSearch, $options: "i" } },
            { vendor: { $regex: escapedSearch, $options: "i" } },
            { model: { $regex: escapedSearch, $options: "i" } },
            { category: { $regex: escapedSearch, $options: "i" } },
            { name: { $regex: escapedSearch, $options: "i" } },
            { description: { $regex: escapedSearch, $options: "i" } },
          ]
        }

        const assets = await collection.find(query).sort({ createdAt: -1, _id: -1 }).toArray()

        return NextResponse.json({
          success: true,
          source: "mongodb",
          total: assets.length,
          assets,
          deletedSerials: Array.from(serverDeletedSerials),
        })
      }
    }

    // Fallback if MongoDB is not reachable
    let list = [...fallbackAssets, ...ASSETS.filter((a) => !fallbackAssets.some((f) => f.serial.toUpperCase() === a.serial.toUpperCase()))]
    list = list.filter((a) => !serverDeletedSerials.has(a.serial.toUpperCase()))

    if (serial) {
      const found = list.find((a) => a.serial.toUpperCase() === serial.toUpperCase())
      return NextResponse.json({ success: true, asset: found || null, source: "local" })
    }

    if (vendor && vendor !== "all") {
      list = list.filter((a) => a.vendor === vendor)
    }
    if (category && category !== "all") {
      list = list.filter((a) => a.category === category)
    }
    if (search) {
      list = list.filter((a) => {
        return (
          a.serial.toLowerCase().includes(search) ||
          a.vendor.toLowerCase().includes(search) ||
          a.model.toLowerCase().includes(search) ||
          a.category.toLowerCase().includes(search) ||
          (a.name && a.name.toLowerCase().includes(search)) ||
          (a.description && a.description.toLowerCase().includes(search))
        )
      })
    }

    return NextResponse.json({
      success: true,
      source: "local",
      total: list.length,
      assets: list,
      deletedSerials: Array.from(serverDeletedSerials),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch assets"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request payload" },
        { status: 400 }
      )
    }

    const serial = String(body.serial || "").trim()
    const vendor = String(body.vendor || "").trim()
    const model = String(body.model || "-").trim()
    const category = String(body.category || "อื่นๆ").trim()
    const name = body.name ? String(body.name).trim() : undefined
    const description = body.description ? String(body.description).trim() : undefined

    if (!serial) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุหมายเลขอุปกรณ์ (Serial Number)" },
        { status: 400 }
      )
    }

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุยี่ห้อ (Vendor)" },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()
    const assetDoc: AssetDocument = {
      serial,
      vendor,
      model: model || "-",
      category: category || "อื่นๆ",
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      createdAt: now,
      updatedAt: now,
    }

    let savedToMongo = false

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<AssetDocument>("assets")

        // Upsert by serial
        await collection.updateOne(
          { serial: { $regex: new RegExp(`^${serial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
          { $set: assetDoc },
          { upsert: true }
        )
        savedToMongo = true
      }
    }

    // Also update runtime fallback memory
    const existingIndex = fallbackAssets.findIndex(
      (a) => a.serial.toUpperCase() === serial.toUpperCase()
    )
    if (existingIndex >= 0) {
      fallbackAssets[existingIndex] = assetDoc
    } else {
      fallbackAssets.unshift(assetDoc)
    }
    serverDeletedSerials.delete(serial.toUpperCase())

    return NextResponse.json(
      {
        success: true,
        asset: assetDoc,
        savedTo: savedToMongo ? "mongodb" : "local-memory",
        message: "บันทึกข้อมูลอุปกรณ์สำเร็จแล้ว",
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create or update asset"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  return POST(request)
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serial = searchParams.get("serial")

    if (!serial) {
      return NextResponse.json(
        { success: false, error: "Serial number is required for deletion" },
        { status: 400 }
      )
    }

    const trimmedSerial = serial.trim()
    serverDeletedSerials.add(trimmedSerial.toUpperCase())

    let deletedFromMongo = false
    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        const collection = db.collection<AssetDocument>("assets")
        await collection.deleteOne({
          serial: { $regex: new RegExp(`^${trimmedSerial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        })
        deletedFromMongo = true
      }
    }

    const idx = fallbackAssets.findIndex((a) => a.serial.toUpperCase() === trimmedSerial.toUpperCase())
    if (idx >= 0) {
      fallbackAssets.splice(idx, 1)
    }

    return NextResponse.json({
      success: true,
      serial: trimmedSerial,
      deletedFrom: deletedFromMongo ? "mongodb" : "local-memory",
      message: `ลบอุปกรณ์ ${trimmedSerial} เรียบร้อยแล้ว`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete asset"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
