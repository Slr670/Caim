import type { TicketDocument, RmaDocument } from "@/types/database"
import { sendEmail, type SendMailOptions, type SendMailResult } from "@/lib/email/emailTransporter"
import {
  broadcastWebPushNotification,
  type PushNotificationPayload,
  type PushBroadcastResult,
} from "./webPushService"

export interface UnifiedDispatchResult {
  email: SendMailResult
  push: PushBroadcastResult
}

/**
 * Unified, non-blocking notification dispatcher that executes both SMTP email dispatch
 * and PWA 2.0.0 Web Push broadcast concurrently via Promise.allSettled.
 */
export async function dispatchUnifiedNotification(params: {
  emailOptions: SendMailOptions
  pushPayload: PushNotificationPayload
}): Promise<UnifiedDispatchResult> {
  const [emailSettled, pushSettled] = await Promise.allSettled([
    sendEmail(params.emailOptions),
    broadcastWebPushNotification(params.pushPayload),
  ])

  const emailResult: SendMailResult =
    emailSettled.status === "fulfilled"
      ? emailSettled.value
      : {
          success: false,
          error:
            emailSettled.reason instanceof Error
              ? emailSettled.reason.message
              : String(emailSettled.reason),
        }

  const pushResult: PushBroadcastResult =
    pushSettled.status === "fulfilled"
      ? pushSettled.value
      : {
          success: false,
          totalSubscriptions: 0,
          deliveredCount: 0,
          prunedCount: 0,
          failedCount: 1,
        }

  return {
    email: emailResult,
    push: pushResult,
  }
}

/**
 * Builds PWA 2.0.0 Push payload for Trigger A: New Claim Opened (POST /api/claims)
 * Push Title: [CLAIMS] เปิดเคสใหม่: {claimId}
 * Push Body: {equipmentName} (S/N: {serialNo}) — {location}
 */
export function buildNewClaimPushPayload(ticket: TicketDocument): PushNotificationPayload {
  const claimId = ticket.id
  const equipmentName =
    `${ticket.vendor || ""} ${ticket.model || ""}`.trim() ||
    ticket.title ||
    "อุปกรณ์สื่อสาร"
  const serialNo = ticket.serialNo || "-"
  const location =
    ticket.location ||
    ticket.station ||
    [ticket.subdistrict, ticket.district, ticket.province].filter(Boolean).join(" ") ||
    "ไม่ระบุสถานที่"

  return {
    title: `[CLAIMS] เปิดเคสใหม่: ${claimId}`,
    body: `${equipmentName} (S/N: ${serialNo}) — ${location}`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: `claims-new-${claimId}`,
    data: {
      url: `/tickets/${encodeURIComponent(claimId)}`,
      claimId,
      eventType: "CLAIM_OPENED",
    },
  }
}

/**
 * Builds PWA 2.0.0 Push payload for Trigger B: Claim Status Updated (PUT / PATCH /api/claims/[id])
 * Push Title: [CLAIMS] อัปเดตสถานะ: {claimId} → {newStatus}
 * Push Body: เปลี่ยนจาก "{previousStatus}" เป็น "{newStatus}"
 */
export function buildClaimStatusUpdatedPushPayload(params: {
  claimId: string
  previousStatus: string
  newStatus: string
}): PushNotificationPayload {
  const { claimId, previousStatus, newStatus } = params
  return {
    title: `[CLAIMS] อัปเดตสถานะ: ${claimId} → ${newStatus}`,
    body: `เปลี่ยนจาก "${previousStatus}" เป็น "${newStatus}"`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: `claims-status-${claimId}`,
    data: {
      url: `/tickets/${encodeURIComponent(claimId)}`,
      claimId,
      eventType: "CLAIM_STATUS_UPDATED",
    },
  }
}

/**
 * Builds PWA 2.0.0 Push payload for Trigger C: Overseas RMA Stage Updated
 * Push Title: [CLAIMS] ส่งซ่อมต่างประเทศ ({stage}/8): {claimId}
 * Push Body: {equipmentName} — สถานะ: {newStatus}
 */
export function buildRmaStageUpdatedPushPayload(params: {
  rma: RmaDocument
  ticket?: TicketDocument | null
  stageNumber?: number
  newStatus?: string
}): PushNotificationPayload {
  const { rma, ticket } = params
  const claimId = ticket?.id || rma.ticketId || rma.rmaNo || rma.id
  const stage = params.stageNumber || rma.currentStageNumber || 1
  const equipmentName =
    `${rma.vendor || ticket?.vendor || ""} ${rma.model || ticket?.model || ""}`.trim() ||
    rma.caseName ||
    "อุปกรณ์ส่งซ่อมต่างประเทศ"
  const newStatus =
    params.newStatus ||
    rma.currentStageName ||
    rma.status ||
    `ขั้นตอนที่ ${stage}`

  const targetUrl =
    ticket?.id || rma.ticketId
      ? `/tickets/${encodeURIComponent(ticket?.id || rma.ticketId || "")}`
      : "/repairs/overseas"

  return {
    title: `[CLAIMS] ส่งซ่อมต่างประเทศ (${stage}/8): ${claimId}`,
    body: `${equipmentName} — สถานะ: ${newStatus}`,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: `claims-rma-${claimId}-${stage}`,
    data: {
      url: targetUrl,
      claimId,
      eventType: "RMA_STAGE_UPDATED",
    },
  }
}
