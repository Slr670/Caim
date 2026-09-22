import type { Metadata } from "next"
import { AppShell } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/AppShell"
import { OverseasView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/OverseasView"

export const metadata: Metadata = {
  title: "ส่งเคลมต่างประเทศ · ระบบบริหารงานเคลมอุปกรณ์",
  description: "ติดตามอุปกรณ์ที่ส่งเคลมไปต่างประเทศ Forth Corporation",
}

export default function OverseasPage() {
  return (
    <AppShell>
      <OverseasView />
    </AppShell>
  )
}
