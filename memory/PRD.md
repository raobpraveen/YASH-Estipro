# YASH EstPro - Product Requirements Document

## Original Problem Statement
Build an IT/Software Project estimator tool named "YASH EstPro" with wave-based estimation, dynamic monthly phases, editable resource definitions, project & version management, approval workflows, analytics dashboard, and role-based access control.

## Architecture
- **Frontend**: React + Shadcn UI + Recharts + ExcelJS + html-to-image + @hello-pangea/dnd
- **Backend**: FastAPI + MongoDB (PyMongo)
- **Auth**: JWT-based with role-based access control

## What's Been Implemented

### Core Features
- Wave-based estimation grid with dynamic monthly phases
- Editable resource definitions with auto salary lookups
- Project & version management (CRUD, versioning, cloning, comments, read-only states)
- Approval workflow, Dashboard, Version comparison, Archiving, Audit logging, Cascade delete

### Financial Features
- Payment Terms in Cashflow, Cumulative chart with break-even, Key Milestones, Nego Buffer

### Gantt Chart & Milestones
- Phase Range Editor, Payment + Key milestones, Drag-and-Drop, PNG export

### Excel Integration
- Formula-based export with Milestones, Activities, Cashflow, Gantt sheets
- Smart Import with milestone re-import

### Phase Activities & Deliverables
- Activity Templates Master Data with Ctrl+S, SAP seed templates, Project Activities Modal

### Phase 1 Quick Wins (Completed Apr 2026)
1-11: Sub Tech edit/reorder, Base Location edit, Ctrl+S, Industry verticals, 2 decimal MM, Key Milestones rename, Version notes lock, Status definitions, Unarchive fix, Sort by project number

### Phase 2: Project Information & Filters (Completed Apr 2026)
12. Customer searchable dropdown (Popover combobox)
13. Bid Category field (always editable, Budgetary excluded from dashboard)
14. Forecasted Closure Date (date picker)
15. Competency multi-select + Competencies master data CRUD page
16. Dashboard: Location filter from actual project data
17. Projects: Status filter
18. Projects: Totals row (Man-Months, Selling Price, Nego Buffer, Final Price)

### Phase 3: Wave Grid Enhancements (Completed Apr 2026)
19. Wave include/exclude toggle from overall summary pricing
20. Floating "Add Resource Row" button at bottom of grid
21. Grid freeze panes — first 6 columns (Skill→Travel) sticky with shadow separator
22. Resource list filtered by project's selected Technologies
23. Split month allocation dialog (supports "M1-M3:1, M4-M5:0.5, M6:0" ranges)
24. Payment milestones linked to Target Month (Position column removed, auto-derived)

### Phase 4: Status & Workflow (Completed Apr 2026)
25. Retain Approved status on new version creation (`previous_status` tracking, "Suspended (was Approved)" UI label)
26. Commercial status tracking (separate field, post-approval; 5 options)
27. Milestone totals exclude previous versions (latest-only filter)
28. Excel Export/Import: Add Technology column

### Phase 5: Security & Cashflow (Completed Apr 2026)
29. Session timeout — 15 min idle auto-logout with 2-min warning dialog (`useIdleTimeout` hook, AlertDialog with countdown, "Stay signed in" / "Sign out now" actions)
30. Advance payment milestone indicator — `is_advance` flag on PaymentMilestone, Advance checkbox in milestone editor, purple summary card in Cashflow when `total_advance > 0`, row highlights + "ADV" badges in per-wave and combined monthly tables

### Iteration 56: Phase 1-4 User-Reported Fixes Batch (Completed Apr 2026)
31. "Add Row" button moved from floating sticky-bottom to right after wave grid (before logistics); now adds blank row (no dialog)
32. Inline grid Skill dropdown filtered by project's selected Technologies (matching skill.technology_id)
33. Wave grid `<thead>` made sticky (top + left two-axis); container max-h:70vh with overflow-auto
34. Per-wave collapse/expand toggle for Phase Milestones subsection (independent of Phase Ranges toggle)
35. Bug fix: split-allocation parser ("M1-M3:1, M4-M5:2, M6:1") now uses index keys consistent with phase_allocations storage
36. Default month-column headers changed from "Month 1, Month 2..." to "M1, M2..."
37. Removed "Won" and "Loss" from Bid Category options (they belong on Commercial Status post-approval)
38. Projects list filters: added Bid Category, Competency, Forecasted Closure date range (from / to)
39. Bid Category & Forecasted Closure Date stay editable even when project is locked (read-only states)
40. Bug fix: Advance payment milestones bypass payment_terms_days offset — cash-in posted at same target_month

### Iteration 57: Salary Formulas + AMS Engagement Types (Completed Jun 2026)
41. $/Month cell accepts arithmetic expressions: `3200`, `3200+500`, `3200-200`, `3200*2`, `3200/100`, plus `3200*25%` (= 4000), `3200+25%` (= 4000), `3200-25%` (= 2400). New `/utils/salaryExpression.js` evaluator (13/13 unit tests pass). Inline `SalaryExpressionInput` component with blur/Enter commit, Escape revert, toast on invalid.
42. Phase Range inputs step/min reduced to 0.25 (was 0.5). Timeline bar render: when `start_month < 1`, bar snaps to left edge of M1 (position 0%); legacy values ≥1 keep their convention.
43. AMS Engagement Types: new `engagement_type` field on Wave model — `Implementation` (default), `AMS_Shared`, `AMS_Dedicated`, `AMS_Mix`. New `AmsSharedBucket` model: `{name, hours_per_month, hourly_rate, notes}` + `ams_contract_months` (default 12).
44. New `AmsSharedPanel.js` component with service-bucket CRUD table. Per-bucket Billing/Month + Billing/Year, totals row. Free-text bucket names (no master data per user choice).
45. WaveContent.js conditionally renders: AMS_Shared hides Phase Ranges + Resource Grid + Logistics (shared-only); AMS_Mix shows AmsSharedPanel above resource grid; AMS_Dedicated/Implementation unchanged.
46. Cashflow API (`/api/projects/{id}/cashflow`) — new `summary.total_ams_shared`, per-wave `total_ams_shared`, per-month `ams_shared_revenue`. AMS shared waves bypass payment-terms offset and have no internal cost; AMS_Shared waves auto-extend `wave_monthly` to `ams_contract_months`.
47. Add Wave dialog: new `Engagement Type` dropdown at top + conditional `Contract Length (Months)` input when engagement_type starts with `AMS_`.

### Iteration 58-59: AMS Follow-ups (Completed Jun 2026)
48. `cost_rate` added to `AmsSharedBucket` model; AMS cashflow integrates AMS cost (`hours × cost_rate`) as level monthly cash-out.
49. Wave Final Price moved AFTER AMS Annual Billing in Excel Summary sheet for AMS_Mix waves.
50. Gantt + Wave grid controls disabled for pure AMS_Shared waves.

### Iteration 60-61: AMS Billing Frequency, Hourly Price rename, Excel import P0 fix, Add-Wave dialog overflow (Completed Jul 2026)
51. **'Hourly Rate' → 'Hourly Price'** rename across all AMS-applicable surfaces only (AMS panel header, Payment Milestones AMS card, Excel AMS sheet bucket column). T&M `$/Hr` labels unchanged.
52. **AMS Billing Frequency**: new `ProjectWave.ams_billing_frequency` ("Monthly" | "Quarterly") and `ams_billing_advance` (bool) fields with backward-compatible defaults (Monthly/false). Editable from Add-Wave dialog AND inline from AmsSharedPanel controls.
53. **Cashflow logic**: Advance ON → AMS revenue lands on the FIRST day of each billing period (ignoring `payment_terms_days`); the corresponding `advance_revenue` field is set. Advance OFF → AMS revenue lands `payment_terms_days` days after the END of each period. Quarterly bunches billing into 3-month periods. AMS cost remains level monthly regardless.
54. **Payment Milestones AMS card**: auto-renders a `Billing Schedule` table with one read-only row per billing period (M1, M2, … or Q1, Q2, …), each tagged with the `Advance` badge when toggle is ON; total scheduled matches monthly × contract months.
55. **Excel Export**: AMS sheet header now embeds the Billing clause (`— Billing: Monthly|Quarterly[ · Advance]`) so the import can round-trip the frequency + advance settings.
56. **Excel Import phantom-row fix** (`excelImport.js`): rewrote section-terminator detection to scan the first 3 columns for markers (`TOTALS`, `LOGISTICS BREAKDOWN`, `AMS SHARED SUPPORT`, `WAVE SUMMARY`, `PHASE RANGES`, etc.) AND validate that allocation rows have a positive-integer `#` column and a non-numeric skill name. Eliminates phantom empty resource rows.
57. **Add-Wave dialog overflow fix**: dialog now scrolls internally (`max-h-[90vh] overflow-y-auto`) for AMS engagement types.

### Iteration 64-68: AMS + Cashflow + Gantt + Projects List (Completed Jul 2026)
60. **T&M cashflow honors `wave_start_month`**: revenue offset now applied from `wave_start_month + payment_terms_days` (not just M1). Same rule for AMS. Live-verified across multi-wave projects.
61. **Copy Row in Resource Grid**: new "Copy" action per row duplicates the resource with all allocations, phase config, and logistics preserved. Toast + focus on new row.
62. **AMS waves on Gantt Chart**: `GanttCard.js` now renders AMS_Shared / AMS_Mix waves with distinct color band spanning `wave_start_month → wave_start_month + ams_contract_months`. Milestones + phase ranges still work for AMS_Mix.
63. **Projects List Grand Total column**: replaced Selling Price + Nego Buffer + Final Price columns with a single "Grand Total" column (T&M + AMS combined). Applied to UI table, Totals row, and CSV/Excel export.
64. **Help Docs "Last Updated" badges**: UserManual, SupportGuide, Tutorials pages now show dynamic badges for every section reflecting last iteration touched.
65. **Master data seeding + PRJ-0043 replication**: Excel-parsing scripts to seed activities/deliverables/competencies and clone a reference project.

### Iteration 68: Excel Export Duplicate AMS Roll-Up Fix (Completed Jul 2026)
66. **P0 Excel export bug fix**: removed duplicate "AMS SHARED SUPPORT ROLL-UP" section that was rendering AFTER the Grand Total row on the Summary sheet in `excelExport.js`. AMS totals are still integrated into the Grand Total row exactly once. Testing agent + manual UI download verified.

### Iteration 69: Wave Grid Split-Pane Layout (Completed Jul 2026)
67. **Wave Grid split into two synchronized panes** at the Grp column for easier navigation on wide grids:
    - **Left pane** (fixed 622px): drag-handle, #, Skill, Level, Location, $/Month, Onsite, Travel, Grp. Vertical scroll only (scrollbar hidden via `.no-scrollbar`).
    - **Divider**: gradient blue 3px bar between panes.
    - **Right pane** (flex-1): all Phase Month columns + Total MM, Salary Cost, Overhead, Total Cost, Selling Price, SP/MM, Hourly, Ovr $/Hr, Comments, Actions. Independent horizontal scroll.
    - **Sync**: vertical scroll mirrored between panes; row hover (`hoveredRowId` state) highlights the row in both panes with a subtle ring + tint; `useLayoutEffect` measures row/header heights and syncs so rows line up perfectly.
    - `DragDropContext` still wraps both panes; Droppable + Draggable live on the left pane so drag-reorder continues to work.
    - CSS utility `.no-scrollbar` added to `App.css`.

### Iteration 70: Excel Export Filename Enrichment (Completed Jul 2026)
68. **Excel export filename** now includes customer name AND project description alongside project number + version.
    - New format: `{PRJ-NNNN}_{Customer_Name}_{Description}_v{N}_Estimate.xlsx`
    - Sanitizer strips filesystem-invalid chars (`\/:*?"<>|` + control chars), collapses whitespace to `_`, dedupes consecutive underscores, trims edges. Customer capped at 30 chars, description at 40 chars.
    - Empty pieces auto-skipped so no dangling `__` separators.
    - Project description was already surfaced in the Summary sheet's info block (line 371) — retained.

### Iteration 71: Consistent Filename Naming Across All Exports (Completed Jul 2026)
69. **Shared filename builder** — `/utils/filename.js` with `sanitizeForFilename()` + `buildExportFilename()` producing `{PRJ}_{Customer}_{ProjectName}_v{N}_{Suffix}.{ext}` for every download. Middle slot now uses **project name** (not free-form description field, which often contained junk like `"22"`).
70. **Cashflow export** (`CashflowStatement.js`) uses shared builder — `PRJ-0035_Abraj_Energy_SAP_S4_Transformation_v1_Cashflow.xlsx`.
71. **Milestones export** (`PaymentMilestones.js`) uses shared builder — `..._v1_Milestones.xlsx`.
72. **Gantt exports** (`GanttCard.js`) — PNG (`..._Gantt.png`) and Excel (`..._Gantt.xlsx`) now include customer + project name. Fixed follow-up bug where the PNG `saveAs` still hardcoded `gantt-chart.png`.
73. **Backend cashflow API** (`/api/projects/{id}/cashflow`) response extended with `customer_name`, `description`, `version` so the frontend can build filenames without a second fetch.

### Iteration 72: Draggable Wave Tab Reordering (Completed Jul 2026)
74. **Wave tabs are now drag-reorderable** on the estimator when a project has 2+ waves.
    - Uses `@hello-pangea/dnd` (already installed) — `DragDropContext` + horizontal `Droppable` + `Draggable` wrapping each `TabsTrigger`.
    - Small `GripVertical` icon on each tab (only shown when reorder is possible) plus `cursor: grab` and a tooltip "Drag to reorder waves".
    - Drop shows a subtle blue ring + shadow on the dragged tab.
    - Because the waves state array drives EVERYTHING downstream — Gantt rows (`buildGanttRows(waves)` iterates in-array order), Excel Summary/Waves sheets, Overall Summary card, Cashflow, Milestones — reordering the array reorders every visualization in a single state update.
    - Also respects `isReadOnly` (view-only mode disables drag).
    - Click behaviour on tabs is preserved (hello-pangea/dnd only intercepts once the drag threshold is exceeded).
    - Handler: `handleWaveTabDragEnd` in `/pages/ProjectEstimator.js` splices the array and toasts "Moved '{waveName}' to position N".

### Iteration 73: Help Docs Refresh for Iter 68–72 (Completed Jul 2026)
75. **UserManual.js** — bumped "What's New" badge to `Jul 2026 · Iter 72`, added new subsection **0.8 UX & Export Polish (Iter 68–72)** covering wave grid split-pane, draggable wave tabs, standardised export filenames, and the AMS duplicate roll-up fix.
76. **SupportGuide.js** — added new subsection **15.7 Iteration 68–72 UX & Export Polish** with technical implementation notes (files touched, function names, edge cases). Renamed the old 15.7 Test Coverage to 15.8.
77. **Tutorials.js** — added two new step-by-step tutorials:
    - `wave-grid-split-pane` (Jul 2026 · Iter 72) — 8 steps covering the two-pane grid + wave tab drag reorder + downstream effects on Gantt / exports / summaries.
    - `consistent-export-filenames` (Jul 2026 · Iter 71) — 7 steps covering the standardised `{PRJ}_{Customer}_{ProjectName}_v{N}_{Suffix}.{ext}` convention across Estimate / Cashflow / Milestones / Gantt.

### Iteration 76: Effective Margin AMS Symmetry (Completed Jul 2026)
80. **Bug**: Post-Iter 75, margin formula was still asymmetric wrt AMS — `netCost` included `amsTotalCost` but `resourcesPrice` had no `amsSharedAnnual`. PRJ-0037 v2 (T&M @ 35% + AMS_Shared @ 35%) showed a suppressed margin instead of 35%.
81. **Fix**: `resourcesPrice = totalRowsSellingPrice + amsSharedAnnual` in `calculateWaveSummary`; `overallResourcesPrice = totalRowsSellingPrice + totalAmsSharedAnnual` in `calculateOverallSummary`. Verified live on PRJ-0037 v2: margin = 35.0% ✓ (callout auto-hidden).

### Iteration 78: Approval Matrix moved to Admin + Approver count badge (Completed Jul 2026)
85. **UX**: Moved "Approval Matrix" link out of Master Data and into the Admin section of the sidebar (`Layout.js`) so only admins can access it — matches Users/Audit Logs grouping.
86. **UI**: Added a compact amber "Approver Users" count card at the top-right of the Approval Matrix page that shows the number of active users with `role === 'approver'`. Uses the same `/users/approvers/list` endpoint (which returns approvers + admins) and filters on the client so admins aren't counted.

### Iteration 77: Margin Breakdown Tooltip + Help Docs (Completed Jul 2026)
82. **Margin Breakdown tooltip** — `estimatorCalcs.js` now populates `marginDeviations[]` for each wave and aggregates into `overall.marginDeviations`. Entries are added when (a) a T&M row has `override_hourly_rate > 0` and its effective SP differs from formula SP by > $0.50, or (b) an AMS bucket's `hourly_rate` differs from `cost_rate / (1 − margin)` by > $0.01.
83. **UI**: `OverallSummary.js` wraps the effective-margin percentage in a Shadcn Tooltip. Info icon appears next to the value. Tooltip lists every deviation with green/red left border (boost/drag), T&M or AMS badge, wave name, expected vs. actual price, and signed $ delta. Empty state shows a helpful hint about data-only edits.
84. **Help docs**: UserManual §0.9 documents the corrected formula, the set-margin invariant, and the tooltip usage. SupportGuide §15.7 adds Iter 75–77 implementation notes. Tutorials gained a new `effective-margin-breakdown` walkthrough (7 steps).

### Iteration 74: Failed to Fetch Projects Toast (Completed Jul 2026)
78. **P0 UI crash**: `Projects.js::calculateProjectValue` returned `undefined` for `grandTotal` / `totalMM` when a project summary had no `grandTotalFinalPrice` / `finalPrice`. Downstream `.toLocaleString()` / `.toFixed()` calls crashed rendering; React's error boundary showed the misleading "Failed to fetch projects" toast (fetch itself was HTTP 200). Also caused the illusion that saving new projects wasn't working (records saved fine but list re-render crashed). Fix: `|| 0` fallbacks inside `calculateProjectValue` return, at every `.toLocaleString()` / `.toFixed()` render site (3 places), and inside the Totals reducer. Verified: 36 projects rendered, totals row = $11,054,917, no console errors.

### Iteration 76: Effective Margin AMS Symmetry Fix (Completed Jul 2026)
80. **Bug**: After Iter 75 the effective margin formula stripped logistics from cost side but AMS revenue was missing from the denominator, so PRJ-0037 v2 (T&M wave + AMS_Shared wave both at 35%) showed a suppressed margin. AMS internal cost was in `netCost` but `resourcesPrice` had no `amsSharedAnnual` — asymmetric.
81. **Fix**: `resourcesPrice = totalRowsSellingPrice + amsSharedAnnual` in `calculateWaveSummary`; `overallResourcesPrice = totalRowsSellingPrice + totalAmsSharedAnnual` in `calculateOverallSummary`. Both sides now symmetric wrt logistics (excluded) and AMS (included). Verified on PRJ-0037 v2: T&M SP $98,500 + AMS annual $36,000 = $134,500; net cost $64,025 + $23,400 = $87,425; margin = (134,500 − 87,425) / 134,500 = 35.0% (matches set, so callout is auto-hidden).

### Iteration 75: Effective Margin Formula Correction (Completed Jul 2026)
79. **P0 calc bug — Effective Margin inflated on projects with onsite+travel resources**. Original formula used `(Revenue − CTC) / Revenue` where Revenue included logistics but CTC excluded it — pushing PRJ-0037 v1's margin to ~43% vs. expected 35%.
   - **Business definition** (per user): `Net Cost = Total CTC − Logistics`, `Effective Margin = 100% − (Net Cost / Total Resources Price) × 100`, where Resources Price = T&M row selling price (with `Ovr $/Hr` overrides applied, logistics stripped).
   - This equals `profit_margin_percentage` exactly unless one or more rows override the formula-derived selling price via `Ovr $/Hr`.
   - Fix applied to both `calculateWaveSummary` and `calculateOverallSummary` in `/utils/estimatorCalcs.js`. `costToCompany` still includes logistics for the "Total CTC" display card; only the margin formula strips it.
   - Verified live on PRJ-0037 v1: effective margin now = 35.0% (matches Set Margin, so the callout is auto-hidden by the `>0.01` diff gate in OverallSummary.js).

### Iteration 62-63: AMS Cost in CTC + Excel Import AMS_Shared sheet fix (Completed Jul 2026)
58. **Total CTC now includes AMS Shared Support cost**. Added `amsTotalCost = sum(hours_per_month × cost_rate) × ams_contract_months` for every AMS_Shared / AMS_Mix wave in `estimatorCalcs.js::calculateWaveSummary`. The aggregate flows into `costToCompany` (wave-level) and `totalAmsCost` (overall). Overall Summary card subtitle now displays `'all resources + AMS cost ($X)'` whenever any wave has AMS cost. Same change ported to `calculations.js` for `ProjectSummary.js` consumers. Live verified: $90k AMS cost rolled into CTC card.
59. **P0 Excel Import bug fix**: pure AMS_Shared sheets with zero implementation resources were silently dropped because the AMS-section parse + `parsedWaves.push` were gated by `if (allocations.length > 0)`. Added a pre-scan that detects an `AMS SHARED SUPPORT` marker anywhere on the sheet and widened the gate to `allocations.length > 0 || hasAmsSection`. Live verified with user file `PRJ-0031_v2.xlsx`: Smart Import Preview now correctly shows 4 Waves Detected (was 3), and the AMS tab renders with Service 1 / 150h × $35 / $25, 12 months, Monthly + Advance ON.

## Pending Implementation

### Future Tasks (Roadmap)
- HubSpot CRM Integration (opportunities → estimations) — deferred earlier, ready to resume
- PDF Export with Branding
- Client-Facing Shareable View
- Proposal Auto-Generation (Word/PPT)
- WRICEF Tracker, Scope Definition Module, Integration Matrix, Risk Register
- AI Integration (Estimation Suggestions, RFP Parser)
- Actuals Tracking & Profitability Module

## Credentials
- Admin: admin@yash.com / password
