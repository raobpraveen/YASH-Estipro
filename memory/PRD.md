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
- Payment milestones (amber) and Marker milestones (blue, 0-100% slider)
- Gantt Drag-and-Drop: Milestone diamonds draggable along phase bars
- Smart label positioning, Gantt chart PNG export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import with milestone import/overwrite support
- **Milestones Sheets**: Per-wave with formula Amount (=FinalPrice*Pct), type tags
- **Activities Sheets**: Per-wave with template + wave-specific items
- **Cashflow Sheet**: Monthly data with Cash-Out, Cash-In, Net, Cumulative, wave breakdown
- Cashflow and Activities sheets skipped during import

### Phase Activities & Deliverables
- **Activity Templates Master Data** (sidebar page at /activity-templates):
  - Key: Technology + Sub-Technology + Project Type + Phase
  - Excel download and upload for easy data entry
  - Pre-seeded templates:
    - SAP S/4HANA + Private Cloud + Implementation (6 SAP Activate phases)
    - SAP S/4HANA + Public Cloud + Implementation (6 SAP Activate phases)
- **Project Activities Modal** (from estimator toolbar):
  - Template phases from master data (not wave phases)
  - Multi-phase selection with bulk adopt from templates
  - Wave-dependent activities (additive to template items)
  - Dedicated Activities Excel export

### Documentation (Updated Feb 2026)
- **User Manual**: Comprehensive 21-section manual covering all features including Activity Templates (Section 21), Gantt drag-and-drop (14.4), Milestone re-import (13.2), cascade delete (3.5), and updated Excel export sheets (8.2)
- **Support Guide**: Updated with activities.py router in architecture, activity_templates/project_activities collections, activity template API endpoints, troubleshooting entries, and FAQ additions
- **Tutorials**: Added Activity Templates tutorial (10 steps, Administration category), updated Excel Export tutorial to cover new sheets

## Bug Fixes (Feb 2026)
- Fixed: `crypto.randomUUID()` fallback for non-HTTPS environments
- Fixed: Milestone copying on version creation
- Fixed: Excel Import erasing milestones
- Fixed: Ctrl+S on PaymentMilestones not saving Payment Terms
- Fixed: Activities modal showing wave phases instead of template phases
- Fixed: Cascade delete for orphan data cleanup
- Fixed: Activities not appearing in Excel export (apiHeaders scope bug)

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
- Refactor global shortcut handling to React Context

## Credentials
- Admin: admin@yash.com / password
