# YASH EstPro - Project Requirements Document

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with wave-based estimation, cost calculations, project management, approval workflows, and analytics.

## Core Features
- **Wave-based Estimation Grid**: Dynamic monthly phases, editable resource definitions (Skill, Level, Location) with automatic salary lookups
- **Cost Calculation**: Base Cost, Overheads, Profit Margin, Selling Price, Logistics
- **Project & Version Management**: Versioning, cloning, mandatory version comments, read-only states
- **Workflow**: Approval workflow (Draft, In Review, Approved, Rejected, Superseded)
- **Dashboard**: Analytics with filtering
- **Master Data CRUD**: Skills, Technologies, Customers, Locations, Project Types, Proficiency Rates, Sales Managers
- **Authentication**: JWT-based with role-based access (admin, approver, user)
- **Excel Import/Export**: Upload skills, rates, wave grid data; export styled estimates

## Tech Stack
- **Frontend**: React.js, Shadcn UI, Recharts, ExcelJS, @hello-pangea/dnd, Axios
- **Backend**: FastAPI, Pydantic, JWT (SHA256), smtplib
- **Database**: MongoDB

## Completed (Previous Sessions)
- Full JWT auth with role-based access
- Project CRUD with versioning, cloning, archiving
- Wave-based estimation grid with all cost calculations
- Dashboard analytics with deduplication
- Master data CRUD for all entities
- Approval workflow with Superseded status
- Email & in-app notifications
- Collapsible sidebar with flyout menus
- Version comparison screen
- Excel import for skills, rates, wave data
- Per-row comments in wave grid
- Dynamic add/delete month columns

## Completed Feb 2026 Session 1
- Fixed "Mark all read" notifications (POST->PUT)
- Fixed NaN in logistics calculation (empty config fallback)
- Wave Grid: Row reordering, SP/MM & Hourly columns, searchable comboboxes, download data, row numbers
- Nego Buffer moved to project level
- Sidebar changed to light silver theme
- Enhanced Excel export with ExcelJS styling

## Completed Feb 2026 Session 2 (Current)
- [x] **Excel Onsite/Travel row colors**: 3 distinct color combos (ON+Travel=warm yellow, ON+NoTravel=light amber, OFF=mint green)
- [x] **Editable wave name & description**: Inline editing of wave name + new description field
- [x] **Add Row button**: Quick empty row insertion alongside Add Resource dialog
- [x] **Drag-and-drop row reordering**: Replaced up/down arrows with @hello-pangea/dnd drag handles
- [x] **Quick Estimate Calculator**: Ballpark estimate dialog with resource count, duration, avg salary inputs

## Remaining Backlog

### P1
- [ ] User Profile - Custom Theme (upload background image)

### P2
- [ ] Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)
- [ ] Data import validation improvements
- [ ] Project templates functionality

## Key Files
- `/app/frontend/src/pages/ProjectEstimator.js` - Main estimator page (~3700 lines)
- `/app/frontend/src/components/Layout.js` - Sidebar and layout
- `/app/frontend/src/components/SearchableSelect.js` - Reusable searchable combobox
- `/app/frontend/src/utils/calculations.js` - Shared calculation utilities
- `/app/backend/server.py` - FastAPI backend

## Credentials
- Email: admin@yash.com / Password: password
