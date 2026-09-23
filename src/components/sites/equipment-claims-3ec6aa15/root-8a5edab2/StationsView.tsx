"use client"

import * as React from "react"
import Link from "next/link"
import {
  MapPin,
  ChevronRight,
  House,
  Search,
  Building2
} from "lucide-react"
import { Input } from "@/components/ui/input"

interface Station {
  name: string
  code: string
  area: string
  subdistrict: string
  district: string
  province: string
}

const STATIONS: Station[] = [
  { name: "BS คลองป่าหมู", code: "BS-014", area: "ภาคตะวันออกเฉียงเหนือ", subdistrict: "วังกะทะ", district: "ปากช่อง", province: "นครราชสีมา" },
  { name: "BS คลองพลู", code: "BS-022", area: "ภาคตะวันออก", subdistrict: "คลองพลู", district: "เขาคิชฌกูฏ", province: "จันทบุรี" },
  { name: "BS ช่อง", code: "BS-031", area: "ภาคใต้", subdistrict: "ช่อง", district: "นาโยง", province: "ตรัง" },
  { name: "BS ปางใหม่พัฒนา", code: "BS-045", area: "ภาคเหนือ", subdistrict: "ปางตาไว", district: "ปางศิลาทอง", province: "กำแพงเพชร" },
  { name: "BS วังงิ้ว", code: "BS-058", area: "ภาคกลาง", subdistrict: "วังงิ้ว", district: "ดงเจริญ", province: "พิจิตร" },
  { name: "BS วัดบางอุดม", code: "BS-064", area: "ภาคใต้", subdistrict: "ขนาบนาก", district: "ปากพนัง", province: "นครศรีธรรมราช" },
  { name: "BS ศรีสุขสำราญ", code: "BS-071", area: "ภาคตะวันออกเฉียงเหนือ", subdistrict: "ศรีสุขสำราญ", district: "อุบลรัตน์", province: "ขอนแก่น" },
  { name: "BS หนองนกแก้ว", code: "BS-083", area: "ภาคตะวันตก", subdistrict: "หนองนกแก้ว", district: "เลาขวัญ", province: "กาญจนบุรี" },
  { name: "ที่ว่าการอำเภอเขาคิชฌกูฏ", code: "GOV-01", area: "ภาคตะวันออก", subdistrict: "พลวง", district: "เขาคิชฌกูฏ", province: "จันทบุรี" },
  { name: "ที่ว่าการอำเภอเขาสวนกวาง", code: "GOV-02", area: "ภาคตะวันออกเฉียงเหนือ", subdistrict: "คำม่วง", district: "เขาสวนกวาง", province: "ขอนแก่น" },
  { name: "ที่ว่าการอำเภอคลองลาน", code: "GOV-03", area: "ภาคเหนือ", subdistrict: "คลองน้ำไหล", district: "คลองลาน", province: "กำแพงเพชร" },
  { name: "ที่ว่าการอำเภอดงเจริญ", code: "GOV-04", area: "ภาคกลาง", subdistrict: "วังงิ้วใต้", district: "ดงเจริญ", province: "พิจิตร" }
]

export function StationsView() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const deferredQuery = React.useDeferredValue(searchQuery)

  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    if (!q) return STATIONS
    return STATIONS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q) ||
        s.district.toLowerCase().includes(q)
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
                <span className="font-normal text-foreground">ข้อมูลสถานี</span>
              </li>
            </ol>
          </nav>

          <div className="flex items-center gap-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
              <MapPin className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                จัดการข้อมูลสถานี
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                สถานีและจุดติดตั้งที่ใช้อ้างอิงในงานเคลมและทะเบียนอุปกรณ์
              </p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาด้วยชื่อสถานี, อำเภอ, หรือจังหวัด..."
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
                  <th className="py-3 px-4 sm:px-6">ชื่อสถานี</th>
                  <th className="py-3 px-4">รหัสสถานี</th>
                  <th className="py-3 px-4">ตำบล</th>
                  <th className="py-3 px-4">อำเภอ</th>
                  <th className="py-3 px-4">จังหวัด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((item) => (
                  <tr key={item.name} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-3.5 text-brand shrink-0" />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {item.code}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {item.subdistrict}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {item.district}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {item.province}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>แสดง {filtered.length} รายการ</span>
            <span>สถานีฐานวิทยุสื่อสาร Forth Telecom</span>
          </div>
        </div>
      </div>
    </main>
  )
}
