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
- **Cascade delete**: Project deletion cleans up milestones and activities

### Financial Features
- Payment Terms in Cashflow (shift Cash-In by N days, auto-extend timeline)
- Cumulative Cashflow line chart with break-even analysis
- Payment Milestones with copy-to-wave utility
- Nego Buffer at wave level

### Gantt Chart & Phase-Based Milestones
- Phase Range Editor with half-month precision
- Payment milestones (amber diamonds, Start/Mid/End) and Marker milestones (blue diamonds, 0-100% slider)
- Gantt Drag-and-Drop: Milestone diamonds draggable along phase bars
- Smart label positioning (stacking overlapping labels)
- Gantt chart PNG export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import from Excel files with milestone preservation
- **Milestones Excel Sheets**: Per-wave sheets with formula-based Amount (=FinalPrice*Pct), type tags, metadata for import
- **Milestone Import**: parseMilestoneSheet parses milestone sheets from Excel, overwrites on reimport
- **Activities Excel Sheets**: Per-wave sheets with template + wave-specific activities/deliverables
- **Separate Activities Export**: Dedicated Excel export from Activities modal

### Phase Activities & Deliverables
- **Activity Templates Master Data** (sidebar page at /activity-templates):
  - Key: Technology + Sub-Technology + Project Type + Phase
  - Pre-seeded SAP S/4HANA Private Cloud Implementation template (6 SAP Activate phases)
  - Template phases shown from master data, not wave-level phases
- **Project Activities Modal** (from estimator toolbar):
  - Multi-phase selection with bulk adopt from templates
  - Wave-dependent activities (additive to template items)
  - Per-phase editing with template + wave-specific sections

### Documentation
- User Manual, Support Guide (with Backup/Restore), Tutorials

## Bug Fixes (Feb 2026)
- Fixed: `crypto.randomUUID()` fallback for non-HTTPS environments
- Fixed: Milestone copying on new version creation (UI and Excel import paths)
- Fixed: Excel Import erasing milestones — inline milestone copy with wave name mapping
- Fixed: Ctrl+S on PaymentMilestones not saving Payment Terms — useRef pattern
- Fixed: Activities modal showing wave phases instead of template phases
- Fixed: Cascade delete — project deletion now cleans up milestones and activities

## Key Data Model
- `PaymentMilestone`: `{id, wave_name, milestone_name, milestone_type, phase_name, position, target_month, payment_percentage, payment_amount, description}`
- `ActivityTemplate`: `{id, technology_id, sub_technology_id, project_type_id, phase_name, activities[]}`
- `ProjectPhaseActivities`: `{project_id, wave_name, phase_name, activities[], wave_activities[], adopted_from_template_id}`

## Upcoming Tasks
- PDF Export with Branding
- Client-Facing Shareable View

## Future Tasks (P2+)
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
