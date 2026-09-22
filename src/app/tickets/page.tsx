import type { Metadata } from "next"
import { AppShell } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/AppShell"
import { TicketsView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/TicketsView"

export const metadata: Metadata = {
  title: "รายการงานเคลม · ระบบบริหารงานเคลมอุปกรณ์",
  description: "รายการงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร Forth Corporation",
}

export default function TicketsPage() {
  return (
    <AppShell>
      <TicketsView />
    </AppShell>
  )
}
