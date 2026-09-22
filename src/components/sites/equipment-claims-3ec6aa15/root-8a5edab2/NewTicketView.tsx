"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Wrench,
  ChevronRight,
  House,
  Check,
  Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function NewTicketView() {
  const router = useRouter()
  const [isSaved, setIsSaved] = React.useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => {
      router.push("/tickets")
    }, 1200)
  }

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
                <Link href="/tickets" className="hover:text-foreground">
                  งานเคลม
                </Link>
              </li>
              <li className="flex items-center text-muted-foreground/60">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="inline-flex items-center gap-1">
                <span className="font-normal text-foreground">เปิดเคสใหม่</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
              <Wrench className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                เปิดเคสใหม่
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                กรอกเลขที่เคลมเองในฟอร์มด้านล่าง
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {isSaved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="size-4 shrink-0" />
              <span>บันทึกข้อมูลการเปิดเคสเรียบร้อยแล้ว กำลังนำทางกลับไปหน้ารายการ...</span>
            </div>
          )}

          {/* Section 1: อุปกรณ์ */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              1. อุปกรณ์
            </h2>
            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-medium text-foreground">เลือกอุปกรณ์จากทะเบียน</label>
              <select
                required
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="">-- เลือกอุปกรณ์ --</option>
                <option value="1">Huawei / OMXD30000 (S/N 1000167600349)</option>
                <option value="2">Hytera / MD788G VHF (S/N 1000167600350)</option>
                <option value="3">Forth / D-TETRA Base Station (S/N 1000167600351)</option>
                <option value="4">Motorola / SLR 5500 Repeater (S/N 8839210)</option>
              </select>
            </div>
          </div>

          {/* Section 2: ข้อมูลเคส */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              2. ข้อมูลเคส
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">
                  เลขที่เคลม <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น CLM-2026-0043"
                  defaultValue="CLM-2026-0043"
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  กรอกเองตามที่หน่วยงานกำหนด ห้ามซ้ำกับเคสที่มีอยู่แล้ว
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">วันและเวลาที่รับแจ้ง</label>
                <Input
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-medium text-foreground">สถานะการรับประกัน</label>
                <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none">
                  <option value="warranty">อยู่ในประกัน</option>
                  <option value="expired">นอกประกัน</option>
                  <option value="carepack">ประกันพิเศษ (Care Pack)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-medium text-foreground">
                  อาการเสีย / ปัญหาที่พบ <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="ระบุอาการผิดปกติหรือสาเหตุที่ต้องการส่งเคลมอย่างละเอียด..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          </div>

          {/* Section 3: กำหนดการและศูนย์บริการ */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              3. กำหนดการและศูนย์บริการ
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">ศูนย์บริการ / ผู้รับงาน</label>
                <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none">
                  <option value="huawei">Huawei</option>
                  <option value="hytera">Hytera</option>
                  <option value="dell">Dell</option>
                  <option value="lenovo">Lenovo</option>
                  <option value="syndome">Syndome</option>
                  <option value="transpower">Transpower</option>
                  <option value="vertiv">Vertiv</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">กำหนดแล้วเสร็จ</label>
                <Input
                  type="date"
                  defaultValue="2026-11-21"
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  เติมให้อัตโนมัติจากวันที่รับแจ้ง แก้ทับได้ถ้าตกลงกับศูนย์เป็นอย่างอื่น
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/tickets">
              <Button type="button" variant="outline" size="sm">
                ยกเลิก
              </Button>
            </Link>
            <Button type="submit" size="sm" className="gap-2 bg-brand text-white hover:bg-brand-dark">
              <Save className="size-4" />
              <span>บันทึกเคสเคลม</span>
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
