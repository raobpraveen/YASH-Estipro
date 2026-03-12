import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Plane, Save, FileDown, X, Settings, Copy, History, RefreshCw, Send, CheckCircle, XCircle, Clock, Calculator, Upload, FileSpreadsheet, Minus, MessageSquare, GripVertical, Download, Zap, ChevronDown, ChevronRight, MoreHorizontal, Eye, Target, BarChart3 } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { COUNTRIES, LOGISTICS_DEFAULTS } from "@/utils/constants";
import { getLogisticsConfig as getLogisticsConfigUtil, calculateResourceBaseCost as calcResourceBaseCostUtil, calculateResourceSellingPrice as calcResourceSPUtil, calculateWaveLogistics as calcWaveLogisticsUtil, calculateWaveSummary as calcWaveSummaryUtil, calculateOverallSummary as calcOverallSummaryUtil } from "@/utils/estimatorCalcs";
import { buildExportWorkbook } from "@/utils/excelExport";
import { parseSmartImportExcel } from "@/utils/excelImport";
import { OverallSummary } from "@/components/estimator/OverallSummary";
import { GanttCard } from "@/components/estimator/GanttCard";
import { SubmitReviewDialog, ApprovalActionDialog, LogisticsDialog, BatchLogisticsDialog, SaveVersionDialog, ApproverSaveDialog, SummaryDialog, SmartImportDialog, ObsoleteConfirmDialog, QuickEstimatorDialog } from "@/components/estimator/EstimatorDialogs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  superseded: { label: "Superseded", color: "bg-gray-100 text-gray-500", icon: History },
  suspended: { label: "Suspended", color: "bg-orange-100 text-orange-700", icon: Clock },
  obsolete: { label: "Obsolete", color: "bg-red-50 text-red-400", icon: XCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

const PROFICIENCY_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Architect", "Project Management", "Delivery"];

const GROUP_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const getGroupColor = (groupId) => groupId ? GROUP_COLORS[(parseInt(groupId) - 1) % GROUP_COLORS.length] || GROUP_COLORS[0] : null;

const ProjectEstimator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editProjectId = searchParams.get("edit");
  const viewProjectId = searchParams.get("view");
  const projectIdToLoad = editProjectId || viewProjectId;
  const isViewOnly = !!viewProjectId;
  
  const [rates, setRates] = useState([]);
  const [skills, setSkills] = useState([]);
  const [locations, setLocations] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [subTechnologies, setSubTechnologies] = useState([]);
  
  // Project header
  const [projectId, setProjectId] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [projectVersion, setProjectVersion] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectLocations, setProjectLocations] = useState([]); // Multiple locations
  const [technologyIds, setTechnologyIds] = useState([]); // Multiple technologies
  const [subTechnologyIds, setSubTechnologyIds] = useState([]); // Sub technologies
  const [projectTypeIds, setProjectTypeIds] = useState([]); // Multiple project types
  const [projectDescription, setProjectDescription] = useState("");
  const [crmId, setCrmId] = useState("");
  const [profitMarginPercentage, setProfitMarginPercentage] = useState(35);
  const [negoBufferPercentage, setNegoBufferPercentage] = useState(0);
  const [versionNotes, setVersionNotes] = useState("");
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  
  const [salesManagerId, setSalesManagerId] = useState("");
  
  // Approval workflow
  const [projectStatus, setProjectStatus] = useState("draft");
  const [projectCreatorId, setProjectCreatorId] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [approvalComments, setApprovalComments] = useState("");
  const [submitForReviewDialog, setSubmitForReviewDialog] = useState(false);
  const [approvalActionDialog, setApprovalActionDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState("");
  const [approversList, setApproversList] = useState([]);
  
  // Access control
  const [visibility, setVisibility] = useState("public");
  const [restrictedUserIds, setRestrictedUserIds] = useState([]);
  const [restrictedUserNames, setRestrictedUserNames] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Waves
  const [waves, setWaves] = useState([]);
  const [activeWaveId, setActiveWaveId] = useState("");
  
  // Grid split pane width
  const [leftPaneWidth, setLeftPaneWidth] = useState(620);
  const [isResizing, setIsResizing] = useState(false);
  
  // Dialog states
  const [addWaveDialogOpen, setAddWaveDialogOpen] = useState(false);
  const [addResourceDialogOpen, setAddResourceDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [editLogisticsDialogOpen, setEditLogisticsDialogOpen] = useState(false);
  const [batchLogisticsDialogOpen, setBatchLogisticsDialogOpen] = useState(false);
  const [editingWaveId, setEditingWaveId] = useState("");
  const [saveAsNewVersionDialog, setSaveAsNewVersionDialog] = useState(false);
  
  const [newWave, setNewWave] = useState({ name: "", duration_months: "" });
  const [newAllocation, setNewAllocation] = useState({
    rate_id: "",
    is_onsite: false,
    travel_required: false,
    custom_salary: "",
    default_mm: "",  // Default effort to apply to all months
  });

  const [approverSaveDialogOpen, setApproverSaveDialogOpen] = useState(false);
  const [originalSnapshot, setOriginalSnapshot] = useState("");
  
  // Gantt chart
  const [ganttChart, setGanttChart] = useState(null); // { filename, uploaded_at }
  const [ganttLoading, setGanttLoading] = useState(false);
  const ganttInputRef = useRef(null);

  // Section collapse/expand
  const [collapsedSections, setCollapsedSections] = useState({});
  const toggleSection = (key) => setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));

  // Get current user role
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isApprover = currentUser.role === "approver" || currentUser.role === "admin";
  
  // Check if current user is the DESIGNATED approver for this project
  const isDesignatedApprover = isApprover && approverEmail && currentUser.email === approverEmail;
  
  // Read-only logic:
  // - Not latest version → read-only
  // - Approved/superseded → read-only
  // - In review → ONLY the designated approver can edit, everyone else is locked
  // - View-only mode → read-only
  const isReadOnly = !isLatestVersion || projectStatus === "approved" || projectStatus === "superseded" || projectStatus === "suspended" || projectStatus === "obsolete" || (projectStatus === "in_review" && !isDesignatedApprover) || isViewOnly;
  
  // Wave-level logistics (applied to all onsite resources based on formula)
  const [waveLogistics, setWaveLogistics] = useState({
    per_diem_daily: LOGISTICS_DEFAULTS.per_diem_daily,
    per_diem_days: 30,
    accommodation_daily: LOGISTICS_DEFAULTS.accommodation_daily,
    accommodation_days: 30,
    local_conveyance_daily: LOGISTICS_DEFAULTS.local_conveyance_daily,
    local_conveyance_days: 21,
    flight_cost_per_trip: 450,
    visa_medical_per_trip: 400,
    num_trips: 6,
    contingency_percentage: 5,
    contingency_absolute: 0,
  });

  useEffect(() => {
    fetchRates();
    fetchSkills();
    fetchLocations();
    fetchTechnologies();
    fetchProjectTypes();
    fetchCustomers();
    fetchSalesManagers();
    fetchSubTechnologies();
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (projectIdToLoad) {
      loadProject(projectIdToLoad);
    }
  }, [projectIdToLoad]);

  // Ctrl+S save shortcut
  const saveRef = useRef(null);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveRef.current) saveRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const fetchSkills = async () => {
    try {
      const response = await axios.get(`${API}/skills`);
      setSkills(response.data);
    } catch (error) {
      console.error("Failed to fetch skills");
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data.filter(u => u.is_active));
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const loadProject = async (id) => {
    try {
      const response = await axios.get(`${API}/projects/${id}`);
      const project = response.data;
      
      setProjectId(project.id);
      setProjectNumber(project.project_number || "");
      setProjectVersion(project.version || 1);
      setProjectName(project.name);
      setCustomerId(project.customer_id || "");
      // Handle both single location (legacy) and multiple locations
      if (project.project_locations && project.project_locations.length > 0) {
        setProjectLocations(project.project_locations);
      } else if (project.project_location) {
        setProjectLocations([project.project_location]);
      } else {
        setProjectLocations([]);
      }
      // Handle multiple technologies
      if (project.technology_ids && project.technology_ids.length > 0) {
        setTechnologyIds(project.technology_ids);
      } else if (project.technology_id) {
        setTechnologyIds([project.technology_id]);
      } else {
        setTechnologyIds([]);
      }
      // Handle multiple project types
      if (project.project_type_ids && project.project_type_ids.length > 0) {
        setProjectTypeIds(project.project_type_ids);
      } else if (project.project_type_id) {
        setProjectTypeIds([project.project_type_id]);
      } else {
        setProjectTypeIds([]);
      }
      setProjectDescription(project.description || "");
      setCrmId(project.crm_id || "");
      setSubTechnologyIds(project.sub_technology_ids || []);
      setProfitMarginPercentage(project.profit_margin_percentage || 35);
      setNegoBufferPercentage(project.nego_buffer_percentage || 0);
      setVersionNotes(project.version_notes || "");
      setProjectStatus(project.status || "draft");
      setApproverEmail(project.approver_email || "");
      setApprovalComments(project.approval_comments || "");
      setSalesManagerId(project.sales_manager_id || "");
      setIsLatestVersion(project.is_latest_version !== false);
      setProjectCreatorId(project.created_by_id || "");
      
      // Access control
      setVisibility(project.visibility || "public");
      setRestrictedUserIds(project.restricted_user_ids || []);
      setRestrictedUserNames(project.restricted_user_names || []);
      
      // Gantt chart
      setGanttChart(project.gantt_chart || null);
      
      if (project.waves && project.waves.length > 0) {
        setWaves(project.waves);
        setActiveWaveId(project.waves[0].id);
      }
      
      // Capture snapshot for change detection (approver flow)
      // Compute directly from project data (state may not be updated yet)
      const loadedWaves = project.waves || [];
      setOriginalSnapshot(JSON.stringify({
        name: project.name || "",
        customer_id: project.customer_id || "",
        locations: [...(project.project_locations || (project.project_location ? [project.project_location] : []))].sort(),
        tech_ids: [...(project.technology_ids || (project.technology_id ? [project.technology_id] : []))].sort(),
        type_ids: [...(project.project_type_ids || (project.project_type_id ? [project.project_type_id] : []))].sort(),
        description: project.description || "",
        margin: project.profit_margin_percentage || 35,
        nego: project.nego_buffer_percentage || 0,
        sales_mgr: project.sales_manager_id || "",
        waves: loadedWaves.map(w => ({
          name: w.name,
          months: w.duration_months,
          phases: w.phase_names,
          allocs: (w.grid_allocations || []).map(a => ({
            skill: a.skill_id,
            level: a.proficiency_level,
            loc: a.base_location_id,
            salary: a.avg_monthly_salary,
            overhead: a.overhead_percentage,
            onsite: !!a.is_onsite,
            travel: !!a.travel_required,
            group: a.resource_group_id || "",
            ovr: a.override_hourly_rate || null,
            phases: Object.keys(a.phase_allocations || {}).sort((x, y) => Number(x) - Number(y)).map(k => a.phase_allocations[k] || 0),
            comments: (a.comments || "").trim(),
          })),
        })),
      }));
      
      const versionInfo = `${project.project_number || "project"} v${project.version || 1}`;
      if (!project.is_latest_version) {
        toast.info(`Loaded ${versionInfo} (Read-only: older version)`);
      } else if (project.status === "approved") {
        toast.info(`Loaded ${versionInfo} (Read-only: approved)`);
      } else if (project.status === "in_review") {
        toast.info(`Loaded ${versionInfo} (Read-only: in review)`);
      } else {
        toast.success(`Loaded ${versionInfo}`);
      }
    } catch (error) {
      toast.error("Failed to load project");
      console.error(error);
    }
  };

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/proficiency-rates`);
      setRates(response.data);
    } catch (error) {
      toast.error("Failed to fetch proficiency rates");
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/base-locations`);
      setLocations(response.data);
    } catch (error) {
      toast.error("Failed to fetch base locations");
    }
  };

  const fetchTechnologies = async () => {
    try {
      const response = await axios.get(`${API}/technologies`);
      setTechnologies(response.data);
    } catch (error) {
      toast.error("Failed to fetch technologies");
    }
  };

  const fetchProjectTypes = async () => {
    try {
      const response = await axios.get(`${API}/project-types`);
      setProjectTypes(response.data);
    } catch (error) {
      toast.error("Failed to fetch project types");
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to fetch customers");
    }
  };

  const fetchSalesManagers = async () => {
    try {
      const response = await axios.get(`${API}/sales-managers?active_only=true`);
      setSalesManagers(response.data);
    } catch (error) {
      console.error("Failed to fetch sales managers");
    }
  };

  const fetchSubTechnologies = async () => {
    try {
      const response = await axios.get(`${API}/sub-technologies`);
      setSubTechnologies(response.data);
    } catch (error) {
      console.error("Failed to fetch sub-technologies");
    }
  };

  const handleAddWave = () => {
    if (!newWave.name || !newWave.duration_months) {
      toast.error("Please fill wave name and duration");
      return;
    }

    const numMonths = Math.ceil(parseFloat(newWave.duration_months));
    const phaseNames = Array(numMonths).fill("").map((_, i) => `Month ${i + 1}`);

    const wave = {
      id: Math.random().toString(36).substr(2, 9),
      name: newWave.name,
      description: newWave.description || "",
      duration_months: parseFloat(newWave.duration_months),
      phase_names: phaseNames,
      logistics_config: { ...waveLogistics },
      nego_buffer_percentage: 0,
      grid_allocations: [],
    };

    setWaves([...waves, wave]);
    setActiveWaveId(wave.id);
    setNewWave({ name: "", description: "", duration_months: "" });
    setAddWaveDialogOpen(false);
    toast.success("Wave added successfully");
  };

  const handleDeleteWave = (waveId) => {
    setWaves(waves.filter(w => w.id !== waveId));
    if (activeWaveId === waveId && waves.length > 1) {
      const remainingWaves = waves.filter(w => w.id !== waveId);
      setActiveWaveId(remainingWaves[0]?.id || "");
    }
    toast.success("Wave deleted");
  };

  const handleCloneWave = (waveId) => {
    const source = waves.find(w => w.id === waveId);
    if (!source) return;
    const cloned = {
      ...source,
      id: Math.random().toString(36).substr(2, 9),
      name: `${source.name} (Copy)`,
      description: source.description || "",
      grid_allocations: source.grid_allocations.map(a => ({
        ...a,
        id: Math.random().toString(36).substr(2, 9),
        phase_allocations: { ...a.phase_allocations },
      })),
    };
    setWaves([...waves, cloned]);
    setActiveWaveId(cloned.id);
    toast.success(`Cloned "${source.name}" → "${cloned.name}"`);
  };

  const handleAddPhaseColumn = (waveId) => {
    setWaves(waves.map(w => {
      if (w.id !== waveId) return w;
      const newIndex = w.phase_names.length + 1;
      return {
        ...w,
        duration_months: w.duration_months + 1,
        phase_names: [...w.phase_names, `Month ${newIndex}`],
      };
    }));
    toast.success("Month column added");
  };

  const handleRemovePhaseColumn = (waveId) => {
    setWaves(waves.map(w => {
      if (w.id !== waveId) return w;
      if (w.phase_names.length <= 1) {
        toast.error("Cannot remove the last month column");
        return w;
      }
      const lastIndex = w.phase_names.length - 1;
      return {
        ...w,
        duration_months: w.duration_months - 1,
        phase_names: w.phase_names.slice(0, -1),
        grid_allocations: w.grid_allocations.map(a => {
          const newPhaseAllocations = { ...a.phase_allocations };
          delete newPhaseAllocations[lastIndex];
          return { ...a, phase_allocations: newPhaseAllocations };
        }),
      };
    }));
    toast.success("Last month column removed");
  };

  const handleUpdatePhaseName = (waveId, phaseIndex, newName) => {
    setWaves(waves.map(w => 
      w.id === waveId 
        ? { ...w, phase_names: w.phase_names.map((name, i) => i === phaseIndex ? newName : name) }
        : w
    ));
  };

  const getLogisticsConfig = (wave) => getLogisticsConfigUtil(wave);

  const handleOpenLogisticsEditor = (waveId) => {
    const wave = waves.find(w => w.id === waveId);
    if (wave) {
      setWaveLogistics(getLogisticsConfig(wave));
      setEditingWaveId(waveId);
      setEditLogisticsDialogOpen(true);
    }
  };

  const handleSaveWaveLogistics = () => {
    setWaves(waves.map(w => 
      w.id === editingWaveId 
        ? { ...w, logistics_config: { ...waveLogistics } }
        : w
    ));
    toast.success("Wave logistics updated");
    setEditLogisticsDialogOpen(false);
  };

  const handleOpenBatchLogistics = (waveId) => {
    const wave = waves.find(w => w.id === waveId);
    if (wave) {
      setWaveLogistics(getLogisticsConfig(wave));
      setEditingWaveId(waveId);
      setBatchLogisticsDialogOpen(true);
    }
  };

  const handleBatchUpdateLogistics = () => {
    setWaves(waves.map(w => 
      w.id === editingWaveId 
        ? { ...w, logistics_config: { ...waveLogistics } }
        : w
    ));
    toast.success("Logistics updated for all onsite resources in this wave");
    setBatchLogisticsDialogOpen(false);
  };

  // Function to lookup salary from proficiency rates based on skill + level + location
  const lookupSalary = (skillId, proficiencyLevel, baseLocationId) => {
    const rate = rates.find(r => 
      r.skill_id === skillId && 
      r.proficiency_level === proficiencyLevel && 
      r.base_location_id === baseLocationId
    );
    return rate ? rate.avg_monthly_salary : null;
  };

  // Handle inline grid edit for skill, level, or location
  const handleGridFieldChange = (waveId, allocationId, field, value) => {
    setWaves(waves.map(w => {
      if (w.id !== waveId) return w;
      
      return {
        ...w,
        grid_allocations: w.grid_allocations.map(a => {
          if (a.id !== allocationId) return a;
          
          const updatedAllocation = { ...a, [field]: value };
          
          // If skill, level, or location changed, lookup new salary
          if (field === 'skill_id' || field === 'proficiency_level' || field === 'base_location_id') {
            const skillId = field === 'skill_id' ? value : a.skill_id;
            const level = field === 'proficiency_level' ? value : a.proficiency_level;
            const locationId = field === 'base_location_id' ? value : a.base_location_id;
            
            // Update related fields
            if (field === 'skill_id') {
              const skill = skills.find(s => s.id === value);
              updatedAllocation.skill_name = skill?.name || '';
            }
            if (field === 'base_location_id') {
              const location = locations.find(l => l.id === value);
              updatedAllocation.base_location_name = location?.name || '';
              updatedAllocation.overhead_percentage = location?.overhead_percentage || 0;
            }
            
            // Lookup new salary
            const newSalary = lookupSalary(skillId, level, locationId);
            if (newSalary !== null) {
              updatedAllocation.avg_monthly_salary = newSalary;
              updatedAllocation.original_monthly_salary = newSalary;
            }
          }
          
          return updatedAllocation;
        })
      };
    }));
  };

  const handleAddAllocation = () => {
    if (!activeWaveId) {
      toast.error("Please add a wave first");
      return;
    }

    if (!newAllocation.rate_id) {
      toast.error("Please select a skill");
      return;
    }

    const selectedRate = rates.find((r) => r.id === newAllocation.rate_id);
    if (!selectedRate) return;

    const location = locations.find(l => l.id === selectedRate.base_location_id);
    if (!location) {
      toast.error("Location not found for selected skill");
      return;
    }

    const customSalary = newAllocation.custom_salary ? parseFloat(newAllocation.custom_salary) : selectedRate.avg_monthly_salary;
    
    const allocation = {
      id: Math.random().toString(36).substr(2, 9),
      skill_id: selectedRate.skill_id,
      skill_name: selectedRate.skill_name,
      proficiency_level: selectedRate.proficiency_level,
      avg_monthly_salary: customSalary,
      original_monthly_salary: selectedRate.avg_monthly_salary,
      base_location_id: selectedRate.base_location_id,
      base_location_name: selectedRate.base_location_name,
      overhead_percentage: location.overhead_percentage,
      is_onsite: newAllocation.is_onsite,
      travel_required: newAllocation.travel_required,
      resource_group_id: "",
      override_hourly_rate: null,
      phase_allocations: {},
      comments: "",
    };

    // If default_mm is provided, apply it to all months
    const activeWave = waves.find(w => w.id === activeWaveId);
    if (newAllocation.default_mm && activeWave) {
      const numMonths = activeWave.phase_names.length;
      for (let i = 0; i < numMonths; i++) {
        allocation.phase_allocations[i] = parseFloat(newAllocation.default_mm) || 0;
      }
    }

    setWaves(waves.map(w => 
      w.id === activeWaveId 
        ? { ...w, grid_allocations: [...w.grid_allocations, allocation] }
        : w
    ));

    setNewAllocation({
      rate_id: "",
      is_onsite: false,
      travel_required: false,
      custom_salary: "",
      default_mm: "",
    });
    setAddResourceDialogOpen(false);
    toast.success("Resource added to wave");
  };

  const handleDeleteAllocation = (waveId, allocationId) => {
    setWaves(waves.map(w => 
      w.id === waveId 
        ? { ...w, grid_allocations: w.grid_allocations.filter(a => a.id !== allocationId) }
        : w
    ));
  };

  const handleToggleOnsite = (waveId, allocationId) => {
    setWaves(waves.map(w => 
      w.id === waveId
        ? {
            ...w,
            grid_allocations: w.grid_allocations.map(a =>
              a.id === allocationId ? { ...a, is_onsite: !a.is_onsite } : a
            )
          }
        : w
    ));
  };

  const handleToggleTravelRequired = (waveId, allocationId) => {
    setWaves(waves.map(w => 
      w.id === waveId
        ? {
            ...w,
            grid_allocations: w.grid_allocations.map(a =>
              a.id === allocationId ? { ...a, travel_required: !a.travel_required } : a
            )
          }
        : w
    ));
  };

  const handlePhaseAllocationChange = (waveId, allocationId, phaseIndex, value) => {
    setWaves(waves.map(w => 
      w.id === waveId
        ? {
            ...w,
            grid_allocations: w.grid_allocations.map(a =>
              a.id === allocationId
                ? { ...a, phase_allocations: { ...a.phase_allocations, [phaseIndex]: parseFloat(value) || 0 } }
                : a
            )
          }
        : w
    ));
  };

  // Split pane resize handlers
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleResizeMove = (e) => {
      if (!isResizing) return;
      const container = document.getElementById('grid-split-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        const newWidth = Math.min(Math.max(400, e.clientX - rect.left), 900);
        setLeftPaneWidth(newWidth);
      }
    };
    const handleResizeEnd = () => setIsResizing(false);
    
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  const handleAllocationCommentChange = (waveId, allocationId, comment) => {
    const words = comment.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 100) return;
    setWaves(waves.map(w =>
      w.id === waveId
        ? {
            ...w,
            grid_allocations: w.grid_allocations.map(a =>
              a.id === allocationId ? { ...a, comments: comment } : a
            )
          }
        : w
    ));
  };

  const handleSalaryChange = (waveId, allocationId, value) => {
    setWaves(waves.map(w => 
      w.id === waveId
        ? {
            ...w,
            grid_allocations: w.grid_allocations.map(a =>
              a.id === allocationId
                ? { ...a, avg_monthly_salary: parseFloat(value) || 0 }
                : a
            )
          }
        : w
    ));
  };

  // Move a resource row up or down within a wave
  const handleMoveRow = (waveId, allocationId, direction) => {
    setWaves(waves.map(w => {
      if (w.id !== waveId) return w;
      const idx = w.grid_allocations.findIndex(a => a.id === allocationId);
      if (idx < 0) return w;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= w.grid_allocations.length) return w;
      const arr = [...w.grid_allocations];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...w, grid_allocations: arr };
    }));
  };

  // Drag-and-drop reorder handler
  const handleDragEnd = (result, waveId) => {
    if (!result.destination) return;
    const srcIdx = result.source.index;
    const destIdx = result.destination.index;
    if (srcIdx === destIdx) return;
    setWaves(waves.map(w => {
      if (w.id !== waveId) return w;
      const arr = [...w.grid_allocations];
      const [moved] = arr.splice(srcIdx, 1);
      arr.splice(destIdx, 0, moved);
      return { ...w, grid_allocations: arr };
    }));
  };

  // Add an empty row for quick data entry
  const handleAddEmptyRow = (waveId) => {
    const firstSkill = skills[0];
    const firstLocation = locations[0];
    const emptyAllocation = {
      id: Math.random().toString(36).substr(2, 9),
      skill_id: firstSkill?.id || "",
      skill_name: firstSkill?.name || "",
      proficiency_level: PROFICIENCY_LEVELS[0] || "Junior",
      avg_monthly_salary: 0,
      original_monthly_salary: 0,
      base_location_id: firstLocation?.id || "",
      base_location_name: firstLocation?.name || "",
      overhead_percentage: firstLocation?.overhead_percentage || 0,
      is_onsite: false,
      travel_required: false,
      resource_group_id: "",
      override_hourly_rate: null,
      phase_allocations: {},
      comments: "",
    };
    setWaves(waves.map(w =>
      w.id === waveId
        ? { ...w, grid_allocations: [...w.grid_allocations, emptyAllocation] }
        : w
    ));
  };

  // Quick Estimate calculator state
  const [quickEstimateOpen, setQuickEstimateOpen] = useState(false);
  const [smartImportDialog, setSmartImportDialog] = useState(false);
  const [smartImportData, setSmartImportData] = useState(null);
  const [smartImportLoading, setSmartImportLoading] = useState(false);
  const [quickEstimate, setQuickEstimate] = useState({
    onsiteMM: 10,
    offshoreMM: 20,
    onsiteAvgSalary: 8000,
    offshoreAvgSalary: 4000,
    overheadPercentage: 30,
    profitMargin: 35,
  });

  const quickEstimateResult = (() => {
    const { onsiteMM, offshoreMM, onsiteAvgSalary, offshoreAvgSalary, overheadPercentage, profitMargin } = quickEstimate;
    const totalMM = onsiteMM + offshoreMM;
    const onsiteCost = onsiteMM * onsiteAvgSalary;
    const offshoreCost = offshoreMM * offshoreAvgSalary;
    const baseCost = onsiteCost + offshoreCost;
    const overheadCost = baseCost * (overheadPercentage / 100);
    const totalCost = baseCost + overheadCost;
    const sp = totalCost / (1 - profitMargin / 100);
    const spPerMM = totalMM > 0 ? sp / totalMM : 0;
    const hourly = spPerMM / 176;
    const nego = sp * (negoBufferPercentage / 100);
    return { totalMM, onsiteMM, offshoreMM, onsiteCost, offshoreCost, baseCost, overheadCost, totalCost, sellingPrice: sp, spPerMM, hourly, finalPrice: sp + nego, negoBuffer: nego };
  })();

  // Download current wave grid data (not template)
  const handleDownloadWaveData = () => {
    const wave = waves.find(w => w.id === activeWaveId);
    if (!wave || wave.grid_allocations.length === 0) {
      toast.error("No data to download");
      return;
    }
    const wb = XLSX.utils.book_new();
    const headers = [
      "Skill Name", "Proficiency Level", "Base Location", "Monthly Salary",
      "Overhead %", "Is Onsite", "Travel Required",
      ...wave.phase_names.map(p => `${p} (MM)`),
      "Total MM", "Salary Cost", "Selling Price", "Comments"
    ];
    const data = [headers];
    wave.grid_allocations.forEach(a => {
      const totalMM = Object.values(a.phase_allocations || {}).reduce((s, v) => s + v, 0);
      const salary = a.avg_monthly_salary * totalMM;
      const overhead = salary * (a.overhead_percentage / 100);
      const sp = (salary + overhead) / (1 - profitMarginPercentage / 100);
      data.push([
        a.skill_name, a.proficiency_level, a.base_location_name,
        a.avg_monthly_salary, a.overhead_percentage,
        a.is_onsite ? "TRUE" : "FALSE",
        a.travel_required ? "TRUE" : "FALSE",
        ...wave.phase_names.map((_, i) => a.phase_allocations[i] || 0),
        totalMM.toFixed(2), salary.toFixed(2), sp.toFixed(2),
        a.comments || ""
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = headers.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, ws, wave.name.substring(0, 30));
    XLSX.writeFile(wb, `${projectNumber || projectName || "Wave"}_${wave.name.replace(/\s+/g, '_')}_Data.xlsx`);
    toast.success("Wave grid data downloaded");
  };

  // Apply a value to all months for a resource
  const handleApplyToAllMonths = (waveId, allocationId, value) => {
    const wave = waves.find(w => w.id === waveId);
    if (!wave) return;
    
    const numMonths = wave.phase_names.length;
    const phaseAllocations = {};
    for (let i = 0; i < numMonths; i++) {
      phaseAllocations[i] = parseFloat(value) || 0;
    }
    
    setWaves(waves.map(w => 
      w.id === waveId
        ? {
            ...w,
            grid_allocations: w.grid_allocations.map(a =>
              a.id === allocationId
                ? { ...a, phase_allocations: phaseAllocations }
                : a
            )
          }
        : w
    ));
    toast.success(`Applied ${value} MM to all ${numMonths} months`);
  };

  // Calculate resource base cost (salary only)
  const calculateResourceBaseCost = (allocation) => calcResourceBaseCostUtil(allocation);

  // Calculate individual resource selling price
  // Selling Price per row = (Salary Cost + Overhead) / (1 - profit margin)
  const calculateResourceSellingPrice = (allocation) => calcResourceSPUtil(allocation, profitMarginPercentage);

  // Calculate wave-level logistics based on the formula from the image
  // Per-diem/Accommodation/Conveyance: Total Traveling MM × Rate × Days
  // Flights/Visa: Num Traveling Resources × Rate × Trips
  // Only resources with travel_required=true are counted for logistics
  const calculateWaveLogistics = (wave) => calcWaveLogisticsUtil(wave);

  const calculateWaveSummary = (wave) => calcWaveSummaryUtil(wave, profitMarginPercentage, negoBufferPercentage);

  const calculateOverallSummary = () => calcOverallSummaryUtil(waves, profitMarginPercentage, negoBufferPercentage);

  const getProjectPayload = () => {
    const selectedCustomer = customers.find(c => c.id === customerId);
    const selectedLocationNames = projectLocations.map(code => 
      COUNTRIES.find(c => c.code === code)?.name || code
    );
    const selectedTechNames = technologyIds.map(id => 
      technologies.find(t => t.id === id)?.name || ''
    ).filter(Boolean);
    const selectedSubTechNames = subTechnologyIds.map(id => 
      subTechnologies.find(t => t.id === id)?.name || ''
    ).filter(Boolean);
    const selectedTypeNames = projectTypeIds.map(id => 
      projectTypes.find(t => t.id === id)?.name || ''
    ).filter(Boolean);

    return {
      name: projectName,
      customer_id: customerId,
      customer_name: selectedCustomer?.name || "",
      project_locations: projectLocations,
      project_location_names: selectedLocationNames,
      project_location: projectLocations[0] || "",
      project_location_name: selectedLocationNames[0] || "",
      technology_ids: technologyIds,
      technology_names: selectedTechNames,
      technology_id: technologyIds[0] || "",
      technology_name: selectedTechNames[0] || "",
      sub_technology_ids: subTechnologyIds,
      sub_technology_names: selectedSubTechNames,
      project_type_ids: projectTypeIds,
      project_type_names: selectedTypeNames,
      project_type_id: projectTypeIds[0] || "",
      project_type_name: selectedTypeNames[0] || "",
      crm_id: crmId,
      description: projectDescription,
      profit_margin_percentage: profitMarginPercentage,
      nego_buffer_percentage: negoBufferPercentage,
      waves: waves.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description || "",
        duration_months: w.duration_months,
        phase_names: w.phase_names,
        logistics_config: w.logistics_config,
        nego_buffer_percentage: w.nego_buffer_percentage || 0,
        grid_allocations: w.grid_allocations,
      })),
      version_notes: versionNotes,
      status: projectStatus,
      approver_email: approverEmail,
      sales_manager_id: salesManagerId,
      sales_manager_name: salesManagers.find(m => m.id === salesManagerId)?.name || "",
      // Access control
      visibility: visibility,
      restricted_user_ids: restrictedUserIds,
      restricted_user_names: restrictedUserNames,
    };
  };

  const fetchApprovers = async () => {
    try {
      const response = await axios.get(`${API}/users/approvers/list`);
      setApproversList(response.data);
    } catch (error) {
      console.error("Failed to fetch approvers", error);
      setApproversList([]);
    }
  };

  const openSubmitForReviewDialog = () => {
    fetchApprovers();
    setSubmitForReviewDialog(true);
  };

  const handleSubmitForReview = async () => {
    if (!projectId) {
      toast.error("Please save the project first");
      return;
    }
    if (!approverEmail) {
      toast.error("Please select an approver");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API}/projects/${projectId}/submit-for-review?approver_email=${encodeURIComponent(approverEmail)}`, {}, config);
      setProjectStatus("in_review");
      setSubmitForReviewDialog(false);
      toast.success("Project submitted for review");
    } catch (error) {
      toast.error("Failed to submit for review");
      console.error(error);
    }
  };

  const handleApprovalAction = async () => {
    if (!projectId) return;

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (approvalAction === "approve") {
        await axios.post(`${API}/projects/${projectId}/approve?comments=${encodeURIComponent(approvalComments)}`, {}, config);
        setProjectStatus("approved");
        toast.success("Project approved");
      } else if (approvalAction === "reject") {
        await axios.post(`${API}/projects/${projectId}/reject?comments=${encodeURIComponent(approvalComments)}`, {}, config);
        setProjectStatus("rejected");
        toast.success("Project rejected");
      }
      setApprovalActionDialog(false);
      setApprovalComments("");
    } catch (error) {
      toast.error(`Failed to ${approvalAction} project`);
      console.error(error);
    }
  };

  const handleSaveProject = async () => {
    if (!projectName || !customerId) {
      toast.error("Please enter project name and select customer");
      return;
    }

    if (technologyIds.length === 0) {
      toast.error("Please select at least one Technology");
      return;
    }

    if (projectTypeIds.length === 0) {
      toast.error("Please select at least one Project Type");
      return;
    }

    if (waves.length === 0) {
      toast.error("Please add at least one wave");
      return;
    }

    // Version notes are mandatory for updates (not for new projects)
    if (projectId && !versionNotes.trim()) {
      toast.error("Please enter version notes describing the changes");
      return;
    }

    const payload = getProjectPayload();
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (projectId) {
        await axios.put(`${API}/projects/${projectId}`, payload, config);
        toast.success(`Project ${projectNumber} v${projectVersion} updated`);
      } else {
        const response = await axios.post(`${API}/projects`, payload, config);
        setProjectId(response.data.id);
        setProjectNumber(response.data.project_number);
        setProjectVersion(response.data.version);
        toast.success(`Project ${response.data.project_number} created`);
      }
    } catch (error) {
      toast.error("Failed to save project");
      console.error(error);
    }
  };
  // Update Ctrl+S ref to always point to latest save function
  saveRef.current = isReadOnly ? null : handleSaveProject;


  const handleSaveAsNewVersion = async () => {
    if (!projectId) {
      toast.error("No existing project to version");
      return;
    }

    // Version notes are mandatory for new versions
    if (!versionNotes.trim()) {
      toast.error("Please enter version notes describing the changes");
      return;
    }

    const payload = getProjectPayload();
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const response = await axios.post(`${API}/projects/${projectId}/new-version`, payload, config);
      setProjectId(response.data.id);
      setProjectVersion(response.data.version);
      setProjectStatus(response.data.status || "draft");  // Update status from response
      setApproverEmail(response.data.approver_email || "");  // Clear approver
      setApprovalComments("");  // Clear approval comments
      setIsLatestVersion(true);  // New version is always latest
      setSaveAsNewVersionDialog(false);
      toast.success(`New version ${response.data.project_number} v${response.data.version} created`);
    } catch (error) {
      toast.error("Failed to create new version");
      console.error(error);
    }
  };

  // Normalize wave data for comparison (strip computed/extra fields, normalize key types)
  const normalizeForComparison = () => {
    return JSON.stringify({
      name: projectName,
      customer_id: customerId,
      locations: [...projectLocations].sort(),
      tech_ids: [...technologyIds].sort(),
      type_ids: [...projectTypeIds].sort(),
      description: projectDescription,
      margin: profitMarginPercentage,
      nego: negoBufferPercentage,
      sales_mgr: salesManagerId,
      waves: waves.map(w => ({
        name: w.name,
        months: w.duration_months,
        phases: w.phase_names,
        allocs: w.grid_allocations.map(a => ({
          skill: a.skill_id,
          level: a.proficiency_level,
          loc: a.base_location_id,
          salary: a.avg_monthly_salary,
          overhead: a.overhead_percentage,
          onsite: !!a.is_onsite,
          travel: !!a.travel_required,
          group: a.resource_group_id || "",
          ovr: a.override_hourly_rate || null,
          phases: Object.keys(a.phase_allocations || {}).sort((x, y) => Number(x) - Number(y)).map(k => a.phase_allocations[k] || 0),
          comments: (a.comments || "").trim(),
        })),
      })),
    });
  };

  const hasProjectChanges = () => {
    if (!originalSnapshot) return false;
    return normalizeForComparison() !== originalSnapshot;
  };

  const handleApproverSave = async (saveAsApproved) => {
    if (!projectId) return;
    
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const changesDetected = hasProjectChanges();

    if (saveAsApproved && !changesDetected) {
      // No changes — approve the current version directly
      try {
        await axios.post(`${API}/projects/${projectId}/approve?comments=${encodeURIComponent(versionNotes || "Approved by reviewer")}`, {}, config);
        setProjectStatus("approved");
        toast.success(`v${projectVersion} approved (no changes)`);
        setApproverSaveDialogOpen(false);
      } catch (error) {
        toast.error("Failed to approve project");
        console.error(error);
      }
      return;
    }

    if (!changesDetected && !saveAsApproved) {
      toast.info("No changes detected");
      setApproverSaveDialogOpen(false);
      return;
    }

    // Changes detected — must create a new version
    if (!versionNotes.trim()) {
      toast.error("Please enter version notes describing the changes");
      return;
    }

    const payload = getProjectPayload();

    try {
      // Create new version
      const response = await axios.post(`${API}/projects/${projectId}/new-version`, payload, config);
      const newProjectId = response.data.id;
      setProjectId(newProjectId);
      setProjectVersion(response.data.version);
      setIsLatestVersion(true);

      if (saveAsApproved) {
        // Approve the new version
        await axios.post(`${API}/projects/${newProjectId}/approve?comments=${encodeURIComponent("Approved with modifications by reviewer")}`, {}, config);
        setProjectStatus("approved");
        toast.success(`New version v${response.data.version} created and approved`);
      } else {
        // Re-submit for review to keep it in_review
        const approver = response.data.approver_email || currentUser.email;
        await axios.post(`${API}/projects/${newProjectId}/submit-for-review?approver_email=${encodeURIComponent(approver)}`, {}, config);
        setProjectStatus("in_review");
        toast.success(`New version v${response.data.version} saved (still in review)`);
      }
      // Update snapshot to reflect new saved state
      setTimeout(() => setOriginalSnapshot(normalizeForComparison()), 100);
      setApproverSaveDialogOpen(false);
    } catch (error) {
      toast.error("Failed to save project");
      console.error(error);
    }
  };

  const handleCloneProject = async () => {
    if (!projectId) {
      toast.error("Please save the project first");
      return;
    }

    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const response = await axios.post(`${API}/projects/${projectId}/clone`, {}, config);
      toast.success(`Project cloned as ${response.data.project_number}`);
      navigate(`/estimator?edit=${response.data.id}`);
    } catch (error) {
      toast.error("Failed to clone project");
      console.error(error);
    }
  };

  const handleNewProject = () => {
    setProjectId("");
    setProjectNumber("");
    setProjectVersion(1);
    setProjectName("");
    setCustomerId("");
    setProjectLocations([]);
    setTechnologyIds([]);
    setSubTechnologyIds([]);
    setProjectTypeIds([]);
    setProjectDescription("");
    setCrmId("");
    setProfitMarginPercentage(35);
    setNegoBufferPercentage(0);
    setVersionNotes("");
    setProjectStatus("draft");
    setProjectCreatorId("");
    setApproverEmail("");
    setApprovalComments("");
    setSalesManagerId("");
    setIsLatestVersion(true);
    setWaves([]);
    setActiveWaveId("");
    setGanttChart(null);
    navigate("/estimator");
    toast.info("Ready for new project");
  };

  // Gantt Chart Upload
  const handleGanttUpload = async (e) => {
    const file = e.target.files?.[0];
    if (ganttInputRef.current) ganttInputRef.current.value = "";
    if (!file || !projectId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
    setGanttLoading(true);
    try {
      const token = localStorage.getItem("token");
      const body = await file.arrayBuffer();
      await fetch(`${API}/projects/${projectId}/gantt`, {
        method: "POST",
        headers: { "X-Filename": file.name, "X-Content-Type": file.type, Authorization: `Bearer ${token}` },
        body,
      });
      setGanttChart({ filename: file.name, uploaded_at: new Date().toISOString() });
      toast.success("Gantt chart uploaded");
    } catch { toast.error("Failed to upload Gantt chart"); }
    finally { setGanttLoading(false); }
  };

  const handleGanttDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/projects/${projectId}/gantt`, { headers: { Authorization: `Bearer ${token}` } });
      setGanttChart(null);
      toast.success("Gantt chart removed");
    } catch { toast.error("Failed to remove Gantt chart"); }
  };

  const handleDownloadWaveTemplate = () => {
    const activeWave = waves.find(w => w.id === activeWaveId);
    if (!activeWave) {
      toast.error("Please select a wave first");
      return;
    }

    const wb = XLSX.utils.book_new();
    
    // Instructions sheet
    const instructionsData = [
      ["YASH EstiPro - Wave Grid Upload Template"],
      [""],
      ["INSTRUCTIONS:"],
      ["1. Fill in the 'Resource Data' sheet with your resource allocations"],
      ["2. Each row represents one resource in the wave grid"],
      ["3. Required fields are marked with * in the header"],
      ["4. Phase columns (M1, M2, etc.) should contain man-month values (e.g., 0.5, 1, 1.5)"],
      ["5. Save this file and upload it using the 'Upload Grid' button"],
      [""],
      ["FIELD DESCRIPTIONS:"],
      ["Skill Name* - Name of the skill/role (must match master data)"],
      ["Proficiency Level* - Level like Junior, Mid, Senior, Lead, Expert"],
      ["Base Location* - Location name (must match master data)"],
      ["Monthly Salary - Override salary (leave empty to use master rate)"],
      ["Overhead % - Overhead percentage (default: from master data)"],
      ["Is Onsite - TRUE or FALSE (default: FALSE)"],
      ["Travel Required - TRUE or FALSE for logistics calculation (default: FALSE)"],
      ["M1, M2, M3... - Man-months for each phase/month"],
      [""],
      ["NOTES:"],
      ["- Skill Name and Base Location must exist in master data"],
      ["- Leave Monthly Salary empty to auto-fetch from Proficiency Rates"],
      ["- Phase columns should match the wave duration"],
    ];
    const instructionsWs = XLSX.utils.aoa_to_sheet(instructionsData);
    instructionsWs["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, instructionsWs, "Instructions");

    // Resource Data sheet with headers based on wave phases
    const phaseHeaders = activeWave.phase_names?.length > 0 
      ? activeWave.phase_names 
      : Array.from({ length: Math.ceil(activeWave.duration_months) }, (_, i) => `M${i + 1}`);
    
    const headers = [
      "Skill Name*",
      "Proficiency Level*",
      "Base Location*",
      "Monthly Salary",
      "Overhead %",
      "Is Onsite",
      "Travel Required",
      ...phaseHeaders.map(p => `${p} (MM)`),
      "Comments"
    ];
    
    const resourceData = [headers];
    
    // Add example rows
    resourceData.push([
      "Project Manager",
      "Senior",
      "India",
      "",
      "",
      "FALSE",
      "FALSE",
      ...phaseHeaders.map(() => "1")
    ]);
    resourceData.push([
      "Developer",
      "Mid",
      "India",
      "",
      "",
      "FALSE",
      "FALSE",
      ...phaseHeaders.map(() => "1")
    ]);
    resourceData.push([
      "Solution Architect",
      "Expert",
      "United States",
      "",
      "",
      "TRUE",
      "TRUE",
      ...phaseHeaders.map(() => "0.5")
    ]);
    
    const resourceWs = XLSX.utils.aoa_to_sheet(resourceData);
    
    // Set column widths
    resourceWs["!cols"] = [
      { wch: 20 }, // Skill Name
      { wch: 15 }, // Proficiency Level
      { wch: 18 }, // Base Location
      { wch: 14 }, // Monthly Salary
      { wch: 12 }, // Overhead %
      { wch: 10 }, // Is Onsite
      { wch: 14 }, // Travel Required
      ...phaseHeaders.map(() => ({ wch: 10 }))
    ];
    
    XLSX.utils.book_append_sheet(wb, resourceWs, "Resource Data");
    
    // Master Data Reference sheet
    const skillsRef = skills.map(s => [s.name, s.category || ""]);
    const locationsRef = locations.map(l => [l.name, l.country || "", `${l.overhead_percentage || 0}%`]);
    const proficiencyLevels = ["Junior", "Mid", "Senior", "Lead", "Expert"];
    
    const masterData = [
      ["AVAILABLE SKILLS", "Category"],
      ...skillsRef,
      [""],
      ["AVAILABLE BASE LOCATIONS", "Country", "Default Overhead %"],
      ...locationsRef,
      [""],
      ["PROFICIENCY LEVELS"],
      ...proficiencyLevels.map(l => [l])
    ];
    
    const masterWs = XLSX.utils.aoa_to_sheet(masterData);
    masterWs["!cols"] = [{ wch: 25 }, { wch: 20 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, masterWs, "Master Data Reference");
    
    // Download the file
    const fileName = `WaveGrid_Template_${activeWave.name.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Template downloaded: ${fileName}`);
  };

  const handleUploadWaveGrid = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const activeWave = waves.find(w => w.id === activeWaveId);
    if (!activeWave) {
      toast.error("Please select a wave first");
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Find the Resource Data sheet
      const sheetName = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('resource') || name === 'Resource Data'
      ) || workbook.SheetNames[0];
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length < 2) {
        toast.error("No data found in the uploaded file");
        return;
      }

      // Get headers from first row
      const headers = jsonData[0].map(h => h?.toString().toLowerCase().replace(/[^a-z0-9]/g, '') || '');
      
      // Find column indexes
      const colIndexes = {
        skillName: headers.findIndex(h => h.includes('skillname') || h === 'skill'),
        proficiency: headers.findIndex(h => h.includes('proficiency') || h.includes('level')),
        location: headers.findIndex(h => h.includes('location') || h.includes('base')),
        salary: headers.findIndex(h => h.includes('salary') || h.includes('monthly')),
        overhead: headers.findIndex(h => h.includes('overhead')),
        isOnsite: headers.findIndex(h => h.includes('onsite')),
        travelRequired: headers.findIndex(h => h.includes('travel')),
        comments: headers.findIndex(h => h.includes('comment')),
      };

      // Find phase columns (anything with MM or M1, M2, etc.) - exclude Comments column
      const phaseStartIndex = Math.max(
        colIndexes.travelRequired + 1,
        headers.findIndex(h => h.includes('mm') || /^m\d+/.test(h))
      );
      
      // Phase columns end before Comments column (if present)
      const phaseEndIndex = colIndexes.comments > phaseStartIndex ? colIndexes.comments : headers.length;

      const newAllocations = [];
      let successCount = 0;
      let errorCount = 0;

      // Process data rows (skip header)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;

        const skillName = row[colIndexes.skillName]?.toString().trim();
        const proficiencyLevel = row[colIndexes.proficiency]?.toString().trim();
        const locationName = row[colIndexes.location]?.toString().trim();

        if (!skillName || !proficiencyLevel || !locationName) {
          errorCount++;
          continue;
        }

        // Find matching rate from master data
        const matchingRate = rates.find(r => 
          r.skill_name?.toLowerCase() === skillName.toLowerCase() &&
          r.proficiency_level?.toLowerCase() === proficiencyLevel.toLowerCase() &&
          r.base_location_name?.toLowerCase() === locationName.toLowerCase()
        );

        // Find location for overhead
        const location = locations.find(l => 
          l.name?.toLowerCase() === locationName.toLowerCase()
        );

        // Get custom salary if provided
        const customSalary = colIndexes.salary >= 0 ? parseFloat(row[colIndexes.salary]) : NaN;
        const overheadPct = colIndexes.overhead >= 0 ? parseFloat(row[colIndexes.overhead]) : NaN;
        const isOnsite = colIndexes.isOnsite >= 0 ? 
          ['true', 'yes', '1'].includes(row[colIndexes.isOnsite]?.toString().toLowerCase()) : false;
        const travelRequired = colIndexes.travelRequired >= 0 ? 
          ['true', 'yes', '1'].includes(row[colIndexes.travelRequired]?.toString().toLowerCase()) : false;

        // Build phase allocations
        const phaseAllocations = {};
        const phaseNames = activeWave.phase_names?.length > 0 
          ? activeWave.phase_names 
          : Array.from({ length: Math.ceil(activeWave.duration_months) }, (_, i) => `M${i + 1}`);

        for (let p = 0; p < phaseNames.length; p++) {
          const colIdx = phaseStartIndex + p;
          if (colIdx < phaseEndIndex && colIdx < row.length) {
            const value = parseFloat(row[colIdx]) || 0;
            phaseAllocations[p] = value;
          }
        }

        const avgSalary = !isNaN(customSalary) && customSalary > 0 
          ? customSalary 
          : (matchingRate?.avg_monthly_salary || 0);

        const allocation = {
          id: `upload-${Date.now()}-${i}`,
          skill_id: matchingRate?.skill_id || "",
          skill_name: skillName,
          proficiency_level: proficiencyLevel,
          avg_monthly_salary: avgSalary,
          original_monthly_salary: matchingRate?.avg_monthly_salary || avgSalary,
          base_location_id: matchingRate?.base_location_id || location?.id || "",
          base_location_name: locationName,
          overhead_percentage: !isNaN(overheadPct) ? overheadPct : (location?.overhead_percentage ?? 0),
          is_onsite: isOnsite,
          travel_required: travelRequired,
          phase_allocations: phaseAllocations,
          comments: colIndexes.comments >= 0 ? (row[colIndexes.comments]?.toString().trim() || "") : "",
        };

        newAllocations.push(allocation);
        successCount++;
      }

      if (newAllocations.length > 0) {
        // Update the wave with new allocations
        setWaves(waves.map(w => 
          w.id === activeWaveId 
            ? { ...w, grid_allocations: [...w.grid_allocations, ...newAllocations] }
            : w
        ));
        toast.success(`Imported ${successCount} resources successfully${errorCount > 0 ? ` (${errorCount} rows skipped)` : ''}`);
      } else {
        toast.error("No valid resources found in the file. Check skill names, proficiency levels, and locations match master data.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to process the uploaded file");
    }

    // Reset the file input
    event.target.value = '';
  };

  const handleExportToExcel = async () => {
    if (waves.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      const { buffer, fileName } = await buildExportWorkbook({
        waves, profitMarginPercentage, negoBufferPercentage,
        projectName, projectDescription, projectNumber, projectVersion, projectStatus,
        versionNotes, customerId, customers, projectLocations, technologyIds: technologyIds, technologies,
        subTechnologyIds, subTechnologies, projectTypeIds, projectTypes,
        salesManagerId, salesManagers, crmId, COUNTRIES,
      });
      // Upload to backend and trigger download via hidden iframe
      const uploadRes = await fetch(`${API}/download-file`, {
        method: 'POST',
        headers: {
          'X-Filename': fileName,
          'X-Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: buffer,
      });
      const { download_id } = await uploadRes.json();
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${API}/download-file/${download_id}`;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 30000);
      toast.success("Exported to Excel successfully");
    } catch (err) {
      console.error("Excel export error:", err);
      toast.error("Export failed: " + (err.message || "Unknown error"));
    }
  };

  // === SMART IMPORT: Parse EstiPro-exported Excel ===
  const handleSmartImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset
    if (!file) return;

    setSmartImportLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseSmartImportExcel(buffer, skills, locations, rates);
      setSmartImportData(result);
      setSmartImportDialog(true);
    } catch (err) {
      console.error("Smart Import parse error:", err);
      toast.error("Failed to parse Excel file: " + (err.message || "Unknown format"));
    } finally {
      setSmartImportLoading(false);
    }
  };

  const confirmSmartImport = async (asNewVersion = false) => {
    if (!smartImportData) return;
    setSmartImportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const apiHeaders = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      // Auto-create missing skills
      const skillMap = {};
      skills.forEach(s => { skillMap[s.name.toLowerCase()] = s; });
      for (const name of smartImportData.missingSkills) {
        try {
          const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/skills`, { name, category: "Imported" }, { headers: apiHeaders });
          skillMap[name.toLowerCase()] = res.data;
        } catch { /* skill may already exist */ }
      }

      // Auto-create missing locations
      const locMap = {};
      locations.forEach(l => { locMap[l.name.toLowerCase()] = l; });
      for (const name of smartImportData.missingLocations) {
        try {
          const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/base-locations`, { name, country_code: "" }, { headers: apiHeaders });
          locMap[name.toLowerCase()] = res.data;
        } catch { /* location may already exist */ }
      }

      // Build new waves with parsed logistics
      const newWaves = smartImportData.waves.map((pw, idx) => ({
        id: `wave_imp_${Date.now()}_${idx}`,
        name: pw.sheetName.replace(/^W\d+\s*-?\s*/, "") || `Wave ${idx + 1}`,
        description: "",
        duration_months: pw.phaseNames.length,
        phase_names: pw.phaseNames,
        logistics_config: pw.logistics || waves[0]?.logistics_config || {},
        grid_allocations: pw.allocations.map(a => ({
          ...a,
          id: a.id,
          skill_id: skillMap[a.skill_name.toLowerCase()]?.id || a.skill_id,
          base_location_id: locMap[a.base_location_name.toLowerCase()]?.id || a.base_location_id,
        })),
      }));

      if (asNewVersion && projectId) {
        // Import as a new version — suspend old, create new
        const payload = getProjectPayload();
        payload.waves = newWaves;
        payload.is_import = true;
        payload.version_notes = `Smart Import: re-imported from Excel file`;
        // Apply imported PM and NB
        if (smartImportData.profitMargin !== null && smartImportData.profitMargin !== undefined) {
          payload.profit_margin_percentage = smartImportData.profitMargin;
        }
        if (smartImportData.negoBuffer !== null && smartImportData.negoBuffer !== undefined) {
          payload.nego_buffer_percentage = smartImportData.negoBuffer;
        }
        try {
          const response = await axios.post(`${API}/projects/${projectId}/new-version`, payload, { headers: apiHeaders });
          setProjectId(response.data.id);
          setProjectVersion(response.data.version);
          setProjectStatus(response.data.status || "draft");
          setApproverEmail(response.data.approver_email || "");
          setApprovalComments("");
          setIsLatestVersion(true);
          setWaves(newWaves);
          if (newWaves.length > 0) setActiveWaveId(newWaves[0].id);
          toast.success(`New version v${response.data.version} created from import. Previous version suspended.`);
        } catch (err) {
          toast.error("Failed to create new version: " + (err.response?.data?.detail || err.message));
          setSmartImportLoading(false);
          return;
        }
      } else {
        // Replace current waves locally (user must save)
        setWaves(newWaves);
        if (newWaves.length > 0) setActiveWaveId(newWaves[0].id);
        // Apply imported Profit Margin and Nego Buffer from Summary sheet
        if (smartImportData.profitMargin !== null && smartImportData.profitMargin !== undefined) {
          setProfitMarginPercentage(smartImportData.profitMargin);
        }
        if (smartImportData.negoBuffer !== null && smartImportData.negoBuffer !== undefined) {
          setNegoBufferPercentage(smartImportData.negoBuffer);
        }
        toast.success(`Imported ${newWaves.length} wave(s) with ${smartImportData.totalResources} resource(s). Save the project to persist.`);
      }

      setSmartImportDialog(false);
      setSmartImportData(null);

      // Refresh master data
      const [skillsRes, locsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/skills`, { headers: apiHeaders }),
        axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/base-locations`, { headers: apiHeaders }),
      ]);
      setSkills(skillsRes.data);
      setLocations(locsRes.data);
    } catch (err) {
      console.error("Smart Import error:", err);
      toast.error("Import failed: " + (err.message || "Unknown error"));
    } finally {
      setSmartImportLoading(false);
    }
  };

  const activeWave = waves.find(w => w.id === activeWaveId);
  const overall = calculateOverallSummary();

  const isCreator = projectCreatorId === currentUser.id;
  const canMarkObsolete = projectId && isCreator && (projectStatus === "draft" || projectStatus === "suspended");
  const [obsoleteConfirmOpen, setObsoleteConfirmOpen] = useState(false);

  const handleMarkObsolete = async () => {
    if (!projectId || !canMarkObsolete) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/projects/${projectId}/obsolete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setProjectStatus("obsolete");
      setObsoleteConfirmOpen(false);
      toast.success("Project marked as obsolete");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to mark as obsolete");
    }
  };

  const getStatusBadge = () => {
    const config = STATUS_CONFIG[projectStatus] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
    <div data-testid="project-estimator" className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <img src="/yash-logo-new.png" alt="YASH" className="h-10 object-contain" />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Project Estimator</h1>
            {projectNumber && (
              <Badge variant="outline" className="text-sm font-mono" data-testid="project-number-badge">
                {projectNumber} v{projectVersion}
              </Badge>
            )}
            {projectId && getStatusBadge()}
          </div>
          <p className="text-sm text-gray-600 mt-1">Wave-based project estimation with version management</p>
          {/* Approval/Rejection Comments Display */}
          {approvalComments && (projectStatus === "approved" || projectStatus === "rejected") && (
            <div className={`mt-3 p-3 rounded-lg border ${
              projectStatus === "approved" 
                ? "bg-green-50 border-green-200" 
                : "bg-red-50 border-red-200"
            }`} data-testid="approval-comments-display">
              <div className="flex items-start gap-2">
                {projectStatus === "approved" ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${projectStatus === "approved" ? "text-green-700" : "text-red-700"}`}>
                    {projectStatus === "approved" ? "Approval Comments" : "Rejection Reason"}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{approvalComments}</p>
                  {approverEmail && (
                    <p className="text-xs text-gray-500 mt-1">By: {approverEmail}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* In Review Status Info */}
          {projectStatus === "in_review" && approverEmail && (
            <div className="mt-3 p-3 rounded-lg border bg-purple-50 border-purple-200" data-testid="in-review-info">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-600" />
                <p className="text-sm text-purple-700">
                  Submitted for review to: <span className="font-semibold">{approverEmail}</span>
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* ── Project Actions Group ── */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="project-actions-group">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleNewProject} variant="ghost" size="sm" className="h-8 px-2.5 text-slate-700 hover:bg-white hover:text-[#0F172A]" data-testid="new-project-button">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </TooltipTrigger>
              <TooltipContent>Create a new project</TooltipContent>
            </Tooltip>
            {projectId && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleCloneProject} variant="ghost" size="sm" className="h-8 px-2.5 text-[#8B5CF6] hover:bg-purple-50" data-testid="clone-project-button">
                      <Copy className="w-4 h-4 mr-1" />
                      Clone
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clone this project as a new project</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setSaveAsNewVersionDialog(true)} variant="ghost" size="sm" className="h-8 px-2.5 text-[#F59E0B] hover:bg-amber-50" data-testid="new-version-button">
                      <History className="w-4 h-4 mr-1" />
                      Version
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create a new version</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          {/* ── Utilities Group ── */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="utilities-group">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handleExportToExcel} variant="ghost" size="sm" className="h-8 px-2.5 text-[#10B981] hover:bg-emerald-50" data-testid="export-excel-button">
                  <FileDown className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export to Excel</TooltipContent>
            </Tooltip>
            {!isReadOnly && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleSmartImportFile}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      data-testid="smart-import-input"
                    />
                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[#8B5CF6] hover:bg-purple-50 pointer-events-none" disabled={smartImportLoading}>
                      <Upload className="w-4 h-4 mr-1" />
                      {smartImportLoading ? "Parsing..." : "Import"}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Smart Import from Excel</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setSummaryDialogOpen(true)} variant="ghost" size="sm" className="h-8 px-2.5 text-[#0EA5E9] hover:bg-sky-50" data-testid="view-summary-button">
                  <Eye className="w-4 h-4 mr-1" />
                  Summary
                </Button>
              </TooltipTrigger>
              <TooltipContent>View full project summary</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => setQuickEstimateOpen(true)} variant="ghost" size="sm" className="h-8 px-2.5 text-amber-600 hover:bg-amber-50" data-testid="quick-estimate-button">
                  <Zap className="w-4 h-4 mr-1" />
                  Quick Est.
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quick Estimate Calculator</TooltipContent>
            </Tooltip>
          </div>

          {/* ── Financial Links Group (when project saved) ── */}
          {projectId && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="financial-links-group">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[#8B5CF6] hover:bg-purple-50" onClick={() => navigate(`/payment-milestones?project=${projectId}`)} data-testid="milestones-button">
                    <Target className="w-4 h-4 mr-1" />
                    Milestones
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Payment Milestones</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[#0EA5E9] hover:bg-sky-50" onClick={() => navigate(`/cashflow?project=${projectId}`)} data-testid="cashflow-button">
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Cashflow
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cashflow Statement</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* ── Workflow Actions ── */}
          {projectId && (projectStatus === "draft" || projectStatus === "in_review" || canMarkObsolete) && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="workflow-group">
              {projectStatus === "draft" && !isReadOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={openSubmitForReviewDialog} 
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-purple-600 hover:bg-purple-50"
                      data-testid="submit-review-button"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      Submit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Submit for Review</TooltipContent>
                </Tooltip>
              )}
              {projectStatus === "in_review" && isDesignatedApprover && (
                <>
                  <Button 
                    onClick={() => setApproverSaveDialogOpen(true)}
                    size="sm"
                    className="h-8 bg-[#10B981] hover:bg-[#10B981]/90 text-white"
                    data-testid="approver-save-button"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button 
                    onClick={() => { setApprovalAction("reject"); setApprovalActionDialog(true); }}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-red-600 hover:bg-red-50"
                    data-testid="reject-button"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {canMarkObsolete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={() => setObsoleteConfirmOpen(true)}
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-red-400 hover:bg-red-50"
                      data-testid="mark-obsolete-button"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Obsolete
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Obsolete</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* ── Save Button (always visible, prominent) ── */}
          {!isReadOnly && projectStatus !== "in_review" && (
            <Button onClick={handleSaveProject} size="sm" className="h-8 bg-[#10B981] hover:bg-[#10B981]/90 text-white shadow-sm" data-testid="save-project-button">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Submit for Review Dialog */}
      <SubmitReviewDialog open={submitForReviewDialog} onOpenChange={setSubmitForReviewDialog} approverEmail={approverEmail} setApproverEmail={setApproverEmail} approversList={approversList} onSubmit={handleSubmitForReview} />

      {/* Approval Action Dialog */}
      <ApprovalActionDialog open={approvalActionDialog} onOpenChange={setApprovalActionDialog} approvalAction={approvalAction} approvalComments={approvalComments} setApprovalComments={setApprovalComments} onAction={handleApprovalAction} />

      {/* Project Header */}
      <Card className={`border ${isReadOnly ? 'border-amber-300 bg-amber-50/30' : 'border-[#E2E8F0]'} shadow-sm`}>
        <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => toggleSection("projectInfo")}>
          <div className="flex items-center gap-2">
            {collapsedSections.projectInfo ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            <CardTitle className="text-xl font-bold text-[#0F172A]">Project Information</CardTitle>
          </div>
          {isReadOnly && (
            <Badge className="bg-amber-100 text-amber-800">
              {!isLatestVersion ? "Read-only: Older Version" : 
               projectStatus === "in_review" ? "Read-only: In Review" : 
               projectStatus === "superseded" ? "Read-only: Superseded" :
               projectStatus === "suspended" ? "Read-only: Suspended" :
               projectStatus === "obsolete" ? "Read-only: Obsolete" : "Read-only: Approved"}
            </Badge>
          )}
        </CardHeader>
        {!collapsedSections.projectInfo && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customer">Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId} disabled={isReadOnly}>
                <SelectTrigger id="customer" data-testid="customer-select">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="Enter project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                data-testid="project-name-input"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label>Project Location(s)</Label>
              <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
                {projectLocations.map(code => {
                  const country = COUNTRIES.find(c => c.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="flex items-center gap-1">
                      {country?.name || code}
                      {!isReadOnly && (
                        <button
                          onClick={() => setProjectLocations(projectLocations.filter(c => c !== code))}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
                {!isReadOnly && (
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !projectLocations.includes(value)) {
                        setProjectLocations([...projectLocations, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[140px] h-7 text-xs border-dashed" data-testid="project-location-select">
                      <SelectValue placeholder="+ Add location" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.filter(c => !projectLocations.includes(c.code)).map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div>
              <Label>Technology(s) *</Label>
              <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
                {technologyIds.map(id => {
                  const tech = technologies.find(t => t.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700">
                      {tech?.name || id}
                      {!isReadOnly && (
                        <button
                          onClick={() => setTechnologyIds(technologyIds.filter(t => t !== id))}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
                {!isReadOnly && (
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !technologyIds.includes(value)) {
                        setTechnologyIds([...technologyIds, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-7 text-xs border-dashed" data-testid="technology-select">
                      <SelectValue placeholder="+ Add tech" />
                    </SelectTrigger>
                    <SelectContent>
                      {technologies.filter(t => !technologyIds.includes(t.id)).map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div>
              <Label>Sub Technology</Label>
              <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
                {subTechnologyIds.map(id => {
                  const st = subTechnologies.find(t => t.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-indigo-100 text-indigo-700">
                      {st?.name || id}
                      {!isReadOnly && (
                        <button onClick={() => setSubTechnologyIds(subTechnologyIds.filter(t => t !== id))} className="ml-1 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
                {!isReadOnly && (
                  <Select value="" onValueChange={(value) => { if (value && !subTechnologyIds.includes(value)) setSubTechnologyIds([...subTechnologyIds, value]); }}>
                    <SelectTrigger className="w-[130px] h-7 text-xs border-dashed" data-testid="sub-technology-select">
                      <SelectValue placeholder="+ Add sub-tech" />
                    </SelectTrigger>
                    <SelectContent>
                      {subTechnologies
                        .filter(st => technologyIds.includes(st.technology_id) && !subTechnologyIds.includes(st.id))
                        .map(st => (
                          <SelectItem key={st.id} value={st.id}>{st.name} ({st.technology_name})</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div>
              <Label>Project Type(s) *</Label>
              <div className="flex flex-wrap gap-1 min-h-[40px] p-2 border rounded-md bg-white">
                {projectTypeIds.map(id => {
                  const type = projectTypes.find(t => t.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 bg-teal-100 text-teal-700">
                      {type?.name || id}
                      {!isReadOnly && (
                        <button
                          onClick={() => setProjectTypeIds(projectTypeIds.filter(t => t !== id))}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
                {!isReadOnly && (
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !projectTypeIds.includes(value)) {
                        setProjectTypeIds([...projectTypeIds, value]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-7 text-xs border-dashed" data-testid="project-type-select">
                      <SelectValue placeholder="+ Add type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.filter(t => !projectTypeIds.includes(t.id)).map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div>
              <Label>Sales Manager</Label>
              <Select value={salesManagerId || "none"} onValueChange={(v) => setSalesManagerId(v === "none" ? "" : v)} disabled={isReadOnly}>
                <SelectTrigger data-testid="sales-manager-select">
                  <SelectValue placeholder="Select sales manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {salesManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label>Profit Margin %</Label>
                <span className="font-mono font-semibold text-[#0F172A]" data-testid="profit-margin-display">
                  {profitMarginPercentage}%
                </span>
              </div>
              <Slider
                value={[profitMarginPercentage]}
                onValueChange={([value]) => setProfitMarginPercentage(value)}
                disabled={isReadOnly}
                min={0}
                max={50}
                step={1}
                data-testid="profit-margin-slider"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label>Nego Buffer %</Label>
                <span className="font-mono font-semibold text-blue-600" data-testid="nego-buffer-display">
                  {negoBufferPercentage}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={negoBufferPercentage}
                  onChange={(e) => setNegoBufferPercentage(parseFloat(e.target.value) || 0)}
                  className="w-24 text-right"
                  disabled={isReadOnly}
                  data-testid="nego-buffer-input"
                />
                <span className="text-sm text-gray-500">% of selling price</span>
              </div>
            </div>
            <div>
              <Label htmlFor="crm-id">CRM ID</Label>
              <Input
                id="crm-id"
                placeholder="CRM Identifier (max 30 chars)"
                value={crmId}
                onChange={(e) => setCrmId(e.target.value.slice(0, 30))}
                maxLength={30}
                data-testid="crm-id-input"
                disabled={isReadOnly}
              />
            </div>
            {/* Access Control */}
            <div>
              <Label htmlFor="visibility">Access Level</Label>
              <Select
                value={visibility}
                onValueChange={(val) => {
                  setVisibility(val);
                  if (val === "public") {
                    setRestrictedUserIds([]);
                    setRestrictedUserNames([]);
                  }
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger id="visibility" data-testid="visibility-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public (All users)</SelectItem>
                  <SelectItem value="restricted">Restricted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {visibility === "restricted" && (
              <div className="md:col-span-2">
                <Label>Restricted Users (can view & edit)</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-white">
                  {restrictedUserIds.map((userId, idx) => {
                    const user = allUsers.find(u => u.id === userId);
                    return (
                      <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                        {user?.name || restrictedUserNames[idx] || userId}
                        {!isReadOnly && (
                          <X 
                            className="w-3 h-3 cursor-pointer" 
                            onClick={() => {
                              setRestrictedUserIds(prev => prev.filter(id => id !== userId));
                              setRestrictedUserNames(prev => prev.filter((_, i) => i !== idx));
                            }}
                          />
                        )}
                      </Badge>
                    );
                  })}
                  {!isReadOnly && (
                    <Select
                      value=""
                      onValueChange={(userId) => {
                        if (userId && !restrictedUserIds.includes(userId)) {
                          const user = allUsers.find(u => u.id === userId);
                          if (user) {
                            setRestrictedUserIds(prev => [...prev, userId]);
                            setRestrictedUserNames(prev => [...prev, user.name]);
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="add-restricted-user">
                        <SelectValue placeholder="+ Add user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allUsers
                          .filter(u => u.id !== currentUser.id && !restrictedUserIds.includes(u.id))
                          .map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You (creator) and the approver always have access
                </p>
              </div>
            )}
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Project description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                data-testid="project-description-input"
                rows={2}
                disabled={isReadOnly}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="version-notes">Version Notes</Label>
              <Textarea
                id="version-notes"
                placeholder="Notes for this version (e.g., changes made, reason for update)"
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                data-testid="version-notes-input"
                rows={2}
                disabled={isReadOnly}
              />
            </div>
          </div>
        </CardContent>
        )}
      </Card>

      {/* Gantt Chart */}
      <GanttCard projectId={projectId} ganttChart={ganttChart} ganttLoading={ganttLoading} ganttInputRef={ganttInputRef} handleGanttUpload={handleGanttUpload} handleGanttDelete={handleGanttDelete} isReadOnly={isReadOnly} collapsedSections={collapsedSections} toggleSection={toggleSection} />

      {/* Overall Summary Cards */}
      <OverallSummary overall={overall} profitMarginPercentage={profitMarginPercentage} collapsedSections={collapsedSections} toggleSection={toggleSection} />

      {/* Wave Management */}
      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-[#0F172A]">Project Waves</CardTitle>
            {!isReadOnly && (
            <Dialog open={addWaveDialogOpen} onOpenChange={setAddWaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-wave-button">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wave
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add New Wave</DialogTitle>
                  <DialogDescription>Configure wave details and logistics rates</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wave-name">Wave Name</Label>
                      <Input
                        id="wave-name"
                        placeholder="e.g., Wave 1"
                        value={newWave.name}
                        onChange={(e) => setNewWave({ ...newWave, name: e.target.value })}
                        data-testid="wave-name-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wave-duration">Duration (Months)</Label>
                      <Input
                        id="wave-duration"
                        type="number"
                        placeholder="e.g., 6"
                        value={newWave.duration_months}
                        onChange={(e) => setNewWave({ ...newWave, duration_months: e.target.value })}
                        data-testid="wave-duration-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="wave-desc-new">Description</Label>
                    <Input
                      id="wave-desc-new"
                      placeholder="Optional description..."
                      value={newWave.description || ""}
                      onChange={(e) => setNewWave({ ...newWave, description: e.target.value })}
                      data-testid="wave-desc-input"
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <Label className="text-base font-semibold">Logistics Configuration</Label>
                    <p className="text-xs text-gray-500 mb-3">Per-diem/Accommodation/Conveyance: Traveling MM × Rate × Days | Flights/Visa: Traveling Resources × Rate × Trips</p>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Per-Diem ($/day)</Label>
                        <Input type="number" value={waveLogistics.per_diem_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_daily: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Days/Month</Label>
                        <Input type="number" value={waveLogistics.per_diem_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_days: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-end">
                        <p className="text-xs text-gray-500 pb-2">= MM × ${waveLogistics.per_diem_daily} × {waveLogistics.per_diem_days}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Accommodation ($/day)</Label>
                        <Input type="number" value={waveLogistics.accommodation_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_daily: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Days/Month</Label>
                        <Input type="number" value={waveLogistics.accommodation_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_days: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-end">
                        <p className="text-xs text-gray-500 pb-2">= MM × ${waveLogistics.accommodation_daily} × {waveLogistics.accommodation_days}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Conveyance ($/day)</Label>
                        <Input type="number" value={waveLogistics.local_conveyance_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_daily: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Days/Month</Label>
                        <Input type="number" value={waveLogistics.local_conveyance_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_days: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-end">
                        <p className="text-xs text-gray-500 pb-2">= MM × ${waveLogistics.local_conveyance_daily} × {waveLogistics.local_conveyance_days}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Air Fare ($/trip)</Label>
                        <Input type="number" value={waveLogistics.flight_cost_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, flight_cost_per_trip: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Number of Trips</Label>
                        <Input type="number" value={waveLogistics.num_trips} onChange={(e) => setWaveLogistics({ ...waveLogistics, num_trips: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="flex items-end">
                        <p className="text-xs text-gray-500 pb-2">= Resources × ${waveLogistics.flight_cost_per_trip} × {waveLogistics.num_trips}</p>
                      </div>
                      
                      <div>
                        <Label className="text-xs">Visa & Medical ($/trip)</Label>
                        <Input type="number" value={waveLogistics.visa_medical_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, visa_medical_per_trip: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Contingency %</Label>
                        <Input type="number" value={waveLogistics.contingency_percentage} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_percentage: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Contingency ($)</Label>
                        <Input type="number" value={waveLogistics.contingency_absolute} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_absolute: parseFloat(e.target.value) || 0 })} placeholder="Absolute amount" />
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleAddWave} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-wave-button">
                    Add Wave
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {waves.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No waves added yet. Click "Add Wave" to start.</p>
            </div>
          ) : (
            <Tabs value={activeWaveId} onValueChange={setActiveWaveId}>
              <div className="overflow-x-auto pb-1 mb-3">
                <TabsList className="inline-flex w-max">
                  {waves.map((wave) => (
                    <TabsTrigger key={wave.id} value={wave.id} data-testid={`wave-tab-${wave.id}`}>
                      {wave.name} ({wave.duration_months}m)
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {waves.map((wave) => {
                const waveSummary = calculateWaveSummary(wave);
                return (
                <TabsContent key={wave.id} value={wave.id}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-4 flex-wrap">
                        {isReadOnly ? (
                          <h3 className="text-lg font-semibold text-[#0F172A]">{wave.name}</h3>
                        ) : (
                          <Input
                            value={wave.name}
                            onChange={(e) => setWaves(waves.map(w => w.id === wave.id ? { ...w, name: e.target.value } : w))}
                            className="text-lg font-semibold text-[#0F172A] border-0 border-b border-dashed border-gray-300 rounded-none focus:border-[#0F172A] bg-transparent px-0 w-48 h-auto py-0"
                            data-testid={`wave-name-${wave.id}`}
                          />
                        )}
                        <span className="text-sm text-gray-600">Duration: {wave.duration_months} months</span>
                        <span className="text-sm text-gray-600">Resources: {wave.grid_allocations.length}</span>
                        <span className="text-sm text-[#F59E0B]">Onsite: {waveSummary.onsiteResourceCount}</span>
                        <span className="text-sm text-purple-600">Traveling: {waveSummary.travelingResourceCount}</span>
                      </div>
                    </div>
                    {/* Wave Description */}
                    <div>
                      {isReadOnly ? (
                        wave.description && <p className="text-sm text-gray-500 italic">{wave.description}</p>
                      ) : (
                        <Input
                          value={wave.description || ""}
                          onChange={(e) => setWaves(waves.map(w => w.id === wave.id ? { ...w, description: e.target.value } : w))}
                          placeholder="Wave description (optional)..."
                          className="text-sm text-gray-600 border-0 border-b border-dashed border-gray-200 rounded-none focus:border-gray-400 bg-transparent px-0"
                          data-testid={`wave-desc-${wave.id}`}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenLogisticsEditor(wave.id)}
                          data-testid={`edit-logistics-${wave.id}`}
                          disabled={isReadOnly}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Logistics Config
                        </Button>
                        {!isReadOnly && (
                        <Dialog open={addResourceDialogOpen && activeWaveId === wave.id} onOpenChange={setAddResourceDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-resource-button">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Resource
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add Resource to {wave.name}</DialogTitle>
                              <DialogDescription>Select skill and optionally override salary</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <Label htmlFor="resource-rate">Skill & Proficiency</Label>
                                <Select value={newAllocation.rate_id} onValueChange={(value) => {
                                  const rate = rates.find(r => r.id === value);
                                  setNewAllocation({ 
                                    ...newAllocation, 
                                    rate_id: value,
                                    custom_salary: rate?.avg_monthly_salary?.toString() || ""
                                  });
                                }}>
                                  <SelectTrigger id="resource-rate" data-testid="resource-rate-select">
                                    <SelectValue placeholder="Select skill" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {rates.map((rate) => (
                                      <SelectItem key={rate.id} value={rate.id}>
                                        {rate.skill_name} ({rate.proficiency_level}) - {rate.base_location_name} - ${rate.avg_monthly_salary}/mo
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label htmlFor="custom-salary">Monthly Salary (override)</Label>
                                <Input
                                  id="custom-salary"
                                  type="number"
                                  placeholder="Enter custom salary"
                                  value={newAllocation.custom_salary}
                                  onChange={(e) => setNewAllocation({ ...newAllocation, custom_salary: e.target.value })}
                                  data-testid="custom-salary-input"
                                />
                              </div>

                              <div>
                                <Label htmlFor="default-mm">Default Effort (apply to all months)</Label>
                                <Input
                                  id="default-mm"
                                  type="number"
                                  step="0.1"
                                  placeholder="e.g., 1 for 1 MM per month"
                                  value={newAllocation.default_mm}
                                  onChange={(e) => setNewAllocation({ ...newAllocation, default_mm: e.target.value })}
                                  data-testid="default-mm-input"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  If provided, this value will be set for all {wave.phase_names.length} months
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newAllocation.is_onsite}
                                  onCheckedChange={(checked) => setNewAllocation({ ...newAllocation, is_onsite: checked })}
                                  data-testid="onsite-switch"
                                />
                                <Label className="flex items-center gap-2">
                                  <Plane className="w-4 h-4" />
                                  Onsite Resource
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={newAllocation.travel_required}
                                  onCheckedChange={(checked) => setNewAllocation({ ...newAllocation, travel_required: checked })}
                                  data-testid="travel-required-switch"
                                />
                                <Label className="flex items-center gap-2 text-purple-600">
                                  Travel Required (Logistics Apply)
                                </Label>
                              </div>

                              {newAllocation.travel_required && (
                                <div className="bg-purple-50 p-3 rounded text-xs border border-purple-200">
                                  <p className="font-semibold mb-1">Logistics will be calculated at wave level:</p>
                                  <p>Per-diem, Accommodation, Conveyance: Total Traveling MM × Rate × Days</p>
                                  <p>Flights, Visa/Medical: Traveling Resources × Rate × Trips</p>
                                </div>
                              )}
                              
                              <Button onClick={handleAddAllocation} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-resource-button">
                                Add Resource
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        )}
                        {!isReadOnly && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-400 text-gray-600 hover:bg-gray-50"
                          onClick={() => handleAddEmptyRow(wave.id)}
                          data-testid={`add-row-${wave.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Row
                        </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddPhaseColumn(wave.id)}
                          className="border-teal-600 text-teal-600 hover:bg-teal-50"
                          data-testid={`add-month-${wave.id}`}
                          disabled={isReadOnly}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Month
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemovePhaseColumn(wave.id)}
                          className="border-orange-600 text-orange-600 hover:bg-orange-50"
                          data-testid={`remove-month-${wave.id}`}
                          disabled={isReadOnly}
                        >
                          <Minus className="w-4 h-4 mr-1" />
                          Remove Month
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleDownloadWaveTemplate}
                          className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                          data-testid="download-template-button"
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Download Template
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={handleDownloadWaveData}
                          className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                          data-testid="download-data-button"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Data
                        </Button>
                        {!isReadOnly && (
                        <div className="relative">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleUploadWaveGrid}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            data-testid="upload-grid-input"
                          />
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-purple-600 text-purple-600 hover:bg-purple-50 pointer-events-none"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Grid
                          </Button>
                        </div>
                        )}
                        {!isReadOnly && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-indigo-500 text-indigo-500 hover:bg-indigo-50"
                          onClick={() => handleCloneWave(wave.id)}
                          data-testid={`clone-wave-${wave.id}`}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Clone Wave
                        </Button>
                        )}
                        {!isReadOnly && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
                          onClick={() => handleDeleteWave(wave.id)}
                          data-testid={`delete-wave-${wave.id}`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Delete Wave
                        </Button>
                        )}
                      </div>
                    </div>

                    {wave.grid_allocations.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-gray-300 rounded">
                        <p className="text-gray-500">No resources in this wave. Click "Add Resource" or "Add Row" to start.</p>
                      </div>
                    ) : (
                      <DragDropContext onDragEnd={(result) => handleDragEnd(result, wave.id)}>
                      <div className="overflow-x-auto border border-[#E2E8F0] rounded" id="grid-split-container">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                              {/* Frozen columns: Drag, #, Skill, Level, Location, $/Month, Onsite, Travel, Grp */}
                              <th className="text-center p-2 font-semibold text-xs w-8" style={{ position: 'sticky', left: 0, zIndex: 10, background: '#F8FAFC' }}></th>
                              <th className="text-center p-2 font-semibold text-xs w-8" style={{ position: 'sticky', left: 32, zIndex: 10, background: '#F8FAFC' }}>#</th>
                              <th className="text-left p-2 font-semibold text-xs" style={{ position: 'sticky', left: 64, zIndex: 10, background: '#F8FAFC', minWidth: 120, maxWidth: 120 }}>Skill</th>
                              <th className="text-left p-2 font-semibold text-xs" style={{ position: 'sticky', left: 184, zIndex: 10, background: '#F8FAFC', minWidth: 106, maxWidth: 106 }}>Level</th>
                              <th className="text-left p-2 font-semibold text-xs" style={{ position: 'sticky', left: 290, zIndex: 10, background: '#F8FAFC', minWidth: 106, maxWidth: 106 }}>Location</th>
                              <th className="text-right p-2 font-semibold text-xs" style={{ position: 'sticky', left: 396, zIndex: 10, background: '#F8FAFC', minWidth: 86, maxWidth: 86 }}>$/Month</th>
                              <th className="text-center p-2 font-semibold text-xs" style={{ position: 'sticky', left: 482, zIndex: 10, background: '#F8FAFC', minWidth: 50, maxWidth: 50 }}>Onsite</th>
                              <th className="text-center p-2 font-semibold text-xs" style={{ position: 'sticky', left: 532, zIndex: 10, background: '#F8FAFC', minWidth: 50, maxWidth: 50 }}>Travel</th>
                              <th className="text-center p-2 font-semibold text-xs" style={{ position: 'sticky', left: 582, zIndex: 10, background: '#F8FAFC', minWidth: 40, maxWidth: 40, boxShadow: '3px 0 6px rgba(0,0,0,0.1)' }}>Grp</th>
                              {/* Scrollable columns: Phases + Calculations */}
                              {wave.phase_names.map((phaseName, index) => (
                                <th key={index} className="text-center p-2 bg-[#E0F2FE]">
                                  <Input
                                    value={phaseName}
                                    onChange={(e) => handleUpdatePhaseName(wave.id, index, e.target.value)}
                                    className="w-20 text-center font-semibold text-xs border-0 bg-transparent focus:bg-white"
                                    data-testid={`phase-name-${index}`}
                                    disabled={isReadOnly}
                                  />
                                </th>
                              ))}
                              <th className="text-right p-2 font-semibold text-xs">Total MM</th>
                              <th className="text-right p-2 font-semibold text-xs">Salary Cost</th>
                              <th className="text-right p-2 font-semibold text-xs">Overhead</th>
                              <th className="text-right p-2 font-semibold text-xs bg-gray-100">Total Cost</th>
                              <th className="text-right p-2 font-semibold text-xs bg-green-50">Selling Price</th>
                              <th className="text-right p-2 font-semibold text-xs bg-blue-50">SP/MM</th>
                              <th className="text-right p-2 font-semibold text-xs bg-blue-50">Hourly</th>
                              <th className="text-right p-2 font-semibold text-xs bg-purple-50 w-16">Ovr $/Hr</th>
                              <th className="text-left p-2 font-semibold text-xs">Comments</th>
                              <th className="text-center p-2 font-semibold text-xs">Actions</th>
                            </tr>
                          </thead>
                          <Droppable droppableId={`wave-${wave.id}`}>
                            {(provided) => (
                          <tbody ref={provided.innerRef} {...provided.droppableProps}>
                            {wave.grid_allocations.map((allocation, rowIdx) => {
                              const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(allocation);
                              const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
                              const totalCost = baseSalaryCost + overheadCost;
                              const calcSellingPrice = totalCost / (1 - profitMarginPercentage / 100);
                              const hasOverride = allocation.override_hourly_rate > 0;
                              const sellingPrice = hasOverride ? allocation.override_hourly_rate * 176 * totalManMonths : calcSellingPrice;
                              const spPerMM = totalManMonths > 0 ? sellingPrice / totalManMonths : 0;
                              const hourlyPrice = hasOverride ? allocation.override_hourly_rate : (spPerMM / 176);
                              // Row color by Onsite/Travel combo
                              const rowBg = allocation.is_onsite && allocation.travel_required
                                ? "bg-amber-100/60"
                                : allocation.is_onsite
                                ? "bg-amber-50/40"
                                : "bg-white";
                              const stickyBg = allocation.is_onsite && allocation.travel_required
                                ? '#FEF3C7'
                                : allocation.is_onsite
                                ? '#FFFBEB'
                                : '#FFFFFF';
                              const groupColor = getGroupColor(allocation.resource_group_id);
                              return (
                                <Draggable key={allocation.id} draggableId={allocation.id} index={rowIdx} isDragDisabled={isReadOnly}>
                                  {(dragProvided, snapshot) => (
                                <tr
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`border-b border-[#E2E8F0] ${rowBg} ${snapshot.isDragging ? "shadow-lg opacity-90 bg-blue-50" : ""}`}
                                  style={{ ...dragProvided.draggableProps.style, borderLeft: groupColor ? `4px solid ${groupColor}` : undefined }}
                                  data-testid={`allocation-row-${allocation.id}`}
                                >
                                  {/* Frozen columns: Drag, #, Skill, Level, Location, $/Month, Onsite, Travel, Grp */}
                                  <td className="p-1 text-center" style={{ position: 'sticky', left: 0, zIndex: 2, background: stickyBg }} {...dragProvided.dragHandleProps}>
                                    {!isReadOnly && <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab mx-auto" />}
                                  </td>
                                  <td className="p-1 text-center text-xs text-gray-400 font-mono" style={{ position: 'sticky', left: 32, zIndex: 2, background: stickyBg }}>{rowIdx + 1}</td>
                                  <td className="p-1" style={{ position: 'sticky', left: 64, zIndex: 2, background: stickyBg, minWidth: 120, maxWidth: 120 }}>
                                    {isReadOnly ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="font-medium text-xs cursor-help truncate block">{allocation.skill_name}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-xs p-2">
                                          <p className="font-semibold">{allocation.skill_name}</p>
                                          <p className="text-xs text-gray-500">{allocation.proficiency_level} &middot; {allocation.base_location_name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div>
                                            <SearchableSelect
                                              value={allocation.skill_id}
                                              onValueChange={(value) => handleGridFieldChange(wave.id, allocation.id, 'skill_id', value)}
                                              options={skills.map(s => ({ value: s.id, label: s.name }))}
                                              placeholder="Skill..."
                                              searchPlaceholder="Search skills..."
                                              triggerClassName="w-[110px] text-xs"
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-xs p-2">
                                          <p className="font-semibold">{allocation.skill_name}</p>
                                          <p className="text-xs text-gray-500">{allocation.proficiency_level} &middot; {allocation.base_location_name}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </td>
                                  <td className="p-1" style={{ position: 'sticky', left: 184, zIndex: 2, background: stickyBg, minWidth: 106, maxWidth: 106 }}>
                                    {isReadOnly ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-xs cursor-default truncate block">{allocation.proficiency_level}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p className="text-xs font-medium">{allocation.proficiency_level}</p></TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div>
                                            <SearchableSelect
                                              value={allocation.proficiency_level}
                                              onValueChange={(value) => handleGridFieldChange(wave.id, allocation.id, 'proficiency_level', value)}
                                              options={PROFICIENCY_LEVELS.map(l => ({ value: l, label: l }))}
                                              placeholder="Level..."
                                              searchPlaceholder="Search levels..."
                                              triggerClassName="w-[96px] text-xs"
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p className="text-xs font-medium">{allocation.proficiency_level || 'Select level'}</p></TooltipContent>
                                      </Tooltip>
                                    )}
                                  </td>
                                  <td className="p-1" style={{ position: 'sticky', left: 290, zIndex: 2, background: stickyBg, minWidth: 106, maxWidth: 106 }}>
                                    {isReadOnly ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="text-xs cursor-default truncate block">{allocation.base_location_name}</span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom"><p className="text-xs font-medium">{allocation.base_location_name}</p></TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div>
                                            <SearchableSelect
                                              value={allocation.base_location_id}
                                              onValueChange={(value) => handleGridFieldChange(wave.id, allocation.id, 'base_location_id', value)}
                                              options={locations.map(l => ({ value: l.id, label: l.name }))}
                                              placeholder="Location..."
                                              searchPlaceholder="Search locations..."
                                              triggerClassName="w-[96px] text-xs"
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          <p className="text-xs font-medium">{allocation.base_location_name || 'Select location'}</p>
                                          {allocation.overhead_percentage > 0 && <p className="text-[10px] text-gray-400">OH: {allocation.overhead_percentage}%</p>}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </td>
                                  <td className="p-1 text-right" style={{ position: 'sticky', left: 396, zIndex: 2, background: stickyBg, minWidth: 86, maxWidth: 86 }}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div>
                                          <Input
                                            type="number"
                                            className="w-[74px] text-right font-mono text-xs h-7"
                                            value={allocation.avg_monthly_salary}
                                            onChange={(e) => handleSalaryChange(wave.id, allocation.id, e.target.value)}
                                            data-testid={`salary-${allocation.id}`}
                                            disabled={isReadOnly}
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p className="text-xs font-medium">${Number(allocation.avg_monthly_salary || 0).toLocaleString()}/month</p>
                                        {allocation.original_monthly_salary > 0 && allocation.avg_monthly_salary !== allocation.original_monthly_salary && (
                                          <p className="text-[10px] text-gray-400">Master rate: ${Number(allocation.original_monthly_salary).toLocaleString()}</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                  <td className="p-1 text-center" style={{ position: 'sticky', left: 482, zIndex: 2, background: stickyBg, minWidth: 50, maxWidth: 50 }}>
                                    <button
                                      onClick={() => !isReadOnly && handleToggleOnsite(wave.id, allocation.id)}
                                      disabled={isReadOnly}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                        allocation.is_onsite 
                                          ? "bg-amber-500 text-white" 
                                          : "bg-gray-200 text-gray-600"
                                      } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                                      data-testid={`onsite-toggle-${allocation.id}`}
                                    >
                                      {allocation.is_onsite ? "ON" : "OFF"}
                                    </button>
                                  </td>
                                  <td className="p-1 text-center" style={{ position: 'sticky', left: 532, zIndex: 2, background: stickyBg, minWidth: 50, maxWidth: 50 }}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => !isReadOnly && handleToggleTravelRequired(wave.id, allocation.id)}
                                          disabled={isReadOnly}
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                            allocation.travel_required 
                                              ? "bg-purple-500 text-white" 
                                              : "bg-gray-200 text-gray-600"
                                          } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                                          data-testid={`travel-toggle-${allocation.id}`}
                                        >
                                          {allocation.travel_required ? "YES" : "NO"}
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-xs p-3 text-xs">
                                        {allocation.travel_required ? (
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2 font-semibold text-purple-600">
                                              <Calculator className="w-4 h-4" />
                                              Logistics Formula Applied
                                            </div>
                                            <div className="space-y-1 text-gray-600">
                                              <p><span className="font-medium">Per-diem:</span> MM × ${waveSummary.logistics?.config?.per_diem_daily || 50} × {waveSummary.logistics?.config?.per_diem_days || 30} days</p>
                                              <p><span className="font-medium">Accommodation:</span> MM × ${waveSummary.logistics?.config?.accommodation_daily || 80} × {waveSummary.logistics?.config?.accommodation_days || 30} days</p>
                                              <p><span className="font-medium">Conveyance:</span> MM × ${waveSummary.logistics?.config?.local_conveyance_daily || 15} × {waveSummary.logistics?.config?.local_conveyance_days || 21} days</p>
                                              <p><span className="font-medium">Air Fare:</span> 1 resource × ${waveSummary.logistics?.config?.flight_cost_per_trip || 450} × {waveSummary.logistics?.config?.num_trips || 6} trips</p>
                                              <p><span className="font-medium">Visa/Medical:</span> 1 resource × ${waveSummary.logistics?.config?.visa_medical_per_trip || 400} × {waveSummary.logistics?.config?.num_trips || 6} trips</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <p>No travel logistics. Click to enable travel costs for this resource.</p>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </td>
                                  <td className="p-1 text-center" style={{ position: 'sticky', left: 582, zIndex: 2, background: stickyBg, minWidth: 40, maxWidth: 40, boxShadow: '3px 0 6px rgba(0,0,0,0.1)' }}>
                                    <Input
                                      type="text"
                                      placeholder=""
                                      className="w-10 text-center font-mono text-xs p-1"
                                      value={allocation.resource_group_id || ""}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setWaves(waves.map(w =>
                                          w.id === wave.id
                                            ? { ...w, grid_allocations: w.grid_allocations.map(a =>
                                                a.id === allocation.id ? { ...a, resource_group_id: val } : a
                                              )}
                                            : w
                                        ));
                                      }}
                                      disabled={isReadOnly}
                                      data-testid={`group-${allocation.id}`}
                                    />
                                  </td>
                                  {wave.phase_names.map((_, phaseIndex) => (
                                    <td key={phaseIndex} className="p-2">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="0"
                                        className="w-20 text-center font-mono text-sm"
                                        value={allocation.phase_allocations[phaseIndex] || ""}
                                        onChange={(e) => handlePhaseAllocationChange(wave.id, allocation.id, phaseIndex, e.target.value)}
                                        data-testid={`phase-${phaseIndex}-${allocation.id}`}
                                        disabled={isReadOnly}
                                      />
                                    </td>
                                  ))}
                                  <td className="p-3 text-right font-mono tabular-nums font-semibold text-sm">
                                    {totalManMonths.toFixed(1)}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-600">
                                    ${baseSalaryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-500">
                                    ${overheadCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    <span className="text-xs ml-1">({allocation.overhead_percentage}%)</span>
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold bg-gray-50">
                                    ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold text-[#10B981] bg-green-50/50">
                                    ${sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    {hasOverride && (
                                      <div className="text-[10px] line-through text-gray-400">${calcSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-sm text-blue-600 bg-blue-50/30">
                                    ${spPerMM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    {hasOverride && (
                                      <div className="text-[10px] line-through text-gray-400">${(totalManMonths > 0 ? calcSellingPrice / totalManMonths : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-mono tabular-nums text-sm text-blue-600 bg-blue-50/30">
                                    ${hourlyPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    {hasOverride && (
                                      <div className="text-[10px] line-through text-gray-400">${(totalManMonths > 0 ? calcSellingPrice / totalManMonths / 176 : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                    )}
                                  </td>
                                  <td className="p-1 text-right bg-purple-50/30">
                                    <Input
                                      type="number"
                                      step="1"
                                      placeholder=""
                                      className="w-16 text-right font-mono text-xs p-1"
                                      value={allocation.override_hourly_rate || ""}
                                      onChange={(e) => {
                                        const val = e.target.value ? parseFloat(e.target.value) : null;
                                        setWaves(waves.map(w =>
                                          w.id === wave.id
                                            ? { ...w, grid_allocations: w.grid_allocations.map(a =>
                                                a.id === allocation.id ? { ...a, override_hourly_rate: val } : a
                                              )}
                                            : w
                                        ));
                                      }}
                                      disabled={isReadOnly}
                                      data-testid={`override-hr-${allocation.id}`}
                                    />
                                  </td>
                                  <td className="p-2">
                                    <Textarea
                                      placeholder="Comments..."
                                      className="w-32 h-8 text-xs resize-none min-h-[32px]"
                                      value={allocation.comments || ""}
                                      onChange={(e) => handleAllocationCommentChange(wave.id, allocation.id, e.target.value)}
                                      disabled={isReadOnly}
                                      data-testid={`comment-${allocation.id}`}
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                      {!isReadOnly && (
                                        <>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                variant="ghost" size="icon"
                                                className="h-7 w-7 text-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                                                onClick={() => {
                                                  const value = prompt(`Enter MM value to apply to all ${wave.phase_names.length} months:`, "1");
                                                  if (value !== null) {
                                                    handleApplyToAllMonths(wave.id, allocation.id, value);
                                                  }
                                                }}
                                                data-testid={`apply-all-${allocation.id}`}
                                              >
                                                <Calculator className="w-3.5 h-3.5" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Apply same value to all months</p></TooltipContent>
                                          </Tooltip>
                                          <Button
                                            variant="ghost" size="icon"
                                            className="h-7 w-7 text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                                            onClick={() => handleDeleteAllocation(wave.id, allocation.id)}
                                            data-testid={`delete-allocation-${allocation.id}`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </tbody>
                            )}
                          </Droppable>
                        </table>
                      </div>
                      </DragDropContext>
                    )}

                    {/* Logistics Breakdown */}
                    {wave.grid_allocations.length > 0 && waveSummary.travelingResourceCount > 0 && (
                      <Card className="bg-purple-50/50 border border-purple-200">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                            <Plane className="w-4 h-4 text-purple-600" />
                            Logistics Cost Breakdown
                            <Badge variant="outline" className="ml-2 text-purple-600 border-purple-300">
                              {waveSummary.travelingResourceCount} traveling resource(s), {waveSummary.travelingMM.toFixed(1)} MM
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2">Description</th>
                                  <th className="text-right py-2">Traveling MM/Res</th>
                                  <th className="text-right py-2">Rate (USD)</th>
                                  <th className="text-right py-2">Qty</th>
                                  <th className="text-right py-2 font-bold">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="py-1">Per-diems</td>
                                  <td className="text-right font-mono">{waveSummary.travelingMM.toFixed(2)}</td>
                                  <td className="text-right font-mono">${waveSummary.logistics.config.per_diem_daily}</td>
                                  <td className="text-right font-mono">{waveSummary.logistics.config.per_diem_days}</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.perDiemCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                <tr>
                                  <td className="py-1">Accommodation</td>
                                  <td className="text-right font-mono">{waveSummary.travelingMM.toFixed(2)}</td>
                                  <td className="text-right font-mono">${waveSummary.logistics.config.accommodation_daily}</td>
                                  <td className="text-right font-mono">{waveSummary.logistics.config.accommodation_days}</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.accommodationCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                <tr>
                                  <td className="py-1">Local Conveyance</td>
                                  <td className="text-right font-mono">{waveSummary.travelingMM.toFixed(2)}</td>
                                  <td className="text-right font-mono">${waveSummary.logistics.config.local_conveyance_daily}</td>
                                  <td className="text-right font-mono">{waveSummary.logistics.config.local_conveyance_days}</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.conveyanceCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                <tr>
                                  <td className="py-1">Travel - Air Fare</td>
                                  <td className="text-right font-mono">{waveSummary.travelingResourceCount}</td>
                                  <td className="text-right font-mono">${waveSummary.logistics.config.flight_cost_per_trip}</td>
                                  <td className="text-right font-mono">{waveSummary.logistics.config.num_trips}</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.flightCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                <tr>
                                  <td className="py-1">Visa & Medical</td>
                                  <td className="text-right font-mono">{waveSummary.travelingResourceCount}</td>
                                  <td className="text-right font-mono">${waveSummary.logistics.config.visa_medical_per_trip}</td>
                                  <td className="text-right font-mono">{waveSummary.logistics.config.num_trips}</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.visaMedicalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                <tr>
                                  <td className="py-1">Other Contingency</td>
                                  <td className="text-right font-mono">1</td>
                                  <td className="text-right font-mono">{waveSummary.logistics.config.contingency_percentage}%</td>
                                  <td className="text-right font-mono">1</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.contingencyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                {waveSummary.logistics.contingencyAbsolute > 0 && (
                                <tr>
                                  <td className="py-1">Contingency (Absolute)</td>
                                  <td className="text-right font-mono">-</td>
                                  <td className="text-right font-mono">Fixed</td>
                                  <td className="text-right font-mono">-</td>
                                  <td className="text-right font-mono font-semibold">${waveSummary.logistics.contingencyAbsolute.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                </tr>
                                )}
                                <tr className="border-t-2 font-bold">
                                  <td className="py-2">Total</td>
                                  <td></td>
                                  <td></td>
                                  <td></td>
                                  <td className="text-right font-mono text-purple-600">${waveSummary.logistics.totalLogistics.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Wave Summary */}
                    {wave.grid_allocations.length > 0 && (
                      <Card className="bg-[#F8FAFC] border border-[#E2E8F0]">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-bold text-[#0F172A]">{wave.name} Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Row 1: Man-Months */}
                          <div className="grid grid-cols-5 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Total MM</p>
                              <p className="font-mono font-bold text-xl mt-1">{waveSummary.totalMM.toFixed(1)}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                              <p className="text-xs text-amber-700 uppercase tracking-wide">Onsite MM</p>
                              <p className="font-mono font-bold text-xl text-[#F59E0B] mt-1">{waveSummary.onsiteMM.toFixed(1)}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{waveSummary.onsiteResourceCount} resources</p>
                            </div>
                            <div className="bg-amber-100 p-3 rounded-lg border border-amber-300">
                              <p className="text-xs text-amber-800 uppercase tracking-wide">Onsite Avg $/MM</p>
                              <p className="font-mono font-bold text-xl text-[#D97706] mt-1">
                                ${waveSummary.onsiteMM > 0 
                                  ? (waveSummary.onsiteSellingPrice / waveSummary.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                                  : 0}
                              </p>
                            </div>
                            <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                              <p className="text-xs text-sky-700 uppercase tracking-wide">Offshore MM</p>
                              <p className="font-mono font-bold text-xl text-[#0EA5E9] mt-1">{waveSummary.offshoreMM.toFixed(1)}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{waveSummary.offshoreResourceCount} resources</p>
                            </div>
                            <div className="bg-sky-100 p-3 rounded-lg border border-sky-300">
                              <p className="text-xs text-sky-800 uppercase tracking-wide">Offshore Avg $/MM</p>
                              <p className="font-mono font-bold text-xl text-[#0284C7] mt-1">
                                ${waveSummary.offshoreMM > 0 
                                  ? (waveSummary.offshoreSellingPrice / waveSummary.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                                  : 0}
                              </p>
                            </div>
                          </div>
                          
                          {/* Row 2: Pricing */}
                          <div className="grid grid-cols-5 gap-3">
                            <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
                              <p className="text-xs text-slate-600 uppercase tracking-wide">Resources Price</p>
                              <p className="font-mono font-bold text-xl text-slate-700 mt-1">${waveSummary.totalRowsSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-0.5">sum of rows</p>
                            </div>
                            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                              <p className="text-xs text-purple-700 uppercase tracking-wide">Logistics</p>
                              <p className="font-mono font-bold text-xl text-purple-600 mt-1">${waveSummary.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                              <p className="text-xs text-green-700 uppercase tracking-wide">Selling Price</p>
                              <p className="font-mono font-bold text-xl text-[#10B981] mt-1">${waveSummary.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-0.5">resources + logistics</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-700 uppercase tracking-wide">Nego Buffer ({waveSummary.negoBufferPercentage}%)</p>
                              <p className="font-mono font-bold text-xl text-blue-600 mt-1">${waveSummary.negoBufferAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="bg-emerald-100 p-3 rounded-lg border-2 border-emerald-500">
                              <p className="text-xs text-emerald-800 uppercase tracking-wide font-semibold">Final Price</p>
                              <p className="font-mono font-bold text-2xl text-emerald-700 mt-1">${waveSummary.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            </div>
                          </div>

                          {/* Effective Profit Margin indicator */}
                          {Math.abs(waveSummary.effectiveProfitMargin - profitMarginPercentage) > 0.01 && (
                            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-indigo-700 uppercase">Set Margin:</span>
                                <span className="font-mono font-bold text-indigo-600">{profitMarginPercentage.toFixed(1)}%</span>
                              </div>
                              <span className="text-indigo-300">&rarr;</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-indigo-700 uppercase">Effective Margin:</span>
                                <span className={`font-mono font-bold text-lg ${waveSummary.effectiveProfitMargin >= profitMarginPercentage ? 'text-green-600' : 'text-red-600'}`}>
                                  {waveSummary.effectiveProfitMargin.toFixed(1)}%
                                </span>
                              </div>
                              <span className="text-xs text-indigo-400 ml-auto">based on overrides applied</span>
                            </div>
                          )}
                          
                          {/* Row 3: CTC Analytics */}
                          <div className="grid grid-cols-5 gap-3">
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                              <p className="text-xs text-orange-700 uppercase tracking-wide">Onsite CTC</p>
                              <p className="font-mono font-bold text-xl text-orange-600 mt-1">${waveSummary.onsiteCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-0.5">salary + overhead</p>
                            </div>
                            <div className="bg-orange-100 p-3 rounded-lg border border-orange-300">
                              <p className="text-xs text-orange-800 uppercase tracking-wide">Onsite Avg CTC/MM</p>
                              <p className="font-mono font-bold text-xl text-orange-700 mt-1">
                                ${waveSummary.onsiteMM > 0 
                                  ? (waveSummary.onsiteCTC / waveSummary.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                                  : 0}
                              </p>
                            </div>
                            <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                              <p className="text-xs text-teal-700 uppercase tracking-wide">Offshore CTC</p>
                              <p className="font-mono font-bold text-xl text-teal-600 mt-1">${waveSummary.offshoreCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-0.5">salary + overhead</p>
                            </div>
                            <div className="bg-teal-100 p-3 rounded-lg border border-teal-300">
                              <p className="text-xs text-teal-800 uppercase tracking-wide">Offshore Avg CTC/MM</p>
                              <p className="font-mono font-bold text-xl text-teal-700 mt-1">
                                ${waveSummary.offshoreMM > 0 
                                  ? (waveSummary.offshoreCTC / waveSummary.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                                  : 0}
                              </p>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                              <p className="text-xs text-gray-600 uppercase tracking-wide">Total CTC</p>
                              <p className="font-mono font-bold text-xl text-gray-700 mt-1">${waveSummary.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                              <p className="text-xs text-gray-500 mt-0.5">all resources</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              )})}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Wave Logistics Editor Dialog */}
      <LogisticsDialog open={editLogisticsDialogOpen} onOpenChange={setEditLogisticsDialogOpen} waveLogistics={waveLogistics} setWaveLogistics={setWaveLogistics} onSave={handleSaveWaveLogistics} />

      {/* Batch Update Logistics Dialog */}
      <BatchLogisticsDialog open={batchLogisticsDialogOpen} onOpenChange={setBatchLogisticsDialogOpen} waveLogistics={waveLogistics} setWaveLogistics={setWaveLogistics} onApply={handleBatchUpdateLogistics} />

      {/* Save as New Version Dialog */}
      <SaveVersionDialog open={saveAsNewVersionDialog} onOpenChange={setSaveAsNewVersionDialog} projectNumber={projectNumber} projectVersion={projectVersion} versionNotes={versionNotes} setVersionNotes={setVersionNotes} onSave={handleSaveAsNewVersion} />

      {/* Approver Save Dialog */}
      <ApproverSaveDialog open={approverSaveDialogOpen} onOpenChange={setApproverSaveDialogOpen} projectNumber={projectNumber} projectVersion={projectVersion} hasChanges={hasProjectChanges()} versionNotes={versionNotes} setVersionNotes={setVersionNotes} onSave={handleApproverSave} />

      {/* Summary Dialog */}
      <SummaryDialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen} projectNumber={projectNumber} projectVersion={projectVersion} customerId={customerId} customers={customers} projectName={projectName} projectLocations={projectLocations} technologyIds={technologyIds} technologies={technologies} projectTypeIds={projectTypeIds} projectTypes={projectTypes} salesManagerId={salesManagerId} salesManagers={salesManagers} profitMarginPercentage={profitMarginPercentage} waves={waves} calculateWaveSummary={calculateWaveSummary} overall={overall} />

      {/* Smart Import Preview Dialog */}
      <SmartImportDialog open={smartImportDialog} onOpenChange={(open) => { if (!open) { setSmartImportDialog(false); setSmartImportData(null); } else { setSmartImportDialog(open); } }} smartImportData={smartImportData} smartImportLoading={smartImportLoading} projectId={projectId} onConfirm={confirmSmartImport} />

      {/* Mark Obsolete Confirmation Dialog */}
      <ObsoleteConfirmDialog open={obsoleteConfirmOpen} onOpenChange={setObsoleteConfirmOpen} onConfirm={handleMarkObsolete} />

      {/* Quick Estimate Calculator Dialog */}
      <QuickEstimatorDialog open={quickEstimateOpen} onOpenChange={setQuickEstimateOpen} quickEstimate={quickEstimate} setQuickEstimate={setQuickEstimate} quickEstimateResult={quickEstimateResult} negoBufferPercentage={negoBufferPercentage} />

    </div>
    </TooltipProvider>
  );
};

export default ProjectEstimator;
