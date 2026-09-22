import type { Metadata } from "next"
import { AppShell } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/AppShell"
import { NewTicketView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/NewTicketView"

export const metadata: Metadata = {
  title: "แจ้งเคลม · ระบบบริหารงานเคลมอุปกรณ์",
  description: "เปิดเคสแจ้งเคลมอุปกรณ์ใหม่ Forth Corporation",
}

export default function NewTicketPage() {
  return (
    <AppShell>
      <NewTicketView />
    </AppShell>
  )
}
