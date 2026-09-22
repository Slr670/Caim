import type { Metadata } from "next"
import { AppShell } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/AppShell"
import { AssetsView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/AssetsView"

export const metadata: Metadata = {
  title: "ข้อมูลอุปกรณ์ · ระบบบริหารงานเคลมอุปกรณ์",
  description: "จัดการทะเบียนอุปกรณ์ Forth Corporation",
}

export default function AssetsPage() {
  return (
    <AppShell>
      <AssetsView />
    </AppShell>
  )
}
