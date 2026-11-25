import type { Db, ClientSession } from "mongodb"
import type {
  ClaimTimelineEvent,
  TicketDocument,
  TransactionLogDocument,
} from "@/types/database"
import { formatDisplayThaiDate } from "@/lib/utils/caseDuration"

export const STAGE_TIMELINE_LABELS: Record<number, string> = {
  1: "รับแจ้ง/รอตรวจสภาพ",
  2: "ส่งศูนย์บริการแล้ว",
  3: "รออะไหล่/กำลังซ่อม",
  4: "ซ่อมเสร็จ/รอส่งมอบ",
  5: "ปิดเคส (รับคืนเรียบร้อย)",
  6: "ปฏิเสธเคลม (ไม่อยู่ในเงื่อนไข)",
}

const STATUS_NAME_TO_CODE: Record<string, number> = {
  "รับแจ้ง": 1,
  "รับแจ้ง/รอตรวจสภาพ": 1,
  "ส่งศูนย์": 2,
  "ส่งศูนย์บริการแล้ว": 2,
  "ส่งศูนย์บริการ": 2,
  "รออะไหล่": 3,
  "รออะไหล่/กำลังซ่อม": 3,
  "กำลังซ่อม": 3,
  "ซ่อมเสร็จ": 4,
  "ซ่อมเสร็จ/รอส่งมอบ": 4,
  "รอส่งมอบ": 4,
  "ปิดเคส": 5,
  "ปิดเคส (รับคืนเรียบร้อย)": 5,
  "ปฏิเสธเคลม": 6,
  "ปฏิเสธเคลม (ไม่อยู่ในเงื่อนไข)": 6,
}

export function formatIsoToThaiDateTime(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return formatDisplayThaiDate(iso)
  return d.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getLogClaimUid(log: Partial<TransactionLogDocument>): string | undefined {
  const raw = log.claimId || log.claimUid
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : undefined
}

function resolveLogStatusCode(details?: Record<string, unknown>): number | undefined {
  if (!details) return undefined
  if (typeof details.statusCode === "number" && details.statusCode >= 1 && details.statusCode <= 6) {
    return details.statusCode
  }
  if (typeof details.status === "string" && STATUS_NAME_TO_CODE[details.status.trim()]) {
    return STATUS_NAME_TO_CODE[details.status.trim()]
  }
  return undefined
}

/**
 * Builds the authoritative, chronologically accurate timeline for a single claim.
 * Strictly accepts ONLY logs bound to `ticket.uid` whose timestamps do not precede `ticket.createdAt`
 * and do not contradict the claim's actual lifecycle state.
 */
export function buildAuthoritativeTimeline(
  ticket: TicketDocument,
  durationDays: number,
  txLogs: TransactionLogDocument[] = []
): ClaimTimelineEvent[] {
  const statusCode = Number(ticket.statusCode) || 1
  const reportedStr = formatDisplayThaiDate(ticket.reportedDate || ticket.date)
  const createdMs = ticket.createdAt ? new Date(ticket.createdAt).getTime() : 0

  // 1. Strictly filter logs to ONLY those bound to this exact claim's immutable `uid`
  //    and occurring at or after this claim's `createdAt` timestamp (60s clock-skew tolerance).
  const validLogs = ticket.uid
    ? txLogs.filter((log) => {
        const logUid = getLogClaimUid(log)
        if (!logUid || logUid !== ticket.uid) return false
        if (createdMs > 0 && log.timestamp) {
          const logMs = new Date(log.timestamp).getTime()
          if (!isNaN(logMs) && logMs < createdMs - 60_000) {
            return false
          }
        }
        return true
      })
    : []

  // Sort ascending chronologically first so we can deduplicate consecutive identical stage transitions cleanly
  const chronologicalUpdates = [...validLogs]
    .filter((l) => l.action === "CLAIM_UPDATED")
    .sort(
      (a, b) =>
        new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
    )

  const isFreshStageOne =
    statusCode === 1 &&
    (!ticket.sentDate || ticket.sentDate === "—") &&
    (!ticket.returnDate || ticket.returnDate === "—") &&
    !ticket.closedAt

  const deduplicatedUpdates: ClaimTimelineEvent[] = []
  let lastRecordedStage = 1

  for (const log of chronologicalUpdates) {
    const nextCode = resolveLogStatusCode(log.details)
    if (!nextCode) continue

    // Guard against contradictory historical status logs on a brand-new untouched Stage 1 claim
    if (isFreshStageOne && nextCode > 1) {
      continue
    }
    // Guard against contradictory rejected status logs on a repaired closed claim (and vice-versa)
    if (statusCode === 5 && nextCode === 6) {
      continue
    }
    if (nextCode === lastRecordedStage) {
      continue
    }

    lastRecordedStage = nextCode
    const remark =
      typeof log.details?.remarks === "string" &&
      log.details.remarks.trim() !== "" &&
      log.details.remarks.trim() !== "-"
        ? log.details.remarks.trim()
        : ""
    const label = STAGE_TIMELINE_LABELS[nextCode] || String(log.details?.status || "อัปเดตสถานะ")

    deduplicatedUpdates.push({
      title: `ปรับสถานะเป็น: ${label}${remark ? ` (${remark})` : ""}`,
      timestamp: formatIsoToThaiDateTime(log.timestamp) || reportedStr,
      duration:
        nextCode === 5
          ? `รวมระยะเวลาดำเนินการ ${durationDays} วัน`
          : "บันทึกจากระบบฐานข้อมูล",
    })
  }

  // Reverse so newest status milestone appears at the top of the vertical timeline
  const events: ClaimTimelineEvent[] = [...deduplicatedUpdates].reverse()

  // 2. If no explicit status-transition logs exist yet for a claim beyond Stage 1,
  //    synthesize exact milestones strictly from this claim's own database timestamps.
  if (events.length === 0 && statusCode > 1) {
    if (statusCode === 5) {
      const resolvedStamp =
        ticket.returnDate && ticket.returnDate !== "—"
          ? formatDisplayThaiDate(ticket.returnDate)
          : ticket.lastTrackDate && ticket.lastTrackDate !== "—"
          ? formatDisplayThaiDate(ticket.lastTrackDate)
          : formatIsoToThaiDateTime(ticket.closedAt || ticket.updatedAt) || reportedStr
      events.push({
        title: `ปิดเคส · รับคืนอุปกรณ์เรียบร้อย${
          ticket.repairResult && ticket.repairResult !== "-" ? ` (${ticket.repairResult})` : ""
        }`,
        timestamp: resolvedStamp,
        duration: `รวมระยะเวลาดำเนินการ ${durationDays} วัน`,
      })
    } else if (statusCode === 6) {
      const rejectedStamp =
        ticket.returnDate && ticket.returnDate !== "—"
          ? formatDisplayThaiDate(ticket.returnDate)
          : formatIsoToThaiDateTime(ticket.closedAt || ticket.updatedAt) || reportedStr
      events.push({
        title: `ปฏิเสธเคลม${
          ticket.repairResult && ticket.repairResult !== "-" ? ` (${ticket.repairResult})` : ""
        }`,
        timestamp: rejectedStamp,
        duration: `ระยะเวลาดำเนินการ ${durationDays} วัน`,
      })
    } else if (statusCode === 3 || statusCode === 4) {
      const trackStamp =
        ticket.lastTrackDate && ticket.lastTrackDate !== "—"
          ? formatDisplayThaiDate(ticket.lastTrackDate)
          : formatIsoToThaiDateTime(ticket.updatedAt) || reportedStr
      events.push({
        title: `อัปเดตสถานะ · ${STAGE_TIMELINE_LABELS[statusCode]}`,
        timestamp: trackStamp,
        duration: `อายุงานสะสม ${durationDays} วัน`,
      })
    }

    if (ticket.sentDate && ticket.sentDate !== "—" && statusCode >= 2) {
      events.push({
        title: `ส่งอุปกรณ์เข้าศูนย์บริการ${
          ticket.serviceCenter ? ` (${ticket.serviceCenter})` : ""
        }`,
        timestamp: formatDisplayThaiDate(ticket.sentDate),
        duration: "ดำเนินการส่งซ่อม",
      })
    }
  }

  // 3. Always anchor the authentic creation entry at the bottom using this claim's own reportedDate / createdAt
  const openLog = validLogs.find((l) => l.action === "CLAIM_OPENED")
  const openTimestamp =
    openLog?.timestamp && reportedStr === formatDisplayThaiDate(openLog.timestamp)
      ? formatIsoToThaiDateTime(openLog.timestamp)
      : reportedStr
  const openDetail =
    statusCode === 1
      ? `ค้างอยู่ ${durationDays} วัน`
      : ticket.reporter && ticket.reporter !== "-"
      ? `ผู้แจ้ง: ${ticket.reporter}`
      : "เริ่มต้นกระบวนการเคลม"

  events.push({
    title: "เปิดเคส · รับแจ้ง/รอตรวจสภาพ",
    timestamp: openTimestamp,
    duration: openDetail,
  })

  return events
}

/**
 * Data Reconciliation & Orphan Purge Pass for MongoDB `transaction_logs`:
 * 1. Binds authentic legacy logs (where `claimId`/`claimUid` was unset) strictly to the active claim
 *    whose `serialNo` matches AND whose `createdAt <= log.timestamp`, while discarding non-status edits,
 *    contradictory test toggles, and pre-creation anomalies.
 * 2. Purges ALL orphaned `targetType: "ticket"` logs whose `claimId` / `claimUid` does not match
 *    any currently active claim in `tickets`.
 */
export async function reconcileClaimTimelineLogs(
  db: Db,
  activeTickets: TicketDocument[],
  session?: ClientSession
): Promise<{ boundCount: number; purgedCount: number }> {
  const opts = session ? { session } : {}
  const logsCol = db.collection<TransactionLogDocument>("transaction_logs")

  const activeByUid = new Map<string, TicketDocument>()
  for (const t of activeTickets) {
    if (t.uid) {
      activeByUid.set(t.uid, t)
    }
  }

  const allTicketLogs = await logsCol.find({ targetType: "ticket" }, opts).sort({ timestamp: 1 }).toArray()
  if (allTicketLogs.length === 0) {
    return { boundCount: 0, purgedCount: 0 }
  }

  const keepLogUpdates: { logObjectId: unknown; claimUid: string; targetId: string }[] = []
  const deleteObjectIds: unknown[] = []

  // Group candidate logs per active claim UID so we can validate monotonic/authentic lifecycle
  const candidateLogsByUid = new Map<string, (TransactionLogDocument & { _id?: unknown })[]>()

  for (const rawLog of allTicketLogs as (TransactionLogDocument & { _id?: unknown })[]) {
    // Remove legacy CLAIM_DELETED tombstones from ticket timeline logs
    if (rawLog.action === "CLAIM_DELETED") {
      if (rawLog._id) deleteObjectIds.push(rawLog._id)
      continue
    }

    const existingUid = getLogClaimUid(rawLog)
    let matchedClaim: TicketDocument | undefined = existingUid
      ? activeByUid.get(existingUid)
      : undefined

    // If legacy log has no claimUid, match ONLY when details.serialNo uniquely identifies an active claim
    // AND log.timestamp >= claim.createdAt
    if (!existingUid && !matchedClaim) {
      const logSerial = String(
        rawLog.details?.serialNo || rawLog.details?.serialNumber || ""
      ).trim()
      if (logSerial && logSerial !== "-") {
        const logMs = new Date(rawLog.timestamp || 0).getTime()
        const serialMatches = activeTickets.filter((t) => {
          if (!t.uid || t.serialNo !== logSerial) return false
          const createdMs = t.createdAt ? new Date(t.createdAt).getTime() : 0
          return createdMs === 0 || (!isNaN(logMs) && logMs >= createdMs - 5_000)
        })
        if (serialMatches.length === 1) {
          matchedClaim = serialMatches[0]
        }
      }
    }

    if (!matchedClaim || !matchedClaim.uid) {
      if (rawLog._id) deleteObjectIds.push(rawLog._id)
      continue
    }

    // Verify timestamp does not precede parent claim's createdAt
    const claimCreatedMs = matchedClaim.createdAt
      ? new Date(matchedClaim.createdAt).getTime()
      : 0
    const logMs = new Date(rawLog.timestamp || 0).getTime()
    if (claimCreatedMs > 0 && !isNaN(logMs) && logMs < claimCreatedMs - 60_000) {
      if (rawLog._id) deleteObjectIds.push(rawLog._id)
      continue
    }

    // For CLAIM_UPDATED logs, keep only genuine status transitions consistent with the claim's lifecycle
    if (rawLog.action === "CLAIM_UPDATED") {
      const logStage = resolveLogStatusCode(rawLog.details)
      const currentStage = Number(matchedClaim.statusCode) || 1
      if (!logStage) {
        if (rawLog._id) deleteObjectIds.push(rawLog._id)
        continue
      }
      if (currentStage === 1 && logStage > 1) {
        if (rawLog._id) deleteObjectIds.push(rawLog._id)
        continue
      }
      if (currentStage === 5 && logStage === 6) {
        if (rawLog._id) deleteObjectIds.push(rawLog._id)
        continue
      }
      if (logStage > currentStage) {
        if (rawLog._id) deleteObjectIds.push(rawLog._id)
        continue
      }
    }

    const list = candidateLogsByUid.get(matchedClaim.uid) || []
    list.push(rawLog)
    candidateLogsByUid.set(matchedClaim.uid, list)
  }

  // Deduplicate monotonic progression per claim so historical test flip-flops don't pollute timelines
  for (const [uid, logs] of candidateLogsByUid.entries()) {
    const claim = activeByUid.get(uid)!
    let seenOpen = false
    const stageLatestMap = new Map<number, TransactionLogDocument & { _id?: unknown }>()

    for (const log of logs) {
      if (log.action === "CLAIM_OPENED") {
        if (!seenOpen) {
          seenOpen = true
          keepLogUpdates.push({
            logObjectId: log._id,
            claimUid: uid,
            targetId: claim.id,
          })
        } else if (log._id) {
          deleteObjectIds.push(log._id)
        }
        continue
      }

      const stage = resolveLogStatusCode(log.details)
      if (!stage || stage === 1) {
        if (log._id) deleteObjectIds.push(log._id)
        continue
      }

      // If an earlier duplicate of the same stage existed (from historical test toggles), replace it with the latest authentic transition
      const prevSameStage = stageLatestMap.get(stage)
      if (prevSameStage && prevSameStage._id) {
        deleteObjectIds.push(prevSameStage._id)
      }
      // Also discard any higher stage that occurred BEFORE a rollback to a lower stage
      for (const [existingStage, existingLog] of Array.from(stageLatestMap.entries())) {
        if (existingStage > stage) {
          if (existingLog._id) deleteObjectIds.push(existingLog._id)
          stageLatestMap.delete(existingStage)
        }
      }
      stageLatestMap.set(stage, log)
    }

    for (const keptLog of stageLatestMap.values()) {
      keepLogUpdates.push({
        logObjectId: keptLog._id,
        claimUid: uid,
        targetId: claim.id,
      })
    }
  }

  let boundCount = 0
  for (const item of keepLogUpdates) {
    if (!item.logObjectId) continue
    const res = await logsCol.updateOne(
      { _id: item.logObjectId as never },
      {
        $set: {
          claimId: item.claimUid,
          claimUid: item.claimUid,
          targetId: item.targetId,
        },
      },
      opts
    )
    boundCount += res.modifiedCount
  }

  let purgedCount = 0
  if (deleteObjectIds.length > 0) {
    const delRes = await logsCol.deleteMany(
      { _id: { $in: deleteObjectIds as never[] } },
      opts
    )
    purgedCount += delRes.deletedCount
  }

  // Final safety sweep: purge any remaining ticket logs whose claimId/claimUid is missing or not in activeByUid
  const activeUids = Array.from(activeByUid.keys())
  const sweepFilter =
    activeUids.length > 0
      ? {
          targetType: "ticket" as const,
          $or: [
            { claimUid: { $exists: false } },
            { claimUid: { $nin: activeUids } },
          ],
        }
      : { targetType: "ticket" as const }

  const sweepRes = await logsCol.deleteMany(sweepFilter, opts)
  purgedCount += sweepRes.deletedCount

  return { boundCount, purgedCount }
}
