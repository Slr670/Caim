"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChartPie,
  ChevronRight,
  House
} from "lucide-react"

export function DashboardView() {
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
                <span className="font-normal text-foreground">แดชบอร์ด</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
              <ChartPie className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                ภาพรวมงานเคลมอุปกรณ์
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                สรุปสถานะการเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร
              </p>
            </div>
          </div>
        </div>

        {/* 4 Main Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">เคสทั้งหมด</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Total
                </span>
              </div>
              <p className="tabular mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                5
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">รวมทุกสถานะในระบบ</p>
          </div>

          {/* Card 2: In Progress */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">อยู่ระหว่างดำเนินการ</p>
                <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  In Progress
                </span>
              </div>
              <p className="tabular mt-3 text-4xl font-semibold tracking-tight text-brand sm:text-5xl">
                3
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">60% ของเคสทั้งหมด</p>
          </div>

          {/* Card 3: Closed */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">เคลมสำเร็จ / ปิดเคส</p>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                  Closed
                </span>
              </div>
              <p className="tabular mt-3 text-4xl font-semibold tracking-tight text-emerald-600 sm:text-5xl">
                1
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">20% ของเคสทั้งหมด</p>
          </div>

          {/* Card 4: Rejected */}
          <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">ปฏิเสธเคลม</p>
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                  Rejected
                </span>
              </div>
              <p className="tabular mt-3 text-4xl font-semibold tracking-tight text-destructive sm:text-5xl">
                1
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">20% ของเคสทั้งหมด</p>
          </div>
        </div>

        {/* Operational Metrics Section */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-semibold text-foreground">ตัวชี้วัดการทำงาน</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              ความเร็วและการตรงต่อกำหนดของงานเคลม
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              ตัวเลขคิดจากข้อมูลทั้งหมดในระบบ ลูกศรเทียบ 30 วันล่าสุดกับ 30 วันก่อนหน้า · ตัวเลขที่เป็นภาพรวม ณ วันนี้ (อายุงานค้าง เกินกำหนด) เทียบย้อนหลังไม่ได้ เพราะระบบไม่ได้เก็บภาพรวมรายวันไว้
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-muted/40 p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-foreground">12 วัน</span>
                <span className="text-xs text-muted-foreground">n=3</span>
              </div>
              <p className="mt-1 text-xs font-medium text-foreground">อายุงานค้างกลาง</p>
              <p className="text-[11px] text-muted-foreground">จากงานค้าง 3 เคส · ณ วันนี้</p>
            </div>

            <div className="rounded-lg bg-destructive/5 p-3.5 border border-destructive/20">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-destructive">1</span>
                <span className="text-xs text-destructive/80 font-medium">33%</span>
              </div>
              <p className="mt-1 text-xs font-medium text-destructive">เกินกำหนด</p>
              <p className="text-[11px] text-muted-foreground">ไม่รวมเคสส่งซ่อมต่างประเทศ</p>
            </div>

            <div className="rounded-lg bg-muted/40 p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-muted-foreground">—</span>
              </div>
              <p className="mt-1 text-xs font-medium text-foreground">ปิดทันกำหนด</p>
              <p className="text-[11px] text-muted-foreground">ยังไม่มีเคสในประเทศที่ปิดแล้ว</p>
            </div>

            <div className="rounded-lg bg-muted/40 p-3.5">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-foreground">19 วัน</span>
                <span className="text-xs text-muted-foreground">n=1</span>
              </div>
              <p className="mt-1 text-xs font-medium text-foreground">เวลาปิดงานกลาง</p>
              <p className="text-[11px] text-muted-foreground">จากเคสที่ปิดแล้ว 1 เคส</p>
            </div>
          </div>
        </div>

        {/* Status Breakdown & Weekly Overview Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Status Breakdown */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">สถานะงาน</h2>
                  <p className="text-xs text-muted-foreground">ทั้งหมด 5 เคสในระบบ</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-4">
                <Link
                  href="/tickets?status=1"
                  className="flex items-center justify-between rounded-lg border border-border/70 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span>รับแจ้ง / รอตรวจสภาพ</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">1</span>
                </Link>

                <Link
                  href="/tickets?status=2"
                  className="flex items-center justify-between rounded-lg border border-border/70 p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 text-xs font-medium text-foreground">
                    <span className="size-2 rounded-full bg-brand" />
                    <span>ส่งศูนย์บริการแล้ว</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">2</span>
                </Link>

                <Link
                  href="/tickets?status=3"
                  className="flex items-center justify-between rounded-lg border border-border/70 p-3 hover:bg-muted/40 transition-colors opacity-70"
                >
                  <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
                    <span className="size-2 rounded-full bg-purple-500" />
                    <span>รออะไหล่ / กำลังซ่อม</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-muted-foreground">0</span>
                </Link>

                <Link
                  href="/tickets?status=4"
                  className="flex items-center justify-between rounded-lg border border-border/70 p-3 hover:bg-muted/40 transition-colors opacity-70"
                >
                  <div className="flex items-center gap-2.5 text-xs font-medium text-muted-foreground">
                    <span className="size-2 rounded-full bg-teal-500" />
                    <span>ซ่อมเสร็จ / รอส่งมอบ</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-muted-foreground">0</span>
                </Link>

                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-[11px] font-medium text-muted-foreground mb-2">ปิดงานแล้ว</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/tickets?status=5"
                      className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400"
                    >
                      <span>ปิดเคส (รับคืนแล้ว)</span>
                      <span className="font-mono font-bold">1</span>
                    </Link>
                    <Link
                      href="/tickets?status=6"
                      className="flex items-center justify-between rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive"
                    >
                      <span>ปฏิเสธเคลม</span>
                      <span className="font-mono font-bold">1</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">ภาพรวมรายสัปดาห์</h2>
                  <p className="text-xs text-muted-foreground">เคสรับแจ้ง 7 วันล่าสุด</p>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600">-100% WoW</span>
              </div>

              <div className="pt-4">
                {/* Bar chart mockup */}
                <div className="flex h-32 items-end justify-between gap-2 border-b border-border pb-2 pt-4">
                  {["พ.", "พฤ.", "ศ.", "ส.", "อา.", "จ.", "อ."].map((day) => (
                    <div key={day} className="flex flex-1 flex-col items-center gap-1.5">
                      <div className="w-full max-w-6 rounded-t bg-muted h-2 transition-all hover:bg-brand" />
                      <span className="text-[10px] text-muted-foreground">{day}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 text-center">
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">รับแจ้งสัปดาห์นี้</p>
                    <p className="font-mono text-lg font-bold text-foreground">0</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">ซ่อมเสร็จ</p>
                    <p className="font-mono text-lg font-bold text-foreground">0</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5">
                    <p className="text-[11px] text-muted-foreground">ปิดเคส</p>
                    <p className="font-mono text-lg font-bold text-foreground">0</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Process Bottlenecks & Service Centers */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Bottlenecks */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-semibold text-foreground">คอขวดของกระบวนการ</h2>
              <p className="text-xs text-muted-foreground">เคสค้างอยู่ในขั้นไหนนานที่สุด</p>
            </div>

            <div className="flex flex-col gap-3 pt-4 text-xs">
              <div className="rounded-lg border border-border/70 p-3">
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">1. รับแจ้ง / รอตรวจสภาพ</span>
                  <span className="text-amber-600 font-bold">ค้างอยู่ 9 วัน (1 เคส)</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ค่าเฉลี่ยปกติ: จบแล้วใน 1 วัน (n=4)
                </p>
              </div>

              <div className="rounded-lg border border-border/70 p-3">
                <div className="flex justify-between font-medium">
                  <span className="text-foreground">2. ส่งศูนย์บริการแล้ว</span>
                  <span className="text-brand font-bold">ค้างอยู่ 11 วัน (2 เคส · นานสุด 12 วัน)</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ค่าเฉลี่ยปกติ: จบแล้วใน 1 วัน (n=1)
                </p>
              </div>

              <div className="rounded-lg border border-border/70 p-3 opacity-60">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">3. รออะไหล่ / กำลังซ่อม</span>
                  <span className="text-muted-foreground">ไม่มีเคสค้าง</span>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 p-3 opacity-60">
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">4. ซ่อมเสร็จ / รอส่งมอบ</span>
                  <span className="text-muted-foreground">ไม่มีเคสค้าง</span>
                </div>
              </div>
            </div>
          </div>

          {/* Service Centers Table */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="border-b border-border pb-3">
              <h2 className="text-base font-semibold text-foreground">ระยะเวลาที่งานอยู่กับศูนย์บริการ</h2>
              <p className="text-xs text-muted-foreground">นับเฉพาะช่วงที่เคสอยู่กับศูนย์บริการ</p>
            </div>

            <div className="overflow-x-auto pt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 font-medium">ศูนย์บริการ</th>
                    <th className="pb-2 font-medium">ทั้งหมด</th>
                    <th className="pb-2 font-medium">อยู่ที่ศูนย์</th>
                    <th className="pb-2 font-medium">ค้างนานสุด</th>
                    <th className="pb-2 font-medium text-destructive">เกินกำหนด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  <tr className="hover:bg-muted/30">
                    <td className="py-2.5 font-sans font-medium text-foreground">Huawei</td>
                    <td className="py-2.5">3</td>
                    <td className="py-2.5 text-brand font-bold">1</td>
                    <td className="py-2.5">10 วัน</td>
                    <td className="py-2.5 text-destructive font-bold">1</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="py-2.5 font-sans font-medium text-foreground">Hytera</td>
                    <td className="py-2.5">1</td>
                    <td className="py-2.5 text-muted-foreground">—</td>
                    <td className="py-2.5 text-muted-foreground">—</td>
                    <td className="py-2.5 text-muted-foreground">—</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="py-2.5 font-sans font-medium text-foreground">ยังไม่ระบุศูนย์</td>
                    <td className="py-2.5">1</td>
                    <td className="py-2.5 text-brand font-bold">1</td>
                    <td className="py-2.5">12 วัน</td>
                    <td className="py-2.5 text-muted-foreground">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
