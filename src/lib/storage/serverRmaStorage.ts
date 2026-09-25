import fs from "fs"
import path from "path"
import { RmaDocument } from "@/types/database"

const RMA_FILE = path.join(process.cwd(), "src/data/rma.json")
const DELETED_RMA_FILE = path.join(process.cwd(), "src/data/deleted_rma.json")

/**
 * Read permanently deleted RMA IDs from disk
 */
export function getPersistentDeletedRmaIds(): string[] {
  try {
    if (fs.existsSync(DELETED_RMA_FILE)) {
      const content = fs.readFileSync(DELETED_RMA_FILE, "utf-8")
      return JSON.parse(content || "[]")
    }
  } catch (err) {
    console.error("Failed to read deleted RMA file:", err)
  }
  return []
}

/**
 * Record a permanently deleted RMA ID on disk
 */
export function addPersistentDeletedRmaId(id: string): void {
  try {
    const list = getPersistentDeletedRmaIds()
    if (!list.includes(id)) {
      list.push(id)
      fs.writeFileSync(DELETED_RMA_FILE, JSON.stringify(list, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("Failed to record deleted RMA id to disk:", err)
  }
}

/**
 * Check if an RMA item has been marked as deleted
 */
export function isRmaDeleted(id: string): boolean {
  return getPersistentDeletedRmaIds().includes(id)
}

/**
 * Read persistent RMA items from disk, excluding deleted RMAs
 */
export function getPersistentRma(): RmaDocument[] {
  try {
    if (fs.existsSync(RMA_FILE)) {
      const content = fs.readFileSync(RMA_FILE, "utf-8")
      const list: RmaDocument[] = JSON.parse(content || "[]")
      const deleted = new Set(getPersistentDeletedRmaIds())
      return list.filter((r) => !deleted.has(r.id))
    }
  } catch (err) {
    console.error("Failed to read persistent RMA file:", err)
  }
  return []
}

/**
 * Save or update a persistent RMA record on disk
 */
export function savePersistentRma(doc: RmaDocument): void {
  try {
    const list = getPersistentRma()
    const filtered = list.filter((r) => r.id !== doc.id)
    const updated = [doc, ...filtered]
    fs.writeFileSync(RMA_FILE, JSON.stringify(updated, null, 2), "utf-8")

    // If previously marked deleted, unmark it
    const deleted = getPersistentDeletedRmaIds()
    if (deleted.includes(doc.id)) {
      const remainingDeleted = deleted.filter((id) => id !== doc.id)
      fs.writeFileSync(DELETED_RMA_FILE, JSON.stringify(remainingDeleted, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("Failed to save persistent RMA to disk:", err)
  }
}

/**
 * Delete a persistent RMA record from disk permanently
 */
export function deletePersistentRma(id: string): void {
  try {
    addPersistentDeletedRmaId(id)

    if (fs.existsSync(RMA_FILE)) {
      const content = fs.readFileSync(RMA_FILE, "utf-8")
      const list: RmaDocument[] = JSON.parse(content || "[]")
      const filtered = list.filter((r) => r.id !== id)
      fs.writeFileSync(RMA_FILE, JSON.stringify(filtered, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("Failed to delete persistent RMA from disk:", err)
  }
}
