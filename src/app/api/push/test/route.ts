import { NextRequest, NextResponse } from "next/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  broadcastWebPushNotification,
  sendPushToSubscription,
} from "@/lib/notifications/webPushService"
import { savePushSubscription } from "@/lib/notifications/pushSubscriptionStore"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * POST /api/push/test
 * Sends a test PWA 2.0.0 Web Push notification to the caller's subscription or all active subscriptions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sub = body?.subscription

    const testPayload = {
      title: body?.title || "[CLAIMS] ทดสอบการแจ้งเตือนผ่านแอป (PWA 2.0.0)",
      body:
        body?.body ||
        "ระบบแจ้งเตือน Web Push ทำงานพร้อมใช้งาน — คลิกเพื่อเปิดดูรายการงานเคลมล่าสุด",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: `claims-test-${Date.now()}`,
      data: {
        url: body?.url || "/tickets/CLM-2026-001",
        eventType: "TEST_PUSH",
      },
    }

    if (sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth) {
      const saved = await savePushSubscription({
        endpoint: String(sub.endpoint),
        expirationTime: sub.expirationTime ?? null,
        keys: {
          p256dh: String(sub.keys.p256dh),
          auth: String(sub.keys.auth),
        },
        userAgent: request.headers.get("user-agent") || undefined,
      })
      const singleRes = await sendPushToSubscription(saved, testPayload)
      return NextResponse.json(
        {
          success: singleRes.delivered,
          deliveredCount: singleRes.delivered ? 1 : 0,
          message: singleRes.delivered
            ? "ส่งการแจ้งเตือนทดสอบ (PWA 2.0.0 Push) ไปยังอุปกรณ์นี้สำเร็จแล้ว"
            : "ไม่สามารถส่ง Push ไปยังอุปกรณ์นี้ได้ กรุณาตรวจสอบสิทธิ์การแจ้งเตือนของเบราว์เซอร์",
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    const broadcastRes = await broadcastWebPushNotification(testPayload)
    return NextResponse.json(
      {
        ...broadcastRes,
        success: broadcastRes.deliveredCount > 0,
        message:
          broadcastRes.deliveredCount > 0
            ? `ส่งการแจ้งเตือนทดสอบสำเร็จ (${broadcastRes.deliveredCount} อุปกรณ์)`
            : "ไม่พบอุปกรณ์ที่เปิดรับการแจ้งเตือน Push ในระบบ กรุณากดเปิดสวิตช์รับการแจ้งเตือนก่อนทดสอบ",
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send test push"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
