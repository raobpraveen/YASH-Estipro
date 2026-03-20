# YASH EstPro - Product Requirements Document

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with wave-based estimation, dynamic monthly phases, editable resource definitions, project & version management, approval workflows, analytics dashboard, and role-based access control.

## Architecture
- **Frontend**: React + Shadcn UI + Recharts + ExcelJS + html-to-image + @hello-pangea/dnd
- **Backend**: FastAPI + MongoDB (PyMongo)
- **Auth**: JWT-based with role-based access control

## What's Been Implemented (as of Feb 2026)

### Core Features
- Wave-based estimation grid with dynamic monthly phases
- Editable resource definitions (Skill, Level, Location) with auto salary lookups
- Project & version management (CRUD, versioning, cloning, comments, read-only states)
- Approval workflow (Draft, In Review, Approved, Rejected, Superseded, Obsolete)
- Dashboard with analytics and filtering
- Version comparison screen
- Project archiving functionality
- Access control (public/restricted)
- Audit logging

### Financial Features
- Payment Terms in Cashflow (shift Cash-In by N days, auto-extend timeline)
- Cumulative Cashflow line chart with break-even analysis
- Payment Milestones with copy-to-wave utility
- Nego Buffer at wave level

### Gantt Chart
- Per-month phase assignment dropdowns (Prepare, Explore, Realize, Deploy, etc.)
- Auto-generated staircase/waterfall Gantt chart
- Multi-wave support with start-month offset
- PNG and Excel export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files
- Wave template download/upload

### Documentation
- User Manual (comprehensive, all features)
- Support Guide (technical, API reference)
- Tutorials (step-by-step interactive guides)

## P1 Refactoring (Completed Feb 2026)
**ProjectEstimator.js** refactored from 3510 → 2020 lines (42% reduction):
- `ProjectToolbar.js` (181 lines) — Header bar, action buttons, workflow controls
- `ProjectInfoCard.js` (276 lines) — Collapsible project info form
- `WaveContent.js` (788 lines) — Wave grid, logistics breakdown, wave summary
- `constants.js` (19 lines) — Shared STATUS_CONFIG, PROFICIENCY_LEVELS, GROUP_COLORS
- All state/handlers remain in `ProjectEstimator.js` for single source of truth

## File Structure
```
/app/
├── backend/
│   ├── server.py
│   ├── models.py
│   └── routers/
│       ├── auth.py
│       ├── projects.py
│       ├── financials.py
│       └── master_data.py
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── estimator/
│       │   │   ├── constants.js
│       │   │   ├── ProjectToolbar.js
│       │   │   ├── ProjectInfoCard.js
│       │   │   ├── WaveContent.js
│       │   │   ├── GanttCard.js
│       │   │   ├── OverallSummary.js
│       │   │   ├── EstimatorDialogs.js
│       │   │   ├── ResourceGrid.js
│       │   │   ├── KPICards.js
│       │   │   ├── WaveSummary.js
│       │   │   ├── LogisticsBreakdown.js
│       │   │   ├── SummaryDialog.js
│       │   │   └── index.js
│       │   ├── SearchableSelect.js
│       │   └── ui/ (shadcn)
│       ├── pages/
│       │   ├── ProjectEstimator.js (2020 lines, refactored)
│       │   ├── Projects.js
│       │   ├── Dashboard.js
│       │   ├── CashflowStatement.js
│       │   ├── PaymentMilestones.js
│       │   ├── UserManual.js
│       │   ├── SupportGuide.js
│       │   └── Tutorials.js
│       └── utils/
│           ├── estimatorCalcs.js
│           ├── excelExport.js
│           ├── excelImport.js
│           └── constants.js
└── memory/
    └── PRD.md
```

## Upcoming Tasks (P2)
- PDF Export with Branding
- Client-Facing Shareable View
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
