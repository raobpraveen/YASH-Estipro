import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Play, BookOpen, Search, ChevronRight, Clock, FileSpreadsheet,
  BarChart3, GitCompare, Upload, Shield, Settings, Users, Layers,
  Video, ExternalLink, Monitor
} from "lucide-react";

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
    videoPlaceholder: true,
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
    videoPlaceholder: true,
  },
  {
    id: "excel-export",
    title: "Excel Export & Smart Import",
    description: "Export formula-powered Excel files and re-import them to update or create new project versions.",
    duration: "4 min",
    category: "Data Management",
    icon: FileSpreadsheet,
    color: "bg-emerald-500",
    steps: [
      { target: "Click 'Export Excel' in the toolbar.", action: "Downloads a formula-based .xlsx file with color coding, calculations, and a color legend." },
      { target: "The Excel file contains live formulas.", action: "Modify values in Excel (e.g., salary, FTE) and see recalculated results instantly." },
      { target: "To re-import, click 'Smart Import'.", action: "Upload a previously exported EstiPro Excel file." },
      { target: "Review the parsed data.", action: "The system shows detected waves, resources, missing master data, and logistics config." },
      { target: "Choose 'Replace Current' or 'Import as New Version'.", action: "'Replace' overwrites locally. 'New Version' creates a new version and suspends the old one." },
      { target: "Logistics data is parsed from formulas.", action: "If you modified per-diem, accommodation, or flight costs in the Excel formulas, those changes are imported." },
    ],
    videoPlaceholder: true,
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
    videoPlaceholder: true,
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
    videoPlaceholder: true,
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
    videoPlaceholder: true,
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
    ],
    videoPlaceholder: true,
  },
];

const CATEGORIES = [...new Set(TUTORIALS.map(t => t.category))];

const Tutorials = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedTutorial, setExpandedTutorial] = useState(null);
  const [activeTab, setActiveTab] = useState("walkthroughs");

  const filtered = TUTORIALS
    .filter(t => selectedCategory === "all" || t.category === selectedCategory)
    .filter(t => !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div data-testid="tutorials-page" className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Tutorials</h1>
        <p className="text-base text-gray-600 mt-2">Guided walkthroughs and video tutorials to help you get the most out of YASH EstPro</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="walkthroughs" data-testid="tab-walkthroughs">
            <BookOpen className="w-4 h-4 mr-1" /> Guided Walkthroughs
          </TabsTrigger>
          <TabsTrigger value="videos" data-testid="tab-videos">
            <Video className="w-4 h-4 mr-1" /> Video Tutorials
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
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg font-bold text-[#0F172A]">{tutorial.title}</CardTitle>
                          <Badge variant="outline" className="text-xs shrink-0">{tutorial.category}</Badge>
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
                        <div className="flex gap-2 pt-2 border-t mt-4">
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
                              };
                              navigate(routes[tutorial.id] || "/dashboard");
                            }}
                            data-testid={`goto-${tutorial.id}`}
                          >
                            <Monitor className="w-3 h-3 mr-1" /> Open in App
                          </Button>
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

        {/* ===== VIDEO TUTORIALS TAB ===== */}
        <TabsContent value="videos" className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Video className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Video tutorials are coming soon</p>
              <p className="text-xs text-amber-600 mt-1">We are preparing professional video walkthroughs for each feature. In the meantime, use the guided walkthroughs above.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {TUTORIALS.map((tutorial) => {
              const Icon = tutorial.icon;
              return (
                <Card key={tutorial.id} className="border shadow-sm" data-testid={`video-slot-${tutorial.id}`}>
                  <CardContent className="pt-6">
                    {/* Video placeholder */}
                    <div className="relative bg-slate-900 rounded-lg aspect-video flex items-center justify-center group cursor-not-allowed mb-4">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg" />
                      <div className="relative flex flex-col items-center gap-2 text-slate-400">
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white/40" />
                        </div>
                        <span className="text-xs">Video Coming Soon</span>
                      </div>
                      <Badge className="absolute top-2 right-2 bg-slate-700 text-slate-300 text-[10px]">
                        <Clock className="w-2.5 h-2.5 mr-0.5" /> {tutorial.duration}
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
    </div>
  );
};

export default Tutorials;
