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
- **P0 Bug Fixes (Mar 14)**: Fixed contingency_absolute always included in price calculations (Projects list, Cashflow, Milestones) regardless of traveling resources. Fixed milestone page stale data by combining project+milestone fetching with inline recalculation. Unified all price calculation formulas across Estimator, Projects list, and Milestones pages using shared `estimatorCalcs.js` utility (fixed `||` vs `??` divergence). Verified end-to-end: salary change → milestones recalculate correctly on page load.

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

- **Payment Terms & Cashflow Feature (Mar 20)**: Added project-level "Payment Terms (Days)" field on Milestones page with 0/15/30/45/60/90/120 day options. Cashflow now shifts Cash-In revenue by the payment offset (30 days = +1 month). Extra months are automatically added to cashflow when last-month milestones have delayed payments. Added "Copy Milestones to Wave" feature for multi-wave projects. 25/25 tests passed (100%).
- **Documentation Updates (Mar 20)**: Updated UserManual.js (Payment Milestones section 15 expanded with Payment Terms, Copy to Wave, Auto-Recalculation; Cashflow section 16 expanded with Payment Terms shifting, Cumulative Break-Even chart, extended months), SupportGuide.js (API Reference updated, payment_milestones collection added, new FAQ entries), Tutorials.js (Milestones and Cashflow tutorials expanded with new steps).
- **Staircase Gantt Chart (Mar 20)**: Added per-month phase assignment dropdowns in wave grid (predefined: Prepare, Explore, Realize, Deploy, Go-live, Hypercare, Design, Build, Test, UAT, Support + custom). Auto-generates staircase/waterfall Gantt chart where each phase cascades to its own row. Multi-wave support with wave_start_month offset (e.g., W2 starts at M3). Image upload preserved alongside. Backend model updated with month_phases and wave_start_month fields. Documentation updated (UserManual 5.8, Tutorials, SupportGuide FAQ). 20/20 tests passed (100%).

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
