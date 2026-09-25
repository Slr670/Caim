import fs from "fs"
import path from "path"
import { EquipmentDocument } from "@/types/database"

const DATA_FILE = path.join(process.cwd(), "src/data/custom_equipments.json")

/**
 * Read persistent custom equipment records from disk
 */
export function getPersistentEquipments(): EquipmentDocument[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8")
      return JSON.parse(content || "[]")
    }
  } catch (err) {
    console.error("Failed to read persistent equipments file:", err)
  }
  return []
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
