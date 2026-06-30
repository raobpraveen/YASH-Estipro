import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer, Search, ChevronDown, ChevronRight, BookOpen,
  LayoutDashboard, FolderKanban, Calculator, Layers, FileSpreadsheet,
  Settings, ArrowRight, CheckCircle, AlertTriangle, Info, ArrowUp
} from "lucide-react";

const TOC = [
  { id: "whats-new", title: "0. What's New (2026)", icon: Info },
  { id: "getting-started", title: "1. Getting Started", icon: BookOpen },
  { id: "dashboard", title: "2. Dashboard & Analytics", icon: LayoutDashboard },
  { id: "projects", title: "3. Project Management", icon: FolderKanban },
  { id: "estimator", title: "4. Estimation Workspace", icon: Calculator },
  { id: "wave-grid", title: "5. Wave Grid Operations", icon: Layers },
  { id: "cost-calc", title: "6. Cost Calculations & CTC", icon: Calculator },
  { id: "logistics", title: "7. Logistics Configuration", icon: Settings },
  { id: "excel-export", title: "8. Excel Export", icon: FileSpreadsheet },
  { id: "quick-estimator", title: "9. Quick Estimate Calculator", icon: Calculator },
  { id: "workflow", title: "10. Approval Workflow", icon: CheckCircle },
  { id: "access-control", title: "11. Access Level (Project Visibility)", icon: Settings },
  { id: "version-mgmt", title: "12. Versioning & Comparison", icon: FolderKanban },
  { id: "smart-import", title: "13. Smart Import", icon: FileSpreadsheet },
  { id: "gantt-chart", title: "14. Gantt Chart / Timeline", icon: FileSpreadsheet },
  { id: "milestones", title: "15. Payment Milestones & Markers", icon: Calculator },
  { id: "cashflow", title: "16. Cashflow Statement", icon: Calculator },
  { id: "proficiency-copy", title: "17. Copy Skill in Proficiency Rates", icon: Layers },
  { id: "tutorials", title: "18. Tutorials & Help", icon: BookOpen },
  { id: "settings", title: "19. Settings & Profile", icon: Settings },
  { id: "shortcuts", title: "20. Keyboard Shortcuts & Tips", icon: Info },
  { id: "activity-templates", title: "21. Activity Templates & Deliverables", icon: Layers },
];

const Section = ({ id, title, updated, children }) => (
  <section id={id} className="mb-10 scroll-mt-20" data-testid={`manual-section-${id}`}>
    <div className="flex items-baseline gap-3 flex-wrap border-b-2 border-[#1E40AF] pb-2 mb-4">
      <h2 className="text-2xl font-bold text-[#0F172A]">{title}</h2>
      {updated && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#1E40AF] bg-[#1E40AF]/10 border border-[#1E40AF]/30 rounded-full px-2 py-0.5"
          data-testid={`manual-updated-badge-${id}`}
          title={`Last updated: ${updated}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF] animate-pulse" />
          Updated · {updated}
        </span>
      )}
    </div>
    <div className="space-y-4 text-gray-700 leading-relaxed">{children}</div>
  </section>
);

const Tip = ({ children }) => (
  <div className="flex gap-3 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg my-3">
    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-blue-800">{children}</div>
  </div>
);

const Warning = ({ children }) => (
  <div className="flex gap-3 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg my-3">
    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
    <div className="text-sm text-amber-800">{children}</div>
  </div>
);

const Step = ({ num, children }) => (
  <div className="flex gap-3 items-start my-2">
    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#1E40AF] text-white text-sm font-bold flex items-center justify-center">{num}</span>
    <div className="text-sm pt-0.5">{children}</div>
  </div>
);

const KeyValue = ({ label, children }) => (
  <div className="grid grid-cols-[180px_1fr] gap-2 py-1.5 border-b border-gray-100 text-sm">
    <span className="font-semibold text-gray-600">{label}</span>
    <span>{children}</span>
  </div>
);

export default function UserManual() {
  const [search, setSearch] = useState("");
  const [expandedToc, setExpandedToc] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const contentRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredTOC = TOC.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto" data-testid="user-manual-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:mb-2">
        <div className="flex items-center gap-4">
          <img src="/yash-logo-new.png" alt="YASH" className="h-10 object-contain" />
          <img src="/estipro-logo-new.png" alt="EstiPro" className="h-10 object-contain" />
          <div className="ml-2">
            <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">User Manual</h1>
            <p className="text-sm text-gray-500">YASH EstiPro &mdash; Project Cost Estimator</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white print:hidden" data-testid="print-manual-btn">
          <Printer className="w-4 h-4 mr-2" /> Download / Print
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sticky Table of Contents */}
        <aside className="w-72 flex-shrink-0 print:hidden">
          <Card className="sticky top-20 border border-gray-200">
            <CardContent className="p-4">
              <button
                onClick={() => setExpandedToc(!expandedToc)}
                className="flex items-center justify-between w-full mb-3"
              >
                <span className="font-bold text-sm text-[#0F172A] uppercase tracking-wide">Table of Contents</span>
                {expandedToc ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              {expandedToc && (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    <Input
                      placeholder="Search sections..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs"
                      data-testid="manual-search"
                    />
                  </div>
                  <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto">
                    {filteredTOC.map(item => (
                      <button
                        key={item.id}
                        onClick={() => scrollTo(item.id)}
                        className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-100 hover:text-[#1E40AF] transition-colors"
                      >
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{item.title}</span>
                      </button>
                    ))}
                  </nav>
                </>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0" ref={contentRef}>
          {/* Section 0: What's New */}
          <Section id="whats-new" title="0. What's New (2026)" updated="Feb 2026 · Iter 64">
            <p>Recent updates rolled out across Phase 4, Phase 5, Iteration 56, and the AMS Shared Support rollout (Iterations 57–64). The most impactful changes are highlighted here so you can spot the differences quickly.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.1 Status &amp; Workflow</h3>
            <KeyValue label="Commercial Status">A separate post-approval field with options: Pending for Submission, Submitted to Customer, Won, Lost, Cancelled. Visible only on Approved / Suspended / In Review projects. Displayed as a badge in the Projects list.</KeyValue>
            <KeyValue label="Previous Status Tracking">Suspending an Approved version now displays "Suspended (was Approved)" so you don't lose the original approval context when comparing versions.</KeyValue>
            <KeyValue label="Latest-Version Filtering">The Milestones page and other downstream screens now show only the latest version of each project by default — no more accidental edits on superseded estimates.</KeyValue>
            <KeyValue label="Excel Export Technology Column">A new Technology column has been added at column 2 of every wave sheet (between # and Skill). Smart Import maps this column back during upload.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.2 Security &amp; Cashflow</h3>
            <KeyValue label="Session Timeout">After 15 minutes of inactivity (no mouse, keyboard, scroll, or touch events) you'll see a 2-minute warning dialog with a live countdown. Click <strong>"Stay signed in"</strong> to extend, or <strong>"Sign out now"</strong> to log out immediately. If the countdown hits zero you're auto-logged out and shown a notification toast.</KeyValue>
            <KeyValue label="Advance Payment Milestone">A new Advance checkbox on each Payment Milestone marks it as an upfront payment. In the Cashflow:
              <ul className="list-disc pl-6 mt-1 text-xs">
                <li>A purple <strong>Advance Payment</strong> summary card appears (with % of total revenue).</li>
                <li>Per-wave and Combined Monthly Summary rows holding advance receipts get a purple background and an <em>ADV</em> / <em>ADVANCE</em> badge.</li>
                <li>Advance milestones <strong>bypass payment terms</strong> — cash-in posts in the same target month, regardless of the project's payment-terms-days setting.</li>
              </ul>
            </KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.3 Wave Grid Improvements</h3>
            <KeyValue label="Sticky Header Row">Column titles in the Wave Grid stay visible while you scroll vertically through long resource lists. Frozen columns (Skill / Level / Location / $/Month / Onsite / Travel / Grp) also stay anchored on horizontal scroll, giving you a two-axis sticky view.</KeyValue>
            <KeyValue label="Add Row Button Repositioned">The "Add Row" button is now placed <strong>directly below the wave grid</strong> and <strong>before</strong> the Logistics Cost breakdown. Clicking it adds a blank row with sensible defaults (no dialog) for fast manual entry.</KeyValue>
            <KeyValue label="Skill Filter on Add Row">When you select Technologies in Project Information, the inline Skill dropdown (and the new Add Row default skill) is automatically narrowed to skills that match those technologies.</KeyValue>
            <KeyValue label="Phase Milestones Collapse">A per-wave collapse/expand toggle has been added on the Phase Milestones subsection so you can keep long projects compact without affecting other waves.</KeyValue>
            <KeyValue label="Split-Allocation Fix">The "Apply value to months" dialog now correctly handles split patterns like <code className="bg-gray-100 px-1 rounded">M1-M3:1, M4-M5:2, M6:1</code>. The previous version silently dropped values due to a key-mismatch bug.</KeyValue>
            <KeyValue label="M1, M2 Default Headers">New waves and newly added months default to short headers (M1, M2, M3 …) instead of "Month 1, Month 2 …" to match the rest of the application's notation.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.4 Project Information Updates</h3>
            <KeyValue label="Bid Category Cleanup">"Won" and "Loss" are removed from the Bid Category dropdown — those outcomes now belong on the Commercial Status field. Available values: <em>None, Budgetary, Most Likely, Committed</em>.</KeyValue>
            <KeyValue label="Always-Editable Fields">Bid Category and Forecasted Closure Date stay editable even on Approved / Suspended / In Review projects, since these values legitimately change post-approval.</KeyValue>
            <KeyValue label="Competency Master Data">A dedicated Competencies master with Add / Edit / Delete. Projects can be tagged with multiple competencies via the Competency multi-select.</KeyValue>
            <KeyValue label="Searchable Customer Dropdown">Customer selection now uses a Popover combobox with type-ahead search — much faster than scrolling through long lists.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.5 New Filters in Projects List</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Bid Category</strong> — narrows results to Budgetary / Most Likely / Committed.</li>
              <li><strong>Competency</strong> — single-select dropdown sourced from the Competencies master data.</li>
              <li><strong>Forecasted Closure From / To</strong> — date range filter that includes only projects whose Forecasted Closure Date falls within the window.</li>
              <li>The existing <strong>Status</strong> filter and <strong>Totals</strong> row still work alongside these new filters.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.6 AMS Shared Support (Iter 57–63)</h3>
            <KeyValue label="Engagement Type per Wave">When you add a wave, the new <strong>Engagement Type</strong> dropdown lets you mark it as <em>Implementation</em> (default, T&M), <em>AMS — Shared Support</em>, <em>AMS — Dedicated</em>, or <em>AMS — Mix</em> (T&M + shared support in one wave).</KeyValue>
            <KeyValue label="Service Buckets">Pure AMS waves replace the resource grid with an <strong>AMS Shared Support panel</strong>. Add as many service buckets as you need (e.g. L1 Tickets, L2 Support, Patching) with <em>Hours/Month</em>, <em>Hourly Price</em> (customer-facing rate), and <em>Cost Rate</em> (internal cost per hour). Billing/Month and Billing/Year are auto-computed.</KeyValue>
            <KeyValue label="Hourly Price (renamed)">The column previously labelled <em>Hourly Rate</em> is now <strong>Hourly Price</strong> everywhere in the AMS panel, Payment Milestones AMS card, and the Excel AMS sheet. (T&M <em>$/Hr</em> labels are unchanged.)</KeyValue>
            <KeyValue label="Contract Length, Billing Frequency, Bill in Advance">Each AMS wave now exposes three fields, editable both at wave-creation time and inline from the AMS panel:
              <ul className="list-disc pl-6 mt-1 text-xs">
                <li><strong>Contract Length</strong> (months) — default 12. Used for the annual billing/cost rollup.</li>
                <li><strong>Billing Frequency</strong> — <em>Monthly</em> or <em>Quarterly</em>. Quarterly groups three months into one billing period.</li>
                <li><strong>Bill in Advance</strong> — checkbox. ON = customer pays at the start of each billing period and payment-terms days are ignored. OFF = each period's amount lands as cash-in after the period ends, shifted by the project's payment-terms days.</li>
              </ul>
            </KeyValue>
            <KeyValue label="Payment Milestones — AMS Billing Schedule">For every AMS wave the Payment Milestones page now auto-renders a read-only <strong>Billing Schedule</strong> table showing every billing period (M1, M2, …, or Q1, Q2, …), the months it covers, the cash-in timing, and the amount. When <em>Bill in Advance</em> is ON, each row gets an <em>ADV</em> badge. The total scheduled = monthly billing × contract months.</KeyValue>
            <KeyValue label="Cashflow Integration">AMS revenue flows into the Cashflow according to billing frequency + advance:
              <ul className="list-disc pl-6 mt-1 text-xs">
                <li>Monthly + Advance ON → revenue at the first day of every month.</li>
                <li>Monthly + Advance OFF → revenue at <em>month + payment-terms days</em>.</li>
                <li>Quarterly + Advance ON → revenue concentrated at M1, M4, M7, M10 (each three months of billing in one inflow).</li>
                <li>Quarterly + Advance OFF → revenue lands at <em>quarter-end + payment-terms days</em>.</li>
                <li>AMS cost (hours × cost_rate) stays as a level monthly outflow regardless of how the customer is billed.</li>
              </ul>
            </KeyValue>
            <KeyValue label="Excel Round-trip">The AMS sheet of an exported workbook now embeds the engagement type, contract months, billing frequency, and the <em>Advance</em> flag in its header. Smart Import reads them back correctly even when the AMS wave has zero implementation resources (this previously dropped pure AMS sheets — fixed in Iter 63).</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-4">0.7 Margin &amp; CTC Updates (Iter 62–64)</h3>
            <KeyValue label="AMS Cost rolls into Total CTC">The Overall Summary's <strong>Total CTC</strong> card now includes AMS internal cost (<code className="bg-gray-100 px-1 rounded">hours/month × cost_rate × contract_months</code>) for every AMS_Shared / AMS_Mix wave. When AMS cost is present, the card subtitle reads <em>"all resources + AMS cost ($X)"</em>.</KeyValue>
            <KeyValue label="Effective Margin (with overrides) uses Grand Total Revenue">The Effective Margin chip now divides by the project's <strong>Grand Total Final Price</strong> (= T&M Final Price + AMS Annual Billing) instead of resource selling price alone. Formula: <code className="bg-gray-100 px-1 rounded">(GrandTotal − Total CTC) ÷ GrandTotal × 100</code>. For implementation-only projects the value is unchanged; for AMS / Mix projects the chip now reflects the true blended margin.</KeyValue>
            <KeyValue label="Salary Formula Cells">The <em>$/Month</em> column accepts arithmetic expressions: <code className="bg-gray-100 px-1 rounded">3200+500</code>, <code className="bg-gray-100 px-1 rounded">3200*25%</code>, <code className="bg-gray-100 px-1 rounded">3200-25%</code>. Press <em>Enter</em> or click away to evaluate; <em>Esc</em> reverts.</KeyValue>
            <KeyValue label="Sub-month Phases">Phase Range inputs accept 0.25-month steps for precise short-phase modelling (e.g. a 2-week sprint = 0.5).</KeyValue>

            <Tip>If you see something in this section that's not yet visible in the UI, hard-refresh your browser (Ctrl+Shift+R / Cmd+Shift+R) to ensure you're on the latest build.</Tip>
          </Section>

          {/* Section 1: Getting Started */}
          <Section id="getting-started" title="1. Getting Started">
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">1.1 Logging In</h3>
            <Step num="1">Navigate to the application URL in your browser.</Step>
            <Step num="2">Enter your registered <strong>Email</strong> and <strong>Password</strong>.</Step>
            <Step num="3">Click <strong>"Sign In"</strong> to access the dashboard.</Step>
            <Tip>If you've forgotten your password, contact your administrator to have it reset.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">1.1.1 Session Timeout</h3>
            <p>For security, your session is automatically signed out after <strong>15 minutes of inactivity</strong> (no mouse, keyboard, scroll, or touch events). A warning dialog with a live countdown appears <strong>2 minutes</strong> before logout — click <strong>"Stay signed in"</strong> to extend, or <strong>"Sign out now"</strong> to log out immediately.</p>
            <Tip>Long-running activities such as Excel exports or chart rendering count as activity, so you won't be timed out mid-task.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">1.2 User Roles</h3>
            <p>YASH EstiPro supports three user roles with different access levels:</p>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-3 text-left">Role</th><th className="p-3 text-left">Capabilities</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-3 font-semibold">Admin</td><td className="p-3">Full access: create/edit/delete projects, manage users, configure master data, approve/reject projects, view audit logs.</td></tr>
                  <tr className="border-b"><td className="p-3 font-semibold">Approver</td><td className="p-3">Create/edit projects, approve or reject projects submitted for review.</td></tr>
                  <tr><td className="p-3 font-semibold">User</td><td className="p-3">Create and edit own projects, submit for review. Cannot approve/reject.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">1.3 Navigation</h3>
            <p>The sidebar provides access to all areas of the application:</p>
            <KeyValue label="Dashboard">Estimations overview with analytics and KPIs.</KeyValue>
            <KeyValue label="Estimator">Create or edit project estimations.</KeyValue>
            <KeyValue label="Projects">Browse, filter, and manage all projects.</KeyValue>
            <KeyValue label="Milestones">Define payment schedules and milestones per wave for any project version.</KeyValue>
            <KeyValue label="Cashflow">View monthly cash outflows vs. inflows with combined summary and charts.</KeyValue>
            <KeyValue label="Master Data">Manage Skills, Locations, Technologies, Sub Technologies, Customers, and more.</KeyValue>
            <KeyValue label="Activity Templates">Define and manage phase-wise activity and deliverable templates by Technology, Sub-Technology, and Project Type.</KeyValue>
            <KeyValue label="Help">Access User Manual, Support Guide, and Tutorials from the collapsible Help section.</KeyValue>
            <KeyValue label="Settings">Personal profile, theme, and date format preferences.</KeyValue>
            <Tip>Use <strong>Ctrl+B</strong> (or <strong>Cmd+B</strong> on Mac) to toggle the sidebar between expanded and collapsed modes.</Tip>
          </Section>

          {/* Section 2: Dashboard */}
          <Section id="dashboard" title="2. Dashboard & Analytics">
            <p>The <strong>Estimations Overview</strong> dashboard provides a high-level summary of all project estimations in the system.</p>
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">2.1 KPI Cards</h3>
            <KeyValue label="Total Projects">Count of all projects in the system.</KeyValue>
            <KeyValue label="Active Projects">Projects currently in Draft or In Review status.</KeyValue>
            <KeyValue label="Total Estimated Value">Sum of all project final prices.</KeyValue>
            <KeyValue label="Approved Projects">Projects that have received approval.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">2.2 Charts & Analytics</h3>
            <p>The dashboard displays interactive charts including:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Projects by Status</strong> &mdash; Pie chart showing distribution across Draft, In Review, Approved, and Rejected.</li>
              <li><strong>Estimation Trends</strong> &mdash; Bar chart showing project creation over time.</li>
              <li><strong>Top Projects by Value</strong> &mdash; Ranking of highest-value estimations.</li>
              <li><strong>Technology Distribution</strong> &mdash; Breakdown of technologies used across projects.</li>
            </ul>
            <Tip>Use the time range and status filters at the top of the dashboard to narrow down the analytics view.</Tip>
          </Section>

          {/* Section 3: Project Management */}
          <Section id="projects" title="3. Project Management">
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">3.1 Projects List &amp; Filters</h3>
            <p>The Projects page displays all estimations with filtering and sorting capabilities. Open the <strong>Filters</strong> panel from the toolbar to access:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Customer Name</strong>, <strong>Project Name / Description</strong>, <strong>Created By</strong>, <strong>Date From / To</strong> (creation date range).</li>
              <li><strong>Sales Manager</strong>, <strong>Project Type</strong>, <strong>Technology</strong>, <strong>Status</strong>.</li>
              <li><strong>Bid Category</strong> — Budgetary / Most Likely / Committed.</li>
              <li><strong>Competency</strong> — single-select dropdown sourced from the Competencies master data.</li>
              <li><strong>Forecasted Closure From / To</strong> — date range filter on the Forecasted Closure Date field.</li>
            </ul>
            <p>Projects are sorted by <strong>Project Number descending</strong> by default. The <strong>Totals</strong> row at the bottom of the list always reflects the currently filtered set (Man-Months, Selling Price, Nego Buffer, Final Price). The "Latest Version" green dot badge highlights the most recent version of each project number.</p>
            <KeyValue label="Actions">Edit, view summary, compare versions, clone, or archive projects.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">3.2 Creating a New Project</h3>
            <Step num="1">Click <strong>"Estimator"</strong> in the sidebar.</Step>
            <Step num="2">Fill in the project details: Name, Customer, Technology, Sub Technology, Project Type, Sales Manager, CRM ID, Profit Margin %, and Nego Buffer %.</Step>
            <Step num="3">Add waves with monthly phases and resource allocations.</Step>
            <Step num="4">Click <strong>"Save"</strong> to create the project as a Draft.</Step>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">3.3 Project Summary</h3>
            <p>The Project Summary page shows a comprehensive overview including:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Project metadata (name, customer, technology, dates)</li>
              <li>Overall cost breakdown (MM, CTC, Selling Price, Final Price)</li>
              <li>Wave-by-wave summary with resource details</li>
              <li>Version history and status</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">3.4 Cloning Projects</h3>
            <p>To create a new project based on an existing estimation, use the <strong>Clone</strong> action from the Projects list. This copies all waves, resources, and configurations into a new draft project.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">3.5 Deleting Projects</h3>
            <p>When a project is deleted, the system performs a <strong>cascade delete</strong> to ensure data integrity:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Payment Milestones</strong> &mdash; All milestones and markers linked to the project are removed.</li>
              <li><strong>Project Activities</strong> &mdash; All adopted template activities and wave-specific activities are removed.</li>
            </ul>
            <Warning>Project deletion is permanent and cannot be undone. Consider archiving projects instead if you may need the data later.</Warning>
          </Section>

          {/* Section 4: Estimator */}
          <Section id="estimator" title="4. Estimation Workspace">
            <p>The Estimator is the core workspace for building project cost estimations.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">4.1 Project Header</h3>
            <p>The top section captures key project information:</p>
            <KeyValue label="Project Name">Descriptive name for the estimation.</KeyValue>
            <KeyValue label="Customer">Selected from master data.</KeyValue>
            <KeyValue label="Technology">Primary technology stack.</KeyValue>
            <KeyValue label="Project Type">Category (Fixed Price, T&M, etc.).</KeyValue>
            <KeyValue label="Sub Technology">Sub-categories linked to parent technologies (e.g., SAP FICO under SAP). Managed in Master Data.</KeyValue>
            <KeyValue label="CRM ID">External CRM reference identifier (max 30 characters).</KeyValue>
            <KeyValue label="Sales Manager">Assigned sales contact.</KeyValue>
            <KeyValue label="Profit Margin %">Target margin applied to all resources.</KeyValue>
            <KeyValue label="Nego Buffer %">Negotiation buffer applied to the final selling price.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">4.2 Overall Summary Cards</h3>
            <p>Above the wave tabs, summary cards display aggregated metrics across all waves:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Total MM, Onsite MM, Offshore MM</strong> &mdash; Man-month totals</li>
              <li><strong>Resources Price, Logistics</strong> &mdash; Cost components</li>
              <li><strong>Onsite/Offshore Avg $/MM and Selling Price</strong> &mdash; Per-location pricing</li>
              <li><strong>CTC Analytics</strong> &mdash; Onsite CTC, Offshore CTC, Avg CTC/MM, Total CTC (Cost to Company = Salary + Overhead)</li>
              <li><strong>Total Selling Price, Nego Buffer, Final Price</strong> &mdash; Final pricing</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">4.3 Wave Tabs</h3>
            <p>Projects are organized into waves (phases). Each wave tab shows:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Wave name and description (editable)</li>
              <li>Duration, resource count, onsite/traveling count</li>
              <li>The resource allocation grid</li>
              <li>Wave-level summary cards including CTC analytics</li>
            </ul>
            <Tip>Click <strong>"+ Add Wave"</strong> to add a new estimation phase. Use <strong>"Clone Wave"</strong> to duplicate an existing wave's configuration.</Tip>
          </Section>

          {/* Section 5: Wave Grid */}
          <Section id="wave-grid" title="5. Wave Grid Operations">
            <p>The wave grid is the heart of the estimation, where individual resources and their monthly allocations are managed.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">5.1 Grid Columns</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Column</th><th className="p-2 text-left">Description</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-semibold">#</td><td className="p-2">Row number. Drag the grip handle to reorder rows.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Skill</td><td className="p-2">Resource skill/role (searchable dropdown). Hover to see full description.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Level</td><td className="p-2">Proficiency level (Junior, Mid, Senior, Lead, Architect, PM, Delivery).</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Location</td><td className="p-2">Base location (determines salary lookup).</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">$/Month</td><td className="p-2">Average monthly salary (auto-populated from proficiency rates).</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Onsite</td><td className="p-2">ON/OFF toggle indicating if the resource is onsite.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Travel</td><td className="p-2">YES/NO toggle indicating if travel logistics apply.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Grp</td><td className="p-2">Resource Group ID to link related rows (e.g., same person split onsite/offshore). Matching groups get a colored left border.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">M1..MN</td><td className="p-2">Man-month allocation for each phase month (0 to 1.0 typically). Default headers are M1, M2, M3 — you can rename them to phase labels like "Sprint 1" if you prefer.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Total MM</td><td className="p-2">Sum of all monthly allocations for this row.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Salary Cost</td><td className="p-2">$/Month &times; Total MM.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Overhead</td><td className="p-2">Overhead cost (Salary &times; OH%).</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Total Cost</td><td className="p-2">Salary + Overhead (CTC).</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Selling Price</td><td className="p-2">Total Cost / (1 &minus; Profit Margin%).</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">SP/MM</td><td className="p-2">Selling Price per Man-Month.</td></tr>
                  <tr className="border-b"><td className="p-2 font-semibold">Hourly</td><td className="p-2">SP/MM / ~176 working hours.</td></tr>
                  <tr><td className="p-2 font-semibold">Comments</td><td className="p-2">Free-text notes for each resource row.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.2 Frozen Columns &amp; Sticky Header</h3>
            <p>Column titles are now <strong>sticky on vertical scroll</strong> — when you scroll down through a long resource list, the header row stays pinned to the top of the grid container.</p>
            <p>The following columns are also <strong>frozen on horizontal scroll</strong> (left-side sticky):</p>
            <ul className="list-disc pl-6 space-y-1 text-sm ml-4">
              <li><strong>#</strong> - Row number</li>
              <li><strong>Skill</strong> - Resource skill/role</li>
              <li><strong>Level</strong> - Proficiency level (Junior, Mid, Senior, Lead)</li>
              <li><strong>Location</strong> - Base location</li>
              <li><strong>$/Month</strong> - Monthly salary</li>
              <li><strong>Onsite</strong> - ON/OFF toggle for onsite status</li>
              <li><strong>Travel</strong> - YES/NO toggle for travel logistics</li>
              <li><strong>Grp</strong> - Resource Group ID</li>
            </ul>
            <p className="text-sm mt-2">A shadow separator appears after the Grp column, visually distinguishing the frozen identification columns from the scrollable phase allocation and cost columns.</p>
            <Tip>This design allows you to always identify which resource you're viewing while scrolling to the monthly allocations, Selling Price, or Override Hourly columns on the right.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.3 Row Operations</h3>
            <KeyValue label="Add Resource">Toolbar button. Opens a dialog to select Skill, Level, Location with full filtering. Salary auto-populates from proficiency rates.</KeyValue>
            <KeyValue label="Add Row (toolbar)">Adds a single blank row at the bottom of the grid using project-default skill (filtered by selected Technologies) and the first available location.</KeyValue>
            <KeyValue label="Add Row (below grid)">A second Add Row button is positioned <strong>directly under the wave grid</strong> (before the Logistics breakdown). It performs the same blank-row insert and is the recommended quick-entry control.</KeyValue>
            <KeyValue label="Drag & Drop">Reorder rows by dragging the grip handle on the left.</KeyValue>
            <KeyValue label="Delete Row">Click the trash icon on the right to remove a resource.</KeyValue>
            <KeyValue label="Apply to Months">Click the calculator icon to set the same allocation across all months — supports split ranges like <code className="bg-gray-100 px-1 rounded">M1-M3:1, M4-M5:2, M6:1</code>.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.4 Resource Group ID</h3>
            <p>Use the <strong>Grp</strong> column to link related rows. For example, if the same consultant works 50% onsite and 50% offshore, create two rows and assign them the same Group ID (e.g., "1"). Rows with the same group get matching colored left borders for easy visual identification.</p>
            <Tip>Group IDs help with accurate headcount tracking when a single resource spans multiple deployment types.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.5 Row Color Coding</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Color</th><th className="p-2 text-left">Meaning</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-amber-100"><td className="p-2 font-semibold">Amber (warm)</td><td className="p-2">Onsite resource with Travel logistics applied.</td></tr>
                  <tr className="border-b bg-amber-50"><td className="p-2 font-semibold">Light amber</td><td className="p-2">Onsite resource, no travel.</td></tr>
                  <tr className="bg-white"><td className="p-2 font-semibold">White</td><td className="p-2">Offshore resource.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.6 Skill Tooltip</h3>
            <p>Hover over any <strong>Skill</strong> cell in the grid to see a tooltip with the full skill name, proficiency level, and base location. This is especially useful when skill names are truncated in the dropdown.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.7 Toolbar Actions</h3>
            <KeyValue label="Logistics Config">Configure per-diem, accommodation, travel costs for this wave.</KeyValue>
            <KeyValue label="Add/Remove Month">Dynamically add or remove phase columns.</KeyValue>
            <KeyValue label="Download Template">Export an Excel template for bulk data entry.</KeyValue>
            <KeyValue label="Download Data">Export current grid data as Excel.</KeyValue>
            <KeyValue label="Upload Grid">Import data from an Excel template.</KeyValue>
            <KeyValue label="Clone Wave">Create a copy of the current wave.</KeyValue>
            <KeyValue label="Delete Wave">Remove the current wave (with confirmation).</KeyValue>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.8 Phase Ranges &amp; Auto-Generated Gantt Chart</h3>
            <p>Each wave has a collapsible <strong>Phase Range Editor</strong> section below the toolbar buttons. Define phase <strong>ranges</strong> with a start and end value. Phases can <strong>overlap</strong> and support <strong>half-month precision</strong> (step 0.5).</p>
            
            <p className="font-medium mt-3 text-sm">How to Define Phases:</p>
            <ul className="list-disc pl-6 space-y-0.5 text-sm">
              <li>Click the <strong>"Phase Ranges"</strong> header to expand the editor (click again to collapse and save screen space).</li>
              <li>Click <strong>"+ Add Phase"</strong> to add a new phase range.</li>
              <li>Select a <strong>Phase Name</strong> from the dropdown or choose "+ Custom..." for a custom name.</li>
              <li>Set <strong>Start</strong> and <strong>End</strong> values using numeric inputs with <strong>0.5 step increments</strong> (e.g., 1, 1.5, 2, 2.5, 3).</li>
              <li>Example: Explore starts at <strong>1.5</strong> and ends at <strong>3</strong>, meaning it begins mid-month 1 and runs through the end of month 3.</li>
              <li>The <strong>Timeline Preview</strong> below shows continuous color-coded bars with precise positioning.</li>
              <li>Click the trash icon to remove a phase range.</li>
            </ul>

            <p className="font-medium mt-3 text-sm">Phase Milestones (Inline Editor):</p>
            <p className="text-sm">Below the phase list, a <strong>Phase Milestones</strong> section shows milestones grouped by phase. A <strong>total payment % badge</strong> (color-coded: amber &lt;100%, green =100%, red &gt;100%) and dollar amount are displayed in the header.</p>
            <ul className="list-disc pl-6 space-y-0.5 text-sm">
              <li><strong>"+ Payment"</strong>: Add a payment milestone linked to that phase with a position (Start / Mid / End) and payment percentage. The dollar amount auto-calculates from the wave's final selling price.</li>
              <li><strong>"+ Marker"</strong>: Add a freehold marker milestone (no payment linkage). Markers use a <strong>0-100% slider</strong> to position them anywhere on the phase bar — ideal for tracking Sprint milestones, UAT, or phase closure checkpoints.</li>
              <li>Payment milestones appear as <strong>amber diamonds</strong> on the Gantt chart; markers appear as <strong>blue diamonds</strong>.</li>
              <li>Milestones added here are <strong>synced bidirectionally</strong> with the dedicated Payment Milestones page.</li>
            </ul>

            <p className="font-medium mt-3 text-sm">Half-Month Precision:</p>
            <ul className="list-disc pl-6 space-y-0.5 text-sm">
              <li>Integer values (1, 2, 3...) represent full month boundaries.</li>
              <li>Half values (1.5, 2.5, 3.5...) represent the midpoint of a month.</li>
              <li>Example: Start=2.5, End=5 means "begin mid-month 2 through end of month 5".</li>
              <li>The Gantt chart, Timeline Preview, and Excel export all render half-month precision accurately.</li>
            </ul>

            <p className="font-medium mt-3 text-sm">Collapse / Expand:</p>
            <p className="text-sm">Click the <strong>Phase Ranges</strong> header to toggle between expanded (full editor) and collapsed (compact summary showing phase count). Collapse the section after defining phases to free up screen space for the resource grid.</p>

            <p className="font-medium mt-3 text-sm">Predefined Phases:</p>
            <ul className="list-disc pl-6 space-y-0.5 text-sm">
              <li>Prepare, Explore, Realize, Deploy, Go-live, Hypercare</li>
              <li>Design, Build, Test, UAT, Support</li>
              <li>Custom phases via <strong>"+ Custom..."</strong> option</li>
            </ul>

            <p className="font-medium mt-3 text-sm">Gantt Chart (with Milestones):</p>
            <ul className="list-disc pl-6 space-y-0.5 text-sm">
              <li>Each phase range becomes its own row in the Gantt chart, grouped by wave with clear <strong>wave header</strong> labels.</li>
              <li><strong>Overlapping phases</strong> are shown as separate stacked bars on the timeline.</li>
              <li><strong>Milestone diamonds</strong> appear directly on the phase bars — amber for payment, blue for marker.</li>
              <li>When milestones are close together, their labels are <strong>stacked vertically</strong> to avoid overlap.</li>
              <li>Labels at the right edge of the chart are positioned to the <strong>left of the diamond</strong> to prevent clipping.</li>
              <li>Half-month boundaries are rendered with precise positioning.</li>
              <li>Color-coded by phase type with a legend distinguishing phase colors and milestone types.</li>
              <li>All waves are shown on a <strong>shared project timeline</strong>.</li>
            </ul>
            
            <p className="font-medium mt-3 text-sm">Wave Start Offset (Multi-Wave Projects):</p>
            <p>For projects where waves overlap or start at different times, set the <strong>"Starts at project M"</strong> value in the wave header. For example, if Wave 2 starts in project month 3, set it to 3. The Gantt chart will reflect this offset, showing Wave 2's bars starting from M3 on the shared timeline.</p>

            <p className="font-medium mt-3 text-sm">Excel Export &amp; Import:</p>
            <ul className="list-disc pl-6 space-y-0.5 text-sm">
              <li><strong>Export:</strong> Phase ranges (with half-month values) are included in each wave sheet, and a dedicated <strong>"Gantt Chart"</strong> sheet with color-coded bars and a milestones section is added.</li>
              <li><strong>Import:</strong> Phase ranges from wave sheets are parsed (supports both integer and decimal values). The Gantt Chart sheet is skipped during import.</li>
            </ul>
            <Tip>The auto-generated Gantt chart appears alongside the option to upload a custom Gantt image. Both can coexist. Collapse the Phase Ranges section after setup to maximize your workspace.</Tip>
          </Section>

          {/* Section 6: Cost Calculations */}
          <Section id="cost-calc" title="6. Cost Calculations & CTC" updated="Feb 2026 · Iter 64">
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">6.1 Row-Level Calculation</h3>
            <div className="bg-gray-50 p-4 rounded-lg border font-mono text-sm space-y-2 my-3">
              <p><strong>Salary Cost</strong> = Avg Monthly Salary &times; Total Man-Months</p>
              <p><strong>Overhead Cost</strong> = Salary Cost &times; (Overhead % / 100)</p>
              <p><strong>Total Cost (CTC)</strong> = Salary Cost + Overhead Cost</p>
              <p><strong>Selling Price</strong> = Total Cost / (1 &minus; Profit Margin % / 100)</p>
              <p><strong>SP per MM</strong> = Selling Price / Total Man-Months</p>
              <p><strong>Hourly Rate</strong> = SP per MM / 176</p>
            </div>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">6.2 CTC Analytics</h3>
            <p>Cost to Company (CTC) is shown in both wave-level and overall summary cards:</p>
            <KeyValue label="Onsite CTC">Total Salary + Overhead for all onsite resources.</KeyValue>
            <KeyValue label="Offshore CTC">Total Salary + Overhead for all offshore resources.</KeyValue>
            <KeyValue label="Avg CTC/MM">CTC divided by total man-months for that location type.</KeyValue>
            <KeyValue label="Total CTC">Combined CTC for all resources <strong>plus AMS Shared Support cost</strong> (Iter 62) across all waves. AMS cost = <code className="bg-gray-100 px-1 rounded">Σ(hours/month × cost_rate) × contract_months</code>. When AMS cost is present, the card subtitle reads <em>"all resources + AMS cost ($X)"</em>.</KeyValue>
            <Tip>CTC excludes T&amp;M logistics costs but includes AMS internal cost. It represents the total internal cost of the engagement before adding travel/logistics expenses.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">6.3 Wave &amp; Overall Pricing</h3>
            <div className="bg-gray-50 p-4 rounded-lg border font-mono text-sm space-y-2 my-3">
              <p><strong>Resources Price</strong> = Sum of all row Selling Prices</p>
              <p><strong>Logistics Cost</strong> = Per-diem + Accommodation + Conveyance + Airfare + Visa (for traveling resources)</p>
              <p><strong>Total Selling Price</strong> = Resources Price + Logistics Cost</p>
              <p><strong>Nego Buffer</strong> = Total Selling Price &times; Nego Buffer %</p>
              <p><strong>Final Price</strong> = Total Selling Price + Nego Buffer</p>
              <p><strong>AMS Annual Billing</strong> = Σ(hours/month × hourly_price) × contract_months (no margin / no nego buffer)</p>
              <p><strong>Grand Total Final Price</strong> = Final Price + AMS Annual Billing</p>
            </div>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">6.4 Effective Margin (with overrides)</h3>
            <p>When any resource uses an <em>$/Hr Override</em> or an AMS wave is present, the realised margin will differ from the set Profit Margin %. The chip displayed under the Overall Summary uses the formula:</p>
            <div className="bg-gray-50 p-4 rounded-lg border font-mono text-sm space-y-2 my-3">
              <p><strong>Effective Margin %</strong> = (Grand Total Final Price &minus; Total CTC) / Grand Total Final Price &times; 100</p>
            </div>
            <p>From Iteration 64 onwards the denominator is the <strong>Grand Total Final Price</strong> (T&amp;M Final + AMS Annual). For implementation-only projects, this is identical to the old behavior. For AMS / Mix projects it now reflects the true blended margin.</p>
          </Section>

          {/* Section 7: Logistics */}
          <Section id="logistics" title="7. Logistics Configuration">
            <p>Each wave has its own logistics configuration that applies to <strong>resources marked as Travel = YES</strong>.</p>
            <Step num="1">Click <strong>"Logistics Config"</strong> in the wave toolbar.</Step>
            <Step num="2">Configure the following fields per wave:</Step>
            <KeyValue label="Per Diem Daily Rate">Daily allowance for traveling resources.</KeyValue>
            <KeyValue label="Per Diem Days/Month">Number of per-diem days per month.</KeyValue>
            <KeyValue label="Accommodation Daily">Daily accommodation cost.</KeyValue>
            <KeyValue label="Accommodation Days">Accommodation days per month.</KeyValue>
            <KeyValue label="Local Conveyance">Daily local transport cost.</KeyValue>
            <KeyValue label="Conveyance Days">Conveyance days per month.</KeyValue>
            <KeyValue label="Flight Cost/Trip">Air travel cost per round trip.</KeyValue>
            <KeyValue label="Visa & Medical/Trip">Visa processing and medical costs per trip.</KeyValue>
            <KeyValue label="Number of Trips">Total trips during the wave duration.</KeyValue>
            <Step num="3">Click <strong>"Save Logistics"</strong> to apply the configuration.</Step>
            <Warning>Logistics costs are applied ONLY to resources with <strong>Travel = YES</strong>, regardless of the Onsite/Offshore status. Ensure the Travel flag is set correctly for accurate cost estimation.</Warning>
          </Section>

          {/* Section 8: Excel Export */}
          <Section id="excel-export" title="8. Excel Export">
            <p>The Excel export generates a professional, formula-powered workbook.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">8.1 Exporting</h3>
            <Step num="1">Open a project in the Estimator.</Step>
            <Step num="2">Click <strong>"Export to Excel"</strong> in the toolbar.</Step>
            <Step num="3">The file downloads automatically with all sheets.</Step>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">8.2 Sheet Structure</h3>
            <KeyValue label="Summary Sheet">Cross-wave summary with formulas referencing detail sheets. Includes Total MM, Onsite/Offshore breakdown, Logistics, and Grand Total.</KeyValue>
            <KeyValue label="Wave Detail Sheets">One sheet per wave with all resource rows, monthly allocations, cost formulas, logistics breakdown, and wave totals.</KeyValue>
            <KeyValue label="Milestones Sheets">One sheet per wave listing all payment milestones and markers. Payment amounts use Excel formulas so changing the wave's selling price automatically recalculates amounts.</KeyValue>
            <KeyValue label="Activities Sheets">One sheet per wave listing adopted template activities and wave-specific items, grouped by phase. Skipped during Smart Import.</KeyValue>
            <KeyValue label="Cashflow Sheet">Monthly cashflow data with Cash-Out, Cash-In, Net, and Cumulative rows plus a wave-by-wave breakdown. Skipped during Smart Import.</KeyValue>
            <KeyValue label="Gantt Chart Sheet">Color-coded phase bars and a milestones summary table. Skipped during Smart Import.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">8.3 Formula-Powered</h3>
            <p>All cost calculations in the Excel use <strong>live formulas</strong> &mdash; not static values. If you modify a salary or allocation in Excel, all derived values (costs, selling prices, logistics) will automatically recalculate.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">8.4 Color Legend</h3>
            <p>The Summary sheet includes a <strong>Color Legend</strong> section explaining the row colors used in detail sheets:</p>
            <div className="flex gap-3 mt-2 flex-wrap">
              <span className="flex items-center gap-2 text-sm"><span className="w-4 h-4 rounded bg-red-200 border"></span> Onsite + Travel</span>
              <span className="flex items-center gap-2 text-sm"><span className="w-4 h-4 rounded bg-amber-100 border"></span> Onsite (No Travel)</span>
              <span className="flex items-center gap-2 text-sm"><span className="w-4 h-4 rounded bg-green-100 border"></span> Offshore</span>
              <span className="flex items-center gap-2 text-sm"><span className="w-4 h-4 rounded bg-purple-100 border"></span> Logistics Section</span>
            </div>
            <Tip>The exported Excel preserves the Resource Group ID in a "Group" column at the end of each detail sheet.</Tip>
          </Section>

          {/* Section 9: Quick Estimator */}
          <Section id="quick-estimator" title="9. Quick Estimate Calculator">
            <p>The Quick Estimate Calculator provides a rapid, high-level cost projection without creating a full project.</p>
            <Step num="1">Click the <strong>"Quick Estimate"</strong> button in the Estimator toolbar.</Step>
            <Step num="2">Enter the number of resources by level (Junior, Mid, Senior, Lead).</Step>
            <Step num="3">Set the project duration in months.</Step>
            <Step num="4">The calculator instantly shows estimated cost ranges including base cost, overhead, and selling price.</Step>
            <Tip>Use Quick Estimate for initial client conversations before building a detailed project estimation.</Tip>
          </Section>

          {/* Section 10: Workflow */}
          <Section id="workflow" title="10. Approval Workflow">
            <p>Projects follow a defined approval workflow:</p>
            <div className="flex items-center gap-2 flex-wrap my-4 text-sm font-semibold">
              <span className="px-3 py-1.5 bg-gray-200 rounded-full">Draft</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="px-3 py-1.5 bg-amber-200 rounded-full">In Review</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="px-3 py-1.5 bg-green-200 rounded-full">Approved</span>
              <span className="text-gray-400 mx-1">or</span>
              <span className="px-3 py-1.5 bg-red-200 rounded-full">Rejected</span>
            </div>
            <KeyValue label="Draft">A new version work in progress. Fully editable by the creator.</KeyValue>
            <KeyValue label="In Review">Submitted for approval. Read-only for the creator, awaiting reviewer decision.</KeyValue>
            <KeyValue label="Approved">Project estimation is approved. Read-only. Can be cloned or used to create new versions.</KeyValue>
            <KeyValue label="Rejected">Project estimation is rejected. Can be edited and resubmitted for approval.</KeyValue>
            <KeyValue label="Suspended">Project estimation was approved, but a new version has been created post-approval. The original approval is retained for reference.</KeyValue>
            <KeyValue label="Obsolete">This estimation was not sent for approval, or was a draft superseded by an approved version. Made obsolete from further usage.</KeyValue>
            <Warning>Once a project is approved, it becomes read-only. To make changes, clone the project or create a new version.</Warning>
          </Section>

          {/* Section 11: Access Level */}
          <Section id="access-control" title="11. Access Level (Project Visibility)">
            <p>Control who can view and edit your projects using the <strong>Access Level</strong> setting in Project Information.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">11.1 Access Level Options</h3>
            <KeyValue label="Public (All Users)">Default setting. All users in the system can view and edit the project.</KeyValue>
            <KeyValue label="Restricted">Only selected users can view and edit the project. The project is hidden from other users' project lists.</KeyValue>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">11.2 Setting Up Restricted Access</h3>
            <Step num="1">In Project Information, change <strong>Access Level</strong> from "Public" to "Restricted".</Step>
            <Step num="2">A <strong>Restricted Users</strong> dropdown appears below.</Step>
            <Step num="3">Click <strong>"+ Add user..."</strong> to select users who should have access.</Step>
            <Step num="4">Selected users appear as badges. Click the X to remove a user.</Step>
            <Step num="5">Save the project to apply the access restrictions.</Step>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">11.3 Who Can Access Restricted Projects</h3>
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">User Type</th><th className="p-2 text-center">Access</th><th className="p-2 text-left">Notes</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2">Project Creator</td><td className="p-2 text-center text-green-600 font-bold">Always</td><td className="p-2 text-gray-600 text-xs">Automatic access to own projects.</td></tr>
                  <tr className="border-b"><td className="p-2">Restricted Users List</td><td className="p-2 text-center text-green-600 font-bold">Always</td><td className="p-2 text-gray-600 text-xs">Users explicitly granted access.</td></tr>
                  <tr className="border-b"><td className="p-2">Designated Approver</td><td className="p-2 text-center text-green-600 font-bold">When In Review</td><td className="p-2 text-gray-600 text-xs">Access granted when project is submitted for approval.</td></tr>
                  <tr className="border-b"><td className="p-2">Admin Users</td><td className="p-2 text-center text-green-600 font-bold">Always</td><td className="p-2 text-gray-600 text-xs">Admins have access to all projects.</td></tr>
                  <tr><td className="p-2">Other Users</td><td className="p-2 text-center text-red-500 font-bold">Never</td><td className="p-2 text-gray-600 text-xs">Project is hidden from their view.</td></tr>
                </tbody>
              </table>
            </div>
            
            <Tip>You can change the access level at any time, even after project creation. Switching from Restricted to Public makes the project visible to everyone again.</Tip>
            <Warning>When a restricted project is "In Review", the designated approver automatically gains access, even if not in the restricted users list.</Warning>
          </Section>

          {/* Section 12: Versioning */}
          <Section id="version-mgmt" title="12. Versioning & Comparison">
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">12.1 Version Management</h3>
            <p>Every save creates a new version with a mandatory comment explaining the changes. Previous versions are preserved and accessible from the Project Summary.</p>
            <KeyValue label="Suspended Status">When a new version is created from an approved project, the previous version is set to &quot;Suspended&quot;. This indicates the estimation was previously approved but has been superseded by a newer version.</KeyValue>
            <KeyValue label="Obsolete Status">Users can manually mark Draft or Suspended projects as Obsolete. When a version is approved, all other Draft versions for the same project number are auto-obsoleted.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">12.2 Key Metrics Summary</h3>
            <p>The version comparison page displays a <strong>Key Metrics Summary</strong> card showing project-level changes at a glance:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm ml-4">
              <li><strong>Total Resources:</strong> Change in total number of resources across all waves.</li>
              <li><strong>Total Man-Months:</strong> Overall effort change (e.g., "564.75 → 549.25 MM").</li>
              <li><strong>Onsite MM / Offshore MM:</strong> Breakdown by location type.</li>
              <li><strong>Avg Onsite Cost/MM:</strong> Average cost per man-month for onsite resources.</li>
              <li><strong>Avg Offshore Cost/MM:</strong> Average cost per man-month for offshore resources.</li>
              <li><strong>Avg Onsite Sell/MM:</strong> Average selling price per man-month for onsite resources.</li>
              <li><strong>Avg Offshore Sell/MM:</strong> Average selling price per man-month for offshore resources.</li>
              <li><strong>Total Cost:</strong> Base salary + overhead cost comparison.</li>
              <li><strong>Selling Price:</strong> Final price (decrease shown in <span className="text-green-600 font-bold">green</span> as savings).</li>
              <li><strong>Logistics:</strong> Total logistics cost across all waves.</li>
              <li><strong>Profit Margin %:</strong> Margin percentage change.</li>
            </ul>
            <Tip>When values are unchanged between versions, no strikethrough is shown. For selling price, a decrease appears in green (cost savings are positive!).</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">12.3 Wave-Level Breakdown</h3>
            <p>Below the project summary, a collapsible <strong>Wave-Level Breakdown</strong> section shows metrics for each wave individually:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm ml-4">
              <li>Click <strong>"Wave-Level Breakdown"</strong> to expand the section.</li>
              <li>Each wave has its own <strong>collapse/expand toggle</strong> for detailed metrics.</li>
              <li>Waves with changes display a <strong>"Changed"</strong> badge and amber border.</li>
              <li>Quick summary on each row: Resources, MM, Logistics cost.</li>
              <li>Use <strong>"Expand All"</strong> / <strong>"Collapse All"</strong> buttons for bulk control.</li>
            </ul>
            <p className="text-sm mt-2">Per-wave metrics include: Resources, Total MM, Onsite MM, Offshore MM, Onsite $/MM, Offshore $/MM, Onsite Sell/MM, Offshore Sell/MM, and Logistics.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">12.4 Field-Level Version Comparison</h3>
            <Step num="1">From the <strong>Projects List</strong>, click the <strong>Compare</strong> icon on any project row.</Step>
            <Step num="2">Select two versions using the Baseline and Compare dropdowns.</Step>
            <Step num="3">The diff shows all changes:</Step>
            <ul className="list-disc pl-6 space-y-1 text-sm ml-4">
              <li><strong>Header Changes:</strong> Profit Margin, Nego Buffer, Customer, Technologies, Sub Technologies, CRM ID, etc.</li>
              <li><strong>Wave Changes:</strong> Added/removed waves, config changes, phase additions/removals.</li>
              <li><strong>Resource Changes:</strong> Added/removed/modified resources with cell-level detail (e.g., &quot;Phase 3: 1.0 → 0.5&quot;).</li>
              <li><strong>Logistics Changes:</strong> Per-diem, accommodation, flights, visa, contingency diffs.</li>
            </ul>
            <p className="text-sm mt-2">A summary banner at the top shows total changes, resources added/removed, and allocation changes at a glance.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">12.5 Change History</h3>
            <p>Every save automatically records a detailed change log. Access it via the <strong>Change History</strong> tab on the comparison page. Each entry shows the timestamp, user, version, and expandable field-level changes.</p>
          </Section>

          {/* Section 13: Smart Import */}
          <Section id="smart-import" title="13. Smart Import" updated="Feb 2026 · Iter 63">
            <p>Re-import an EstiPro-exported Excel file to update or create project versions.</p>
            <Step num="1">Click <strong>Smart Import</strong> in the Estimator toolbar.</Step>
            <Step num="2">Upload an EstiPro-exported Excel file (.xlsx).</Step>
            <Step num="3">Review the parsed data: waves, resources, missing master data, and logistics.</Step>
            <Step num="4">Choose an import mode:</Step>
            <ul className="list-disc pl-6 space-y-1 text-sm ml-4">
              <li><strong>Replace Current:</strong> Overwrites all waves locally. Save to persist.</li>
              <li><strong>Import as New Version:</strong> Creates a new project version and suspends the current one.</li>
            </ul>
            <KeyValue label="Logistics Parsing">Logistics data (per-diem, accommodation, flights, etc.) is automatically parsed from both the description text and formulas in the Excel file.</KeyValue>
            <KeyValue label="Missing Master Data">If the Excel contains skills or locations not in the system, they are auto-created during import.</KeyValue>
            <KeyValue label="Overhead Percentage">Overhead is looked up from the Base Location master data. If not set, defaults to 0%.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">13.2 Milestone Re-Import</h3>
            <p>When re-importing an Excel file that contains Milestones sheets, the system <strong>parses and overwrites</strong> the project's payment milestones with the data from the Excel file.</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Milestone names, types, phases, positions, and payment percentages are all imported.</li>
              <li>Payment amounts are recalculated based on the wave's new selling price after import.</li>
              <li>This allows you to edit milestone schedules in Excel and re-import them seamlessly.</li>
            </ul>
            <Warning>Importing milestones fully replaces existing milestone data for the project. Any milestones not in the Excel file will be removed.</Warning>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">13.3 Sheets Skipped on Import</h3>
            <p>The following sheets are <strong>informational only</strong> and ignored during Smart Import:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Activities</strong> sheets &mdash; Manage activities via the Activity Templates master data or the in-app modal.</li>
              <li><strong>Cashflow</strong> sheet &mdash; Cashflow is computed from resource data and milestones.</li>
              <li><strong>Gantt Chart</strong> sheet &mdash; The Gantt chart auto-generates from phase ranges.</li>
            </ul>
          </Section>

          {/* Section 14: Tutorials */}
          {/* Section 14: Gantt Chart */}
          <Section id="gantt-chart" title="14. Gantt Chart / Timeline">
            <p>The Gantt chart auto-generates from your phase ranges and displays milestone diamonds directly on the phase bars.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">14.1 Auto-Generated Chart</h3>
            <p>When phases are defined in the Phase Ranges editor, a Gantt chart automatically renders in the <strong>"Timeline / Gantt Chart"</strong> card. Each wave has a bold header row, and each phase appears as a color-coded bar. Milestones appear as diamonds on the bars: <strong>amber</strong> for payment milestones, <strong>blue</strong> for markers.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">14.2 Milestone Rendering</h3>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Payment milestones are positioned at Start, Mid, or End of their linked phase.</li>
              <li>Marker milestones are positioned by their <strong>slider percentage</strong> (0-100%) along the phase bar.</li>
              <li>When multiple milestones are close together, labels are <strong>stacked vertically</strong> to avoid overlap.</li>
              <li>Labels near the right edge of the chart are placed to the <strong>left of the diamond</strong> for readability.</li>
              <li>Milestones not linked to a phase appear in an <strong>"Unlinked"</strong> row below the wave's phases.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">14.3 Custom Gantt Image</h3>
            <p>You can also upload a custom Gantt chart image (PNG, JPG, WEBP — max 10MB). Click <strong>"Upload Custom Image"</strong> in the timeline card. Click <strong>"Remove"</strong> to delete it. The image is version-specific.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">14.4 Drag-and-Drop Milestones</h3>
            <p>Milestone diamonds on the Gantt chart can be <strong>dragged and repositioned</strong> directly on the phase bars:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Click and drag any milestone diamond horizontally along its phase bar.</li>
              <li>For <strong>payment milestones</strong>, dragging snaps to Start, Mid, or End positions.</li>
              <li>For <strong>marker milestones</strong>, dragging updates the 0-100% slider position with finer granularity.</li>
              <li>Changes are saved when you save the project (Ctrl+S).</li>
            </ul>
            <Tip>Drag-and-drop is especially useful for quickly fine-tuning marker positions during planning reviews without opening the milestone editor.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">14.5 Exporting</h3>
            <p>Click <strong>PNG</strong> to export as an image, or <strong>Excel</strong> for a spreadsheet with color-coded phase bars and a milestones summary table.</p>
            
            <Tip>Use the auto-generated chart for estimation reviews and export it alongside the custom image for client deliverables. Both coexist in the same section.</Tip>
          </Section>

          {/* Section 15: Payment Milestones */}
          <Section id="milestones" title="15. Payment Milestones &amp; Markers" updated="Feb 2026 · Iter 60">
            <p>Define payment schedules and freehold markers per wave to track expected revenue and project checkpoints.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">15.1 Accessing Milestones</h3>
            <p>Navigate to <strong>Milestones</strong> from the sidebar or click the <strong>"Milestones"</strong> button in the Estimator toolbar. The project list shows all versions sorted by project number, with <strong>Customer Name</strong> and milestone counts. Milestones are <strong>version-specific</strong>. You can search by project name, number, or customer name.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.2 Two Milestone Types</h3>
            <p>There are two types of milestones:</p>
            <KeyValue label="Payment Milestone (amber)">Linked to a financial payment. Has a payment percentage and auto-calculated amount based on the wave's selling price. Positioned at Start, Mid, or End of a linked phase.</KeyValue>
            <KeyValue label="Marker Milestone (blue)">A freehold checkpoint with no payment linkage. Ideal for tracking Sprints, UAT, phase closures, or any non-financial milestone. Uses a <strong>0-100% slider</strong> for flexible placement anywhere on the phase bar.</KeyValue>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.3 Wave-Based Sections</h3>
            <p>Each wave has its own collapsible section. Click the wave header to expand/collapse. The header shows: selling price (SP), count of payment milestones, count of markers, total payment %, and total payment amount for that wave.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.4 Adding &amp; Editing Payment Milestones</h3>
            <p>Click <strong>"+ Payment Milestone"</strong> within a wave section. For each payment milestone, set:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Milestone Name</strong>: Descriptive label (e.g., "Phase 1 UAT Complete").</li>
              <li><strong>Advance</strong>: Tick this checkbox if the payment is an upfront / advance receipt. Advance payments are displayed with an <em>ADV</em> badge and bypass the project's payment-terms shift in the Cashflow.</li>
              <li><strong>Linked Phase</strong>: Optionally link to a phase (e.g., Explore, Realize). When linked, the Target Month auto-computes from the phase range and position.</li>
              <li><strong>Position</strong>: Start, Mid, or End of the linked phase.</li>
              <li><strong>Target Month</strong>: Overridable — select M1, M2, M3, etc. Auto-set when a phase is linked.</li>
              <li><strong>Payment %</strong>: Percentage of the wave's Final Price. The dollar amount auto-calculates.</li>
              <li><strong>Description</strong>: Optional notes.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.5 Adding &amp; Editing Marker Milestones</h3>
            <p>Click <strong>"+ Marker Milestone"</strong> within a wave section. Markers have:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Marker Name</strong>: Label (e.g., "Sprint 1", "UAT", "Phase Closure").</li>
              <li><strong>Linked Phase</strong>: Link to a phase to position it on the Gantt chart.</li>
              <li><strong>Position on Bar (0-100% slider)</strong>: Drag to place the marker anywhere along the phase. E.g., 15% for early in the phase, 70% for near the end.</li>
              <li><strong>Description</strong>: Optional notes.</li>
            </ul>
            <Tip>Markers are perfect for Agile sprint tracking within a Realization phase: Sprint 1 at 20%, Sprint 2 at 40%, UAT at 75%, Phase Closure at 95%.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.6 Bidirectional Sync</h3>
            <p>Milestones can be edited from <strong>two locations</strong>:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Inline Phase Editor</strong> (in the Estimator's Phase Ranges section): Quick add/edit per phase with "+" buttons.</li>
              <li><strong>Payment Milestones Page</strong>: Full table view with all fields, search, and bulk management.</li>
            </ul>
            <p className="text-sm mt-1">Changes saved in either location are <strong>synced through the backend</strong> and reflected everywhere — including the Gantt chart.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.7 Payment Terms (Days)</h3>
            <p>Set a <strong>project-level Payment Terms</strong> value (in days) that applies to all waves. This controls when Cash-In is actually received in the Cashflow:</p>
            <KeyValue label="0 days (Immediate)">Cash-In occurs in the same month as the milestone.</KeyValue>
            <KeyValue label="30 days (+1 month)">Cash-In shifts by 1 month from the milestone month.</KeyValue>
            <KeyValue label="60 days (+2 months)">Cash-In shifts by 2 months. If the last milestone is in M6, Cash-In appears in M8.</KeyValue>
            <KeyValue label="90 / 120 days">Larger offsets for longer payment cycles.</KeyValue>
            <Tip>Payment Terms affect only the Cashflow screen — the milestone amounts and percentages remain unchanged. The Cashflow automatically adds extra months beyond the project duration if needed.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.8 Copy Milestones to Wave</h3>
            <p>For multi-wave projects, use the <strong>"Copy to Wave"</strong> button to duplicate all milestones from one wave to another. The copied milestones keep the same percentages but amounts are recalculated based on the target wave's Final Price. Target months are clamped to the destination wave's duration.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.9 Auto-Recalculation</h3>
            <p>When you navigate to the Milestones page from the Estimator after making changes, milestone amounts are <strong>automatically recalculated</strong> using the latest project data. Percentages stay the same — only the dollar amounts update to match the current wave Final Prices.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.10 Saving &amp; Keyboard Shortcut</h3>
            <p>Click <strong>"Save All"</strong> or press <strong>Ctrl+S</strong> to save milestones. Use <strong>"Open Estimator"</strong> to jump to the project in edit mode.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.11 Excel Export</h3>
            <p>Click <strong>"Export Excel"</strong> to generate a formula-based Excel file. Each wave gets its own sheet with formulas: <code>Payment Amount = Wave SP x Payment %</code>. Changing the SP value updates all amounts automatically.</p>
            
            <Warning>If the total Payment % for a wave exceeds 100%, a red warning is displayed. This doesn't prevent saving but indicates a potential data entry error.</Warning>
          </Section>

          {/* Section 16: Cashflow Statement */}
          <Section id="cashflow" title="16. Cashflow Statement" updated="Feb 2026 · Iter 60">
            <p>View monthly cash outflows (costs) and cash inflows (milestone payments) for a project, broken down by wave.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">16.1 Accessing Cashflow</h3>
            <p>Navigate to <strong>Cashflow</strong> from the sidebar or the <strong>"Cashflow"</strong> button in the Estimator. The project list is sorted by project number and includes <strong>Customer Name</strong>. Only projects with resource allocations appear. Cashflow data is <strong>version-specific</strong>. Search by project name, number, or customer.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.2 Payment Terms &amp; Cash-In Shifting</h3>
            <p>If <strong>Payment Terms</strong> are configured on the Milestones page, Cash-In is automatically shifted:</p>
            <div className="bg-gray-50 p-4 rounded-lg border font-mono text-sm space-y-2 my-3">
              <p><strong>Cash-In Month</strong> = Milestone Target Month + Payment Offset</p>
              <p><strong>Payment Offset</strong> = ceil(Payment Terms Days / 30)</p>
              <p>Example: Milestone in M3 + 60 days = Cash-In in M5</p>
            </div>
            <p>A purple banner at the top of the cashflow page displays the active payment terms and offset.</p>
            <Tip>If a milestone in the last project month has payment terms that push Cash-In beyond the project duration, the Cashflow automatically adds extra months (highlighted in purple with "M*" labels).</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.2.1 Advance Payments</h3>
            <p>Milestones marked as <strong>Advance</strong> in the Milestones page are treated specially:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li>Cash-In is recorded in the <strong>same month</strong> as the milestone's target month — payment terms <strong>do not apply</strong>.</li>
              <li>A <strong>purple "Advance Payment" summary card</strong> appears at the top of the Cashflow when the project has any advance receipts. The card shows the total advance amount and what % of total revenue it represents.</li>
              <li>Per-wave and Combined Monthly Summary rows that include advance receipts get a <strong>purple background</strong> with an <em>ADV</em> / <em>ADVANCE</em> badge for instant identification.</li>
            </ul>
            <Tip>This is helpful for milestone-billed engagements where customers pay an upfront mobilization fee — the cash arrives immediately rather than after a 30/60/90-day lag.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.3 Wave-Wise Breakdown</h3>
            <p>Each wave has its own collapsible section showing monthly Cash-Out (resource costs + logistics) and Cash-In (milestone payments shifted by payment terms). The header summarizes total outflow, inflow, net, and shows extended month count if applicable.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.4 Combined Monthly Summary</h3>
            <p>Below the wave sections, the <strong>Combined Monthly Summary</strong> sums across all waves per month: M1 of Wave 1 + M1 of Wave 2 = Combined M1. Shows Cash-Out, Cash-In, Net, and <strong>Cumulative</strong> columns.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.5 Monthly Cash Flow Chart</h3>
            <p>A bar chart visualization shows Cash-Out (red), Cash-In (green), and Net (orange) for each month for quick visual analysis.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.6 Cumulative Cash Flow &amp; Break-Even Chart</h3>
            <p>A line chart shows <strong>cumulative</strong> Cash-In, Cash-Out, and Net over time:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Cum. Cash-Out (red line)</strong>: Running total of all costs.</li>
              <li><strong>Cum. Cash-In (green line)</strong>: Running total of all revenue.</li>
              <li><strong>Cum. Net (purple dashed)</strong>: Difference between cumulative revenue and cost.</li>
              <li><strong>Break-Even Point</strong>: A green banner identifies the first month where cumulative Cash-In exceeds Cash-Out.</li>
            </ul>
            <Tip>The break-even chart is especially useful with payment terms — it shows how delayed payments impact when the project becomes cash-positive.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.7 Excel Export</h3>
            <p>Click <strong>"Export Excel"</strong> to download a multi-sheet Excel file. Each wave gets its own sheet. The "Combined Summary" sheet uses cross-sheet formulas to aggregate data from all wave sheets.</p>
          </Section>

          {/* Section 17: Copy Skill */}
          <Section id="proficiency-copy" title="17. Copy Skill in Proficiency Rates">
            <p>Quickly duplicate an existing proficiency rate entry using the <strong>Copy</strong> button.</p>
            <p>On the <strong>Proficiency Rates</strong> page, each row has a <span className="text-purple-600 font-semibold">purple copy icon</span>. Clicking it opens the "Add" dialog pre-filled with that row's Skill, Level, Location, and Salary. Adjust any field (e.g., change the Level from Senior to Junior) and save to create a new entry.</p>
            <Tip>Use Copy Skill to quickly set up rates for multiple proficiency levels of the same skill without re-entering common data.</Tip>
          </Section>

          {/* Section 18: Tutorials */}
          <Section id="tutorials" title="18. Tutorials & Help">
            <p>Access the <strong>Tutorials</strong> page from the sidebar for guided learning resources.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">18.1 Guided Walkthroughs</h3>
            <p>Step-by-step text instructions for key features: Creating Projects, Wave Grid, Excel Export &amp; Smart Import, Version Comparison, Approval Workflow, Dashboard Analytics, Master Data Management, Payment Milestones, Cashflow Statement, Gantt Chart &amp; Milestones, and Activity Templates.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">18.2 Video Slideshows</h3>
            <p>Screenshot-based slideshows that auto-play through key application screens. Click any tutorial card to watch the slideshow with play/pause controls.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">18.3 Interactive Tours</h3>
            <p>Click <strong>"Start Tour"</strong> on any tutorial to get guided tooltips highlighting UI elements directly in the application. Tours help new users learn by doing.</p>
            
            <Tip>Use the <strong>Interactive Tours</strong> when onboarding new team members - they provide hands-on guidance within the actual application interface.</Tip>
          </Section>

          {/* Section 19: Settings */}
          <Section id="settings" title="19. Settings & Profile">
            <p>Access personal settings from the <strong>Settings</strong> page in the sidebar.</p>
            <KeyValue label="Theme">Choose between light and dark theme preference.</KeyValue>
            <KeyValue label="Date Format">Set your preferred date display format.</KeyValue>
            <KeyValue label="Profile">View and update your display name and email.</KeyValue>
          </Section>

          {/* Section 20: Shortcuts */}
          <Section id="shortcuts" title="20. Keyboard Shortcuts & Tips">
            <div className="rounded-lg border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-[#0F172A] text-white">
                  <tr><th className="p-2 text-left">Shortcut</th><th className="p-2 text-left">Action</th></tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className="p-2 font-mono">Ctrl + B</td><td className="p-2">Toggle sidebar collapse/expand.</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono">Ctrl + S</td><td className="p-2">Save project (Estimator) or milestones (Milestones page).</td></tr>
                  <tr className="border-b"><td className="p-2 font-mono">Tab</td><td className="p-2">Navigate between grid cells.</td></tr>
                  <tr><td className="p-2 font-mono">Esc</td><td className="p-2">Close dialogs and dropdowns.</td></tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">Pro Tips</h3>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>Use <strong>"Add Row"</strong> for quick data entry when you already know all the values, rather than the "Add Resource" dialog.</li>
              <li>Use <strong>"Clone Wave"</strong> when creating similar phases to avoid re-entering common resources.</li>
              <li>Set the <strong>Nego Buffer</strong> at the project level to maintain consistent negotiation margins across all waves.</li>
              <li>Use <strong>Resource Group IDs</strong> to track split deployments (e.g., same person 60% onsite, 40% offshore).</li>
              <li>Hover over <strong>Skill</strong> cells to see full descriptions without opening the dropdown.</li>
              <li>The Excel export contains <strong>live formulas</strong> &mdash; you can modify values in Excel and see recalculated results instantly.</li>
              <li>Use <strong>CRM ID</strong> to link estimations to your external CRM system for traceability.</li>
              <li>Export the <strong>Projects List</strong> to Excel from the Saved Projects page to get a comprehensive overview of all projects and versions.</li>
              <li>Click on <strong>Total Projects</strong> in the Dashboard to jump directly to the Projects List.</li>
              <li>Use <strong>Payment Milestones</strong> to define payment schedules, then check <strong>Cashflow</strong> to see when money flows in vs. out.</li>
              <li>Set <strong>Payment Terms (Days)</strong> on the Milestones page to model realistic cash collection cycles (30, 60, 90 days).</li>
              <li>The <strong>Cumulative Cash Flow chart</strong> on the Cashflow page shows the break-even point where revenue catches up with costs.</li>
              <li>Use <strong>"Copy to Wave"</strong> on the Milestones page to quickly duplicate payment schedules across waves.</li>
              <li>The <strong>Contingency ($)</strong> field in logistics lets you add a fixed amount on top of the percentage-based contingency.</li>
              <li>Upload a <strong>Gantt chart image</strong> to a project so reviewers can see the timeline without switching tools.</li>
              <li>Use the <strong>Copy Skill</strong> button in Proficiency Rates to quickly duplicate entries when setting up similar rate cards.</li>
            </ul>
          </Section>

          {/* Section 21: Activity Templates */}
          <Section id="activity-templates" title="21. Activity Templates & Deliverables">
            <p>Activity Templates provide a centralized master data system for defining phase-wise activities and deliverables. Templates are reusable across projects and keyed by <strong>Technology + Sub-Technology + Project Type</strong>.</p>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">21.1 Activity Templates Page</h3>
            <p>Navigate to <strong>Activity Templates</strong> in the sidebar to manage templates.</p>
            <Step num="1">Select a <strong>Technology</strong>, <strong>Sub-Technology</strong>, and <strong>Project Type</strong> from the filter dropdowns.</Step>
            <Step num="2">Templates are grouped by <strong>Phase Name</strong> (e.g., Prepare, Explore, Realize, Deploy, Go-live, Hypercare).</Step>
            <Step num="3">Click a phase to expand it and view/edit activities and deliverables.</Step>
            <Step num="4">Click <strong>"+ Add Phase"</strong> to create a new phase template with a custom name.</Step>
            <Step num="5">Add activities and deliverables within each phase, then click <strong>Save</strong>.</Step>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">21.2 Pre-Seeded Templates</h3>
            <p>The system comes with two pre-seeded SAP implementation templates:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>SAP S/4HANA + Private Cloud + Implementation</strong> &mdash; Six SAP Activate phases (Discover, Prepare, Explore, Realize, Deploy, Run) with detailed activities and deliverables for each.</li>
              <li><strong>SAP S/4HANA + Public Cloud + Implementation</strong> &mdash; Six phases tailored for public cloud implementations with fit-to-standard workshops, guided configuration, and cloud-specific activities.</li>
            </ul>
            <Tip>Use the pre-seeded templates as a starting point. You can customize them or create new templates for other technologies and project types.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">21.3 Excel Import/Export for Templates</h3>
            <p>Manage templates in bulk using Excel:</p>
            <KeyValue label="Export">Click <strong>"Export Excel"</strong> on the Activity Templates page to download all templates as a structured Excel file with columns for Technology, Sub-Technology, Project Type, Phase, Activities, and Deliverables.</KeyValue>
            <KeyValue label="Import">Click <strong>"Import Excel"</strong> and upload an Excel file in the same format. The system will create or update templates based on the data. Use the exported file as a template for bulk editing.</KeyValue>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">21.4 Using Templates in Projects (Phase Activities Modal)</h3>
            <p>From the Estimator, click the <strong>"Activities"</strong> button in the toolbar to open the Phase Activities modal:</p>
            <Step num="1">The modal shows phases from the <strong>master data template</strong> matching the project's Technology, Sub-Technology, and Project Type.</Step>
            <Step num="2">Select one or more phases using checkboxes for <strong>bulk adoption</strong>.</Step>
            <Step num="3">Click <strong>"Adopt Selected"</strong> to copy template activities into the project for the current wave.</Step>
            <Step num="4">Add <strong>wave-specific activities</strong> that are unique to this wave (not from templates).</Step>
            <Step num="5">Activities are saved per wave and per phase, and appear in the Excel export.</Step>
            <Warning>Template activities are copied into the project at adoption time. Later changes to the master template do not automatically update already-adopted project activities.</Warning>
          </Section>

          {/* Footer */}
          <div className="border-t-2 border-[#1E40AF] pt-4 mt-10 text-center text-sm text-gray-500 print:mt-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/yash-logo-new.png" alt="YASH" className="h-6 object-contain" />
              <img src="/estipro-logo-new.png" alt="EstiPro" className="h-6 object-contain" />
            </div>
            <p>YASH EstiPro User Manual &mdash; &copy; 2026 YASH Technologies. All rights reserved.</p>
            <p className="text-xs text-gray-400 mt-1">Version 1.0 &mdash; Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          data-testid="back-to-top-btn"
          className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-[#1E40AF] text-white shadow-lg hover:bg-[#1E3A8A] transition-all flex items-center justify-center print:hidden"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
