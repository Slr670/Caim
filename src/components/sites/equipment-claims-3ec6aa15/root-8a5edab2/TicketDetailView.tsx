"use client"

import * as React from "react"
import Link from "next/link"
import {
  House,
  ChevronRight,
  ClipboardList,
  Pencil,
  RotateCw,
  Cpu,
  ShieldCheck,
  Building2,
  User,
  MapPin,
  Check,
  X,
  Save,
  Loader2,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePickerInput } from "@/components/ui/DatePickerInput"
import {
  calculateCaseDuration,
  calculateRemainingDays,
  calculateDueDate,
  formatDisplayThaiDate,
  toISODateString,
} from "@/lib/utils/caseDuration"
import { useTicketsQuery, invalidateTicketsCache, type Ticket } from "@/hooks/useTicketsQuery"
import type { CaimRepairOutcome, ClaimTimelineEvent } from "@/types/database"

export interface TicketDetailData {
  uid: string
  id: string
  claimNumber: string
  title: string
  problemDesc: string
  repairResult: string
  repairOutcome?: CaimRepairOutcome
  replacedNewSerialNo?: string
  remarks: string
  vendor: string
  model: string
  serialNo: string
  category: string
  deviceType: string
  location: string
  warrantyStatus: string
  serviceCenter: string
  reportedDate: string
  sentDate: string
  deadlineDate: string
  lastTrackDate: string
  returnDate: string
  closedAt?: string
  closedDate?: string
  ageDays: number
  remainingDays: number
  reporter: string
  assignee: string
  currentStage: number // 1: รับแจ้ง, 2: ส่งศูนย์, 3: รออะไหล่, 4: ซ่อมเสร็จ, 5: ปิดเคส, 6: ปฏิเสธเคลม
  status?: string
  timeline: ClaimTimelineEvent[]
  otherCases: {
    uid?: string
    id: string
    title: string
    date: string
    status: string
    statusCode: number
  }[]
}

const EMPTY_EDIT_FORM: TicketDetailData = {
  uid: "",
  id: "",
  claimNumber: "",
  title: "",
  problemDesc: "",
  repairResult: "",
  remarks: "",
  vendor: "",
  model: "",
  serialNo: "",
  category: "",
  deviceType: "",
  location: "",
  warrantyStatus: "อยู่ในประกัน",
  serviceCenter: "Huawei",
  reportedDate: "",
  sentDate: "—",
  deadlineDate: "",
  lastTrackDate: "—",
  returnDate: "—",
  ageDays: 0,
  remainingDays: 0,
  reporter: "",
  assignee: "",
  currentStage: 1,
  timeline: [],
  otherCases: [],
}

function buildFallbackTimelineFromRecord(
  t: Partial<Ticket> & { id: string; createdAt?: string; updatedAt?: string }
): ClaimTimelineEvent[] {
  if (Array.isArray(t.timeline) && t.timeline.length > 0) {
    return t.timeline
  }
  const duration = calculateCaseDuration(t)
  const statusCode = Number(t.statusCode) || 1
  const reportedStr = formatDisplayThaiDate(t.reportedDate || t.date || "") || "—"
  const events: ClaimTimelineEvent[] = []

  if (statusCode === 5) {
    const returnStamp =
      t.returnDate && t.returnDate !== "—"
        ? formatDisplayThaiDate(t.returnDate)
        : t.lastTrackDate && t.lastTrackDate !== "—"
        ? formatDisplayThaiDate(t.lastTrackDate)
        : reportedStr
    events.push({
      title: `ปิดเคส · รับคืนอุปกรณ์เรียบร้อย${
        t.repairResult && t.repairResult !== "-" ? ` (${t.repairResult})` : ""
      }`,
      timestamp: returnStamp,
      duration: `รวมระยะเวลาดำเนินการ ${duration.days} วัน`,
    })
  } else if (statusCode === 6) {
    events.push({
      title: `ปฏิเสธเคลม${
        t.repairResult && t.repairResult !== "-" ? ` (${t.repairResult})` : ""
      }`,
      timestamp:
        t.returnDate && t.returnDate !== "—"
          ? formatDisplayThaiDate(t.returnDate)
          : reportedStr,
      duration: `ระยะเวลาดำเนินการ ${duration.days} วัน`,
    })
  } else if (statusCode === 3 || statusCode === 4) {
    events.push({
      title:
        statusCode === 3
          ? "อัปเดตสถานะ · รออะไหล่/กำลังซ่อม"
          : "อัปเดตสถานะ · ซ่อมเสร็จ/รอส่งมอบ",
      timestamp:
        t.lastTrackDate && t.lastTrackDate !== "—"
          ? formatDisplayThaiDate(t.lastTrackDate)
          : reportedStr,
      duration: `อายุงานสะสม ${duration.days} วัน`,
    })
  }

  if (t.sentDate && t.sentDate !== "—" && statusCode >= 2) {
    events.push({
      title: `ส่งอุปกรณ์เข้าศูนย์บริการ${t.serviceCenter ? ` (${t.serviceCenter})` : ""}`,
      timestamp: formatDisplayThaiDate(t.sentDate),
      duration: "ดำเนินการส่งซ่อม",
    })
  }

  events.push({
    title: "เปิดเคส · รับแจ้ง/รอตรวจสภาพ",
    timestamp: reportedStr,
    duration:
      statusCode === 1
        ? `ค้างอยู่ ${duration.days} วัน`
        : t.reporter && t.reporter !== "-"
        ? `ผู้แจ้ง: ${t.reporter}`
        : "เริ่มต้นกระบวนการเคลม",
  })

  return events
}

function mapDbRecordToDetailData(
  t: Partial<Ticket> & {
    id: string
    uid?: string
    claimNumber?: string
    createdAt?: string
    updatedAt?: string
  }
): TicketDetailData {
  const duration = calculateCaseDuration(t)
  const resolvedClaimNumber = t.claimNumber || t.id
  const resolvedTitle =
    (t.claimTitle && t.claimTitle.trim()) ||
    (t.title && t.title.trim()) ||
    resolvedClaimNumber

  const areaParts = [
    t.subdistrict && `ต.${t.subdistrict}`,
    t.district && `อ.${t.district}`,
    t.province && `จ.${t.province}`,
  ]
    .filter(Boolean)
    .join(" ")

  let resolvedLocation = ""
  if (t.station && t.station.trim()) {
    resolvedLocation = areaParts
      ? `${t.station.trim()} (${areaParts})`
      : t.station.trim()
  } else if (t.location && t.location.trim()) {
    resolvedLocation = t.location.trim()
  } else if (areaParts) {
    resolvedLocation = areaParts
  } else {
    resolvedLocation = "—"
  }

  const reportedDateStr = t.reportedDate || t.date || ""
  const defaultDeadline = reportedDateStr
    ? calculateDueDate(reportedDateStr, 60).dueDateStr
    : "—"

  return {
    uid: t.uid || resolvedClaimNumber,
    id: resolvedClaimNumber,
    claimNumber: resolvedClaimNumber,
    title: resolvedTitle,
    problemDesc: t.problemDesc || t.description || t.symptoms || "—",
    repairResult: t.repairResult || "",
    repairOutcome: t.repairOutcome,
    replacedNewSerialNo: t.replacedNewSerialNo,
    remarks: t.remarks && t.remarks.trim() ? t.remarks.trim() : "—",
    vendor: t.vendor || "—",
    model: t.model || "—",
    serialNo: t.serialNo || "—",
    category: t.category && t.category.trim() ? t.category.trim() : "—",
    deviceType: t.deviceType && t.deviceType.trim() ? t.deviceType.trim() : "—",
    location: resolvedLocation,
    warrantyStatus: t.warrantyStatus || "อยู่ในประกัน",
    serviceCenter: t.serviceCenter || t.vendor || "—",
    reportedDate: reportedDateStr,
    sentDate: t.sentDate && t.sentDate.trim() ? t.sentDate.trim() : "—",
    deadlineDate: t.deadlineDate || defaultDeadline,
    lastTrackDate: t.lastTrackDate && t.lastTrackDate.trim() ? t.lastTrackDate.trim() : "—",
    returnDate: t.returnDate && t.returnDate.trim() ? t.returnDate.trim() : "—",
    closedAt: t.closedAt,
    ageDays: duration.days,
    remainingDays: 0,
    reporter: t.reporter && t.reporter.trim() ? t.reporter.trim() : "—",
    assignee: t.assignee && t.assignee.trim() ? t.assignee.trim() : "—",
    currentStage: Number(t.statusCode) || 1,
    status: t.status || "รับแจ้ง",
    timeline: buildFallbackTimelineFromRecord(t),
    otherCases: [],
  }
}

const REPAIR_OUTCOMES: { value: CaimRepairOutcome; label: string }[] = [
  { value: "unrepairable", label: "ซ่อมไม่ได้ / แทงจำหน่ายเป็นของเสีย" },
  { value: "repaired", label: "ซ่อมสำเร็จ ใช้ S/N เดิม" },
  { value: "replaced_new", label: "ศูนย์เปลี่ยนของใหม่ (S/N ใหม่)" },
  { value: "rejected", label: "ปฏิเสธเคลม / ไม่อยู่ในเงื่อนไขประกัน" },
]

const STAGES = [
  { step: 1, label: "รับแจ้ง" },
  { step: 2, label: "ส่งศูนย์" },
  { step: 3, label: "รออะไหล่" },
  { step: 4, label: "ซ่อมเสร็จ" },
  { step: 5, label: "ปิดเคส" },
  { step: 6, label: "ปฏิเสธเคลม" },
]

export function TicketDetailView({ ticketId }: { ticketId?: string }) {
  const { tickets, updateTicket } = useTicketsQuery()

  const activeTicketId = decodeURIComponent(ticketId || "").trim()

  const [data, setData] = React.useState<TicketDetailData | null>(null)
  const [isLoadingRecord, setIsLoadingRecord] = React.useState<boolean>(true)
  const [notFoundError, setNotFoundError] = React.useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editForm, setEditForm] = React.useState<TicketDetailData>(EMPTY_EDIT_FORM)
  const [newStatusStage, setNewStatusStage] = React.useState(1)
  const [statusRemark, setStatusRemark] = React.useState("")
  const [newRepairOutcome, setNewRepairOutcome] = React.useState<CaimRepairOutcome | "">("")
  const [newReplacedSerialNo, setNewReplacedSerialNo] = React.useState("")
  const [bannerMessage, setBannerMessage] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)
  const toastTimerRef = React.useRef<NodeJS.Timeout | null>(null)
  const bannerTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const showToast = React.useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(msg)
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null)
      toastTimerRef.current = null
    }, 3500)
  }, [])

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    }
  }, [])

  // Authoritative single-record fetch directly from live database API (/api/claims/:id)
  const syncTicketFromRemote = React.useCallback(async (targetKey: string) => {
    if (!targetKey) {
      setIsLoadingRecord(false)
      setNotFoundError("ไม่พบรหัสอ้างอิงของงานเคลมที่ระบุ")
      return
    }
    try {
      const res = await fetch(`/api/claims/${encodeURIComponent(targetKey)}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const json = await res.json()
      if (json && json.success && json.ticket) {
        const mapped = mapDbRecordToDetailData(json.ticket)
        setData(mapped)
        setNotFoundError(null)
      } else {
        setData(null)
        setNotFoundError(`ไม่พบข้อมูลงานเคลมรหัส "${targetKey}" ในฐานข้อมูลกลาง`)
      }
    } catch (err) {
      console.warn("[TicketDetailView] syncTicketFromRemote error:", err)
      setNotFoundError("ไม่สามารถดึงข้อมูลงานเคลมจากฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง")
    } finally {
      setIsLoadingRecord(false)
    }
  }, [])

  // Query live database on mount & subscribe to real-time updates strictly for this record's uid / id
  React.useEffect(() => {
    setIsLoadingRecord(true)
    setNotFoundError(null)
    syncTicketFromRemote(activeTicketId)

    const handleRealtime = (e: Event) => {
      const custom = e as CustomEvent
      const detail = custom.detail as {
        action?: string
        data?: { id?: string; uid?: string }
      } | undefined
      if (
        !detail?.data ||
        detail.data.uid === activeTicketId ||
        detail.data.id === activeTicketId
      ) {
        syncTicketFromRemote(activeTicketId)
      }
    }

    const handleInvalidate = () => {
      syncTicketFromRemote(activeTicketId)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:ticket", handleRealtime)
      window.addEventListener("caim:tickets:invalidated", handleInvalidate)
      window.addEventListener("visibilitychange", handleInvalidate)
      window.addEventListener("focus", handleInvalidate)
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:ticket", handleRealtime)
        window.removeEventListener("caim:tickets:invalidated", handleInvalidate)
        window.removeEventListener("visibilitychange", handleInvalidate)
        window.removeEventListener("focus", handleInvalidate)
      }
    }
  }, [activeTicketId, syncTicketFromRemote])

  // Harmonized Case Age Duration Calculation (Both Top Card & Sidebar)
  const caseDuration = React.useMemo(() => {
    if (!data) {
      return { days: 0, text: "0 วัน", isOverdue: false, overdueText: undefined }
    }
    return calculateCaseDuration({
      date: data.reportedDate,
      statusCode: data.currentStage,
      status: data.currentStage === 5 ? "ปิดเคส" : data.status || "รับแจ้ง",
      ageDays: data.ageDays,
      returnDate: data.returnDate,
      closedAt: data.closedAt,
      closedDate: data.closedDate,
      deadlineDate: data.deadlineDate,
    })
  }, [data])

  // Dynamic Remaining Days & Circular Progress Metric Calculation
  const remainingMetric = React.useMemo(() => {
    if (!data) {
      return calculateRemainingDays("", "", new Date(), 60)
    }
    return calculateRemainingDays(data.deadlineDate, data.reportedDate, new Date(), 60, {
      returnDate: data.returnDate,
      closedAt: data.closedAt,
      closedDate: data.closedDate,
      statusCode: data.currentStage,
      status: data.currentStage === 5 ? "ปิดเคส" : data.status,
    })
  }, [data])

  // Historical claims for this device's Serial Number from database (excluding current claim by immutable uid & id)
  const historyCases = React.useMemo(() => {
    if (!data) return []
    const sNo = data.serialNo?.trim()
    if (!sNo || sNo === "—") return []

    return tickets.filter((t) => {
      if (!t.serialNo || t.serialNo.trim() !== sNo) return false
      if (data.uid && t.uid && t.uid === data.uid) return false
      if (t.id === data.id || t.id === activeTicketId || t.uid === activeTicketId) return false
      return true
    })
  }, [tickets, data, activeTicketId])

  const radius = 38
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (remainingMetric.progressPercent / 100) * circumference

  function showBanner(msg: string) {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    setBannerMessage(msg)
    bannerTimerRef.current = setTimeout(() => {
      setBannerMessage(null)
      bannerTimerRef.current = null
    }, 3000)
  }

  function handleOpenEdit() {
    if (!data) return
    const autoDue = calculateDueDate(data.reportedDate || "", 60).dueDateStr
    setEditForm({
      ...data,
      title: data.title || "",
      problemDesc: data.problemDesc === "—" ? "" : data.problemDesc || "",
      repairResult: data.repairResult || "",
      remarks: data.remarks === "—" ? "" : data.remarks || "",
      vendor: data.vendor === "—" ? "" : data.vendor || "",
      model: data.model === "—" ? "" : data.model || "",
      serialNo: data.serialNo === "—" ? "" : data.serialNo || "",
      category: data.category === "—" ? "" : data.category || "",
      deviceType: data.deviceType === "—" ? "" : data.deviceType || "",
      location: data.location === "—" ? "" : data.location || "",
      warrantyStatus: data.warrantyStatus || "อยู่ในประกัน",
      serviceCenter: data.serviceCenter === "—" ? "Huawei" : data.serviceCenter || "Huawei",
      reportedDate: data.reportedDate || "",
      sentDate: data.sentDate || "—",
      lastTrackDate: data.lastTrackDate || "—",
      returnDate: data.returnDate || "—",
      reporter: data.reporter === "—" ? "" : data.reporter || "",
      assignee: data.assignee === "—" ? "" : data.assignee || "",
      deadlineDate:
        data.deadlineDate && !data.deadlineDate.includes("12 พ.ย. 2569")
          ? data.deadlineDate
          : autoDue,
    })
    setFormError(null)
    setIsEditModalOpen(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (isSaving || !data) return

    // 1. Client-side Form Validation
    const title = (editForm.title || "").trim()
    const problemDesc = (editForm.problemDesc || "").trim()
    const serialNo = (editForm.serialNo || "").trim()
    const reportedDate = (editForm.reportedDate || "").trim()

    if (!title) {
      setFormError("กรุณาระบุหัวข้อเลขที่เคลม")
      return
    }
    if (!problemDesc) {
      setFormError("กรุณาระบุอาการเสีย / ปัญหาที่พบ")
      return
    }
    if (!serialNo) {
      setFormError("กรุณาระบุหมายเลขเครื่อง (S/N)")
      return
    }
    if (!reportedDate) {
      setFormError("กรุณาระบุวันที่รับแจ้ง")
      return
    }

    setFormError(null)
    setIsSaving(true)

    const autoDeadline = calculateDueDate(reportedDate, 60).dueDateStr
    const effectiveDeadline =
      editForm.deadlineDate && !editForm.deadlineDate.includes("12 พ.ย. 2569")
        ? editForm.deadlineDate
        : autoDeadline

    const payload = {
      uid: data.uid,
      id: data.id,
      title,
      problemDesc,
      description: problemDesc,
      symptoms: problemDesc,
      repairResult: (editForm.repairResult || "").trim(),
      remarks: (editForm.remarks || "").trim(),
      vendor: (editForm.vendor || "").trim(),
      brand: (editForm.vendor || "").trim(),
      model: (editForm.model || "").trim(),
      serialNo,
      serialNumber: serialNo,
      category: (editForm.category || "").trim(),
      deviceType: (editForm.deviceType || "").trim(),
      group: (editForm.deviceType || "").trim(),
      location: (editForm.location || "").trim(),
      warrantyStatus: (editForm.warrantyStatus || "อยู่ในประกัน").trim(),
      serviceCenter: (editForm.serviceCenter || "Huawei").trim(),
      date: reportedDate,
      reportedDate,
      sentDate: (editForm.sentDate || "—").trim(),
      deadlineDate: effectiveDeadline,
      slaExpiry: effectiveDeadline,
      lastTrackDate: (editForm.lastTrackDate || "—").trim(),
      returnDate: (editForm.returnDate || "—").trim(),
      reporter: (editForm.reporter || "").trim(),
      reporterName: (editForm.reporter || "").trim(),
      assignee: (editForm.assignee || "").trim(),
      assigneeName: (editForm.assignee || "").trim(),
      reportedDateIso: toISODateString(reportedDate),
      sentDateIso: toISODateString(editForm.sentDate),
      deadlineDateIso: toISODateString(effectiveDeadline),
      lastTrackDateIso: toISODateString(editForm.lastTrackDate),
      returnDateIso: toISODateString(editForm.returnDate),
    }

    try {
      const res = await updateTicket(payload)
      if (!res.success) {
        throw new Error(res.error || "บันทึกการแก้ไขไม่สำเร็จ")
      }

      setIsEditModalOpen(false)

      if (res.data) {
        setData(mapDbRecordToDetailData(res.data))
      } else {
        await syncTicketFromRemote(data.uid || data.id)
      }

      await invalidateTicketsCache()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("caim:tickets:invalidated"))
      }

      showBanner("บันทึกการแก้ไขข้อมูลสำเร็จ")
      showToast("บันทึกการแก้ไขข้อมูลสำเร็จ")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
      console.error("[TicketDetailView] Save edit failed:", message)
      setFormError(message)
      showBanner(`บันทึกไม่สำเร็จ: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveStatus(e: React.FormEvent) {
    e.preventDefault()
    if (isSaving || !data) return
    if (newStatusStage === 5 && !newRepairOutcome) {
      showBanner("กรุณาระบุผลการซ่อมก่อนปิดเคส")
      return
    }
    if (newStatusStage === 5 && newRepairOutcome === "replaced_new" && !newReplacedSerialNo.trim()) {
      showBanner("กรุณาระบุ S/N ใหม่จากศูนย์บริการ")
      return
    }

    setIsSaving(true)
    const stageNames: Record<number, string> = {
      1: "รับแจ้ง",
      2: "ส่งศูนย์",
      3: "รออะไหล่",
      4: "ซ่อมเสร็จ",
      5: "ปิดเคส",
      6: "ปฏิเสธเคลม",
    }
    const stageDisplayNames: Record<number, string> = {
      1: "รับแจ้ง/รอตรวจสภาพ",
      2: "ส่งศูนย์บริการแล้ว",
      3: "รออะไหล่/กำลังซ่อม",
      4: "ซ่อมเสร็จ/รอส่งมอบ",
      5: "ปิดเคส (รับคืนเรียบร้อย)",
      6: "ปฏิเสธเคลม (ไม่อยู่ในเงื่อนไข)",
    }

    const stageTitle = stageDisplayNames[newStatusStage] || "ปรับเปลี่ยนสถานะ"
    const nowStr = "วันนี้ " + new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })

    setData((prev) =>
      prev
        ? {
            ...prev,
            currentStage: newStatusStage,
            status: stageNames[newStatusStage] || prev.status,
            timeline: [
              {
                title: `ปรับสถานะเป็น: ${stageTitle}${statusRemark ? ` (${statusRemark})` : ""}`,
                timestamp: nowStr,
                duration: "ดำเนินการล่าสุด",
              },
              ...prev.timeline,
            ],
          }
        : prev
    )

    const effectiveRemarks =
      statusRemark.trim() || (data.remarks !== "—" ? data.remarks : undefined)
    setIsStatusModalOpen(false)
    setStatusRemark("")

    try {
      const updateRes = await updateTicket({
        uid: data.uid,
        id: data.id,
        statusCode: newStatusStage,
        status: stageNames[newStatusStage] || "รับแจ้ง",
        remarks: effectiveRemarks,
        ...(newStatusStage === 5
          ? {
              repairOutcome: newRepairOutcome || undefined,
              replacedNewSerialNo:
                newRepairOutcome === "replaced_new" ? newReplacedSerialNo.trim() : undefined,
              closedBy:
                (data.assignee !== "—" ? data.assignee : undefined) ||
                (data.reporter !== "—" ? data.reporter : undefined),
            }
          : newStatusStage === 6
          ? {
              repairOutcome: "rejected",
              closedBy:
                (data.assignee !== "—" ? data.assignee : undefined) ||
                (data.reporter !== "—" ? data.reporter : undefined),
            }
          : {}),
      })
      if (updateRes?.data) {
        setData(mapDbRecordToDetailData(updateRes.data))
      } else {
        await syncTicketFromRemote(data.uid || data.id)
      }
      await invalidateTicketsCache()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("caim:tickets:invalidated"))
      }
      if (updateRes?.emailDispatched) {
        showBanner("อัปเดตสถานะงานเคลมเรียบร้อยแล้ว พร้อมส่งอีเมลแจ้งเตือน")
      } else if (updateRes?.emailError) {
        showBanner(`อัปเดตสถานะสำเร็จ แต่การส่งอีเมลขัดข้อง: ${updateRes.emailError}`)
      } else {
        showBanner(updateRes?.message || "อัปเดตสถานะงานเคลมเรียบร้อยแล้ว")
      }
    } catch {
      showBanner("เกิดข้อผิดพลาดในการอัปเดตสถานะงานเคลม")
    } finally {
      setIsSaving(false)
      setNewRepairOutcome("")
      setNewReplacedSerialNo("")
    }
  }

  if (isLoadingRecord && !data) {
    return (
      <main id="main" className="flex-1 bg-background">
        <div className="mx-auto flex max-w-350 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
          <Loader2 className="size-7 animate-spin text-brand" />
          <p className="text-sm font-medium text-foreground">
            กำลังดึงข้อมูลงานเคลมจากฐานข้อมูลกลาง...
          </p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main id="main" className="flex-1 bg-background">
        <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-foreground">
              ไม่พบข้อมูลงานเคลมที่ระบุ
            </h1>
            <p className="text-xs text-muted-foreground">
              {notFoundError || "รายการอาจถูกลบออกจากฐานข้อมูลแล้ว หรือรหัสอ้างอิงไม่ถูกต้อง"}
            </p>
          </div>
          <Link href="/tickets">
            <Button size="sm" variant="outline" className="text-xs">
              กลับไปหน้ารายการงานเคลม
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="flex-1 bg-background">
      <div className="mx-auto flex max-w-350 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1">
              <Link
                href="/dashboard"
                aria-label="หน้าแรก"
                className="hover:text-foreground transition-colors"
              >
                <House className="size-3.5" />
              </Link>
            </li>
            <li className="flex items-center text-muted-foreground/60">
              <ChevronRight className="size-3" />
            </li>
            <li className="inline-flex items-center gap-1">
              <Link
                href="/tickets"
                className="hover:text-foreground transition-colors"
              >
                งานเคลม
              </Link>
            </li>
            <li className="flex items-center text-muted-foreground/60">
              <ChevronRight className="size-3" />
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="font-mono font-semibold text-brand">
                {data.claimNumber}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-normal text-foreground truncate max-w-xs">
                {data.title}
              </span>
            </li>
          </ol>
        </nav>

        {/* Page Title with Icon */}
        <div className="flex items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
            <ClipboardList className="size-5.5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/40 rounded-md px-2 py-0.5">
                {data.claimNumber}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {data.title}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.problemDesc}
            </p>
          </div>
        </div>

        {/* Top 2 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          {/* Card 1: อายุงาน (วัน) */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <p className="tabular text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              {caseDuration.days}
            </p>
            <p className="text-xs text-muted-foreground mt-1">อายุงาน (วัน)</p>
          </div>

          {/* Card 2: สถานะประกัน */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <p className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              {data.warrantyStatus}
            </p>
            <p className="text-xs text-muted-foreground mt-1">สถานะประกัน</p>
          </div>
        </div>

        {/* Success Alert Banner */}
        {bannerMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-700 dark:text-emerald-400 animate-in fade-in">
            <Check className="size-4 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
        )}

        {/* Main Status Tracker & Content Card */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-xs">
          {/* Card Header: Case Title, Stage Badge, and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {data.title}
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  data.currentStage === 6
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    data.currentStage === 6 ? "bg-rose-600" : "bg-emerald-600"
                  }`}
                />
                <span>
                  {data.currentStage === 1 && "รับแจ้ง/รอตรวจสภาพ"}
                  {data.currentStage === 2 && "ส่งศูนย์บริการแล้ว"}
                  {data.currentStage === 3 && "รออะไหล่/กำลังซ่อม"}
                  {data.currentStage === 4 && "ซ่อมเสร็จ/รอส่งมอบ"}
                  {data.currentStage === 5 && "ปิดเคส"}
                  {data.currentStage === 6 && "ปฏิเสธเคลม"}
                </span>
              </span>
            </div>

            {/* Action Buttons: แก้ไข & เปลี่ยนสถานะ */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="gap-1.5 text-xs font-medium border-border hover:bg-muted/40 cursor-pointer"
              >
                <Pencil className="size-3.5" />
                <span>แก้ไข</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setNewStatusStage(data.currentStage)
                  setNewRepairOutcome(data.repairOutcome || "")
                  setNewReplacedSerialNo(data.replacedNewSerialNo || "")
                  setIsStatusModalOpen(true)
                }}
                className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 dark:bg-primary dark:text-primary-foreground text-xs font-medium cursor-pointer shadow-xs"
              >
                <RotateCw className="size-3.5" />
                <span>เปลี่ยนสถานะ</span>
              </Button>
            </div>
          </div>

          {/* Horizontal Numbered Lifecycle Stepper */}
          <div className="py-6 px-2 sm:px-6">
            <div className="flex items-center justify-between">
              {STAGES.map((stage, idx) => {
                const isPassed = data.currentStage > stage.step && stage.step !== 6
                const isCurrent = data.currentStage === stage.step

                return (
                  <React.Fragment key={stage.step}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isCurrent
                            ? stage.step === 6
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-emerald-600 text-white shadow-xs"
                            : isPassed
                            ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-400"
                            : "border border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {stage.step}
                      </div>
                      <span
                        className={`text-xs whitespace-nowrap ${
                          isCurrent
                            ? "font-semibold text-foreground"
                            : isPassed
                            ? "text-foreground/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>

                    {idx < STAGES.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 sm:mx-4 -mt-5 transition-colors ${
                          data.currentStage > stage.step && data.currentStage !== 6
                            ? "bg-emerald-600"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          <div className="border-t border-border/80 my-4" />

          {/* Two-Column Grid: Left Details vs Right Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            {/* Left Column (Case Details) */}
            <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
              {/* 1. อาการเสีย / ปัญหาที่พบ */}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  อาการเสีย / ปัญหาที่พบ
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {data.problemDesc || "—"}
                </p>
              </div>

              {/* 2. ผลการซ่อม / การแก้ไข */}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  ผลการซ่อม / การแก้ไข
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {data.repairResult || "ยังไม่มีผลการซ่อม"}
                </p>
              </div>

              {/* 3. หมายเหตุ */}
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  หมายเหตุ
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {data.remarks || "—"}
                </p>
              </div>

              {/* 4. ลำดับเหตุการณ์ (Vertical Timeline) */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  ลำดับเหตุการณ์
                </h3>
                <div className="relative pl-5 border-l-2 border-border/70 space-y-4">
                  {data.timeline.map((item, idx) => {
                    const isInitialStage = idx === data.timeline.length - 1 || item.title.includes("เปิดเคส")
                    const displayDuration =
                      isInitialStage && data.currentStage === 1
                        ? `ค้างอยู่ ${caseDuration.days} วัน`
                        : item.duration

                    return (
                      <div key={idx} className="relative">
                        {/* Timeline dot */}
                        <span className="absolute -left-[27px] top-0.5 size-3.5 rounded-full border-2 border-emerald-600 bg-background flex items-center justify-center">
                          <span className="size-1 rounded-full bg-emerald-600" />
                        </span>
                        <p className="text-xs font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.timestamp} · {displayDuration}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 5. ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้ */}
              {historyCases.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-foreground mb-3">
                    ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้ ({historyCases.length})
                  </h3>

                  <div className="flex flex-col divide-y divide-border/60 rounded-lg border border-border/70 overflow-hidden text-xs">
                    {historyCases.map((c) => (
                      <Link
                        key={c.uid || c.id}
                        href={`/tickets/${encodeURIComponent(c.uid || c.id)}`}
                        className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                      >
                        <span className="font-medium text-foreground hover:underline cursor-pointer">
                          {c.claimTitle || c.title}
                        </span>
                        <span className="text-muted-foreground">{c.date}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            c.statusCode === 5
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                          }`}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          <span>{c.status}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column (Sidebar Widgets) */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 lg:border-l lg:border-border/70 lg:pl-8">
              {/* Widget 1: กำหนดแล้วเสร็จ (Circular Progress Card) */}
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-3">
                  กำหนดแล้วเสร็จ
                </h3>
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative size-24 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 96 96">
                      {/* Background circle */}
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className="stroke-muted"
                        strokeWidth="7"
                        fill="transparent"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        className={`transition-all duration-700 ${
                          remainingMetric.isOverdue
                            ? "stroke-red-500"
                            : remainingMetric.isCompleted
                            ? "stroke-emerald-500"
                            : "stroke-brand"
                        }`}
                        strokeWidth="7"
                        strokeDasharray={circumference}
                        strokeDashoffset={
                          remainingMetric.isOverdue
                            ? 0
                            : remainingMetric.isCompleted
                            ? 0
                            : strokeDashoffset
                        }
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span
                        className={`text-2xl font-bold tracking-tight leading-none ${
                          remainingMetric.isOverdue
                            ? "text-red-600"
                            : remainingMetric.isCompleted
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {remainingMetric.isOverdue
                          ? remainingMetric.overdueDays
                          : remainingMetric.isCompleted
                          ? caseDuration.days
                          : remainingMetric.remainingDays}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        วัน
                      </span>
                    </div>
                  </div>

                  <p
                    className={`text-xs font-semibold mt-3 ${
                      remainingMetric.isOverdue
                        ? "text-red-600"
                        : remainingMetric.isCompleted
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-brand"
                    }`}
                  >
                    {remainingMetric.displayText}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ครบกำหนด {remainingMetric.deadlineDateStr}
                  </p>
                </div>
              </div>

              {/* Widget 2: อุปกรณ์ */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground">
                  <Cpu className="size-3.5 text-muted-foreground" />
                  <span>อุปกรณ์</span>
                </div>

                <div className="flex flex-col text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Serial No.</span>
                    <span className="font-mono font-medium text-foreground">
                      {data.serialNo}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ยี่ห้อ / รุ่น</span>
                    <span className="text-foreground">
                      {data.vendor} / {data.model}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ประเภท</span>
                    <span className="text-foreground">{data.deviceType}</span>
                  </div>
                  <div className="flex items-start justify-between py-2 gap-2">
                    <span className="text-muted-foreground shrink-0">หมวดหมู่</span>
                    <span className="text-right text-foreground">
                      {data.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">สถานที่ติดตั้ง</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" />
                      <span>{data.location}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Widget 3: ข้อมูลเคส */}
              <div>
                <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-foreground">
                  <ShieldCheck className="size-3.5 text-muted-foreground" />
                  <span>ข้อมูลเคส</span>
                </div>

                <div className="flex flex-col text-xs divide-y divide-border/60">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">สถานะประกัน</span>
                    <span className="font-medium text-foreground">
                      {data.warrantyStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ศูนย์บริการ</span>
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <span>{data.serviceCenter}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">วันที่รับแจ้ง</span>
                    <span className="text-foreground">{formatDisplayThaiDate(data.reportedDate)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">
                      วันที่ส่งศูนย์บริการ
                    </span>
                    <span className="text-muted-foreground">{formatDisplayThaiDate(data.sentDate)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">กำหนดแล้วเสร็จ</span>
                    <span className="text-foreground text-right">
                      {remainingMetric.deadlineDateStr}{" "}
                      <span
                        className={`text-xs ${
                          remainingMetric.isOverdue
                            ? "text-red-600 font-medium"
                            : remainingMetric.isCompleted
                            ? "text-emerald-600 dark:text-emerald-400 font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        ({remainingMetric.displayText})
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ติดตามล่าสุด</span>
                    <span className="text-muted-foreground">
                      {formatDisplayThaiDate(data.lastTrackDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">วันที่รับคืน</span>
                    <span className="text-muted-foreground">{formatDisplayThaiDate(data.returnDate)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">อายุงาน</span>
                    <span className="font-medium text-foreground">
                      {caseDuration.text}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ผู้แจ้ง</span>
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <User className="size-3 text-muted-foreground" />
                      <span>{data.reporter}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">ผู้รับผิดชอบ</span>
                    <span className="text-foreground">{data.assignee}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-brand" />
                <h3 className="text-sm font-semibold text-foreground">
                  แก้ไขข้อมูลงานเคลม
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} noValidate className="flex flex-col flex-1 overflow-hidden pt-4">
              {formError && (
                <div className="mb-3 mx-1 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="overflow-y-auto pr-2 space-y-5 flex-1 max-h-[calc(90vh-140px)]">
                {/* กลุ่มที่ 1: ข้อมูลพื้นฐานงานเคลม */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-1.5 flex items-center gap-1.5">
                    <ClipboardList className="size-3.5 text-brand" />
                    <span>ข้อมูลงานเคลม</span>
                  </h4>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-foreground">
                      หัวข้อเลขที่เคลม <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="เช่น CLM-2026-003 หรือ หัวข้อแจ้งเคลม"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-foreground">
                      อาการเสีย / ปัญหาที่พบ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editForm.problemDesc || ""}
                      onChange={(e) => setEditForm({ ...editForm, problemDesc: e.target.value })}
                      rows={2}
                      className="rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="ระบุอาการเสีย หรือปัญหาที่พบ"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">ผลการซ่อม / การแก้ไข</label>
                      <Input
                        value={editForm.repairResult || ""}
                        onChange={(e) => setEditForm({ ...editForm, repairResult: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="เช่น ยังไม่มีผลการซ่อม, เปลี่ยนโมดูลใหม่"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">หมายเหตุ</label>
                      <Input
                        value={editForm.remarks || ""}
                        onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="หมายเหตุเพิ่มเติม"
                      />
                    </div>
                  </div>
                </div>

                {/* กลุ่มที่ 2: ข้อมูลอุปกรณ์ (Equipment) */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-1.5 flex items-center gap-1.5">
                    <Cpu className="size-3.5 text-brand" />
                    <span>ข้อมูลอุปกรณ์ (Equipment)</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 sm:col-span-1">
                      <label className="font-medium text-foreground">
                        Serial No. (S/N) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={editForm.serialNo || ""}
                        onChange={(e) => setEditForm({ ...editForm, serialNo: e.target.value })}
                        className="h-8 font-mono text-xs"
                        placeholder="หมายเลขเครื่อง"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">ยี่ห้อ (Brand / Vendor)</label>
                      <Input
                        value={editForm.vendor || ""}
                        onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="เช่น Huawei, Forth, Hytera"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">รุ่น (Model)</label>
                      <Input
                        value={editForm.model || ""}
                        onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="เช่น OMXD30000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">หมวดหมู่อุปกรณ์ (Category)</label>
                      <Input
                        value={editForm.category || ""}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="เช่น ระบบบริหารจัดการ Software-Defined WAN"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">ประเภท / กลุ่ม (Group / Device Type)</label>
                      <Input
                        value={editForm.deviceType || ""}
                        onChange={(e) => setEditForm({ ...editForm, deviceType: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="เช่น Optical Transceiver, Router"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-medium text-foreground">สถานที่ติดตั้ง (Installation Location)</label>
                    <Input
                      value={editForm.location || ""}
                      onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="เช่น ที่ว่าการอำเภอเลาขวัญ จ.กาญจนบุรี"
                    />
                  </div>
                </div>

                {/* กลุ่มที่ 3: ข้อมูลเคสและการติดตาม (Case Information & Timestamps) */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold text-foreground border-b border-border/60 pb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-brand" />
                    <span>ข้อมูลเคสและการติดตาม (Case Information & Timestamps)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">สถานะประกัน (Warranty Status)</label>
                      <select
                        value={editForm.warrantyStatus || "อยู่ในประกัน"}
                        onChange={(e) => setEditForm({ ...editForm, warrantyStatus: e.target.value })}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="อยู่ในประกัน">อยู่ในประกัน</option>
                        <option value="หมดประกัน">หมดประกัน</option>
                        <option value="รอตรวจสอบ">รอตรวจสอบ</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">ศูนย์บริการ (Service Center)</label>
                      <select
                        value={editForm.serviceCenter || "Huawei"}
                        onChange={(e) => setEditForm({ ...editForm, serviceCenter: e.target.value })}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="Huawei">Huawei</option>
                        <option value="Forth">Forth</option>
                        <option value="Hytera">Hytera</option>
                        <option value="Cisco">Cisco</option>
                        <option value="ศูนย์บริการภายนอก">ศูนย์บริการภายนอก</option>
                        <option value="ศูนย์ซ่อมหลัก">ศูนย์ซ่อมหลัก</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">
                        วันที่รับแจ้ง (Reported Date) <span className="text-red-500">*</span>
                      </label>
                      <DatePickerInput
                        value={editForm.reportedDate || ""}
                        onChange={(thaiStr, isoStr) => {
                          const autoDue = calculateDueDate(isoStr || thaiStr, 60).dueDateStr
                          setEditForm((prev) => ({
                            ...prev,
                            reportedDate: thaiStr,
                            deadlineDate: autoDue,
                          }))
                        }}
                        placeholder="เลือกวันที่รับแจ้ง"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">
                        กำหนดแล้วเสร็จ (SLA 60 วัน)
                      </label>
                      <DatePickerInput
                        value={editForm.deadlineDate || ""}
                        onChange={(thaiStr) =>
                          setEditForm((prev) => ({
                            ...prev,
                            deadlineDate: thaiStr || "—",
                          }))
                        }
                        placeholder="เลือกกำหนดแล้วเสร็จ"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">
                        วันที่ส่งศูนย์บริการ
                      </label>
                      <DatePickerInput
                        value={editForm.sentDate || ""}
                        onChange={(thaiStr) =>
                          setEditForm((prev) => ({
                            ...prev,
                            sentDate: thaiStr || "—",
                          }))
                        }
                        placeholder="เลือกวันที่ส่งศูนย์"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">
                        ติดตามล่าสุด
                      </label>
                      <DatePickerInput
                        value={editForm.lastTrackDate || ""}
                        onChange={(thaiStr) =>
                          setEditForm((prev) => ({
                            ...prev,
                            lastTrackDate: thaiStr || "—",
                          }))
                        }
                        placeholder="เลือกวันที่ติดตามล่าสุด"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">
                        วันที่รับคืน
                      </label>
                      <DatePickerInput
                        value={editForm.returnDate || ""}
                        onChange={(thaiStr) =>
                          setEditForm((prev) => ({
                            ...prev,
                            returnDate: thaiStr || "—",
                          }))
                        }
                        placeholder="เลือกวันที่รับคืน"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">ผู้แจ้ง (Reporter)</label>
                      <Input
                        value={editForm.reporter || ""}
                        onChange={(e) => setEditForm({ ...editForm, reporter: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="ชื่อผู้แจ้ง"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-medium text-foreground">ผู้รับผิดชอบ (Assignee)</label>
                      <Input
                        value={editForm.assignee || ""}
                        onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                        className="h-8 text-xs"
                        placeholder="ชื่อผู้รับผิดชอบ"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-4 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setIsEditModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="gap-1.5 bg-brand text-white hover:bg-brand-dark disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>บันทึกการแก้ไข</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {isStatusModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsStatusModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl p-5 animate-in zoom-in-95 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RotateCw className="size-4 text-brand" />
                <h3 className="text-sm font-semibold text-foreground">
                  เปลี่ยนสถานะงานเคลม
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="flex flex-col gap-4 pt-4">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">เลือกขั้นตอนสถานะใหม่</label>
                <div className="flex flex-col gap-1.5">
                  {STAGES.map((s) => (
                    <label
                      key={s.step}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        newStatusStage === s.step
                          ? "border-brand bg-brand/5 text-brand font-semibold"
                          : "border-border hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="stage"
                          checked={newStatusStage === s.step}
                          onChange={() => setNewStatusStage(s.step)}
                          className="text-brand focus:ring-brand"
                        />
                        <span>ขั้นที่ {s.step}: {s.label}</span>
                      </div>
                      {s.step === 1 && <span className="text-[11px] text-muted-foreground">รอตรวจสภาพ</span>}
                      {s.step === 2 && <span className="text-[11px] text-muted-foreground">ส่งศูนย์บริการ</span>}
                      {s.step === 3 && <span className="text-[11px] text-muted-foreground">กำลังซ่อม</span>}
                      {s.step === 4 && <span className="text-[11px] text-muted-foreground">ซ่อมเสร็จ</span>}
                      {s.step === 5 && <span className="text-[11px] text-muted-foreground">ปิดเคส/ส่งคืน</span>}
                      {s.step === 6 && <span className="text-[11px] text-muted-foreground">ไม่อยู่ในเงื่อนไข</span>}
                    </label>
                  ))}
                </div>
              </div>

              {newStatusStage === 5 && (
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">
                    ผลการซ่อม (ส่งกลับ Stock-Flow อัตโนมัติ)
                  </label>
                  <div className="flex flex-col gap-1.5">
                    {REPAIR_OUTCOMES.filter(option => option.value !== "rejected").map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          newRepairOutcome === option.value
                            ? "border-brand bg-brand/5 text-brand font-semibold"
                            : "border-border hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="repairOutcome"
                          checked={newRepairOutcome === option.value}
                          onChange={() => setNewRepairOutcome(option.value)}
                          className="text-brand focus:ring-brand"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>

                  {newRepairOutcome === "replaced_new" && (
                    <div className="flex flex-col gap-1 pt-1">
                      <label className="font-medium text-foreground">Serial No. ใหม่จากศูนย์บริการ</label>
                      <Input
                        value={newReplacedSerialNo}
                        onChange={(e) => setNewReplacedSerialNo(e.target.value)}
                        placeholder="ระบุ S/N ของเครื่องที่เปลี่ยนใหม่"
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  )}

                  {!newRepairOutcome && (
                    <p className="text-[11px] text-muted-foreground">
                      ต้องระบุผลการซ่อมก่อนปิดเคส เพื่อให้ Stock-Flow บันทึกตัดจำหน่ายหรือรับเข้าคลังได้ถูกต้อง
                    </p>
                  )}
                </div>
              )}

              {newStatusStage === 6 && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-700 dark:text-red-300">
                  <p className="font-semibold">สถานะ: ปฏิเสธเคลม (ไม่อยู่ในเงื่อนไขการรับประกัน)</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    เมื่อบันทึก ระบบจะส่ง Webhook แจ้งผลปฏิเสธการเคลมกลับไปยัง Stock-Flow อัตโนมัติ เพื่อให้เจ้าหน้าที่คลังตรวจสอบและดำเนินการต่อไป
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">บันทึกช่วยจำ / หมายเหตุขั้นตอน</label>
                <Input
                  placeholder="เช่น ส่งของให้ศูนย์แล้ว เลขพัสดุ..."
                  value={statusRemark}
                  onChange={(e) => setStatusRemark(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => setIsStatusModalOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSaving ||
                    (newStatusStage === 5 && !newRepairOutcome) ||
                    (newStatusStage === 5 && newRepairOutcome === "replaced_new" && !newReplacedSerialNo.trim())
                  }
                  size="sm"
                  className="gap-1.5 bg-brand text-white hover:bg-brand-dark disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>ยืนยันเปลี่ยนสถานะ</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 border border-slate-800">
          <Check className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </main>
  )
}
