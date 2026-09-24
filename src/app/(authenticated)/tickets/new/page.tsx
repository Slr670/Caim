import type { Metadata } from "next"
import { Suspense } from "react"
import { NewTicketView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/NewTicketView"

export const metadata: Metadata = {
  title: "แจ้งเคลม · ระบบบริหารงานเคลมอุปกรณ์",
  description: "เปิดเคสแจ้งเคลมอุปกรณ์ใหม่ Forth Corporation",
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">กำลังโหลดข้อมูล...</div>}>
      <NewTicketView />
    </Suspense>
  )
}
