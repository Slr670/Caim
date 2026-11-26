import type { ProjectDocument } from "@/types/database"

export const DEFAULT_PROJECT_ID = "proj-uso-shf-2"
export const DEFAULT_PROJECT_NAME = "USO-SHF 2 (25310-9999)"

export const SETTINGS_PASSCODE_HEADER = "x-settings-passcode"
export const DEFAULT_SETTINGS_PASSCODE = "258025"

export const DEFAULT_PROJECT_SEED: ProjectDocument = {
  id: DEFAULT_PROJECT_ID,
  name: DEFAULT_PROJECT_NAME,
  isDefault: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

/**
 * Resolves the canonical projectId for any record, falling back to DEFAULT_PROJECT_ID.
 */
export function resolveEntityProjectId(record?: {
  projectId?: string | null
  projectName?: string | null
} | null): string {
  const id = record?.projectId?.trim()
  if (id) return id
  return DEFAULT_PROJECT_ID
}

/**
 * Resolves the canonical projectName for any record, falling back to DEFAULT_PROJECT_NAME.
 */
export function resolveEntityProjectName(record?: {
  projectId?: string | null
  projectName?: string | null
} | null): string {
  const name = record?.projectName?.trim()
  if (name) return name
  return DEFAULT_PROJECT_NAME
}

/**
 * Checks whether an entity record matches a selected project filter ("all", projectId, or projectName).
 */
export function matchesProjectFilter(
  record: { projectId?: string | null; projectName?: string | null } | null | undefined,
  selectedProject: string
): boolean {
  if (!selectedProject || selectedProject === "all") return true
  const resolvedId = resolveEntityProjectId(record)
  const resolvedName = resolveEntityProjectName(record)
  return (
    resolvedId === selectedProject ||
    resolvedName === selectedProject ||
    resolvedName.toLowerCase() === selectedProject.toLowerCase()
  )
}
