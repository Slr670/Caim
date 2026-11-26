"use client"

import * as React from "react"
import {
  X,
  Settings,
  Mail,
  Sliders,
  Eye,
  EyeOff,
  Send,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Server,
  ShieldCheck,
  RotateCcw,
  BellRing,
  Lock,
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  Star,
} from "lucide-react"
import { type SmtpSettings, DEFAULT_SMTP_SETTINGS } from "@/types/settings"
import {
  triggerPwaInstallPrompt,
  subscribeBrowserToWebPush,
} from "@/components/pwa/PwaManager"
import {
  ensureActivePushSubscription,
  isStandalonePwaMode,
} from "@/components/pwa/PwaPushAutoSubscriber"
import { useProjectsQuery } from "@/hooks/useProjectsQuery"
import { DEFAULT_SETTINGS_PASSCODE } from "@/lib/projects/projectConstants"

export interface SystemSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  passcode?: string
}

const STORAGE_KEY = "caim_smtp_settings"

export function SystemSettingsModal({
  isOpen,
  onClose,
  passcode,
}: SystemSettingsModalProps) {
  const [activeTab, setActiveTab] = React.useState<"projects" | "smtp" | "general">("projects")
  const effectivePasscode = passcode || DEFAULT_SETTINGS_PASSCODE

  // Master Projects CRUD states (Passcode-protected)
  const {
    projects,
    isLoading: isLoadingProjects,
    createProject,
    updateProject,
    deleteProject,
  } = useProjectsQuery({ includeUsage: isOpen })
  const [newProjectName, setNewProjectName] = React.useState("")
  const [isCreatingProject, setIsCreatingProject] = React.useState(false)
  const [editingProjectId, setEditingProjectId] = React.useState<string | null>(null)
  const [editingProjectName, setEditingProjectName] = React.useState("")
  const [projectActionId, setProjectActionId] = React.useState<string | null>(null)
  const [projectFeedback, setProjectFeedback] = React.useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [smtpSettings, setSmtpSettings] = React.useState<SmtpSettings>(DEFAULT_SMTP_SETTINGS)
  const [showPassword, setShowPassword] = React.useState(false)

  // Test email state
  const [testRecipient, setTestRecipient] = React.useState(DEFAULT_SMTP_SETTINGS.targetRecipient)
  const [isTestingEmail, setIsTestingEmail] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  // Save state
  const [isSaved, setIsSaved] = React.useState(false)

  // PWA 2.0.0 Web Push subscription state (Enforced Always-On)
  const [pushEnabled, setPushEnabled] = React.useState(false)
  const [isStandaloneApp, setIsStandaloneApp] = React.useState(false)
  const [pushPermission, setPushPermission] =
    React.useState<NotificationPermission | "unsupported">("default")
  const [isTogglingPush, setIsTogglingPush] = React.useState(false)
  const [isTestingPush, setIsTestingPush] = React.useState(false)

  // Toast feedback
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  // Load saved settings from localStorage and inspect Push status only while the modal is open
  React.useEffect(() => {
    if (!isOpen || typeof window === "undefined") return

    setProjectFeedback(null)

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSmtpSettings((prev) => ({ ...prev, ...parsed }))
        if (parsed.targetRecipient) {
          setTestRecipient(parsed.targetRecipient)
        }
      }
    } catch (err) {
      console.warn("Failed to load settings from localStorage:", err)
    }

    setIsStandaloneApp(isStandalonePwaMode())

    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPermission("unsupported")
      return
    }

    const currentPerm = Notification.permission
    setPushPermission(currentPerm)

    let cancelled = false
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager?.getSubscription())
      .then((sub) => {
        if (cancelled) return
        if (sub) {
          setPushEnabled(true)
          return
        }
        if (currentPerm === "granted") {
          // Session-guarded singleton lock ensures at most one POST /api/push/subscribe per session
          return ensureActivePushSubscription({
            requestPermissionIfNeeded: false,
            sendWelcome: false,
          }).then((res) => {
            if (!cancelled && res.success) {
              setPushEnabled(true)
            }
          })
        }
        setPushEnabled(false)
      })
      .catch(() => null)

    const handlePushChanged = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as
        | { subscribed?: boolean; permission?: NotificationPermission }
        | undefined
      if (typeof detail?.subscribed === "boolean") {
        setPushEnabled(detail.subscribed)
      }
      if (detail?.permission) {
        setPushPermission(detail.permission)
      }
    }

    window.addEventListener("caim:pwa:push-changed", handlePushChanged)
    return () => {
      cancelled = true
      window.removeEventListener("caim:pwa:push-changed", handlePushChanged)
    }
  }, [isOpen])

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newProjectName.trim()
    if (!trimmed) {
      setProjectFeedback({ type: "error", message: "กรุณาระบุชื่อและรหัสโครงการก่อนกดเพิ่ม" })
      return
    }
    setIsCreatingProject(true)
    setProjectFeedback(null)
    try {
      const res = await createProject(trimmed, effectivePasscode)
      if (res.success) {
        setNewProjectName("")
        const msg = res.message || `เพิ่มโครงการ "${trimmed}" เรียบร้อยแล้ว`
        setProjectFeedback({ type: "success", message: msg })
        showToast(msg)
      } else {
        setProjectFeedback({
          type: "error",
          message: res.error || "ไม่สามารถเพิ่มโครงการได้",
        })
      }
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleSaveRenameProject = async (id: string) => {
    const trimmed = editingProjectName.trim()
    if (!trimmed) {
      setProjectFeedback({ type: "error", message: "ชื่อโครงการต้องไม่เว้นว่าง" })
      return
    }
    setProjectActionId(id)
    setProjectFeedback(null)
    try {
      const res = await updateProject({ id, name: trimmed }, effectivePasscode)
      if (res.success) {
        setEditingProjectId(null)
        setEditingProjectName("")
        const msg = res.message || `เปลี่ยนชื่อโครงการเป็น "${trimmed}" เรียบร้อยแล้ว`
        setProjectFeedback({ type: "success", message: msg })
        showToast(msg)
      } else {
        setProjectFeedback({
          type: "error",
          message: res.error || "ไม่สามารถแก้ไขชื่อโครงการได้",
        })
      }
    } finally {
      setProjectActionId(null)
    }
  }

  const handleSetDefaultProject = async (id: string, name: string) => {
    setProjectActionId(id)
    setProjectFeedback(null)
    try {
      const res = await updateProject({ id, isDefault: true }, effectivePasscode)
      if (res.success) {
        const msg = `ตั้งค่า "${name}" เป็นโครงการเริ่มต้นของระบบเรียบร้อยแล้ว`
        setProjectFeedback({ type: "success", message: msg })
        showToast(msg)
      } else {
        setProjectFeedback({
          type: "error",
          message: res.error || "ไม่สามารถตั้งเป็นโครงการเริ่มต้นได้",
        })
      }
    } finally {
      setProjectActionId(null)
    }
  }

  const handleDeleteProject = async (id: string, name: string) => {
    setProjectActionId(id)
    setProjectFeedback(null)
    try {
      const res = await deleteProject(id, effectivePasscode)
      if (res.success) {
        const msg = `ลบโครงการ "${name}" ออกจากระบบเรียบร้อยแล้ว`
        setProjectFeedback({ type: "success", message: msg })
        showToast(msg)
      } else {
        setProjectFeedback({
          type: "error",
          message: res.error || "ไม่สามารถลบโครงการได้",
        })
      }
    } finally {
      setProjectActionId(null)
    }
  }

  const handleEnablePushPermission = async () => {
    if (pushEnabled) {
      showToast("ระบบบังคับเปิดการแจ้งเตือนอัตโนมัติ (Always On) อยู่แล้ว")
      return
    }
    setIsTogglingPush(true)
    try {
      const res = await subscribeBrowserToWebPush(true)
      if ("Notification" in window) {
        setPushPermission(Notification.permission)
      }
      if (res.success) {
        setPushEnabled(true)
        showToast("เปิดรับการแจ้งเตือนผ่านแอป (Always On) เรียบร้อยแล้ว")
      } else {
        showToast(res.error || "ไม่สามารถเปิดรับการแจ้งเตือน Push ได้")
      }
    } finally {
      setIsTogglingPush(false)
    }
  }

  const handleSendTestPush = async () => {
    setIsTestingPush(true)
    try {
      let currentSubJson: PushSubscriptionJSON | undefined
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          const subRes = await subscribeBrowserToWebPush(false)
          if (subRes.success) {
            setPushEnabled(true)
            sub = await reg.pushManager.getSubscription()
          }
        }
        if (sub) {
          currentSubJson = sub.toJSON()
        }
      }

      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: currentSubJson }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.message || "ส่งการแจ้งเตือนทดสอบ (PWA 2.0.0 Push) สำเร็จแล้ว")
      } else {
        showToast(data.message || data.error || "ไม่สามารถส่ง Push ทดสอบได้")
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast(`เกิดข้อผิดพลาดในการส่ง Push: ${msg}`)
    } finally {
      setIsTestingPush(false)
    }
  }

  // Auto-switch port & SSL when toggling
  const handlePortChange = (newPort: number) => {
    setSmtpSettings((prev) => ({
      ...prev,
      port: newPort,
      secure: newPort === 465,
      enforceSsl: newPort === 465,
    }))
  }

  const handleSaveSettings = () => {
    try {
      const updated = {
        ...smtpSettings,
        targetRecipient: testRecipient,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setIsSaved(true)
      showToast("บันทึกการตั้งค่า SMTP เรียบร้อยแล้ว")
      setTimeout(() => setIsSaved(false), 2500)
    } catch (err) {
      console.error("Failed to save settings:", err)
      showToast("เกิดข้อผิดพลาดในการบันทึกการตั้งค่า")
    }
  }

  const handleResetDefaults = () => {
    setSmtpSettings(DEFAULT_SMTP_SETTINGS)
    setTestRecipient(DEFAULT_SMTP_SETTINGS.targetRecipient)
    localStorage.removeItem(STORAGE_KEY)
    showToast("คืนค่าเริ่มต้นเรียบร้อยแล้ว")
  }

  const handleSendTestEmail = async () => {
    if (!testRecipient) {
      showToast("กรุณาระบุอีเมลปลายทางสำหรับทดสอบ")
      return
    }

    setIsTestingEmail(true)
    setTestResult(null)

    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...smtpSettings,
          targetRecipient: testRecipient,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setTestResult({
          success: true,
          message: data.message || "ส่งอีเมลทดสอบสำเร็จเรียบร้อย",
        })
        showToast("ส่งอีเมลทดสอบสำเร็จเรียบร้อย")
      } else {
        setTestResult({
          success: false,
          message: data.error || "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ SMTP ได้",
          details: data.details,
        })
        showToast(data.error || "การเชื่อมต่อ SMTP ล้มเหลว")
      }
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : String(err)
      setTestResult({
        success: false,
        message: "เกิดข้อผิดพลาดในการติดต่อ API ส่งเมล",
        details: errorStr,
      })
      showToast("เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์")
    } finally {
      setIsTestingEmail(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-700/60 bg-[#1e293b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-8 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-indigo-600 shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 sm:px-6 py-4 bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-sky-400 shadow-inner">
              <Settings className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                การตั้งค่าระบบ & จัดการโครงการ (System Settings)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดการข้อมูลโครงการหลัก การแจ้งเตือน และเซิร์ฟเวอร์ SMTP
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center overflow-x-auto border-b border-white/10 bg-slate-900/60 px-5 sm:px-6 shrink-0 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "projects"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FolderKanban className="size-3.5" />
            <span>จัดการโครงการ (Project Management)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("smtp")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "smtp"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="size-3.5" />
            <span>การแจ้งเตือน / SMTP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "general"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sliders className="size-3.5" />
            <span>การตั้งค่าทั่วไป (General)</span>
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {activeTab === "projects" ? (
            <div className="space-y-5">
              {/* Header & Security Notice */}
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 rounded-xl border border-sky-500/30 bg-sky-950/25">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300">
                    <FolderKanban className="size-4.5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-white">
                        จัดการโครงการ (Master Project Management)
                      </h4>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                        <Lock className="size-2.5 text-emerald-400" />
                        <span>Passcode Verified</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      กำหนดรายชื่อโครงการกลางสำหรับจัดหมวดหมู่งานเคลม, ใบส่งซ่อมต่างประเทศ (RMA), ทะเบียนอุปกรณ์ และสถานีติดตั้ง เมื่อเพิ่มหรือแก้ไขแล้วจะซิงก์ไปยังตัวเลือกในทุกฟอร์มและตารางทันที
                    </p>
                  </div>
                </div>
              </div>

              {/* Add New Project Form */}
              <form
                onSubmit={handleAddProject}
                className="p-4 rounded-xl border border-white/10 bg-slate-900/70 space-y-3"
              >
                <label className="block text-xs font-semibold text-white">
                  เพิ่มโครงการใหม่เข้าสู่ระบบ (Add New Project)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => {
                      setNewProjectName(e.target.value)
                      if (projectFeedback) setProjectFeedback(null)
                    }}
                    placeholder="ระบุชื่อและรหัสโครงการ เช่น USO-SHF 3 (25310-8888)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                  <button
                    type="submit"
                    disabled={isCreatingProject}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    {isCreatingProject ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    <span>{isCreatingProject ? "กำลังเพิ่ม..." : "เพิ่มโครงการ"}</span>
                  </button>
                </div>
              </form>

              {/* Inline Feedback Alert */}
              {projectFeedback && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl border text-xs animate-in fade-in ${
                    projectFeedback.type === "success"
                      ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
                      : "bg-rose-950/40 border-rose-700/60 text-rose-300"
                  }`}
                >
                  {projectFeedback.type === "success" ? (
                    <Check className="size-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 text-rose-400 shrink-0" />
                  )}
                  <span>{projectFeedback.message}</span>
                </div>
              )}

              {/* Existing Projects Table / List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    รายการโครงการทั้งหมดในระบบ ({projects.length} โครงการ)
                  </span>
                  {isLoadingProjects && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-sky-400">
                      <Loader2 className="size-3 animate-spin" />
                      <span>กำลังซิงก์ข้อมูล...</span>
                    </span>
                  )}
                </div>

                <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-900/60 overflow-hidden">
                  {projects.map((proj) => {
                    const isEditing = editingProjectId === proj.id
                    const isBusy = projectActionId === proj.id
                    const usage = proj.usage
                    const totalRefs = usage?.totalReferences ?? 0
                    const cannotDelete = proj.isDefault || totalRefs > 0

                    return (
                      <div
                        key={proj.id}
                        className="p-3.5 sm:p-4 flex flex-col gap-2.5 hover:bg-slate-800/40 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  type="text"
                                  value={editingProjectName}
                                  onChange={(e) => setEditingProjectName(e.target.value)}
                                  className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-sky-500 bg-slate-950 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSaveRenameProject(proj.id)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white cursor-pointer disabled:opacity-50"
                                >
                                  {isBusy ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Check className="size-3" />
                                  )}
                                  <span>บันทึก</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setEditingProjectId(null)
                                    setEditingProjectName("")
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 cursor-pointer"
                                >
                                  <span>ยกเลิก</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-sm text-white">
                                  {proj.name}
                                </span>
                                {proj.isDefault && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                    <Star className="size-2.5 fill-emerald-400 text-emerald-400" />
                                    <span>ค่าเริ่มต้น (Default)</span>
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Active Reference Breakdown */}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                              <span className="rounded bg-slate-800/90 border border-white/5 px-2 py-0.5">
                                งานเคลม:{" "}
                                <strong className="text-slate-200 tabular-nums">
                                  {usage?.claimsCount ?? 0}
                                </strong>
                              </span>
                              <span className="rounded bg-slate-800/90 border border-white/5 px-2 py-0.5">
                                ส่งซ่อม RMA:{" "}
                                <strong className="text-slate-200 tabular-nums">
                                  {usage?.rmaCount ?? 0}
                                </strong>
                              </span>
                              <span className="rounded bg-slate-800/90 border border-white/5 px-2 py-0.5">
                                อุปกรณ์:{" "}
                                <strong className="text-slate-200 tabular-nums">
                                  {usage?.equipmentsCount ?? 0}
                                </strong>
                              </span>
                              <span className="rounded bg-slate-800/90 border border-white/5 px-2 py-0.5">
                                สถานี:{" "}
                                <strong className="text-slate-200 tabular-nums">
                                  {usage?.stationsCount ?? 0}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Row Actions */}
                          {!isEditing && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!proj.isDefault && (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleSetDefaultProject(proj.id, proj.name)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                                  title="ตั้งเป็นโครงการเริ่มต้นของระบบ"
                                >
                                  <Star className="size-3 text-amber-400" />
                                  <span>ตั้งเป็นค่าเริ่มต้น</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setEditingProjectId(proj.id)
                                  setEditingProjectName(proj.name)
                                  setProjectFeedback(null)
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1.5 text-[11px] font-medium text-sky-300 transition-colors cursor-pointer disabled:opacity-50"
                                title="แก้ไขชื่อโครงการ (ซิงก์อัปเดตทุกรายการที่ผูกอยู่ทันที)"
                              >
                                <Pencil className="size-3" />
                                <span>แก้ไข</span>
                              </button>

                              <button
                                type="button"
                                disabled={isBusy || cannotDelete}
                                onClick={() => handleDeleteProject(proj.id, proj.name)}
                                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                                  cannotDelete
                                    ? "border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed"
                                    : "border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 cursor-pointer"
                                }`}
                                title={
                                  proj.isDefault
                                    ? "ไม่สามารถลบโครงการที่เป็นค่าเริ่มต้นได้"
                                    : totalRefs > 0
                                    ? `ไม่สามารถลบได้ เนื่องจากมีข้อมูลอ้างอิงอยู่ ${totalRefs.toLocaleString()} รายการ`
                                    : "ลบโครงการนี้"
                                }
                              >
                                {isBusy ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Trash2 className="size-3" />
                                )}
                                <span>ลบ</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <p className="text-[11px] text-slate-400">
                  * ระบบป้องกันการลบโครงการที่เป็นค่าเริ่มต้น หรือโครงการที่ยังมีรายการงานเคลม / RMA / อุปกรณ์ / สถานีอ้างอิงอยู่ เพื่อรักษาความสมบูรณ์ของฐานข้อมูล
                </p>
              </div>
            </div>
          ) : activeTab === "smtp" ? (
            <>
              {/* Section: การแจ้งเตือนผ่านแอป (PWA 2.0.0 Push Notifications — Mandatory Always-On) */}
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-400/30 text-sky-300">
                      <BellRing className="size-4" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          การแจ้งเตือนผ่านแอป (PWA 2.0.0 Push Notifications)
                        </span>
                        {isStandaloneApp && (
                          <span className="rounded-full bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                            Installed App
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        ส่ง Web Push แจ้งเตือนคู่ขนานกับอีเมลอัตโนมัติทันทีเมื่อเปิดเคสใหม่หรืออัปเดตสถานะงานเคลม
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                      <Lock className="size-3 text-emerald-400" />
                      <span>บังคับเปิดอัตโนมัติ (Always On)</span>
                    </span>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={true}
                      aria-readonly="true"
                      disabled={pushEnabled || isTogglingPush}
                      onClick={handleEnablePushPermission}
                      title="ระบบบังคับเปิดการแจ้งเตือนอัตโนมัติ (Always On) เพื่อป้องกันการพลาดแจ้งเตือนงานเคลมสำคัญ"
                      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border bg-emerald-500 border-emerald-400 transition-colors disabled:opacity-90 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="inline-block size-4 translate-x-5 transform rounded-full bg-white shadow-sm transition-transform" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-slate-300">
                      สถานะปัจจุบัน:{" "}
                      <strong
                        className={
                          pushEnabled
                            ? "text-emerald-400"
                            : pushPermission === "denied"
                            ? "text-rose-400"
                            : "text-amber-400"
                        }
                      >
                        {pushEnabled
                          ? "เปิดรับการแจ้งเตือน (Subscribed)"
                          : pushPermission === "denied"
                          ? "สิทธิ์การแจ้งเตือนถูกปิดกั้นในการตั้งค่าอุปกรณ์"
                          : "รออนุญาตสิทธิ์แจ้งเตือนจากอุปกรณ์"}
                      </strong>
                    </span>

                    {!pushEnabled && pushPermission === "default" && (
                      <button
                        type="button"
                        onClick={handleEnablePushPermission}
                        disabled={isTogglingPush}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isTogglingPush ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        <span>อนุญาตสิทธิ์แจ้งเตือนทันที</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSendTestPush}
                    disabled={isTestingPush}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isTestingPush ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>กำลังส่ง Push...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3.5" />
                        <span>ทดสอบส่ง Push (Test Notification)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Section: เซิร์ฟเวอร์ SMTP */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <Server className="size-4 text-sky-400" />
                    <span>เซิร์ฟเวอร์ SMTP (SMTP Server Configuration)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="size-3" />
                    <span>คืนค่าเริ่มต้น</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* SMTP Host */}
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Host (Server Domain)
                    </label>
                    <input
                      type="text"
                      value={smtpSettings.host}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, host: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* SMTP Port Dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Port & Security
                    </label>
                    <select
                      value={smtpSettings.port}
                      onChange={(e) => handlePortChange(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 cursor-pointer"
                    >
                      <option value={465}>465 (SSL / Direct TLS)</option>
                      <option value={587}>587 (STARTTLS)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* SMTP Username / Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Username / Email Account
                    </label>
                    <input
                      type="email"
                      value={smtpSettings.user}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, user: e.target.value })
                      }
                      placeholder="claimstickets@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* SMTP Password with Visibility Toggle */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      SMTP Password / App Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={smtpSettings.pass}
                        onChange={(e) =>
                          setSmtpSettings({ ...smtpSettings, pass: e.target.value })
                        }
                        placeholder="pyzzsapzcdvyjtzit"
                        className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                        title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Sender Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Sender Name (ชื่อผู้ส่งที่แสดงในอีเมล)
                    </label>
                    <input
                      type="text"
                      value={smtpSettings.senderName}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, senderName: e.target.value })
                      }
                      placeholder="USO Project Team"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>

                  {/* Sender Email */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Sender Email (ที่อยู่อีเมลผู้ส่ง)
                    </label>
                    <input
                      type="email"
                      value={smtpSettings.senderEmail}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, senderEmail: e.target.value })
                      }
                      placeholder="claimstickets@gmail.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/90 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                    />
                  </div>
                </div>

                {/* Protocol Switches */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/50 p-3.5 rounded-xl border border-white/5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSettings.enforceSsl}
                      onChange={(e) =>
                        setSmtpSettings({ ...smtpSettings, enforceSsl: e.target.checked })
                      }
                      className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-200">Enforce SSL/TLS</span>
                      <p className="text-[11px] text-slate-400">บังคับใช้การเชื่อมต่อแบบเข้ารหัสทันที</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smtpSettings.rejectUnauthorized}
                      onChange={(e) =>
                        setSmtpSettings({
                          ...smtpSettings,
                          rejectUnauthorized: e.target.checked,
                        })
                      }
                      className="size-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-200">
                        Strict Certificate Validation
                      </span>
                      <p className="text-[11px] text-slate-400">ตรวจสอบใบรับรองความปลอดภัย (reject_unauthorized)</p>
                    </div>
                  </label>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    {isSaved ? <Check className="size-4 text-emerald-300" /> : <Save className="size-4" />}
                    <span>{isSaved ? "บันทึกเรียบร้อย" : "บันทึกการตั้งค่า SMTP (Save Settings)"}</span>
                  </button>
                </div>
              </div>

              {/* Section: ทดสอบเชื่อมต่อและส่งอีเมล */}
              <div className="space-y-3.5 p-4 rounded-xl border border-sky-500/25 bg-slate-900/60 shadow-inner">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wide">
                  <ShieldCheck className="size-4" />
                  <span>ทดสอบเชื่อมต่อและส่งอีเมล (Test Email Dispatch)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  ทดสอบการส่งอีเมลจริงไปยังผู้รับที่ระบุ เพื่อตรวจสอบการยืนยันตัวตนและการเข้าถึงเซิร์ฟเวอร์ SMTP
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="dopa-only-tm@forth.co.th"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={isTestingEmail}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isTestingEmail ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                    <span>{isTestingEmail ? "กำลังส่งเมล..." : "ทดสอบส่งเมล (Test Email)"}</span>
                  </button>
                </div>

                {/* Test Result Message Box */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs animate-in fade-in ${
                      testResult.success
                        ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                        : "bg-rose-950/40 border-rose-800/60 text-rose-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      {testResult.success ? (
                        <Check className="size-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="size-4 text-rose-400 shrink-0" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                    {testResult.details && (
                      <div className="mt-1.5 pl-6 text-[11px] font-mono text-slate-400 break-all">
                        {testResult.details}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* General Settings Tab */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-white/5 pb-2">
                <Sliders className="size-4 text-sky-400" />
                <span>การตั้งค่าทั่วไปของระบบ (General System Configuration)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">ชื่อระบบ (System Name)</div>
                  <div className="text-xs font-semibold text-white">ระบบบริหารจัดการงานเคลมและติดตามอุปกรณ์ (CAIM)</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">หน่วยงานเจ้าของโครงการ</div>
                  <div className="text-xs font-semibold text-white">Forth Corporation Public Company Limited</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">เกณฑ์เตือนใกล้หมดกำหนด SLA</div>
                  <div className="text-xs font-semibold text-amber-400">7 วัน ก่อนถึงกำหนดส่งมอบ</div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-1">
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">การเชื่อมต่อแบบเรียลไทม์</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Server-Sent Events (SSE) Active</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/30 space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-sky-400" />
                      <span className="text-xs font-bold text-white">
                        Progressive Web App · PWA v2.0.0 (claims-pwa-v2.0.0)
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>PWA v2.0.0 Active</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    รองรับการติดตั้งเป็นแอปบน Desktop, iOS และ Android พร้อมกลยุทธ์แคชอัจฉริยะ (Network-First สำหรับ `/api/*` และ Cache-First สำหรับฟอนต์ THSarabunNew / ไอคอน / Static Assets) และหน้าจอ Offline Fallback (`/offline`)
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        triggerPwaInstallPrompt()
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer"
                    >
                      <span>เปิดหน้าต่างติดตั้งแอป (Install PWA 2.0.0)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTestPush}
                      disabled={isTestingPush}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-60"
                    >
                      <BellRing className="size-3.5 text-sky-400" />
                      <span>{isTestingPush ? "กำลังส่ง Push..." : "ทดสอบส่ง Push (Test Notification)"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 space-y-2">
                <div className="text-xs font-semibold text-slate-200">สถาปัตยกรรมความปลอดภัยและการจัดเก็บข้อมูล</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ระบบใช้งานฐานข้อมูลแบบ Dual-Layer Persistence (MongoDB Atlas พร้อม Persistent Local Backup Store)
                  และระบบรหัสผ่านความปลอดภัยในการเข้าถึงหน้าตั้งค่าระบบ (Passcode Protected Guard)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-5 sm:px-6 py-3.5 bg-[#0f172a] shrink-0">
          <div className="text-[11px] text-slate-400">
            Forth CAIM Portal · Telecommunication Equipment Claims
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all border border-slate-700/60 cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900/95 border border-slate-700 px-4 py-3 text-xs font-medium text-white shadow-2xl animate-in fade-in slide-in-from-bottom-3 backdrop-blur-md">
          <Check className="size-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
