"use client"

import * as React from "react"
import Link from "next/link"
import {
  HardDrive,
  ChevronRight,
  House,
  Search,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Asset {
  serial: string
  vendor: string
  model: string
  category: string
}

const ASSETS: Asset[] = [
  {
    serial: "N02555009980",
    vendor: "Huawei",
    model: "2280",
    category: "ระบบบริหารจัดการ Software-Defined WAN (SD-WAN Controller)"
  },
  {
    serial: "N02555009979",
    vendor: "Huawei",
    model: "2280",
    category: "ระบบบริหารจัดการ Software-Defined WAN (SD-WAN Controller)"
  },
  {
    serial: "1000167600349",
    vendor: "Huawei",
    model: "OMXD30000",
    category: "Optical Transceiver Module 10Gbps"
  },
  {
    serial: "1000167600350",
    vendor: "Hytera",
    model: "MD788G",
    category: "DMR Mobile Radio Transceiver 50W"
  },
  {
    serial: "SN-8839210",
    vendor: "Motorola",
    model: "MOTOTRBO SLR 5500",
    category: "DMR Digital Base Station Repeater"
  }
]

export function AssetsView() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const deferredQuery = React.useDeferredValue(searchQuery)

  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return ASSETS
    return ASSETS.filter(
      (a) =>
        a.serial.toLowerCase().includes(q) ||
        a.vendor.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
  }, [deferredQuery])

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
                <span className="font-normal text-foreground">ข้อมูลอุปกรณ์</span>
              </li>
            </ol>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
                <HardDrive className="size-6" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  จัดการข้อมูลอุปกรณ์
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ทะเบียนอุปกรณ์ทุกชิ้นที่อยู่ในความดูแล ค้นหาและกรองได้จากหน้านี้
                </p>
              </div>
            </div>

            <Button className="gap-2 bg-brand text-white hover:bg-brand-dark shadow-xs">
              <Plus className="size-4" />
              <span>เพิ่มอุปกรณ์</span>
            </Button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยซีเรียล, ยี่ห้อ, รุ่น, หรือหมวดหมู่อุปกรณ์..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 sm:px-6">ซีเรียล</th>
                  <th className="py-3 px-4">ยี่ห้อ</th>
                  <th className="py-3 px-4">รุ่น</th>
                  <th className="py-3 px-4">หมวดหมู่อุปกรณ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((item) => (
                  <tr key={item.serial} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-medium text-brand">
                      {item.serial}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {item.vendor}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {item.model}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {item.category}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>แสดง {filtered.length} รายการ</span>
            <span>ทะเบียนอุปกรณ์ Forth Telecom</span>
          </div>
        </div>
      </div>
    </main>
  )
}
