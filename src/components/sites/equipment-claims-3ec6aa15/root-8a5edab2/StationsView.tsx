"use client"

import * as React from "react"
import Link from "next/link"
import {
  MapPin,
  ChevronRight,
  House,
  Search,
  Building2,
  Radio,
  ExternalLink,
  Copy,
  Check,
  Eye,
  X,
  RotateCcw,
  Download,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  Mountain,
  TowerControl,
  Plus
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { type Station, STATIONS } from "./stationsData"

export function StationsView() {
  const [stationsList] = React.useState<Station[]>(STATIONS)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedHeight, setSelectedHeight] = React.useState<string>("all")
  const [selectedArea, setSelectedArea] = React.useState<string>("all")
  const [selectedProvince, setSelectedProvince] = React.useState<string>("all")
  const [selectedSiteType, setSelectedSiteType] = React.useState<string>("all")
  const [pageSize, setPageSize] = React.useState<number>(25)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null)
  const [detailStation, setDetailStation] = React.useState<Station | null>(null)

  const deferredQuery = React.useDeferredValue(searchQuery)

  // Unique filter lists
  const provinces = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.province).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  const areas = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.area).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  const heights = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.height).filter(Boolean))
    return Array.from(set).sort((a, b) => b - a)
  }, [stationsList])

  const siteTypes = React.useMemo(() => {
    const set = new Set(stationsList.map((s) => s.siteType).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stationsList])

  // Filtered stations
  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return stationsList.filter((s) => {
      // Height filter
      if (selectedHeight !== "all" && s.height !== Number(selectedHeight)) {
        return false
      }
      // Area filter
      if (selectedArea !== "all" && s.area !== selectedArea) {
        return false
      }
      // Province filter
      if (selectedProvince !== "all" && s.province !== selectedProvince) {
        return false
      }
      // Site type filter
      if (selectedSiteType !== "all" && s.siteType !== selectedSiteType) {
        return false
      }
      // Search query
      if (q) {
        const matchesName = s.name.toLowerCase().includes(q)
        const matchesCode = s.code.toLowerCase().includes(q)
        const matchesProvince = s.province.toLowerCase().includes(q)
        const matchesDistrict = s.district.toLowerCase().includes(q)
        const matchesSubdistrict = s.subdistrict.toLowerCase().includes(q)
        const matchesZone = s.zone.toLowerCase().includes(q)
        const matchesCategory = s.category.toLowerCase().includes(q)
        const matchesSiteType = s.siteType.toLowerCase().includes(q)
        if (
          !matchesName &&
          !matchesCode &&
          !matchesProvince &&
          !matchesDistrict &&
          !matchesSubdistrict &&
          !matchesZone &&
          !matchesCategory &&
          !matchesSiteType
        ) {
          return false
        }
      }
      return true
    })
  }, [stationsList, deferredQuery, selectedHeight, selectedArea, selectedProvince, selectedSiteType])

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredQuery, selectedHeight, selectedArea, selectedProvince, selectedSiteType, pageSize])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedStations = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Copy handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedHeight("all")
    setSelectedArea("all")
    setSelectedProvince("all")
    setSelectedSiteType("all")
    setCurrentPage(1)
  }

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "รหัสสถานี",
      "ชื่อสถานที่ติดตั้ง",
      "ตำบล",
      "อำเภอ",
      "จังหวัด",
      "ภาค",
      "เขตศูนย์สื่อสาร",
      "ความสูงเสา (เมตร)",
      "ชนิดเสา",
      "ผู้รับเหมา",
      "พื้นที่ติดตั้ง",
      "Sea Level (ม.)",
      "Latitude",
      "Longitude",
      "หมวดหมู่"
    ]

    const rows = filtered.map((s) => [
      `"${s.code}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.subdistrict.replace(/"/g, '""')}"`,
      `"${s.district.replace(/"/g, '""')}"`,
      `"${s.province.replace(/"/g, '""')}"`,
      `"${s.area.replace(/"/g, '""')}"`,
      `"${s.zone.replace(/"/g, '""')}"`,
      s.height,
      `"${s.towerType.replace(/"/g, '""')}"`,
      `"${s.contractor.replace(/"/g, '""')}"`,
      `"${s.siteType.replace(/"/g, '""')}"`,
      s.seaLevel,
      s.lat,
      s.lng,
      `"${s.category.replace(/"/g, '""')}"`
    ])

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `forth-stations-data-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // KPI Calculations
  const statsTotal = stationsList.length
  const stats60m = stationsList.filter((s) => s.height === 60).length
  const statsRepeaters = stationsList.filter((s) => s.height < 60).length
  const statsProvinces = provinces.length

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedHeight !== "all" ||
    selectedArea !== "all" ||
    selectedProvince !== "all" ||
    selectedSiteType !== "all"

  return (
    <main id="main" className="flex-1 bg-background">
      <div className="mx-auto flex max-w-350 flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        {/* Breadcrumb and Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
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

            <div className="mt-2.5 flex items-center gap-3.5">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white shadow-xs">
                <Radio className="size-6 text-brand-gold" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  จัดการข้อมูลสถานีและจุดติดตั้งเสาสัญญาณ
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ทะเบียนข้อมูลสถานีฐานและจุดติดตั้งเสารับ-ส่งสัญญาณระบบวิทยุ SHF ในพื้นที่ 10 จังหวัด (รวม 197 จุดติดตั้ง)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 gap-1.5 border-border bg-card text-xs font-medium hover:bg-muted text-foreground"
            >
              <Download className="size-3.5" />
              ส่งออก CSV
            </Button>
            <Link href="/tickets/new">
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 text-xs font-medium shadow-xs"
              >
                <Plus className="size-3.5" />
                สร้างใบแจ้งเคลม
              </Button>
            </Link>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">สถานีทั้งหมด</span>
              <Radio className="size-4 text-brand-navy" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{statsTotal}</span>
              <span className="text-xs text-muted-foreground">จุดติดตั้ง</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">โครงข่ายวิทยุสื่อสาร SHF</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">เสาหลัก 60 ม.</span>
              <TowerControl className="size-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-700">{stats60m}</span>
              <span className="text-xs text-muted-foreground">สถานีหลัก</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">8 ที่ว่าการอำเภอ + 8 สถานีฐาน</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">เสารับ-ส่ง 9-30 ม.</span>
              <Building2 className="size-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">{statsRepeaters}</span>
              <span className="text-xs text-muted-foreground">จุดเชื่อมโยง</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">กระจายตามระดับตำบล/หมู่บ้าน</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-medium">พื้นที่ให้บริการ</span>
              <MapPin className="size-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-700">{statsProvinces}</span>
              <span className="text-xs text-muted-foreground">จังหวัด</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">ครอบคลุม 5 ภาคทั่วประเทศ</p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search */}
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อสถานี, รหัส, ตำบล, อำเภอ, จังหวัด หรือศูนย์สื่อสาร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" />
                  ล้างตัวกรอง
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                พบ <strong className="text-foreground">{filtered.length}</strong> จาก {statsTotal} รายการ
              </span>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {/* ความสูงเสา */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                ความสูงเสา
              </label>
              <select
                value={selectedHeight}
                onChange={(e) => setSelectedHeight(e.target.value)}
                className="w-full h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-brand-navy focus:outline-none"
              >
                <option value="all">ความสูงเสาทั้งหมด</option>
                {heights.map((h) => (
                  <option key={h} value={h}>
                    เสาสูง {h} เมตร {h === 60 ? "(เสาหลัก)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* ภาค */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                ภูมิภาค
              </label>
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="w-full h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-brand-navy focus:outline-none"
              >
                <option value="all">ทุกภูมิภาค</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* จังหวัด */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                จังหวัด
              </label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-brand-navy focus:outline-none"
              >
                <option value="all">ทุกจังหวัด (10 จังหวัด)</option>
                {provinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* ชนิดพื้นที่ติดตั้ง */}
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                สถานที่ติดตั้ง
              </label>
              <select
                value={selectedSiteType}
                onChange={(e) => setSelectedSiteType(e.target.value)}
                className="w-full h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:border-brand-navy focus:outline-none"
              >
                <option value="all">ทุกสถานที่ติดตั้ง</option>
                {siteTypes.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 w-28">รหัสสถานี</th>
                  <th className="py-3 px-4 min-w-56">ชื่อสถานที่ติดตั้ง</th>
                  <th className="py-3 px-4 text-center w-24">ความสูงเสา</th>
                  <th className="py-3 px-4">ตำบล / อำเภอ</th>
                  <th className="py-3 px-4">จังหวัด / ภาค</th>
                  <th className="py-3 px-4">พิกัด GPS & Sea Level</th>
                  <th className="py-3 px-4 text-right w-24">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {paginatedStations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Radio className="size-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">ไม่พบข้อมูลสถานีที่ตรงกับเงื่อนไขการค้นหา</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs"
                        >
                          ล้างตัวกรองทั้งหมด
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedStations.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                              item.height === 60
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {item.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(item.code)}
                            title="คัดลอกรหัสสถานี"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedCode === item.code ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Name & Site Type */}
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {item.height === 60 ? (
                              <TowerControl className="size-3.5 text-blue-600 shrink-0" />
                            ) : (
                              <Building2 className="size-3.5 text-brand shrink-0" />
                            )}
                            <span className="font-semibold text-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{item.siteType}</span>
                            {item.contractor && (
                              <>
                                <span>•</span>
                                <span>ผู้รับเหมา: {item.contractor}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Height */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            item.height === 60
                              ? "bg-blue-600 text-white"
                              : item.height === 30
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200"
                              : item.height === 18
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                          }`}
                        >
                          {item.height} ม.
                        </span>
                      </td>

                      {/* Sub-district & District */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex flex-col">
                          <span className="text-foreground">ต.{item.subdistrict}</span>
                          <span className="text-[11px] text-muted-foreground">อ.{item.district}</span>
                        </div>
                      </td>

                      {/* Province & Area */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{item.province}</span>
                          <span className="text-[11px] text-muted-foreground">{item.zone || item.area}</span>
                        </div>
                      </td>

                      {/* Coordinates */}
                      <td className="py-3.5 px-4 text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                            title="เปิดแผนที่ Google Maps"
                          >
                            <span>{item.lat.toFixed(4)}, {item.lng.toFixed(4)}</span>
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Mountain className="size-3" />
                            {item.seaLevel > 0 ? `${item.seaLevel} ม. จากระดับทะเล` : "-"}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetailStation(item)}
                          className="h-8 gap-1 text-xs font-medium text-brand hover:text-brand hover:bg-brand/10"
                        >
                          <Eye className="size-3.5" />
                          ดูข้อมูล
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <span>
                แสดง {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
                {Math.min(currentPage * pageSize, filtered.length)} จาก {filtered.length} รายการ
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">แถวต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded border border-border bg-background px-1.5 text-xs text-foreground focus:outline-none"
                >
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>ทั้งหมด ({statsTotal})</option>
                </select>
              </div>
            </div>

            {/* Pagination buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 self-center sm:self-auto">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="size-7 border-border bg-card p-0"
                  title="หน้าแรก"
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="size-7 border-border bg-card p-0"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                <span className="px-2 font-medium text-foreground">
                  หน้า {currentPage} จาก {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="size-7 border-border bg-card p-0"
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="size-7 border-border bg-card p-0"
                  title="หน้าสุดท้าย"
                >
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Station Detail Modal */}
      {detailStation && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setDetailStation(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                  {detailStation.height === 60 ? (
                    <TowerControl className="size-6 text-brand-gold" />
                  ) : (
                    <Radio className="size-6 text-brand-gold" />
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{detailStation.name}</h2>
                    <span className="font-mono text-xs rounded bg-muted px-2 py-0.5 text-muted-foreground font-semibold">
                      {detailStation.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{detailStation.category}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailStation(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">รหัสสถานี</span>
                <p className="mt-0.5 font-mono text-sm font-bold text-foreground">
                  {detailStation.code}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ความสูงและชนิดเสา</span>
                <p className="mt-0.5 text-sm font-bold text-foreground">
                  {detailStation.height} เมตร ({detailStation.towerType || "Self-Support"})
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ตำบล / อำเภอ</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  ต.{detailStation.subdistrict} อ.{detailStation.district}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">จังหวัด / ภาค</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  จ.{detailStation.province} ({detailStation.area})
                </p>
              </div>

              <div className="col-span-2 rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">เขตศูนย์สื่อสารกรมการปกครอง</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.zone || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">สถานที่ติดตั้ง</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.siteType}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ผู้รับเหมาโครงสร้างเสา</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.contractor || "-"}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">พิกัดทางภูมิศาสตร์ (GPS)</span>
                <p className="mt-0.5 font-mono font-semibold text-foreground">
                  {detailStation.lat}, {detailStation.lng}
                </p>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground">ระดับความสูงจากน้ำทะเล (Sea Level)</span>
                <p className="mt-0.5 font-semibold text-foreground">
                  {detailStation.seaLevel > 0 ? `${detailStation.seaLevel} เมตร` : "ไม่ระบุ"}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
              <a
                href={`https://www.google.com/maps?q=${detailStation.lat},${detailStation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                <Compass className="size-4" />
                เปิดดูใน Google Maps
                <ExternalLink className="size-3" />
              </a>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailStation(null)}
                  className="h-8.5 text-xs"
                >
                  ปิดหน้าต่าง
                </Button>
                <Link href={`/tickets/new?station=${encodeURIComponent(detailStation.name)}`}>
                  <Button
                    size="sm"
                    className="h-8.5 gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90 text-xs font-medium"
                  >
                    <Plus className="size-3.5" />
                    เปิดใบเคลมสถานีนี้
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
