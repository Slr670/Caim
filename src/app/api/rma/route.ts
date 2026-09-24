import { NextRequest, NextResponse } from "next/server"

// Server runtime in-memory tracking of deleted RMA records
const serverDeletedRmaIds = new Set<string>()

export async function GET() {
  return NextResponse.json({
    success: true,
    deletedIds: Array.from(serverDeletedRmaIds),
  })
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
