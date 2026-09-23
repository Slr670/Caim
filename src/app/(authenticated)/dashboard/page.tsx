import type { Metadata } from "next"
import { DashboardView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/DashboardView"

export const metadata: Metadata = {
  title: "แดชบอร์ด · ระบบบริหารงานเคลมอุปกรณ์",
  description: "ภาพรวมงานเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร Forth Corporation",
}

export default function DashboardPage() {
  return <DashboardView />
}
