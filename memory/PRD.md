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
- **Sub Technologies**: New master data entity linked to parent Technology, multi-select in project form
- **Smart Import Logistics Fix**: Now reads from Excel formula column D
- **Version Comparison**: Field-level diff with summary banner
- **Change History**: Auto-records field-level changes on every save
- **Suspended & Obsolete Statuses**: New project statuses
- **Excel Export Fix**: Backend download proxy bypasses iframe/popup blockers
- **Project Access Control**: Public/Restricted visibility with user selection
- **Version Comparison Key Metrics Summary**: Detailed metrics with color-coded indicators
- **Tutorials Page**: Guided walkthroughs, video slideshows, interactive tours (react-joyride)
- **ISO Country List**: Standardized country selection across app

### Latest Additions (March 11, 2026)
- **Excel Export Legend Fix**: Red-colored cells now labeled "Landed" with description "Offshore resource travel to onsite with logistics applied"
- **Excel Export Formula Linking**: Profit Margin % and Nego Buffer % in wave sheets reference Summary!$B$5 and Summary!$B$6 via formulas
- **Contingency Absolute Value**: New field in wave logistics for fixed contingency amount (in addition to percentage-based contingency). Added to all 3 logistics dialogs (Add Wave, Edit Logistics, Batch Update) and Excel export.
- **Copy Skill Row**: New Copy button on each row in Proficiency Rates page. Copies skill data and opens Add dialog pre-filled for quick duplication.
- **Enhanced Approver Email**: Review request email now includes a "Project Snapshot" section with customer, description, type, locations, technology, sales manager, total resources, man-months, total cost, selling price, and profit margin.
- **Gantt Chart Upload**: New section in Project Estimator to upload/view/delete a timeline or Gantt chart image per project. Stored as base64 in MongoDB.
- **Payment Milestones Page**: New /payment-milestones page with project list (table view) and per-wave milestone editor. Features: wave-based collapsible sections, target month dropdown (M1-Mn), payment % with auto-calculated amount, row-level add button, Excel export with formula-based amount calculation (Amount = WaveSP * PaymentPct).
- **Cashflow Statement Page**: New /cashflow page with project list (showing projects with resource data) and per-wave cashflow breakdown. Cash-In from payment milestones mapped to target months. Combined Monthly Summary sums across waves. Elegant recharts BarChart visualizations for Cash-In/Out and Net/Cumulative. Excel export with per-wave sheets + Combined Summary sheet with cross-sheet formulas.
- **Navigation Enhancements**: "Open Estimator" button on Milestones and Cashflow detail pages. Sidebar nav includes Milestones (Target icon) and Cashflow (BarChart3 icon).

## Backend API Endpoints (New)
- POST /api/projects/{id}/gantt — Upload Gantt chart image
- GET /api/projects/{id}/gantt — Get Gantt chart image
- DELETE /api/projects/{id}/gantt — Delete Gantt chart
- GET /api/projects/{id}/milestones — Get payment milestones
- PUT /api/projects/{id}/milestones — Save payment milestones
- GET /api/projects/{id}/cashflow — Get cashflow statement (computed)

## Prioritized Backlog
### P1 - Upcoming
- What-If Scenario Comparison (plan in /app/memory/WHAT_IF_SCENARIO_PLAN.md)
- AI Integration (plan in /app/memory/AI_INTEGRATION_PLAN.md)
- User Profile - Custom theme/background image

### P2 - Future
- Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)

### Refactoring
- Break down ProjectEstimator.js (5000+ lines) into smaller components
- Modularize server.py into separate router files
