"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  House,
  ChevronRight,
  FilePlus,
  Cpu,
  FileText,
  CalendarClock,
  Users,
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  Check
} from "lucide-react"
import { Input } from "@/components/ui/input"

const REGISTERED_DEVICES = [
  {
    id: "1",
    label: "Huawei / OMXD30000 (S/N 1000167600349)",
    vendor: "Huawei",
    model: "OMXD30000",
    sn: "1000167600349",
  },
  {
    id: "2",
    label: "Hytera / DIB-R5 outdoor (S/N 200426)",
    vendor: "Hytera",
    model: "DIB-R5 outdoor",
    sn: "200426",
  },
  {
    id: "3",
    label: "Huawei / PAC80S12-CN (S/N 2102131835USR8305867)",
    vendor: "Huawei",
    model: "PAC80S12-CN",
    sn: "2102131835USR8305867",
  },
  {
    id: "4",
    label: "Hytera / MD788G VHF (S/N 1000167600350)",
    vendor: "Hytera",
    model: "MD788G VHF",
    sn: "1000167600350",
  },
]

export function NewTicketView() {
  const router = useRouter()

  // Form State
  const [selectedDeviceId, setSelectedDeviceId] = React.useState("")
  const [claimNo, setClaimNo] = React.useState("")
  const [reportDate, setReportDate] = React.useState("2026-09-23 07:00 AM")
  const [warrantyStatus, setWarrantyStatus] = React.useState("")
  const [problemDesc, setProblemDesc] = React.useState("")

  const [vendor, setVendor] = React.useState("")
  const [dispatchDate, setDispatchDate] = React.useState("")
  const [dueDate, setDueDate] = React.useState("2026-11-22 07:00 AM")

  const [reporter, setReporter] = React.useState("")
  const [assignee, setAssignee] = React.useState("")
  const [remarks, setRemarks] = React.useState("")

  // Success Feedback
  const [isSuccess, setIsSuccess] = React.useState(false)

  // Find selected device info
  const selectedDevice = React.useMemo(() => {
    return REGISTERED_DEVICES.find((d) => d.id === selectedDeviceId)
  }, [selectedDeviceId])

  // Auto-set vendor if device is selected
  React.useEffect(() => {
    if (selectedDevice?.vendor && !vendor) {
      setVendor(selectedDevice.vendor)
    }
  }, [selectedDevice, vendor])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSuccess(true)
    setTimeout(() => {
      router.push("/tickets")
    }, 1200)
  }

  const handleCancel = () => {
    router.push("/tickets")
  }

  return (
    <main id="main" className="flex-1 bg-slate-50/50 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* Success Alert */}
        {isSuccess && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in">
            <Check className="size-4 text-emerald-600" />
            <span>เปิดเคสแจ้งเคลมสำเร็จ! กำลังนำทางกลับไปหน้ารายการเคส...</span>
          </div>
        )}

        {/* =========================================================================
            1. BREADCRUMBS & HEADER
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
                <Link
                  href="/tickets"
                  className="transition-colors hover:text-slate-900"
                >
                  งานเคลม
                </Link>
              </li>
              <li className="flex items-center text-slate-400">
                <ChevronRight className="size-3" />
              </li>
              <li className="inline-flex items-center">
                <span className="font-normal text-slate-700">เปิดเคสใหม่</span>
              </li>
            </ol>
          </nav>

          {/* Title & Icon */}
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] text-white shadow-xs">
              <FilePlus className="size-5.5 text-white" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                เปิดเคสใหม่
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                กรอกเลขที่เคลมเองในฟอร์มด้านล่าง
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. TWO-COLUMN CARD CONTAINER (FORM + LIVE SUMMARY)
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
              {/* ===================================================================
                  LEFT COLUMN: FORM INPUTS (8 COLS)
                 =================================================================== */}
              <div className="space-y-7 lg:col-span-8">
                {/* ---------------- Section 1: อุปกรณ์ ---------------- */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Cpu className="size-4 text-slate-600" />
                    <h2 className="text-xs sm:text-sm font-bold">อุปกรณ์</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-slate-600">
                      เลือกอุปกรณ์
                    </label>
                    <div className="relative">
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">เลือกอุปกรณ์จากทะเบียน</option>
                        {REGISTERED_DEVICES.map((dev) => (
                          <option key={dev.id} value={dev.id}>
                            {dev.label}
                          </option>
                        ))}
                      </select>
                      <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* ---------------- Section 2: ข้อมูลเคส ---------------- */}
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <FileText className="size-4 text-slate-600" />
                    <h2 className="text-xs sm:text-sm font-bold">ข้อมูลเคส</h2>
                  </div>

                  {/* เลขที่เคลม */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-slate-600">
                      เลขที่เคส
                    </label>
                    <Input
                      placeholder=""
                      value={claimNo}
                      onChange={(e) => setClaimNo(e.target.value)}
                      className="h-9 max-w-xs rounded-lg border-slate-200 bg-white text-xs text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      กรอกเองตามที่หน่วยงานกำหนด ห้ามซ้ำกับเคสที่มีอยู่แล้ว
                    </p>
                  </div>

                  {/* วันที่รับแจ้ง & สถานะประกัน */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-600">
                        วันและเวลาที่รับแจ้ง
                      </label>
                      <div className="relative">
                        <Input
                          value={reportDate}
                          onChange={(e) => setReportDate(e.target.value)}
                          className="h-9 rounded-lg border-slate-200 bg-white pr-8 text-xs text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        />
                        <Calendar className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-600">
                        สถานะการรับประกัน
                      </label>
                      <div className="relative">
                        <select
                          value={warrantyStatus}
                          onChange={(e) => setWarrantyStatus(e.target.value)}
                          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">เลือกสถานะประกัน</option>
                          <option value="warranty">อยู่ในประกัน</option>
                          <option value="expired">นอกประกัน</option>
                          <option value="carepack">ประกันพิเศษ (Care Pack)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* อาการเสีย / ปัญหาที่พบ */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-slate-600">
                      อาการเสีย / ปัญหาที่พบ
                    </label>
                    <textarea
                      rows={3}
                      value={problemDesc}
                      onChange={(e) => setProblemDesc(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ---------------- Section 3: กำหนดการและศูนย์บริการ ---------------- */}
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <CalendarClock className="size-4 text-slate-600" />
                    <h2 className="text-xs sm:text-sm font-bold">
                      กำหนดการและศูนย์บริการ
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-600">
                        ศูนย์บริการ / ผู้รับงาน
                      </label>
                      <div className="relative">
                        <select
                          value={vendor}
                          onChange={(e) => setVendor(e.target.value)}
                          className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">เลือกศูนย์บริการ</option>
                          <option value="Huawei">Huawei</option>
                          <option value="Hytera">Hytera</option>
                          <option value="Dell">Dell</option>
                          <option value="Lenovo">Lenovo</option>
                          <option value="Syndome">Syndome</option>
                          <option value="Vertiv">Vertiv</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-600">
                        วันและเวลาที่ส่งศูนย์บริการ
                      </label>
                      <div className="relative">
                        <Input
                          placeholder="yyyy-mm-dd --:-- --"
                          value={dispatchDate}
                          onChange={(e) => setDispatchDate(e.target.value)}
                          className="h-9 rounded-lg border-slate-200 bg-white pr-8 text-xs text-slate-800 placeholder:text-slate-400 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        />
                        <Calendar className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-slate-600">
                      กำหนดแล้วเสร็จ
                    </label>
                    <div className="relative max-w-xs">
                      <Input
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-9 rounded-lg border-slate-200 bg-white pr-8 text-xs text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
                      />
                      <Calendar className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      เติมให้อัตโนมัติจากวันที่รับแจ้ง แก้ทับได้ถ้าตกลงกับศูนย์เป็นอย่างอื่น
                    </p>
                  </div>
                </div>

                {/* ---------------- Section 4: ผู้เกี่ยวข้อง ---------------- */}
                <div className="space-y-3.5 pt-1">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <Users className="size-4 text-slate-600" />
                    <h2 className="text-xs sm:text-sm font-bold">ผู้เกี่ยวข้อง</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-600">
                        ผู้แจ้ง / เจ้าของเครื่อง
                      </label>
                      <Input
                        value={reporter}
                        onChange={(e) => setReporter(e.target.value)}
                        className="h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-normal text-slate-600">
                        ผู้รับผิดชอบเคส
                      </label>
                      <Input
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="h-9 rounded-lg border-slate-200 bg-white text-xs text-slate-800 shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-normal text-slate-600">
                      หมายเหตุ
                    </label>
                    <textarea
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ===================================================================
                  RIGHT COLUMN: SIDEBAR SUMMARY CARD (4 COLS)
                 =================================================================== */}
              <div className="lg:col-span-4 lg:pl-6">
                {/* 1. Countdown Widget */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-800">
                    กำหนดแล้วเสร็จ
                  </h3>

                  <div className="my-4 flex flex-col items-center">
                    <div className="flex size-24 flex-col items-center justify-center rounded-full border-4 border-[#2563eb]">
                      <span className="text-xl font-bold text-slate-800 leading-tight">
                        60
                      </span>
                      <span className="text-[11px] text-slate-500">วัน</span>
                    </div>

                    <p className="mt-2 text-xs font-semibold text-[#2563eb]">
                      เหลืออีก 60 วัน
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ครบกำหนด 22 พ.ย. 2569
                    </p>
                  </div>
                </div>

                {/* 2. Live Case Summary */}
                <div className="mt-8 border-t border-slate-100 pt-5">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <FileText className="size-3.5 text-slate-600" />
                    <h3 className="text-xs font-semibold">สรุปเคส</h3>
                  </div>

                  <div className="mt-3 space-y-3 text-xs">
                    <div>
                      <p className="text-[11px] text-slate-500">เลขที่เคส</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {claimNo.trim() ? claimNo : "ยังไม่ได้กรอก"}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-2.5">
                      <p className="text-[11px] text-slate-500">อุปกรณ์ที่เลือก</p>
                      <p className="font-medium text-slate-800 mt-0.5">
                        {selectedDevice ? selectedDevice.label : "ยังไม่ได้เลือกอุปกรณ์"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div className="mt-8 space-y-2.5">
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-[#0c1a30] py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1e293b] cursor-pointer"
                  >
                    เปิดเคส
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
