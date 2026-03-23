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
- Phase Range Editor with half-month precision
- Payment milestones (amber diamonds, Start/Mid/End) and Marker milestones (blue diamonds, 0-100% slider)
- Smart label positioning (stacking overlapping labels)
- Inline editor in WaveContent + full table editor on PaymentMilestones page
- **NEW: Gantt Drag-and-Drop** — Milestone diamonds draggable along phase bars. Payment milestones snap to start/mid/end, marker milestones get 0-100% position.
- Gantt chart PNG export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files with milestone preservation on version creation
- **NEW: Milestones Excel Sheets** — Each wave gets a dedicated "Milestones" sheet in the export showing payment milestones (with %, amounts, totals) and marker milestones with summary.

### Phase Activities & Deliverables (NEW)
- **Master Templates**: Define reusable activity/deliverable templates per project type and phase
- **Per-Project Override**: Adopt templates and customize per project/wave/phase
- **Activities Modal**: Accessible from toolbar, with Project Activities and Manage Templates tabs
- **Backend API**: `/api/activity-templates` for template CRUD, `/api/projects/{id}/activities` for project-specific activities
- Separate sections for Activities and Deliverables with collapsible UI

### Documentation
- User Manual, Support Guide (with Backup/Restore), Tutorials

## Bug Fixes (Feb 2026)
- Fixed: `crypto.randomUUID()` fallback for non-HTTPS environments
- Fixed: Milestone copying on new version creation (UI and Excel import paths)
- Fixed: Excel Import erasing milestones — inline milestone copy with wave name mapping
- Fixed: Ctrl+S on PaymentMilestones not saving Payment Terms — useRef pattern

## Key Data Model
- `PaymentMilestone`: `{id, wave_name, milestone_name, milestone_type, phase_name, position, target_month, payment_percentage, payment_amount, description}`
- `ActivityItem`: `{id, name, description, is_deliverable, owner, sort_order}`
- `PhaseActivityTemplate`: `{id, project_type_id, project_type_name, phase_name, activities[]}`
- `ProjectPhaseActivities`: `{project_id, wave_name, phase_name, activities[], adopted_from_template_id}`

## Upcoming Tasks
- PDF Export with Branding
- Client-Facing Shareable View

## Future Tasks (P2+)
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
