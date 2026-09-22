"use client"

import * as React from "react"
import Link from "next/link"
import {
  ClipboardList,
  ChevronRight,
  House,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Ticket {
  id: string
  title: string
  problemDesc: string
  vendor: string
  model: string
  serialNo: string
  status: string
  statusCode: number
  date: string
  ageDays: string
  isOverdue?: boolean
}

const SAMPLE_TICKETS: Ticket[] = [
  {
    id: "1",
    title: "หัวข้อเลขที่เคลม",
    problemDesc: "หัวข้ออาการเสีย ปัญหาที่พบ",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "รับแจ้ง",
    statusCode: 1,
    date: "13 ก.ย. 2569",
    ageDays: "9 วัน",
    isOverdue: true
  },
  {
    id: "2",
    title: "ทดสอบระบบ",
    problemDesc: "ทดสอบระบบทดสอบระบบ",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "ปิดเคส",
    statusCode: 5,
    date: "10 ก.ย. 2569",
    ageDays: "19 วัน"
  },
  {
    id: "3",
    title: "test2",
    problemDesc: "testtest",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600349",
    status: "ส่งศูนย์",
    statusCode: 2,
    date: "9 ก.ย. 2569",
    ageDays: "12 วัน",
    isOverdue: true
  },
  {
    id: "4",
    title: "ทดสอบวิทยุ Hytera",
    problemDesc: "อุปกรณ์เปิดไม่ติด นอกเงื่อนไขการรับประกัน",
    vendor: "Hytera",
    model: "MD788G VHF",
    serialNo: "1000167600350",
    status: "ปฏิเสธเคลม",
    statusCode: 6,
    date: "5 ก.ย. 2569",
    ageDays: "15 วัน"
  },
  {
    id: "5",
    title: "เคลมโมดูลสถานีฐาน",
    problemDesc: "ส่งซ่อมศูนย์บริการเพื่อตรวจสอบไฟเลี้ยงโมดูล",
    vendor: "Huawei",
    model: "OMXD30000",
    serialNo: "1000167600351",
    status: "ส่งศูนย์",
    statusCode: 2,
    date: "1 ก.ย. 2569",
    ageDays: "20 วัน"
  }
]

export function TicketsView() {
  const [tickets] = React.useState<Ticket[]>(SAMPLE_TICKETS)
  const [searchStatus, setSearchStatus] = React.useState("all")
  const [searchSn, setSearchSn] = React.useState("")
  const [searchVendor, setSearchVendor] = React.useState("all")
  const [onlyOverdue, setOnlyOverdue] = React.useState(false)

  const filtered = tickets.filter((t) => {
    if (searchStatus !== "all" && String(t.statusCode) !== searchStatus) return false
    if (searchVendor !== "all" && t.vendor !== searchVendor) return false
    if (searchSn && !t.serialNo.includes(searchSn) && !t.title.includes(searchSn)) return false
    if (onlyOverdue && !t.isOverdue) return false
    return true
  })

  return (
    <main id="main" className="flex-1 bg-background">
      <div className="mx-auto flex max-w-350 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Breadcrumb and Header */}
        <div className="flex flex-col gap-4">
          <nav aria-label="breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <Link
                  href="/dashboard"
                  aria-label="หน้าแรก"
                  className="transition-colors hover:text-foreground"
                >
                  <House className="size-4" />
                </Link>
              </li>
              <li className="flex items-center text-muted-foreground/60">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="inline-flex items-center gap-1">
                <span className="font-normal text-foreground">งานเคลม</span>
              </li>
            </ol>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
                <ClipboardList className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  รายการงานเคลม
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ทุกเคสเคลมที่บันทึกไว้ เลือกเงื่อนไขในการ์ดค้นหาแล้วกดค้นหา
                </p>
              </div>
            </div>

            <Link href="/tickets/new">
              <Button className="gap-2 bg-brand text-white hover:bg-brand-dark shadow-xs">
                <Plus className="size-4" />
                <span>แจ้งเคลมใหม่</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Filter Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-muted-foreground">สถานะ</label>
              <select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="all">ทุกสถานะ</option>
                <option value="1">รับแจ้ง / รอตรวจสภาพ</option>
                <option value="2">ส่งศูนย์บริการแล้ว</option>
                <option value="3">รออะไหล่ / กำลังซ่อม</option>
                <option value="4">ซ่อมเสร็จ / รอส่งมอบ</option>
                <option value="5">ปิดเคส (รับคืนเรียบร้อย)</option>
                <option value="6">ปฏิเสธเคลม (นอกเงื่อนไข)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-muted-foreground">S/N หรือ เลขที่เคส</label>
              <Input
                placeholder="เช่น 1000167..."
                value={searchSn}
                onChange={(e) => setSearchSn(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-muted-foreground">ศูนย์บริการ</label>
              <select
                value={searchVendor}
                onChange={(e) => setSearchVendor(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="all">ทุกศูนย์บริการ</option>
                <option value="Huawei">Huawei</option>
                <option value="Hytera">Hytera</option>
                <option value="Dell">Dell</option>
                <option value="Lenovo">Lenovo</option>
                <option value="Syndome">Syndome</option>
                <option value="Vertiv">Vertiv</option>
              </select>
            </div>

            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyOverdue}
                  onChange={(e) => setOnlyOverdue(e.target.checked)}
                  className="rounded border-input text-brand focus:ring-brand size-4"
                />
                <span className="font-medium text-destructive">เฉพาะที่เกินกำหนด</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 sm:px-6">เคส / ปัญหาที่พบ</th>
                  <th className="py-3 px-4">อุปกรณ์ / S/N</th>
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">รับแจ้ง</th>
                  <th className="py-3 px-4">อายุงาน</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {item.problemDesc}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-foreground">
                        {item.vendor} / {item.model}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        S/N {item.serialNo}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.statusCode === 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                          รับแจ้ง
                        </span>
                      )}
                      {item.statusCode === 2 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 font-medium text-brand">
                          ส่งศูนย์
                        </span>
                      )}
                      {item.statusCode === 5 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                          ปิดเคส
                        </span>
                      )}
                      {item.statusCode === 6 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 font-medium text-destructive">
                          ปฏิเสธเคลม
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={item.isOverdue ? "font-bold text-destructive" : "text-muted-foreground"}>
                        {item.ageDays}
                        {item.isOverdue && " (เกินกำหนด)"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1 text-brand font-medium">
                        <button type="button" className="hover:underline">ดู</button>
                        <span>/</span>
                        <button type="button" className="hover:underline">แก้ไข</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>แสดง {filtered.length} รายการ</span>
            <span>ระบบบริหารงานเคลมอุปกรณ์</span>
          </div>
        </div>
      </div>
    </main>
  )
}
