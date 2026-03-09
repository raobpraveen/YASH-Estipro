# YASH EstPro - Project Cost Estimator

## Product Overview
A comprehensive IT/Software Project estimation tool for YASH Technologies. Supports wave-based estimation with dynamic monthly phases, editable resource definitions, cost calculations, versioning, approval workflows, and Excel export.

## Core Requirements
- **Wave-based Estimation Grid**: Dynamic monthly phases, editable resources (Skill, Level, Location) with auto salary lookups
- **Cost Calculation**: Base Cost, Overheads, CTC, Profit Margin, Selling Price, Logistics, Override $/Hr
- **Project & Version Management**: Full lifecycle with versioning, cloning, version comments
- **Workflow**: Draft > In Review > Approved > Rejected > Suspended > Obsolete
- **Master Data**: Full CRUD for Skills, Locations, Technologies, Customers, Proficiency Rates, etc.
- **Dashboard & Analytics**: KPIs, charts, filtering
- **Excel Export**: Formula-powered with color coding, color legend, and override support
- **Excel Smart Import**: Re-import EstiPro-exported Excel files with auto-creation of missing master data, logistics parsing, and "Import as New Version" capability
- **Authentication**: JWT-based with role-based access (Admin, Approver, User)
- **Documentation**: In-app User Manual and Support Guide
- **Version Comparison**: Field-level diff between any two versions + automated change history log

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: Python FastAPI
- **Database**: MongoDB
- **Deployment**: Docker + Docker Compose + Nginx

## Credentials
- Email: admin@yash.com / Password: password

## What's Been Implemented
### Core Features (Complete)
- JWT Authentication & Role-based access control
- Project CRUD with versioning
- Wave-based estimation grid with drag-and-drop
- Searchable dropdowns for Skill, Level, Location
- Auto salary lookup from proficiency rates
- Cost calculations (Salary, Overhead, CTC, Selling Price)
- Logistics configuration per wave
- Formula-powered Excel export with color coding & color legend
- Quick Estimate Calculator
- Dashboard ("Estimations Overview") with analytics & charts
- Notification system (in-app + email)
- Audit logs
- Master data management (Skills, Locations, Customers, Technologies, Project Types, Sales Managers, Proficiency Rates)
- User management (admin)
- Project cloning & archiving
- Settings & profile

### Recent Additions (March 2026)
- Resource Group ID feature with grid coloring
- Frozen columns (first 5 + $/Month) for grid navigation
- CTC Analytics cards
- User Manual & Support Guide pages
- Custom Selling Price Override (Ovr $/Hr)
- Smart Import with logistics parsing and "Import as New Version"
- Suspended & Obsolete project statuses
- Mark Obsolete button with confirmation dialog
- Auto-obsolete Draft versions on approval

### Latest Additions (March 9, 2026)
- **Version Comparison (Field-Level Diff)**: Complete rewrite of CompareVersions.js with:
  - Summary banner showing total changes, header/resource/allocation/logistics counts
  - Header diff table (profit margin, nego buffer, customer, technologies, locations, etc.)
  - Wave-by-wave diff with expandable sections
  - Resource-level diff showing added/removed/modified resources
  - Cell-level allocation diff (Phase X: 1.0 → 0.5)
  - Logistics config diff per wave
  - Unchanged resources hidden with count
- **Change History (Audit Log)**: Auto-records every save with detailed field-level diffs
  - Stored in `change_logs` MongoDB collection
  - Accessible via "Change History" tab on the comparison page
  - Shows timestamp, user, version, expandable details
  - Backend API: GET /api/change-logs/{project_number}
- **Excel Export Fix**: Replaced client-side blob download with backend download proxy (POST buffer → GET with Content-Disposition)

## Backend API Endpoints (Key)
- POST /api/download-file → Upload file buffer, returns download_id
- GET /api/download-file/{download_id} → Serve file as HTTP download
- GET /api/projects/compare-detail?v1={id}&v2={id} → Field-level diff
- GET /api/change-logs/{project_number} → Change history
- PUT /api/projects/{project_id}/obsolete → Mark project obsolete

## Prioritized Backlog
### P1 - Upcoming
- What-If Scenario Comparison (plan in /app/memory/WHAT_IF_SCENARIO_PLAN.md)
- AI Integration (plan in /app/memory/AI_INTEGRATION_PLAN.md)
- User Profile - Custom theme/background image

### P2 - Future
- Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)

### Refactoring
- Break down ProjectEstimator.js (5000+ lines) into smaller components
