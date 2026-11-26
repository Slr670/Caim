import { NextRequest, NextResponse } from "next/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/httpHeaders"
import {
  DEFAULT_SETTINGS_PASSCODE,
  SETTINGS_PASSCODE_HEADER,
} from "@/lib/projects/projectConstants"
import {
  listMasterProjects,
  listMasterProjectsWithUsage,
  createMasterProject,
  updateMasterProject,
  deleteMasterProject,
} from "@/lib/projects/projectService"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"

function verifySettingsPasscode(
  request: NextRequest,
  bodyPasscode?: unknown
): boolean {
  const expectedPasscode =
    (process.env.SETTINGS_PASSCODE || "").trim() || DEFAULT_SETTINGS_PASSCODE

  const headerPasscode = request.headers.get(SETTINGS_PASSCODE_HEADER)?.trim()
  const queryPasscode = new URL(request.url).searchParams.get("passcode")?.trim()
  const payloadPasscode =
    typeof bodyPasscode === "string" ? bodyPasscode.trim() : undefined

  const provided = headerPasscode || payloadPasscode || queryPasscode
  return Boolean(provided && provided === expectedPasscode)
}

function forbiddenPasscodeResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        "ไม่อนุญาตให้แก้ไขข้อมูลโครงการ กรุณายืนยันรหัสผ่านตั้งค่าระบบ (System Settings Passcode)",
    },
    { status: 403, headers: NO_CACHE_HEADERS }
  )
}

/**
 * GET /api/projects
 * Public endpoint for populating project dropdowns and table filters across the application.
 * Pass `?includeUsage=true` to include active record reference counts for System Settings.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeUsage = searchParams.get("includeUsage") === "true"

    if (includeUsage) {
      const projects = await listMasterProjectsWithUsage()
      return NextResponse.json(
        {
          success: true,
          projects,
          total: projects.length,
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    const projects = await listMasterProjects()
    return NextResponse.json(
      {
        success: true,
        projects,
        total: projects.length,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load projects"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * POST /api/projects
 * Passcode-protected endpoint for creating a new master project inside System Settings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (!verifySettingsPasscode(request, body.passcode)) {
      return forbiddenPasscodeResponse()
    }

    const name = typeof body.name === "string" ? body.name : ""
    const isDefault = Boolean(body.isDefault)

    const result = await createMasterProject({ name, isDefault })
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400, headers: NO_CACHE_HEADERS }
      )
    }

    const projects = await listMasterProjectsWithUsage()
    return NextResponse.json(
      {
        success: true,
        project: result.project,
        projects,
        message: `เพิ่มโครงการ "${result.project?.name}" เรียบร้อยแล้ว`,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create project"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * PATCH /api/projects
 * Passcode-protected endpoint for renaming or setting default master project inside System Settings.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    if (!verifySettingsPasscode(request, body.passcode)) {
      return forbiddenPasscodeResponse()
    }

    const id = typeof body.id === "string" ? body.id : ""
    const name = typeof body.name === "string" ? body.name : undefined
    const isDefault =
      typeof body.isDefault === "boolean" ? body.isDefault : undefined

    const result = await updateMasterProject({ id, name, isDefault })
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 400, headers: NO_CACHE_HEADERS }
      )
    }

    const projects = await listMasterProjectsWithUsage()
    return NextResponse.json(
      {
        success: true,
        project: result.project,
        projects,
        message: `อัปเดตโครงการ "${result.project?.name}" เรียบร้อยแล้ว`,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update project"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export const PUT = PATCH

/**
 * DELETE /api/projects
 * Passcode-protected endpoint for deleting an unreferenced master project inside System Settings.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

    if (!verifySettingsPasscode(request, body.passcode)) {
      return forbiddenPasscodeResponse()
    }

    const id =
      searchParams.get("id") ||
      (typeof body.id === "string" ? body.id : "")

    const result = await deleteMasterProject(id)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, usage: result.usage },
        { status: result.status || 400, headers: NO_CACHE_HEADERS }
      )
    }

    const projects = await listMasterProjectsWithUsage()
    return NextResponse.json(
      {
        success: true,
        id,
        projects,
        message: "ลบโครงการเรียบร้อยแล้ว",
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete project"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
