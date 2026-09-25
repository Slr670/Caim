import fs from "fs"
import path from "path"
import { TicketDocument } from "@/types/database"

const TICKETS_FILE = path.join(process.cwd(), "src/data/tickets.json")
const DELETED_FILE = path.join(process.cwd(), "src/data/deleted_tickets.json")

/**
 * Read permanently deleted ticket IDs from disk
 */
export function getPersistentDeletedTicketIds(): string[] {
  try {
    if (fs.existsSync(DELETED_FILE)) {
      const content = fs.readFileSync(DELETED_FILE, "utf-8")
      return JSON.parse(content || "[]")
    }
  } catch (err) {
    console.error("Failed to read deleted tickets file:", err)
  }
  return []
}

/**
 * Record a permanently deleted ticket ID on disk
 */
export function addPersistentDeletedTicketId(id: string): void {
  try {
    const list = getPersistentDeletedTicketIds()
    if (!list.includes(id)) {
      list.push(id)
      fs.writeFileSync(DELETED_FILE, JSON.stringify(list, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("Failed to record deleted ticket id to disk:", err)
  }
}

/**
 * Check if a ticket has been marked as deleted
 */
export function isTicketDeleted(id: string): boolean {
  return getPersistentDeletedTicketIds().includes(id)
}

/**
 * Read persistent tickets from disk, excluding deleted tickets
 */
export function getPersistentTickets(): TicketDocument[] {
  try {
    if (fs.existsSync(TICKETS_FILE)) {
      const content = fs.readFileSync(TICKETS_FILE, "utf-8")
      const list: TicketDocument[] = JSON.parse(content || "[]")
      const deleted = new Set(getPersistentDeletedTicketIds())
      return list.filter((t) => !deleted.has(t.id))
    }
  } catch (err) {
    console.error("Failed to read persistent tickets file:", err)
  }
  return []
}

/**
 * Save or update a persistent ticket record on disk
 */
export function savePersistentTicket(doc: TicketDocument): void {
  try {
    const list = getPersistentTickets()
    const filtered = list.filter((t) => t.id !== doc.id)
    const updated = [doc, ...filtered]
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(updated, null, 2), "utf-8")

    // If previously marked deleted, unmark it
    const deleted = getPersistentDeletedTicketIds()
    if (deleted.includes(doc.id)) {
      const remainingDeleted = deleted.filter((id) => id !== doc.id)
      fs.writeFileSync(DELETED_FILE, JSON.stringify(remainingDeleted, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("Failed to save persistent ticket to disk:", err)
  }
}

/**
 * Delete a persistent ticket record from disk permanently
 */
export function deletePersistentTicket(id: string): void {
  try {
    addPersistentDeletedTicketId(id)

    if (fs.existsSync(TICKETS_FILE)) {
      const content = fs.readFileSync(TICKETS_FILE, "utf-8")
      const list: TicketDocument[] = JSON.parse(content || "[]")
      const filtered = list.filter((t) => t.id !== id)
      fs.writeFileSync(TICKETS_FILE, JSON.stringify(filtered, null, 2), "utf-8")
    }
  } catch (err) {
    console.error("Failed to delete persistent ticket from disk:", err)
  }
}
