# IT/Software Project Estimator - PRD

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with comprehensive project estimation, cost calculation, workflow approval, and dashboard analytics.

## What's Been Implemented

### Core Features (Complete)
- JWT authentication + RBAC (Admin/Approver/User)
- Master data CRUD: Customers, Technologies, Project Types, Base Locations, Skills, Proficiency Rates, Sales Managers
- Wave-based project estimator with inline grid editing, logistics, profit margins
- Version management (PRJ-0001 v1/v2/v3), cloning, templates, archiving
- Review workflow: Draft -> In Review -> Approved/Rejected
- Audit log system
- Excel import/export with Sales Manager field
- Dockerization for on-premise deployment

### Dashboard (Feb 26, 2026 - Complete)
- Total Projects, Total Value of Estimations, Approved, In Review KPIs
- **Value by Status breakdown** (Draft/In Review/Approved/Rejected values)
- **Multi-select filters**: Date, Customer, Project Type, Location, Sales Manager
- **Combination-grouped KPI charts**: Technology, Project Type, Location, Sales Manager — grouped by exact multi-select combinations (e.g., "UAE, KSA" as one bar)
- **Project numbers on hover tooltip** for all KPI bars
- **Clickable KPI bars** — navigate to Projects list with filter pre-applied
- **Sales Manager Leaderboard** with approval rates
- **Period Comparison Mode** — compare two date ranges side-by-side with delta indicators
- Projects by Status pie chart, Estimation Value Trend, Top Customers

### Notifications (Complete)
- In-app notification bell with unread count badge
- Shows ALL notifications (read + unread, up to 20)
- Color-coded by type (approved/rejected/review)
- Mark all read functionality
- 30-second polling
- Email notifications via Office 365 SMTP (configured and working)

### Email Notifications (Mar 4, 2026 - Complete)
- Dark-themed email templates matching YASH branding (black/dark gray)
- YASH logo embedded as inline CID attachment (reliable in Outlook)
- Clickable "Review Project" / "View Project" buttons linking to `http://192.168.3.42/projects/{id}`
- Plain text project URL shown below button for easy copy-paste
- Footer with YASH tagline "More than what you think." in brand gold
- Templates for: Review Request, Approval, Rejection (with reviewer comments)
- APP_BASE_URL configurable via backend `.env`
- Branding updated to "YASH EstiPro" throughout (emails, browser tab, subjects)
- Clickable notification bell items — navigate directly to project summary page

### Projects List (Feb 26, 2026 - Complete)
- Filters: Customer, Description, Created By, Date Range, **Sales Manager, Project Type, Technology**
- Supports URL query params for dashboard drill-down navigation
- Expandable version history, Templates, Archive/Unarchive

### Estimator Enhancements (Complete)
- Sales Manager dropdown in project info
- **Sales Manager shown in View Summary dialog**
- Sales Manager in ProjectSummary page + Excel exports

### Mar 4-5, 2026 Updates (Complete)
- **Dashboard KPIs deduplication**: Unique projects only (by project_number, latest version)
- **Sidebar redesigned**: Dark theme (#0B1120), right-edge blue accent on active items, white YASH logo, clickable logo→Dashboard
- **Wave grid**: Add Month / Remove Month buttons, Comments column per skill row (max 100 words)
- **Approver edit flow**: Approvers can edit in_review projects → new version with prompt (Keep In Review / Approve & Save)
- **Customer edit**: Full edit dialog with PUT endpoint, + "Food & Beverages" and "Professional Services" industry verticals
- **Skills popup**: Technology field moved to 1st position
- **Mandatory fields**: Technology & Project Type required on save
- **Branding**: "YASH EstiPro" throughout, "Made with Emergent" hidden, YASH logo on Dashboard/Estimator/Projects
- **Excel export**: Status, Version Notes, Comments column in wave detail, Nego Buffer footer
- **Email templates**: Dark-themed, CID logo, clickable buttons, plain text URL

## Technical Architecture
- **Backend**: FastAPI + MongoDB (motor), JWT auth
- **Frontend**: React, Shadcn UI, Tailwind CSS, recharts
- **Shared Utils**: `/frontend/src/utils/calculations.js` — centralized financial calculations

## Prioritized Backlog

### P1 - Verification Pending
- [x] Verify collapsible sidebar hover-to-expand behavior
- [ ] Verify Excel export includes Sales Manager field

### P2 - Low Priority
- [ ] User Profile - Custom Theme (upload background image)
- [ ] Export to PDF
- [ ] Multi-currency support
- [ ] Refactor ProjectEstimator.js local calc functions to use shared utility
- [ ] Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)

## Test Coverage
- Iteration 13: Sales Manager CRUD, Dashboard KPIs, Notification Bell (100%)
- Iteration 14: Value by Status, Leaderboard, Multi-select filters, Excel exports (100%)
- Iteration 15: KPI tooltips, clickable bars, combination grouping, comparison mode, Projects filters (100%)
- Iteration 16: YASH logo on Dashboard & Estimator, sidebar theme, mandatory fields, Skills field order, Dashboard dedup, Customer edit + industry verticals (100%)
- Iteration 17: Logo replacement, Saved Projects logo, badge hidden, sidebar grouping, logo navigation, Excel fields, wave template (100%)
- Iteration 18: Wave Add/Remove Month, Comments column, sidebar dark redesign, approver save flow, white YASH logo (100%)
