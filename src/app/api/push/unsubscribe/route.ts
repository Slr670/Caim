import { NextRequest, NextResponse } from "next/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import { removePushSubscription } from "@/lib/notifications/pushSubscriptionStore"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * DELETE /api/push/unsubscribe
 * Removes a registered Web Push subscription endpoint
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let endpoint = searchParams.get("endpoint")

    if (!endpoint) {
      const body = await request.json().catch(() => ({}))
      endpoint = body?.endpoint
    }

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ endpoint ที่ต้องการยกเลิกการลงทะเบียน" },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    await removePushSubscription(String(endpoint))

    return NextResponse.json(
      {
        success: true,
        endpoint,
        message: "ยกเลิกการรับการแจ้งเตือนผ่านแอป (PWA 2.0.0 Push) เรียบร้อยแล้ว",
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to unsubscribe push endpoint"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function POST(request: NextRequest) {
  return DELETE(request)
}
