# YASH EstPro - Project Requirements Document

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with wave-based estimation, cost calculations, project management, approval workflows, and analytics.

## Tech Stack
- **Frontend**: React.js, Shadcn UI, Recharts, ExcelJS, @hello-pangea/dnd, Axios
- **Backend**: FastAPI, Pydantic, JWT (SHA256), smtplib
- **Database**: MongoDB

## Completed (All Sessions)
- Full JWT auth with role-based access
- Project CRUD with versioning, cloning, archiving
- Wave-based estimation grid with all cost calculations
- Dashboard analytics with deduplication
- Master data CRUD for all entities
- Approval workflow with Superseded status
- Email & in-app notifications
- Collapsible sidebar (light silver theme) with flyout menus
- Version comparison, Excel import/export (styled with ExcelJS)
- Per-row comments, dynamic month columns, searchable comboboxes
- SP/MM & Hourly columns, Nego Buffer at project level
- Drag-and-drop row reordering, Add Row for quick entry
- Quick Estimate Calculator
- Excel row colors by Onsite/Travel combo
- Editable wave name & description
- **Clone Wave** — duplicate a wave with all resources for faster data entry

## Remaining Backlog
### P1
- User Profile - Custom Theme (upload background image)
### P2
- Actuals Tracking & Profitability Module
- Data import validation improvements
- Project templates functionality

## Key Files
- `/app/frontend/src/pages/ProjectEstimator.js` - Main estimator page
- `/app/frontend/src/components/Layout.js` - Sidebar and layout
- `/app/frontend/src/components/SearchableSelect.js` - Searchable combobox
- `/app/backend/server.py` - FastAPI backend

## Credentials
- Email: admin@yash.com / Password: password
