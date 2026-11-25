import crypto from "crypto"
import fs from "fs"
import path from "path"
import { getDb, getMongoClient, isMongoConfigured } from "@/lib/mongodb"
import {
  extractGregorianYear,
  formatClaimNumber,
  parseClaimNumber,
  setClaimSequence,
} from "./claimSequence"
import { TicketDocument, RmaDocument, EquipmentDocument } from "@/types/database"
import { reconcileClaimTimelineLogs } from "@/lib/claims/claimTimeline"
import {
  getPersistentDeletedTicketIds,
  removePersistentDeletedTicketIds,
} from "@/lib/storage/serverTicketStorage"

const TICKETS_FILE = path.join(process.cwd(), "src/data/tickets.json")
const RMA_FILE = path.join(process.cwd(), "src/data/rma.json")
const ASSETS_FILE = path.join(process.cwd(), "src/data/assets.json")
const CUSTOM_EQUIPMENTS_FILE = path.join(process.cwd(), "src/data/custom_equipments.json")

const THAI_MONTHS: Record<string, number> = {
  "ม.ค.": 0, "ก.พ.": 1, "มี.ค.": 2, "เม.ย.": 3, "พ.ค.": 4, "มิ.ย.": 5,
  "ก.ค.": 6, "ส.ค.": 7, "ก.ย.": 8, "ต.ค.": 9, "พ.ย.": 10, "ธ.ค.": 11,
}

export function parseDateToTimestamp(raw?: string | null): number {
  if (!raw) return 0
  const str = String(raw).trim()

  // 1. Try direct ISO parse
  const parsed = new Date(str).getTime()
  if (!isNaN(parsed) && str.includes("-")) {
    return parsed
  }

  // 2. Parse Thai date format: "13 มิ.ย. 2569" or "9 ก.ย. 2569"
  const thaiMatch = str.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/)
  if (thaiMatch) {
    const day = parseInt(thaiMatch[1], 10)
    const monthStr = thaiMatch[2]
    let year = parseInt(thaiMatch[3], 10)
    if (year > 2400) year -= 543 // BE to CE

    const month = THAI_MONTHS[monthStr] ?? 0
    return new Date(Date.UTC(year, month, day, 8, 0, 0)).getTime()
  }

  return !isNaN(parsed) ? parsed : 0
}

/**
 * Generates a deterministic UUID-formatted primary key for legacy claim records
 * that were created prior to immutable `uid` introduction, ensuring 100% identical
 * primary keys across MongoDB and local disk stores. Once assigned, `ticket.uid`
 * is preserved permanently and never changes during sequence re-numbering.
 */
export function ensureImmutableClaimUid(ticket: Partial<TicketDocument>): string {
  if (typeof ticket.uid === "string" && ticket.uid.trim().length > 0) {
    return ticket.uid.trim()
  }
  const seed = [
    ticket.serialNo || "",
    ticket.createdAt || ticket.date || "",
    ticket.problemDesc || ticket.title || ticket.id || crypto.randomUUID(),
  ].join("|")
  const hex = crypto.createHash("sha256").update(seed).digest("hex")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export interface ResequenceClaimsResult {
  tickets: TicketDocument[]
  idMapping: Record<string, string>
  caseTitleMapping: Record<string, string>
  maxSequencePerYear: Record<number, number>
  reindexedCount: number
}

/**
 * Checks whether the current claims array has any gaps or non-contiguous sequence numbers
 * within any year group (e.g., jumping from CLM-2026-003 to CLM-2026-005).
 */
export function hasSequenceGaps(claims: TicketDocument[]): boolean {
  if (!claims || claims.length === 0) return false

  const yearSeqMap = new Map<number, number[]>()
  for (const claim of claims) {
    const parsed = parseClaimNumber(claim.id || "")
    if (!parsed) {
      return true
    }
    const list = yearSeqMap.get(parsed.year) || []
    list.push(parsed.seq)
    yearSeqMap.set(parsed.year, list)
  }

  for (const [, seqs] of yearSeqMap.entries()) {
    const sorted = [...seqs].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        return true
      }
    }
  }

  return false
}

/**
 * Pure deterministic claim resequencing helper:
 * 1. Sorts all claims in ascending chronological order (createdAt ascending, using original
 *    numeric suffix order as tie-breaker / primary sequential anchor within the same year).
 * 2. Groups claims by their year prefix (e.g., CLM-2026-) and reassigns contiguous 3-digit
 *    zero-padded sequence numbers starting from 001 (CLM-2026-001..CLM-2026-00N).
 * 3. Strips any MongoDB _id property so documents can be safely upserted without immutable _id conflicts.
 */
export function resequenceClaimNumbers(
  claims: TicketDocument[],
  nowIso: string = new Date().toISOString()
): ResequenceClaimsResult {
  const idMapping: Record<string, string> = {}
  const caseTitleMapping: Record<string, string> = {}
  const maxSequencePerYear: Record<number, number> = {}

  const sortedClaims = [...claims].sort((a, b) => {
    const parsedA = parseClaimNumber(a.id || "")
    const parsedB = parseClaimNumber(b.id || "")

    // If both claims already have valid CLM-YYYY-SEQ numbers in the same year with distinct suffixes,
    // preserve their relative sequential order so deleting a middle claim shifts higher numbers down
    // cleanly without reshuffling earlier claims.
    if (parsedA && parsedB && parsedA.year === parsedB.year && parsedA.seq !== parsedB.seq) {
      return parsedA.seq - parsedB.seq
    }

    const timeA = parseDateToTimestamp(a.createdAt || a.date)
    const timeB = parseDateToTimestamp(b.createdAt || b.date)
    if (timeA !== timeB) {
      return timeA - timeB
    }

    if (parsedA && parsedB && parsedA.seq !== parsedB.seq) {
      return parsedA.seq - parsedB.seq
    }

    return String(a.id || "").localeCompare(String(b.id || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  })

  // Group by Gregorian year prefix (e.g. 2026 -> CLM-2026-)
  const yearGroups = new Map<number, TicketDocument[]>()
  for (const ticket of sortedClaims) {
    const parsed = parseClaimNumber(ticket.id || "")
    const year = parsed ? parsed.year : extractGregorianYear(ticket.createdAt || ticket.date)
    const group = yearGroups.get(year) || []
    group.push(ticket)
    yearGroups.set(year, group)
  }

  const updatedTickets: TicketDocument[] = []
  let reindexedCount = 0

  for (const [year, group] of yearGroups.entries()) {
    group.forEach((ticket, index) => {
      const oldId = ticket.id
      const paddedIndex = String(index + 1).padStart(3, "0")
      const newClaimNumber = `CLM-${year}-${paddedIndex}`

      if (oldId !== newClaimNumber) {
        reindexedCount++
      }

      idMapping[oldId] = newClaimNumber
      if (ticket.title && ticket.title === oldId) {
        caseTitleMapping[ticket.title] = newClaimNumber
      }

      // Harmonize title and claimTitle if they referenced the old Claim ID
      const isRawNumberTitle = /^\d+$/.test(String(ticket.title || "").trim())
      const isOldIdTitle = ticket.title === oldId || /^CLM-\d{4}-\d+$/i.test(String(ticket.title || "").trim())
      let newTitle = ticket.title || newClaimNumber
      if (isRawNumberTitle || isOldIdTitle) {
        newTitle = newClaimNumber
      } else if (oldId && newTitle.includes(oldId)) {
        newTitle = newTitle.replaceAll(oldId, newClaimNumber)
      }

      let newClaimTitle = ticket.claimTitle
      if (newClaimTitle) {
        if (newClaimTitle === oldId || /^CLM-\d{4}-\d+$/i.test(newClaimTitle.trim())) {
          newClaimTitle = newClaimNumber
        } else if (oldId && newClaimTitle.includes(oldId)) {
          newClaimTitle = newClaimTitle.replaceAll(oldId, newClaimNumber)
        }
      }

      // Strip MongoDB immutable _id field to prevent updateOne / upsert errors
      const rawRecord = { ...(ticket as TicketDocument & { _id?: unknown }) }
      delete rawRecord._id

      const immutableUid = ensureImmutableClaimUid(rawRecord)

      const updatedTicket: TicketDocument = {
        ...rawRecord,
        uid: immutableUid,
        id: newClaimNumber,
        claimNumber: newClaimNumber,
        title: newTitle,
        ...(newClaimTitle !== undefined ? { claimTitle: newClaimTitle } : {}),
        ...(oldId !== newClaimNumber ? { previousId: oldId, updatedAt: nowIso } : {}),
      }

      updatedTickets.push(updatedTicket)
    })

    maxSequencePerYear[year] = group.length
  }

  // Prevent stale previousId collisions with any currently active Claim ID
  const activeClaimIds = new Set(updatedTickets.map((t) => t.id))
  for (const t of updatedTickets) {
    if (t.previousId && activeClaimIds.has(t.previousId)) {
      delete t.previousId
    }
  }

  return {
    tickets: updatedTickets,
    idMapping,
    caseTitleMapping,
    maxSequencePerYear,
    reindexedCount,
  }
}

export interface MigrationResult {
  success: boolean
  totalClaimsProcessed: number
  reindexedCount: number
  idMapping: Record<string, string>
  maxSequencePerYear: Record<number, number>
  nextClaimNumber: string
  cascadeUpdates: {
    equipmentsUpdated: number
    rmaRecordsUpdated: number
    transactionLogsUpdated: number
  }
  timestamp: string
  message: string
}

/**
 * Idempotent Data Migration & Automatic Resequencing Engine:
 * Re-indexes all active claim records sequentially in the format CLM-YYYY-XXX (001..N with zero gaps).
 * Cascade-updates all foreign key relations across equipments, RMA records, attached permits,
 * and transaction logs. Calibrates sequence counters for subsequent atomic generation.
 */
export async function migrateClaimSequences(): Promise<MigrationResult> {
  const nowIso = new Date().toISOString()

  let diskTickets: TicketDocument[] = []
  if (fs.existsSync(TICKETS_FILE)) {
    try {
      diskTickets = JSON.parse(fs.readFileSync(TICKETS_FILE, "utf-8") || "[]")
    } catch (e) {
      console.warn("Failed to read disk tickets during migration:", e)
    }
  }

  let mongoTickets: TicketDocument[] = []
  let db: Awaited<ReturnType<typeof getDb>> = null
  let mongoLoaded = false

  if (isMongoConfigured()) {
    try {
      db = await getDb()
      if (db) {
        mongoTickets = await db.collection<TicketDocument>("tickets").find({}).toArray()
        mongoLoaded = true
      }
    } catch (err) {
      console.warn("Could not fetch mongo tickets during migration:", err)
    }
  }

  // Use authoritative MongoDB tickets when connected, or persistent disk tickets when offline
  const deletedSet = new Set(getPersistentDeletedTicketIds())
  const sourceTickets = mongoLoaded && mongoTickets.length > 0 ? mongoTickets : diskTickets
  const ticketMap = new Map<string, TicketDocument>()
  for (const t of sourceTickets) {
    if (t.id && !deletedSet.has(t.id)) {
      ticketMap.set(t.id, t)
    }
  }

  const allTickets = Array.from(ticketMap.values())

  // Run deterministic sequential re-numbering
  const {
    tickets: updatedTickets,
    idMapping,
    caseTitleMapping,
    maxSequencePerYear,
    reindexedCount,
  } = resequenceClaimNumbers(allTickets, nowIso)

  // Calibrate sequence counters per year
  for (const [year, maxSeq] of Object.entries(maxSequencePerYear)) {
    await setClaimSequence(Number(year), maxSeq)
  }

  // Ensure none of the active resequenced IDs remain marked as deleted on disk
  const activeNewIds = updatedTickets.map((t) => t.id)
  removePersistentDeletedTicketIds(activeNewIds)

  // Cascade updates metrics
  let equipmentsUpdated = 0
  let rmaRecordsUpdated = 0
  let transactionLogsUpdated = 0

  // 1. Update Persistent Local Disk Tickets
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(updatedTickets, null, 2), "utf-8")
  } catch (err) {
    console.error("Failed to write updated tickets to disk:", err)
  }

  // 2. Cascade update Persistent Local Disk RMA Records
  if (fs.existsSync(RMA_FILE)) {
    try {
      const diskRma: RmaDocument[] = JSON.parse(fs.readFileSync(RMA_FILE, "utf-8") || "[]")
      let modifiedRma = false

      for (const rma of diskRma) {
        let changed = false
        if (rma.ticketId && idMapping[rma.ticketId] && idMapping[rma.ticketId] !== rma.ticketId) {
          rma.ticketId = idMapping[rma.ticketId]
          changed = true
        }

        if (rma.caseName && idMapping[rma.caseName] && idMapping[rma.caseName] !== rma.caseName) {
          rma.caseName = idMapping[rma.caseName]
          changed = true
        } else if (rma.caseName && caseTitleMapping[rma.caseName] && caseTitleMapping[rma.caseName] !== rma.caseName) {
          rma.caseName = caseTitleMapping[rma.caseName]
          changed = true
        } else if (rma.caseName) {
          for (const [oldId, newId] of Object.entries(idMapping)) {
            if (oldId !== newId && rma.caseName.includes(oldId)) {
              rma.caseName = rma.caseName.replaceAll(oldId, newId)
              changed = true
              break
            }
          }
        }

        if (!rma.ticketId && rma.serialNo) {
          const matchingTicket = updatedTickets.find((t) => t.serialNo === rma.serialNo)
          if (matchingTicket) {
            rma.ticketId = matchingTicket.id
            if (!rma.caseName || rma.caseName === "ไม่ผูกเคส") {
              rma.caseName = matchingTicket.title
            }
            changed = true
          }
        }

        if (rma.permitInfo && rma.permitInfo.rmaId && idMapping[rma.permitInfo.rmaId] && idMapping[rma.permitInfo.rmaId] !== rma.permitInfo.rmaId) {
          rma.permitInfo.rmaId = idMapping[rma.permitInfo.rmaId]
          changed = true
        }
        if (Array.isArray(rma.permits)) {
          for (const p of rma.permits) {
            if (p.rmaId && idMapping[p.rmaId] && idMapping[p.rmaId] !== p.rmaId) {
              p.rmaId = idMapping[p.rmaId]
              changed = true
            }
          }
        }

        if (changed) {
          rma.updatedAt = nowIso
          rmaRecordsUpdated++
          modifiedRma = true
        }
      }

      if (modifiedRma) {
        fs.writeFileSync(RMA_FILE, JSON.stringify(diskRma, null, 2), "utf-8")
      }
    } catch (err) {
      console.warn("Failed to cascade update disk RMA file:", err)
    }
  }

  // 3. Cascade update Persistent Local Disk Assets & Custom Equipments
  for (const assetFilePath of [ASSETS_FILE, CUSTOM_EQUIPMENTS_FILE]) {
    if (fs.existsSync(assetFilePath)) {
      try {
        const assets = JSON.parse(fs.readFileSync(assetFilePath, "utf-8") || "[]")
        if (Array.isArray(assets)) {
          let modified = false
          for (const a of assets) {
            if (a.currentClaimId && idMapping[a.currentClaimId] && idMapping[a.currentClaimId] !== a.currentClaimId) {
              a.currentClaimId = idMapping[a.currentClaimId]
              a.updatedAt = nowIso
              equipmentsUpdated++
              modified = true
            }
          }
          if (modified) {
            fs.writeFileSync(assetFilePath, JSON.stringify(assets, null, 2), "utf-8")
          }
        }
      } catch (err) {
        console.warn(`Failed to cascade update ${assetFilePath}:`, err)
      }
    }
  }

  // 4. Update MongoDB (if configured and connected) inside an atomic transaction when supported
  if (db) {
    const activeNewUids = updatedTickets.map((t) => t.uid).filter((u): u is string => Boolean(u))
    const changedEntries = Object.entries(idMapping).filter(([oldId, newId]) => oldId !== newId)

    const applyMongoResequence = async (session?: Parameters<NonNullable<typeof db>["collection"]>[1] extends never ? never : import("mongodb").ClientSession) => {
      const opts = session ? { session } : {}

      // 4a. First bind uid onto any existing MongoDB documents matched by oldId or uid, using temporary IDs to avoid unique index collisions
      for (const t of updatedTickets) {
        const prevMappedId = Object.entries(idMapping).find(([, mappedNew]) => mappedNew === t.id)?.[0] || t.id
        await db!.collection("tickets").updateOne(
          { $or: [{ uid: t.uid }, { id: prevMappedId }] },
          {
            $set: {
              ...t,
              id: `__REINDEX__${t.id}`,
              claimNumber: t.id,
            },
          },
          { upsert: true, ...opts }
        )
      }

      // Finalize contiguous claim numbers keyed strictly by immutable uid
      for (const t of updatedTickets) {
        await db!.collection("tickets").updateOne(
          { uid: t.uid },
          {
            $set: {
              ...t,
              id: t.id,
              claimNumber: t.id,
            },
            ...(t.previousId === undefined ? { $unset: { previousId: "" } } : {}),
          },
          opts
        )
      }

      // Remove any stale/orphaned ticket rows not belonging to the active immutable UID set
      if (activeNewUids.length > 0) {
        await db!.collection("tickets").deleteMany(
          { uid: { $nin: activeNewUids } },
          opts
        )
      } else if (activeNewIds.length > 0) {
        await db!.collection("tickets").deleteMany(
          { id: { $nin: activeNewIds } },
          opts
        )
      }

      if (changedEntries.length > 0) {
        // 4b. Two-phase cascade update Equipments Collection
        for (const [oldId, newId] of changedEntries) {
          await db!.collection<EquipmentDocument>("equipments").updateMany(
            { currentClaimId: oldId },
            { $set: { currentClaimId: `__REINDEX__${newId}`, updatedAt: nowIso } },
            opts
          )
        }
        for (const [, newId] of changedEntries) {
          const res = await db!.collection<EquipmentDocument>("equipments").updateMany(
            { currentClaimId: `__REINDEX__${newId}` },
            { $set: { currentClaimId: newId, updatedAt: nowIso } },
            opts
          )
          equipmentsUpdated += res.modifiedCount
        }

        // 4c. Two-phase cascade update RMA Collection
        for (const [oldId, newId] of changedEntries) {
          await db!.collection<RmaDocument>("rma").updateMany(
            { ticketId: oldId },
            { $set: { ticketId: `__REINDEX__${newId}`, updatedAt: nowIso } },
            opts
          )
          await db!.collection<RmaDocument>("rma").updateMany(
            { caseName: oldId },
            { $set: { caseName: `__REINDEX__${newId}`, updatedAt: nowIso } },
            opts
          )
        }
        for (const [, newId] of changedEntries) {
          const resTicket = await db!.collection<RmaDocument>("rma").updateMany(
            { ticketId: `__REINDEX__${newId}` },
            { $set: { ticketId: newId, updatedAt: nowIso } },
            opts
          )
          const resCase = await db!.collection<RmaDocument>("rma").updateMany(
            { caseName: `__REINDEX__${newId}` },
            { $set: { caseName: newId, updatedAt: nowIso } },
            opts
          )
          rmaRecordsUpdated += resTicket.modifiedCount + resCase.modifiedCount
        }

        // 4d. Reconcile & purge orphaned timeline logs, binding all valid logs strictly to immutable claimId (uid)
        const logRecon = await reconcileClaimTimelineLogs(db!, updatedTickets, session)
        transactionLogsUpdated += logRecon.boundCount + logRecon.purgedCount
      } else {
        const logRecon = await reconcileClaimTimelineLogs(db!, updatedTickets, session)
        transactionLogsUpdated += logRecon.boundCount + logRecon.purgedCount
      }
    }

    try {
      const client = await getMongoClient()
      if (client) {
        const session = client.startSession()
        try {
          await session.withTransaction(async () => {
            await applyMongoResequence(session)
          })
        } catch {
          // Fallback for standalone MongoDB instances that do not support replica-set transactions
          await applyMongoResequence()
        } finally {
          await session.endSession()
        }
      } else {
        await applyMongoResequence()
      }
    } catch (mongoErr) {
      console.warn("MongoDB cascade update encountered partial notice:", mongoErr)
    }
  }

  const currentYear = new Date().getFullYear()
  const nextSeqNum = (maxSequencePerYear[currentYear] || 0) + 1
  const nextClaimNumber = formatClaimNumber(currentYear, nextSeqNum)

  return {
    success: true,
    totalClaimsProcessed: updatedTickets.length,
    reindexedCount,
    idMapping,
    maxSequencePerYear,
    nextClaimNumber,
    cascadeUpdates: {
      equipmentsUpdated,
      rmaRecordsUpdated,
      transactionLogsUpdated,
    },
    timestamp: nowIso,
    message: `Re-indexed ${updatedTickets.length} claim records sequentially. Next claim number is ${nextClaimNumber}.`,
  }
}
