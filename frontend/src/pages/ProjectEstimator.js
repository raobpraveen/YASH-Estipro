import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { COUNTRIES, LOGISTICS_DEFAULTS } from "@/utils/constants";
import { getLogisticsConfig as getLogisticsConfigUtil, calculateResourceBaseCost as calcResourceBaseCostUtil, calculateResourceSellingPrice as calcResourceSPUtil, calculateWaveLogistics as calcWaveLogisticsUtil, calculateWaveSummary as calcWaveSummaryUtil, calculateOverallSummary as calcOverallSummaryUtil } from "@/utils/estimatorCalcs";
import { buildExportWorkbook } from "@/utils/excelExport";
import { parseSmartImportExcel } from "@/utils/excelImport";
import { OverallSummary } from "@/components/estimator/OverallSummary";
import { GanttCard } from "@/components/estimator/GanttCard";
import { SubmitReviewDialog, ApprovalActionDialog, LogisticsDialog, BatchLogisticsDialog, SaveVersionDialog, ApproverSaveDialog, SummaryDialog, SmartImportDialog, ObsoleteConfirmDialog, QuickEstimatorDialog } from "@/components/estimator/EstimatorDialogs";
import { ProjectToolbar } from "@/components/estimator/ProjectToolbar";
import { ProjectInfoCard } from "@/components/estimator/ProjectInfoCard";
import { WaveContent } from "@/components/estimator/WaveContent";
import { PROFICIENCY_LEVELS, convertMonthPhasesToRanges } from "@/components/estimator/constants";
import { PhaseActivitiesModal } from "@/components/estimator/PhaseActivitiesModal";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Constants moved to components/estimator/constants.js

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
  
  // New fields
  const [bidCategory, setBidCategory] = useState("");
  const [forecastedClosureDate, setForecastedClosureDate] = useState("");
  const [competencyIds, setCompetencyIds] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [commercialStatus, setCommercialStatus] = useState("");
  const [previousStatus, setPreviousStatus] = useState("");
  
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
  
  const [newWave, setNewWave] = useState({ name: "", duration_months: "", engagement_type: "Implementation", ams_contract_months: 12, ams_billing_frequency: "Monthly", ams_billing_advance: false });
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
  
  // Milestones for Gantt (fetched from payment milestones)
  const [ganttMilestones, setGanttMilestones] = useState([]);
  const [ganttPaymentTermsDays, setGanttPaymentTermsDays] = useState(0);
  const milestoneSaveTimerRef = useRef(null);
  
  // Copy milestones to a new project version ID
  const copyMilestonesToNewVersion = async (newId) => {
    if (!ganttMilestones.length && !ganttPaymentTermsDays) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/projects/${newId}/milestones`, {
        milestones: ganttMilestones,
        payment_terms_days: ganttPaymentTermsDays,
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) { console.error("Failed to copy milestones to new version:", e); }
  };

  // Save milestones to backend (debounced to avoid hammering API on keystrokes)
  const saveGanttMilestones = (updatedMilestones) => {
    setGanttMilestones(updatedMilestones);
    if (!projectId) return;
    if (milestoneSaveTimerRef.current) clearTimeout(milestoneSaveTimerRef.current);
    milestoneSaveTimerRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        await axios.put(`${API}/projects/${projectId}/milestones`, {
          milestones: updatedMilestones,
          payment_terms_days: ganttPaymentTermsDays,
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (e) { console.error("Failed to save milestones:", e); }
    }, 800);
  };

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
    fetchCompetencies();
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
      setBidCategory(project.bid_category || "");
      setForecastedClosureDate(project.forecasted_closure_date || "");
      setCompetencyIds(project.competency_ids || []);
      setCommercialStatus(project.commercial_status || "");
      setPreviousStatus(project.previous_status || "");
      
      // Access control
      setVisibility(project.visibility || "public");
      setRestrictedUserIds(project.restricted_user_ids || []);
      setRestrictedUserNames(project.restricted_user_names || []);
      
      // Gantt chart
      setGanttChart(project.gantt_chart || null);
      
      // Fetch milestones for Gantt chart display
      try {
        const token = localStorage.getItem("token");
        const msRes = await axios.get(`${API}/projects/${id}/milestones`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGanttMilestones(msRes.data.milestones || []);
        setGanttPaymentTermsDays(msRes.data.payment_terms_days || 0);
      } catch { setGanttMilestones([]); setGanttPaymentTermsDays(0); }
      
      if (project.waves && project.waves.length > 0) {
        // Backward compatibility: convert legacy month_phases to phase_ranges
        const migratedWaves = project.waves.map(w => {
          if ((!w.phase_ranges || w.phase_ranges.length === 0) && w.month_phases && w.month_phases.some(p => p)) {
            return { ...w, phase_ranges: convertMonthPhasesToRanges(w.month_phases) };
          }
          return w;
        });
        setWaves(migratedWaves);
        setActiveWaveId(migratedWaves[0].id);
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

  const fetchCompetencies = async () => {
    try { setCompetencies((await axios.get(`${API}/competencies`)).data); } catch { /* noop */ }
  };


  const handleAddWave = () => {
    if (!newWave.name || !newWave.duration_months) {
      toast.error("Please fill wave name and duration");
      return;
    }

    const engagementType = newWave.engagement_type || "Implementation";
    const isAms = engagementType.startsWith("AMS_");
    // For AMS_Shared we don't need phase columns, but keep duration intact
    const numMonths = Math.ceil(parseFloat(newWave.duration_months));
    const phaseNames = Array(numMonths).fill("").map((_, i) => `M${i + 1}`);

    const wave = {
      id: Math.random().toString(36).substr(2, 9),
      name: newWave.name,
      description: newWave.description || "",
      duration_months: parseFloat(newWave.duration_months),
      phase_names: phaseNames,
      month_phases: Array(numMonths).fill(""),
      phase_ranges: [],
      wave_start_month: 1,
      logistics_config: { ...waveLogistics },
      nego_buffer_percentage: 0,
      grid_allocations: [],
      engagement_type: engagementType,
      ams_shared_buckets: [],
      ams_contract_months: isAms ? (parseInt(newWave.ams_contract_months) || 12) : 12,
      ams_billing_frequency: isAms ? (newWave.ams_billing_frequency || "Monthly") : "Monthly",
      ams_billing_advance: isAms ? !!newWave.ams_billing_advance : false,
    };

    setWaves([...waves, wave]);
    setActiveWaveId(wave.id);
    setNewWave({ name: "", description: "", duration_months: "", engagement_type: "Implementation", ams_contract_months: 12, ams_billing_frequency: "Monthly", ams_billing_advance: false });
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
      ams_shared_buckets: (source.ams_shared_buckets || []).map(b => ({
        ...b,
        id: Math.random().toString(36).substr(2, 9),
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
        phase_names: [...w.phase_names, `M${newIndex}`],
        month_phases: [...(w.month_phases || []), ""],
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
        month_phases: (w.month_phases || []).slice(0, -1),
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

  const handleUpdateMonthPhase = (waveId, monthIndex, phaseName) => {
    setWaves(waves.map(w => {
      if (w.id !== waveId) return w;
      const mp = [...(w.month_phases || w.phase_names.map(() => ""))];
      mp[monthIndex] = phaseName;
      return { ...w, month_phases: mp };
    }));
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
      technology_name: selectedRate.technology_name || skills.find(s => s.id === selectedRate.skill_id)?.technology_name || "",
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

  // Add an empty row for quick data entry — defaults filtered by project's technologies
  const handleAddEmptyRow = (waveId) => {
    const filteredSkills = (technologyIds && technologyIds.length > 0)
      ? skills.filter(s => !s.technology_id || technologyIds.includes(s.technology_id))
      : skills;
    const firstSkill = filteredSkills[0] || skills[0];
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
  const [activitiesModalOpen, setActivitiesModalOpen] = useState(false);
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
        month_phases: w.month_phases || w.phase_names.map(() => ""),
        phase_ranges: w.phase_ranges || [],
        wave_start_month: w.wave_start_month || 1,
        logistics_config: w.logistics_config,
        nego_buffer_percentage: w.nego_buffer_percentage || 0,
        exclude_from_summary: w.exclude_from_summary || false,
        grid_allocations: w.grid_allocations,
        // AMS engagement fields
        engagement_type: w.engagement_type || "Implementation",
        ams_shared_buckets: w.ams_shared_buckets || [],
        ams_contract_months: parseInt(w.ams_contract_months) || 12,
        ams_billing_frequency: w.ams_billing_frequency || "Monthly",
        ams_billing_advance: !!w.ams_billing_advance,
      })),
      version_notes: versionNotes,
      status: projectStatus,
      approver_email: approverEmail,
      sales_manager_id: salesManagerId,
      sales_manager_name: salesManagers.find(m => m.id === salesManagerId)?.name || "",
      bid_category: bidCategory === "none" ? "" : bidCategory,
      forecasted_closure_date: forecastedClosureDate,
      competency_ids: competencyIds,
      competency_names: competencyIds.map(id => competencies.find(c => c.id === id)?.name || "").filter(Boolean),
      commercial_status: commercialStatus,
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
      await copyMilestonesToNewVersion(response.data.id);
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
      await copyMilestonesToNewVersion(newProjectId);

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


  const handleExportToExcel = async () => {
    if (waves.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Fetch project activities for export
      let projectActivities = [];
      let cashflowData = null;
      if (projectId) {
        const token = localStorage.getItem("token");
        const authHeaders = { Authorization: `Bearer ${token}` };
        try {
          const actRes = await axios.get(`${API}/projects/${projectId}/activities`, { headers: authHeaders });
          projectActivities = actRes.data || [];
        } catch { /* ignore */ }
        try {
          const cfRes = await axios.get(`${API}/projects/${projectId}/cashflow`, { headers: authHeaders });
          cashflowData = cfRes.data || null;
        } catch { /* ignore */ }
      }

      const { buffer, fileName } = await buildExportWorkbook({
        waves, profitMarginPercentage, negoBufferPercentage,
        projectName, projectDescription, projectNumber, projectVersion, projectStatus,
        versionNotes, customerId, customers, projectLocations, technologyIds: technologyIds, technologies,
        subTechnologyIds, subTechnologies, projectTypeIds, projectTypes,
        salesManagerId, salesManagers, crmId, COUNTRIES,
        milestones: ganttMilestones, paymentTermsDays: ganttPaymentTermsDays,
        projectActivities,
        cashflowData,
        skills,
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
        phase_ranges: pw.phaseRanges || [],
        logistics_config: pw.logistics || waves[0]?.logistics_config || {},
        grid_allocations: pw.allocations.map(a => ({
          ...a,
          id: a.id,
          skill_id: skillMap[a.skill_name.toLowerCase()]?.id || a.skill_id,
          base_location_id: locMap[a.base_location_name.toLowerCase()]?.id || a.base_location_id,
        })),
        // AMS fields (imported from "AMS SHARED SUPPORT" section in Excel)
        engagement_type: pw.engagementType || "Implementation",
        ams_shared_buckets: (pw.amsBuckets || []).map(b => ({
          id: `bucket_imp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          name: b.name,
          hours_per_month: b.hours_per_month,
          hourly_rate: b.hourly_rate,
          cost_rate: b.cost_rate || 0,
          notes: b.notes || "",
        })),
        ams_contract_months: pw.amsContractMonths || 12,
        ams_billing_frequency: pw.amsBillingFrequency || "Monthly",
        ams_billing_advance: !!pw.amsBillingAdvance,
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

          // Determine milestones for the new version:
          // If Excel contains milestones sheets, use imported data (overwrite)
          // Otherwise, copy existing milestones with wave name mapping
          const importedMs = smartImportData.milestones || [];
          let finalMilestones = [];
          let finalPaymentTerms = ganttPaymentTermsDays;

          if (importedMs.length > 0) {
            // Use imported milestones (overwrite existing)
            finalMilestones = importedMs.flatMap(wm => wm.milestones || []);
            // Use imported payment terms if available
            const firstWithTerms = importedMs.find(wm => wm.payment_terms_days > 0);
            if (firstWithTerms) finalPaymentTerms = firstWithTerms.payment_terms_days;
          } else {
            // No milestones in Excel — carry over existing with wave name mapping
            const oldWaveNames = waves.map(w => w.name);
            const newWaveNames = newWaves.map(w => w.name);
            const waveNameMap = {};
            oldWaveNames.forEach((oldName, i) => {
              if (i < newWaveNames.length) waveNameMap[oldName] = newWaveNames[i];
            });
            finalMilestones = (ganttMilestones || []).map(m => ({
              ...m,
              wave_name: waveNameMap[m.wave_name] || m.wave_name,
            }));
          }

          if (finalMilestones.length > 0 || finalPaymentTerms) {
            try {
              await axios.put(`${API}/projects/${response.data.id}/milestones`, {
                milestones: finalMilestones,
                payment_terms_days: finalPaymentTerms,
              }, { headers: apiHeaders });
            } catch (msErr) {
              console.error("Failed to save milestones to new version:", msErr);
              toast.error("Warning: Milestones could not be saved to the new version.");
            }
          }
          setGanttMilestones(finalMilestones);
          setGanttPaymentTermsDays(finalPaymentTerms);

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
        // If Excel contains milestones, overwrite in current project
        const importedMs = smartImportData.milestones || [];
        if (importedMs.length > 0 && projectId) {
          const allMs = importedMs.flatMap(wm => wm.milestones || []);
          const firstWithTerms = importedMs.find(wm => wm.payment_terms_days > 0);
          const terms = firstWithTerms ? firstWithTerms.payment_terms_days : ganttPaymentTermsDays;
          try {
            await axios.put(`${API}/projects/${projectId}/milestones`, {
              milestones: allMs,
              payment_terms_days: terms,
            }, { headers: apiHeaders });
            setGanttMilestones(allMs);
            setGanttPaymentTermsDays(terms);
          } catch { /* ignore */ }
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

  return (
    <TooltipProvider>
    <div data-testid="project-estimator" className="space-y-6">
      <ProjectToolbar
        projectId={projectId} projectNumber={projectNumber} projectVersion={projectVersion} projectStatus={projectStatus}
        isReadOnly={isReadOnly} isDesignatedApprover={isDesignatedApprover} canMarkObsolete={canMarkObsolete}
        approvalComments={approvalComments} approverEmail={approverEmail} smartImportLoading={smartImportLoading}
        navigate={navigate}
        onNewProject={handleNewProject} onCloneProject={handleCloneProject}
        onOpenNewVersion={() => setSaveAsNewVersionDialog(true)}
        onExportExcel={handleExportToExcel} onSmartImportFile={handleSmartImportFile}
        onOpenSummary={() => setSummaryDialogOpen(true)} onOpenQuickEstimate={() => setQuickEstimateOpen(true)}
        onOpenSubmitReview={openSubmitForReviewDialog}
        onOpenApproverSave={() => setApproverSaveDialogOpen(true)}
        onReject={() => { setApprovalAction("reject"); setApprovalActionDialog(true); }}
        onOpenObsolete={() => setObsoleteConfirmOpen(true)}
        onSaveProject={handleSaveProject}
        onOpenActivities={() => setActivitiesModalOpen(true)}
      />

      <SubmitReviewDialog open={submitForReviewDialog} onOpenChange={setSubmitForReviewDialog} approverEmail={approverEmail} setApproverEmail={setApproverEmail} approversList={approversList} onSubmit={handleSubmitForReview} />
      <ApprovalActionDialog open={approvalActionDialog} onOpenChange={setApprovalActionDialog} approvalAction={approvalAction} approvalComments={approvalComments} setApprovalComments={setApprovalComments} onAction={handleApprovalAction} />

      <ProjectInfoCard
        isReadOnly={isReadOnly} isLatestVersion={isLatestVersion} projectStatus={projectStatus}
        collapsedSections={collapsedSections} toggleSection={toggleSection}
        customerId={customerId} setCustomerId={setCustomerId} customers={customers}
        projectName={projectName} setProjectName={setProjectName}
        projectLocations={projectLocations} setProjectLocations={setProjectLocations}
        technologyIds={technologyIds} setTechnologyIds={setTechnologyIds} technologies={technologies}
        subTechnologyIds={subTechnologyIds} setSubTechnologyIds={setSubTechnologyIds} subTechnologies={subTechnologies}
        projectTypeIds={projectTypeIds} setProjectTypeIds={setProjectTypeIds} projectTypes={projectTypes}
        salesManagerId={salesManagerId} setSalesManagerId={setSalesManagerId} salesManagers={salesManagers}
        profitMarginPercentage={profitMarginPercentage} setProfitMarginPercentage={setProfitMarginPercentage}
        negoBufferPercentage={negoBufferPercentage} setNegoBufferPercentage={setNegoBufferPercentage}
        crmId={crmId} setCrmId={setCrmId}
        visibility={visibility} setVisibility={setVisibility}
        restrictedUserIds={restrictedUserIds} setRestrictedUserIds={setRestrictedUserIds}
        restrictedUserNames={restrictedUserNames} setRestrictedUserNames={setRestrictedUserNames}
        allUsers={allUsers} currentUser={currentUser}
        projectDescription={projectDescription} setProjectDescription={setProjectDescription}
        versionNotes={versionNotes} setVersionNotes={setVersionNotes}
        projectId={projectId}
        bidCategory={bidCategory} setBidCategory={setBidCategory}
        forecastedClosureDate={forecastedClosureDate} setForecastedClosureDate={setForecastedClosureDate}
        competencyIds={competencyIds} setCompetencyIds={setCompetencyIds} competencies={competencies}
        commercialStatus={commercialStatus} setCommercialStatus={setCommercialStatus}
        previousStatus={previousStatus}
      />

      {/* Gantt Chart */}
      <GanttCard projectId={projectId} waves={waves} setWaves={setWaves} milestones={ganttMilestones} ganttChart={ganttChart} ganttLoading={ganttLoading} ganttInputRef={ganttInputRef} handleGanttUpload={handleGanttUpload} handleGanttDelete={handleGanttDelete} isReadOnly={isReadOnly} collapsedSections={collapsedSections} toggleSection={toggleSection} onSaveMilestones={saveGanttMilestones} />

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
                  <div>
                    <Label htmlFor="wave-engagement">Engagement Type</Label>
                    <Select
                      value={newWave.engagement_type || "Implementation"}
                      onValueChange={(v) => setNewWave({ ...newWave, engagement_type: v })}
                    >
                      <SelectTrigger id="wave-engagement" data-testid="wave-engagement-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Implementation">Implementation (default)</SelectItem>
                        <SelectItem value="AMS_Shared">AMS — Shared Support</SelectItem>
                        <SelectItem value="AMS_Dedicated">AMS — Dedicated Resources</SelectItem>
                        <SelectItem value="AMS_Mix">AMS — Mix (Shared + Dedicated)</SelectItem>
                      </SelectContent>
                    </Select>
                    {newWave.engagement_type && newWave.engagement_type !== "Implementation" && (
                      <p className="text-[11px] text-gray-500 mt-1">
                        AMS waves use rolling monthly billing. Profit margin & nego buffer apply only to <em>Dedicated</em> portions; <em>Shared Support</em> uses pure billed rates.
                      </p>
                    )}
                  </div>
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
                  {(newWave.engagement_type || "").startsWith("AMS_") && (
                    <div>
                      <Label htmlFor="ams-contract-months">Contract Length (Months)</Label>
                      <Input
                        id="ams-contract-months"
                        type="number"
                        min="1"
                        max="60"
                        placeholder="12"
                        value={newWave.ams_contract_months}
                        onChange={(e) => setNewWave({ ...newWave, ams_contract_months: e.target.value })}
                        data-testid="ams-contract-months-input"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Used for yearly billing summary. Default 12 months.</p>
                    </div>
                  )}
                  {(newWave.engagement_type || "").startsWith("AMS_") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ams-billing-frequency">Billing Frequency</Label>
                        <Select
                          value={newWave.ams_billing_frequency || "Monthly"}
                          onValueChange={(v) => setNewWave({ ...newWave, ams_billing_frequency: v })}
                        >
                          <SelectTrigger id="ams-billing-frequency" data-testid="ams-billing-frequency-input">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-gray-500 mt-1">Cadence at which the customer is billed.</p>
                      </div>
                      <div className="flex flex-col">
                        <Label htmlFor="ams-billing-advance" className="mb-2">Bill in Advance</Label>
                        <label className="flex items-center gap-2 mt-1.5 cursor-pointer select-none" htmlFor="ams-billing-advance">
                          <input
                            id="ams-billing-advance"
                            type="checkbox"
                            checked={!!newWave.ams_billing_advance}
                            onChange={(e) => setNewWave({ ...newWave, ams_billing_advance: e.target.checked })}
                            className="h-4 w-4 accent-[#8B5CF6] cursor-pointer"
                            data-testid="ams-billing-advance-input"
                          />
                          <span className="text-sm text-gray-700">Paid immediately (ignore payment-terms days)</span>
                        </label>
                        <p className="text-[11px] text-gray-500 mt-1">If off, AMS billing follows project payment terms (+N days).</p>
                      </div>
                    </div>
                  )}
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
              <p className="text-gray-500">No waves added yet. Click &quot;Add Wave&quot; to start.</p>
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
                  <WaveContent
                    wave={wave} waveSummary={waveSummary} isReadOnly={isReadOnly}
                    waves={waves} setWaves={setWaves} activeWaveId={activeWaveId}
                    profitMarginPercentage={profitMarginPercentage}
                    addResourceDialogOpen={addResourceDialogOpen} setAddResourceDialogOpen={setAddResourceDialogOpen}
                    newAllocation={newAllocation} setNewAllocation={setNewAllocation}
                    rates={rates} skills={skills} locations={locations}
                    technologyIds={technologyIds}
                    onAddPhaseColumn={handleAddPhaseColumn} onRemovePhaseColumn={handleRemovePhaseColumn}
                    onUpdatePhaseName={handleUpdatePhaseName}
                    onOpenLogisticsEditor={handleOpenLogisticsEditor} onAddAllocation={handleAddAllocation}
                    onDeleteAllocation={handleDeleteAllocation} onToggleOnsite={handleToggleOnsite}
                    onToggleTravelRequired={handleToggleTravelRequired} onPhaseAllocationChange={handlePhaseAllocationChange}
                    onSalaryChange={handleSalaryChange} onDragEnd={handleDragEnd}
                    onAllocationCommentChange={handleAllocationCommentChange} onApplyToAllMonths={handleApplyToAllMonths}
                    onAddEmptyRow={handleAddEmptyRow}
                    onCloneWave={handleCloneWave} onDeleteWave={handleDeleteWave}
                    onGridFieldChange={handleGridFieldChange}
                    milestones={ganttMilestones} onSaveMilestones={saveGanttMilestones}
                  />
                </TabsContent>
                );
              })}
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

      {/* Phase Activities & Deliverables Modal */}
      <PhaseActivitiesModal open={activitiesModalOpen} onOpenChange={setActivitiesModalOpen} projectId={projectId} waves={waves} projectName={projectName} projectNumber={projectNumber} technologies={technologies} subTechnologies={subTechnologies} projectTypes={projectTypes} projectTypeIds={projectTypeIds} technologyIds={technologyIds} subTechnologyIds={subTechnologyIds} />

    </div>
    </TooltipProvider>
  );
};

export default ProjectEstimator;
