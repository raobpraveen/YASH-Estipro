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
- Project archiving, access control (public/restricted), audit logging
- Cascade delete: Project deletion cleans up milestones and activities

### Financial Features
- Payment Terms in Cashflow (shift Cash-In by N days, auto-extend timeline)
- Cumulative Cashflow line chart with break-even analysis
- Payment Milestones with copy-to-wave utility (renamed to "Key Milestones")
- Nego Buffer at wave level

### Gantt Chart & Phase-Based Milestones
- Phase Range Editor with half-month precision
- Payment milestones (amber) and Key milestones (blue, 0-100% slider)
- Gantt Drag-and-Drop: Milestone diamonds draggable along phase bars
- Smart label positioning, Gantt chart PNG export

### Excel Integration
- Formula-based Excel export with color coding
- Smart Import with milestone import/overwrite support
- Milestones, Activities, Cashflow, Gantt Chart sheets in export

### Phase Activities & Deliverables
- Activity Templates Master Data at /activity-templates with Ctrl+S support
- Pre-seeded SAP S/4HANA Private Cloud and Public Cloud templates
- Project Activities Modal with template adoption and wave-specific items

### Documentation
- User Manual (21 sections), Support Guide, Tutorials — all updated
- Back-to-top floating button on all doc pages

### Phase 1 Quick Wins (Completed Apr 2026)
1. Sub Technologies: Parent Technology column moved to first position
2. Sub Technologies: Edit option added (pencil icon, dialog for name change)
3. Base Locations: Edit option added for Overhead % value
4. Activity Templates: Ctrl+S keyboard shortcut for saving
5. Customer Master: Added "Wholesale and Trading" and "Oil and Gas" industry verticals
6. Waves: Total MM adjusted to 2 decimal places
7. Waves: "Marker Milestone" renamed to "Key Milestone" globally
8. Project Info: Version-wise comments are now non-editable for saved projects
9. Documentation: Updated status definitions (Draft, Suspended, Obsolete, Approved, Rejected)
10. Saved Projects: Fixed Unarchive bug (auth token now sent)
11. Saved Projects: Sort by project number (descending)
- Backend: PUT /api/sub-technologies/{id} and PUT /api/base-locations/{id} endpoints added

## Pending Implementation

### Phase 2: Project Information & Filters
12. Customer dropdown with text search
13. Bid Category field (Budgetary, Most Likely, Committed, Won, Loss, None)
14. Forecasted Closure Date field (date picker)
15. Competency field with dropdown + new master data
16. Dashboard: Filter by project locations and sales manager
17. Saved Projects: Status filter
18. Saved Projects: Totals for Selling Price, Nego Buffer, Final Price

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
- WRICEF Tracker
- Scope Definition Module
- Integration Matrix
- Risk Register
- AI Integration (Estimation Suggestions, RFP Parser)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
