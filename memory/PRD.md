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

### Gantt Chart & Phase-Based Milestones (Updated Mar 2026)
- **Phase Range Editor**: Define phases with Name, Start, End per wave
- **Half-month precision**: Start/End accept 0.5-step values
- **Overlapping phases supported**: Multiple phases can span the same months
- **Phase-Based Milestones** (replaces old Finish-to-Start dependencies):
  - **Two types**: Payment milestones (amber diamonds) and Marker/freehold milestones (blue diamonds)
  - Payment milestones: linked to phase with Start/Mid/End position
  - **Marker milestones: flexible 0-100% slider positioning** on the phase bar (e.g., Sprint1 at 15%, Sprint2 at 35%, UAT at 70%, Phase Closure at 95%). Step=5.
  - Diamond markers on Gantt chart at computed positions with name labels
  - Inline editor in WaveContent: '+ Payment' and '+ Marker' buttons per phase
  - Full table editor on PaymentMilestones page with separate sections for each type
  - **Total payment % badge** in Phase Milestones header (color-coded: amber <100%, green =100%, red >100%)
  - **Bidirectional sync** through shared `/api/projects/{id}/milestones` endpoint
  - Debounced save (800ms) from inline editor
  - Backward compatible: old milestones without phase_name render in "Unlinked" row
- **Gantt Chart UI**:
  - Wave header rows with bold uppercase names and visual separation
  - Milestones rendered directly on phase bars (no separate summary row)
  - Different colors: amber (#F59E0B) for payment, blue (#3B82F6) for marker
  - Legend distinguishes both milestone types
  - Unlinked milestones shown in dedicated row per wave
- **Collapsible sections**: Phase Ranges + Milestones editor collapse/expand
- Auto-generated Gantt chart from phase_ranges data
- Multi-wave support with start-month offset
- PNG and Excel export for Gantt chart (includes milestones section)

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files
- Wave template download/upload

### Documentation
- User Manual, Support Guide (with Backup/Restore procedures), Tutorials

## Key Data Model
- `ProjectWave.phase_ranges`: `List[dict]` -- `[{name, start_month, end_month}]` (supports 0.5 increments)
- `PaymentMilestone`: `{id, wave_name, milestone_name, milestone_type, phase_name, position, target_month, payment_percentage, payment_amount, description}`
  - `milestone_type`: "payment" (default) | "marker" (freehold, no payment)
  - `phase_name`: Linked phase name (e.g., "Explore")
  - `position`: "start" | "mid" | "end" (payment) OR numeric string "0"-"100" (marker slider)
  - `target_month`: Auto-computed from phase range + position

## File Structure
```
/app/
  backend/
    server.py, models.py
    routers/ (auth, projects, financials, master_data)
  frontend/src/
    components/estimator/
      constants.js, ProjectToolbar.js, ProjectInfoCard.js
      WaveContent.js, GanttCard.js, OverallSummary.js
      EstimatorDialogs.js, ResourceGrid.js, KPICards.js
      WaveSummary.js, LogisticsBreakdown.js, SummaryDialog.js
      index.js
    pages/ (ProjectEstimator, Projects, Dashboard, Cashflow, Milestones, Docs)
    utils/ (estimatorCalcs, excelExport, excelImport, constants)
  memory/PRD.md
```

## Upcoming Tasks (P1)
- PDF Export with Branding
- Client-Facing Shareable View

## Future Tasks (P2+)
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions)
- Actuals Tracking & Profitability Module
- Phase Templates feature

## Credentials
- Admin: admin@yash.com / password
