"use client"

import * as React from "react"
import Link from "next/link"
import {
  HardDrive,
  ChevronRight,
  House,
  Search,
  Plus,
  Download,
  Copy,
  Check,
  Eye,
  X,
  RotateCcw,
  Wrench,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Server,
  Building2,
  Tag,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Asset, ASSETS } from "./assetsData"
import { getCustomAssets, saveAssetApi } from "@/lib/storage/recordStorage"

export function AssetsView() {
  const [assetsList, setAssetsList] = React.useState<Asset[]>(() => {
    if (typeof window !== "undefined") {
      const custom = getCustomAssets()
      if (custom.length > 0) {
        return [
          ...custom,
          ...ASSETS.filter((a) => !custom.some((c) => c.serial.toUpperCase() === a.serial.toUpperCase())),
        ]
      }
    }
    return ASSETS
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedVendor, setSelectedVendor] = React.useState<string>("all")
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all")
  const [pageSize, setPageSize] = React.useState<number>(25)
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [copiedSerial, setCopiedSerial] = React.useState<string | null>(null)

  // Loading and feedback states
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Modals
  const [detailAsset, setDetailAsset] = React.useState<Asset | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false)

  // New Asset Form State
  const [newSerial, setNewSerial] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [newVendor, setNewVendor] = React.useState("")
  const [newModel, setNewModel] = React.useState("")
  const [newCategory, setNewCategory] = React.useState("")
  const [newDescription, setNewDescription] = React.useState("")
  const [formSuccess, setFormSuccess] = React.useState(false)

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  const deferredQuery = React.useDeferredValue(searchQuery)

  // Unique vendors and categories
  const vendors = React.useMemo(() => {
    const set = new Set(assetsList.map((a) => a.vendor).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [assetsList])

  const categories = React.useMemo(() => {
    const set = new Set(assetsList.map((a) => a.category).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [assetsList])

  // Filtered Assets
  const filtered = React.useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return assetsList.filter((a) => {
      // Vendor filter
      if (selectedVendor !== "all" && a.vendor !== selectedVendor) {
        return false
      }
      // Category filter
      if (selectedCategory !== "all" && a.category !== selectedCategory) {
        return false
      }
      // Search query filter
      if (q) {
        const matchesSerial = a.serial.toLowerCase().includes(q)
        const matchesVendor = a.vendor.toLowerCase().includes(q)
        const matchesModel = a.model.toLowerCase().includes(q)
        const matchesCategory = a.category.toLowerCase().includes(q)
        const matchesName = a.name ? a.name.toLowerCase().includes(q) : false
        const matchesDesc = a.description ? a.description.toLowerCase().includes(q) : false
        if (!matchesSerial && !matchesVendor && !matchesModel && !matchesCategory && !matchesName && !matchesDesc) {
          return false
        }
      }
      return true
    })
  }, [assetsList, deferredQuery, selectedVendor, selectedCategory])

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [deferredQuery, selectedVendor, selectedCategory, pageSize])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginatedAssets = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  // Copy Serial Handler
  const handleCopySerial = (serial: string) => {
    navigator.clipboard.writeText(serial)
    setCopiedSerial(serial)
    setTimeout(() => {
      setCopiedSerial(null)
    }, 1500)
  }

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Serial Number", "อุปกรณ์ (Name)", "ยี่ห้อ (Vendor)", "รุ่น (Model)", "หมวดหมู่ (Category)", "รายละเอียด (Description)"]
    const rows = filtered.map((item) => [
      `"${item.serial.replace(/"/g, '""')}"`,
      `"${(item.name || "").replace(/"/g, '""')}"`,
      `"${item.vendor.replace(/"/g, '""')}"`,
      `"${item.model.replace(/"/g, '""')}"`,
      `"${item.category.replace(/"/g, '""')}"`,
      `"${(item.description || "").replace(/"/g, '""')}"`
    ])

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `equipment-assets-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Fetch assets from backend API with automatic cache revalidation
  const fetchAssets = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/assets", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP error ${res.status}`)
      const data = await res.json()
      if (data && data.success && Array.isArray(data.assets) && data.assets.length > 0) {
        setAssetsList((prev) => {
          const apiAssets: Asset[] = data.assets
          const custom = getCustomAssets()
          // Combine API assets, custom local assets, and previous state
          const merged = [
            ...apiAssets,
            ...custom.filter((c) => !apiAssets.some((a) => a.serial.toUpperCase() === c.serial.toUpperCase())),
            ...prev.filter(
              (p) =>
                !apiAssets.some((a) => a.serial.toUpperCase() === p.serial.toUpperCase()) &&
                !custom.some((c) => c.serial.toUpperCase() === p.serial.toUpperCase())
            ),
          ]
          return merged
        })
      }
    } catch (err) {
      console.warn("Could not sync assets from backend API:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sync on mount
  React.useEffect(() => {
    const custom = getCustomAssets()
    if (custom.length > 0) {
      setAssetsList((prev) => [
        ...custom,
        ...prev.filter((p) => !custom.some((c) => c.serial.toUpperCase() === p.serial.toUpperCase())),
      ])
    }
    fetchAssets()
  }, [fetchAssets])

  // Add Device Handler with Database Persistence & Cache Invalidation
  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const trimmedSerial = newSerial.trim()
    const trimmedVendor = newVendor.trim()

    if (!trimmedSerial) {
      setErrorMessage("กรุณาระบุหมายเลขอุปกรณ์ (Serial Number)")
      return
    }
    if (!trimmedVendor) {
      setErrorMessage("กรุณาระบุยี่ห้อ (Vendor)")
      return
    }

    const newDevice: Asset = {
      serial: trimmedSerial,
      name: newName.trim() || undefined,
      vendor: trimmedVendor,
      model: newModel.trim() || "-",
      category: newCategory.trim() || "อื่นๆ",
      description: newDescription.trim() || undefined,
    }

    setIsSubmitting(true)

    try {
      // 1. Submit HTTP POST to /api/assets and save to localStorage
      const result = await saveAssetApi(newDevice)

      if (!result.success) {
        throw new Error(result.message || "ไม่สามารถบันทึกข้อมูลอุปกรณ์ได้")
      }

      // 2. Optimistic local state update to immediately update UI & summary counters
      setAssetsList((prev) => {
        const filtered = prev.filter(
          (a) => a.serial.toUpperCase() !== newDevice.serial.toUpperCase()
        )
        return [newDevice, ...filtered]
      })

      // 3. Invalidate and refetch from backend API
      await fetchAssets()

      setFormSuccess(true)
      showToast(`บันทึกอุปกรณ์ ${newDevice.serial} (${newDevice.vendor}) สำเร็จแล้ว`)

      setTimeout(() => {
        setFormSuccess(false)
        setIsAddModalOpen(false)
        setNewSerial("")
        setNewName("")
        setNewVendor("")
        setNewModel("")
        setNewCategory("")
        setNewDescription("")
        setErrorMessage(null)
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
      console.error("Failed to save device:", err)
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setSelectedVendor("all")
    setSelectedCategory("all")
    setCurrentPage(1)
  }

  const hasActiveFilters = searchQuery !== "" || selectedVendor !== "all" || selectedCategory !== "all"

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
                  จัดการข้อมูลอุปกรณ์ (Equipment Information)
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ทะเบียนอุปกรณ์โครงข่ายวิทยุสื่อสารและระบบโทรคมนาคม Forth ทั้งหมด {assetsList.length.toLocaleString()} รายการ
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={fetchAssets}
                disabled={isLoading}
                title="รีเฟรชข้อมูลจากเซิร์ฟเวอร์"
                className="gap-1.5 border-border text-foreground hover:bg-muted shadow-xs text-xs h-9 px-2.5"
              >
                <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">รีเฟรช</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="gap-2 border-border text-foreground hover:bg-muted shadow-xs text-xs h-9"
              >
                <Download className="size-3.5" />
                <span className="hidden sm:inline">ส่งออก CSV</span>
              </Button>
              <Button
                onClick={() => {
                  setErrorMessage(null)
                  setIsAddModalOpen(true)
                }}
                className="gap-2 bg-brand text-white hover:bg-brand-dark shadow-xs text-xs h-9"
              >
                <Plus className="size-4" />
                <span>เพิ่มอุปกรณ์</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Server className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">อุปกรณ์ในระบบ</p>
              <p className="text-lg font-bold text-foreground">{assetsList.length.toLocaleString()}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">ยี่ห้อผู้ผลิต</p>
              <p className="text-lg font-bold text-foreground">{vendors.length} ยี่ห้อ</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">หมวดหมู่อุปกรณ์</p>
              <p className="text-lg font-bold text-foreground">{categories.length} กลุ่ม</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
              <SlidersHorizontal className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">ผลการค้นหา</p>
              <p className="text-lg font-bold text-foreground">{filtered.length.toLocaleString()} รายการ</p>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="relative sm:col-span-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยซีเรียล (S/N), ชื่ออุปกรณ์, ยี่ห้อ, รุ่น, หรือคำอธิบาย..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Vendor Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="all">ยี่ห้อทั้งหมด ({vendors.length})</option>
                {vendors.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs truncate focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="all">หมวดหมู่ทั้งหมด ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c} title={c}>
                    {c.length > 30 ? `${c.slice(0, 30)}...` : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filter Clear */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs text-muted-foreground">
              <span>
                กรองผลลัพธ์พบ <strong className="text-foreground">{filtered.length}</strong> รายการ จากทั้งหมด {assetsList.length} รายการ
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3" />
                ล้างการค้นหา
              </Button>
            </div>
          )}
        </div>

        {/* Table Container */}
        <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-3 px-3 sm:px-4 w-12 text-center">ลำดับ</th>
                  <th className="py-3 px-4 sm:px-6">หมายเลขอุปกรณ์ (Serial Number)</th>
                  <th className="py-3 px-4">ชื่ออุปกรณ์</th>
                  <th className="py-3 px-4">ยี่ห้อ</th>
                  <th className="py-3 px-4">รุ่น</th>
                  <th className="py-3 px-4">หมวดหมู่อุปกรณ์</th>
                  <th className="py-3 px-4 text-center w-28">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {paginatedAssets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <HardDrive className="size-8 text-muted-foreground/40" />
                        <p className="font-medium text-foreground">ไม่พบข้อมูลอุปกรณ์ตามเงื่อนไขที่ระบุ</p>
                        <p className="text-xs">ลองค้นหาด้วยคำอื่น หรือกดล้างการค้นหา</p>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2 text-xs">
                            ล้างตัวกรอง
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAssets.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1
                    return (
                      <tr key={item.serial} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-3 sm:px-4 text-center text-muted-foreground font-mono">
                          {rowNumber}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-mono font-medium text-brand">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold tracking-wide">{item.serial}</span>
                            <button
                              type="button"
                              onClick={() => handleCopySerial(item.serial)}
                              title="คัดลอก Serial Number"
                              className="text-muted-foreground/60 hover:text-brand transition-colors p-1"
                            >
                              {copiedSerial === item.serial ? (
                                <Check className="size-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </button>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 font-sans font-normal">
                              {item.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {item.name || "-"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/30 dark:text-blue-300">
                            {item.vendor}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {item.model}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground max-w-xs">
                          <span className="line-clamp-2">{item.category}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDetailAsset(item)}
                              title="ดูรายละเอียดอุปกรณ์"
                              className="text-muted-foreground hover:text-foreground h-7 w-7"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Link
                              href={`/tickets/new?serial=${encodeURIComponent(item.serial)}`}
                              title="เปิดเคสแจ้งเคลมอุปกรณ์นี้"
                              className="inline-flex items-center justify-center text-brand hover:text-brand-dark hover:bg-brand/10 h-7 w-7 rounded-md transition-colors"
                            >
                              <Wrench className="size-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="border-t border-border px-4 py-3 bg-muted/20 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span>
                แสดง {filtered.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filtered.length)} จากทั้งหมด {filtered.length.toLocaleString()} รายการ
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/80">ต่อหน้า:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-7 rounded border border-input bg-background px-2 text-xs focus-visible:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-7 w-7"
                  title="หน้าแรก"
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 w-7"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                <div className="px-2 font-medium text-foreground">
                  หน้า {currentPage} จาก {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 w-7"
                  title="หน้าถัดไป"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-7 w-7"
                  title="หน้าสุดท้าย"
                >
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device Detail Modal */}
      {detailAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <button
              type="button"
              onClick={() => setDetailAsset(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-navy text-white">
                <HardDrive className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">รายละเอียดอุปกรณ์</h2>
                <p className="text-xs font-mono text-brand">{detailAsset.serial}</p>
              </div>
            </div>

            <div className="divide-y divide-border/60 py-4 text-xs">
              <div className="grid grid-cols-3 py-2">
                <span className="font-semibold text-muted-foreground">หมายเลขอุปกรณ์ (S/N)</span>
                <span className="col-span-2 font-mono font-medium text-foreground flex items-center gap-2">
                  {detailAsset.serial}
                  <button
                    type="button"
                    onClick={() => handleCopySerial(detailAsset.serial)}
                    className="text-muted-foreground hover:text-brand"
                    title="คัดลอก S/N"
                  >
                    {copiedSerial === detailAsset.serial ? (
                      <Check className="size-3 text-emerald-600" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </span>
              </div>

              <div className="grid grid-cols-3 py-2">
                <span className="font-semibold text-muted-foreground">ชื่ออุปกรณ์</span>
                <span className="col-span-2 font-medium text-foreground">{detailAsset.name || "-"}</span>
              </div>

              <div className="grid grid-cols-3 py-2">
                <span className="font-semibold text-muted-foreground">ยี่ห้อ (Vendor)</span>
                <span className="col-span-2 font-medium text-foreground">{detailAsset.vendor}</span>
              </div>

              <div className="grid grid-cols-3 py-2">
                <span className="font-semibold text-muted-foreground">รุ่น (Model)</span>
                <span className="col-span-2 font-medium text-foreground">{detailAsset.model}</span>
              </div>

              <div className="grid grid-cols-3 py-2">
                <span className="font-semibold text-muted-foreground">หมวดหมู่อุปกรณ์</span>
                <span className="col-span-2 text-foreground">{detailAsset.category}</span>
              </div>

              {detailAsset.description && (
                <div className="grid grid-cols-3 py-2">
                  <span className="font-semibold text-muted-foreground">รายละเอียดเพิ่มเติม</span>
                  <span className="col-span-2 text-foreground leading-relaxed">{detailAsset.description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => setDetailAsset(null)} className="text-xs">
                ปิด
              </Button>
              <Link
                href={`/tickets/new?serial=${encodeURIComponent(detailAsset.serial)}`}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-brand text-white hover:bg-brand-dark transition-colors shadow-xs"
              >
                <Wrench className="size-3.5" />
                เปิดเคสแจ้งเคลม
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-in fade-in-0 zoom-in-95">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand text-white">
                <Plus className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">เพิ่มอุปกรณ์ใหม่เข้าระบบ</h2>
                <p className="text-xs text-muted-foreground">บันทึกข้อมูลอุปกรณ์ใหม่ลงในฐานข้อมูล</p>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                <Check className="size-4 shrink-0" />
                <span>บันทึกข้อมูลอุปกรณ์สำเร็จแล้ว ระบบกำลังอัปเดตรายการ...</span>
              </div>
            )}

            <form onSubmit={handleAddDevice} className="flex flex-col gap-3 py-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">
                  หมายเลขอุปกรณ์ (Serial Number) <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น 1025B6610999"
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">ชื่ออุปกรณ์ (Equipment Name)</label>
                <Input
                  placeholder="เช่น iMaster NCE_RTN Lite หรือ Switch 24-Port"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">
                    ยี่ห้อ (Vendor) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    required
                    placeholder="เช่น Huawei, Motorola"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-medium text-foreground">รุ่น (Model)</label>
                  <Input
                    placeholder="เช่น 2280 หรือ SLR 5500"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">หมวดหมู่อุปกรณ์ (Category)</label>
                <Input
                  placeholder="เช่น ชุดอุปกรณ์ทวนสัญญาณผ่านคลื่นความถี่สูง (SHF)"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-medium text-foreground">รายละเอียดเพิ่มเติม (Description)</label>
                <textarea
                  rows={2}
                  placeholder="ระบุสเปกหรือหมายเหตุของอุปกรณ์..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:border-ring resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-brand text-white hover:bg-brand-dark text-xs gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <span className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกอุปกรณ์</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-xl animate-in fade-in slide-in-from-bottom-5">
          <Check className="size-4 text-emerald-400" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </main>
  )
}
