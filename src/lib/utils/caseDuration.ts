/**
 * Thai Buddhist Era (BE) & Calendar Date Utilities for Claim Case Duration Calculation
 */

const THAI_MONTHS_MAP: Record<string, number> = {
  // Abbreviated
  "ม.ค.": 0, "ม.ค": 0,
  "ก.พ.": 1, "ก.พ": 1,
  "มี.ค.": 2, "มี.ค": 2,
  "เม.ย.": 3, "เม.ย": 3,
  "พ.ค.": 4, "พ.ค": 4,
  "มิ.ย.": 5, "มิ.ย": 5,
  "ก.ค.": 6, "ก.ค": 6,
  "ส.ค.": 7, "ส.ค": 7,
  "ก.ย.": 8, "ก.ย": 8,
  "ต.ค.": 9, "ต.ค": 9,
  "พ.ย.": 10, "พ.ย": 10,
  "ธ.ค.": 11, "ธ.ค": 11,
  // Full names
  "มกราคม": 0,
  "กุมภาพันธ์": 1,
  "มีนาคม": 2,
  "เมษายน": 3,
  "พฤษภาคม": 4,
  "มิถุนายน": 5,
  "กรกฎาคม": 6,
  "สิงหาคม": 7,
  "กันยายน": 8,
  "ตุลาคม": 9,
  "พฤศจิกายน": 10,
  "ธันวาคม": 11,
}

/**
 * Standard SLA duration threshold before a claim case is flagged as overdue
 */
export const DEFAULT_SLA_THRESHOLD_DAYS = 7

/**
 * Parse any date representation into a valid Date object.
 * Correctly handles Thai Buddhist Era (BE, e.g. 2569 -> 2026 CE) and Thai month names.
 */
export function parseThaiDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr
  }

  const trimmed = String(dateStr).trim()
  if (!trimmed || trimmed === "—" || trimmed === "-") return null

  // 0. Check for ISO string: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss (parse in local time to avoid timezone shifts)
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (isoMatch) {
    let year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    const hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0
    const minute = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
    const second = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0

    if (year >= 2400) {
      year -= 543
    }
    return new Date(year, month, day, hour, minute, second, 0)
  }

  // 1. Check for Thai text date pattern: e.g. "13 มิ.ย. 2569", "13 มิ.ย. 2569 07:00", "13 มิถุนายน 2569 01:09"
  const thaiTextMatch = trimmed.match(
    /^(\d{1,2})\s+([ก-๙.]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (thaiTextMatch) {
    const day = parseInt(thaiTextMatch[1], 10)
    const monthKey = thaiTextMatch[2].trim()
    let year = parseInt(thaiTextMatch[3], 10)
    const hour = thaiTextMatch[4] ? parseInt(thaiTextMatch[4], 10) : 0
    const minute = thaiTextMatch[5] ? parseInt(thaiTextMatch[5], 10) : 0
    const second = thaiTextMatch[6] ? parseInt(thaiTextMatch[6], 10) : 0

    const month = THAI_MONTHS_MAP[monthKey]
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      // Convert Buddhist Era (BE >= 2400) to Common Era (CE)
      if (year >= 2400) {
        year -= 543
      }
      return new Date(year, month, day, hour, minute, second, 0)
    }
  }

  // 2. Check for slash or dash format: DD/MM/YYYY with potential BE year (e.g. 13/06/2569 or 13/06/2569 07:00)
  const slashMatch = trimmed.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  )
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10)
    const month = parseInt(slashMatch[2], 10) - 1
    let year = parseInt(slashMatch[3], 10)
    const hour = slashMatch[4] ? parseInt(slashMatch[4], 10) : 0
    const minute = slashMatch[5] ? parseInt(slashMatch[5], 10) : 0
    const second = slashMatch[6] ? parseInt(slashMatch[6], 10) : 0

    if (year >= 2400) {
      year -= 543
    }
    return new Date(year, month, day, hour, minute, second, 0)
  }

  // 3. Fallback to standard JavaScript Date parser (for ISO strings, e.g. 2026-06-13T08:00:00Z)
  const parsed = new Date(trimmed)
  if (!isNaN(parsed.getTime())) {
    // If year was parsed as BE (e.g. year >= 2400), adjust
    if (parsed.getFullYear() >= 2400) {
      parsed.setFullYear(parsed.getFullYear() - 543)
    }
    return parsed
  }

  return null
}

/**
 * Format a Date object into standard Thai BE text (e.g. "12 พ.ย. 2569")
 */
export function formatThaiDate(date: Date): string {
  const day = date.getDate()
  const monthNames = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ]
  const month = monthNames[date.getMonth()]
  const yearBe = date.getFullYear() + 543
  return `${day} ${month} ${yearBe}`
}

/**
 * Convert Date object to standard ISO YYYY-MM-DD string using local calendar values (timezone-safe)
 */
export function formatISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Convert any date representation (Thai BE, slash date, Date, ISO) into standard ISO YYYY-MM-DD.
 * Returns empty string "" if date is missing, empty, or "—".
 */
export function toISODateString(dateInput?: string | Date | null): string {
  if (!dateInput) return ""
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim()
    if (!trimmed || trimmed === "—" || trimmed === "-") return ""
  }
  const parsed = parseThaiDate(dateInput)
  if (!parsed || isNaN(parsed.getTime())) return ""
  return formatISODate(parsed)
}

/**
 * Display format for Thai Buddhist Era (e.g. "13 มิ.ย. 2569").
 * Transparently accepts ISO string ("2026-06-13"), Thai text, slash dates, or Date.
 * If empty, invalid, or "—", returns the specified fallback (default "—").
 */
export function formatDisplayThaiDate(
  dateInput?: string | Date | null,
  fallback: string = "—"
): string {
  if (!dateInput) return fallback
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim()
    if (!trimmed || trimmed === "—" || trimmed === "-") return fallback
  }
  const parsed = parseThaiDate(dateInput)
  if (!parsed || isNaN(parsed.getTime())) {
    return typeof dateInput === "string" ? dateInput : fallback
  }
  return formatThaiDate(parsed)
}

/**
 * Calculates target completion date strictly based on standard 60-day SLA after the case reported date.
 * (วันที่รับแจ้ง + 60 วัน)
 * Example: '13 มิ.ย. 2569' + 60 วัน = '12 ส.ค. 2569'
 */
export function calculateDueDate(
  reportedDateInput?: string | Date | null,
  slaDays: number = 60
): { dueDate: Date; dueDateStr: string; dueDateIso: string } {
  const reported = parseThaiDate(reportedDateInput) || new Date()
  const dueDate = new Date(reported.getFullYear(), reported.getMonth(), reported.getDate() + slaDays)
  return {
    dueDate,
    dueDateStr: formatThaiDate(dueDate),
    dueDateIso: formatISODate(dueDate),
  }
}

import {
  calculateClaimSla,
  isClaimCompleted,
  getEffectiveEndDate,
  type ClaimSlaInput,
  type ClaimSlaResult,
} from "@/utils/slaCalculator"

export {
  calculateClaimSla,
  isClaimCompleted,
  getEffectiveEndDate,
  type ClaimSlaInput,
  type ClaimSlaResult,
}

export interface RemainingDaysOptions {
  returnDate?: string | Date | null
  closedDate?: string | Date | null
  closedAt?: string | Date | null
  resolvedDate?: string | Date | null
  status?: string | null
  statusCode?: number | null
  currentStage?: number | null
  isCompleted?: boolean
}

export interface RemainingDaysResult {
  remainingDays: number
  absRemainingDays: number
  totalDays: number
  progressPercent: number
  isOverdue: boolean
  overdueDays: number
  dueDate: Date
  deadlineDateStr: string
  displayText: string
  isCompleted?: boolean
  badgeColor?: "success" | "danger" | "brand"
}

/**
 * Dynamically computes target completion date (strictly 60 days after reported date)
 * and remaining days towards deadline: dueDate - currentDate.
 * For completed / closed cases, freezes duration at completion/return date.
 */
export function calculateRemainingDays(
  deadlineDateInput?: string | Date | null,
  reportedDateInput?: string | Date | null,
  currentDate: Date = new Date(),
  slaDays: number = 60,
  options?: RemainingDaysOptions
): RemainingDaysResult {
  const sla = calculateClaimSla(
    {
      targetCompletionDate: deadlineDateInput,
      reportedDate: reportedDateInput,
      returnDate: options?.returnDate,
      closedDate: options?.closedDate,
      closedAt: options?.closedAt,
      resolvedDate: options?.resolvedDate,
      status: options?.status,
      statusCode: options?.statusCode,
      currentStage: options?.currentStage ?? options?.statusCode,
    },
    currentDate,
    slaDays
  )

  const dueMidnight = sla.dueDate.getTime()
  const reported = parseThaiDate(reportedDateInput) || new Date(currentDate)
  const reportedMidnight = new Date(reported.getFullYear(), reported.getMonth(), reported.getDate()).getTime()
  const totalSlaMs = Math.max(1, dueMidnight - reportedMidnight)
  const totalDays = Math.max(1, Math.round(totalSlaMs / (1000 * 60 * 60 * 24)))

  const remainingDiffMs = dueMidnight - sla.effectiveEndDate.getTime()
  const remainingDays = Math.ceil(remainingDiffMs / (1000 * 60 * 60 * 24))
  const absRemainingDays = Math.abs(remainingDays)

  const progressPercent = sla.isCompleted
    ? 100
    : sla.isOverdue
    ? 0
    : Math.min(100, Math.max(0, (remainingDays / totalDays) * 100))

  return {
    remainingDays: sla.isCompleted ? sla.caseAgeDays : remainingDays,
    absRemainingDays,
    totalDays,
    progressPercent,
    isOverdue: sla.isOverdue,
    overdueDays: sla.overdueDays,
    dueDate: sla.dueDate,
    deadlineDateStr: sla.dueDateStr,
    displayText: sla.displayText,
    isCompleted: sla.isCompleted,
    badgeColor: sla.badgeColor,
  }
}

export interface CaseDurationInput {
  date?: string | null
  receivedDate?: string | null
  reportedDate?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  closedAt?: string | null
  closedDate?: string | null
  returnDate?: string | null
  returnDateIso?: string | null
  resolvedDate?: string | null
  targetCompletionDate?: string | null
  deadlineDate?: string | null
  slaExpiry?: string | null
  status?: string | null
  statusCode?: number | null
  currentStage?: number | null
  ageDays?: string | number | null
  isOverdue?: boolean | null
  overdueText?: string | null
}

export interface CaseDurationResult {
  days: number
  text: string
  isOverdue: boolean
  overdueDays?: number
  overdueText: string
  isClosed: boolean
}

/**
 * Dynamically computes elapsed days and overdue status for a claim ticket.
 * - Active / Open cases: calculates elapsed days up to currentDate.
 * - Closed / Rejected cases: freezes duration at completion/close date.
 */
export function calculateCaseDuration(
  ticket: CaseDurationInput,
  currentDate: Date = new Date(),
  slaThresholdDays: number = DEFAULT_SLA_THRESHOLD_DAYS
): CaseDurationResult {
  const sla = calculateClaimSla(ticket as ClaimSlaInput, currentDate, slaThresholdDays)

  return {
    days: sla.caseAgeDays,
    text: `${sla.caseAgeDays} วัน`,
    isOverdue: sla.isOverdue,
    overdueDays: sla.overdueDays,
    overdueText: sla.isOverdue
      ? `เกินกำหนด ${sla.overdueDays > 0 ? `+${sla.overdueDays} วัน` : ""}`.trim()
      : (sla.isCompleted ? "ปิดเคสตามกำหนด" : ""),
    isClosed: sla.isCompleted,
  }
}
