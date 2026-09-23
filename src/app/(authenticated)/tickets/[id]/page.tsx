import type { Metadata } from "next"
import { TicketDetailView } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/TicketDetailView"

export const metadata: Metadata = {
  title: "รายละเอียดงานเคลม · ระบบบริหารงานเคลมอุปกรณ์",
  description: "รายละเอียดและประวัติงานเคลมอุปกรณ์ Forth Corporation",
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { id } = await params
  return <TicketDetailView ticketId={id} />
}
