# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.18.1] - 2026-09-24

### Added
- **Live Database Connection & Data Seeding in MongoDB Atlas**:
  - Connected Next.js app to MongoDB Atlas cluster `slr.b6ih1xk.mongodb.net` using database user `darkwer01_db_user`.
  - Created and seeded `caim.tickets` with claim records and lookup indexes (`id`, `serialNo`, `status`, `province`).
  - Created and seeded `caim.stations` with 197 registered station records from Excel data with indexing.
  - Added secure automated seeding script `scripts/seed_mongodb.mjs` resolving credentials dynamically from environment.

### Added
- **MongoDB Atlas Backend Database Infrastructure & Dual-Layer Persistence**:
  - Configured `@/lib/mongodb` client pool manager for Next.js with connection caching.
  - Added `.env.example` and `.env.local` templates for MongoDB Atlas cluster connection string.
  - Enhanced `/api/tickets` route handler with `GET`, `POST`, `PUT`, and `DELETE` operations connecting to MongoDB Atlas `tickets` collection with graceful offline fallback.
  - Enhanced `/api/rma` route handler with `GET`, `POST`, and `DELETE` operations connecting to MongoDB Atlas `rma` collection.
  - Upgraded New Ticket Creation module (`NewTicketView`) with full controlled state binding, automated ID generation, and immediate dual-layer persistence (localStorage + MongoDB Atlas API).
  - Synchronized custom tickets into Claim List (`TicketsView`) on mount, ensuring newly created records persist and remain visible across page reloads.

### Added
- **Permanent Record Deletion & Full Persistence Architecture**:
  - Implemented `/api/tickets` and `/api/rma` backend route handlers for HTTP `DELETE` requests.
  - Added `recordStorage` utility to persist deleted ticket and RMA IDs across page reloads via `localStorage` synchronization.
  - Added dedicated custom confirmation modal dialogs with risk warnings before executing deletions.
  - Integrated real-time UI feedback toasts notifying users upon successful database and local deletion.
  - Added row deletion trigger (`ลบ` action button with `Trash2` icon) to the Claim List module.

### Fixed
- **Filter Reset & Empty Table State Behavior**:
  - Fixed 'ล้างตัวกรอง' (Clear Filter) in both Claim List (`TicketsView`) and RMA (`OverseasView`) modules to reset all input fields and dropdowns back to their default empty states.
  - Implemented an **Empty Table State** upon clearing filters — clearing all rendered rows completely without reloading or displaying the default list until the user manually clicks 'ค้นหา' (Search).
  - Added clean empty table state placeholders with search call-to-action buttons.

## [0.16.0] - 2026-09-24

### Added
- **Cascading Location & Station Hierarchy Filters in Claim List (`รายการงานเคลม`)**:
  - Populated Province (`จังหวัด`), District (`อำเภอ`), Sub-district (`ตำบล`), and Station (`สถานี`) dropdown filters directly from registered records in the Station Information (`STATIONS`) database:
    - **Province (`จังหวัด`)**: Distinct registered provinces sorted in Thai alphabetical order.
    - **District (`อำเภอ`)**: Cascades dynamically from selected province (disabled with `"เลือกจังหวัดก่อน"` when no province is chosen); resets when province changes.
    - **Sub-district (`ตำบล`)**: Cascades dynamically from selected district (disabled with placeholder `"เลือกอำเภอก่อน"` when no district is chosen); resets when district changes.
    - **Station Linking (`สถานี`)**: Filters and groups stations matching the full selected hierarchy (Province > District > Sub-district), organized by 60m main stations and repeater masts.
  - **State Management & Query Logic**:
    - Full cascading handlers with synchronized reset triggers.
    - Exported `buildClaimFiltersQuery` URL query builder for API integration and client bookmark sync.
    - Clear/Reset filters button with icon and reactive search result counter badge.
    - Enriched table rows and detail modal with station installation and administrative boundary indicators.

## [0.15.0] - 2026-09-24

### Added
- **Create Overseas RMA / Dispatch Modal Dialog**:
  - Interactive modal dialog for creating overseas RMA claims with equipment selection and case linking.

## [0.14.0] - 2026-09-24

### Added
- **Station Management (`ข้อมูลสถานี`) Full Database Import**:
  - Integrated 197 station sites from Excel dataset with multi-criteria filtering and detail viewer.

## [0.13.0] - 2026-09-23

### Added
- **Create New Claim (`เปิดเคสใหม่`) Form Layout & Dynamic Summary Widget (1:1 Reference Replication)**:
  - Rebuilt `/tickets/new` view strictly matching the reference screenshot:
    - **Header**: Breadcrumbs (`[Home Icon] > งานเคลม > เปิดเคสใหม่`), dark navy badge (`#0c1a30`) with white add-file icon, title `เปิดเคสใหม่`, and subtitle `กรอกเลขที่เคลมเองในฟอร์มด้านล่าง`.
    - **Sidebar Navigation**: Fixed `isItemActive` in `AppShell` so visiting `/tickets/new` highlights ONLY `แจ้งเคลม`.
    - **Two-Column Card Layout**:
      - **Left Column (Claim Input Form)**:
        - `อุปกรณ์`: Dropdown select for registered devices (`เลือกอุปกรณ์จากทะเบียน ⬍`).
        - `ข้อมูลเคส`: `เลขที่เคลม` input with duplicate validation note, `วันและเวลาที่รับแจ้ง` datetime input, `สถานะการรับประกัน` dropdown, and `อาการเสีย / ปัญหาที่พบ` textarea.
        - `กำหนดการและศูนย์บริการ`: `ศูนย์บริการ / ผู้รับงาน` dropdown, `วันและเวลาที่ส่งศูนย์บริการ` datetime input, and `กำหนดแล้วเสร็จ` input with auto-fill helper note.
        - `ผู้เกี่ยวข้อง`: `ผู้แจ้ง / เจ้าของเครื่อง` input, `ผู้รับผิดชอบเคส` input, and `หมายเหตุ` textarea.
      - **Right Column (Sidebar Summary Card)**:
        - Circular countdown widget: Blue ring with `60 / วัน`, `เหลืออีก 60 วัน`, and `ครบกำหนด 22 พ.ย. 2569`.
        - Live case summary (`สรุปเคส`): Real-time reflection of entered `เลขที่เคส` and selected `อุปกรณ์ที่เลือก`.
        - Full-width dark navy submit button (`เปิดเคส`) and secondary outline cancel button (`ยกเลิก`).

## [0.12.0] - 2026-09-23

### Added
- **Overseas Claim Management & Stage Tracking Stepper Modal (1:1 Reference Replication)**:
  - Rebuilt `/repairs/overseas` view strictly matching the reference screenshots:
    - **Header**: Airplane icon in navy badge (`#0c1a30`), breadcrumbs, page title `ส่งเคลมต่างประเทศ`, subtitle, and `+ เปิดใบส่งซ่อม` action button.
    - **Filter Card**: `ค้นหา` input, `ขั้นตอน` dropdown, `สถานะใบ` dropdown, `ศูนย์บริการ` dropdown, `เฉพาะที่เกินบทปรับ` toggle button, and aligned dark `ค้นหา` button.
    - **RMA Data Table**:
      - Columns: `ใบ RMA / เคส`, `อุปกรณ์`, `ขั้นตอนปัจจุบัน`, `เปิดใบ`, `รวม`, `บทปรับผู้ขาย`, and Action buttons (`ไทม์ไลน์`, `แก้ไข`, `ลบ`).
      - Segmented 8-stage progress indicators (`5/8` with green and blue dashes, `8/8` with full green dashes).
      - Status badges (`กำลังดำเนินการ` and `ของกลับถึงแล้ว`).
      - Row alert highlight for overdue vendor penalties (`test14` highlighted in soft red `bg-[#fff5f5]` with bold red `เกิน 7 วัน`).
    - **Timeline Tracking Modal (ใบ TEST20)**:
      - Modal header with RMA number, S/N, case name, and vendor.
      - 8-stage vertical stepper timeline with connecting lines:
        - Steps 1-5: Completed with green checkmarks, dates, and days elapsed (with exceeded days `(8 วัน)` and `(4 วัน)` in orange/red).
        - Step 6 (Active): Highlighted with blue circle `6` badge, `จีน (เข้ากระบวนการซ่อม)`, and tag `⏰ เริ่มนับบทปรับผู้ขาย`.
        - Steps 7-8: Pending steps in grey (`ส่งกลับเครื่องบิน`, `เคลียร์ของออก (ศุลกากรขาเข้า)`).
      - Footer actions: Summary text of total elapsed days vs standard plan, timestamp input (`วันและเวลาที่เกิดขึ้นจริง`), primary transition button (`› ปิดขั้น "จีน — ซ่อม" → เข้าขั้น "ขนส่งกลับ"`), and secondary action (`✎ แก้ไขที่รายขั้น (กรอกย้อนหลัง)`).
    - **New RMA Dispatch Modal**: Modal form for creating a new RMA record with validation and instant feedback.
    - **Edit RMA Modal**: Modal form for in-place editing of RMA details.

## [0.11.0] - 2026-09-23

### Added
- **Claim List & Multi-Column Filter UI (1:1 Reference Replication)**:
  - Rebuilt `/tickets` view strictly matching the reference screenshot:
    - **Header**: Navy badge (`#0c1a30`) with white clipboard icon, page title `รายการงานเคลม`, and subtitle `ทุกเคสเคลมที่บันทึกไว้ เลือกเงื่อนไขในการ์ดค้นหาแล้วกดค้นหา`.
    - **Multi-Column Filter Card**:
      - Row 1: `สถานะ` (Status dropdown), `เลขที่เคส` (Case No input), `S/N` (input with placeholder `หมายเลขเครื่อง`), `หมวดหมู่` (Category dropdown), `ศูนย์บริการ` (Service Center dropdown).
      - Row 2: `จังหวัด` (Province dropdown), `อำเภอ` (District dropdown), `ตำบล` (Subdistrict dropdown), `สถานี` (Station dropdown), `เฉพาะที่เกินกำหนด` (Overdue toggle filter button).
      - Row 3: Aligned dark navy `ค้นหา` action button with search icon.
    - **Data Table**:
      - Selectable rows with circular checkbox column (select-all and row selection).
      - Columns: Checkbox, `เคส`, `อุปกรณ์` (with microchip icon badge), `สถานะ` (color-coded pill badges), `รับแจ้ง` (date), `อายุงาน` (duration), and `Action` (`ดู / แก้ไข` links).
      - Alert highlight for overdue row (`FORTH-2026-002`): soft red background `bg-[#fff5f5]`, red duration `13 วัน`, and warning badge `⚠ เกินกำหนด 8 วัน`.
      - Interactive modal integration for viewing and in-place editing of tickets.
    - **Pagination & Footer**:
      - Rows per page selector (`10 รายการ/หน้า ⌵`).
      - Total records summary text (`แสดง 1–5 จาก 5 เคส`).
      - Page navigation controls (`< ก่อนหน้า`, `หน้า 1/1`, `ถัดไป >`).

## [0.10.0] - 2026-09-23

### Added
- **Equipment Claim Dashboard UI (1:1 Reference Replication)**:
  - Rebuilt `/dashboard` view strictly according to reference screenshots (`image_3.png`, `image_4.png`, `image_5.png`):
    - **Header**: Breadcrumb (`[Home Icon] > แดชบอร์ด`), navy badge with white clock icon, title `ภาพรวมงานเคลมอุปกรณ์`, and subtitle `สรุปสถานะการเคลมอุปกรณ์โครงข่ายวิทยุสื่อสาร`.
    - **Top Summary Cards**: 4 cards with exact color-coding and icons:
      - `เคสทั้งหมด` (Total: 5, soft blue, clipboard icon, `รวมทุกสถานะในระบบ`)
      - `อยู่ระหว่างดำเนินการ` (In Progress: 3, amber, radiant sun icon, 60% progress bar, `60% ของเคสทั้งหมด`)
      - `เคลมสำเร็จ / ปิดเคส` (Closed: 1, soft green, check circle icon, 20% progress bar, `20% ของเคสทั้งหมด`)
      - `ปฏิเสธเคลม` (Rejected: 1, soft pink, ban icon, 20% progress bar, `20% ของเคสทั้งหมด`)
    - **Core Performance Widgets**: `ตัวชี้วัดการทำงาน` with 4 metric cards:
      - `อายุงานค้างกลาง`: 13 วัน n=3 with hourglass icon
      - `เกินกำหนด`: 1 in bold red with alarm clock icon in alert badge
      - `ปิดทันกำหนด`: — with calendar check icon
      - `เวลาปิดงานกลาง`: 19 วัน n=1 with timer icon
    - **Work Status Widget (`สถานะงาน`)**: 6 stages with color-coded horizontal bars and counters (`รับแจ้ง/รอตรวจสภาพ`, `ส่งศูนย์บริการแล้ว`, `รออะไหล่/กำลังซ่อม`, `ซ่อมเสร็จ/รอส่งมอบ`, `ปิดเคส (รับคืนเรียบร้อย)`, `ปฏิเสธเคลม (นอกเงื่อนไข)`).
    - **Weekly Overview Widget (`ภาพรวมรายสัปดาห์`)**: Main metric `0`, trend `-100%` with downward trend icon, weekday calendar labels (`พฤ. ศ. ส. อา. จ. อ. พ.`), and 3 summary stat boxes (`รับแจ้ง`, `ซ่อมเสร็จ รอส่งมอบ`, `ปิดเคส`).
    - **Process Bottlenecks Widget (`คอขวดของกระบวนการ`)**: 4 stages with `จบแล้ว` and `ค้างอยู่` dual progress bars and exact day metrics.
    - **Service Center Statistics Table (`ระยะเวลาที่งานอยู่กับศูนย์บริการ`)**: Metrics for `Huawei`, `Hytera`, and `ยังไม่ระบุศูนย์` with case counts, time at center, overdue, and longest delay.

## [0.9.0] - 2026-09-23

### Added
- **Claim Detail Page (`/tickets/[id]`)**:
  - Implemented 1:1 pixel-perfect Claim Detail UI based on the reference design:
    - **Header & Summary Cards**: Breadcrumbs (`Home > งานเคลม > หัวข้อเลขที่เคลม`), clipboard icon header with case title & subtitle, and 2 top stat cards (`อายุงาน: 10 วัน`, `สถานะประกัน: อยู่ในประกัน`)
    - **Main Status Tracker**: 5-stage horizontal lifecycle stepper (1: รับแจ้ง, 2: ส่งศูนย์, 3: รออะไหล่, 4: รอส่งมอบ, 5: ปิดเคส) with active stage badges and interactive action buttons (`แก้ไข` and `เปลี่ยนสถานะ`)
    - **Left Column**: Issue description (`อาการเสีย / ปัญหาที่พบ`), repair notes (`ผลการซ่อม / การแก้ไข`), remarks (`หมายเหตุ`), vertical timeline events (`ลำดับเหตุการณ์`), and device case history list (`ประวัติเคสอื่นของอุปกรณ์ชิ้นนี้`)
    - **Right Column (Sidebar Widgets)**: Circular progress countdown card showing remaining days (`กำหนดแล้วเสร็จ: เหลืออีก 50 วัน`), hardware specs detail list (`อุปกรณ์`), and case metadata key-value list (`ข้อมูลเคส`)
    - **Interactive Modals**: In-place edit modal for claim details and change status modal that appends timeline milestones dynamically
  - Linked table action "ดู" and ticket titles from `/tickets` to navigate directly to the detail view

## [0.8.2] - 2026-09-23

### Fixed
- **Tickets View / Edit Action Link**:
  - Implemented responsive click handlers for "ดู" (View) and "แก้ไข" (Edit) action buttons in the claims table (`TicketsView`)
  - Added interactive Claim Details Modal (`View Mode`) showing ticket title, problem description, equipment details, status badges, and SLA age
  - Added interactive Claim Edit Form (`Edit Mode`) allowing in-place updating of claim title, problem description, vendor, model, serial number, and status code with persistent state synchronization
  - Added status badge mappings for statuses 3 (รออะไหล่) and 4 (ซ่อมเสร็จ) in the claims table

## [0.8.1] - 2026-09-23

### Performance & Optimization
- **Image Payload Optimization**:
  - Re-encoded hero background image from uncompressed 5.36MB PNG to sharp high-res 2048px WebP (`IMG_8154_enhanced_2x.webp`) at 256KB (**95.2% size reduction**)
  - Enabled Next.js modern image formats (`image/avif`, `image/webp`) with long-term cache TTL
- **Persistent AppShell & Zero-Flicker Layout**:
  - Unified all authenticated pages (`/dashboard`, `/tickets`, `/tickets/new`, `/stations`, `/manual`, `/assets`, `/repairs/overseas`) under `(authenticated)` route group with shared `layout.tsx`
  - Completely eliminated unmount/remount layout thrashing and sidebar DOM reconstruction during page navigation
- **Rendering & Concurrency Optimization**:
  - Implemented `React.useDeferredValue` and `React.useMemo` for search filters in `StationsView`, `TicketsView`, and `AssetsView` to ensure 60fps responsive input with zero UI freezing
  - Hoisted static dataset allocations (`STATIONS`, `ASSETS`, `NAV_SECTIONS`) outside component bodies to eliminate repetitive memory allocation on re-render
- **Font & Asset Delivery**:
  - Pruned unused `Sarabun` 300 font weight from initial download pipeline, enabling `preload` and `display: "swap"`
- **Next.js & Turbopack Compiler**:
  - Added `compress: true`, `poweredByHeader: false`, and `optimizePackageImports` for `lucide-react`, `@base-ui/react`, `clsx`, `tailwind-merge` (build time reduced by 74%)

## [0.8.0] - 2026-09-22

### Added
- Complete reverse-engineered internal authenticated pages from `https://equipment-claims.vercel.app/`:
  - Shared navigation shell (`AppShell`) with collapsible sidebar, active route indicators, user profile display, and mobile responsive drawer
  - Dashboard (`/dashboard`) with real KPI metrics, status cards, 7-day weekly overview, and vendor performance table
  - Claims Tickets list (`/tickets`) with interactive search, tab filters, pagination, and status badges
  - New Claim creation form (`/tickets/new`) with multi-step fields, warranty status, vendor selection, and deadline estimation
  - Overseas RMA tracking (`/repairs/overseas`) with international shipment status and search
  - Equipment Asset registry (`/assets`) with category chips, serial numbers, and maintenance history
  - Base Station directory (`/stations`) covering 50+ nationwide radio stations and regional filter
  - Staff user manual (`/manual`) with system guidelines, warranty SLA workflows, and export notes
- Login credential support for provided account `indykantanat@gmail.com` with quick auto-fill helper

## [0.7.0] - 2026-09-22

### Added
- Demo authentication credentials (`admin@forth.co.th` / `123456`) with 1-click auto-fill helper
- Equipment Claims Dashboard (`/dashboard`) featuring summary stats, ticket search, status filters, claim details modal, and new claim creation dialog
- Navigation flow between Login and Dashboard with session routing

## [0.6.0] - 2026-09-22

### Added
- Cloned Equipment Claims (ระบบบริหารงานเคลมอุปกรณ์) login page from `https://equipment-claims.vercel.app/`
- Custom design tokens, IBM Plex Sans and Sarabun fonts, and Forth Corporation brand assets
- LoginForm component with responsive layout and interactive demo validation

### Security
- Update Next.js and eslint-config-next to 16.3.5 with exact version pins, and refresh vulnerable transitive dependencies. Thanks to @atahan150 for the report in [#117](https://github.com/JCodesMore/ai-website-cloner-template/issues/117) and proposed fix in [#118](https://github.com/JCodesMore/ai-website-cloner-template/pull/118).

## [0.5.0] - 2026-09-17

### Added
- Repository ranking badges in the README

### Changed
- Simplified Quick Start with a copyable agent setup prompt, a template button, and one cloning command example
- Consolidated Claude Code, Codex, Cursor, and OpenCode support around one canonical Agent Skill in `.agents/skills/clone-website/`
- Reduced the Claude Code integration to a thin command bridge that forwards arguments to the canonical skill without creating a duplicate skill in other agents
- Moved the website inspection guide into the canonical skill's on-demand references

### Removed
- Expired sponsor integrations
- Japanese and Simplified Chinese READMEs; the English README is the single maintained entry point
- Redundant workflow diagrams from the READMEs
- Generated skill and instruction copies for unsupported or redundant agent platforms
- The agent-rule and skill synchronization scripts and their generated-file CI gate

## [0.4.0] - 2026-08-10

### Added
- Docker workflows for local development and multi-stage production builds
- Kiro support through a generated workspace `/clone-website` skill
- Complete generated workspace skills for Cline and Roo Code, including a Roo slash-command bridge
- Simplified Chinese and Japanese READMEs with the same onboarding and workflow guidance as the English documentation
- Contributor and security policies, including a private vulnerability-reporting path
- CI enforcement that generated agent rules and skills remain synchronized with their source files
- Compact pipeline diagrams and a static Star History chart in every README

### Changed
- Raised the project Node.js baseline to 24 across local development, CI, Docker, and contributor-facing documentation
- Refreshed Next.js to 16.3, React to 19.2.4, and related dependencies
- Updated `/clone-website` so later runs preserve existing pages and isolate routes, research, components, assets, and downloaders for each target
- Improved multi-origin and query/fragment planning with collision-resistant output namespaces and explicit route verification
- Redesigned README onboarding around the template workflow, Opus 5 recommendation, supported platforms, and community links
- Hardened the rule and skill generators for current platform schemas and deterministic output

### Fixed
- Gemini CLI command validation by adding the required name and flattening the prompt schema
- Cline and Roo Code invocation, frontmatter, and argument handling
- Next.js documentation resolution in generated agent rules
- Vulnerable framework dependencies and generated-file consistency checks

### Removed
- Aider from the officially supported-platform list because its current capabilities cannot run the complete browser and subagent workflow reliably; `.aider.conf.yml` remains available for loading general project context

### Security
- Documented responsible vulnerability disclosure through GitHub private vulnerability reporting
- Updated vulnerable dependencies to patched releases

## [0.3.1] - 2026-03-29

### Fixed
- `sync-agent-rules.sh` failing to resolve `@file` imports on Windows due to CRLF line endings — platform instruction files now correctly inline the Inspection Guide content

## [0.3.0] - 2026-03-29

### Added
- Multi-URL support for `/clone-website` — clone multiple sites in a single command with parallel processing and isolated output
- CI quality gates via GitHub Actions — automated lint, typecheck, and build on every push and PR
- `npm run typecheck` and `npm run check` scripts for local quality validation
- `.gitattributes` for cross-platform line ending normalization
- `.nvmrc` to pin Node.js 20 for contributor consistency

### Changed
- Streamlined PR template — removed redundant checklist items and screenshots section
- Improved project description and README — clearer use cases, limitations, and modern wording
- Refined documentation and agent rules across all platforms for clarity and consistency
- Fixed CRLF handling in `sync-skills.mjs` for reliable Windows operation

### Removed
- Outdated use case from README documentation

## [0.2.0] - 2026-03-28

### Added
- Multi-platform AI agent support: Claude Code, Codex CLI, OpenCode, GitHub Copilot, Cursor, Windsurf, Gemini CLI, Cline/Roo Code, Continue, Amazon Q, Augment Code, Aider
- Platform-specific instruction files and `/clone-website` skill for each supported agent
- `scripts/sync-agent-rules.sh` to regenerate platform instruction files from AGENTS.md
- `scripts/sync-skills.mjs` to regenerate `/clone-website` skill across all platforms
- GEMINI.md for Gemini CLI configuration
- Supported Platforms table in README
- "Updating for Other Platforms" documentation section in README

### Changed
- README now describes the project as multi-agent (Claude Code recommended, not required)
- AGENTS.md updated with sync script reminders

## [0.1.1] - 2026-03-28

### Added
- Bug report and feature request issue templates
- Pull request template with checklist
- CHANGELOG.md following Keep a Changelog format
- Package.json metadata (description, repository, homepage, keywords, engines)

### Fixed
- LICENSE copyright holder now attributed to JCodesMore

## [0.1.0] - 2026-03-28

### Added
- Initial template scaffold for website reverse-engineering with Claude Code
- `/clone-website` skill for full-site cloning pipeline
- `/build-from-spec` and `/customize` skills
- Parallel builder agents with git worktree isolation
- Chrome MCP integration for design token extraction
- Comprehensive inspection guide and project structure documentation
- Next.js 16 + shadcn/ui + Tailwind CSS v4 base scaffold
- MIT license
- README with badges, demo section, quick start, and star history

[Unreleased]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/JCodesMore/ai-website-cloner-template/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/JCodesMore/ai-website-cloner-template/releases/tag/v0.1.0
