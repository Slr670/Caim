import { NextRequest, NextResponse } from "next/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  getPushSubscriptions,
  savePushSubscription,
} from "@/lib/notifications/pushSubscriptionStore"
import {
  getVapidPublicKey,
  sendPushToSubscription,
} from "@/lib/notifications/webPushService"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/push/subscribe
 * Returns the public VAPID key and active subscription count for client registration
 */
export async function GET() {
  try {
    const subs = await getPushSubscriptions()
    return NextResponse.json(
      {
        success: true,
        publicKey: getVapidPublicKey(),
        activeSubscriptions: subs.length,
        pwaVersion: "2.0.0",
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch VAPID key"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * POST /api/push/subscribe
 * Registers an active browser PushSubscription for PWA 2.0.0 Web Push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sub = body?.subscription || body

    if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูล Push Subscription ไม่ครบถ้วน (ต้องระบุ endpoint และ keys.p256dh / keys.auth)",
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const userAgent = request.headers.get("user-agent") || undefined
    const saved = await savePushSubscription({
      endpoint: String(sub.endpoint),
      expirationTime: sub.expirationTime ?? null,
      keys: {
        p256dh: String(sub.keys.p256dh),
        auth: String(sub.keys.auth),
      },
      userAgent,
    })

    if (body?.sendWelcome === true) {
      await sendPushToSubscription(saved, {
        title: "[CLAIMS] เปิดใช้งานการแจ้งเตือนผ่านแอปสำเร็จ",
        body: "คุณจะได้รับการแจ้งเตือนแบบเรียลไทม์เมื่อมีการเปิดเคสใหม่หรืออัปเดตสถานะงานเคลม",
        tag: "claims-push-welcome",
        data: { url: "/dashboard" },
      })
    }

    return NextResponse.json(
      {
        success: true,
        subscription: {
          endpoint: saved.endpoint,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        message: "ลงทะเบียนรับการแจ้งเตือนผ่านแอป (PWA 2.0.0 Push) เรียบร้อยแล้ว",
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save push subscription"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
