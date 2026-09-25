import { NextResponse } from "next/server"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import { calculateDashboardMetrics, TicketItem } from "@/lib/dashboard/calculateMetrics"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

export async function GET() {
  try {
    let tickets: TicketItem[] = []

    if (isMongoConfigured()) {
      const db = await getDb()
      if (db) {
        tickets = await db
          .collection<TicketItem>("tickets")
          .find({})
          .sort({ createdAt: -1 })
          .toArray()
      }
    }

    // If MongoDB didn't return any, try fetching local API fallback
    if (tickets.length === 0) {
      const initialTickets: TicketItem[] = [
        {
          id: "1",
          title: "หัวข้อเลขที่เคลม",
          problemDesc: "หัวข้ออาการเสีย ปัญหาที่พบ",
          vendor: "Huawei",
          model: "OMXD30000",
          serialNo: "1000167600349",
          status: "รับแจ้ง",
          statusCode: 1,
          date: "13 ก.ย. 2569",
          ageDays: "10 วัน",
          isOverdue: false,
        },
        {
          id: "2",
          title: "ทดสอบระบบ",
          problemDesc: "ทดสอบระบบทดสอบระบบ",
          vendor: "Huawei",
          model: "OMXD30000",
          serialNo: "1000167600349",
          status: "ปิดเคส",
          statusCode: 5,
          date: "10 ก.ย. 2569",
          ageDays: "19 วัน",
          isOverdue: false,
        },
        {
          id: "3",
          title: "test2",
          problemDesc: "testtest",
          vendor: "Huawei",
          model: "OMXD30000",
          serialNo: "1000167600349",
          status: "ส่งศูนย์",
          statusCode: 2,
          date: "9 ก.ย. 2569",
          ageDays: "13 วัน",
          isOverdue: false,
        },
        {
          id: "4",
          title: "FORTH-2026-002",
          problemDesc: "บอร์ดเสีย",
          vendor: "Huawei",
          model: "PAC80S12-CN",
          serialNo: "2102131835USR8305867",
          status: "ส่งศูนย์",
          statusCode: 2,
          date: "9 ก.ย. 2569",
          ageDays: "13 วัน",
          isOverdue: true,
          overdueText: "เกินกำหนด 8 วัน",
        },
        {
          id: "5",
          title: "test",
          problemDesc: "testtest",
          vendor: "Huawei",
          model: "PAC80S12-CN",
          serialNo: "2102131835USR8305867",
          status: "ปฏิเสธเคลม",
          statusCode: 6,
          date: "8 ก.ย. 2569",
          ageDays: "15 วัน",
          isOverdue: false,
        },
      ]
      tickets = initialTickets
    }

    const metrics = calculateDashboardMetrics(tickets)

    return NextResponse.json(
      {
        success: true,
        metrics,
        ticketsCount: tickets.length,
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to compute dashboard metrics"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
