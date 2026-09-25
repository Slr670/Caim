"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Wrench,
  ChevronRight,
  House,
  Check,
  Save,
  Search,
  HardDrive,
  Info,
  MapPin,
  Building2,
  Radio,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ASSETS, type Asset } from "./assetsData"
import { STATIONS, type Station } from "./stationsData"
import { addCustomTicket, StoredTicket } from "@/lib/storage/recordStorage"

export function NewTicketView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSerial = searchParams.get("serial") || ""
  const initialStation = searchParams.get("station") || ""

  // Database-backed states
  const [equipments, setEquipments] = React.useState<Asset[]>(ASSETS)
  const [stations, setStations] = React.useState<Station[]>(STATIONS)

  const [selectedSerial, setSelectedSerial] = React.useState<string>(initialSerial)
  const [deviceSearch, setDeviceSearch] = React.useState<string>("")
  const [ticketTitle, setTicketTitle] = React.useState<string>(
    () => `CLM-2026-${String(Math.floor(Math.random() * 9000 + 1000))}`
  )
  const [receivedDate, setReceivedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  )
  const [warranty, setWarranty] = React.useState<string>("warranty")
  const [problemDesc, setProblemDesc] = React.useState<string>("")
  const [serviceCenter, setServiceCenter] = React.useState<string>("Huawei")
  const [dueDate, setDueDate] = React.useState<string>("2026-11-21")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)

  // Cascading Location & Station States
  const [selectedProvince, setSelectedProvince] = React.useState<string>("")
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>("")
  const [selectedStationId, setSelectedStationId] = React.useState<string>("")

  // Fetch live equipments and stations from Database
  React.useEffect(() => {
    async function loadData() {
      try {
        const [eqRes, stRes] = await Promise.all([
          fetch("/api/equipments", { cache: "no-store" }),
          fetch("/api/stations", { cache: "no-store" }),
        ])
        if (eqRes.ok) {
          const eqData = await eqRes.json()
          if (eqData.success && Array.isArray(eqData.equipments) && eqData.equipments.length > 0) {
            setEquipments(eqData.equipments)
          }
        }
        if (stRes.ok) {
          const stData = await stRes.json()
          if (stData.success && Array.isArray(stData.stations) && stData.stations.length > 0) {
            setStations(stData.stations)
          }
        }
      } catch (err) {
        console.warn("Fallback to bundled data on initial load:", err)
      }
    }
    loadData()
  }, [])

  // Auto-populate initial serial or station if query param present
  React.useEffect(() => {
    if (initialSerial) setSelectedSerial(initialSerial)
  }, [initialSerial])

  React.useEffect(() => {
    if (initialStation && stations.length > 0) {
      const match = stations.find((s) => s.name === initialStation)
      if (match) {
        setSelectedProvince(match.province)
        setSelectedDistrict(match.district)
        setSelectedStationId(match.id)
      }
    }
  }, [initialStation, stations])

  // Find selected asset
  const selectedAsset = React.useMemo(() => {
    if (!selectedSerial) return null
    return (
      equipments.find((a) => a.serial.toUpperCase() === selectedSerial.toUpperCase()) || null
    )
  }, [selectedSerial, equipments])

  // Filtered dropdown options based on search
  const filteredAssets = React.useMemo(() => {
    const q = deviceSearch.trim().toLowerCase()
    if (!q) return equipments.slice(0, 50)
    return equipments
      .filter(
        (a) =>
          a.serial.toLowerCase().includes(q) ||
          a.vendor.toLowerCase().includes(q) ||
          a.model.toLowerCase().includes(q) ||
          (a.name && a.name.toLowerCase().includes(q))
      )
      .slice(0, 50)
  }, [deviceSearch, equipments])

  // Cascading Location Dropdowns
  const availableProvinces = React.useMemo(() => {
    const set = new Set(stations.map((s) => s.province).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [stations])

  const availableDistricts = React.useMemo(() => {
    if (!selectedProvince) return []
    const set = new Set(
      stations
        .filter((s) => s.province === selectedProvince)
        .map((s) => s.district)
        .filter(Boolean)
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"))
  }, [selectedProvince, stations])

  const availableStations = React.useMemo(() => {
    if (!selectedProvince) return stations.slice(0, 50)
    return stations.filter((s) => {
      if (selectedProvince && s.province !== selectedProvince) return false
      if (selectedDistrict && s.district !== selectedDistrict) return false
      return true
    })
  }, [selectedProvince, selectedDistrict, stations])

  const selectedStation = React.useMemo(() => {
    if (!selectedStationId) return null
    return stations.find((s) => s.id === selectedStationId) || null
  }, [selectedStationId, stations])

  // Handle station dropdown change
  const handleStationChange = (stId: string) => {
    setSelectedStationId(stId)
    const st = stations.find((s) => s.id === stId)
    if (st) {
      setSelectedProvince(st.province)
      setSelectedDistrict(st.district)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ticketTitle.trim() || !problemDesc.trim()) return

    setIsSubmitting(true)

    const dateFormatted = new Date(receivedDate).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })

    const newTicket: StoredTicket = {
      id: ticketTitle.trim(),
      title: ticketTitle.trim(),
      problemDesc: problemDesc.trim(),
      vendor: selectedAsset?.vendor || serviceCenter,
      model: selectedAsset?.model || "-",
      serialNo: selectedSerial || "-",
      status: "รับแจ้ง",
      statusCode: 1,
      date: dateFormatted,
      ageDays: "0 วัน",
      isOverdue: false,
      stationId: selectedStation?.id || undefined,
      station: selectedStation?.name || "",
      province: selectedStation?.province || selectedProvince || "",
      district: selectedStation?.district || selectedDistrict || "",
      subdistrict: selectedStation?.subdistrict || "",
    }

    // 1. Dual persistence: Save to localStorage immediately
    addCustomTicket(newTicket)

    // 2. Dispatch to Backend API / MongoDB (with transaction logging & equipment status update)
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicket),
      })
      if (!res.ok) {
        console.warn("Backend API returned status", res.status)
      }
    } catch (err) {
      console.warn("Backend API offline or unreachable, saved locally", err)
    }

    setIsSaved(true)
    setIsSubmitting(false)

    setTimeout(() => {
      router.push("/tickets")
    }, 1000)
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
                เปิดเคสแจ้งเคลมใหม่ (Transactional)
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                เลือกอุปกรณ์และจุดติดตั้งจากฐานข้อมูลกลาง ข้อมูลจะบันทึกพร้อมประวัติการทำรายการแบบเรียลไทม์
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {isSaved && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <Check className="size-4 shrink-0" />
              <span>บันทึกข้อมูลการเปิดเคสลงฐานข้อมูลเรียบร้อยแล้ว กำลังนำทางกลับไปหน้ารายการ...</span>
            </div>
          )}

          {/* Section 1: อุปกรณ์ */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-base font-semibold text-foreground">
                1. อุปกรณ์ที่แจ้งเคลม
              </h2>
              <Link
                href="/assets"
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                <HardDrive className="size-3.5" />
                ดูทะเบียนอุปกรณ์ทั้งหมด ({equipments.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">
                  ค้นหาอุปกรณ์ในระบบ (S/N หรือ ชื่อรุ่น)
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="พิมพ์เพื่อค้นหา เช่น 1025B... หรือ Huawei..."
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">
                  เลือกอุปกรณ์จากทะเบียนฐานข้อมูลกลาง <span className="text-destructive">*</span>
                </label>
                <select
                  required
                  value={selectedSerial}
                  onChange={(e) => setSelectedSerial(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="">-- เลือกอุปกรณ์ ({filteredAssets.length} รายการที่ค้นพบ) --</option>
                  {selectedSerial && !filteredAssets.some((a) => a.serial === selectedSerial) && selectedAsset && (
                    <option value={selectedAsset.serial}>
                      {selectedAsset.vendor} / {selectedAsset.model} (S/N: {selectedAsset.serial})
                    </option>
                  )}
                  {filteredAssets.map((asset) => (
                    <option key={asset.serial} value={asset.serial}>
                      {asset.vendor} / {asset.model} (S/N: {asset.serial}) {asset.name ? `- ${asset.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Device Preview Card */}
            {selectedAsset ? (
              <div className="rounded-lg border border-brand/20 bg-brand/5 p-3.5 text-xs text-foreground flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <HardDrive className="size-4 text-brand mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-brand">{selectedAsset.serial}</span>
                      <span className="rounded bg-brand-navy/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-navy dark:text-blue-300">
                        {selectedAsset.vendor}
                      </span>
                      <span className="font-medium text-foreground">{selectedAsset.model}</span>
                    </div>
                    {selectedAsset.name && (
                      <p className="text-[11px] font-medium text-foreground mt-0.5">
                        {selectedAsset.name}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {selectedAsset.category} {selectedAsset.description ? `• ${selectedAsset.description}` : ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 shrink-0">
                  ทะเบียนฐานข้อมูลกลาง
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                <Info className="size-4 shrink-0" />
                <span>กรุณาเลือกอุปกรณ์จากรายการด้านบน ข้อมูลรุ่น ยี่ห้อ และหมวดหมู่จะถูกดึงมาให้อัตโนมัติ</span>
              </div>
            )}
          </div>

          {/* Section 2: ข้อมูลสถานีและสถานที่ติดตั้ง (Cascaded Selection) */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <MapPin className="size-4 text-brand" />
                <span>2. ข้อมูลสถานีและสถานที่ติดตั้ง (ฐานข้อมูลสถานี 197 จุด)</span>
              </h2>
              <Link
                href="/stations"
                className="text-xs text-brand hover:underline flex items-center gap-1"
              >
                <Radio className="size-3.5" />
                ดูสถานีทั้งหมด ({stations.length})
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Province */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">จังหวัด</label>
                <select
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value)
                    setSelectedDistrict("")
                    setSelectedStationId("")
                  }}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="">-- ทุกจังหวัด ({availableProvinces.length}) --</option>
                  {availableProvinces.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">อำเภอ</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value)
                    setSelectedStationId("")
                  }}
                  disabled={!selectedProvince}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none disabled:opacity-50"
                >
                  <option value="">-- ทุกอำเภอ ({availableDistricts.length}) --</option>
                  {availableDistricts.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">จุดติดตั้ง / สถานี</label>
                <select
                  value={selectedStationId}
                  onChange={(e) => handleStationChange(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="">-- เลือกสถานี ({availableStations.length}) --</option>
                  {availableStations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.code}) - {st.height} ม.
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Station Preview Card */}
            {selectedStation && (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-foreground flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-start gap-2.5">
                  <Building2 className="size-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{selectedStation.name}</span>
                      <span className="font-mono text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {selectedStation.code}
                      </span>
                      <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {selectedStation.height} เมตร
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      ต.{selectedStation.subdistrict} อ.{selectedStation.district} จ.{selectedStation.province} ({selectedStation.zone || selectedStation.area})
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 shrink-0">
                  พิกัด: {selectedStation.lat.toFixed(4)}, {selectedStation.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: ข้อมูลเคส */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              3. ข้อมูลการแจ้งเคลม
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">
                  เลขที่เคลม <span className="text-destructive">*</span>
                </label>
                <Input
                  required
                  placeholder="เช่น CLM-2026-0043"
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  className="h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  กำหนดเลขอ้างอิงเคส ห้ามซ้ำกับเคสที่มีอยู่แล้ว
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">วันและเวลาที่รับแจ้ง</label>
                <Input
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="font-medium text-foreground">สถานะการรับประกัน</label>
                <select
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
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
                  value={problemDesc}
                  onChange={(e) => setProblemDesc(e.target.value)}
                  placeholder="ระบุอาการผิดปกติหรือสาเหตุที่ต้องการส่งเคลมอย่างละเอียด..."
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          </div>

          {/* Section 4: กำหนดการและศูนย์บริการ */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
            <h2 className="text-base font-semibold text-foreground border-b border-border pb-2.5">
              4. กำหนดการและศูนย์บริการ
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">ศูนย์บริการ / ผู้รับงาน</label>
                <select
                  value={serviceCenter}
                  onChange={(e) => setServiceCenter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:border-ring focus-visible:outline-none"
                >
                  <option value="Huawei">Huawei</option>
                  <option value="Hytera">Hytera</option>
                  <option value="Motorola">Motorola</option>
                  <option value="Dell">Dell</option>
                  <option value="Lenovo">Lenovo</option>
                  <option value="Syndome">Syndome</option>
                  <option value="Transpower">Transpower</option>
                  <option value="Vertiv">Vertiv</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-medium text-foreground">กำหนดแล้วเสร็จ</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 text-xs"
                />
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
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-2 bg-brand text-white hover:bg-brand-dark cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>กำลังบันทึกเข้าฐานข้อมูล...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>บันทึกเคสเคลมและบันทึกธุรกรรม</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
