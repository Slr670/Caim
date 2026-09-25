"use client"

import * as React from "react"
import { Asset, ASSETS } from "@/components/sites/equipment-claims-3ec6aa15/root-8a5edab2/assetsData"
import { getCustomAssets, saveCustomAsset, removeCustomAsset } from "@/lib/storage/recordStorage"

export const EQUIPMENTS_QUERY_KEY = ["equipments"] as const

export interface EquipmentQueryState {
  equipments: Asset[]
  total: number
  isLoading: boolean
  isError: boolean
  error: string | null
  lastUpdated: number
}

// Global Singleton In-Memory Query Cache Store
function getInitialCache(): { cache: Asset[]; total: number } {
  if (typeof window !== "undefined") {
    try {
      const localCustom = getCustomAssets()
      if (localCustom.length > 0) {
        const merged = [
          ...localCustom,
          ...ASSETS.filter((a) => !localCustom.some((c) => c.serial.toUpperCase() === a.serial.toUpperCase())),
        ]
        return { cache: merged, total: merged.length }
      }
    } catch {}
  }
  return { cache: [...ASSETS], total: ASSETS.length }
}

const initial = getInitialCache()
let globalEquipmentsCache: Asset[] = initial.cache
let globalTotal: number = initial.total
let globalIsLoading: boolean = false
let globalIsError: boolean = false
let globalError: string | null = null
let globalLastUpdated: number = 0
let activeFetchPromise: Promise<Asset[]> | null = null

const subscribers = new Set<() => void>()

function broadcastCacheUpdate() {
  subscribers.forEach((callback) => {
    try {
      callback()
    } catch (err) {
      console.error("Error in equipment subscriber callback:", err)
    }
  })
}

/**
 * Fetch equipments from authoritative database API, with automatic sync of any
 * legacy un-migrated localStorage records.
 */
export async function fetchEquipmentsFromApi(force = false): Promise<Asset[]> {
  const now = Date.now()

  // Use cached data if not forced and fetched recently (< 10 seconds)
  if (!force && globalLastUpdated > 0 && now - globalLastUpdated < 10000 && globalEquipmentsCache.length > 0) {
    return globalEquipmentsCache
  }

  // If forced and there is an active request in flight, wait for it to finish first, then do a fresh fetch
  if (force && activeFetchPromise) {
    try {
      await activeFetchPromise
    } catch {
      // ignore
    }
  } else if (!force && activeFetchPromise) {
    return activeFetchPromise
  }

  globalIsLoading = true
  broadcastCacheUpdate()

  const currentPromise = (async () => {
    try {
      const res = await fetch("/api/equipments", {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }
      const data = await res.json()

      let fetchedList: Asset[] = []
      if (data && data.success && Array.isArray(data.equipments)) {
        fetchedList = data.equipments
      } else {
        fetchedList = ASSETS
      }

      // Check if there are any custom assets stored in localStorage that are not in database yet
      if (typeof window !== "undefined") {
        try {
          const localCustom = getCustomAssets()
          if (localCustom.length > 0) {
            const missingFromDb = localCustom.filter(
              (c) => !fetchedList.some((f) => f.serial.toUpperCase() === c.serial.toUpperCase())
            )

            if (missingFromDb.length > 0) {
              console.log(
                `[EquipmentsQuery] Syncing ${missingFromDb.length} local custom asset(s) to central database...`
              )
              // Sync missing items to database in parallel
              await Promise.all(
                missingFromDb.map((item) =>
                  fetch("/api/equipments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(item),
                  }).catch((err) => console.warn("Could not sync local asset to DB:", err))
                )
              )

              // Prepend local custom items at the top
              fetchedList = [...missingFromDb, ...fetchedList]
            }
          }
        } catch (e) {
          console.warn("Could not check local custom assets:", e)
        }
      }

      globalEquipmentsCache = fetchedList
      globalTotal = fetchedList.length
      globalIsError = false
      globalError = null
      globalLastUpdated = Date.now()

      return fetchedList
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch equipments"
      globalIsError = true
      globalError = message
      console.warn("[EquipmentsQuery] Fetch error, using cached fallback:", message)

      if (typeof window !== "undefined") {
        try {
          const localCustom = getCustomAssets()
          if (localCustom.length > 0) {
            const merged = [
              ...localCustom,
              ...globalEquipmentsCache.filter(
                (g) => !localCustom.some((c) => c.serial.toUpperCase() === g.serial.toUpperCase())
              ),
            ]
            globalEquipmentsCache = merged
            globalTotal = merged.length
          }
        } catch {}
      }

      return globalEquipmentsCache
    } finally {
      globalIsLoading = false
      activeFetchPromise = null
      broadcastCacheUpdate()
    }
  })()

  activeFetchPromise = currentPromise
  return currentPromise
}

/**
 * Invalidate the ['equipments'] cache and refetch fresh records across all forms and dropdowns
 */
export async function invalidateEquipmentsCache(): Promise<Asset[]> {
  globalLastUpdated = 0
  return fetchEquipmentsFromApi(true)
}

/**
 * Manually update the cache with an equipment mutation (optimistic or real-time event)
 */
export function applyEquipmentMutation(action: "create" | "update" | "delete", data: Partial<Asset> & { serial: string }) {
  if (!data || !data.serial) return

  const targetSerial = data.serial.toUpperCase()

  if (action === "create") {
    // Filter out duplicate if present and prepend strictly at top (index 0)
    const filtered = globalEquipmentsCache.filter((item) => item.serial.toUpperCase() !== targetSerial)
    globalEquipmentsCache = [data as Asset, ...filtered]
  } else if (action === "update") {
    globalEquipmentsCache = globalEquipmentsCache.map((item) =>
      item.serial.toUpperCase() === targetSerial ? { ...item, ...data } : item
    )
  } else if (action === "delete") {
    globalEquipmentsCache = globalEquipmentsCache.filter((item) => item.serial.toUpperCase() !== targetSerial)
  }

  globalTotal = globalEquipmentsCache.length
  globalLastUpdated = Date.now()
  broadcastCacheUpdate()
}

/**
 * Unified Query Hook for Equipment Information Registry & New Claim Case Form
 * - Shared cache key: ['equipments']
 * - Single source of truth from database
 * - Bidirectional real-time consistency
 */
export function useEquipmentsQuery() {
  const [, setVersion] = React.useState(0)

  React.useEffect(() => {
    // Subscribe component to central cache updates
    const onCacheUpdate = () => {
      setVersion((v) => v + 1)
    }
    subscribers.add(onCacheUpdate)

    // Initial fetch if cache is empty or never fetched
    if (globalLastUpdated === 0) {
      fetchEquipmentsFromApi()
    }

    // Real-time synchronization event listener
    const handleRealtimeEquipment = (e: Event) => {
      try {
        const customEvent = e as CustomEvent<{ action?: "create" | "update" | "delete"; data?: Asset }>
        const payload = customEvent.detail
        if (payload && payload.action && payload.data) {
          applyEquipmentMutation(payload.action, payload.data)
        }
      } catch (err) {
        console.warn("Failed to handle realtime equipment event in query hook:", err)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:equipment", handleRealtimeEquipment)
    }

    return () => {
      subscribers.delete(onCacheUpdate)
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:equipment", handleRealtimeEquipment)
      }
    }
  }, [])

  // Create mutation
  const createEquipment = React.useCallback(async (asset: Asset): Promise<{ success: boolean; error?: string; equipment?: Asset }> => {
    try {
      const res = await fetch("/api/equipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asset),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create equipment")
      }

      const createdItem: Asset = data.equipment || asset

      // Save to localStorage backup store so it survives offline/reload immediately
      saveCustomAsset(createdItem)

      // Optimistically place at the very top (index 0)
      applyEquipmentMutation("create", createdItem)

      // Trigger cache invalidation and wait for server confirmation
      await invalidateEquipmentsCache()

      return { success: true, equipment: createdItem }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create equipment"
      return { success: false, error: message }
    }
  }, [])

  // Update mutation
  const updateEquipment = React.useCallback(async (asset: Asset): Promise<{ success: boolean; error?: string; equipment?: Asset }> => {
    try {
      const res = await fetch("/api/equipments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asset),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update equipment")
      }

      const updatedItem: Asset = { ...asset }
      saveCustomAsset(updatedItem)

      applyEquipmentMutation("update", updatedItem)
      await invalidateEquipmentsCache()

      return { success: true, equipment: updatedItem }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update equipment"
      return { success: false, error: message }
    }
  }, [])

  // Delete mutation
  const deleteEquipment = React.useCallback(async (serial: string): Promise<{ success: boolean; error?: string }> => {
    try {
      removeCustomAsset(serial)
      const res = await fetch(`/api/equipments?serial=${encodeURIComponent(serial)}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete equipment")
      }

      applyEquipmentMutation("delete", { serial })
      await invalidateEquipmentsCache()

      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete equipment"
      return { success: false, error: message }
    }
  }, [])

  return {
    queryKey: EQUIPMENTS_QUERY_KEY,
    equipments: globalEquipmentsCache,
    data: globalEquipmentsCache,
    total: globalTotal,
    isLoading: globalIsLoading,
    isError: globalIsError,
    error: globalError,
    refetch: invalidateEquipmentsCache,
    invalidate: invalidateEquipmentsCache,
    createEquipment,
    updateEquipment,
    deleteEquipment,
  }
}
