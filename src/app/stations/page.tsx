import type { Metadata } from "next"
import { AppShell } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/AppShell"
import { StationsView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/StationsView"

export const metadata: Metadata = {
  title: "ข้อมูลสถานี · ระบบบริหารงานเคลมอุปกรณ์",
  description: "จัดการข้อมูลสถานีและจุดติดตั้ง Forth Corporation",
}

export default function StationsPage() {
  return (
    <AppShell>
      <StationsView />
    </AppShell>
  )
}
