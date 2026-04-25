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
