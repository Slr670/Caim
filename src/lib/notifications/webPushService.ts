import * as webpush from "web-push"
import {
  getPushSubscriptions,
  removePushSubscription,
  type StoredPushSubscription,
} from "./pushSubscriptionStore"

export const DEFAULT_VAPID_PUBLIC_KEY =
  "BIZ_IMFjP249T3BdUCaWwZVwdptwEZnwnQxKgkl_lGR2SsKGdid2Nri8CLI7vTre4_LnqoGQkkYP_XcRPqSfewg"
const DEFAULT_VAPID_PRIVATE_KEY =
  "OJe8HkZyI72yVEuHh_vXX5KRczZSYMELkzuooH_2W90"
const DEFAULT_VAPID_SUBJECT = "mailto:claimstickets@gmail.com"

let vapidConfigured = false

export function getVapidPublicKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || DEFAULT_VAPID_PUBLIC_KEY
  )
}

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true
  try {
    const publicKey = getVapidPublicKey()
    const privateKey =
      process.env.VAPID_PRIVATE_KEY?.trim() || DEFAULT_VAPID_PRIVATE_KEY
    const subject =
      process.env.VAPID_SUBJECT?.trim() || DEFAULT_VAPID_SUBJECT

    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
    return true
  } catch (err) {
    console.warn("[WebPushService] Failed to configure VAPID details:", err)
    return false
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url: string
    claimId?: string
    eventType?: string
    [key: string]: unknown
  }
}

export interface PushBroadcastResult {
  success: boolean
  totalSubscriptions: number
  deliveredCount: number
  prunedCount: number
  failedCount: number
}

/**
 * Send a Web Push Notification to a single subscription and auto-prune if 410 Gone or 404 Not Found
 */
export async function sendPushToSubscription(
  sub: StoredPushSubscription,
  payload: PushNotificationPayload
): Promise<{ delivered: boolean; pruned: boolean }> {
  if (!ensureVapidConfigured()) {
    return { delivered: false, pruned: false }
  }

  const normalizedPayload: PushNotificationPayload = {
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    tag: payload.tag || `claims-push-${Date.now()}`,
    data: {
      url: payload.data?.url || "/tickets",
      ...(payload.data || {}),
    },
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      },
      JSON.stringify(normalizedPayload),
      {
        TTL: 60 * 60 * 24,
        urgency: "high",
      }
    )
    return { delivered: true, pruned: false }
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (statusCode === 410 || statusCode === 404) {
      await removePushSubscription(sub.endpoint)
      console.log(
        `[WebPushService] Pruned expired/revoked subscription (${statusCode}): ${sub.endpoint.slice(0, 48)}...`
      )
      return { delivered: false, pruned: true }
    }
    console.warn("[WebPushService] Failed to deliver push notification:", err)
    return { delivered: false, pruned: false }
  }
}

/**
 * Broadcasts a real-time Web Push Notification via PWA 2.0.0 to all registered client subscriptions
 */
export async function broadcastWebPushNotification(
  payload: PushNotificationPayload
): Promise<PushBroadcastResult> {
  if (!ensureVapidConfigured()) {
    return {
      success: false,
      totalSubscriptions: 0,
      deliveredCount: 0,
      prunedCount: 0,
      failedCount: 0,
    }
  }

  const subscriptions = await getPushSubscriptions()
  if (subscriptions.length === 0) {
    return {
      success: true,
      totalSubscriptions: 0,
      deliveredCount: 0,
      prunedCount: 0,
      failedCount: 0,
    }
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload))
  )

  let deliveredCount = 0
  let prunedCount = 0
  let failedCount = 0

  for (const res of results) {
    if (res.status === "fulfilled") {
      if (res.value.delivered) deliveredCount++
      else if (res.value.pruned) prunedCount++
      else failedCount++
    } else {
      failedCount++
    }
  }

  return {
    success: deliveredCount > 0 || subscriptions.length === prunedCount,
    totalSubscriptions: subscriptions.length,
    deliveredCount,
    prunedCount,
    failedCount,
  }
}
