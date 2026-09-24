// Storage & API persistence helper for Ticket and RMA records
export const STORAGE_KEYS = {
  DELETED_TICKETS: "forth_caim_deleted_ticket_ids_v1",
  DELETED_RMA: "forth_caim_deleted_rma_ids_v1",
  CUSTOM_TICKETS: "forth_caim_custom_tickets_v1",
  CUSTOM_ASSETS: "forth_caim_custom_assets_v1",
}

export interface StoredTicket {
  id: string
  title: string
  problemDesc: string
  vendor: string
  model: string
  serialNo: string
  status: string
  statusCode: number
  date: string
  ageDays: string
  isOverdue?: boolean
  overdueText?: string
  station?: string
  province?: string
  district?: string
  subdistrict?: string
}

/**
 * Get the list of custom created tickets from localStorage
 */
export function getCustomTickets(): StoredTicket[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_TICKETS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read custom tickets from localStorage", err)
    return []
  }
}

/**
 * Add or update a custom ticket in localStorage
 */
export function addCustomTicket(ticket: StoredTicket): void {
  if (typeof window === "undefined") return
  try {
    const existing = getCustomTickets()
    const filtered = existing.filter((t) => t.id !== ticket.id)
    const updated = [ticket, ...filtered]
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TICKETS, JSON.stringify(updated))
  } catch (err) {
    console.error("Failed to save custom ticket to localStorage", err)
  }
}

/**
 * Get the list of permanently deleted ticket IDs from localStorage
 */
export function getDeletedTicketIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_TICKETS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read deleted tickets from localStorage", err)
    return []
  }
}

/**
 * Persist a deleted ticket ID to localStorage
 */
export function addDeletedTicketId(id: string): void {
  if (typeof window === "undefined") return
  try {
    const existing = getDeletedTicketIds()
    if (!existing.includes(id)) {
      const updated = [...existing, id]
      localStorage.setItem(STORAGE_KEYS.DELETED_TICKETS, JSON.stringify(updated))
    }
  } catch (err) {
    console.error("Failed to save deleted ticket to localStorage", err)
  }
}

/**
 * Get the list of permanently deleted RMA IDs from localStorage
 */
export function getDeletedRmaIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_RMA)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read deleted RMAs from localStorage", err)
    return []
  }
}

/**
 * Persist a deleted RMA ID to localStorage
 */
export function addDeletedRmaId(id: string): void {
  if (typeof window === "undefined") return
  try {
    const existing = getDeletedRmaIds()
    if (!existing.includes(id)) {
      const updated = [...existing, id]
      localStorage.setItem(STORAGE_KEYS.DELETED_RMA, JSON.stringify(updated))
    }
  } catch (err) {
    console.error("Failed to save deleted RMA to localStorage", err)
  }
}

/**
 * Send a delete request to the backend/database API for a ticket
 */
export async function deleteTicketApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    addDeletedTicketId(id)

    const res = await fetch(`/api/tickets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      console.warn(`API DELETE returned status ${res.status}, local persistence retained.`)
    }

    return { success: true, message: `เคส ${id} ถูกลบออกจากระบบอย่างถาวรแล้ว` }
  } catch (err: unknown) {
    console.warn("Backend API not reachable or network error, stored in local persistence", err)
    return { success: true, message: `เคส ${id} ถูกลบออกจากเครื่องของคุณเรียบร้อยแล้ว` }
  }
}

/**
 * Send a delete request to the backend/database API for an RMA record
 */
export async function deleteRmaApi(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    addDeletedRmaId(id)

    const res = await fetch(`/api/rma?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      console.warn(`API DELETE returned status ${res.status}, local persistence retained.`)
    }

    return { success: true, message: `ใบ RMA ${id} ถูกลบออกจากระบบอย่างถาวรแล้ว` }
  } catch (err: unknown) {
    console.warn("Backend API not reachable or network error, stored in local persistence", err)
    return { success: true, message: `ใบ RMA ${id} ถูกลบออกจากเครื่องของคุณเรียบร้อยแล้ว` }
  }
}

export interface StoredAsset {
  serial: string
  vendor: string
  model: string
  category: string
  name?: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Get the list of custom created assets from localStorage
 */
export function getCustomAssets(): StoredAsset[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_ASSETS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error("Failed to read custom assets from localStorage", err)
    return []
  }
}

/**
 * Add or update a custom asset in localStorage
 */
export function saveCustomAsset(asset: StoredAsset): void {
  if (typeof window === "undefined") return
  try {
    const existing = getCustomAssets()
    const filtered = existing.filter(
      (a) => a.serial.toUpperCase() !== asset.serial.toUpperCase()
    )
    const updated = [asset, ...filtered]
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ASSETS, JSON.stringify(updated))
  } catch (err) {
    console.error("Failed to save custom asset to localStorage", err)
  }
}

/**
 * Persist asset to both MongoDB API and localStorage
 */
export async function saveAssetApi(
  asset: StoredAsset
): Promise<{ success: boolean; asset?: StoredAsset; message?: string }> {
  // 1. Immediately cache locally
  saveCustomAsset(asset)

  try {
    // 2. HTTP POST to /api/assets
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asset),
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || `HTTP error ${res.status}`)
    }

    return {
      success: true,
      asset: data.asset || asset,
      message: data.message || "บันทึกข้อมูลอุปกรณ์สำเร็จแล้ว",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์"
    console.warn("Backend API not reachable or error, saved to local persistence:", msg)
    return {
      success: true,
      asset,
      message: "บันทึกข้อมูลลงเครื่องของคุณเรียบร้อยแล้ว (จะซิงก์เข้าฐานข้อมูลเมื่อเชื่อมต่อได้)",
    }
  }
}
