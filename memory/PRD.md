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
- **P0 Bug Fixes**: Fixed email URLs (now point to `/estimator?edit={id}`), added YASH logo to Milestones/Cashflow pages, verified Add Milestone button works
- **P1 Documentation Updates**: Fixed section numbering in UserManual, added Milestones/Cashflow/Help references to nav docs, updated SupportGuide architecture diagram
- **P1 Frontend Refactoring**: Extracted 10 dialog components, OverallSummary, and GanttCard from ProjectEstimator.js (4427→3437 lines)
- **Backend Refactoring**: Monolithic server.py broken into modular routers (14 files)
- **Frontend Utility Extraction**: ~854 lines of calculation/Excel logic moved to utils/

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

### P1 - Further Refactoring
- Break ProjectEstimator.js further (ProjectInfoCard, WaveGrid components) - still 3437 lines

### P2 - New Features
- What-If Scenario Comparison (create/compare up to 3 pricing scenarios)
- AI Integration (Estimation Suggestions / NL Project Builder)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
