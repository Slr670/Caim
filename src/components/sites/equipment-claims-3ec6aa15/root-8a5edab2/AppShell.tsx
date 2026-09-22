"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Radar,
  Wrench,
  PlaneTakeoff,
  HardDrive,
  MapPin,
  BookOpen,
  Menu,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false)

  const navSections = [
    {
      title: "ภาพรวม",
      items: [
        {
          label: "หน้าหลัก",
          href: "/dashboard",
          icon: LayoutDashboard,
          active: pathname === "/dashboard" || pathname === "/"
        }
      ]
    },
    {
      title: "งานเคลม",
      items: [
        {
          label: "รายการงานเคลม",
          href: "/tickets",
          icon: Radar,
          active: pathname === "/tickets"
        },
        {
          label: "แจ้งเคลม",
          href: "/tickets/new",
          icon: Wrench,
          active: pathname === "/tickets/new"
        },
        {
          label: "ส่งเคลมต่างประเทศ",
          href: "/repairs/overseas",
          icon: PlaneTakeoff,
          active: pathname === "/repairs/overseas"
        }
      ]
    },
    {
      title: "จัดการข้อมูล",
      items: [
        {
          label: "ข้อมูลอุปกรณ์",
          href: "/assets",
          icon: HardDrive,
          active: pathname === "/assets"
        },
        {
          label: "ข้อมูลสถานี",
          href: "/stations",
          icon: MapPin,
          active: pathname === "/stations"
        }
      ]
    }
  ]

  function handleLogout() {
    router.push("/login")
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden backdrop-blur-xs animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 border-r border-sidebar-border bg-sidebar transition-all duration-200 ${
          mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
        } ${sidebarOpen ? "lg:w-64" : "lg:w-16"}`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none"
              aria-label="ระบบเคลมอุปกรณ์ — ไปหน้าแดชบอร์ด"
            >
              <Image
                src="/images/logo-forth-07_8-mobile.png"
                alt="Forth Corporation"
                width={282}
                height={84}
                priority
                className={`h-7 w-auto shrink-0 transition-opacity ${
                  sidebarOpen ? "opacity-100" : "lg:opacity-0"
                }`}
              />
            </Link>

            {mobileMenuOpen && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav
            aria-label="เมนูหลัก"
            className="flex flex-1 flex-col gap-5 overflow-y-auto py-4 px-3"
          >
            {navSections.map((sec, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-1">
                {sidebarOpen && (
                  <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground tracking-wider uppercase">
                    {sec.title}
                  </p>
                )}
                {sec.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center rounded-lg text-sm font-medium transition-colors h-10 gap-2.5 px-3 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none ${
                        item.active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                          : "text-muted-foreground hover:bg-white/70 hover:text-foreground dark:hover:bg-sidebar-accent/50"
                      }`}
                      title={!sidebarOpen ? item.label : undefined}
                    >
                      <Icon
                        className={`size-4.5 shrink-0 ${
                          item.active ? "text-sidebar-primary" : ""
                        }`}
                        aria-hidden="true"
                      />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Manual Link */}
          <div className="shrink-0 border-t border-sidebar-border py-2 px-3">
            <Link
              href="/manual"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center rounded-lg text-sm font-medium transition-colors h-10 gap-2.5 px-3 text-muted-foreground hover:bg-white/70 hover:text-foreground ${
                pathname === "/manual"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                  : ""
              }`}
              title={!sidebarOpen ? "คู่มือการใช้งาน" : undefined}
            >
              <BookOpen className="size-4.5 shrink-0" aria-hidden="true" />
              {sidebarOpen && <span className="truncate">คู่มือการใช้งาน</span>}
            </Link>
          </div>

          {/* User Profile Footer */}
          <div className="relative shrink-0 border-t border-sidebar-border py-3 px-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setUserDropdownOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-lg p-1 text-left w-full hover:bg-muted/60 transition-colors"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                  in
                </span>
                {sidebarOpen && (
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium text-foreground">
                      indykantanat
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      เจ้าหน้าที่
                    </span>
                  </div>
                )}
              </button>
            </div>

            {/* Logout Dropdown */}
            {userDropdownOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg border border-border bg-card p-1 shadow-lg animate-in fade-in">
                <div className="px-3 py-2 text-xs border-b border-border">
                  <p className="font-semibold text-foreground">indykantanat@gmail.com</p>
                  <p className="text-muted-foreground">สถานะ: เข้าสู่ระบบแล้ว</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="size-3.5" />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div
        className={`flex flex-1 flex-col transition-all duration-200 ${
          sidebarOpen ? "lg:pl-64" : "lg:pl-16"
        }`}
      >
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="size-8 lg:hidden"
            aria-label="เปิดเมนู"
          >
            <Menu className="size-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen((v) => !v)}
            className="size-8 hidden lg:inline-flex"
            aria-label={sidebarOpen ? "ยุบเมนู" : "ขยายเมนู"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeft className="size-5" />
            )}
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">ระบบออนไลน์</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
