import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Play, BookOpen, Search, ChevronRight, ChevronLeft, Clock, FileSpreadsheet,
  BarChart3, GitCompare, Upload, Shield, Settings, Users, Layers, DollarSign,
  Video, ExternalLink, Monitor, Pause, SkipForward, SkipBack, Maximize2,
  X, CirclePlay, MapPin, ListChecks, ArrowUp, Zap, Percent, Info
} from "lucide-react";

// Tutorial slide images mapping
const TUTORIAL_IMAGES = {
  "create-project": [
    { src: "/tutorial_slides/dashboard.jpg", caption: "Start from the Dashboard - your command center" },
    { src: "/tutorial_slides/estimator.jpg", caption: "Navigate to Estimator and fill project details" },
    { src: "/tutorial_slides/wave_grid.jpg", caption: "Configure waves and add resources to the grid" },
  ],
  "wave-grid": [
    { src: "/tutorial_slides/estimator.jpg", caption: "The Project Estimator with wave configuration" },
    { src: "/tutorial_slides/wave_grid.jpg", caption: "Wave grid with frozen columns and resource management" },
  ],
  "excel-export": [
    { src: "/tutorial_slides/wave_grid.jpg", caption: "Click Export Excel in the toolbar" },
    { src: "/tutorial_slides/projects.jpg", caption: "View exported projects in the list" },
  ],
  "version-comparison": [
    { src: "/tutorial_slides/projects.jpg", caption: "Go to Saved Projects and select a project" },
    { src: "/tutorial_slides/compare_versions.jpg", caption: "Compare any two versions side-by-side" },
  ],
  "approval-workflow": [
    { src: "/tutorial_slides/estimator.jpg", caption: "Set approver email and submit for review" },
    { src: "/tutorial_slides/projects.jpg", caption: "Track status changes in the projects list" },
  ],
  "dashboard-analytics": [
    { src: "/tutorial_slides/dashboard.jpg", caption: "View KPIs and analytics on the Dashboard" },
    { src: "/tutorial_slides/projects.jpg", caption: "Click through to drill down into project details" },
  ],
  "master-data": [
    { src: "/tutorial_slides/skills.jpg", caption: "Manage Skills in the Master Data section" },
    { src: "/tutorial_slides/proficiency_rates.jpg", caption: "Configure Proficiency Rates for salary lookups" },
  ],
};

// Interactive tour steps for each feature
const TOUR_NAV = {
  "create-project": "/estimator",
  "dashboard-analytics": "/",
  "wave-grid": "/estimator",
  "version-comparison": "/projects",
  "master-data": "/skills",
};

const TUTORIALS = [
  {
    id: "create-project",
    title: "Creating Your First Project",
    description: "Learn how to create a new estimation project, set up project information, and configure waves with resources.",
    duration: "5 min",
    category: "Getting Started",
    icon: BookOpen,
    color: "bg-sky-500",
    steps: [
      { target: "Navigate to the Estimator page from the sidebar.", action: "Click 'Estimator' in the left sidebar navigation." },
      { target: "Fill in the Project Name field.", action: "Enter a descriptive name for your estimation project." },
      { target: "Select a Customer from the dropdown.", action: "Choose the client this estimate is for." },
      { target: "Choose Technologies and Sub Technologies.", action: "Select one or more technologies. Sub-technologies filter based on selected parent technology." },
      { target: "Enter the CRM ID if applicable.", action: "Add your external CRM reference (max 30 characters)." },
      { target: "Set Profit Margin % and Nego Buffer %.", action: "These drive the selling price calculations for all resources." },
      { target: "Configure Wave 1 with phases.", action: "Set the number of months and optionally rename each phase." },
      { target: "Add resources to the grid.", action: "Click '+ Add Resource' and select Skill, Level, and Location for each row." },
      { target: "Set monthly FTE allocations.", action: "Enter values (0-1) for each month column to define resource utilization." },
      { target: "Save the project with Ctrl+S or click Save.", action: "Your project is saved with version 1 and a unique project number." },
    ],
    hasSlideshow: true,
    hasTour: true,
  },
  {
    id: "wave-grid",
    title: "Working with the Wave Grid",
    description: "Master the estimation grid — frozen columns, drag-and-drop, onsite/travel toggles, override rates, and resource groups.",
    duration: "4 min",
    category: "Core Features",
    icon: Layers,
    color: "bg-violet-500",
    steps: [
      { target: "Frozen columns stay visible during scroll.", action: "The #, Skill, Level, Location, and $/Month columns remain pinned as you scroll right." },
      { target: "Drag resources to reorder.", action: "Use the drag handle on the left of each row to rearrange resource order." },
      { target: "Toggle Onsite and Travel flags.", action: "Click the Onsite badge to switch between Onsite/Offshore. Travel affects logistics calculations." },
      { target: "Use Override $/Hr for custom pricing.", action: "Enter a custom hourly rate in the 'Ovr $/Hr' column to override the calculated selling price." },
      { target: "Group related resources.", action: "Assign a Group ID to link related resources — they'll share a colored border for visual grouping." },
      { target: "Apply a skill to all months at once.", action: "Use the 'Apply to All Months' option to set the same FTE allocation across all phases." },
    ],
    hasSlideshow: true,
    hasTour: true,
  },
  {
    id: "excel-export",
    title: "Excel Export & Smart Import",
    description: "Export formula-powered Excel files with Milestones, Activities, Cashflow, and Gantt sheets. Re-import to update projects or create new versions.",
    duration: "4 min",
    category: "Data Management",
    icon: FileSpreadsheet,
    color: "bg-emerald-500",
    steps: [
      { target: "Click 'Export Excel' in the toolbar.", action: "Downloads a formula-based .xlsx file with Summary, Wave Detail, Milestones, Activities, Cashflow, and Gantt Chart sheets." },
      { target: "The Excel file contains live formulas.", action: "Modify values in Excel (e.g., salary, FTE) and see recalculated results instantly. Milestone amounts also use formulas." },
      { target: "Review the Milestones sheets.", action: "Each wave gets a Milestones sheet with payment amounts calculated via formulas. Edit milestone data here for re-import." },
      { target: "Review Activities and Cashflow sheets.", action: "Activities shows adopted and wave-specific items per phase. Cashflow shows monthly Cash-Out, Cash-In, Net, and Cumulative. Both are informational and skipped on import." },
      { target: "To re-import, click 'Smart Import'.", action: "Upload a previously exported EstiPro Excel file. The system parses waves, resources, logistics, and milestones." },
      { target: "Milestone data is imported and overwrites existing milestones.", action: "If Milestones sheets are present in the Excel, they replace the project's current milestones." },
      { target: "Choose 'Replace Current' or 'Import as New Version'.", action: "'Replace' overwrites locally. 'New Version' creates a new version and suspends the old one." },
      { target: "Logistics data is parsed from formulas.", action: "If you modified per-diem, accommodation, or flight costs in the Excel formulas, those changes are imported." },
    ],
    hasSlideshow: true,
    hasTour: false,
  },
  {
    id: "version-comparison",
    title: "Version Comparison & Change History",
    description: "Compare any two versions field-by-field and track every change made to a project over time.",
    duration: "3 min",
    category: "Version Control",
    icon: GitCompare,
    color: "bg-amber-500",
    steps: [
      { target: "Go to the Projects List page.", action: "Click 'Saved Projects' in the sidebar." },
      { target: "Click the Compare icon on any project.", action: "This opens the Version Comparison page." },
      { target: "Select two versions to compare.", action: "Use the Baseline and Compare dropdowns to pick any two versions." },
      { target: "Review the summary banner.", action: "Shows total changes, header changes, resources added/removed/modified, allocation changes, and logistics changes." },
      { target: "Expand wave sections for details.", action: "Each wave shows resource-level and cell-level diffs (e.g., 'Phase 3: 1.0 → 0.5')." },
      { target: "Switch to Change History tab.", action: "See auto-recorded change logs with timestamp, user, and expandable field-level details for every save." },
    ],
    hasSlideshow: true,
    hasTour: true,
  },
  {
    id: "approval-workflow",
    title: "Approval Workflow",
    description: "Submit projects for review, approve or reject as an approver, and manage project statuses.",
    duration: "3 min",
    category: "Workflow",
    icon: Shield,
    color: "bg-rose-500",
    steps: [
      { target: "Set an approver email in project info.", action: "Enter the email of the designated approver for this project." },
      { target: "Click 'Submit for Review'.", action: "The project status changes to 'In Review' and the approver is notified." },
      { target: "Approver can 'Save & Approve' or 'Reject'.", action: "Approvers see special buttons when opening a project in review." },
      { target: "On approval, other Draft versions are auto-obsoleted.", action: "Only the approved version remains active." },
      { target: "Use 'Mark Obsolete' for cleanup.", action: "Project creators can manually obsolete Draft or Suspended versions they no longer need." },
    ],
    hasSlideshow: true,
    hasTour: false,
  },
  {
    id: "dashboard-analytics",
    title: "Dashboard & Analytics",
    description: "Understand your estimation portfolio with KPIs, charts, and filtering capabilities.",
    duration: "2 min",
    category: "Analytics",
    icon: BarChart3,
    color: "bg-cyan-500",
    steps: [
      { target: "The Dashboard shows key metrics.", action: "Total Projects, In Review, Approved counts, and total estimated value." },
      { target: "Click 'Total Projects' to jump to the list.", action: "The card is clickable and navigates to the Saved Projects page." },
      { target: "Use filters to drill down.", action: "Filter by status, customer, technology, date range, and sales manager." },
      { target: "Export the project list to Excel.", action: "Click 'Export to Excel' on the Projects page to get all versions with full details." },
    ],
    hasSlideshow: true,
    hasTour: true,
  },
  {
    id: "master-data",
    title: "Managing Master Data",
    description: "Set up and maintain skills, locations, technologies, sub-technologies, customers, proficiency rates, and more.",
    duration: "3 min",
    category: "Administration",
    icon: Settings,
    color: "bg-slate-600",
    steps: [
      { target: "Navigate to any master data page.", action: "Skills, Base Locations, Technologies, Sub Technologies, Customers, Project Types, Sales Managers, Proficiency Rates." },
      { target: "Add new entries.", action: "Click the 'Add' button and fill in the required fields." },
      { target: "Sub Technologies link to parent Technologies.", action: "When adding a sub-technology, select its parent technology first." },
      { target: "Proficiency Rates drive salary lookups.", action: "Set rates by Skill + Level + Location to auto-populate the $/Month column in the grid." },
      { target: "Use search and filters.", action: "All master data screens support search and filtering." },
      { target: "Copy an existing rate.", action: "Click the purple Copy icon on any Proficiency Rate row to duplicate it into a new entry with pre-filled data." },
    ],
    hasSlideshow: true,
    hasTour: true,
  },
  {
    id: "payment-milestones",
    title: "Payment Milestones & Markers",
    description: "Define payment milestones and freehold markers per wave. Link to phases, use slider positioning for markers, and manage bidirectional sync.",
    duration: "5 min",
    category: "Financial Planning",
    icon: DollarSign,
    color: "bg-emerald-500",
    steps: [
      { target: "Open the Milestones page from the sidebar.", action: "Click 'Milestones' in the left sidebar. A project list sorted by project number shows all versions with Customer Name and milestone counts." },
      { target: "Select a project version.", action: "Click any row. Milestones are version-specific — each version has its own set." },
      { target: "Set Payment Terms at the top.", action: "Choose a Payment Terms value (0, 30, 60, 90, 120 days). This controls when Cash-In appears in the Cashflow (e.g., 30 days = +1 month delay)." },
      { target: "Each wave has its own section with two sub-tables.", action: "Click the wave header to expand. The header shows Final Price, payment count, marker count, Payment %, and total amount. Payment milestones (amber) and Marker milestones (blue) are shown in separate tables." },
      { target: "Add a Payment Milestone.", action: "Click '+ Payment Milestone'. Set the name, link a phase (optional), choose position (Start/Mid/End), and enter Payment %. The dollar amount auto-calculates from the wave's selling price." },
      { target: "Add a Marker Milestone.", action: "Click '+ Marker Milestone'. Name it (e.g., Sprint 1, UAT). Link to a phase and use the 0-100% slider to position it anywhere on the phase bar." },
      { target: "Use 'Copy to Wave' for multi-wave projects.", action: "Click the 'Copy to Wave' dropdown and select a target wave. All milestones are duplicated with recalculated amounts." },
      { target: "Save with Ctrl+S or the Save All button.", action: "Click 'Save All' or press Ctrl+S. Milestones are also saved automatically when edited inline in the Estimator." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "cashflow-statement",
    title: "Cashflow Statement",
    description: "View monthly cash outflows and inflows per wave with payment term shifting, cumulative break-even chart, and Excel export.",
    duration: "4 min",
    category: "Financial Planning",
    icon: BarChart3,
    color: "bg-cyan-600",
    steps: [
      { target: "Open the Cashflow page from the sidebar.", action: "Click 'Cashflow' in the left sidebar. Projects are sorted by number and show Customer Name. Only projects with resource data are listed." },
      { target: "Select a project version.", action: "Click any row. Cashflow is version-specific and computed from resource allocations and milestones." },
      { target: "Check the Payment Terms banner.", action: "If Payment Terms are set on the Milestones page, a purple banner shows the offset (e.g., 'Cash-In shifted by +1 month')." },
      { target: "Each wave shows monthly Cash-Out and Cash-In.", action: "Cash-Out = resource costs + logistics. Cash-In = milestone payments shifted by payment terms. Extra months (highlighted in purple) are added if Cash-In falls beyond the project duration." },
      { target: "The Combined Summary sums across waves.", action: "M1 of Wave 1 + M1 of Wave 2 = Combined M1. Shows Cash-Out, Cash-In, Net, and Cumulative." },
      { target: "View the Monthly Cash Flow bar chart.", action: "Red = Cash-Out, Green = Cash-In, Orange = Net. Hover for tooltips." },
      { target: "View the Cumulative Cash Flow & Break-Even chart.", action: "Line chart shows running totals. The break-even point (green banner) identifies when cumulative Cash-In exceeds Cash-Out." },
      { target: "Export to Excel.", action: "Click 'Export Excel' for a multi-sheet file: per-wave sheets + Combined Summary with cross-sheet formulas." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "gantt-chart",
    title: "Phase Ranges, Milestones & Gantt Chart",
    description: "Define project phases, add payment and marker milestones, drag-and-drop milestone diamonds, and auto-generate a Gantt chart.",
    duration: "4 min",
    category: "Core Features",
    icon: FileSpreadsheet,
    color: "bg-orange-500",
    steps: [
      { target: "Open the Estimator for a project.", action: "Save the project first if it's new. The Phase Ranges section and Gantt Chart appear after save." },
      { target: "Find the 'Phase Ranges' section in the wave.", action: "Below the wave toolbar buttons, you'll see a collapsible 'Phase Ranges' header. Click it to expand the editor." },
      { target: "Click '+ Add Phase' to create a phase range.", action: "Choose a phase name from the dropdown (Prepare, Explore, Realize, Deploy, etc.) or select '+ Custom...' for a custom name." },
      { target: "Set Start and End values with half-month precision.", action: "Use the numeric inputs (step 0.5). Example: Start=1, End=2 covers months 1-2. Start=1.5, End=3 means 'begin mid-month 1 through end of month 3'." },
      { target: "Add milestones to phases.", action: "Below the phase list, the Phase Milestones section shows '+ Payment' and '+ Marker' buttons per phase. Payment milestones have Start/Mid/End position; markers have a 0-100% slider for flexible placement." },
      { target: "Check the total payment % badge.", action: "The Phase Milestones header shows total payment % and dollar amount. Color-coded: amber < 100%, green = 100%, red > 100%." },
      { target: "Drag-and-drop milestones on the Gantt chart.", action: "Click and drag any milestone diamond horizontally on its phase bar. Payment milestones snap to Start/Mid/End; markers update their 0-100% position freely." },
      { target: "Scroll down to the Timeline / Gantt Chart section.", action: "The chart auto-generates with wave headers, phase bars, and milestone diamonds (amber for payment, blue for markers). Labels are stacked when milestones are close together." },
      { target: "For multi-wave projects, set the 'Starts at project M' value.", action: "In the wave header, enter the project month where this wave begins. The Gantt chart reflects this offset." },
      { target: "Export the chart.", action: "Click PNG for an image export or Excel for a spreadsheet with color-coded bars and a milestones summary table." },
      { target: "Save the project to persist phases and milestones.", action: "Press Ctrl+S or click Save. Phase ranges and milestones are stored per-wave and synced with the Milestones page." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "activity-templates",
    title: "Activity Templates & Deliverables",
    description: "Manage phase-wise activity templates, seed SAP templates, use Excel import/export for bulk management, and adopt templates into projects.",
    duration: "5 min",
    category: "Administration",
    icon: ListChecks,
    color: "bg-purple-500",
    steps: [
      { target: "Navigate to Activity Templates from the sidebar.", action: "Click 'Activity Templates' in the left sidebar to open the master data page." },
      { target: "Select Technology, Sub-Technology, and Project Type.", action: "Use the three filter dropdowns to narrow down templates. Templates are keyed by this combination." },
      { target: "Browse templates grouped by phase.", action: "Templates appear grouped by phase name (e.g., Prepare, Explore, Realize). Click a phase to expand and view activities and deliverables." },
      { target: "Add a new phase template.", action: "Click '+ Add Phase', enter a phase name, add activities and deliverables, then click Save." },
      { target: "Use pre-seeded SAP templates.", action: "For SAP S/4HANA implementations, the system includes pre-built Private Cloud and Public Cloud templates with six SAP Activate phases each." },
      { target: "Export templates to Excel.", action: "Click 'Export Excel' to download all templates for the selected combination as a structured Excel file." },
      { target: "Import templates from Excel.", action: "Click 'Import Excel' to upload a bulk template file. Use the exported file as a format reference." },
      { target: "Adopt templates into a project.", action: "In the Estimator, click the 'Activities' button in the toolbar. Select phases from the master template, then click 'Adopt Selected' to copy them into the current wave." },
      { target: "Add wave-specific activities.", action: "In the Phase Activities modal, add custom activities unique to this wave that are not part of the master template." },
      { target: "View activities in Excel export.", action: "Adopted and wave-specific activities appear in dedicated Activities sheets in the project's Excel export." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "advance-payment",
    title: "Advance Payment Milestones in Cashflow",
    description: "Mark milestones as advance/upfront payments and see them flow through the Cashflow without payment-terms shifting.",
    duration: "3 min",
    category: "Finance",
    icon: DollarSign,
    color: "bg-purple-600",
    steps: [
      { target: "Open Payment Milestones for a project.", action: "Navigate to Milestones from the sidebar and select the project version you want to edit." },
      { target: "Locate the new 'Advance' column.", action: "Each Payment Milestone row has an Advance checkbox between Milestone Name and Linked Phase." },
      { target: "Tick the Advance checkbox.", action: "When ticked, the milestone is treated as upfront. An ADV badge appears next to the milestone name." },
      { target: "Save the milestones.", action: "Press Ctrl+S or click 'Save All'. The is_advance flag is persisted to the project's milestone document." },
      { target: "Open the Cashflow page for the same project.", action: "Click the Cashflow shortcut from the Estimator toolbar or the sidebar." },
      { target: "Spot the 'Advance Payment' summary card.", action: "When the project has any advance receipts, a purple summary card appears at the top showing the total advance amount and percentage of total revenue." },
      { target: "Notice the highlighted rows.", action: "Per-wave and combined monthly rows holding advance receipts get a purple background and an ADV/ADVANCE badge." },
      { target: "Verify advance bypasses payment terms.", action: "Even when payment_terms_days is 30/60/90, advance milestones post cash-in in the same target month — they ignore the offset." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "wave-grid-2026",
    title: "Wave Grid: Sticky Header, Add Row, Skill Filter",
    description: "Tour the Iteration 56 improvements to the wave grid — sticky column header, repositioned Add Row, technology-filtered Skill dropdown, split-allocation, and per-wave milestone collapse.",
    duration: "4 min",
    category: "Core Features",
    icon: Layers,
    color: "bg-cyan-600",
    steps: [
      { target: "Open any wave in the Estimator.", action: "Open an existing project or create a new one and add a wave with several months of phases." },
      { target: "Scroll the grid vertically — header stays visible.", action: "The column titles (Skill, Level, Location, $/Month, M1, M2 …) are pinned to the top so you can always identify the column you're entering data in." },
      { target: "Find the new Add Row button.", action: "It's positioned directly under the wave grid table and before the Logistics Cost Breakdown card. It adds a blank row with project-default skill and location — no dialog." },
      { target: "Notice the Skill dropdown is pre-filtered.", action: "If the project has Technologies selected, the inline Skill dropdown only lists matching skills (or skills with no technology mapping). The default first skill on a new row is also from this filtered list." },
      { target: "Use 'Apply value to months' for ramp-up patterns.", action: "Click the calculator icon on a row, then enter 'M1-M3:1, M4-M5:2, M6:1' to set 1, 1, 1, 2, 2, 1 across the row. The fix landed in Iteration 56." },
      { target: "Default month headers are now M1, M2 …", action: "New waves and newly added month columns use short M{N} labels. You can still rename them to phase labels like 'Sprint 1' if preferred." },
      { target: "Collapse the Phase Milestones subsection per wave.", action: "Inside Phase Ranges, each wave now has an independent chevron toggle on the Phase Milestones header — collapse it to free up vertical space without affecting other waves." },
    ],
    hasSlideshow: false,
    hasTour: true,
  },
  {
    id: "session-and-filters",
    title: "Session Timeout & New Project Filters",
    description: "Get to know the 15-minute idle auto-logout, the new Bid Category / Competency / Forecasted Closure filters in Projects list, and which fields stay editable post-approval.",
    duration: "3 min",
    category: "Administration",
    icon: Shield,
    color: "bg-emerald-600",
    steps: [
      { target: "Understand the session timeout.", action: "After 15 minutes of inactivity, a warning dialog appears 2 minutes before logout with a live countdown. Click 'Stay signed in' to extend, or 'Sign out now' to log out immediately." },
      { target: "Open the Projects page.", action: "Click 'Projects' in the sidebar to see all estimates." },
      { target: "Open the Filters panel.", action: "Click the Filters button in the top-right toolbar of the Projects page." },
      { target: "Try the new Bid Category filter.", action: "Filter by Budgetary, Most Likely, or Committed. 'Won' and 'Loss' have moved to the Commercial Status field." },
      { target: "Filter by Competency.", action: "The Competency dropdown is sourced from the Competencies master data. Pick one to narrow projects to that competency." },
      { target: "Use the Forecasted Closure date range.", action: "Set Forecasted Closure From / To to surface projects expected to close within a window." },
      { target: "Notice fields that stay editable on approved projects.", action: "Open an Approved/Suspended/In-Review project. Bid Category and Forecasted Closure Date are still editable since they legitimately change post-approval." },
      { target: "Set Commercial Status post-approval.", action: "On the same project, the Commercial Status field appears with options: Pending for Submission, Submitted to Customer, Won, Lost, Cancelled." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "ams-shared-support",
    title: "AMS Shared Support: Engagement Types, Billing Frequency & Advance",
    description: "Set up a recurring AMS service contract — pick an engagement type, define service buckets with Hours/Month, Hourly Price and Cost Rate, and configure Monthly or Quarterly billing with the Bill-in-Advance toggle.",
    duration: "5 min",
    category: "Core Features",
    updated: "Jul 2026 · Iter 63",
    icon: Zap,
    color: "bg-purple-600",
    steps: [
      { target: "Add a new wave.", action: "From the Estimator, click 'Add Wave'. In the dialog, pick Engagement Type = 'AMS — Shared Support' (or 'AMS — Mix' to combine with a T&M resource grid)." },
      { target: "Set the contract length and billing schedule.", action: "Enter Contract Length in months (default 12), Billing Frequency = Monthly or Quarterly, and tick 'Bill in Advance' if the customer pays at the start of each billing period." },
      { target: "Add service buckets.", action: "Inside the wave, click 'Add Service' on the AMS panel. For each bucket fill Hours/Month, Hourly Price (customer-facing rate), Cost Rate (internal $/hour), and optional notes. Billing/Month and Billing/Year auto-compute." },
      { target: "Open the Payment Milestones page.", action: "Use the navigation rail → Milestones. For the AMS wave, an automatic Billing Schedule appears — one row per period (M1, M2 … or Q1, Q2 …) with the cash-in month and amount. Rows are tagged with an ADV badge when Bill in Advance is on." },
      { target: "Open the Cashflow page.", action: "AMS revenue flows in monthly or quarterly per your settings. With Advance ON, period revenue lands on the first day of the period (no payment-terms shift). With Advance OFF, it lands period_end + payment-terms days. AMS cost stays as a level monthly outflow." },
      { target: "Export to Excel and reimport.", action: "Click Export Excel — the AMS sheet header records the frequency / advance / contract months. Smart Import will round-trip these settings exactly, including pure AMS waves with zero implementation resources." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "effective-margin-ctc",
    title: "Effective Margin & Blended CTC for AMS Projects",
    description: "Understand the new Effective Margin formula (Grand Total denominator) and how AMS internal cost rolls into Total CTC in the Overall Summary.",
    duration: "3 min",
    category: "Core Features",
    updated: "Jul 2026 · Iter 64",
    icon: Percent,
    color: "bg-indigo-600",
    steps: [
      { target: "Open a project with at least one AMS_Shared or AMS_Mix wave.", action: "From Projects, pick a mixed engagement project (or use Quick Estimator → Add a T&M wave and an AMS wave)." },
      { target: "Locate the Total CTC card in the Overall Summary.", action: "The card now reads the combined CTC across resources + AMS cost. When AMS cost is present, the subtitle '+ AMS cost ($X)' renders directly beneath the value." },
      { target: "Read the Effective Margin chip.", action: "The chip uses Grand Total Final Price (T&M Final + AMS Annual Billing) as the denominator: (GrandTotal − Total CTC) / GrandTotal × 100. It turns green when above the set Profit Margin %, red when below." },
      { target: "Sanity-check the math.", action: "On a simple test project (1 resource $9,900 CTC; 1 AMS bucket 150h × $25/h cost × 12mo = $45,000 cost; AMS revenue $63,000; T&M Final $11,250 → Grand Total $74,250 → Total CTC $54,900 → Effective Margin ≈ 26%) the chip reads exactly that value." },
      { target: "Implementation-only projects are unchanged.", action: "If a project has no AMS waves, Grand Total = T&M Final and the chip value matches the legacy formula — the change is backward-safe." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "effective-margin-breakdown",
    title: "Effective Margin & the Margin Breakdown Tooltip",
    description: "Learn the corrected Effective Margin formula (Iter 75–76) and the new hover tooltip that pinpoints which T&M rows or AMS buckets are driving deviation from Set Margin.",
    duration: "3 min",
    category: "Core Features",
    updated: "Jul 2026 · Iter 77",
    icon: Info,
    color: "bg-indigo-600",
    steps: [
      { target: "Open any project with an Ovr $/Hr override or AMS wave.", action: "The Overall Summary card at the top of the estimator will show the 'Set Margin → Effective Margin (with overrides)' indigo banner whenever the effective margin differs from the set margin by more than 0.01%." },
      { target: "Look at the Effective Margin percentage.", action: "It reads e.g. '32.4%'. A small info icon appears next to the number when there are contributing overrides." },
      { target: "Hover the percentage.", action: "A tooltip opens listing every T&M row or AMS bucket that is pushing the margin away from the set target. Each entry is colour-coded: green left border = boosting margin, red = dragging margin." },
      { target: "Read the entry.", action: "Every row shows: (i) a blue 'T&M' or purple 'AMS' badge, (ii) the resource/bucket label, (iii) the wave name, (iv) expected $ (formula-derived) vs actual $ (with override), and (v) the signed deviation on the right." },
      { target: "Understand the sign convention.", action: "Positive deviations push the blended margin higher (you sold above formula price). Negative deviations drag it down (you discounted or under-priced an AMS bucket)." },
      { target: "Confirm the invariant.", action: "If every row's Ovr $/Hr is empty AND every AMS bucket's hourly_rate equals cost_rate / (1 - set_margin), the callout disappears entirely — margin equals set margin exactly." },
      { target: "Cross-check with the grid.", action: "Click into the offending wave, scroll to the resource row, and inspect the Ovr $/Hr column. For AMS buckets, open the AMS Shared Panel and check hourly_rate vs. cost_rate." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "wave-grid-split-pane",
    title: "Wave Grid Split-Pane & Draggable Wave Tabs",
    description: "Master the two-pane Wave Grid (freeze at the Grp column) and drag wave tabs left or right to reorder the whole project — Gantt, exports and summaries follow in one shot.",
    duration: "3 min",
    category: "Core Features",
    updated: "Jul 2026 · Iter 72",
    icon: Layers,
    color: "bg-blue-600",
    steps: [
      { target: "Open any project with 2+ waves in the Estimator.", action: "The Wave Grid inside each wave is now split into two synchronised panes divided by a subtle vertical bar at the Grp column." },
      { target: "Scroll the left pane vertically.", action: "The drag-handle, #, Skill, Level, Location, $/Month, Onsite, Travel, and Grp columns stay visible while you scroll long resource lists. The left pane has vertical scroll only (its scrollbar is hidden for a clean look)." },
      { target: "Scroll the right pane horizontally.", action: "Phase months (M1, M2, …), Total MM, cost / price columns, Comments, and Actions live in the right pane and scroll horizontally without ever hiding the resource identity on the left." },
      { target: "Hover any row.", action: "Both panes highlight the row together — the left and right rows stay height-aligned via a layout-effect pass, so the freeze-pane experience is pixel-accurate." },
      { target: "Drag a resource row.", action: "Grab the grip on the left pane and drop above/below another row — the reorder is unaffected by the split." },
      { target: "Drag a wave tab left or right.", action: "When there are 2+ waves, each tab shows a small grip icon. Drag a tab left or right and drop — the wave order updates and the Gantt chart re-orders rows automatically." },
      { target: "Confirm downstream effects.", action: "Open the Gantt Card, Excel export, Cashflow, and Milestones — everything follows the new wave order because they all iterate the same waves array." },
      { target: "Click a tab (not drag).", action: "Short mouse-downs below the drag threshold act as normal clicks and switch the active wave, so nothing about the previous UX is broken." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "consistent-export-filenames",
    title: "Standardised Export Filenames Across Excel, Cashflow, Milestones & Gantt",
    description: "See how every downloaded file — Estimate, Cashflow, Milestones, Gantt PNG and Gantt Excel — now uses the same {PRJ}_{Customer}_{ProjectName}_v{N}_{Suffix}.{ext} convention.",
    duration: "2 min",
    category: "Reports",
    updated: "Jul 2026 · Iter 71",
    icon: FileSpreadsheet,
    color: "bg-emerald-600",
    steps: [
      { target: "Open any approved project.", action: "Use PRJ-0035 (Abraj Energy — SAP S4 Transformation) or any recently-updated estimate as a reference." },
      { target: "Export to Excel from the Estimator.", action: "Click Export → Excel. The file is downloaded as e.g. PRJ-0035_Abraj_Energy_SAP_S4_Transformation_v1_Estimate.xlsx. Filesystem-invalid characters (\\ / : * ? \" < > |) are removed automatically." },
      { target: "Export the Cashflow.", action: "From the Cashflow page, click Download Excel. The file follows the same pattern with the _Cashflow suffix." },
      { target: "Export Milestones.", action: "From the Payment Milestones page, click Download Excel. Suffix becomes _Milestones." },
      { target: "Export the Gantt Chart.", action: "From the Gantt Card, click Export PNG or Export Excel. Suffix becomes _Gantt with .png / .xlsx as appropriate. The previous 'gantt-chart.png' generic name is gone." },
      { target: "Notice the middle slot.", action: "The middle slot uses the Project Name (short, informative). It is NOT the free-form Description field, which often contained junk values on legacy projects." },
      { target: "Empty pieces are skipped.", action: "If a customer or project name is missing, no dangling '__' separator appears — the builder drops empty pieces cleanly." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
];

const CATEGORIES = [...new Set(TUTORIALS.map(t => t.category))];

// Slideshow Component
const TutorialSlideshow = ({ tutorial, isOpen, onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const slides = TUTORIAL_IMAGES[tutorial?.id] || [];

  useEffect(() => {
    let interval;
    if (isPlaying && slides.length > 0) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 4000); // 4 seconds per slide
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setIsPlaying(false);
    }
  }, [isOpen, tutorial?.id]);

  if (!tutorial || slides.length === 0) return null;

  const Icon = tutorial.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden" data-testid="slideshow-dialog">
        <VisuallyHidden.Root>
          <DialogTitle>{tutorial?.title} Slideshow</DialogTitle>
        </VisuallyHidden.Root>
        <div className="bg-slate-900 text-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`${tutorial.color} rounded-lg p-2 text-white`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{tutorial.title}</h3>
                <p className="text-xs text-slate-400">Slide {currentSlide + 1} of {slides.length}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onClose(false)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Slide Content */}
          <div className="relative aspect-video bg-black">
            <img
              src={slides[currentSlide]?.src}
              alt={`Slide ${currentSlide + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => { e.target.src = '/tutorial_slides/dashboard.jpg'; }}
            />
            {/* Caption overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-white text-center">{slides[currentSlide]?.caption}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === currentSlide ? 'bg-sky-500 w-4' : 'bg-slate-600 hover:bg-slate-500'}`}
                  data-testid={`slide-dot-${idx}`}
                />
              ))}
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                className="text-slate-400 hover:text-white"
                data-testid="prev-slide-btn"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white bg-sky-600 hover:bg-sky-700 rounded-full w-10 h-10"
                data-testid="play-pause-btn"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                className="text-slate-400 hover:text-white"
                data-testid="next-slide-btn"
              >
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{tutorial.duration}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Tutorials = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedTutorial, setExpandedTutorial] = useState(null);
  const [activeTab, setActiveTab] = useState("walkthroughs");
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowTutorial, setSlideshowTutorial] = useState(null);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filtered = TUTORIALS
    .filter(t => selectedCategory === "all" || t.category === selectedCategory)
    .filter(t => !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase()));

  const openSlideshow = (tutorial) => {
    setSlideshowTutorial(tutorial);
    setSlideshowOpen(true);
  };

  return (
    <div data-testid="tutorials-page" className="max-w-[1200px] mx-auto space-y-6">
      
      {/* Slideshow Dialog */}
      <TutorialSlideshow
        tutorial={slideshowTutorial}
        isOpen={slideshowOpen}
        onClose={setSlideshowOpen}
      />

      {/* Header */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Tutorials</h1>
        <p className="text-base text-gray-600 mt-2">Guided walkthroughs, video slideshows, and interactive tours to help you master YASH EstPro</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="walkthroughs" data-testid="tab-walkthroughs">
            <BookOpen className="w-4 h-4 mr-1" /> Guided Walkthroughs
          </TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Video className="w-4 h-4 mr-1" /> Video Slideshows
          </TabsTrigger>
          <TabsTrigger value="tours" data-testid="tab-tours">
            <MapPin className="w-4 h-4 mr-1" /> Interactive Tours
          </TabsTrigger>
        </TabsList>

        {/* ===== WALKTHROUGHS TAB ===== */}
        <TabsContent value="walkthroughs" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-3 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tutorials..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="search-tutorials"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Badge>
              {CATEGORIES.map(cat => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tutorial Cards */}
          <div className="grid gap-4">
            {filtered.map((tutorial) => {
              const Icon = tutorial.icon;
              const isExpanded = expandedTutorial === tutorial.id;
              return (
                <Card
                  key={tutorial.id}
                  className={`border transition-all ${isExpanded ? "shadow-lg border-[#0EA5E9]/30" : "shadow-sm hover:shadow-md"}`}
                  data-testid={`tutorial-card-${tutorial.id}`}
                >
                  <CardHeader
                    className="cursor-pointer pb-3"
                    onClick={() => setExpandedTutorial(isExpanded ? null : tutorial.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`${tutorial.color} rounded-lg p-2.5 text-white shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <CardTitle className="text-lg font-bold text-[#0F172A]">{tutorial.title}</CardTitle>
                          <Badge variant="outline" className="text-xs shrink-0">{tutorial.category}</Badge>
                          {tutorial.updated && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#1E40AF] bg-[#1E40AF]/10 border border-[#1E40AF]/30 rounded-full px-2 py-0.5"
                              data-testid={`tutorial-updated-badge-${tutorial.id}`}
                              title={`Last updated: ${tutorial.updated}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF] animate-pulse" />
                              Updated · {tutorial.updated}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{tutorial.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {tutorial.duration}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          {tutorial.steps.length} steps
                        </span>
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Step-by-Step Walkthrough</h4>
                        <div className="space-y-2">
                          {tutorial.steps.map((step, idx) => (
                            <div key={idx} className="flex gap-3 items-start group">
                              <div className={`${tutorial.color} text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-[#0F172A]">{step.target}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{step.action}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2 border-t mt-4 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              const routes = {
                                "create-project": "/estimator",
                                "wave-grid": "/estimator",
                                "excel-export": "/estimator",
                                "version-comparison": "/projects",
                                "approval-workflow": "/estimator",
                                "dashboard-analytics": "/dashboard",
                                "master-data": "/skills",
                                "payment-milestones": "/milestones",
                                "cashflow-statement": "/cashflow",
                                "gantt-chart": "/estimator",
                                "activity-templates": "/activity-templates",
                              };
                              navigate(routes[tutorial.id] || "/dashboard");
                            }}
                            data-testid={`goto-${tutorial.id}`}
                          >
                            <Monitor className="w-3 h-3 mr-1" /> Open in App
                          </Button>
                          {tutorial.hasSlideshow && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => openSlideshow(tutorial)}
                              data-testid={`slideshow-${tutorial.id}`}
                            >
                              <CirclePlay className="w-3 h-3 mr-1" /> Watch Slideshow
                            </Button>
                          )}
                          {tutorial.hasTour && TOUR_NAV[tutorial.id] && (
                            <Button
                              size="sm"
                              className="text-xs bg-sky-500 hover:bg-sky-600"
                              onClick={() => navigate(TOUR_NAV[tutorial.id])}
                              data-testid={`tour-${tutorial.id}`}
                            >
                              <MapPin className="w-3 h-3 mr-1" /> Try It
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-400">No tutorials match your search.</div>
            )}
          </div>
        </TabsContent>

        {/* ===== VIDEO SLIDESHOWS TAB ===== */}
        <TabsContent value="videos" className="space-y-4">
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex items-start gap-3">
            <Video className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-sky-800">Screenshot-based video slideshows</p>
              <p className="text-xs text-sky-600 mt-1">Click any tutorial card to watch an auto-playing slideshow of the feature in action.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {TUTORIALS.filter(t => t.hasSlideshow).map((tutorial) => {
              const Icon = tutorial.icon;
              const slides = TUTORIAL_IMAGES[tutorial.id] || [];
              const previewImage = slides[0]?.src || '/tutorial_slides/dashboard.jpg';
              
              return (
                <Card 
                  key={tutorial.id} 
                  className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer group" 
                  data-testid={`video-card-${tutorial.id}`}
                  onClick={() => openSlideshow(tutorial)}
                >
                  <CardContent className="pt-6">
                    {/* Video preview with play overlay */}
                    <div className="relative rounded-lg overflow-hidden aspect-video mb-4 bg-slate-900">
                      <img 
                        src={previewImage} 
                        alt={tutorial.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { e.target.src = '/tutorial_slides/dashboard.jpg'; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-sky-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-white ml-1" />
                        </div>
                      </div>
                      <Badge className="absolute top-2 right-2 bg-black/60 text-white text-[10px]">
                        <Clock className="w-2.5 h-2.5 mr-0.5" /> {tutorial.duration}
                      </Badge>
                      <Badge className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px]">
                        {slides.length} slides
                      </Badge>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`${tutorial.color} rounded p-1.5 text-white shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[#0F172A]">{tutorial.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{tutorial.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== QUICK NAVIGATION TAB ===== */}
        <TabsContent value="tours" className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Quick Navigation</p>
              <p className="text-xs text-emerald-600 mt-1">Jump directly to the relevant page to try out features hands-on. Each card links to the area described in the tutorial.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TUTORIALS.filter(t => t.hasTour && TOUR_NAV[t.id]).map((tutorial) => {
              const Icon = tutorial.icon;
              
              return (
                <Card 
                  key={tutorial.id} 
                  className="border shadow-sm hover:shadow-md transition-shadow" 
                  data-testid={`tour-card-${tutorial.id}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className={`${tutorial.color} rounded-lg p-2.5 text-white shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0F172A]">{tutorial.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{tutorial.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        <span>{tutorial.steps?.length || 0} steps</span>
                      </div>
                      <Button
                        size="sm"
                        className="text-xs bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => navigate(TOUR_NAV[tutorial.id])}
                        data-testid={`start-tour-${tutorial.id}`}
                      >
                        <MapPin className="w-3 h-3 mr-1" /> Try It
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {TUTORIALS.filter(t => t.hasTour && TOUR_NAV[t.id]).length === 0 && (
            <div className="text-center py-12 text-gray-400">No quick navigation links available yet.</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      <Card className="border border-[#E2E8F0] bg-gradient-to-r from-slate-50 to-sky-50">
        <CardContent className="pt-6">
          <h3 className="font-bold text-[#0F172A] mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" /> Quick Keyboard Shortcuts
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-white border rounded text-xs font-mono shadow-sm">Ctrl + S</kbd>
              <span className="text-gray-600">Save project</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-white border rounded text-xs font-mono shadow-sm">Tab</kbd>
              <span className="text-gray-600">Move to next field</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-0.5 bg-white border rounded text-xs font-mono shadow-sm">Esc</kbd>
              <span className="text-gray-600">Close dialog</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          data-testid="back-to-top-btn"
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-sky-500 text-white shadow-lg hover:bg-sky-600 transition-all flex items-center justify-center"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default Tutorials;
