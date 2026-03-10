# YASH EstPro - Project Cost Estimator

## Product Overview
A comprehensive IT/Software Project estimation tool for YASH Technologies. Supports wave-based estimation with dynamic monthly phases, editable resource definitions, cost calculations, versioning, approval workflows, and Excel export.

## Core Requirements
- **Wave-based Estimation Grid**: Dynamic monthly phases, editable resources (Skill, Level, Location) with auto salary lookups
- **Cost Calculation**: Base Cost, Overheads, CTC, Profit Margin, Selling Price, Logistics, Override $/Hr
- **Project & Version Management**: Full lifecycle with versioning, cloning, version comments
- **Workflow**: Draft > In Review > Approved > Rejected > Suspended > Obsolete
- **Master Data**: Full CRUD for Skills, Locations, Technologies, Sub Technologies, Customers, Proficiency Rates, etc.
- **Dashboard & Analytics**: KPIs, charts, filtering, clickable Total Projects card
- **Excel Export**: Formula-powered with color coding, color legend, override support, CRM ID, Sub Technologies
- **Excel Smart Import**: Re-import Excel files with logistics parsing from formulas, "Import as New Version"
- **Version Comparison**: Field-level diff between any two versions + automated change history log
- **Authentication**: JWT-based with role-based access (Admin, Approver, User)
- **Documentation**: In-app User Manual and Support Guide (updated with all features)

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
- Formula-powered Excel export
- Quick Estimate Calculator
- Dashboard with analytics & charts
- Notification system (in-app + email)
- Audit logs, Master data management, User management
- Project cloning, archiving, version comparison

### Session Additions (March 2026)
- **CRM ID**: New field (max 30 chars) in project info area, included in Excel export
- **Sub Technologies**: New master data entity linked to parent Technology, multi-select in project form, CRUD page with filter
- **Grid Column Overlap Fix**: Reduced sticky column widths (total frozen: 532px vs 588px), Onsite/Travel now fully visible
- **Projects List Excel Export**: "Export to Excel" button on Projects page, includes all versions with Technologies, Sub Tech, Project Types, Sales Manager, CRM ID columns
- **Dashboard Navigation**: Total Projects card clickable → navigates to /projects
- **Smart Import Logistics Fix**: Now reads from Excel formula column D (not just description text column C)
- **Version Comparison**: Field-level diff with summary banner, header/wave/resource/allocation/logistics diffs
- **Change History**: Auto-records field-level changes on every save in change_logs collection
- **Suspended & Obsolete Statuses**: New project statuses with auto-obsolete on approval
- **Mark Obsolete Button**: Confirmation dialog for project creators
- **Excel Export Fix**: Backend download proxy (POST + GET) bypasses iframe/popup blockers
- **Documentation Updated**: UserManual.js and SupportGuide.js reflect all new features

## Backend API Endpoints (New)
- POST /api/sub-technologies — Create sub-technology
- GET /api/sub-technologies — List all sub-technologies
- DELETE /api/sub-technologies/{id} — Delete sub-technology
- GET /api/projects/compare-detail?v1={id}&v2={id} — Field-level version diff
- GET /api/change-logs/{project_number} — Change history
- PUT /api/projects/{project_id}/obsolete — Mark project obsolete
- POST /api/download-file — Upload file buffer, returns download_id
- GET /api/download-file/{download_id} — Serve file as HTTP download

## Prioritized Backlog
### P1 - Upcoming
- What-If Scenario Comparison (plan in /app/memory/WHAT_IF_SCENARIO_PLAN.md)
- AI Integration (plan in /app/memory/AI_INTEGRATION_PLAN.md)
- User Profile - Custom theme/background image

### P2 - Future
- Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)

### Refactoring
- Break down ProjectEstimator.js (5000+ lines) into smaller components
