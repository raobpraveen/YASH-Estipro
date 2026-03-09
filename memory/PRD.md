# YASH EstPro - Project Cost Estimator

## Product Overview
A comprehensive IT/Software Project estimation tool for YASH Technologies. Supports wave-based estimation with dynamic monthly phases, editable resource definitions, cost calculations, versioning, approval workflows, and Excel export.

## Core Requirements
- **Wave-based Estimation Grid**: Dynamic monthly phases, editable resources (Skill, Level, Location) with auto salary lookups
- **Cost Calculation**: Base Cost, Overheads, CTC, Profit Margin, Selling Price, Logistics, Override $/Hr
- **Project & Version Management**: Full lifecycle with versioning, cloning, version comments
- **Workflow**: Draft > In Review > Approved > Rejected > Suspended > Obsolete
- **Master Data**: Full CRUD for Skills, Locations, Technologies, Customers, Proficiency Rates, etc.
- **Dashboard & Analytics**: KPIs, charts, filtering
- **Excel Export**: Formula-powered with color coding, color legend, and override support
- **Excel Smart Import**: Re-import EstiPro-exported Excel files with auto-creation of missing master data, logistics parsing, and "Import as New Version" capability
- **Authentication**: JWT-based with role-based access (Admin, Approver, User)
- **Documentation**: In-app User Manual and Support Guide

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
- Formula-powered Excel export with color coding & color legend
- Quick Estimate Calculator
- Dashboard ("Estimations Overview") with analytics & charts
- Notification system (in-app + email)
- Audit logs
- Master data management (Skills, Locations, Customers, Technologies, Project Types, Sales Managers, Proficiency Rates)
- User management (admin)
- Project cloning & archiving
- Version comparison
- Settings & profile

### Recent Additions (March 2026)
- **Bug Fixes**: Excel logistics formula (Travel=YES), Skill hover tooltip, Offshore MM card fix, CTC analytics, Excel color legend
- **Resource Group ID**: Link related rows with colored borders
- **Frozen Columns**: First 5 grid columns + $/Month stay visible during horizontal scroll
- **CTC Analytics**: Onsite/Offshore CTC cards in wave & overall summaries
- **User Manual**: 13-section in-app documentation with YASH branding
- **Support Guide**: 14-section technical reference for admins/IT support
- **Custom Selling Price Override (P1)**: "Ovr $/Hr" column overrides calculated selling price per row
- **Excel Smart Import (P2)**: Re-import EstiPro-exported Excel files, auto-create missing skills/locations

### Latest Additions (March 9, 2026)
- **Suspended & Obsolete Statuses**: New project statuses for version lifecycle management
- **Smart Import → Import as New Version**: Creates a new version from Excel import, suspending the old version
- **Smart Import → Logistics Parsing**: Imports logistics configuration (per-diem, accommodation, conveyance, air fare, visa/medical, contingency) from Excel files
- **Frozen $/Month Column**: The $/Month column is now sticky during horizontal scroll alongside the first 5 columns
- **Mark Obsolete Button**: Project creators can mark Draft or Suspended projects as Obsolete
- **Auto-Obsolete on Approval**: When a version is approved, other Draft versions of the same project are automatically set to Obsolete

## Prioritized Backlog
### P1 - Upcoming
- What-If Scenario Comparison (plan in /app/memory/WHAT_IF_SCENARIO_PLAN.md)
- AI Integration (plan in /app/memory/AI_INTEGRATION_PLAN.md)
- User Profile - Custom theme/background image

### P2 - Future
- Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)

### Refactoring
- Break down ProjectEstimator.js (5000+ lines) into smaller components (WaveGrid, WaveTabs, QuickEstimateDialog, SummaryCards, SmartImportDialog)
