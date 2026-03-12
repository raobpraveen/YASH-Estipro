import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Printer, Search, ChevronDown, ChevronRight, BookOpen,
  LayoutDashboard, FolderKanban, Calculator, Layers, FileSpreadsheet,
  Settings, ArrowRight, CheckCircle, AlertTriangle, Info
} from "lucide-react";

const TOC = [
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
  { id: "gantt-chart", title: "14. Gantt Chart / Timeline Image", icon: FileSpreadsheet },
  { id: "milestones", title: "15. Payment Milestones", icon: Calculator },
  { id: "cashflow", title: "16. Cashflow Statement", icon: Calculator },
  { id: "proficiency-copy", title: "17. Copy Skill in Proficiency Rates", icon: Layers },
  { id: "tutorials", title: "18. Tutorials & Help", icon: BookOpen },
  { id: "settings", title: "19. Settings & Profile", icon: Settings },
  { id: "shortcuts", title: "20. Keyboard Shortcuts & Tips", icon: Info },
];

const Section = ({ id, title, children }) => (
  <section id={id} className="mb-10 scroll-mt-20" data-testid={`manual-section-${id}`}>
    <h2 className="text-2xl font-bold text-[#0F172A] border-b-2 border-[#1E40AF] pb-2 mb-4">{title}</h2>
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
  const contentRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

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
          {/* Section 1: Getting Started */}
          <Section id="getting-started" title="1. Getting Started">
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">1.1 Logging In</h3>
            <Step num="1">Navigate to the application URL in your browser.</Step>
            <Step num="2">Enter your registered <strong>Email</strong> and <strong>Password</strong>.</Step>
            <Step num="3">Click <strong>"Sign In"</strong> to access the dashboard.</Step>
            <Tip>If you've forgotten your password, contact your administrator to have it reset.</Tip>

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
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">3.1 Projects List</h3>
            <p>The Projects page displays all estimations with filtering and sorting capabilities.</p>
            <KeyValue label="Search">Filter by project name or number.</KeyValue>
            <KeyValue label="Status Filter">Filter by Draft, In Review, Approved, or Rejected.</KeyValue>
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
                  <tr className="border-b"><td className="p-2 font-semibold">Month 1..N</td><td className="p-2">Man-month allocation for each phase (0 to 1.0 typically).</td></tr>
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

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">5.2 Frozen Columns</h3>
            <p>The following columns are <strong>frozen</strong> (sticky) and remain visible when scrolling the grid horizontally:</p>
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
            <KeyValue label="Add Resource">Opens a dialog to select Skill, Level, Location. Salary is auto-populated.</KeyValue>
            <KeyValue label="Add Row">Adds a blank row for quick manual entry.</KeyValue>
            <KeyValue label="Drag & Drop">Reorder rows by dragging the grip handle on the left.</KeyValue>
            <KeyValue label="Delete Row">Click the trash icon on the right to remove a resource.</KeyValue>
            <KeyValue label="Apply to All">Click the "Apply to all months" button to set the same allocation across all phases.</KeyValue>

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
          </Section>

          {/* Section 6: Cost Calculations */}
          <Section id="cost-calc" title="6. Cost Calculations & CTC">
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
            <KeyValue label="Total CTC">Combined CTC for all resources across all locations.</KeyValue>
            <Tip>CTC excludes logistics costs. It represents the internal cost of resources before adding travel/logistics expenses.</Tip>

            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">6.3 Wave & Overall Pricing</h3>
            <div className="bg-gray-50 p-4 rounded-lg border font-mono text-sm space-y-2 my-3">
              <p><strong>Resources Price</strong> = Sum of all row Selling Prices</p>
              <p><strong>Logistics Cost</strong> = Per-diem + Accommodation + Conveyance + Airfare + Visa (for traveling resources)</p>
              <p><strong>Total Selling Price</strong> = Resources Price + Logistics Cost</p>
              <p><strong>Nego Buffer</strong> = Total Selling Price &times; Nego Buffer %</p>
              <p><strong>Final Price</strong> = Total Selling Price + Nego Buffer</p>
            </div>
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
            <KeyValue label="Draft">Project is being worked on. Fully editable.</KeyValue>
            <KeyValue label="In Review">Submitted for approval. Read-only for the creator.</KeyValue>
            <KeyValue label="Approved">Estimation is finalized. Read-only. Can be cloned for new versions.</KeyValue>
            <KeyValue label="Rejected">Returned with feedback. Can be edited and resubmitted.</KeyValue>
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
            <KeyValue label="Suspended Status">When a new version is created via Smart Import, the previous version is automatically set to &quot;Suspended&quot;.</KeyValue>
            <KeyValue label="Obsolete Status">Users can manually mark Draft or Suspended projects as Obsolete. When a version is approved, all other Draft versions are auto-obsoleted.</KeyValue>

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
          <Section id="smart-import" title="13. Smart Import">
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
          </Section>

          {/* Section 14: Tutorials */}
          {/* Section 14: Gantt Chart */}
          <Section id="gantt-chart" title="14. Gantt Chart / Timeline Image">
            <p>Upload a project timeline or Gantt chart image for quick visual reference directly within the Estimator.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">14.1 Uploading an Image</h3>
            <p>In the Project Estimator (after saving a project), look for the <strong>"Timeline / Gantt Chart"</strong> card. Click <strong>"Upload Image"</strong> to select an image file (PNG, JPG, WEBP — max 10MB).</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">14.2 Viewing &amp; Removing</h3>
            <p>The uploaded image displays inline within the project. Click <strong>"Remove"</strong> to delete it. The image is version-specific — each project version has its own Gantt chart.</p>
            
            <Tip>Use this to attach a Gantt chart exported from MS Project, Smartsheet, or any planning tool for quick reference during estimation reviews.</Tip>
          </Section>

          {/* Section 15: Payment Milestones */}
          <Section id="milestones" title="15. Payment Milestones">
            <p>Define payment schedules per wave to track expected revenue and payment triggers.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">15.1 Accessing Milestones</h3>
            <p>Navigate to <strong>Milestones</strong> from the sidebar or click the <strong>"Milestones"</strong> button in the Estimator toolbar. The project list shows all versions with milestone counts — milestones are <strong>version-specific</strong>.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.2 Wave-Based Sections</h3>
            <p>Each wave has its own collapsible section. Click the wave header to expand/collapse. The header shows selling price (SP), total payment %, and total payment amount for that wave.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.3 Adding &amp; Editing Milestones</h3>
            <p>Click <strong>"+ Add Milestone"</strong> within a wave section. For each milestone, set:</p>
            <ul className="list-disc pl-6 space-y-1 text-sm">
              <li><strong>Milestone Name</strong>: Descriptive label (e.g., "Phase 1 UAT Complete").</li>
              <li><strong>Target Month</strong>: Select M1, M2, M3, etc. — this determines when the payment is expected.</li>
              <li><strong>Payment %</strong>: Percentage of the wave's selling price. The dollar amount auto-calculates.</li>
              <li><strong>Description</strong>: Optional notes.</li>
            </ul>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.4 Saving &amp; Keyboard Shortcut</h3>
            <p>Click <strong>"Save All"</strong> or press <strong>Ctrl+S</strong> to save milestones. Use <strong>"Open Estimator"</strong> to jump to the project in edit mode.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">15.5 Excel Export</h3>
            <p>Click <strong>"Export Excel"</strong> to generate a formula-based Excel file. Each wave gets its own sheet with formulas: <code>Payment Amount = Wave SP × Payment %</code>. Changing the SP value updates all amounts automatically.</p>
            
            <Warning>If the total Payment % for a wave exceeds 100%, a red warning is displayed. This doesn't prevent saving but indicates a potential data entry error.</Warning>
          </Section>

          {/* Section 16: Cashflow Statement */}
          <Section id="cashflow" title="16. Cashflow Statement">
            <p>View monthly cash outflows (costs) and cash inflows (milestone payments) for a project, broken down by wave.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-2">16.1 Accessing Cashflow</h3>
            <p>Navigate to <strong>Cashflow</strong> from the sidebar or the <strong>"Cashflow"</strong> button in the Estimator. Only projects with resource allocations appear in the list. Cashflow data is <strong>version-specific</strong>.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.2 Wave-Wise Breakdown</h3>
            <p>Each wave has its own collapsible section showing monthly Cash-Out (resource costs + logistics) and Cash-In (milestone payments at their target month). The header summarizes total outflow, inflow, and net for that wave.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.3 Combined Monthly Summary</h3>
            <p>Below the wave sections, the <strong>Combined Monthly Summary</strong> sums across all waves per month: M1 of Wave 1 + M1 of Wave 2 = Combined M1. Shows Cash-Out, Cash-In, and Net columns.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.4 Cash Flow Chart</h3>
            <p>A bar chart visualization shows Cash-Out (red), Cash-In (green), and Net (orange) for each month for quick visual analysis.</p>
            
            <h3 className="text-lg font-semibold text-[#1E40AF] mt-6">16.5 Excel Export</h3>
            <p>Click <strong>"Export Excel"</strong> to download a multi-sheet Excel file. Each wave gets its own sheet. The "Combined Summary" sheet uses cross-sheet formulas to aggregate data from all wave sheets.</p>
            
            <Tip>Define Payment Milestones first, then view Cashflow to see the complete picture of when money goes out vs. when it comes in.</Tip>
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
            <p>Step-by-step text instructions for key features: Creating Projects, Wave Grid, Excel Export, Version Comparison, Approval Workflow, Dashboard Analytics, Master Data Management, Payment Milestones, Cashflow Statement, and Gantt Chart Upload.</p>
            
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
              <li>The <strong>Contingency ($)</strong> field in logistics lets you add a fixed amount on top of the percentage-based contingency.</li>
              <li>Upload a <strong>Gantt chart image</strong> to a project so reviewers can see the timeline without switching tools.</li>
              <li>Use the <strong>Copy Skill</strong> button in Proficiency Rates to quickly duplicate entries when setting up similar rate cards.</li>
            </ul>
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
    </div>
  );
}
