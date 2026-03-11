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
- **Backend**: Python FastAPI (modular routers)
- **Database**: MongoDB

## Credentials
- Email: admin@yash.com / Password: password

## Code Architecture (Post-Refactoring)
```
/app/backend/
  server.py          (76 lines - slim app setup, CORS, router includes)
  database.py        (DB connection)
  models.py          (Pydantic models)
  auth.py            (JWT, auth dependencies)
  utils.py           (Audit logs, diff computation)
  email_service.py   (SMTP, email templates)
  routers/
    auth_routes.py   (register, login, me)
    users.py         (user CRUD, settings, approvers)
    masters.py       (customers, technologies, skills, rates, locations, project types, sales managers)
    projects.py      (project CRUD, versions, cloning, templates, approval workflow)
    financials.py    (milestones, cashflow)
    dashboard.py     (analytics, compare)
    notifications.py (notifications, audit logs)
    files.py         (gantt upload/download, file downloads)

/app/frontend/src/
  pages/
    ProjectEstimator.js  (4427 lines)
  utils/
    estimatorCalcs.js    (calculation functions)
    excelExport.js       (Excel workbook builder)
    excelImport.js       (Smart Import parser)
    constants.js         (countries, logistics defaults)
  components/
    Layout.js            (sidebar with Help group)
```

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
- CRM ID, Sub Technologies, Smart Import with logistics parsing
- Version Comparison with field-level diff
- Change History auto-recording
- Project Access Control (public/restricted)
- Tutorials Page with guided walkthroughs
- Payment Milestones page with wave-based milestone editor
- Cashflow Statement page with per-wave breakdown and charts
- Gantt Chart Upload on Project Estimator
- Collapsible sections on Project Estimator page
- Smart Import parsing of Profit Margin %, Nego Buffer %, Contingency Absolute

### UI/UX Improvements (March 11, 2026)
- **Sidebar**: Created "Help" group containing User Manual, Support Guide, Tutorials. Settings is separate.
- **Estimator Toolbar**: Buttons grouped into logical clusters (Project Actions, Utilities, Financial Links, Workflow, Save) with visual group borders and tooltips
- **Wave Grid**: Added hover tooltips on Level (shows proficiency level), Location (shows name + overhead %), and $/Month (shows formatted salary + master rate if different). Increased column widths by ~16px each.

### Refactoring (March 11, 2026)
- **Backend**: Split monolithic server.py (3403 lines) into modular routers (14 files, 2859 total lines)
- **Frontend**: Extracted calculation functions, Excel export, and Smart Import parsing into utility modules

## Prioritized Backlog
### P1 - Upcoming
- What-If Scenario Comparison (plan in /app/memory/WHAT_IF_SCENARIO_PLAN.md)
- AI Integration (plan in /app/memory/AI_INTEGRATION_PLAN.md)

### P2 - Future
- Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)
- Further frontend component decomposition (extract modals, grid components)
