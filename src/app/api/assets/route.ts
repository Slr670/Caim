import { NextRequest, NextResponse } from "next/server"
import { GET as getEquipments, POST as postEquipments, PUT as putEquipments, DELETE as deleteEquipments } from "../equipments/route"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const res = await getEquipments(request)
  const data = await res.json()
  // Ensure backward compatibility: return 'assets' property mapping to equipments
  if (data && data.equipments && !data.assets) {
    data.assets = data.equipments
  }
  return NextResponse.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const res = await postEquipments(request)
  const data = await res.json()
  if (data && data.equipment && !data.asset) {
    data.asset = data.equipment
  }
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(request: NextRequest) {
  return putEquipments(request)
}

export async function DELETE(request: NextRequest) {
  return deleteEquipments(request)
}
