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
- Editable resource definitions (Skill, Level, Location) with auto salary lookups
- Project & version management (CRUD, versioning, cloning, comments, read-only states)
- Approval workflow (Draft, In Review, Approved, Rejected, Suspended, Obsolete)
- Dashboard with analytics and filtering
- Version comparison screen
- Project archiving, access control, audit logging, cascade delete

### Financial Features
- Payment Terms in Cashflow, Cumulative line chart with break-even
- Payment Milestones (renamed to "Key Milestones"), Nego Buffer

### Gantt Chart & Milestones
- Phase Range Editor, Payment + Key milestones, Drag-and-Drop, PNG export

### Excel Integration
- Formula-based export with Milestones, Activities, Cashflow, Gantt sheets
- Smart Import with milestone re-import

### Phase Activities & Deliverables
- Activity Templates Master Data (Ctrl+S shortcut), SAP seed templates
- Project Activities Modal with template adoption

### Phase 1 Quick Wins (Completed Apr 2026)
1. Sub Technologies: Parent Technology first + Edit option
2. Base Locations: Edit Overhead %
3. Activity Templates: Ctrl+S shortcut
4. Customer Master: Added "Wholesale and Trading" & "Oil and Gas"
5. Waves: Total MM → 2 decimal places
6. "Marker Milestone" → "Key Milestone" globally
7. Version notes non-editable for saved projects
8. Status definitions updated in docs
9. Unarchive bug fixed (auth token)
10. Projects sorted by project number (descending)
11. Backend PUT endpoints for sub-technologies and base-locations

### Phase 2 Project Information & Filters (Completed Apr 2026)
12. Customer dropdown with text search (Popover combobox)
13. Bid Category field (Budgetary, Most Likely, Committed, Won, Loss, None) — always editable, Budgetary excluded from dashboard
14. Forecasted Closure Date (date picker)
15. Competency field (multi-select) + new Competencies master data page with CRUD
16. Dashboard: Location filter from actual project data (not hardcoded COUNTRIES)
17. Saved Projects: Status filter (Draft, In Review, Approved, Rejected, Suspended, Obsolete)
18. Saved Projects: Totals row for Man-Months, Selling Price, Nego Buffer, Final Price
- Backend: CRUD /api/competencies, GET /api/dashboard/project-locations
- Dashboard analytics now excludes Budgetary projects

## Pending Implementation

### Phase 3: Wave Grid Enhancements
19. Toggle wave include/exclude from summary
20. Floating "Add Row" button
21. Split grid into 2 windows (freeze panes)
22. Filter resources by Technology
23. Split month allocation (ramp up/down: M1-M3:1, M4-M5:2)
24. Payment milestones linked to target month

### Phase 4: Status & Workflow
25. Retain Approved status on new version creation
26. Commercial status tracking (separate field, post-approval)
27. Milestone totals exclude previous versions
28. Excel Export: Add Technology column

### Phase 5: Security & Cashflow
29. Session timeout (15 min idle)
30. Advance payment milestone indicator in cashflow

### Future Tasks (Roadmap)
- PDF Export with Branding
- Client-Facing Shareable View
- Proposal Auto-Generation (Word/PPT)
- WRICEF Tracker, Scope Definition Module, Integration Matrix, Risk Register
- AI Integration (Estimation Suggestions, RFP Parser)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
