import { GET as realtimeGet } from "../../realtime/stream/route"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  return realtimeGet(req)
}
