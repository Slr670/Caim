import fs from "fs"
import path from "path"
import { getDb, isMongoConfigured } from "@/lib/mongodb"
import {
  ProjectDocument,
  ProjectUsageStats,
  ProjectWithUsage,
  TicketDocument,
  RmaDocument,
  EquipmentDocument,
  StationDocument,
} from "@/types/database"
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_PROJECT_NAME,
  DEFAULT_PROJECT_SEED,
} from "./projectConstants"
import { realtimeEmitter, REALTIME_EVENTS } from "@/lib/events/realtimeEmitter"
import { getPersistentTickets, getPersistentDeletedTicketIds } from "@/lib/storage/serverTicketStorage"
import { getPersistentRma, getPersistentDeletedRmaIds } from "@/lib/storage/serverRmaStorage"
import { getPersistentEquipments } from "@/lib/storage/serverEquipmentStorage"

const DATA_DIR = path.join(process.cwd(), "src", "data")
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json")

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  } catch {
    // ignore read-only fs errors in serverless environments
  }
}

export function getPersistentProjects(): ProjectDocument[] {
  try {
    ensureDataDir()
    if (!fs.existsSync(PROJECTS_FILE)) {
      const seeded = [{ ...DEFAULT_PROJECT_SEED }]
      fs.writeFileSync(PROJECTS_FILE, JSON.stringify(seeded, null, 2), "utf8")
      return seeded
    }
    const raw = fs.readFileSync(PROJECTS_FILE, "utf8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch (err) {
    console.warn("[ProjectService] Failed reading projects.json:", err)
  }
  return [{ ...DEFAULT_PROJECT_SEED }]
}

export function savePersistentProjects(projects: ProjectDocument[]) {
  try {
    ensureDataDir()
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8")
  } catch (err) {
    console.warn("[ProjectService] Failed writing projects.json:", err)
  }
}

function sortProjects(list: ProjectDocument[]): ProjectDocument[] {
  return [...list].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return (a.createdAt || "").localeCompare(b.createdAt || "")
  })
}

function cleanMongoDoc<T extends Record<string, unknown>>(doc: T): T {
  const copy = { ...doc }
  delete (copy as { _id?: unknown })._id
  return copy
}

function slugifyProjectId(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
  const suffix = Math.random().toString(36).slice(2, 6)
  return ascii ? `proj-${ascii}-${suffix}` : `proj-${Date.now().toString(36)}-${suffix}`
}

/**
 * Retrieves all master projects, automatically seeding USO-SHF 2 (25310-9999) if missing.
 */
export async function listMasterProjects(): Promise<ProjectDocument[]> {
  const diskProjects = getPersistentProjects()

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const col = db.collection<ProjectDocument>("projects")
        let docs = (await col.find({}).toArray()).map((d) => cleanMongoDoc(d))

        // Ensure default seed project exists in MongoDB
        if (!docs.some((p) => p.id === DEFAULT_PROJECT_ID || p.name === DEFAULT_PROJECT_NAME)) {
          const seedToInsert =
            diskProjects.find((p) => p.id === DEFAULT_PROJECT_ID) || {
              ...DEFAULT_PROJECT_SEED,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          await col.updateOne(
            { id: seedToInsert.id },
            { $setOnInsert: seedToInsert },
            { upsert: true }
          )
          docs = (await col.find({}).toArray()).map((d) => cleanMongoDoc(d))
        }

        // Guarantee at least one project has isDefault = true
        if (docs.length > 0 && !docs.some((p) => p.isDefault)) {
          const targetDefault =
            docs.find((p) => p.id === DEFAULT_PROJECT_ID) || docs[0]
          await col.updateOne({ id: targetDefault.id }, { $set: { isDefault: true } })
          targetDefault.isDefault = true
        }

        const sorted = sortProjects(docs)
        savePersistentProjects(sorted)
        return sorted
      }
    } catch (err) {
      console.warn("[ProjectService] MongoDB listMasterProjects fallback to disk:", err)
    }
  }

  if (!diskProjects.some((p) => p.id === DEFAULT_PROJECT_ID || p.name === DEFAULT_PROJECT_NAME)) {
    diskProjects.unshift({ ...DEFAULT_PROJECT_SEED })
    savePersistentProjects(diskProjects)
  }
  return sortProjects(diskProjects)
}

/**
 * Resolves { projectId, projectName } from partial entity input, defaulting to the active default project.
 */
export async function resolveProjectAssignment(input?: {
  projectId?: string | null
  projectName?: string | null
} | null): Promise<{ projectId: string; projectName: string }> {
  const projects = await listMasterProjects()
  const defaultProj =
    projects.find((p) => p.isDefault) ||
    projects.find((p) => p.id === DEFAULT_PROJECT_ID) ||
    DEFAULT_PROJECT_SEED

  const rawId = input?.projectId?.trim()
  const rawName = input?.projectName?.trim()

  if (rawId) {
    const byId = projects.find((p) => p.id === rawId)
    if (byId) {
      return { projectId: byId.id, projectName: byId.name }
    }
  }

  if (rawName) {
    const byName = projects.find(
      (p) => p.name.toLowerCase() === rawName.toLowerCase()
    )
    if (byName) {
      return { projectId: byName.id, projectName: byName.name }
    }
  }

  return {
    projectId: defaultProj.id,
    projectName: defaultProj.name,
  }
}

/**
 * Computes active record reference counts per project across Claims, Overseas RMA, Equipment, and Stations.
 */
export async function getProjectUsageMap(
  projects: ProjectDocument[]
): Promise<Map<string, ProjectUsageStats>> {
  const usageMap = new Map<string, ProjectUsageStats>()
  for (const p of projects) {
    usageMap.set(p.id, {
      claimsCount: 0,
      rmaCount: 0,
      equipmentsCount: 0,
      stationsCount: 0,
      totalReferences: 0,
    })
  }

  const defaultProj =
    projects.find((p) => p.isDefault) ||
    projects.find((p) => p.id === DEFAULT_PROJECT_ID) ||
    DEFAULT_PROJECT_SEED

  const matchBucket = (rec?: { projectId?: string; projectName?: string }): ProjectUsageStats | undefined => {
    if (rec?.projectId && usageMap.has(rec.projectId)) {
      return usageMap.get(rec.projectId)
    }
    if (rec?.projectName) {
      const found = projects.find(
        (p) => p.name.toLowerCase() === rec.projectName!.trim().toLowerCase()
      )
      if (found) return usageMap.get(found.id)
    }
    return usageMap.get(defaultProj.id)
  }

  const deletedTickets = new Set(getPersistentDeletedTicketIds())
  const deletedRmas = new Set(getPersistentDeletedRmaIds())

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const [tickets, rmas, equipments, stations] = await Promise.all([
          db
            .collection<TicketDocument>("tickets")
            .find({}, { projection: { id: 1, uid: 1, projectId: 1, projectName: 1 } })
            .toArray(),
          db
            .collection<RmaDocument>("rma")
            .find({}, { projection: { id: 1, projectId: 1, projectName: 1 } })
            .toArray(),
          db
            .collection<EquipmentDocument>("equipments")
            .find({}, { projection: { serial: 1, projectId: 1, projectName: 1 } })
            .toArray(),
          db
            .collection<StationDocument>("stations")
            .find({}, { projection: { id: 1, projectId: 1, projectName: 1 } })
            .toArray(),
        ])

        for (const t of tickets) {
          if (deletedTickets.has(t.id) || (t.uid && deletedTickets.has(t.uid))) continue
          const b = matchBucket(t)
          if (b) {
            b.claimsCount += 1
            b.totalReferences += 1
          }
        }
        for (const r of rmas) {
          if (deletedRmas.has(r.id)) continue
          const b = matchBucket(r)
          if (b) {
            b.rmaCount += 1
            b.totalReferences += 1
          }
        }
        for (const eq of equipments) {
          const b = matchBucket(eq)
          if (b) {
            b.equipmentsCount += 1
            b.totalReferences += 1
          }
        }
        for (const st of stations) {
          const b = matchBucket(st)
          if (b) {
            b.stationsCount += 1
            b.totalReferences += 1
          }
        }

        return usageMap
      }
    } catch (err) {
      console.warn("[ProjectService] MongoDB usage count fallback:", err)
    }
  }

  // Fallback local JSON counts
  for (const t of getPersistentTickets()) {
    if (deletedTickets.has(t.id)) continue
    const b = matchBucket(t)
    if (b) {
      b.claimsCount += 1
      b.totalReferences += 1
    }
  }
  for (const r of getPersistentRma()) {
    if (deletedRmas.has(r.id)) continue
    const b = matchBucket(r)
    if (b) {
      b.rmaCount += 1
      b.totalReferences += 1
    }
  }
  for (const eq of getPersistentEquipments()) {
    const b = matchBucket(eq)
    if (b) {
      b.equipmentsCount += 1
      b.totalReferences += 1
    }
  }
  try {
    const stPath = path.join(DATA_DIR, "stations.json")
    if (fs.existsSync(stPath)) {
      const stList = JSON.parse(fs.readFileSync(stPath, "utf8")) as StationDocument[]
      if (Array.isArray(stList)) {
        for (const st of stList) {
          const b = matchBucket(st)
          if (b) {
            b.stationsCount += 1
            b.totalReferences += 1
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return usageMap
}

export async function listMasterProjectsWithUsage(): Promise<ProjectWithUsage[]> {
  const projects = await listMasterProjects()
  const usageMap = await getProjectUsageMap(projects)
  return projects.map((p) => ({
    ...p,
    usage: usageMap.get(p.id) || {
      claimsCount: 0,
      rmaCount: 0,
      equipmentsCount: 0,
      stationsCount: 0,
      totalReferences: 0,
    },
  }))
}

/**
 * Creates a new master project.
 */
export async function createMasterProject(params: {
  name: string
  isDefault?: boolean
}): Promise<{ success: boolean; project?: ProjectDocument; error?: string; status?: number }> {
  const trimmedName = params.name.trim()
  if (!trimmedName) {
    return { success: false, error: "กรุณาระบุชื่อหรือรหัสโครงการ", status: 400 }
  }
  if (trimmedName.length > 140) {
    return { success: false, error: "ชื่อโครงการต้องไม่เกิน 140 ตัวอักษร", status: 400 }
  }

  const existing = await listMasterProjects()
  if (existing.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
    return {
      success: false,
      error: `มีโครงการชื่อ "${trimmedName}" อยู่ในระบบแล้ว`,
      status: 409,
    }
  }

  const nowIso = new Date().toISOString()
  const newProject: ProjectDocument = {
    id: slugifyProjectId(trimmedName),
    name: trimmedName,
    isDefault: Boolean(params.isDefault),
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const col = db.collection<ProjectDocument>("projects")
        if (newProject.isDefault) {
          await col.updateMany({}, { $set: { isDefault: false, updatedAt: nowIso } })
        }
        await col.insertOne({ ...newProject })
        await db.collection("transaction_logs").insertOne({
          id: `TX-PROJ-CRT-${Date.now()}`,
          action: "PROJECT_CREATED",
          targetType: "project",
          targetId: newProject.id,
          details: { name: newProject.name, isDefault: newProject.isDefault },
          timestamp: nowIso,
        })
      }
    } catch (err) {
      console.warn("[ProjectService] MongoDB createMasterProject warning:", err)
    }
  }

  const nextDisk = newProject.isDefault
    ? existing.map((p) => ({ ...p, isDefault: false, updatedAt: nowIso }))
    : [...existing]
  nextDisk.push(newProject)
  savePersistentProjects(sortProjects(nextDisk))

  realtimeEmitter.emit(REALTIME_EVENTS.PROJECTS_CHANGED, {
    type: "project",
    action: "create",
    data: newProject,
    timestamp: nowIso,
  })

  return { success: true, project: newProject, status: 201 }
}

/**
 * Updates/renames a master project and cascades the updated projectName across all linked entities.
 */
export async function updateMasterProject(params: {
  id: string
  name?: string
  isDefault?: boolean
}): Promise<{ success: boolean; project?: ProjectDocument; error?: string; status?: number }> {
  const targetId = params.id.trim()
  if (!targetId) {
    return { success: false, error: "ไม่พบรหัสโครงการที่ต้องการแก้ไข", status: 400 }
  }

  const existing = await listMasterProjects()
  const current = existing.find((p) => p.id === targetId)
  if (!current) {
    return { success: false, error: "ไม่พบโครงการที่ระบุในระบบ", status: 404 }
  }

  const nextName =
    params.name !== undefined ? params.name.trim() : current.name
  if (!nextName) {
    return { success: false, error: "ชื่อโครงการต้องไม่เว้นว่าง", status: 400 }
  }
  if (nextName.length > 140) {
    return { success: false, error: "ชื่อโครงการต้องไม่เกิน 140 ตัวอักษร", status: 400 }
  }

  if (
    existing.some(
      (p) => p.id !== targetId && p.name.toLowerCase() === nextName.toLowerCase()
    )
  ) {
    return {
      success: false,
      error: `มีโครงการชื่อ "${nextName}" อยู่ในระบบแล้ว`,
      status: 409,
    }
  }

  const nowIso = new Date().toISOString()
  const nextIsDefault =
    params.isDefault !== undefined ? Boolean(params.isDefault) : current.isDefault

  // Prevent unsetting default without promoting another project
  const effectiveIsDefault =
    current.isDefault && params.isDefault === false ? true : nextIsDefault

  const updatedProject: ProjectDocument = {
    ...current,
    name: nextName,
    isDefault: effectiveIsDefault,
    updatedAt: nowIso,
  }

  const isRenamed = current.name !== nextName

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        const col = db.collection<ProjectDocument>("projects")
        if (effectiveIsDefault && !current.isDefault) {
          await col.updateMany(
            { id: { $ne: targetId } },
            { $set: { isDefault: false, updatedAt: nowIso } }
          )
        }
        await col.updateOne(
          { id: targetId },
          {
            $set: {
              name: updatedProject.name,
              isDefault: updatedProject.isDefault,
              updatedAt: nowIso,
            },
          }
        )

        // Cascade rename across all 4 core entity collections in MongoDB
        if (isRenamed) {
          const matchFilter = {
            $or: [{ projectId: targetId }, { projectName: current.name }],
          }
          const updateSet = {
            $set: {
              projectId: targetId,
              projectName: nextName,
              updatedAt: nowIso,
            },
          }
          await Promise.all([
            db.collection("tickets").updateMany(matchFilter, updateSet),
            db.collection("rma").updateMany(matchFilter, updateSet),
            db.collection("equipments").updateMany(matchFilter, updateSet),
            db.collection("assets").updateMany(matchFilter, updateSet),
            db.collection("stations").updateMany(matchFilter, updateSet),
          ])
        }

        await db.collection("transaction_logs").insertOne({
          id: `TX-PROJ-UPD-${Date.now()}`,
          action: "PROJECT_UPDATED",
          targetType: "project",
          targetId,
          details: {
            previousName: current.name,
            name: updatedProject.name,
            isDefault: updatedProject.isDefault,
          },
          timestamp: nowIso,
        })
      }
    } catch (err) {
      console.warn("[ProjectService] MongoDB updateMasterProject warning:", err)
    }
  }

  // Update local persistent projects.json & cascade rename in local JSON files
  const nextList = existing.map((p) => {
    if (p.id === targetId) return updatedProject
    if (effectiveIsDefault && !current.isDefault) {
      return { ...p, isDefault: false, updatedAt: nowIso }
    }
    return p
  })
  savePersistentProjects(sortProjects(nextList))

  if (isRenamed) {
    cascadeRenameInLocalJsonFiles(targetId, current.name, nextName)
  }

  realtimeEmitter.emit(REALTIME_EVENTS.PROJECTS_CHANGED, {
    type: "project",
    action: "update",
    data: updatedProject,
    timestamp: nowIso,
  })

  if (isRenamed) {
    realtimeEmitter.emit(REALTIME_EVENTS.TICKETS_CHANGED, {
      type: "ticket",
      action: "update",
      data: { projectId: targetId, projectName: nextName },
      timestamp: nowIso,
    })
    realtimeEmitter.emit(REALTIME_EVENTS.RMA_CHANGED, {
      type: "rma",
      action: "update",
      data: { projectId: targetId, projectName: nextName },
      timestamp: nowIso,
    })
    realtimeEmitter.emit(REALTIME_EVENTS.EQUIPMENTS_CHANGED, {
      type: "equipment",
      action: "update",
      data: { projectId: targetId, projectName: nextName },
      timestamp: nowIso,
    })
    realtimeEmitter.emit(REALTIME_EVENTS.STATIONS_CHANGED, {
      type: "station",
      action: "update",
      data: { projectId: targetId, projectName: nextName },
      timestamp: nowIso,
    })
  }

  return { success: true, project: updatedProject, status: 200 }
}

function cascadeRenameInLocalJsonFiles(
  projectId: string,
  oldName: string,
  newName: string
) {
  const jsonFiles = [
    "tickets.json",
    "rma.json",
    "stations.json",
    "assets.json",
    "custom_equipments.json",
  ]
  for (const filename of jsonFiles) {
    try {
      const fullPath = path.join(DATA_DIR, filename)
      if (!fs.existsSync(fullPath)) continue
      const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"))
      if (!Array.isArray(parsed)) continue
      let modified = false
      for (const item of parsed) {
        if (
          item &&
          typeof item === "object" &&
          (item.projectId === projectId || item.projectName === oldName)
        ) {
          item.projectId = projectId
          item.projectName = newName
          modified = true
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8")
      }
    } catch {
      // ignore local file errors
    }
  }
}

/**
 * Deletes a master project ONLY if it is not the default project AND has zero active record references.
 */
export async function deleteMasterProject(id: string): Promise<{
  success: boolean
  error?: string
  status?: number
  usage?: ProjectUsageStats
}> {
  const targetId = id.trim()
  if (!targetId) {
    return { success: false, error: "ไม่พบรหัสโครงการที่ต้องการลบ", status: 400 }
  }

  const projectsWithUsage = await listMasterProjectsWithUsage()
  const target = projectsWithUsage.find((p) => p.id === targetId)
  if (!target) {
    return { success: false, error: "ไม่พบโครงการที่ต้องการลบในระบบ", status: 404 }
  }

  if (target.isDefault || target.id === DEFAULT_PROJECT_ID) {
    return {
      success: false,
      error: `ไม่สามารถลบโครงการหลัก "${target.name}" ที่ตั้งเป็นค่าเริ่มต้นของระบบได้`,
      status: 409,
      usage: target.usage,
    }
  }

  const usage = target.usage || {
    claimsCount: 0,
    rmaCount: 0,
    equipmentsCount: 0,
    stationsCount: 0,
    totalReferences: 0,
  }

  if (usage.totalReferences > 0) {
    const refParts = [
      usage.claimsCount > 0 ? `งานเคลม ${usage.claimsCount} เคส` : "",
      usage.rmaCount > 0 ? `ใบส่งซ่อมต่างประเทศ ${usage.rmaCount} ใบ` : "",
      usage.equipmentsCount > 0 ? `อุปกรณ์ ${usage.equipmentsCount} รายการ` : "",
      usage.stationsCount > 0 ? `สถานี ${usage.stationsCount} แห่ง` : "",
    ].filter(Boolean)

    return {
      success: false,
      error: `ไม่สามารถลบโครงการ "${target.name}" ได้ เนื่องจากยังมีข้อมูลที่อ้างอิงอยู่ (${refParts.join(", ")})`,
      status: 409,
      usage,
    }
  }

  const nowIso = new Date().toISOString()

  if (isMongoConfigured()) {
    try {
      const db = await getDb()
      if (db) {
        await db.collection("projects").deleteOne({ id: targetId })
        await db.collection("transaction_logs").insertOne({
          id: `TX-PROJ-DEL-${Date.now()}`,
          action: "PROJECT_DELETED",
          targetType: "project",
          targetId,
          details: { name: target.name, deletedAt: nowIso },
          timestamp: nowIso,
        })
      }
    } catch (err) {
      console.warn("[ProjectService] MongoDB deleteMasterProject warning:", err)
    }
  }

  const remaining = projectsWithUsage
    .filter((p) => p.id !== targetId)
    .map((p) => {
      const copy = { ...p }
      delete copy.usage
      return copy
    })
  savePersistentProjects(sortProjects(remaining))

  realtimeEmitter.emit(REALTIME_EVENTS.PROJECTS_CHANGED, {
    type: "project",
    action: "delete",
    data: { id: targetId },
    timestamp: nowIso,
  })

  return { success: true, status: 200 }
}

/**
 * Safe idempotent migration/backfill pass assigning every record with empty projectId/projectName
 * across tickets, rma, equipments, assets, and stations (both MongoDB & local JSON stores)
 * to USO-SHF 2 (25310-9999).
 */
export async function backfillDefaultProjectAcrossAllEntities(): Promise<{
  seededProject: ProjectDocument
  mongoModified: Record<string, number>
  localModified: Record<string, number>
}> {
  const projects = await listMasterProjects()
  const seed =
    projects.find((p) => p.id === DEFAULT_PROJECT_ID) ||
    projects.find((p) => p.isDefault) ||
    DEFAULT_PROJECT_SEED

  const nowIso = new Date().toISOString()
  const mongoModified: Record<string, number> = {
    tickets: 0,
    rma: 0,
    equipments: 0,
    assets: 0,
    stations: 0,
  }

  if (isMongoConfigured()) {
    const db = await getDb()
    if (db) {
      const missingFilter = {
        $or: [
          { projectId: { $exists: false } },
          { projectId: null },
          { projectId: "" },
          { projectName: { $exists: false } },
          { projectName: null },
          { projectName: "" },
        ],
      }
      const setPayload = {
        $set: {
          projectId: seed.id,
          projectName: seed.name,
          updatedAt: nowIso,
        },
      }

      const [tRes, rRes, eqRes, asRes, stRes] = await Promise.all([
        db.collection("tickets").updateMany(missingFilter, setPayload),
        db.collection("rma").updateMany(missingFilter, setPayload),
        db.collection("equipments").updateMany(missingFilter, setPayload),
        db.collection("assets").updateMany(missingFilter, setPayload),
        db.collection("stations").updateMany(missingFilter, setPayload),
      ])

      mongoModified.tickets = tRes.modifiedCount
      mongoModified.rma = rRes.modifiedCount
      mongoModified.equipments = eqRes.modifiedCount
      mongoModified.assets = asRes.modifiedCount
      mongoModified.stations = stRes.modifiedCount
    }
  }

  const localModified: Record<string, number> = {}
  const jsonFiles = [
    "tickets.json",
    "rma.json",
    "stations.json",
    "assets.json",
    "custom_equipments.json",
  ]
  for (const filename of jsonFiles) {
    let count = 0
    try {
      const fullPath = path.join(DATA_DIR, filename)
      if (fs.existsSync(fullPath)) {
        const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"))
        if (Array.isArray(parsed)) {
          for (const rec of parsed) {
            if (
              rec &&
              typeof rec === "object" &&
              (!rec.projectId || !String(rec.projectId).trim() || !rec.projectName || !String(rec.projectName).trim())
            ) {
              rec.projectId = seed.id
              rec.projectName = seed.name
              count += 1
            }
          }
          if (count > 0) {
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8")
          }
        }
      }
    } catch (err) {
      console.warn(`[ProjectService] Local backfill warning for ${filename}:`, err)
    }
    localModified[filename] = count
  }

  return {
    seededProject: seed,
    mongoModified,
    localModified,
  }
}
