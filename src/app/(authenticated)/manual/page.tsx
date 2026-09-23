import type { Metadata } from "next"
import { ManualView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/ManualView"

export const metadata: Metadata = {
  title: "คู่มือการใช้งาน · ระบบบริหารงานเคลมอุปกรณ์",
  description: "คู่มือการใช้งานระบบบริหารงานเคลมอุปกรณ์ Forth Corporation",
}

export default function ManualPage() {
  return <ManualView />
}
