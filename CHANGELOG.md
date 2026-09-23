# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
