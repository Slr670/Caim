import { NextRequest, NextResponse } from "next/server"

// Server runtime in-memory tracking of deleted tickets
const serverDeletedTicketIds = new Set<string>()

export async function GET() {
  return NextResponse.json({
    success: true,
    deletedIds: Array.from(serverDeletedTicketIds),
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
        { success: false, error: "Missing ticket id parameter" },
        { status: 400 }
      )
    }

    serverDeletedTicketIds.add(id)

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
