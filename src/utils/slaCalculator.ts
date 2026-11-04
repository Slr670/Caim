/**
 * SLA & Turnaround Duration Calculator for Equipment Claims & RMA Cases
 *
 * Implements strict duration freezing upon case resolution / completion:
 * - Active / Open cases: calculates elapsed duration up to current system date (new Date()).
 * - Completed / Closed cases: freezes duration strictly at the returnDate or closedDate,
 *   preventing false overdue penalties and inflated case age.
 */

import { parseThaiDate, formatThaiDate } from "@/lib/utils/caseDuration"

export interface ClaimSlaInput {
  receivedDate?: string | Date | null
  reportedDate?: string | Date | null
  date?: string | Date | null
  createdAt?: string | Date | null
  targetCompletionDate?: string | Date | null
  deadlineDate?: string | Date | null
  slaExpiry?: string | Date | null
  returnDate?: string | Date | null
  returnDateIso?: string | Date | null
  closedDate?: string | Date | null
  closedAt?: string | Date | null
  resolvedDate?: string | Date | null
  updatedAt?: string | Date | null
  status?: string | null
  statusCode?: number | null
  currentStage?: number | null
  ageDays?: string | number | null
  isOverdue?: boolean | null
  overdueText?: string | null
}

export interface ClaimSlaResult {
  isCompleted: boolean
  effectiveEndDate: Date
  caseAgeDays: number
  isOverdue: boolean
  overdueDays: number
  dueDate: Date
  dueDateStr: string
  displayText: string
  statusBadgeText: string
  badgeColor: "success" | "danger" | "brand"
  turnaroundDays: number
}

/**
 * Checks whether a claim case is already resolved, completed, or closed.
 */
export function isClaimCompleted(claim: ClaimSlaInput): boolean {
  if (
    claim.statusCode === 5 ||
    claim.statusCode === 6 ||
    claim.currentStage === 5 ||
    claim.currentStage === 6
  ) {
    return true
  }

  const statusStr = String(claim.status || "").trim().toLowerCase()
  if (
    statusStr === "ปิดเคส" ||
    statusStr === "ซ่อมเสร็จ" ||
    statusStr === "ปิดงาน" ||
    statusStr === "ปฏิเสธเคลม" ||
    statusStr.includes("ปิดเคส") ||
    statusStr.includes("ซ่อมเสร็จ") ||
    statusStr.includes("ปฏิเสธเคลม")
  ) {
    return true
  }

  const retStr = typeof claim.returnDate === "string" ? claim.returnDate.trim() : ""
  if (retStr && retStr !== "—" && retStr !== "-" && retStr !== "null" && retStr !== "undefined") {
    return true
  }

  if (typeof claim.returnDateIso === "string") {
    if (claim.returnDateIso.trim() !== "") return true
  } else if (claim.returnDateIso) {
    return true
  }

  if (claim.closedDate || claim.closedAt || claim.resolvedDate) {
    return true
  }

  return false
}

/**
 * Resolves the effective end date for SLA calculation:
 * - Uses the actual return/resolution date if the case is completed/closed;
 * - Otherwise, uses the current reference date (new Date()).
 */
export function getEffectiveEndDate(claim: ClaimSlaInput, referenceDate: Date = new Date()): Date {
  const isCompleted = isClaimCompleted(claim)
  if (!isCompleted) {
    return referenceDate
  }

  const retStr = typeof claim.returnDate === "string" ? claim.returnDate.trim() : ""
  if (retStr && retStr !== "—" && retStr !== "-") {
    const parsed = parseThaiDate(retStr)
    if (parsed) return parsed
  }

  if (claim.returnDate instanceof Date && !isNaN(claim.returnDate.getTime())) {
    return claim.returnDate
  }

  if (claim.returnDateIso) {
    const parsed = parseThaiDate(claim.returnDateIso)
    if (parsed) return parsed
  }

  if (claim.closedDate) {
    const parsed = parseThaiDate(claim.closedDate)
    if (parsed) return parsed
  }

  if (claim.closedAt) {
    const parsed = parseThaiDate(claim.closedAt)
    if (parsed) return parsed
  }

  if (claim.resolvedDate) {
    const parsed = parseThaiDate(claim.resolvedDate)
    if (parsed) return parsed
  }

  if (claim.updatedAt) {
    const parsed = parseThaiDate(claim.updatedAt)
    if (parsed) return parsed
  }

  return referenceDate
}

/**
 * Computes frozen SLA metrics, case age, and overdue calculations for a claim.
 */
export function calculateClaimSla(
  claim: ClaimSlaInput,
  referenceDate: Date = new Date(),
  slaDays: number = 60
): ClaimSlaResult {
  const isCompleted = isClaimCompleted(claim)
  const effectiveEndDate = getEffectiveEndDate(claim, referenceDate)

  // 1. Calculate Case Age (อายุงาน)
  const rawReceived = claim.receivedDate || claim.reportedDate || claim.date || claim.createdAt
  const receivedDate = parseThaiDate(rawReceived) || referenceDate

  const startMidnight = new Date(
    receivedDate.getFullYear(),
    receivedDate.getMonth(),
    receivedDate.getDate()
  ).getTime()

  const endMidnight = new Date(
    effectiveEndDate.getFullYear(),
    effectiveEndDate.getMonth(),
    effectiveEndDate.getDate()
  ).getTime()

  const caseAgeDays = Math.max(0, Math.floor((endMidnight - startMidnight) / (1000 * 60 * 60 * 24)))

  // 2. Calculate Due Date (กำหนดแล้วเสร็จ) & Overdue Days (เกินกำหนด)
  const rawDue = claim.targetCompletionDate || claim.deadlineDate || claim.slaExpiry
  let dueDate = parseThaiDate(rawDue)
  if (!dueDate) {
    dueDate = new Date(receivedDate.getFullYear(), receivedDate.getMonth(), receivedDate.getDate() + slaDays)
  }

  const dueMidnight = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  ).getTime()

  const isOverdue = endMidnight > dueMidnight
  const overdueDays = isOverdue
    ? Math.floor((endMidnight - dueMidnight) / (1000 * 60 * 60 * 24))
    : 0

  const dueDateStr = formatThaiDate(dueDate)

  let displayText = ""
  let statusBadgeText = ""
  let badgeColor: "success" | "danger" | "brand" = "brand"

  if (isCompleted) {
    if (isOverdue) {
      displayText = `ปิดเคสเกินกำหนด ${overdueDays} วัน`
      statusBadgeText = `เกินกำหนด +${overdueDays} วัน`
      badgeColor = "danger"
    } else {
      displayText = endMidnight < dueMidnight ? "เสร็จก่อนกำหนด" : "ปิดเคสตามกำหนด"
      statusBadgeText = displayText
      badgeColor = "success"
    }
  } else {
    if (isOverdue) {
      displayText = `เกินกำหนด ${overdueDays} วัน`
      statusBadgeText = `เกินกำหนด +${overdueDays} วัน`
      badgeColor = "danger"
    } else {
      const remainingDays = Math.max(0, Math.ceil((dueMidnight - endMidnight) / (1000 * 60 * 60 * 24)))
      displayText = remainingDays === 0 ? "ครบกำหนดวันนี้" : `เหลืออีก ${remainingDays} วัน`
      statusBadgeText = remainingDays === 0 ? "ครบกำหนดวันนี้" : `เหลือ ${remainingDays} วัน`
      badgeColor = "brand"
    }
  }

  return {
    isCompleted,
    effectiveEndDate,
    caseAgeDays,
    isOverdue,
    overdueDays,
    dueDate,
    dueDateStr,
    displayText,
    statusBadgeText,
    badgeColor,
    turnaroundDays: caseAgeDays,
  }
}
