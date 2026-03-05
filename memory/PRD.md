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
- **Frontend**: React.js, Shadcn UI, Recharts, ExcelJS, Axios
- **Backend**: FastAPI, Pydantic, JWT (SHA256), smtplib
- **Database**: MongoDB
- **Deployment**: Docker, Nginx

## What's Been Implemented (100%)
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

## Implemented Feb 2026 (This Session)

### P0 Bug Fixes
- [x] Fixed "Mark all read" notifications (POST → PUT method mismatch)
- [x] Fixed Excel export (was already wired up; enhanced with ExcelJS styled output)
- [x] Fixed NaN in logistics calculation (empty logistics_config object fallback)

### P1 Features
- [x] **Wave Grid - Row Reordering**: Up/down arrow buttons to move resource rows
- [x] **Wave Grid - SP/MM & Hourly Columns**: New calculated columns showing Selling Price per Man-Month and Hourly Price
- [x] **Wave Grid - Searchable Comboboxes**: Type-to-search dropdowns for Skill, Level, Location using Command+Popover
- [x] **Wave Grid - Download Data**: New "Download Data" button to export current wave grid data (alongside template download)
- [x] **Wave Grid - Row Numbers**: Added # column for row numbering
- [x] **Nego Buffer at Project Level**: Moved from wave-level to project info section with input field
- [x] **Sidebar Light Silver Theme**: Changed from dark navy to light silver (#F1F5F9) with dark text
- [x] **Enhanced Excel Export**: Styled with ExcelJS (colored headers, cell borders, summary sheet + per-wave detail sheets)

## Remaining Backlog

### P1
- [ ] User Profile - Custom Theme (upload background image)

### P2
- [ ] Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)
- [ ] Data import validation improvements
- [ ] Project templates functionality

## Key Files
- `/app/frontend/src/pages/ProjectEstimator.js` - Main estimator page
- `/app/frontend/src/components/Layout.js` - Sidebar and layout
- `/app/frontend/src/components/SearchableSelect.js` - Reusable searchable combobox
- `/app/frontend/src/utils/calculations.js` - Shared calculation utilities
- `/app/backend/server.py` - FastAPI backend
