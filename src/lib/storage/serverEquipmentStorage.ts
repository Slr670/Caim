import fs from "fs"
import path from "path"
import { EquipmentDocument } from "@/types/database"
import { DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME } from "@/lib/projects/projectConstants"
import bundledBaselineAssets from "@/data/assets.json"

const DATA_FILE = path.join(process.cwd(), "src/data/custom_equipments.json")
const BASELINE_ASSETS_FILE = path.join(process.cwd(), "src/data/assets.json")

/**
 * Read persistent custom equipment records from disk
 */
export function getPersistentEquipments(): EquipmentDocument[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8")
      const parsed = JSON.parse(content || "[]")
      return Array.isArray(parsed) ? parsed : []
    }
  } catch (err) {
    console.error("Failed to read persistent equipments file:", err)
  }
  return []
}

/**
 * Read the complete local equipment inventory by merging baseline `src/data/assets.json`
 * with any custom/updated records from `src/data/custom_equipments.json`, deduplicated by Serial Number.
 * Used as the resilient fallback when MongoDB is unconfigured or momentarily unreachable.
 */
export function getAllLocalEquipments(): EquipmentDocument[] {
  const bySerial = new Map<string, EquipmentDocument>()

  let baselineList: unknown[] = []
  try {
    if (fs.existsSync(BASELINE_ASSETS_FILE)) {
      const raw = fs.readFileSync(BASELINE_ASSETS_FILE, "utf-8")
      const parsed = JSON.parse(raw || "[]")
      if (Array.isArray(parsed)) {
        baselineList = parsed
      }
    }
  } catch (err) {
    console.error("Failed to read baseline assets.json file:", err)
  }

  // Fallback to statically bundled assets.json (guarantees serverless environments always have the full catalog)
  if (baselineList.length === 0 && Array.isArray(bundledBaselineAssets)) {
    baselineList = bundledBaselineAssets
  }

  for (const rawItem of baselineList) {
    if (!rawItem || typeof rawItem !== "object") continue
    const item = rawItem as Record<string, unknown>
    if (!item.serial) continue
    const serialKey = String(item.serial).trim().toUpperCase()
    if (!serialKey) continue
    bySerial.set(serialKey, {
      serial: String(item.serial).trim(),
      vendor: String(item.vendor || "-"),
      model: String(item.model || "-"),
      category: String(item.category || "อื่นๆ"),
      name: item.name ? String(item.name) : undefined,
      description: item.description ? String(item.description) : undefined,
      projectId:
        item.projectId && String(item.projectId).trim()
          ? String(item.projectId).trim()
          : DEFAULT_PROJECT_ID,
      projectName:
        item.projectName && String(item.projectName).trim()
          ? String(item.projectName).trim()
          : DEFAULT_PROJECT_NAME,
      stationId: item.stationId ? String(item.stationId) : undefined,
      stationName: item.stationName ? String(item.stationName) : undefined,
      status: (item.status as EquipmentDocument["status"]) || "active",
      createdAt:
        typeof item.createdAt === "string" ? item.createdAt : "2026-01-01T00:00:00.000Z",
      updatedAt:
        typeof item.updatedAt === "string" ? item.updatedAt : "2026-01-01T00:00:00.000Z",
    })
  }

  for (const custom of getPersistentEquipments()) {
    if (!custom || !custom.serial) continue
    const serialKey = String(custom.serial).trim().toUpperCase()
    if (!serialKey) continue
    const existing = bySerial.get(serialKey)
    bySerial.set(serialKey, {
      ...existing,
      ...custom,
      projectId:
        custom.projectId && String(custom.projectId).trim()
          ? String(custom.projectId).trim()
          : existing?.projectId || DEFAULT_PROJECT_ID,
      projectName:
        custom.projectName && String(custom.projectName).trim()
          ? String(custom.projectName).trim()
          : existing?.projectName || DEFAULT_PROJECT_NAME,
    })
  }

  return Array.from(bySerial.values())
}

/**
 * Save or update a persistent equipment record on disk
 */
export function savePersistentEquipment(doc: EquipmentDocument): void {
  try {
    const list = getPersistentEquipments()
    const targetSerial = doc.serial.toUpperCase()
    const filtered = list.filter((e) => e.serial.toUpperCase() !== targetSerial)
    const updated = [doc, ...filtered]
    fs.writeFileSync(DATA_FILE, JSON.stringify(updated, null, 2), "utf-8")
  } catch (err) {
    console.error("Failed to save persistent equipment to disk:", err)
  }
}

/**
 * Delete a persistent equipment record from disk
 */
export function deletePersistentEquipment(serial: string): void {
  try {
    const list = getPersistentEquipments()
    const targetSerial = serial.toUpperCase()
    const filtered = list.filter((e) => e.serial.toUpperCase() !== targetSerial)
    fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2), "utf-8")
  } catch (err) {
    console.error("Failed to delete persistent equipment from disk:", err)
  }
}
