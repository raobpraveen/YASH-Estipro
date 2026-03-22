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
- Approval workflow (Draft, In Review, Approved, Rejected, Superseded, Obsolete)
- Dashboard with analytics and filtering
- Version comparison screen
- Project archiving, access control (public/restricted), audit logging

### Financial Features
- Payment Terms in Cashflow (shift Cash-In by N days, auto-extend timeline)
- Cumulative Cashflow line chart with break-even analysis
- Payment Milestones with copy-to-wave utility
- Nego Buffer at wave level

### Gantt Chart & Phase Ranges (Updated Feb 2026)
- **Phase Range Editor**: Define phases with Name, Start Month, End Month per wave
- **Overlapping phases supported**: Multiple phases can span the same months (full-month granularity)
- **Timeline Preview**: Visual bar chart in the Phase Range Editor showing all phases with color-coded overlaps
- Auto-generated Gantt chart from phase_ranges data
- Multi-wave support with start-month offset
- PNG and Excel export for Gantt chart
- **Excel Export**: Phase ranges included per wave sheet + dedicated Gantt Chart sheet with colored bars
- **Excel Import**: Parses phase ranges from wave sheets, skips Gantt Chart sheet
- Backward compatibility: Legacy month_phases auto-convert to phase_ranges on load

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files
- Wave template download/upload

### Documentation
- User Manual, Support Guide, Tutorials (all updated for phase ranges)

## P1 Refactoring (Completed Feb 2026)
**ProjectEstimator.js** refactored from 3510 → 2029 lines (42% reduction):
- `ProjectToolbar.js` — Header bar, action buttons, workflow controls
- `ProjectInfoCard.js` — Collapsible project info form
- `WaveContent.js` — Wave grid, phase range editor, logistics breakdown, wave summary
- `constants.js` — Shared constants (STATUS_CONFIG, PHASE_COLORS, PHASE_OPTIONS, etc.)

## Key Data Model
- `ProjectWave.phase_ranges`: `List[dict]` — `[{name: str, start_month: int, end_month: int}]`
- `ProjectWave.month_phases`: `List[str]` — Legacy field, auto-converted to phase_ranges
- `ProjectWave.wave_start_month`: `int` — Offset for multi-wave timeline

## File Structure
```
/app/
├── backend/
│   ├── server.py, models.py
│   └── routers/ (auth, projects, financials, master_data)
├── frontend/src/
│   ├── components/estimator/
│   │   ├── constants.js, ProjectToolbar.js, ProjectInfoCard.js
│   │   ├── WaveContent.js, GanttCard.js, OverallSummary.js
│   │   ├── EstimatorDialogs.js, ResourceGrid.js, KPICards.js
│   │   ├── WaveSummary.js, LogisticsBreakdown.js, SummaryDialog.js
│   │   └── index.js
│   ├── pages/ (ProjectEstimator, Projects, Dashboard, Cashflow, Milestones, Docs)
│   └── utils/ (estimatorCalcs, excelExport, excelImport, constants)
└── memory/PRD.md
```

## Upcoming Tasks (P2)
- PDF Export with Branding
- Client-Facing Shareable View
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
