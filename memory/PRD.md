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

### Gantt Chart & Phase-Based Milestones
- **Phase Range Editor**: Define phases with Name, Start, End per wave (half-month precision)
- **Phase-Based Milestones** (replaces old Finish-to-Start dependencies):
  - **Two types**: Payment milestones (amber diamonds, Start/Mid/End) and Marker/freehold milestones (blue diamonds, 0-100% slider)
  - Marker slider: flexible positioning anywhere on the phase bar
  - **Smart label positioning**: Nearby milestones grouped & stacked vertically
  - **Total payment % badge**: Reactive to wave price changes, color-coded
  - Inline editor in WaveContent with '+ Payment' and '+ Marker' buttons per phase
  - Full table editor on PaymentMilestones page with separate sections per type
  - **Bidirectional sync** through shared `/api/projects/{id}/milestones` endpoint
  - Debounced save (800ms) from inline editor
- **Gantt Chart UI**: Wave header rows, milestones on phase bars, dynamic row height, legend
- Auto-generated Gantt chart, PNG and Excel export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files (with milestone preservation on version creation)

### Documentation
- User Manual, Support Guide (with Backup/Restore), Tutorials

## Bug Fixes (Feb 2026)
- **Fixed**: `crypto.randomUUID()` fallback for non-HTTPS environments
- **Fixed**: Milestone copying on new version creation (UI and Excel import paths)
- **Fixed**: Excel Import erasing milestones — inline milestone copy with wave name mapping in `confirmSmartImport`
- **Fixed**: Ctrl+S on PaymentMilestones not saving Payment Terms — useRef pattern to avoid stale closure

## Key Data Model
- `PaymentMilestone`: `{id, wave_name, milestone_name, milestone_type, phase_name, position, target_month, payment_percentage, payment_amount, description}`
  - `milestone_type`: "payment" | "marker" (freehold)
  - `position`: "start"|"mid"|"end" (payment) OR "0"-"100" numeric string (marker slider)

## Upcoming Tasks (P1)
- Milestone Excel Export: Add a "Milestones" sheet to each wave's Excel export
- Gantt Drag-and-Drop: Allow users to drag milestone diamonds on the Gantt chart
- Phase Activities & Deliverables: Master data system for phase-specific activities/deliverables

## Future Tasks (P2+)
- PDF Export with Branding
- Client-Facing Shareable View
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
