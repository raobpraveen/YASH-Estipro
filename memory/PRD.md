# YASH EstPro - Project Cost Estimator

## Product Overview
A comprehensive IT/Software Project estimation tool for YASH Technologies. Supports wave-based estimation with dynamic monthly phases, editable resource definitions, cost calculations, versioning, approval workflows, and Excel export.

## Core Requirements
- **Wave-based Estimation Grid**: Dynamic monthly phases, editable resources (Skill, Level, Location) with auto salary lookups
- **Cost Calculation**: Base Cost, Overheads, CTC, Profit Margin, Selling Price, Logistics
- **Project & Version Management**: Full lifecycle with versioning, cloning, version comments
- **Workflow**: Draft → In Review → Approved → Rejected
- **Master Data**: Full CRUD for Skills, Locations, Technologies, Customers, Proficiency Rates, etc.
- **Dashboard & Analytics**: KPIs, charts, filtering
- **Excel Export**: Formula-powered with color coding and color legend
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
- Formula-powered Excel export with color coding
- Quick Estimate Calculator
- Dashboard with analytics & charts
- Notification system (in-app + email)
- Audit logs
- Master data management (Skills, Locations, Customers, Technologies, Project Types, Sales Managers, Proficiency Rates)
- User management (admin)
- Project cloning & archiving
- Version comparison
- Settings & profile

### Recent Additions (March 2026)
- **5 Bug Fixes**: Excel logistics formula (Travel=YES), Skill hover tooltip, Offshore MM card fix, CTC analytics cards, Excel color legend
- **Resource Group ID**: Link related rows (same person onsite/offshore split) with colored borders
- **Frozen Columns**: First 5 grid columns (#, Skill, Level, Location) stay visible during horizontal scroll
- **Dashboard**: Renamed to "Estimations Overview" with "Project Estimations Analyzer" tagline
- **User Manual**: Comprehensive 13-section in-app documentation with YASH branding, TOC, search, print/download
- **Support Guide**: 14-section technical reference covering architecture, troubleshooting, API, deployment, security

## Prioritized Backlog
### P1 - Upcoming
- Custom Selling Price Override ("Override $/Hr" column)
- User Profile - Custom theme/background image

### P2 - Future
- Excel Round-Trip (Smart Import) - export, edit, re-import
- Actuals Tracking & Profitability Module (spec in /app/memory/ACTUALS_MODULE_SPEC.md)

### Refactoring
- Break down ProjectEstimator.js (4000+ lines) into smaller components (WaveGrid, WaveTabs, QuickEstimateDialog, SummaryCards)
