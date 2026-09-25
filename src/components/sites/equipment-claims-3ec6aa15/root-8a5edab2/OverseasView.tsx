"use client"

import * as React from "react"
import Link from "next/link"
import {
  PlaneTakeoff,
  ChevronRight,
  House,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Calendar,
  History,
  Clock,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  RotateCcw,
  Wifi
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ASSETS } from "./assetsData"
import { saveRmaApi } from "@/lib/storage/recordStorage"
import { useRealtimeSync } from "@/hooks/useRealtimeSync"
import { useRmaQuery, type RmaItem } from "@/hooks/useRmaQuery"

interface ClaimCaseOption {
  id: string
  caseNo: string
  title: string
  serialNo: string
  vendor: string
  model: string
  status: string
}

const AVAILABLE_CASES: ClaimCaseOption[] = [
  {
    id: "case-01",
    caseNo: "FORTH-2026-002",
    title: "บอร์ดส่งสัญญาณ SHF ชำรุด",
    serialNo: "200426",
    vendor: "Hytera",
    model: "DIB-R5 outdoor",
    status: "ส่งศูนย์",
  },
  {
    id: "case-02",
    caseNo: "FORTH-2026-001",
    title: "Optical Transceiver ไม่ตอบสนอง",
    serialNo: "1000167600349",
    vendor: "Huawei",
    model: "OMXD30000",
    status: "รับแจ้ง",
  },
  {
    id: "case-03",
    caseNo: "FORTH-2026-004",
    title: "เพาเวอร์ซัพพลาย TaiShan 200 ดับ",
    serialNo: "N02555009980",
    vendor: "Huawei",
    model: "TaiShan 200 Server 2280",
    status: "ส่งศูนย์",
  },
  {
    id: "case-04",
    caseNo: "FORTH-2026-005",
    title: "DMR Mobile Radio กำลังส่งตก",
    serialNo: "1000167600350",
    vendor: "Hytera",
    model: "MD788G",
    status: "รับแจ้ง",
  },
]

function getInitialDateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  let hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const ampm = hours >= 12 ? "PM" : "AM"
  hours = hours % 12
  hours = hours ? hours : 12
  const strHours = String(hours).padStart(2, "0")
  return `${year}-${month}-${day} ${strHours}:${minutes} ${ampm}`
}

export function OverseasView() {
  const { rmaList, deleteRma, updateRma, refetch: refetchRma } = useRmaQuery()

  // Empty Table State flag on filter reset
  const [isTableCleared, setIsTableCleared] = React.useState(false)

  // Deletion Confirmation & Feedback States
  const [itemToDelete, setItemToDelete] = React.useState<RmaItem | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Success Alert Toast
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Real-time synchronization for Overseas RMA records
  const { isConnected } = useRealtimeSync()

  // State for available claim cases & equipments from DB
  const [availableCases, setAvailableCases] = React.useState<ClaimCaseOption[]>(AVAILABLE_CASES)
  const [equipmentsData, setEquipmentsData] = React.useState<(typeof ASSETS)>(ASSETS)

  // Sync available tickets for case options from DB on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      fetch("/api/tickets")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
            const mappedCases: ClaimCaseOption[] = data.tickets.map((t: { id: string; title?: string; problemDesc?: string; serialNo?: string; vendor?: string; model?: string; status?: string }) => ({
              id: t.id,
              caseNo: t.title || t.id,
              title: t.problemDesc || t.title,
              serialNo: t.serialNo,
              vendor: t.vendor,
              model: t.model,
              status: t.status,
            }))
            setAvailableCases(mappedCases)
          }
        })
        .catch((err) => console.warn("Could not sync tickets for RMA:", err))

      // 3. Fetch live equipments
      fetch("/api/equipments")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && Array.isArray(data.equipments) && data.equipments.length > 0) {
            setEquipmentsData(data.equipments)
          }
        })
        .catch((err) => console.warn("Could not sync equipments for RMA:", err))
    }
  }, [])

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [vendorFilter, setVendorFilter] = React.useState("all")
  const [onlyOverduePenalty, setOnlyOverduePenalty] = React.useState(false)

  // Applied Filter
  const [appliedFilters, setAppliedFilters] = React.useState({
    query: "",
    stage: "all",
    status: "all",
    vendor: "all",
    onlyOverdue: false,
  })

  // Selected item for timeline modal
  const [timelineItem, setTimelineItem] = React.useState<RmaItem | null>(null)

  // Equipment options from live DB equipments
  const equipmentOptions = React.useMemo(() => {
    const map = new Map<string, (typeof ASSETS)[0]>()
    for (const a of equipmentsData) {
      if (a.serial && !map.has(a.serial)) {
        map.set(a.serial, a)
      }
    }
    return Array.from(map.values()).slice(0, 150)
  }, [equipmentsData])

  // New RMA Modal state
  const [newRmaModalOpen, setNewRmaModalOpen] = React.useState(false)
  const [newRmaForm, setNewRmaForm] = React.useState({
    rmaNo: "",
    status: "in_progress",
    selectedAssetSerial: "",
    linkedCaseId: "",
    serviceCenter: "",
    destination: "",
    openDate: getInitialDateTime(),
    remarks: "",
  })
  const [formValidationError, setFormValidationError] = React.useState<string | null>(null)

  const handleCaseChange = (caseId: string) => {
    setNewRmaForm((prev) => {
      const updated = { ...prev, linkedCaseId: caseId }
      if (caseId && caseId !== "none") {
        const foundCase = availableCases.find((c) => c.id === caseId)
        if (foundCase) {
          if (!prev.serviceCenter) {
            updated.serviceCenter = foundCase.vendor
          }
          if (!prev.destination) {
            updated.destination =
              foundCase.vendor === "Hytera" ? "Hytera Hongkong" : "Huawei Service Center"
          }
        }
      }
      return updated
    })
    if (formValidationError) setFormValidationError(null)
  }

  const handleEquipmentChange = (serial: string) => {
    setNewRmaForm((prev) => {
      const updated = { ...prev, selectedAssetSerial: serial }
      if (serial) {
        const foundAsset = equipmentsData.find((a) => a.serial === serial)
        if (foundAsset) {
          if (!prev.serviceCenter && foundAsset.vendor) {
            updated.serviceCenter = foundAsset.vendor
          }
          if (!prev.destination && foundAsset.vendor) {
            updated.destination =
              foundAsset.vendor === "Hytera" ? "Hytera Hongkong" : "Huawei Service Center"
          }
        }
      }
      return updated
    })
    if (formValidationError) setFormValidationError(null)
  }

  // Edit RMA state
  const [editingItem, setEditingItem] = React.useState<RmaItem | null>(null)

  const handleSearch = React.useCallback(() => {
    // Re-enable table rendering upon manual search trigger
    setIsTableCleared(false)

    setAppliedFilters({
      query: searchQuery.trim(),
      stage: stageFilter,
      status: statusFilter,
      vendor: vendorFilter,
      onlyOverdue: onlyOverduePenalty,
    })
  }, [searchQuery, stageFilter, statusFilter, vendorFilter, onlyOverduePenalty])

  const handleResetFilters = React.useCallback(() => {
    // 1. Reset all inputs to default empty/placeholder states
    setSearchQuery("")
    setStageFilter("all")
    setStatusFilter("all")
    setVendorFilter("all")
    setOnlyOverduePenalty(false)

    // 2. Empty Table State: Clear all rendered records until manually searched
    setIsTableCleared(true)

    setAppliedFilters({
      query: "",
      stage: "all",
      status: "all",
      vendor: "all",
      onlyOverdue: false,
    })
  }, [])

  // Permanent Record Deletion Handlers
  const confirmDeleteItem = React.useCallback((item: RmaItem) => {
    setItemToDelete(item)
  }, [])

  const executeDeleteItem = React.useCallback(async () => {
    if (!itemToDelete) return
    const targetId = itemToDelete.id
    const targetRmaNo = itemToDelete.rmaNo
    setIsDeleting(true)

    try {
      const res = await deleteRma(targetId)
      if (!res.success) {
        throw new Error(res.error || "Failed to delete RMA")
      }
      showToast(res.message || `ลบใบส่งซ่อม "${targetRmaNo}" ถาวรเรียบร้อยแล้ว`)
    } catch (err) {
      console.error("Failed to delete RMA record", err)
      showToast("เกิดข้อผิดพลาดในการลบใบส่งซ่อม")
    } finally {
      setIsDeleting(false)
      setItemToDelete(null)
    }
  }, [itemToDelete, deleteRma])

  const filteredItems = React.useMemo(() => {
    // Empty Table State: When filters are cleared, completely clear all rendered records
    if (isTableCleared) {
      return []
    }

    return rmaList.filter((item) => {
      if (appliedFilters.query) {
        const q = appliedFilters.query.toLowerCase()
        const match =
          item.rmaNo.toLowerCase().includes(q) ||
          item.caseName.toLowerCase().includes(q) ||
          item.serialNo.toLowerCase().includes(q) ||
          item.vendor.toLowerCase().includes(q)
        if (!match) return false
      }
      if (appliedFilters.stage !== "all" && String(item.currentStageNumber) !== appliedFilters.stage) {
        return false
      }
      if (appliedFilters.status !== "all" && item.statusBadge !== appliedFilters.status) {
        return false
      }
      if (appliedFilters.vendor !== "all" && item.vendor !== appliedFilters.vendor) {
        return false
      }
      if (appliedFilters.onlyOverdue && !item.isOverduePenalty) {
        return false
      }
      return true
    })
  }, [rmaList, appliedFilters, isTableCleared])

  const handleCreateRma = (e: React.FormEvent) => {
    e.preventDefault()

    const hasEquipment = Boolean(newRmaForm.selectedAssetSerial)
    const hasCase = Boolean(newRmaForm.linkedCaseId && newRmaForm.linkedCaseId !== "none")

    if (!hasEquipment && !hasCase) {
      setFormValidationError("กรุณาเลือกอุปกรณ์จากทะเบียน หรือผูกกับเคสแจ้งเคลมอย่างน้อยหนึ่งอย่าง")
      return
    }

    setFormValidationError(null)

    let resolvedCaseName = "ไม่ผูกเคส"
    let resolvedSerial = "S/N-PENDING"
    let resolvedVendor = newRmaForm.serviceCenter || "Hytera"
    let resolvedModel = "อุปกรณ์สื่อสาร"

    if (hasCase) {
      const foundCase = availableCases.find((c) => c.id === newRmaForm.linkedCaseId)
      if (foundCase) {
        resolvedCaseName = foundCase.caseNo
        resolvedSerial = foundCase.serialNo
        resolvedVendor = foundCase.vendor
        resolvedModel = foundCase.model
      }
    }

    if (hasEquipment) {
      const foundAsset = equipmentsData.find((a) => a.serial === newRmaForm.selectedAssetSerial)
      if (foundAsset) {
        resolvedSerial = foundAsset.serial
        resolvedVendor = foundAsset.vendor || resolvedVendor
        resolvedModel = foundAsset.name || foundAsset.model || resolvedModel
      }
    }

    if (newRmaForm.serviceCenter) {
      resolvedVendor = newRmaForm.serviceCenter
    }

    const generatedRmaNo =
      newRmaForm.rmaNo.trim() ||
      `RMA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900 + 100))}`

    const statusBadgeMap: Record<string, { badge: "in_progress" | "returned"; text: string }> = {
      in_progress: { badge: "in_progress", text: "กำลังดำเนินการ" },
      pending: { badge: "in_progress", text: "รอดำเนินการ" },
      shipped: { badge: "in_progress", text: "จัดส่งแล้ว" },
      returned: { badge: "returned", text: "ของกลับถึงแล้ว" },
      completed: { badge: "returned", text: "เสร็จสิ้น" },
    }

    const badgeInfo = statusBadgeMap[newRmaForm.status] || {
      badge: "in_progress",
      text: "กำลังดำเนินการ",
    }

    const newItem: RmaItem = {
      id: String(Date.now()),
      rmaNo: generatedRmaNo,
      caseName: resolvedCaseName,
      serialNo: resolvedSerial,
      vendor: resolvedVendor,
      model: resolvedModel,
      currentStageNumber: 1,
      totalStages: 8,
      currentStageName: "1. ระบบใบ RMA",
      stageWaitDays: "ค้างมา 0 วัน",
      openDate: newRmaForm.openDate.split(" ")[0] || "24 ก.ย. 2569",
      totalDays: "0 วัน",
      statusBadge: badgeInfo.badge,
      statusBadgeText: badgeInfo.text,
      penaltyDays: "0 วัน",
      penaltyStandard: "จาก 14 วัน",
      isOverduePenalty: false,
    }

    // 1. Persist to Database API & Transaction Log, then refetch
    saveRmaApi({
      id: newItem.id,
      rmaNo: newItem.rmaNo,
      caseName: newItem.caseName,
      ticketId: newRmaForm.linkedCaseId && newRmaForm.linkedCaseId !== "none" ? newRmaForm.linkedCaseId : undefined,
      serialNo: newItem.serialNo,
      vendor: newItem.vendor,
      model: newItem.model,
      destination: newRmaForm.destination || "ต่างประเทศ",
      status: newRmaForm.status,
      statusBadge: newItem.statusBadge,
      statusBadgeText: newItem.statusBadgeText,
      currentStageNumber: newItem.currentStageNumber,
      totalStages: newItem.totalStages,
      currentStageName: newItem.currentStageName,
      stageWaitDays: newItem.stageWaitDays,
      openDate: newItem.openDate,
      totalDays: newItem.totalDays,
      penaltyDays: newItem.penaltyDays,
      penaltyStandard: newItem.penaltyStandard,
      isOverduePenalty: newItem.isOverduePenalty,
      remarks: newRmaForm.remarks,
    })
      .then(() => {
        refetchRma()
      })
      .catch((err) => console.warn("Failed to persist RMA:", err))

    setNewRmaModalOpen(false)
    setNewRmaForm({
      rmaNo: "",
      status: "in_progress",
      selectedAssetSerial: "",
      linkedCaseId: "",
      serviceCenter: "",
      destination: "",
      openDate: getInitialDateTime(),
      remarks: "",
    })
    showToast(`เปิดใบส่งซ่อม ${generatedRmaNo} และบันทึกเข้าฐานข้อมูลเรียบร้อยแล้ว`)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    updateRma(editingItem)
    setEditingItem(null)
    showToast("บันทึกข้อมูลใบส่งซ่อมลงฐานข้อมูลเรียบร้อยแล้ว")
  }

  return (
    <main id="main" className="flex-1 bg-slate-50/50 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-top-2">
            <Check className="size-4" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* =========================================================================
            1. HEADER & BREADCRUMB
           ========================================================================= */}
        <div className="flex flex-col gap-3">
          {/* Breadcrumb */}
          <nav aria-label="breadcrumb">
            <ol className="flex items-center gap-1.5 text-xs text-slate-500">
              <li className="inline-flex items-center">
                <Link
                  href="/dashboard"
                  aria-label="หน้าแรก"
                  className="transition-colors hover:text-slate-900"
                >
                  <House className="size-3.5 text-slate-500" />
                </Link>
              </li>
              <li className="flex items-center text-slate-400">
                <ChevronRight className="size-3" />
              </li>
              <li className="inline-flex items-center">
                <span className="font-normal text-slate-700">ส่งเคลมต่างประเทศ</span>
              </li>
            </ol>
          </nav>

          {/* Title & Action Button */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] text-white shadow-xs">
                <PlaneTakeoff className="size-5.5 text-white" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    ส่งเคลมต่างประเทศ
                  </h1>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                  }`}>
                    <Wifi className="size-3" />
                    {isConnected ? "ซิงก์เรียลไทม์" : "ออฟไลน์/แคช"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 sm:text-sm">
                  ติดตามอุปกรณ์ที่ส่งเคลมไปต่างประเทศทีละขั้น พร้อมนาฬิกาบทปรับของผู้ขาย
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNewRmaModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0c1a30] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1e293b] cursor-pointer"
            >
              <Plus className="size-4" />
              <span>เปิดใบส่งซ่อม</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. FILTER & SEARCH PANEL
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* ค้นหา */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">ค้นหา</label>
              <Input
                placeholder="เลขใบ RMA, เลขที่เคส, S/N, ยี่ห้อ.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
              />
            </div>

            {/* ขั้นตอน */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">ขั้นตอน</label>
              <div className="relative">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกขั้นตอน</option>
                  <option value="1">1. ระบบใบ RMA</option>
                  <option value="2">2. Forth ตรวจสอบ</option>
                  <option value="3">3. กสทช. ตรวจสอบ</option>
                  <option value="4">4. ส่งออก</option>
                  <option value="5">5. ถึงศูนย์ต่างประเทศ</option>
                  <option value="6">6. จีน เข้ากระบวนการซ่อม</option>
                  <option value="7">7. ส่งกลับเครื่องบิน</option>
                  <option value="8">8. เคลียร์ศุลกากร</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* สถานะใบ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">สถานะใบ</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="in_progress">กำลังดำเนินการ</option>
                  <option value="returned">ของกลับถึงแล้ว</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* ศูนย์บริการ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-normal text-slate-700">ศูนย์บริการ</label>
              <div className="relative">
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">ทุกศูนย์บริการ</option>
                  <option value="Huawei">Huawei</option>
                  <option value="Hytera">Hytera</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* เฉพาะที่เกินบทปรับ Toggle */}
            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() => setOnlyOverduePenalty((v) => !v)}
                className={`flex h-9 items-center justify-center rounded-lg border text-xs font-normal transition-all cursor-pointer ${
                  onlyOverduePenalty
                    ? "border-red-400 bg-red-50 text-red-700 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>เฉพาะที่เกินบทปรับ</span>
              </button>
            </div>
          </div>

          {/* Filter Action Buttons */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              <RotateCcw className="size-3.5 text-slate-500" />
              <span>ล้างตัวกรอง</span>
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0c1a30] px-4.5 text-xs font-medium text-white shadow-xs transition-colors hover:bg-[#1e293b] cursor-pointer"
            >
              <Search className="size-3.5" />
              <span>ค้นหา</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            3. RMA DATA TABLE & SEGMENTED PROGRESS BARS
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200/80 bg-white text-slate-600">
                <tr>
                  <th className="px-5 py-3.5 font-medium">ใบ RMA / เคส</th>
                  <th className="px-4 py-3.5 font-medium">อุปกรณ์</th>
                  <th className="px-4 py-3.5 font-medium">ขั้นตอนปัจจุบัน</th>
                  <th className="px-4 py-3.5 font-medium">เปิดใบ</th>
                  <th className="px-4 py-3.5 font-medium">รวม</th>
                  <th className="px-4 py-3.5 font-medium">บทปรับผู้ขาย</th>
                  <th className="px-4 py-3.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      {isTableCleared ? (
                        <div className="flex flex-col items-center justify-center gap-2.5">
                          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <RotateCcw className="size-5.5 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              ล้างตัวกรองแล้ว — ไม่มีรายการแสดงผล
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                              ระบบได้ล้างรายการข้อมูลออกจากตารางแล้ว กรุณาเลือกเงื่อนไขที่ต้องการหรือกดปุ่ม &quot;ค้นหา&quot; เพื่อแสดงรายการ RMA
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSearch}
                            className="mt-2 inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-[#0c1a30] px-4 text-xs font-medium text-white shadow-xs hover:bg-[#1e293b] cursor-pointer transition-colors"
                          >
                            <Search className="size-3.5" />
                            <span>ค้นหาข้อมูล</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 py-6">
                          <p className="text-sm font-medium text-slate-600">
                            ไม่พบรายการส่งซ่อมต่างประเทศที่ตรงกับเงื่อนไข
                          </p>
                          <p className="text-xs text-slate-400">
                            ลองปรับเปลี่ยนเงื่อนไขการค้นหาใหม่
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isOverdue = item.isOverduePenalty

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isOverdue
                            ? "bg-[#fff5f5] hover:bg-[#ffebeb]"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* ใบ RMA / เคส */}
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800 text-xs">
                            {item.rmaNo}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.caseName}
                          </p>
                        </td>

                        {/* อุปกรณ์ */}
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs text-slate-800">
                            {item.serialNo}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {item.vendor} / {item.model}
                          </p>
                        </td>

                        {/* ขั้นตอนปัจจุบัน (Segmented Progress Bars) */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: item.totalStages }).map((_, idx) => {
                              const step = idx + 1
                              let color = "bg-slate-200"
                              if (step < item.currentStageNumber) {
                                color = "bg-emerald-500"
                              } else if (step === item.currentStageNumber) {
                                color =
                                  item.currentStageNumber === item.totalStages
                                    ? "bg-emerald-500"
                                    : "bg-blue-600"
                              }
                              return (
                                <span
                                  key={idx}
                                  className={`h-1.5 w-3.5 rounded-full ${color}`}
                                />
                              )
                            })}
                            <span className="ml-1.5 text-[11px] text-slate-400 font-medium">
                              {item.currentStageNumber === 8 ? "8/8" : "5/8"}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <p className="font-semibold text-slate-800 text-xs">
                              {item.currentStageName}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.stageWaitDays}
                            </p>
                          </div>
                        </td>

                        {/* เปิดใบ */}
                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                          {item.openDate}
                        </td>

                        {/* รวม (Elapsed Days & Status Badge) */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <p className="text-slate-700 text-xs font-medium">
                            {item.totalDays}
                          </p>
                          {item.statusBadge === "in_progress" ? (
                            <span className="mt-1 inline-block rounded-full border border-blue-200/60 bg-[#eff6ff] px-2 py-0.5 text-[10px] font-medium text-[#2563eb]">
                              {item.statusBadgeText}
                            </span>
                          ) : (
                            <span className="mt-1 inline-block rounded-full border border-emerald-200/60 bg-[#ecfdf5] px-2 py-0.5 text-[10px] font-medium text-[#059669]">
                              {item.statusBadgeText}
                            </span>
                          )}
                        </td>

                        {/* บทปรับผู้ขาย */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isOverdue ? (
                            <div>
                              <p className="font-bold text-[#dc2626] text-xs">
                                {item.penaltyDays}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.penaltyStandard}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-slate-700 text-xs font-medium">
                                {item.penaltyDays}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {item.penaltyStandard}
                              </p>
                            </div>
                          )}
                        </td>

                        {/* Action Links */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setTimelineItem(item)}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
                              title="ดูไทม์ไลน์กระบวนการ"
                              aria-label="ดูไทม์ไลน์"
                            >
                              <History className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingItem({ ...item })}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer transition-colors"
                              title="แก้ไข"
                              aria-label="แก้ไข"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDeleteItem(item)}
                              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer transition-colors"
                              title="ลบใบส่งซ่อมนี้ถาวร"
                              aria-label="ลบ"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Footer */}
          <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer"
                >
                  <span>แถวต่อหน้า 20</span>
                  <ChevronDown className="size-3.5 text-slate-400" />
                </button>
              </div>
              <span className="text-slate-500">
                แสดง 1–{filteredItems.length} จาก {filteredItems.length} ใบ
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-400 cursor-not-allowed"
              >
                <ChevronLeft className="size-3.5" />
                <span>ก่อนหน้า</span>
              </button>

              <span className="px-2 text-xs font-normal text-slate-700">
                หน้า 1/1
              </span>

              <button
                type="button"
                disabled
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-400 cursor-not-allowed"
              >
                <span>ถัดไป</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. TIMELINE TRACKING MODAL (ใบ TEST20)
           ========================================================================= */}
        {timelineItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setTimelineItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-200/80 px-6 py-4 bg-white">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    ใบ {timelineItem.rmaNo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    S/N {timelineItem.serialNo} · เคส {timelineItem.caseName} · {timelineItem.vendor} Hongkong
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTimelineItem(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Modal Timeline Content (Scrollable) */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {/* Step 1: ระบบใบ RMA */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#ecfdf5] border border-emerald-300 text-[#16a34a] font-bold text-[10px]">
                      ✓
                    </span>
                    <div className="pl-3">
                      <p className="font-semibold text-slate-900 text-xs">ระบบใบ RMA</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 2 วัน</p>
                    </div>
                    <div className="text-right text-slate-500 text-xs">
                      11 ก.ย. 2569 → 11 ก.ย. 2569 (0 วัน)
                    </div>
                  </div>

                  {/* Step 2: Forth (ส่งตรวจสอบภายใน) */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#ecfdf5] border border-emerald-300 text-[#16a34a] font-bold text-[10px]">
                      ✓
                    </span>
                    <div className="pl-3">
                      <p className="font-semibold text-slate-900 text-xs">Forth (ส่งตรวจสอบภายใน)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 7 วัน</p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-500">9 ก.ย. 2569 → 18 ก.ย. 2569 </span>
                      <span className="font-bold text-[#ea580c]">(8 วัน)</span>
                    </div>
                  </div>

                  {/* Step 3: กสทช. (ตรวจสอบ / อนุมัติ) */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#ecfdf5] border border-emerald-300 text-[#16a34a] font-bold text-[10px]">
                      ✓
                    </span>
                    <div className="pl-3">
                      <p className="font-semibold text-slate-900 text-xs">กสทช. (ตรวจสอบ / อนุมัติ)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 5 วัน</p>
                    </div>
                    <div className="text-right text-slate-500 text-xs">
                      21 ก.ย. 2569 → 24 ก.ย. 2569 (3 วัน)
                    </div>
                  </div>

                  {/* Step 4: ส่งออก */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#ecfdf5] border border-emerald-300 text-[#16a34a] font-bold text-[10px]">
                      ✓
                    </span>
                    <div className="pl-3">
                      <p className="font-semibold text-slate-900 text-xs">ส่งออก</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 3 วัน</p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-500">25 ก.ย. 2569 → 29 ก.ย. 2569 </span>
                      <span className="font-bold text-[#ea580c]">(4 วัน)</span>
                    </div>
                  </div>

                  {/* Step 5: Hytera Hongkong */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#ecfdf5] border border-emerald-300 text-[#16a34a] font-bold text-[10px]">
                      ✓
                    </span>
                    <div className="pl-3">
                      <p className="font-semibold text-slate-900 text-xs">Hytera Hongkong</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 21 วัน</p>
                    </div>
                    <div className="text-right text-slate-500 text-xs">
                      29 ก.ย. 2569 → 1 ต.ค. 2569 (2 วัน)
                    </div>
                  </div>

                  {/* Step 6 (Active): จีน (เข้ากระบวนการซ่อม) */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-[#2563eb] text-white font-bold text-xs shadow-xs">
                      6
                    </span>
                    <div className="pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 text-xs">จีน (เข้ากระบวนการซ่อม)</p>
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-[#fff7ed] px-2 py-0.5 text-[11px] font-medium text-[#d97706]">
                          <Clock className="size-3" />
                          <span>เริ่มนับบทปรับผู้ขาย</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 14 วัน</p>
                    </div>
                    <div className="text-right text-slate-700 text-xs font-medium">
                      1 ต.ค. 2569 (0 วัน)
                    </div>
                  </div>

                  {/* Step 7 (Pending): ส่งกลับเครื่องบิน */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs">
                      7
                    </span>
                    <div className="pl-3">
                      <p className="text-slate-600 font-medium text-xs">ส่งกลับเครื่องบิน</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 3 วัน</p>
                    </div>
                    <div className="text-right text-slate-400 text-xs">
                      ยังไม่ถึงขั้นนี้
                    </div>
                  </div>

                  {/* Step 8 (Pending): เคลียร์ของออก (ศุลกากรขาเข้า) */}
                  <div className="relative flex items-start justify-between text-xs">
                    <span className="absolute -left-6 flex size-6 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs">
                      8
                    </span>
                    <div className="pl-3">
                      <p className="text-slate-600 font-medium text-xs">เคลียร์ของออก (ศุลกากรขาเข้า)</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">มาตรฐาน 5 วัน</p>
                    </div>
                    <div className="text-right text-slate-400 text-xs">
                      ยังไม่ถึงขั้นนี้
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200/80 bg-white p-5">
                <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">
                  ใช้ไปแล้ว 11 วัน · แผนมาตรฐานรวม 60 วัน (ไม่ใช่วันครบกำหนด — กระบวนการจริงราว 2-3 เดือน)
                </p>

                <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
                  <p className="text-[11px] text-slate-500 mb-1.5 font-medium">วันและเวลาที่เกิดขึ้นจริง</p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <div className="relative flex-1">
                      <Input
                        defaultValue="2026-09-23 10:23 AM"
                        className="h-9 rounded-lg border-slate-200 bg-white text-xs font-mono text-slate-700 pr-8 shadow-none"
                      />
                      <Calendar className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        showToast('อัปเดตสถานะเป็น "ขนส่งกลับ" เรียบร้อยแล้ว')
                        setTimelineItem(null)
                      }}
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[#0c1a30] px-4 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1e293b] cursor-pointer"
                    >
                      <span>› ปิดขั้น &quot;จีน — ซ่อม&quot; → เข้าขั้น &quot;ขนส่งกลับ&quot;</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    showToast("เปิดหน้าต่างแก้ไขข้อมูลย้อนหลัง")
                  }}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Pencil className="size-3.5" />
                  <span>แก้ไขที่รายขั้น (กรอกย้อนหลัง)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            5. CREATE NEW RMA MODAL
           ========================================================================= */}
        {newRmaModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setNewRmaModalOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl p-6 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    เปิดใบส่งเคลมต่างประเทศ
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    เลือกอุปกรณ์ หรือผูกกับเคสแจ้งเคลมอย่างน้อยหนึ่งอย่าง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewRmaModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Validation Alert */}
              {formValidationError && (
                <div className="mt-3.5 flex items-center gap-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="size-4 shrink-0 text-red-600" />
                  <span>{formValidationError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRma} className="mt-4 space-y-3.5 text-xs">
                {/* Row 1: เลขที่ใบ RMA & สถานะใบ * */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">เลขที่ใบ RMA</label>
                    <Input
                      placeholder="เช่น RMA-2026-014"
                      value={newRmaForm.rmaNo}
                      onChange={(e) =>
                        setNewRmaForm((prev) => ({ ...prev, rmaNo: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      ยังไม่ออกเลขก็บันทึกได้ ค่อยมาเติมทีหลัง
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      สถานะใบ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={newRmaForm.status}
                        onChange={(e) =>
                          setNewRmaForm((prev) => ({ ...prev, status: e.target.value }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                        required
                      >
                        <option value="in_progress">กำลังดำเนินการ</option>
                        <option value="pending">รอดำเนินการ</option>
                        <option value="shipped">จัดส่งแล้ว</option>
                        <option value="returned">ของกลับถึงแล้ว</option>
                        <option value="completed">เสร็จสิ้น</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Row 2: อุปกรณ์ที่ส่งไปซ่อม */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">อุปกรณ์ที่ส่งไปซ่อม</label>
                  <div className="relative">
                    <select
                      value={newRmaForm.selectedAssetSerial}
                      onChange={(e) => handleEquipmentChange(e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">เลือกอุปกรณ์จากทะเบียน</option>
                      {equipmentOptions.map((asset) => (
                        <option key={asset.serial} value={asset.serial}>
                          {asset.serial} — {asset.name || asset.model} ({asset.vendor})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    ถ้าผูกกับเคสอยู่แล้ว เว้นว่างได้ ระบบจะดึงอุปกรณ์จากเคสมาให้เอง
                  </p>
                </div>

                {/* Row 3: ผูกกับเคสแจ้งเคลม */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">ผูกกับเคสแจ้งเคลม</label>
                  <div className="relative">
                    <select
                      value={newRmaForm.linkedCaseId}
                      onChange={(e) => handleCaseChange(e.target.value)}
                      className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">ไม่ผูกกับเคส</option>
                      {AVAILABLE_CASES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.caseNo}: {c.title} — {c.model} (S/N: {c.serialNo})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    ไม่บังคับ — เลือกได้เฉพาะเคสที่ยังไม่จบงานและยังไม่มีใบส่งซ่อม
                  </p>
                </div>

                {/* Row 4: ศูนย์บริการ / ผู้รับเคลม & ปลายทาง */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">ศูนย์บริการ / ผู้รับเคลม</label>
                    <div className="relative">
                      <select
                        value={newRmaForm.serviceCenter}
                        onChange={(e) =>
                          setNewRmaForm((prev) => ({ ...prev, serviceCenter: e.target.value }))
                        }
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">เลือกศูนย์บริการ</option>
                        <option value="Hytera">Hytera</option>
                        <option value="Huawei">Huawei</option>
                        <option value="Forth">Forth</option>
                        <option value="อื่นๆ">อื่นๆ</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">ปลายทาง</label>
                    <Input
                      placeholder="เช่น Hytera Hongkong"
                      value={newRmaForm.destination}
                      onChange={(e) =>
                        setNewRmaForm((prev) => ({ ...prev, destination: e.target.value }))
                      }
                      className="h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      เช่น Hytera Hongkong
                    </p>
                  </div>
                </div>

                {/* Row 5: วันที่เปิดใบ * */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    วันที่เปิดใบ <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-full sm:max-w-xs">
                    <Input
                      type="text"
                      required
                      value={newRmaForm.openDate}
                      onChange={(e) =>
                        setNewRmaForm((prev) => ({ ...prev, openDate: e.target.value }))
                      }
                      className="h-9 pr-9 text-xs font-mono rounded-lg border-slate-200 focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  </div>
                </div>

                {/* Row 6: หมายเหตุ */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">หมายเหตุ</label>
                  <textarea
                    rows={3}
                    placeholder="เช่น รอเอกสารอนุมัติจาก กสทช. ก่อนส่งออก"
                    value={newRmaForm.remarks}
                    onChange={(e) =>
                      setNewRmaForm((prev) => ({ ...prev, remarks: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Footer Actions */}
                <div className="mt-6 flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setNewRmaModalOpen(false)}
                    className="h-9 px-4 text-xs font-medium text-slate-700 border-slate-200 bg-white hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 px-4 bg-[#0c1a30] text-white hover:bg-[#1e293b] text-xs font-medium rounded-lg shadow-xs cursor-pointer"
                  >
                    เปิดใบส่งซ่อม
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. EDIT RMA MODAL
           ========================================================================= */}
        {editingItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
            onClick={() => setEditingItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  แก้ไขข้อมูลใบส่งซ่อม ({editingItem.rmaNo})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="font-medium text-slate-700">เลขใบ RMA</label>
                  <Input
                    required
                    value={editingItem.rmaNo}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, rmaNo: e.target.value } : null
                      )
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-medium text-slate-700">เคส / ปัญหา</label>
                  <Input
                    required
                    value={editingItem.caseName}
                    onChange={(e) =>
                      setEditingItem((prev) =>
                        prev ? { ...prev, caseName: e.target.value } : null
                      )
                    }
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-slate-700">S/N</label>
                    <Input
                      value={editingItem.serialNo}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, serialNo: e.target.value } : null
                        )
                      }
                      className="mt-1 h-9 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700">รุ่นอุปกรณ์</label>
                    <Input
                      value={editingItem.model}
                      onChange={(e) =>
                        setEditingItem((prev) =>
                          prev ? { ...prev, model: e.target.value } : null
                        )
                      }
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem(null)}
                    className="text-xs"
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="gap-1.5 bg-[#0c1a30] text-white hover:bg-[#1e293b] text-xs"
                  >
                    <Check className="size-3.5" />
                    <span>บันทึกการแก้ไข</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Permanent RMA Deletion Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => !isDeleting && setItemToDelete(null)}
            />
            <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all z-10 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Trash2 className="size-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900">
                    ยืนยันการลบใบส่งซ่อมต่างประเทศถาวร
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    คุณต้องการลบใบ RMA{" "}
                    <strong className="text-slate-800 font-semibold">
                      &quot;{itemToDelete.rmaNo}&quot;
                    </strong>{" "}
                    ({itemToDelete.vendor} {itemToDelete.model} S/N: {itemToDelete.serialNo}) ใช่หรือไม่?
                  </p>
                  <div className="mt-3 rounded-lg border border-red-150 bg-red-50/70 p-2.5 text-[11px] text-red-700 leading-relaxed">
                    <span className="font-semibold">ข้อควรระวัง:</span> คำขอนี้จะลบรายการออกจากฐานข้อมูลอย่างถาวร ข้อมูลจะไม่สามารถเรียกคืนได้แม้จะรีเฟรชหน้าเว็บ
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setItemToDelete(null)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDeleteItem}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 text-xs font-medium text-white shadow-xs transition-colors hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>{isDeleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
