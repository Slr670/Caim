// Centralized Database Schema Definitions for CAIM System
// Supports Equipments, Stations, Tickets (Claims), RMA Records, and Transaction Logs

// Closed-case repair outcome contract shared with Stock-Flow (integration plan section 3.2)
export type CaimRepairOutcome = "unrepairable" | "repaired" | "replaced_new" | "rejected"

export interface ProjectDocument {
  id: string // e.g. "proj-uso-shf-2"
  name: string // e.g. "USO-SHF 2 (25310-9999)"
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ProjectUsageStats {
  claimsCount: number
  rmaCount: number
  equipmentsCount: number
  stationsCount: number
  totalReferences: number
}

export interface ProjectWithUsage extends ProjectDocument {
  usage?: ProjectUsageStats
}

export interface StationDocument {
  id: string // e.g. "st-60-1", "st-rep-1", or custom string ID
  code: string // e.g. "GOV-03"
  name: string // "ที่ว่าการอำเภอคลองลาน"
  subdistrict: string // "คลองน้ำไหล"
  district: string // "คลองลาน"
  province: string // "กำแพงเพชร"
  area: string // "ภาคเหนือ"
  zone: string // "เขต 3 (ส่วนแยกตาก)"
  siteType: string // "ที่ว่าการอำเภอ"
  contractor: string // "P&S"
  towerType: string // "Self-Support"
  height: number // 60
  seaLevel: number // 158
  lat: number // 16.204197
  lng: number // 99.321011
  category: string // "เสาสัญญาณหลัก 60 เมตร"
  projectId?: string // Foreign Key -> ProjectDocument.id
  projectName?: string // Resolved project display name
  activeClaimIds?: string[] // Relational reference: active claims at this station
  createdAt?: string
  updatedAt?: string
}

export type EquipmentStatus = "active" | "in_claim" | "in_rma" | "retired"

export interface EquipmentDocument {
  serial: string // Primary unique natural key (S/N)
  vendor: string // e.g. "Huawei", "Hytera", "Motorola"
  model: string // e.g. "2280", "MD788G"
  category: string // Category name
  name?: string // Device label/name
  description?: string
  projectId?: string // Foreign Key -> ProjectDocument.id
  projectName?: string // Resolved project display name
  stationId?: string // Foreign Key -> StationDocument.id
  stationName?: string // Cached station name for rapid search
  status?: EquipmentStatus // Current state of the equipment
  currentClaimId?: string // Foreign Key -> TicketDocument.id (if in_claim)
  currentRmaId?: string // Foreign Key -> RmaDocument.id (if in_rma)
  createdAt?: string
  updatedAt?: string
}

export interface ClaimTimelineEvent {
  title: string
  timestamp: string
  duration: string
}

export interface TicketDocument {
  uid?: string // Immutable database primary key (UUID v4 / deterministic UUID)
  id: string // Contiguous display Claim ID, e.g. "CLM-2026-006"
  claimNumber?: string // Canonical Claim Number mirror, e.g. "CLM-2026-006"
  title: string
  claimTitle?: string
  problemDesc: string
  description?: string
  symptoms?: string
  symptomSummary?: string
  vendor: string
  model: string
  serialNo: string // Foreign Key -> EquipmentDocument.serial
  status: string // "รับแจ้ง", "ส่งศูนย์", "ปิดเคส", etc.
  statusCode: number
  date: string
  reportedDate?: string
  deadlineDate?: string
  ageDays: string
  isOverdue?: boolean
  overdueText?: string
  repairResult?: string
  // Structured repair outcome for the Stock-Flow webhook; when unset the free-text repairResult is keyword-mapped
  repairOutcome?: CaimRepairOutcome
  // New S/N supplied by the vendor when repairOutcome is "replaced_new"
  replacedNewSerialNo?: string
  // Disposal channel sent to Stock-Flow when repairOutcome is "unrepairable"
  disposalMethod?: string
  // Timestamp of the close transition, echoed to Stock-Flow as payload.closedAt
  closedAt?: string
  // Operator who closed the case, echoed to Stock-Flow as payload.closedBy
  closedBy?: string
  remarks?: string
  category?: string
  deviceType?: string
  location?: string
  warrantyStatus?: string
  serviceCenter?: string
  sentDate?: string
  sentDateIso?: string
  lastTrackDate?: string
  lastTrackDateIso?: string
  returnDate?: string
  returnDateIso?: string
  reportedDateIso?: string
  deadlineDateIso?: string
  reporter?: string
  assignee?: string
  reporterName?: string
  assigneeName?: string
  stationId?: string // Foreign Key -> StationDocument.id
  station?: string // Station name
  province?: string
  district?: string
  subdistrict?: string
  projectId?: string // Foreign Key -> ProjectDocument.id
  projectName?: string // Resolved project display name
  rmaId?: string // Foreign Key -> RmaDocument.id (if dispatched overseas)
  previousId?: string // Previous Claim ID prior to automatic resequencing
  timeline?: ClaimTimelineEvent[] // Authoritative timeline events resolved from DB
  createdAt?: string
  updatedAt?: string
}

export interface StageHistoryRecord {
  stageNumber: number
  name: string
  shortName: string
  standardDays: number
  hasVendorPenalty?: boolean
  startDate: string
  endDate: string
  actualDays: number
  status: "completed" | "active" | "pending"
  notes?: string
}

export interface PermitTrackingInfo {
  permitNo: string
  permitType: "export_for_repair" | "import_after_repair" | "nbtc_permit" | "customs_clearance"
  authority: string
  destinationCountry?: string
  rmaId?: string
  rmaNo?: string
  serialNo?: string
  issueDate: string // YYYY-MM-DD
  expiryDate: string // YYYY-MM-DD
  coveredSteps: number[] // [1, 2, 3, 4, 5] for export, [5, 6, 7, 8] for import
  coveredStages?: number[] // alias for coveredSteps
  remarks?: string
  createdAt?: string
  updatedAt?: string
  totalDays?: number
  elapsedDays?: number
  remainingDays?: number
  progressPercent?: number
  status?: "active" | "warning" | "expired"
  badgeText?: string
  subtext?: string
}

export interface RmaDocument {
  id: string // e.g. "RMA-2026-001"
  rmaNo: string
  caseName?: string // Claim case reference title or ID
  ticketId?: string // Foreign Key -> TicketDocument.id
  serialNo: string // Foreign Key -> EquipmentDocument.serial
  vendor: string
  model: string
  projectId?: string // Foreign Key -> ProjectDocument.id
  projectName?: string // Resolved project display name
  destination: string
  status: string
  statusBadge?: "in_progress" | "returned"
  statusBadgeText?: string
  currentStageNumber?: number
  totalStages?: number
  currentStageName?: string
  stageWaitDays?: string
  currentStageStartedAt?: string
  currentStageCompletedAt?: string
  openDate?: string
  sentDate?: string
  trackNo?: string
  carrier?: string
  notes?: string
  remarks?: string
  totalDays?: string
  penaltyDays?: string
  penaltyStandard?: string
  isOverduePenalty?: boolean
  stageHistory?: StageHistoryRecord[]
  permitInfo?: PermitTrackingInfo
  permits?: PermitTrackingInfo[]
  createdAt?: string
  updatedAt?: string
}

export type TransactionAction =
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "CLAIM_OPENED"
  | "CLAIM_UPDATED"
  | "CLAIM_DELETED"
  | "RMA_DISPATCHED"
  | "RMA_UPDATED"
  | "RMA_DELETED"
  | "EQUIPMENT_CREATED"
  | "EQUIPMENT_UPDATED"
  | "EQUIPMENT_DELETED"
  | "STATION_CREATED"
  | "STATION_UPDATED"
  | "STATION_DELETED"

export interface TransactionLogDocument {
  id: string
  action: TransactionAction
  targetType: "project" | "equipment" | "station" | "ticket" | "rma"
  targetId: string
  claimId?: string // Immutable foreign key -> TicketDocument.uid
  claimUid?: string // Alias for immutable foreign key -> TicketDocument.uid
  details: Record<string, unknown>
  timestamp: string
}

export interface RealtimeSyncPayload<T = unknown> {
  type: "project" | "station" | "equipment" | "ticket" | "rma" | "metrics"
  action: "create" | "update" | "delete" | "snapshot"
  data: T
  timestamp: string
}
