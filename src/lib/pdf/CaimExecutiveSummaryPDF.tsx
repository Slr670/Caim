/* eslint-disable jsx-a11y/alt-text */
import * as React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer"
import type { ExecutiveSummaryReportData } from "./types"
import { registerPdfFonts } from "./registerFonts"

// Ensure fonts are registered
registerPdfFonts().catch(() => {})

// Thai hyphenation handler
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: {
    fontFamily: "THSarabunNew",
    fontSize: 8.5,
    color: "#0f172a",
    paddingTop: 22.68, // 8mm
    paddingBottom: 22.68, // 8mm
    paddingHorizontal: 28.35, // 10mm
    flexDirection: "column",
    backgroundColor: "#ffffff",
    lineHeight: 1.15,
  },

  // Blue Divider Bar relocated underneath the header banner
  headerDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#2563eb",
    marginVertical: 6,
    width: "100%",
  },

  // Header Banner
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: "66%",
  },
  logoImage: {
    width: 110,
    height: 42,
    objectFit: "contain",
    marginRight: 10,
  },
  companyInfoBlock: {
    flexDirection: "column",
    justifyContent: "center",
  },
  companyNameTh: {
    fontSize: 9.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
    marginBottom: 1,
  },
  companyNameEn: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    lineHeight: 1.15,
  },
  reportTitleContainer: {
    marginBottom: 6,
  },
  documentTitle: {
    fontSize: 12,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e3a8a",
    lineHeight: 1.15,
    marginBottom: 1,
  },
  systemSubtitle: {
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.15,
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: "34%",
  },
  docBadge: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: 2,
  },
  docNumberText: {
    fontSize: 9,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
    textAlign: "center",
  },
  metaText: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.15,
    textAlign: "right",
  },

  // Section 1: KPI Metrics Grid
  kpiGrid: {
    flexDirection: "row",
    gap: 4.5,
    marginBottom: 5,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3.5,
    paddingVertical: 4,
    paddingHorizontal: 5,
    backgroundColor: "#f8fafc",
  },
  kpiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
    width: "100%",
  },
  kpiLabel: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#475569",
    lineHeight: 1.15,
    flex: 1,
    marginRight: 2,
  },
  kpiTag: {
    fontSize: 6.5,
    color: "#94a3b8",
    lineHeight: 1.15,
    flexShrink: 0,
    textAlign: "right",
  },
  kpiValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginVertical: 3,
  },
  kpiNumber: {
    fontSize: 13.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
  },
  kpiUnit: {
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.15,
    marginLeft: 2,
  },
  kpiSubtext: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.15,
    marginTop: 2,
  },
  kpiStatusPill: {
    borderRadius: 2.5,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  kpiStatusText: {
    fontSize: 6.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.15,
  },

  // Section 1: Visual Distribution Breakdown Bars (Side-by-Side Cards)
  chartsRow: {
    flexDirection: "row",
    gap: 5,
    marginBottom: 5,
  },
  chartCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3.5,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    backgroundColor: "#ffffff",
  },
  chartTitle: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
    lineHeight: 1.15,
  },
  progressItem: {
    minHeight: 18,
    marginBottom: 6,
    flexDirection: "column",
    justifyContent: "center",
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#334155",
    lineHeight: 1.15,
    flex: 1,
    marginRight: 4,
  },
  progressValue: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
    flexShrink: 0,
    textAlign: "right",
  },
  progressBarTrack: {
    height: 3,
    backgroundColor: "#e2e8f0",
    borderRadius: 1.5,
    overflow: "hidden",
    marginTop: 3,
    width: "100%",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 1.5,
  },

  // Section 2: Pipeline Stage Status Ribbon
  pipelineRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 3.5,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
    marginBottom: 4.5,
  },
  pipelineTitle: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#334155",
    lineHeight: 1.15,
  },
  pipelinePillsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stagePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 4,
    gap: 2.5,
  },
  stageDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  stageName: {
    fontSize: 7,
    fontFamily: "THSarabunNew",
    color: "#334155",
    lineHeight: 1.15,
    textAlign: "center",
  },
  stageCountBadge: {
    fontSize: 7,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
    textAlign: "center",
  },

  // Section 2: Claims Inventory Table
  tableContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 3.5,
    overflow: "hidden",
    marginBottom: 3,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    paddingVertical: 3,
    alignItems: "center",
    minHeight: 17,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#ffffff",
    lineHeight: 1.15,
    paddingHorizontal: 3,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingVertical: 2.5,
    alignItems: "center",
    minHeight: 18,
  },
  tableCellText: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    color: "#1e293b",
    lineHeight: 1.15,
    paddingHorizontal: 3,
  },
  tableCellSubtext: {
    fontSize: 6.5,
    color: "#64748b",
    lineHeight: 1.1,
    paddingHorizontal: 3,
  },

  // Column Widths (Sum = 100%)
  colClaimNo: {
    width: "15%",
  },
  colTitle: {
    width: "27%",
  },
  colEquipment: {
    width: "20%",
  },
  colStatus: {
    width: "13%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableColStatus: {
    width: "13%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  colSla: {
    width: "13%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  tableColSla: {
    width: "13%",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  colAssignee: {
    width: "12%",
  },

  // Status Badges
  statusBadge: {
    borderRadius: 2.5,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  statusBadgeText: {
    fontSize: 6.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.15,
    textAlign: "center",
  },

  // Summary & Totals Row (Footer Row)
  totalsRow: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderTopWidth: 1.5,
    borderTopColor: "#94a3b8",
    paddingVertical: 3,
    paddingHorizontal: 3,
    alignItems: "center",
    minHeight: 19,
  },
  totalsLeft: {
    width: "42%",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  totalsTitle: {
    fontSize: 8,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#0f172a",
    lineHeight: 1.15,
  },
  totalsRight: {
    width: "58%",
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 3,
  },
  totalItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  totalItemLabel: {
    fontSize: 7,
    color: "#475569",
    lineHeight: 1.15,
  },
  totalItemValue: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    lineHeight: 1.15,
  },

  // Notice & Footer
  noticeText: {
    fontSize: 6.5,
    color: "#64748b",
    marginBottom: 4,
    lineHeight: 1.15,
  },
  footerContainer: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 3,
  },
  footerText: {
    fontSize: 7,
    color: "#64748b",
    lineHeight: 1.15,
  },
  pageNumberText: {
    fontSize: 7.5,
    fontFamily: "THSarabunNew",
    fontWeight: "bold",
    color: "#334155",
    lineHeight: 1.15,
  },
})

export interface CaimExecutiveSummaryPDFProps {
  data: ExecutiveSummaryReportData
}

export function CaimExecutiveSummaryPDF({ data }: CaimExecutiveSummaryPDFProps) {
  const {
    reportNumber,
    reportTitle,
    companyName,
    systemSubtitle,
    generatedDate,
    kpis,
    repairOutcomes,
    topModels,
    pipelineStages,
    inventory,
    inventoryLimitNotice,
    totals,
  } = data

  const getStatusBadgeStyle = (statusCode: number) => {
    switch (statusCode) {
      case 1:
        return { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" }
      case 2:
        return { bg: "#eef2ff", border: "#a5b4fc", text: "#4338ca" }
      case 3:
        return { bg: "#fffbeb", border: "#fde68a", text: "#b45309" }
      case 4:
        return { bg: "#ecfdf5", border: "#6ee7b7", text: "#047857" }
      case 5:
        return { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" }
      case 6:
        return { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c" }
      default:
        return { bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" }
    }
  }

  return (
    <Document
      title={`รายงานสรุปผู้บริหาร CAIM - ${reportNumber}`}
      author="Forth Corporation Public Company Limited"
      subject="CAIM Executive Summary Single-Page Report"
      keywords="CAIM, Forth, Equipment Claims, Executive Summary, Single Page"
    >
      {/* STRICT SINGLE-PAGE A4 LAYOUT */}
      <Page size="A4" style={styles.page}>
        {/* Compact Enterprise Header Banner */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Image 
              src="/images/forth-logo.png" 
              style={{ width: 110, height: 42, objectFit: "contain", marginRight: 10 }} 
            />
            <View style={styles.companyInfoBlock}>
              <Text style={styles.companyNameTh}>บริษัท ฟอร์ท คอร์ปอเรชั่น จำกัด (มหาชน)</Text>
              <Text style={styles.companyNameEn}>{companyName || "FORTH CORPORATION PUBLIC COMPANY LIMITED"}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.docBadge}>
              <Text style={styles.docNumberText}>{reportNumber}</Text>
            </View>
            <Text style={styles.metaText}>พิมพ์เมื่อ: {generatedDate}</Text>
          </View>
        </View>

        {/* Relocated Blue Divider Bar (placed directly underneath header banner) */}
        <View style={styles.headerDivider} />

        {/* Report Title & Subtitle Banner */}
        <View style={styles.reportTitleContainer}>
          <Text style={styles.documentTitle}>{reportTitle}</Text>
          <Text style={styles.systemSubtitle}>{systemSubtitle}</Text>
        </View>

        {/* Section 1: Executive KPI Metrics (4-Column Compact Grid) */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Total Claims */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>จำนวนเคสทั้งหมด</Text>
              <Text style={styles.kpiTag}>Total Claims</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNumber}>{kpis.totalClaims}</Text>
              <Text style={styles.kpiUnit}>เคส</Text>
            </View>
            <Text style={styles.kpiSubtext}>
              ซ่อมอยู่ {kpis.inProgressCount} · ปิดเคส {kpis.closedCount}
            </Text>
          </View>

          {/* Card 2: SLA Compliance Rate */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>% ผ่านเกณฑ์ SLA</Text>
              <Text style={styles.kpiTag}>Compliance</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNumber}>{kpis.slaComplianceRate}%</Text>
            </View>
            <View
              style={[
                styles.kpiStatusPill,
                { backgroundColor: kpis.slaStatusBg },
              ]}
            >
              <Text
                style={[
                  styles.kpiStatusText,
                  { color: kpis.slaStatusColor },
                ]}
              >
                {kpis.slaStatusText}
              </Text>
            </View>
          </View>

          {/* Card 3: MTTR */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>เวลาเฉลี่ยปิดเคส (MTTR)</Text>
              <Text style={styles.kpiTag}>Mean Time</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNumber}>{kpis.mttrDays}</Text>
              <Text style={styles.kpiUnit}>วัน</Text>
            </View>
            <Text style={styles.kpiSubtext}>ค่าเฉลี่ยระยะเวลาปิดงานจริง</Text>
          </View>

          {/* Card 4: Active Overseas RMA / Watchlist */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Text style={styles.kpiLabel}>ซ่อมต่างประเทศ / เฝ้าระวัง</Text>
              <Text style={styles.kpiTag}>Overseas / Watch</Text>
            </View>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiNumber}>{kpis.overseasRmaCount + kpis.highPriorityWatchlistCount}</Text>
              <Text style={styles.kpiUnit}>เคส</Text>
            </View>
            <Text style={styles.kpiSubtext}>
              RMA {kpis.overseasRmaCount} เคส · เฝ้าระวัง {kpis.highPriorityWatchlistCount} เคส
            </Text>
          </View>
        </View>

        {/* Section 1 Visuals: Distribution Breakdown Bars (Side-by-Side Cards) */}
        <View style={styles.chartsRow}>
          {/* Card A: Repair Outcome Distribution */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>สัดส่วนผลการจัดการอุปกรณ์ (Repair Outcome Distribution)</Text>

            {/* Repaired */}
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>1. ซ่อมสำเร็จ (Repaired)</Text>
                <Text style={styles.progressValue}>
                  {repairOutcomes.repaired} เคส ({repairOutcomes.repairedPct}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(2, Math.min(100, repairOutcomes.repairedPct))}%`,
                      backgroundColor: "#10b981",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Replaced */}
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>2. เปลี่ยนเครื่องใหม่ (Replaced)</Text>
                <Text style={styles.progressValue}>
                  {repairOutcomes.replacedNew} เคส ({repairOutcomes.replacedNewPct}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(2, Math.min(100, repairOutcomes.replacedNewPct))}%`,
                      backgroundColor: "#3b82f6",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Unrepairable */}
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>3. จำหน่ายซาก (Unrepairable)</Text>
                <Text style={styles.progressValue}>
                  {repairOutcomes.unrepairable} เคส ({repairOutcomes.unrepairablePct}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(2, Math.min(100, repairOutcomes.unrepairablePct))}%`,
                      backgroundColor: "#ef4444",
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Card B: Equipment Model Share */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>สัดส่วนอุปกรณ์ตามรุ่น (Equipment Model Share)</Text>
            {topModels.length === 0 ? (
              <Text style={styles.kpiSubtext}>ไม่มีข้อมูลรุ่นอุปกรณ์ที่มีปัญหา</Text>
            ) : (
              topModels.map((m, idx) => {
                const colors = ["#6366f1", "#0284c7", "#f59e0b"]
                const barColor = colors[idx % colors.length]
                return (
                  <View key={m.model} style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.progressLabel}>
                        {idx + 1}. {m.model} ({m.vendor})
                      </Text>
                      <Text style={styles.progressValue}>
                        {m.count} เคส ({m.percentage}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.max(2, Math.min(100, m.percentage))}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </View>

        {/* Section 2: Categorized Pipeline Status Strip */}
        <View style={styles.pipelineRibbon}>
          <Text style={styles.pipelineTitle}>สถานะกระบวนการงานเคลม (Pipeline Stages):</Text>
          <View style={styles.pipelinePillsContainer}>
            {pipelineStages.map((stg) => (
              <View key={stg.stageNumber} style={styles.stagePill}>
                <View style={[styles.stageDot, { backgroundColor: stg.color }]} />
                <Text style={styles.stageName}>{stg.name}</Text>
                <Text style={styles.stageCountBadge}>{stg.count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Section 2: Claims Inventory Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colClaimNo]}>เลขที่เคลม</Text>
            <Text style={[styles.tableHeaderText, styles.colTitle]}>หัวข้อเคลม / อาการ</Text>
            <Text style={[styles.tableHeaderText, styles.colEquipment]}>อุปกรณ์ / S/N</Text>
            <Text style={[styles.tableHeaderText, styles.colStatus, { textAlign: "center" }]}>สถานะ</Text>
            <Text style={[styles.tableHeaderText, styles.colSla, { textAlign: "center" }]}>อายุเคส / SLA</Text>
            <Text style={[styles.tableHeaderText, styles.colAssignee]}>ผู้รับผิดชอบ</Text>
          </View>

          {/* Table Rows */}
          {inventory.length === 0 ? (
            <View style={[styles.tableRow, { justifyContent: "center" }]}>
              <Text style={styles.tableCellText}>ไม่มีรายการเคสเคลมในระบบขณะนี้</Text>
            </View>
          ) : (
            inventory.map((row, index) => {
              const badgeStyle = getStatusBadgeStyle(row.statusCode)
              const isEven = index % 2 === 0
              return (
                <View
                  key={row.id}
                  style={[
                    styles.tableRow,
                    { backgroundColor: isEven ? "#ffffff" : "#f8fafc" },
                  ]}
                >
                  {/* Claim No */}
                  <View style={styles.colClaimNo}>
                    <Text style={[styles.tableCellText, { fontFamily: "THSarabunNew", fontWeight: "bold" }]}>
                      {row.id}
                    </Text>
                  </View>

                  {/* Title & Symptoms */}
                  <View style={styles.colTitle}>
                    <Text style={[styles.tableCellText, { fontFamily: "THSarabunNew", fontWeight: "bold" }]}>
                      {row.title}
                    </Text>
                    {row.symptoms ? (
                      <Text style={styles.tableCellSubtext}>
                        {row.symptoms}
                      </Text>
                    ) : null}
                  </View>

                  {/* Model & S/N */}
                  <View style={styles.colEquipment}>
                    <Text style={styles.tableCellText}>{row.equipment}</Text>
                    <Text style={styles.tableCellSubtext}>S/N: {row.serialNo}</Text>
                  </View>

                  {/* Status Badge */}
                  <View style={styles.colStatus}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: badgeStyle.bg,
                          borderColor: badgeStyle.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: badgeStyle.text },
                        ]}
                      >
                        {row.status}
                      </Text>
                    </View>
                  </View>

                  {/* Age & SLA Status */}
                  <View style={styles.colSla}>
                    <Text style={[styles.tableCellText, { textAlign: "center", paddingHorizontal: 0 }]}>
                      {row.ageDays}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: row.isOverdue ? "#fee2e2" : "#d1fae5",
                          borderColor: row.isOverdue ? "#fca5a5" : "#86efac",
                          marginTop: 1.5,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: row.isOverdue ? "#b91c1c" : "#047857" },
                        ]}
                      >
                        {row.slaStatusText}
                      </Text>
                    </View>
                  </View>

                  {/* Assignee */}
                  <View style={styles.colAssignee}>
                    <Text style={styles.tableCellText}>{row.assignee}</Text>
                  </View>
                </View>
              )
            })
          )}

          {/* Summary & Totals Row (Footer Row) */}
          <View style={styles.totalsRow}>
            <View style={styles.totalsLeft}>
              <Text style={styles.totalsTitle}>สรุปยอดรวมทั้งระบบ (System Totals)</Text>
            </View>
            <View style={styles.totalsRight}>
              <View style={styles.totalItem}>
                <Text style={styles.totalItemLabel}>รวมทั้งหมด:</Text>
                <Text style={[styles.totalItemValue, { color: "#1d4ed8" }]}>{totals.totalCount} เคส</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalItemLabel}>กำลังซ่อม:</Text>
                <Text style={[styles.totalItemValue, { color: "#b45309" }]}>{totals.activeCount} เคส</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalItemLabel}>ปิดเคสแล้ว:</Text>
                <Text style={[styles.totalItemValue, { color: "#047857" }]}>{totals.closedCount} เคส</Text>
              </View>
              <View style={styles.totalItem}>
                <Text style={styles.totalItemLabel}>เกิน SLA:</Text>
                <Text style={[styles.totalItemValue, { color: "#dc2626" }]}>{totals.overdueCount} เคส</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Truncation notice if list is capped to prevent vertical page break */}
        {inventoryLimitNotice && (
          <Text style={styles.noticeText}>{inventoryLimitNotice}</Text>
        )}

        {/* Compact Single-Page Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            เอกสารรายงานผลการดำเนินงานภายใน บมจ. ฟอร์ท คอร์ปอเรชั่น (USO Project Operational Record)
          </Text>
          <Text style={styles.pageNumberText}>หน้า 1 / 1</Text>
        </View>
      </Page>
    </Document>
  )
}
