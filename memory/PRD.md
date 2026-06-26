# YASH EstPro - Product Requirements Document

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with wave-based estimation, dynamic monthly phases, editable resource definitions, project & version management, approval workflows, analytics dashboard, and role-based access control.

## Architecture
- **Frontend**: React + Shadcn UI + Recharts + ExcelJS + html-to-image + @hello-pangea/dnd
- **Backend**: FastAPI + MongoDB (PyMongo)
- **Auth**: JWT-based with role-based access control

## What's Been Implemented

### Core Features
- Wave-based estimation grid with dynamic monthly phases
- Editable resource definitions with auto salary lookups
- Project & version management (CRUD, versioning, cloning, comments, read-only states)
- Approval workflow, Dashboard, Version comparison, Archiving, Audit logging, Cascade delete

### Financial Features
- Payment Terms in Cashflow, Cumulative chart with break-even, Key Milestones, Nego Buffer

### Gantt Chart & Milestones
- Phase Range Editor, Payment + Key milestones, Drag-and-Drop, PNG export

### Excel Integration
- Formula-based export with Milestones, Activities, Cashflow, Gantt sheets
- Smart Import with milestone re-import

### Phase Activities & Deliverables
- Activity Templates Master Data with Ctrl+S, SAP seed templates, Project Activities Modal

### Phase 1 Quick Wins (Completed Apr 2026)
1-11: Sub Tech edit/reorder, Base Location edit, Ctrl+S, Industry verticals, 2 decimal MM, Key Milestones rename, Version notes lock, Status definitions, Unarchive fix, Sort by project number

### Phase 2: Project Information & Filters (Completed Apr 2026)
12. Customer searchable dropdown (Popover combobox)
13. Bid Category field (always editable, Budgetary excluded from dashboard)
14. Forecasted Closure Date (date picker)
15. Competency multi-select + Competencies master data CRUD page
16. Dashboard: Location filter from actual project data
17. Projects: Status filter
18. Projects: Totals row (Man-Months, Selling Price, Nego Buffer, Final Price)

### Phase 3: Wave Grid Enhancements (Completed Apr 2026)
19. Wave include/exclude toggle from overall summary pricing
20. Floating "Add Resource Row" button at bottom of grid
21. Grid freeze panes — first 6 columns (Skill→Travel) sticky with shadow separator
22. Resource list filtered by project's selected Technologies
23. Split month allocation dialog (supports "M1-M3:1, M4-M5:0.5, M6:0" ranges)
24. Payment milestones linked to Target Month (Position column removed, auto-derived)

### Phase 4: Status & Workflow (Completed Apr 2026)
25. Retain Approved status on new version creation (`previous_status` tracking, "Suspended (was Approved)" UI label)
26. Commercial status tracking (separate field, post-approval; 5 options)
27. Milestone totals exclude previous versions (latest-only filter)
28. Excel Export/Import: Add Technology column

### Phase 5: Security & Cashflow (Completed Apr 2026)
29. Session timeout — 15 min idle auto-logout with 2-min warning dialog (`useIdleTimeout` hook, AlertDialog with countdown, "Stay signed in" / "Sign out now" actions)
30. Advance payment milestone indicator — `is_advance` flag on PaymentMilestone, Advance checkbox in milestone editor, purple summary card in Cashflow when `total_advance > 0`, row highlights + "ADV" badges in per-wave and combined monthly tables

### Iteration 56: Phase 1-4 User-Reported Fixes Batch (Completed Apr 2026)
31. "Add Row" button moved from floating sticky-bottom to right after wave grid (before logistics); now adds blank row (no dialog)
32. Inline grid Skill dropdown filtered by project's selected Technologies (matching skill.technology_id)
33. Wave grid `<thead>` made sticky (top + left two-axis); container max-h:70vh with overflow-auto
34. Per-wave collapse/expand toggle for Phase Milestones subsection (independent of Phase Ranges toggle)
35. Bug fix: split-allocation parser ("M1-M3:1, M4-M5:2, M6:1") now uses index keys consistent with phase_allocations storage
36. Default month-column headers changed from "Month 1, Month 2..." to "M1, M2..."
37. Removed "Won" and "Loss" from Bid Category options (they belong on Commercial Status post-approval)
38. Projects list filters: added Bid Category, Competency, Forecasted Closure date range (from / to)
39. Bid Category & Forecasted Closure Date stay editable even when project is locked (read-only states)
40. Bug fix: Advance payment milestones bypass payment_terms_days offset — cash-in posted at same target_month

### Iteration 57: Salary Formulas + AMS Engagement Types (Completed Jun 2026)
41. $/Month cell accepts arithmetic expressions: `3200`, `3200+500`, `3200-200`, `3200*2`, `3200/100`, plus `3200*25%` (= 4000), `3200+25%` (= 4000), `3200-25%` (= 2400). New `/utils/salaryExpression.js` evaluator (13/13 unit tests pass). Inline `SalaryExpressionInput` component with blur/Enter commit, Escape revert, toast on invalid.
42. Phase Range inputs step/min reduced to 0.25 (was 0.5). Timeline bar render: when `start_month < 1`, bar snaps to left edge of M1 (position 0%); legacy values ≥1 keep their convention.
43. AMS Engagement Types: new `engagement_type` field on Wave model — `Implementation` (default), `AMS_Shared`, `AMS_Dedicated`, `AMS_Mix`. New `AmsSharedBucket` model: `{name, hours_per_month, hourly_rate, notes}` + `ams_contract_months` (default 12).
44. New `AmsSharedPanel.js` component with service-bucket CRUD table. Per-bucket Billing/Month + Billing/Year, totals row. Free-text bucket names (no master data per user choice).
45. WaveContent.js conditionally renders: AMS_Shared hides Phase Ranges + Resource Grid + Logistics (shared-only); AMS_Mix shows AmsSharedPanel above resource grid; AMS_Dedicated/Implementation unchanged.
46. Cashflow API (`/api/projects/{id}/cashflow`) — new `summary.total_ams_shared`, per-wave `total_ams_shared`, per-month `ams_shared_revenue`. AMS shared waves bypass payment-terms offset and have no internal cost; AMS_Shared waves auto-extend `wave_monthly` to `ams_contract_months`.
47. Add Wave dialog: new `Engagement Type` dropdown at top + conditional `Contract Length (Months)` input when engagement_type starts with `AMS_`.

## Pending Implementation

(Awaiting user-compiled list of UI/logic issues from Phases 1-4)

### Future Tasks (Roadmap)
- PDF Export with Branding
- Client-Facing Shareable View
- Proposal Auto-Generation (Word/PPT)
- WRICEF Tracker, Scope Definition Module, Integration Matrix, Risk Register
- AI Integration (Estimation Suggestions, RFP Parser)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
