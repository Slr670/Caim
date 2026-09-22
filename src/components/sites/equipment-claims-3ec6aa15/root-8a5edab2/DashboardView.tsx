"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Clock,
  LogOut,
  Plus,
  Search,
  Wrench,
  X,
  Building2,
  FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ClaimItem {
  id: string
  ticketNo: string
  equipmentName: string
  model: string
  serialNo: string
  siteLocation: string
  reporter: string
  date: string
  status: "pending" | "repairing" | "ready" | "completed"
  priority: "normal" | "urgent"
  symptom: string
}

const INITIAL_CLAIMS: ClaimItem[] = [
  {
    id: "1",
    ticketNo: "CLM-2026-0042",
    equipmentName: "Base Station Repeater",
    model: "MOTOTRBO SLR 5500 VHF",
    serialNo: "SN-8839210",
    siteLocation: "สถานีเขายายเที่ยง (นครราชสีมา)",
    reporter: "สมชาย วงศ์สวัสดิ์",
    date: "21 ก.ย. 2026",
    status: "pending",
    priority: "urgent",
    symptom: "ภาคส่งสัญญาณ (TX) กำลังส่งตกเหลือต่ำกว่า 5W และมีสัญญาณเตือน VSWR สูง"
  },
  {
    id: "2",
    ticketNo: "CLM-2026-0041",
    equipmentName: "DMR Digital Mobile Radio",
    model: "Forth D-TETRA Transceiver 50W",
    serialNo: "SN-7721094",
    siteLocation: "สถานีเขาค้อ (เพชรบูรณ์)",
    reporter: "ประสิทธิ์ จันทร์ดี",
    date: "20 ก.ย. 2026",
    status: "repairing",
    priority: "normal",
    symptom: "จอ LCD ด้านหน้าแสดงผลผิดปกติและเสียงลำโพงแตก"
  },
  {
    id: "3",
    ticketNo: "CLM-2026-0040",
    equipmentName: "Power Amplifier Module",
    model: "Forth PA-150W VHF Band",
    serialNo: "SN-6548911",
    siteLocation: "ศูนย์ควบคุมบางซื่อ (กรุงเทพฯ)",
    reporter: "วิชัย มงคลพร",
    date: "19 ก.ย. 2026",
    status: "repairing",
    priority: "urgent",
    symptom: "ไฟแสดงสถานะ Overheat ตลอดเวลา โมดูลตัดการทำงานอัตโนมัติ"
  },
  {
    id: "4",
    ticketNo: "CLM-2026-0039",
    equipmentName: "Telecom Power Supply Unit",
    model: "Forth PSU-48V 30A DC",
    serialNo: "SN-4412098",
    siteLocation: "สถานีดอยสุเทพ (เชียงใหม่)",
    reporter: "ธีระ ศรีสุข",
    date: "17 ก.ย. 2026",
    status: "ready",
    priority: "normal",
    symptom: "เปลี่ยน Capacitor และ Calibrate แรงดันไฟขาออก 48V เรียบร้อยแล้ว พร้อมส่งมอบ"
  },
  {
    id: "5",
    ticketNo: "CLM-2026-0038",
    equipmentName: "Duplexer VHF Filter",
    model: "VHF 6-Cavity Duplexer 136-174MHz",
    serialNo: "SN-3398412",
    siteLocation: "สถานีเขาใหญ่ (ปราจีนบุรี)",
    reporter: "กิตติพงษ์ แก้วดี",
    date: "15 ก.ย. 2026",
    status: "completed",
    priority: "normal",
    symptom: "จูนความถี่และตรวจเช็ค Insertion Loss ผ่านเกณฑ์ ส่งคืนสถานีติดตั้งแล้ว"
  },
  {
    id: "6",
    ticketNo: "CLM-2026-0037",
    equipmentName: "Antenna Lightning Protector",
    model: "Surge Protector DC-1000MHz",
    serialNo: "SN-2219083",
    siteLocation: "สถานีเกาะสมุย (สุราษฎร์ธานี)",
    reporter: "นพดล ภักดี",
    date: "12 ก.ย. 2026",
    status: "completed",
    priority: "normal",
    symptom: "ตรวจพบร่องรอยฟ้าผ่า เปลี่ยน Gas Tube Element และทดสอบความต้านทานดินเรียบร้อย"
  }
]

export function DashboardView() {
  const router = useRouter()
  const [claims, setClaims] = React.useState<ClaimItem[]>(INITIAL_CLAIMS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all")
  const [selectedClaim, setSelectedClaim] = React.useState<ClaimItem | null>(null)
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(false)

  // New ticket form state
  const [newModel, setNewModel] = React.useState("")
  const [newSerial, setNewSerial] = React.useState("")
  const [newLocation, setNewLocation] = React.useState("")
  const [newSymptom, setNewSymptom] = React.useState("")

  function handleLogout() {
    router.push("/login")
  }

  function handleCreateClaim(e: React.FormEvent) {
    e.preventDefault()
    if (!newModel || !newSerial || !newLocation) return

    const newTicket: ClaimItem = {
      id: Date.now().toString(),
      ticketNo: `CLM-2026-${String(claims.length + 43).padStart(4, "0")}`,
      equipmentName: newModel.split(" ")[0] || "อุปกรณ์วิทยุสื่อสาร",
      model: newModel,
      serialNo: newSerial,
      siteLocation: newLocation,
      reporter: "ผู้ดูแลระบบ (admin@forth.co.th)",
      date: "วันนี้",
      status: "pending",
      priority: "normal",
      symptom: newSymptom || "รอการตรวจสอบอาการเสียโดยละเอียดจากศูนย์ซ่อม"
    }

    setClaims([newTicket, ...claims])
    setIsNewTicketOpen(false)
    setNewModel("")
    setNewSerial("")
    setNewLocation("")
    setNewSymptom("")
  }

  const filteredClaims = claims.filter((item) => {
    const matchesSearch =
      item.ticketNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serialNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.siteLocation.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === "all" || item.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  // Stats calculation
  const totalCount = claims.length + 122 // baseline realistic volume
  const pendingCount = claims.filter((c) => c.status === "pending").length + 12
  const repairingCount = claims.filter((c) => c.status === "repairing").length + 26
  const completedCount = claims.filter((c) => c.status === "ready" || c.status === "completed").length + 84

  return (
    <div className="min-h-screen bg-secondary/40 text-foreground flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur shadow-xs">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/images/logo-forth-07_8-mobile.png"
                alt="Forth Corporation"
                width={282}
                height={84}
                priority
                className="h-8 w-auto"
              />
              <div className="hidden sm:block border-l border-border pl-3">
                <p className="text-xs font-semibold text-foreground tracking-tight">
                  ระบบบริหารงานเคลมอุปกรณ์
                </p>
                <p className="text-[10px] text-muted-foreground">
                  โครงข่ายวิทยุสื่อสาร Forth Telecom
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-foreground">admin@forth.co.th</span>
              <span className="text-[11px] text-muted-foreground">(ผู้ดูแลระบบ)</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              แดชบอร์ดงานเคลมอุปกรณ์
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              ภาพรวมสถานะอุปกรณ์ส่งซ่อม สถิติการตรวจเช็ค และติดตามใบงานเคลมแบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsNewTicketOpen(true)}
              className="gap-2 bg-brand text-white hover:bg-brand-dark shadow-xs"
            >
              <Plus className="size-4" />
              <span>แจ้งเคลมอุปกรณ์ใหม่</span>
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">งานเคลมทั้งหมด</p>
              <div className="rounded-lg bg-brand/10 p-2 text-brand">
                <FileText className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">{totalCount}</span>
              <span className="text-xs font-medium text-emerald-600">+12% จากเดือนก่อน</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">รวมอุปกรณ์ทุกสถานีฐานทั่วประเทศ</p>
          </div>

          {/* Card 2: Pending */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">รอรับเรื่อง / ตรวจสอบ</p>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-amber-600">{pendingCount}</span>
              <span className="text-xs font-medium text-muted-foreground">รายการ</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">รอฝ่ายช่างเทคนิควิเคราะห์อาการเสีย</p>
          </div>

          {/* Card 3: Repairing */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">อยู่ระหว่างซ่อมแซม</p>
              <div className="rounded-lg bg-brand/10 p-2 text-brand">
                <Wrench className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-brand">{repairingCount}</span>
              <span className="text-xs font-medium text-muted-foreground">รายการ</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">ส่งศูนย์ซ่อม Forth และผู้ผลิต</p>
          </div>

          {/* Card 4: Completed */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">เสร็จสิ้น / ส่งมอบแล้ว</p>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-emerald-600">{completedCount}</span>
              <span className="text-xs font-medium text-emerald-600">94.8% SLA</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">ผ่านเกณฑ์ทดสอบและส่งคืนสถานี</p>
          </div>
        </div>

        {/* Table & Filtering Section */}
        <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
          {/* Controls Bar */}
          <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-card">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ค้นหาด้วยเลขที่ใบเคลม, Serial No, หรือสถานีฐาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { key: "all", label: "ทั้งหมด" },
                { key: "pending", label: "รอตรวจสอบ" },
                { key: "repairing", label: "กำลังซ่อม" },
                { key: "ready", label: "พร้อมส่งมอบ" },
                { key: "completed", label: "เสร็จสิ้น" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    selectedStatus === tab.key
                      ? "bg-brand text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Claims Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 sm:px-6">เลขที่ใบเคลม</th>
                  <th className="py-3 px-4">อุปกรณ์ / รุ่น</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">สถานีติดตั้ง</th>
                  <th className="py-3 px-4">วันที่แจ้ง</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                      ไม่พบข้อมูลใบเคลมที่ตรงกับการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-medium text-brand text-xs">
                        {claim.ticketNo}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-foreground text-xs">{claim.model}</div>
                        <div className="text-[11px] text-muted-foreground">{claim.equipmentName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                        {claim.serialNo}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{claim.siteLocation}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {claim.date}
                      </td>
                      <td className="py-3.5 px-4">
                        {claim.status === "pending" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            รอตรวจสอบ
                          </span>
                        )}
                        {claim.status === "repairing" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
                            <span className="size-1.5 rounded-full bg-brand" />
                            กำลังส่งซ่อม
                          </span>
                        )}
                        {claim.status === "ready" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-400">
                            <span className="size-1.5 rounded-full bg-teal-500" />
                            พร้อมส่งมอบ
                          </span>
                        )}
                        {claim.status === "completed" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            ปิดงานเรียบร้อย
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setSelectedClaim(claim)}
                          className="text-xs"
                        >
                          ดูรายละเอียด
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-border px-4 py-3 sm:px-6 bg-card flex items-center justify-between text-xs text-muted-foreground">
            <span>แสดง {filteredClaims.length} จาก {claims.length} รายการ</span>
            <span>ระบบโครงข่ายวิทยุสื่อสาร Forth Corporation</span>
          </div>
        </div>
      </main>

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border flex flex-col gap-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-semibold text-brand">{selectedClaim.ticketNo}</span>
                <h3 className="mt-1 text-lg font-bold text-foreground">{selectedClaim.model}</h3>
                <p className="text-xs text-muted-foreground">{selectedClaim.equipmentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-muted-foreground block">Serial Number</span>
                <span className="font-mono font-medium text-foreground">{selectedClaim.serialNo}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-muted-foreground block">สถานีฐานที่ติดตั้ง</span>
                <span className="font-medium text-foreground">{selectedClaim.siteLocation}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-muted-foreground block">ผู้บันทึกแจ้งเคลม</span>
                <span className="font-medium text-foreground">{selectedClaim.reporter}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-muted-foreground block">วันที่แจ้งเรื่อง</span>
                <span className="font-medium text-foreground">{selectedClaim.date}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3.5 bg-card">
              <p className="text-xs font-semibold text-foreground mb-1">รายละเอียดและอาการเสียที่พบ:</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{selectedClaim.symptom}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedClaim(null)}>
                ปิดหน้าต่าง
              </Button>
              <Button size="sm" className="bg-brand text-white hover:bg-brand-dark">
                พิมพ์ใบส่งซ่อม
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in">
          <form
            onSubmit={handleCreateClaim}
            className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl ring-1 ring-border flex flex-col gap-4"
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">แจ้งส่งเคลมอุปกรณ์ใหม่</h3>
                <p className="text-xs text-muted-foreground">บันทึกข้อมูลอุปกรณ์ส่งซ่อมเข้าสู่ระบบ</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewTicketOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">ชื่อรุ่นอุปกรณ์ (Equipment Model)</label>
                <Input
                  required
                  placeholder="เช่น Forth D-TETRA Base Station 50W"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">Serial Number</label>
                  <Input
                    required
                    placeholder="เช่น SN-9982314"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-medium text-foreground">สถานีติดตั้ง (Site)</label>
                  <Input
                    required
                    placeholder="เช่น สถานีเขาเขียว (ชลบุรี)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">อาการเสีย / รายละเอียด</label>
                <textarea
                  rows={3}
                  placeholder="ระบุอาการผิดปกติหรือสาเหตุที่ส่งเคลม..."
                  value={newSymptom}
                  onChange={(e) => setNewSymptom(e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewTicketOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" size="sm" className="bg-brand text-white hover:bg-brand-dark">
                บันทึกการส่งเคลม
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
