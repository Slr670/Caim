import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import {
  DashboardMetrics,
  calculateDashboardMetrics,
  TicketItem,
} from "./calculateMetrics"
import {
  getPersistentTickets,
  getPersistentDeletedTicketIds,
} from "@/lib/storage/serverTicketStorage"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"

const SUMMARY_FILE = path.join(process.cwd(), "src/data/dashboard_summary.json")
const CACHE_TTL_MS = 2000 // 2 seconds micro-cache window to deduplicate burst requests while ensuring real-time freshness

// Global In-Memory Fast Cache attached to globalThis across all route handler closures
declare global {
  var _dashboardInMemoryMetrics: DashboardMetrics | null | undefined
  var _dashboardInMemoryTimestamp: number | undefined
  var _dashboardIsCacheDirty: boolean | undefined
  var _dashboardActivePromise: Promise<DashboardMetrics> | null | undefined
}

let indexEnsured = false
let indexEnsureInFlight = false

/**
 * Ensure MongoDB has the optimal compound indexes to prevent slow ad-hoc COLLSCAN (table scans).
 * Runs non-blocking in the background so cold-start GET requests are never delayed or failed by index checks.
 */
export function ensureDashboardIndexesBackground(): void {
  if (indexEnsured || indexEnsureInFlight || !isMongoConfigured()) return
  indexEnsureInFlight = true
  getDb()
    .then((db) => {
      if (!db) return
      return db
        .collection("tickets")
        .createIndex(
          { statusCode: 1, vendor: 1, createdAt: -1 },
          { name: "idx_tickets_dashboard_stats", background: true }
        )
        .then(() => {
          indexEnsured = true
        })
    })
    .catch((err) => {
      console.warn("[DashboardService] Background index ensure skipped:", err)
    })
    .finally(() => {
      indexEnsureInFlight = false
    })
}

export async function ensureDashboardIndexes(): Promise<void> {
  ensureDashboardIndexesBackground()
}

/**
 * Persist pre-aggregated summary to local disk when running on a writable filesystem.
 * Skipped on Vercel serverless read-only filesystems (VERCEL=1) to prevent EROFS warnings and dangling sockets.
 */
function persistSummary(metrics: DashboardMetrics): void {
  if (process.env.VERCEL === "1") {
    return
  }
  try {
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(metrics, null, 2), "utf-8")
  } catch {
    // Read-only filesystem in serverless environments — safely ignored
  }
}

/**
 * Compute fresh dashboard metrics with lean projections and safe optional field guards.
 */
async function computeMetrics(): Promise<DashboardMetrics> {
  let tickets: TicketItem[] = []
  let mongoSucceeded = false

  if (isMongoConfigured()) {
    try {
      ensureDashboardIndexesBackground()
      const db = await getDb()
      if (db) {
        // Lean projection including frozen-SLA dates & optional project fields (safe when absent)
        const docs = await db
          .collection<TicketItem>("tickets")
          .find(
            {},
            {
              projection: {
                id: 1,
                uid: 1,
                title: 1,
                vendor: 1,
                model: 1,
                serialNo: 1,
                status: 1,
                statusCode: 1,
                date: 1,
                deadlineDate: 1,
                returnDate: 1,
                closedAt: 1,
                ageDays: 1,
                isOverdue: 1,
                overdueText: 1,
                station: 1,
                projectId: 1,
                projectName: 1,
                createdAt: 1,
              },
            }
          )
          .sort({ createdAt: -1 })
          .maxTimeMS(6000)
          .toArray()

        mongoSucceeded = true
        if (Array.isArray(docs)) {
          tickets = docs
        }
      }
    } catch (err) {
      console.error("[DashboardService] MongoDB stats query failed, attempting resilient fallback:", err)
    }
  }

  // Fallback to local persistent ticket store only if MongoDB was unconfigured or unreachable
  if (!mongoSucceeded && tickets.length === 0) {
    try {
      tickets = getPersistentTickets() as unknown as TicketItem[]
    } catch (diskErr) {
      console.error("[DashboardService] Persistent disk fallback failed:", diskErr)
      if (global._dashboardInMemoryMetrics) {
        return global._dashboardInMemoryMetrics
      }
      tickets = []
    }
  }

  // Strictly filter out any permanently deleted tickets (guarding optional id/uid safely)
  let persistentDeleted = new Set<string>()
  try {
    persistentDeleted = new Set(getPersistentDeletedTicketIds())
  } catch {
    // Ignore read errors on serverless environments
  }

  const activeTickets = tickets.filter((t) => {
    if (!t || typeof t !== "object") return false
    const id = typeof t.id === "string" ? t.id : ""
    const uid = typeof (t as { uid?: unknown }).uid === "string" ? String((t as { uid?: unknown }).uid) : ""
    if (id && persistentDeleted.has(id)) return false
    if (uid && persistentDeleted.has(uid)) return false
    return true
  })

  const freshMetrics = calculateDashboardMetrics(activeTickets)

  // Update in-memory cache and local disk summary (when writable)
  global._dashboardInMemoryMetrics = freshMetrics
  global._dashboardInMemoryTimestamp = Date.now()
  global._dashboardIsCacheDirty = false

  persistSummary(freshMetrics)

  return freshMetrics
}

/**
 * Main High-Performance Accessor: Returns pre-aggregated dashboard metrics in single-digit ms.
 * Guarantees zero stale data latency by calculating fresh metrics on cold starts and mutations.
 */
export async function getPrecomputedDashboardMetrics(
  options: { forceRefresh?: boolean } = {}
): Promise<DashboardMetrics> {
  const now = Date.now()
  const cached = global._dashboardInMemoryMetrics
  const timestamp = global._dashboardInMemoryTimestamp || 0
  const isDirty = global._dashboardIsCacheDirty || false

  // 1. Fast Path: Return hot in-memory cache if within 2s micro-window and not marked dirty
  if (!options.forceRefresh && cached && !isDirty && now - timestamp < CACHE_TTL_MS) {
    return cached
  }

  // 2. Deduplicate simultaneous compute calls to protect CPU & database
  if (global._dashboardActivePromise) {
    return global._dashboardActivePromise
  }

  global._dashboardActivePromise = computeMetrics().finally(() => {
    global._dashboardActivePromise = null
  })

  return global._dashboardActivePromise
}

/**
 * Invalidate cached metrics and trigger instant re-aggregation & SSE broadcast.
 * Called automatically when tickets, permits, or RMA claims are added/modified/deleted.
 */
export async function invalidateDashboardMetrics(broadcast = true): Promise<DashboardMetrics> {
  global._dashboardIsCacheDirty = true
  const freshMetrics = await computeMetrics()

  if (broadcast) {
    realtimeEmitter.emit(REALTIME_EVENTS.METRICS_CHANGED, {
      type: "metrics",
      action: "update",
      metrics: freshMetrics,
      summary: freshMetrics.summary,
      kpi: freshMetrics.kpi,
      workStatus: freshMetrics.workStatus,
      timestamp: new Date().toISOString(),
    })
  }

  return freshMetrics
}

// Subscribe to mutation events for automatic zero-delay cache synchronization
realtimeEmitter.on(REALTIME_EVENTS.TICKETS_CHANGED, () => {
  invalidateDashboardMetrics(true).catch((err) =>
    console.error("[DashboardService] Invalidation on tickets change failed:", err)
  )
})

realtimeEmitter.on(REALTIME_EVENTS.RMA_CHANGED, () => {
  invalidateDashboardMetrics(true).catch((err) =>
    console.error("[DashboardService] Invalidation on RMA change failed:", err)
  )
})
