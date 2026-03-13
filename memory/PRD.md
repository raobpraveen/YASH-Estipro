# YASH EstPro - Product Requirements Document

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with wave-based estimation, cost calculations, project/version management, approval workflows, analytics dashboard, and master data management.

## Architecture
- **Backend**: FastAPI + MongoDB (modular routers in `/app/backend/routers/`)
- **Frontend**: React + Shadcn UI + Recharts
- **Auth**: JWT-based with role-based access control

## What's Been Implemented
### Core Features (Complete)
- Wave-based estimation grid with dynamic monthly phases
- Editable resource definitions (Skill, Level, Location) with salary lookups
- Comprehensive cost calculations (Base, Overheads, Profit, Selling Price, Logistics)
- Project & version management with cloning, comments, read-only states
- Approval workflow (Draft → In Review → Approved/Rejected)
- Analytics dashboard with filters
- Master data CRUD (Skills, Locations, Technologies, Sub-Technologies, Customers, Project Types, Sales Managers, Proficiency Rates)
- Export to Excel, Smart Import from Excel
- Payment Milestones module
- Cashflow Statement module
- Gantt chart upload/display
- User management with roles
- Audit logs
- Interactive tutorials and guided walkthroughs
- Quick Estimate Calculator
- Nego Buffer at wave level
- Apply resource to all months
- Project archiving (Mark Obsolete)

### Recent Completions (March 2026)
- **P0 Bug Fixes**: Fixed email URLs, added YASH logo to Milestones/Cashflow pages
- **P1 Refactoring**: Extracted 10 dialog components, OverallSummary, GanttCard (4427→3437 lines)
- **P1 Docs**: Updated UserManual and SupportGuide
- **Bug Fix (Mar 13)**: Fixed Add Milestone button (crypto.randomUUID fallback for non-secure contexts), Fixed Final Price calculation to include Logistics + Nego Buffer, Added Project Final Price & Coverage % summary cards
- **P0 Bug Fixes (Mar 14)**: Fixed contingency_absolute always included in price calculations (Projects list, Cashflow, Milestones) regardless of traveling resources. Fixed milestone page stale data by combining project+milestone fetching with inline recalculation (9/9 backend tests + frontend verified)

## File Structure
```
/app/backend/
  ├── server.py (slim app init)
  ├── routers/ (auth_routes, projects, dashboard, masters, financials, files, notifications, users)
  ├── models.py, database.py, auth.py, email_service.py, utils.py
/app/frontend/src/
  ├── pages/ProjectEstimator.js (3437 lines, partially refactored)
  ├── components/estimator/ (OverallSummary.js, GanttCard.js, EstimatorDialogs.js)
  ├── utils/ (estimatorCalcs.js, excelExport.js, excelImport.js)
```

## Prioritized Backlog

### P1 - New Features (User Interested)
- PDF Export with Branding (cover page, wave breakdowns, charts, Gantt)
- Client-Facing Shareable View (sanitized, no-login, expiry links)

### P1 - Further Refactoring
- Break ProjectEstimator.js further (ProjectInfoCard, WaveGrid components)

### P2 - New Features
- What-If Scenario Comparison
- AI Integration (Estimation Suggestions / NL Project Builder)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
