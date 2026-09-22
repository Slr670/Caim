"use client"

import * as React from "react"
import Link from "next/link"
import {
  PlaneTakeoff,
  ChevronRight,
  House
} from "lucide-react"
import { Input } from "@/components/ui/input"

export function OverseasView() {
  const [searchRma, setSearchRma] = React.useState("")

  return (
    <main id="main" className="flex-1 bg-background">
      <div className="mx-auto flex max-w-350 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Breadcrumb and Header */}
        <div className="flex flex-col gap-4">
          <nav aria-label="breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1">
                <Link href="/dashboard" aria-label="หน้าแรก" className="hover:text-foreground">
                  <House className="size-4" />
                </Link>
              </li>
              <li className="flex items-center text-muted-foreground/60">
                <ChevronRight className="size-3.5" />
              </li>
              <li className="inline-flex items-center gap-1">
                <span className="font-normal text-foreground">ส่งเคลมต่างประเทศ</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
              <PlaneTakeoff className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                ส่งเคลมต่างประเทศ
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                ติดตามอุปกรณ์ที่ส่งเคลมไปต่างประเทศทีละขั้น พร้อมนาฬิกาบทปรับของผู้ขาย
              </p>
            </div>
          </div>
        </div>

        {/* Filter Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-muted-foreground">ค้นหาเลขที่ RMA / เคส</label>
              <Input
                placeholder="เช่น RMA-2026-..."
                value={searchRma}
                onChange={(e) => setSearchRma(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-muted-foreground">ขั้นตอนปัจจุบัน</label>
              <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none">
                <option value="all">ทุกขั้นตอน</option>
                <option value="shipping">กำลังขนส่งไปต่างประเทศ</option>
                <option value="factory">ศูนย์ผู้ผลิตกำลังซ่อม</option>
                <option value="return">กำลังส่งกลับไทย</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-medium text-muted-foreground">ศูนย์บริการ / ผู้ผลิต</label>
              <select className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none">
                <option value="all">ทุกศูนย์บริการ</option>
                <option value="huawei">Huawei Global TAC</option>
                <option value="hytera">Hytera HQ Service</option>
                <option value="motorola">Motorola Solutions Depot</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 sm:px-6">ใบ RMA / เคส</th>
                  <th className="py-3 px-4">อุปกรณ์</th>
                  <th className="py-3 px-4">ขั้นตอนปัจจุบัน</th>
                  <th className="py-3 px-4">เปิดใบ</th>
                  <th className="py-3 px-4">รวมระยะเวลา</th>
                  <th className="py-3 px-4 text-right">บทปรับผู้ขาย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                <tr className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-4 sm:px-6 font-mono font-medium text-brand">
                    RMA-2026-0012
                    <span className="block text-[11px] text-muted-foreground font-sans">เคส: TEST20</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-foreground">Huawei / OMXD30000</p>
                    <p className="font-mono text-[11px] text-muted-foreground">S/N 1000167600349</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 font-medium text-brand">
                      โรงงานกำลังซ่อม (Vendor Depot)
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                    2 ก.ย. 2569
                  </td>
                  <td className="py-3.5 px-4 text-foreground font-medium">
                    20 วัน
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-mono font-semibold text-muted-foreground">0.00 บาท (ยังไม่เกินกำหนด)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>แสดง 1 รายการ</span>
            <span>ระบบติดตามงานเคลมต่างประเทศ</span>
          </div>
        </div>
      </div>
    </main>
  )
}
