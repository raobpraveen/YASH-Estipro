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
- **Phase Range Editor**: Define phases with Name, Start, End per wave (half-month precision)
- **Phase-Based Milestones** (replaces old Finish-to-Start dependencies):
  - **Two types**: Payment milestones (amber diamonds, Start/Mid/End) and Marker/freehold milestones (blue diamonds, 0-100% slider)
  - Marker slider: flexible positioning anywhere on the phase bar (e.g., Sprint1 at 15%, UAT at 70%)
  - **Smart label positioning**: Nearby milestones grouped & stacked vertically; labels placed LEFT of diamond when near right edge (>70%), RIGHT when near left edge (<15%), otherwise centered
  - **Total payment % badge**: Reactive to wave price changes, color-coded (amber <100%, green =100%, red >100%)
  - Inline editor in WaveContent: '+ Payment' and '+ Marker' buttons per phase
  - Full table editor on PaymentMilestones page with separate sections per type
  - **Bidirectional sync** through shared `/api/projects/{id}/milestones` endpoint
  - Debounced save (800ms) from inline editor
  - Backward compatible: old milestones without phase_name render in "Unlinked" row
- **Gantt Chart UI**:
  - Wave header rows with bold uppercase names and visual separation
  - Milestones rendered directly on phase bars with name labels beside diamonds
  - Dynamic row height (grows with stacked label count)
  - Legend distinguishes Payment vs Marker milestone types
- Auto-generated Gantt chart, PNG and Excel export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files

### Documentation
- User Manual, Support Guide (with Backup/Restore), Tutorials

## Key Data Model
- `PaymentMilestone`: `{id, wave_name, milestone_name, milestone_type, phase_name, position, target_month, payment_percentage, payment_amount, description}`
  - `milestone_type`: "payment" | "marker" (freehold)
  - `position`: "start"|"mid"|"end" (payment) OR "0"-"100" numeric string (marker slider)

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
