"use client"

import * as React from "react"
import type { ProjectDocument, ProjectWithUsage } from "@/types/database"
import {
  DEFAULT_PROJECT_ID,
  DEFAULT_PROJECT_SEED,
  SETTINGS_PASSCODE_HEADER,
} from "@/lib/projects/projectConstants"
import { invalidateTicketsCache } from "@/hooks/useTicketsQuery"
import { invalidateRmaCache } from "@/hooks/useRmaQuery"
import { invalidateEquipmentsCache } from "@/hooks/useEquipmentsQuery"
import { invalidateStationsCache } from "@/hooks/useStationsQuery"

export const PROJECTS_QUERY_KEY = ["projects"] as const

let globalProjectsCache: ProjectWithUsage[] = [{ ...DEFAULT_PROJECT_SEED }]
let globalIsLoading = false
let globalLastUpdated = 0
let globalUsageLastUpdated = 0
let activeFetchPromise: Promise<ProjectWithUsage[]> | null = null
let activeUsageFetchPromise: Promise<ProjectWithUsage[]> | null = null
let hasEverFetched = false
let hasUsageData = false

const subscribers = new Set<() => void>()

function broadcastProjectsUpdate() {
  subscribers.forEach((cb) => {
    try {
      cb()
    } catch (err) {
      console.error("[useProjectsQuery] subscriber error:", err)
    }
  })
}

export async function fetchProjectsFromApi(
  options: { force?: boolean; includeUsage?: boolean } = {}
): Promise<ProjectWithUsage[]> {
  const { force = false, includeUsage = false } = options
  const now = Date.now()

  if (includeUsage) {
    if (
      !force &&
      hasUsageData &&
      globalUsageLastUpdated > 0 &&
      now - globalUsageLastUpdated < 15_000
    ) {
      return globalProjectsCache
    }
    if (activeUsageFetchPromise) {
      return activeUsageFetchPromise
    }
  } else {
    if (
      !force &&
      hasEverFetched &&
      globalLastUpdated > 0 &&
      now - globalLastUpdated < 180_000
    ) {
      return globalProjectsCache
    }
    if (activeFetchPromise) {
      return activeFetchPromise
    }
    if (activeUsageFetchPromise) {
      return activeUsageFetchPromise
    }
  }

  globalIsLoading = true
  broadcastProjectsUpdate()

  const promise = (async () => {
    try {
      const url = includeUsage ? "/api/projects?includeUsage=true" : "/api/projects"
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      if (data?.success && Array.isArray(data.projects) && data.projects.length > 0) {
        const fetchedAt = Date.now()
        globalProjectsCache = data.projects
        globalLastUpdated = fetchedAt
        hasEverFetched = true
        if (includeUsage) {
          globalUsageLastUpdated = fetchedAt
          hasUsageData = true
        }
      }
      return globalProjectsCache
    } catch (err) {
      console.warn("[useProjectsQuery] fetch fallback:", err)
      return globalProjectsCache
    } finally {
      if (includeUsage) {
        activeUsageFetchPromise = null
      } else {
        activeFetchPromise = null
      }
      globalIsLoading = Boolean(activeFetchPromise || activeUsageFetchPromise)
      broadcastProjectsUpdate()
    }
  })()

  if (includeUsage) {
    activeUsageFetchPromise = promise
  } else {
    activeFetchPromise = promise
  }

  return promise
}

export async function invalidateProjectsCache(includeUsage = false): Promise<ProjectWithUsage[]> {
  globalLastUpdated = 0
  if (includeUsage) {
    globalUsageLastUpdated = 0
  }
  return fetchProjectsFromApi({ force: true, includeUsage })
}

export function useProjectsQuery(options: { includeUsage?: boolean } = {}) {
  const { includeUsage = false } = options
  const [, setVersion] = React.useState(0)

  React.useEffect(() => {
    const onUpdate = () => setVersion((v) => v + 1)
    subscribers.add(onUpdate)

    if (includeUsage) {
      void fetchProjectsFromApi({ force: true, includeUsage: true })
    } else if (!hasEverFetched) {
      void fetchProjectsFromApi({ force: false, includeUsage: false })
    }

    const handleRealtimeProject = () => {
      // Skip redundant network refetch if a local mutation just hydrated the cache within 2 seconds
      if (Date.now() - globalLastUpdated < 2_000) return
      invalidateProjectsCache(includeUsage).catch(() => {})
    }

    if (typeof window !== "undefined") {
      window.addEventListener("caim:realtime:project", handleRealtimeProject)
    }

    return () => {
      subscribers.delete(onUpdate)
      if (typeof window !== "undefined") {
        window.removeEventListener("caim:realtime:project", handleRealtimeProject)
      }
    }
  }, [includeUsage])

  const defaultProject: ProjectDocument = React.useMemo(() => {
    return (
      globalProjectsCache.find((p) => p.isDefault) ||
      globalProjectsCache.find((p) => p.id === DEFAULT_PROJECT_ID) ||
      DEFAULT_PROJECT_SEED
    )
  }, [globalProjectsCache.length, globalLastUpdated]) // eslint-disable-line react-hooks/exhaustive-deps

  const resolveProjectByIdOrName = React.useCallback(
    (projectId?: string | null, projectName?: string | null): ProjectDocument => {
      if (projectId) {
        const byId = globalProjectsCache.find((p) => p.id === projectId)
        if (byId) return byId
      }
      if (projectName) {
        const byName = globalProjectsCache.find(
          (p) => p.name.toLowerCase() === projectName.trim().toLowerCase()
        )
        if (byName) return byName
      }
      return defaultProject
    },
    [defaultProject]
  )

  const createProject = React.useCallback(
    async (
      name: string,
      passcode: string,
      isDefault = false
    ): Promise<{ success: boolean; project?: ProjectDocument; message?: string; error?: string }> => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            [SETTINGS_PASSCODE_HEADER]: passcode,
          },
          body: JSON.stringify({ name, isDefault, passcode }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "ไม่สามารถเพิ่มโครงการได้" }
        }
        if (Array.isArray(data.projects)) {
          const updatedAt = Date.now()
          globalProjectsCache = data.projects
          globalLastUpdated = updatedAt
          globalUsageLastUpdated = updatedAt
          hasEverFetched = true
          hasUsageData = true
          broadcastProjectsUpdate()
        } else {
          await invalidateProjectsCache(true)
        }
        return {
          success: true,
          project: data.project,
          message: data.message,
        }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        }
      }
    },
    []
  )

  const updateProject = React.useCallback(
    async (
      payload: { id: string; name?: string; isDefault?: boolean },
      passcode: string
    ): Promise<{ success: boolean; project?: ProjectDocument; message?: string; error?: string }> => {
      try {
        const res = await fetch("/api/projects", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            [SETTINGS_PASSCODE_HEADER]: passcode,
          },
          body: JSON.stringify({ ...payload, passcode }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "ไม่สามารถแก้ไขโครงการได้" }
        }
        if (Array.isArray(data.projects)) {
          const updatedAt = Date.now()
          globalProjectsCache = data.projects
          globalLastUpdated = updatedAt
          globalUsageLastUpdated = updatedAt
          hasEverFetched = true
          hasUsageData = true
          broadcastProjectsUpdate()
        } else {
          await invalidateProjectsCache(true)
        }
        // If renamed, refresh entity caches so renamed project badges update immediately
        if (payload.name !== undefined) {
          Promise.all([
            invalidateTicketsCache(),
            invalidateRmaCache(),
            invalidateEquipmentsCache(),
            invalidateStationsCache(),
          ]).catch(() => {})
        }
        return {
          success: true,
          project: data.project,
          message: data.message,
        }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        }
      }
    },
    []
  )

  const deleteProject = React.useCallback(
    async (
      id: string,
      passcode: string
    ): Promise<{ success: boolean; message?: string; error?: string }> => {
      try {
        const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            [SETTINGS_PASSCODE_HEADER]: passcode,
          },
          body: JSON.stringify({ id, passcode }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "ไม่สามารถลบโครงการได้" }
        }
        if (Array.isArray(data.projects)) {
          const updatedAt = Date.now()
          globalProjectsCache = data.projects
          globalLastUpdated = updatedAt
          globalUsageLastUpdated = updatedAt
          hasEverFetched = true
          hasUsageData = true
          broadcastProjectsUpdate()
        } else {
          await invalidateProjectsCache(true)
        }
        return { success: true, message: data.message }
      } catch (err: unknown) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์",
        }
      }
    },
    []
  )

  const refetch = React.useCallback(
    () => invalidateProjectsCache(includeUsage),
    [includeUsage]
  )

  return {
    projects: globalProjectsCache,
    defaultProject,
    isLoading: globalIsLoading,
    refetch,
    resolveProjectByIdOrName,
    createProject,
    updateProject,
    deleteProject,
  }
}
