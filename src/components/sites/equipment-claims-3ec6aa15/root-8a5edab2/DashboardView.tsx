"use client"

import * as React from "react"
import Link from "next/link"
import {
  House,
  ChevronRight,
  ClipboardList,
  Sun,
  CheckCircle2,
  Ban,
  Hourglass,
  AlarmClock,
  CalendarCheck2,
  Timer,
  TrendingDown
} from "lucide-react"

export function DashboardView() {
  return (
    <main id="main" className="flex-1 bg-slate-50/50 py-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        {/* =========================================================================
            1. DASHBOARD HEADER & BREADCRUMB (image_3.png)
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
                <span className="font-normal text-slate-700">แดชบอร์ด</span>
              </li>
            </ol>
          </nav>

          {/* Title & Icon */}
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0c1a30] text-white shadow-xs">
              <svg
                className="size-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                ภาพรวมงานเคลมอุปกรณ์
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">
                สรุปสถานะการเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร
              </p>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. TOP CONTAINER: SUMMARY CARDS & CORE PERFORMANCE WIDGETS (image_3.png)
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          {/* 4 Summary Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: เคสทั้งหมด (Total) */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-100/70 bg-[#eff6ff] p-4.5 transition-shadow hover:shadow-xs">
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#2563eb] text-white shadow-2xs">
                    <ClipboardList className="size-5" />
                  </span>
                  <span className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl">
                    5
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm">เคสทั้งหมด</p>
                  <p className="text-[11px] text-slate-500">Total</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-[11px] text-slate-500">รวมทุกสถานะในระบบ</p>
              </div>
            </div>

            {/* Card 2: อยู่ระหว่างดำเนินการ (In Progress) */}
            <div className="flex flex-col justify-between rounded-xl border border-amber-100/70 bg-[#fffbeb] p-4.5 transition-shadow hover:shadow-xs">
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#d97706] text-white shadow-2xs">
                    <Sun className="size-5" />
                  </span>
                  <span className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl">
                    3
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm">อยู่ระหว่างดำเนินการ</p>
                  <p className="text-[11px] text-slate-500">In Progress</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div className="h-full w-[60%] rounded-full bg-[#ea580c]" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">60% ของเคสทั้งหมด</p>
              </div>
            </div>

            {/* Card 3: เคลมสำเร็จ / ปิดเคส (Closed) */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-100/70 bg-[#f0fdf4] p-4.5 transition-shadow hover:shadow-xs">
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#16a34a] text-white shadow-2xs">
                    <CheckCircle2 className="size-5" />
                  </span>
                  <span className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl">
                    1
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm">เคลมสำเร็จ / ปิดเคส</p>
                  <p className="text-[11px] text-slate-500">Closed</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div className="h-full w-[20%] rounded-full bg-[#4ade80]" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">20% ของเคสทั้งหมด</p>
              </div>
            </div>

            {/* Card 4: ปฏิเสธเคลม (Rejected) */}
            <div className="flex flex-col justify-between rounded-xl border border-pink-100/70 bg-[#fdf2f8] p-4.5 transition-shadow hover:shadow-xs">
              <div>
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#db2777] text-white shadow-2xs">
                    <Ban className="size-5" />
                  </span>
                  <span className="tabular font-semibold text-3xl text-slate-900 sm:text-4xl">
                    1
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs font-bold text-slate-900 sm:text-sm">ปฏิเสธเคลม</p>
                  <p className="text-[11px] text-slate-500">Rejected</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80">
                  <div className="h-full w-[20%] rounded-full bg-[#db2777]" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">20% ของเคสทั้งหมด</p>
              </div>
            </div>
          </div>

          {/* Performance Indicators (ตัวชี้วัดการทำงาน) */}
          <div className="mt-8">
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              ตัวชี้วัดการทำงาน
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              ความเร็วและการตรงต่อกำหนดของงานเคลม
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              ตัวเลขคิดจากข้อมูลทั้งหมดในระบบ สูตรเทียบ 30 วันล่าสุดกับ 30 วันก่อนหน้า · ตัวเลขที่เป็นภาพรวม ณ วันนี้ (อายุงานค้าง เกินกำหนด) เทียบย้อนหลังไม่ได้ เพราะระบบไม่ได้เก็บภาพรวมรายวันไว้
            </p>

            {/* 4 Metric Columns */}
            <div className="mt-4 grid grid-cols-1 divide-y rounded-xl border border-slate-200/80 bg-white sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4 divide-slate-200/80">
              {/* Metric 1 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="tabular text-xl font-bold text-slate-900 sm:text-2xl">
                      13 วัน
                    </span>
                    <span className="ml-1 text-xs text-slate-400">n=3</span>
                  </div>
                  <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <Hourglass className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">อายุงานค้างกลาง</p>
                <p className="mt-1 text-[11px] text-slate-400">จากงานค้าง 3 เคส · ณ วันนี้</p>
              </div>

              {/* Metric 2 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <span className="tabular text-xl font-bold text-[#dc2626] sm:text-2xl">
                    1
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-md bg-red-50 text-[#dc2626]">
                    <AlarmClock className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">เกินกำหนด</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  33% ของงานค้าง · ไม่รวมเคสส่งซ่อมต่างประเทศ
                </p>
              </div>

              {/* Metric 3 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <span className="tabular text-xl font-bold text-slate-400 sm:text-2xl">
                    —
                  </span>
                  <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <CalendarCheck2 className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">ปิดทันกำหนด</p>
                <div className="mt-1 text-[11px] leading-tight text-slate-400">
                  <p>ตัวอย่างน้อยเกินกว่าจะเทียบ</p>
                  <p>ยังไม่มีเคสในประเทศที่ปิดแล้ว</p>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="tabular text-xl font-bold text-slate-900 sm:text-2xl">
                      19 วัน
                    </span>
                    <span className="ml-1 text-xs text-slate-400">n=1</span>
                  </div>
                  <span className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <Timer className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-700">เวลาปิดงานกลาง</p>
                <div className="mt-1 text-[11px] leading-tight text-slate-400">
                  <p>ตัวอย่างน้อยเกินกว่าจะเทียบ</p>
                  <p>จากเคสที่ปิดแล้ว 1 เคส · รวมเคสส่งซ่อมต่างประเทศ</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. WORK STATUS & WEEKLY OVERVIEW (image_4.png)
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="grid grid-cols-1 gap-6 divide-y divide-slate-200/80 lg:grid-cols-2 lg:gap-8 lg:divide-y-0 lg:divide-x">
            {/* Left Column: สถานะงาน (Work Status) */}
            <div className="lg:pr-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">สถานะงาน</h2>
                <p className="mt-0.5 text-xs text-slate-500">ทั้งหมด 5 เคส</p>
              </div>

              <div className="mt-5 flex flex-col gap-4">
                {/* 1. รับแจ้ง/รอตรวจสภาพ */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#0d9488]" />
                      <span className="font-medium text-slate-700">รับแจ้ง/รอตรวจสภาพ</span>
                    </div>
                    <span className="font-bold text-slate-900">1</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[25%] rounded-full bg-[#0d9488]" />
                  </div>
                </div>

                {/* 2. ส่งศูนย์บริการแล้ว */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#7c3aed]" />
                      <span className="font-medium text-slate-700">ส่งศูนย์บริการแล้ว</span>
                    </div>
                    <span className="font-bold text-slate-900">2</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[50%] rounded-full bg-[#7c3aed]" />
                  </div>
                </div>

                {/* 3. รออะไหล่/กำลังซ่อม */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#d97706]" />
                      <span className="font-medium text-slate-700">รออะไหล่/กำลังซ่อม</span>
                    </div>
                    <span className="font-bold text-slate-900">0</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" />
                </div>

                {/* 4. ซ่อมเสร็จ/รอส่งมอบ */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#2563eb]" />
                      <span className="font-medium text-slate-700">ซ่อมเสร็จ/รอส่งมอบ</span>
                    </div>
                    <span className="font-bold text-slate-900">0</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" />
                </div>

                {/* ปิดงานแล้ว Divider */}
                <div className="pt-2">
                  <p className="text-[11px] font-medium text-slate-400">ปิดงานแล้ว</p>
                </div>

                {/* 5. ปิดเคส (รับคืนเรียบร้อย) */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#16a34a]" />
                      <span className="font-medium text-slate-700">ปิดเคส (รับคืนเรียบร้อย)</span>
                    </div>
                    <span className="font-bold text-slate-900">1</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[25%] rounded-full bg-[#16a34a]" />
                  </div>
                </div>

                {/* 6. ปฏิเสธเคลม (นอกเงื่อนไข) */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-[#db2777]" />
                      <span className="font-medium text-slate-700">ปฏิเสธเคลม (นอกเงื่อนไข)</span>
                    </div>
                    <span className="font-bold text-slate-900">1</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full w-[25%] rounded-full bg-[#db2777]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: ภาพรวมรายสัปดาห์ (Weekly Overview) */}
            <div className="pt-6 lg:pl-8 lg:pt-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  ภาพรวมรายสัปดาห์
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">เคสรับแจ้ง 7 วันล่าสุด</p>
              </div>

              {/* Main Metric & Trend */}
              <div className="mt-5">
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-3xl font-bold text-slate-900 sm:text-4xl">
                    0
                  </span>
                  <span className="inline-flex items-center text-xs font-semibold text-rose-500">
                    -100%
                    <TrendingDown className="ml-1 size-3.5 stroke-[2.5]" />
                  </span>
                </div>
                <div className="mt-2 text-xs leading-relaxed text-slate-500">
                  <p>จำนวนเคสที่รับแจ้งในสัปดาห์นี้ เทียบกับสัปดาห์ก่อนหน้า</p>
                  <p>ใช้ดูว่าปริมาณงานเข้ามามากขึ้นหรือลดลง</p>
                </div>
              </div>

              {/* Compact Calendar Days Header */}
              <div className="mt-6 flex justify-end gap-5 text-xs text-slate-400 pr-2">
                <span>พฤ.</span>
                <span>ศ.</span>
                <span>ส.</span>
                <span>อา.</span>
                <span>จ.</span>
                <span>อ.</span>
                <span>พ.</span>
              </div>

              {/* 3 Summary Stat Boxes */}
              <div className="mt-3 rounded-xl bg-slate-50/90 p-4">
                <div className="grid grid-cols-3 gap-2 text-left">
                  <div>
                    <p className="text-xs text-slate-500">รับแจ้ง</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">0</p>
                    <div className="mt-2 h-1 w-12 rounded-full bg-slate-200/80 sm:w-16" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">ซ่อมเสร็จ รอส่งมอบ</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">0</p>
                    <div className="mt-2 h-1 w-12 rounded-full bg-slate-200/80 sm:w-16" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">ปิดเคส</p>
                    <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">0</p>
                    <div className="mt-2 h-1 w-12 rounded-full bg-slate-200/80 sm:w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. PROCESS BOTTLENECKS & SERVICE CENTER METRICS (image_5.png)
           ========================================================================= */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6">
          <div className="grid grid-cols-1 gap-6 divide-y divide-slate-200/80 lg:grid-cols-2 lg:gap-8 lg:divide-y-0 lg:divide-x">
            {/* Left Column: คอขวดของกระบวนการ (Process Bottlenecks) */}
            <div className="lg:pr-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  คอขวดของกระบวนการ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  เคสค้างอยู่ในขั้นไหนนานที่สุด
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  ค่ากลางของจำนวนวัน นับจากเวลาที่กดเปลี่ยนสถานะในระบบ ไม่ใช่วันที่ในเอกสาร · n คือจำนวนช่วงเวลา เคสที่ย้อนกลับมาขั้นเดิมนับซ้ำ
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-4 text-xs">
                {/* Stage 1: รับแจ้ง/รอตรวจสภาพ */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#0d9488]" />
                    <span className="font-semibold text-slate-800">
                      รับแจ้ง/รอตรวจสภาพ
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">จบแล้ว</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                        <div className="h-full w-[20%] rounded-full bg-[#5eead4]" />
                      </div>
                      <span className="text-slate-600">1 วัน n=4</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">ค้างอยู่</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                        <div className="h-full w-[60%] rounded-full bg-[#0d9488]" />
                      </div>
                      <span className="text-slate-600">10 วัน 1 เคส · นานสุด 10 วัน</span>
                    </div>
                  </div>
                </div>

                {/* Stage 2: ส่งศูนย์บริการแล้ว */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#7c3aed]" />
                    <span className="font-semibold text-slate-800">
                      ส่งศูนย์บริการแล้ว
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">จบแล้ว</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                        <div className="h-full w-[20%] rounded-full bg-[#c084fc]" />
                      </div>
                      <span className="text-slate-600">1 วัน n=1</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">ค้างอยู่</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28">
                        <div className="h-full w-[75%] rounded-full bg-[#7c3aed]" />
                      </div>
                      <span className="text-slate-600">
                        11.5 วัน 2 เคส · นานสุด 12 วัน
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stage 3: รออะไหล่/กำลังซ่อม */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#d97706]" />
                    <span className="font-semibold text-slate-800">
                      รออะไหล่/กำลังซ่อม
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">จบแล้ว</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28" />
                      <span className="text-slate-400">0 วัน n=1</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">ค้างอยู่</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28" />
                      <span className="text-slate-400">— ไม่มีเคสค้าง</span>
                    </div>
                  </div>
                </div>

                {/* Stage 4: ซ่อมเสร็จ/รอส่งมอบ */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#2563eb]" />
                    <span className="font-semibold text-slate-800">
                      ซ่อมเสร็จ/รอส่งมอบ
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 pl-4">
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">จบแล้ว</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28" />
                      <span className="text-slate-400">0 วัน n=1</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-12 text-slate-400">ค้างอยู่</span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-28" />
                      <span className="text-slate-400">— ไม่มีเคสค้าง</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: ระยะเวลาที่งานอยู่กับศูนย์บริการ (Service Center Statistics) */}
            <div className="pt-6 lg:pl-8 lg:pt-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                  ระยะเวลาที่งานอยู่กับศูนย์บริการ
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  นับเฉพาะช่วงที่เคสอยู่กับศูนย์ ไม่รวมช่วงที่ของกลับมาถึงเราแล้ว
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  นับขั้น &quot;ส่งศูนย์บริการแล้ว&quot; กับ &quot;รออะไหล่/กำลังซ่อม&quot; เท่านั้น · ค่ากลางคิดจากเคสที่ออกจากมือศูนย์แล้ว
                </p>
              </div>

              {/* Table */}
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] text-slate-600">
                      <th className="pb-2.5 font-medium">ศูนย์บริการ</th>
                      <th className="pb-2.5 text-center font-medium">เคสทั้งหมด</th>
                      <th className="pb-2.5 text-center font-medium">อยู่ที่ศูนย์ตอนนี้</th>
                      <th className="pb-2.5 font-medium">เวลาในมือศูนย์</th>
                      <th className="pb-2.5 text-center font-medium">ค้างนานสุด</th>
                      <th className="pb-2.5 text-center font-medium">เกินกำหนด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-[#1e61f0] hover:underline cursor-pointer">
                        Huawei
                      </td>
                      <td className="py-3 text-center">3</td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3">
                        <div className="space-y-1">
                          <span>1 วัน n=1</span>
                          <div className="h-1 w-16 rounded-full bg-slate-300" />
                        </div>
                      </td>
                      <td className="py-3 text-center">11 วัน</td>
                      <td className="py-3 text-center font-bold text-[#dc2626]">1</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-[#1e61f0] hover:underline cursor-pointer">
                        Hytera
                      </td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3 text-center text-slate-400">—</td>
                      <td className="py-3 text-slate-400">— ยังไม่เคยเข้าขั้นส่งศูนย์</td>
                      <td className="py-3 text-center text-slate-400">—</td>
                      <td className="py-3 text-center text-slate-400">—</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 text-slate-700">
                        ยังไม่ระบุศูนย์
                      </td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3 text-center">1</td>
                      <td className="py-3 text-slate-400">— ยังไม่มีเคสที่ออกจากศูนย์</td>
                      <td className="py-3 text-center">12 วัน</td>
                      <td className="py-3 text-center text-slate-400">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
