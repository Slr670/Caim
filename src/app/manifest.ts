import type { MetadataRoute } from "next"

export type Pwa2Manifest = MetadataRoute.Manifest & {
  version?: string
  display_override?: string[]
}

export default function manifest(): Pwa2Manifest {
  return {
    id: "/",
    name: "CLAIMS — Telecommunication Equipment Claims & RMA System",
    short_name: "CLAIMS",
    version: "2.0.0",
    description:
      "ระบบบริหารจัดการงานเคลมและติดตามการส่งซ่อมอุปกรณ์โทรคมนาคม (ทั้งในและต่างประเทศ) — Forth Corporation Public Company Limited",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    background_color: "#ffffff",
    theme_color: "#2563eb",
    orientation: "any",
    lang: "th",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "แดชบอร์ดภาพรวม (Dashboard)",
        short_name: "หน้าหลัก",
        description: "ดูสรุปสถานะงานเคลมและตัวชี้วัด SLA แบบเรียลไทม์",
        url: "/dashboard",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "รายการงานเคลม (Claims List)",
        short_name: "รายการเคลม",
        description: "ค้นหาและจัดการรายการเคสเคลมอุปกรณ์ทั้งหมด",
        url: "/tickets",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "แจ้งเคลมใหม่ (New Claim)",
        short_name: "แจ้งเคลม",
        description: "ลงทะเบียนเปิดเคสแจ้งเคลมอุปกรณ์ใหม่",
        url: "/tickets/new",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  }
}
