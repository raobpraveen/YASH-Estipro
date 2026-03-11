import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Joyride, { STATUS, ACTIONS, EVENTS } from "react-joyride";
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
  X, CirclePlay, MapPin
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
const TOUR_STEPS = {
  "create-project": [
    {
      target: 'a[data-testid="nav-estimator"]',
      content: 'Click here to open the Project Estimator where you can create new estimation projects.',
      disableBeacon: true,
      placement: 'right',
    },
  ],
  "dashboard-analytics": [
    {
      target: 'a[data-testid="nav-dashboard"]',
      content: 'The Dashboard shows your key metrics and analytics. Click to explore.',
      disableBeacon: true,
      placement: 'right',
    },
  ],
  "wave-grid": [
    {
      target: 'a[data-testid="nav-estimator"]',
      content: 'Open the Estimator to work with the wave grid and resource management.',
      disableBeacon: true,
      placement: 'right',
    },
  ],
  "version-comparison": [
    {
      target: 'a[data-testid="nav-projects"]',
      content: 'Go to Saved Projects to compare versions. Look for the compare icon in project actions.',
      disableBeacon: true,
      placement: 'right',
    },
  ],
  "master-data": [
    {
      target: 'a[data-testid="nav-skills"]',
      content: 'Skills are one of the key master data entities. Click to manage your technology skills catalog.',
      disableBeacon: true,
      placement: 'right',
    },
  ],
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
    title: "Payment Milestones",
    description: "Define payment schedules per wave with target months and automatic amount calculation.",
    duration: "3 min",
    category: "Financial Planning",
    icon: DollarSign,
    color: "bg-emerald-500",
    steps: [
      { target: "Open the Milestones page from the sidebar.", action: "Click 'Milestones' in the left sidebar. A project list shows all versions with milestone counts." },
      { target: "Select a project version.", action: "Click any row. Milestones are version-specific — each version has its own set." },
      { target: "Each wave has its own section.", action: "Click the wave header to expand/collapse. The header shows Selling Price, Payment %, and total amount." },
      { target: "Click '+ Add Milestone' within a wave.", action: "A new row appears. Fill in the Milestone Name, Target Month (M1, M2...), and Payment %." },
      { target: "Payment Amount auto-calculates.", action: "Amount = Wave Selling Price x Payment %. If total % exceeds 100%, a red warning appears." },
      { target: "Save with Ctrl+S or the Save All button.", action: "Click 'Save All' or press Ctrl+S. Export to Excel with formula-based amounts via 'Export Excel'." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "cashflow-statement",
    title: "Cashflow Statement",
    description: "View monthly cash outflows and inflows per wave, with a combined summary and Excel export.",
    duration: "3 min",
    category: "Financial Planning",
    icon: BarChart3,
    color: "bg-cyan-600",
    steps: [
      { target: "Open the Cashflow page from the sidebar.", action: "Click 'Cashflow' in the left sidebar. Only projects with resource data are shown." },
      { target: "Select a project version.", action: "Click any row. Cashflow is version-specific and computed from resource allocations." },
      { target: "Each wave shows monthly Cash-Out and Cash-In.", action: "Cash-Out = resource costs + logistics. Cash-In = milestone payments at their target month." },
      { target: "The Combined Summary sums across waves.", action: "M1 of Wave 1 + M1 of Wave 2 = Combined M1. Shows Cash-Out, Cash-In, and Net per month." },
      { target: "A bar chart visualizes monthly flows.", action: "Red = Cash-Out, Green = Cash-In, Orange = Net. Hover for tooltips." },
      { target: "Export to Excel.", action: "Click 'Export Excel' for a multi-sheet file: per-wave sheets + Combined Summary with cross-sheet formulas." },
    ],
    hasSlideshow: false,
    hasTour: false,
  },
  {
    id: "gantt-upload",
    title: "Gantt Chart / Timeline Upload",
    description: "Attach a project timeline or Gantt chart image directly within the Estimator.",
    duration: "1 min",
    category: "Core Features",
    icon: FileSpreadsheet,
    color: "bg-orange-500",
    steps: [
      { target: "Save a project first.", action: "The Gantt Chart section only appears after the project has been saved." },
      { target: "Click 'Upload Image' in the Timeline card.", action: "Select a PNG, JPG, or WEBP file (max 10MB)." },
      { target: "The image displays inline.", action: "It's stored per-project version. Reviewers and approvers can see it for context." },
      { target: "Click 'Remove' to delete.", action: "Removes the image from this project version." },
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
  
  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowTutorial, setSlideshowTutorial] = useState(null);
  
  // Interactive tour state
  const [runTour, setRunTour] = useState(false);
  const [tourSteps, setTourSteps] = useState([]);
  const [tourTutorialId, setTourTutorialId] = useState(null);

  const filtered = TUTORIALS
    .filter(t => selectedCategory === "all" || t.category === selectedCategory)
    .filter(t => !searchTerm || t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.description.toLowerCase().includes(searchTerm.toLowerCase()));

  const openSlideshow = (tutorial) => {
    setSlideshowTutorial(tutorial);
    setSlideshowOpen(true);
  };

  const startTour = (tutorialId) => {
    const steps = TOUR_STEPS[tutorialId];
    if (steps && steps.length > 0) {
      setTourSteps(steps);
      setTourTutorialId(tutorialId);
      setRunTour(true);
    }
  };

  const handleJoyrideCallback = useCallback((data) => {
    const { status, action, type, index, step } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      setTourSteps([]);
      setTourTutorialId(null);
    }
    
    // Navigate based on tour step if needed
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      // Could add navigation logic here
    }
  }, []);

  const joyrideStyles = {
    options: {
      primaryColor: '#0EA5E9',
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 8,
    },
    buttonNext: {
      backgroundColor: '#0EA5E9',
    },
    buttonBack: {
      color: '#64748B',
    },
  };

  return (
    <div data-testid="tutorials-page" className="max-w-[1200px] mx-auto space-y-6">
      {/* Joyride Tour */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showSkipButton
        showProgress
        callback={handleJoyrideCallback}
        styles={joyrideStyles}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
      
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
                          {tutorial.hasTour && TOUR_STEPS[tutorial.id] && (
                            <Button
                              size="sm"
                              className="text-xs bg-sky-500 hover:bg-sky-600"
                              onClick={() => startTour(tutorial.id)}
                              data-testid={`tour-${tutorial.id}`}
                            >
                              <MapPin className="w-3 h-3 mr-1" /> Start Tour
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

        {/* ===== INTERACTIVE TOURS TAB ===== */}
        <TabsContent value="tours" className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Interactive guided tours</p>
              <p className="text-xs text-emerald-600 mt-1">Click "Start Tour" to get step-by-step guidance with highlighted elements directly in the app interface.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TUTORIALS.filter(t => t.hasTour && TOUR_STEPS[t.id]).map((tutorial) => {
              const Icon = tutorial.icon;
              const tourStepsCount = TOUR_STEPS[tutorial.id]?.length || 0;
              
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
                        <span>{tourStepsCount} tour step{tourStepsCount !== 1 ? 's' : ''}</span>
                      </div>
                      <Button
                        size="sm"
                        className="text-xs bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => startTour(tutorial.id)}
                        data-testid={`start-tour-${tutorial.id}`}
                      >
                        <MapPin className="w-3 h-3 mr-1" /> Start Tour
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {TUTORIALS.filter(t => t.hasTour && TOUR_STEPS[t.id]).length === 0 && (
            <div className="text-center py-12 text-gray-400">No interactive tours available yet.</div>
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
    </div>
  );
};

export default Tutorials;
