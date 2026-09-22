"use client"

import * as React from "react"
import Link from "next/link"
import {
  BookOpen,
  ChevronRight,
  House
} from "lucide-react"

export function ManualView() {
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
                <span className="font-normal text-foreground">คู่มือการใช้งาน</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
              <BookOpen className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                คู่มือการใช้งาน
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                วิธีใช้งานระบบทีละหน้าจอ สำหรับเจ้าหน้าที่ที่ใช้งานประจำวัน
              </p>
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col gap-6 text-xs text-foreground">
          <div className="rounded-lg bg-brand/5 border border-brand/20 p-4">
            <p className="font-semibold text-brand text-sm mb-1">
              คำแนะนำการใช้งานระบบสำหรับเจ้าหน้าที่
            </p>
            <p className="text-muted-foreground leading-relaxed">
              คู่มือนี้สำหรับเจ้าหน้าที่ที่ใช้งานระบบประจำวัน อธิบายขั้นตอนการทำงานตามเมนูที่เห็นบนหน้าจอ เพื่อให้การบันทึกสถานะการเคลมอุปกรณ์วิทยุสื่อสารถูกต้องตามเกณฑ์ SLA และข้อตกลงกับศูนย์บริการ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white text-xs">1</span>
                <span>การแจ้งเปิดเคสใหม่</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                เข้าเมนู &quot;แจ้งเคลม&quot; เลือกอุปกรณ์จากทะเบียน ระบุ Serial Number อาการเสีย และศูนย์บริการที่ต้องการส่งซ่อม
              </p>
            </div>

            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white text-xs">2</span>
                <span>การติดตามสถานะงาน</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                ดูที่เมนู &quot;รายการงานเคลม&quot; ค้นหาตาม S/N หรือกรองตามสถานะงาน สามารถอัปเดตขั้นตอนเมื่อส่งของให้ศูนย์บริการแล้ว
              </p>
            </div>

            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
                <span className="flex size-6 items-center justify-center rounded-full bg-brand text-white text-xs">3</span>
                <span>การส่งเคลมต่างประเทศ</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                สำหรับอุปกรณ์ที่ต้องส่งกลับโรงงานผู้ผลิตต่างประเทศ มีระบบนับถอยหลังบทปรับผู้ขายและติดตามสถานะใบ RMA ทีละขั้นตอน
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
