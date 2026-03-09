import { useEffect, useState } from "react";
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
import { Plus, Trash2, Plane, Save, FileDown, X, Settings, Copy, History, RefreshCw, Send, CheckCircle, XCircle, Clock, Calculator, Upload, FileSpreadsheet, Minus, MessageSquare, GripVertical, Download, Zap } from "lucide-react";
import { SearchableSelect } from "@/components/SearchableSelect";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { COUNTRIES, LOGISTICS_DEFAULTS } from "@/utils/constants";

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
  
  // Project header
  const [projectId, setProjectId] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [projectVersion, setProjectVersion] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectLocations, setProjectLocations] = useState([]); // Multiple locations
  const [technologyIds, setTechnologyIds] = useState([]); // Multiple technologies
  const [projectTypeIds, setProjectTypeIds] = useState([]); // Multiple project types
  const [projectDescription, setProjectDescription] = useState("");
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
  
  // Waves
  const [waves, setWaves] = useState([]);
  const [activeWaveId, setActiveWaveId] = useState("");
  
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
  });

  useEffect(() => {
    fetchRates();
    fetchSkills();
    fetchLocations();
    fetchTechnologies();
    fetchProjectTypes();
    fetchCustomers();
    fetchSalesManagers();
  }, []);

  useEffect(() => {
    if (projectIdToLoad) {
      loadProject(projectIdToLoad);
    }
  }, [projectIdToLoad]);

  const fetchSkills = async () => {
    try {
      const response = await axios.get(`${API}/skills`);
      setSkills(response.data);
    } catch (error) {
      console.error("Failed to fetch skills");
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
      setProfitMarginPercentage(project.profit_margin_percentage || 35);
      setNegoBufferPercentage(project.nego_buffer_percentage || 0);
      setVersionNotes(project.version_notes || "");
      setProjectStatus(project.status || "draft");
      setApproverEmail(project.approver_email || "");
      setApprovalComments(project.approval_comments || "");
      setSalesManagerId(project.sales_manager_id || "");
      setIsLatestVersion(project.is_latest_version !== false);
      setProjectCreatorId(project.created_by_id || "");
      
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

  const getLogisticsConfig = (wave) => {
    const raw = (wave.logistics_config && Object.keys(wave.logistics_config).length > 0)
      ? wave.logistics_config
      : wave.logistics_defaults || {};
    return {
      per_diem_daily: raw.per_diem_daily ?? 50,
      per_diem_days: raw.per_diem_days ?? 30,
      accommodation_daily: raw.accommodation_daily ?? 80,
      accommodation_days: raw.accommodation_days ?? 30,
      local_conveyance_daily: raw.local_conveyance_daily ?? 15,
      local_conveyance_days: raw.local_conveyance_days ?? 21,
      flight_cost_per_trip: raw.flight_cost_per_trip ?? 450,
      visa_medical_per_trip: raw.visa_medical_per_trip ?? raw.visa_insurance_per_trip ?? 400,
      num_trips: raw.num_trips ?? 6,
      contingency_percentage: raw.contingency_percentage ?? 5,
    };
  };

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
  const calculateResourceBaseCost = (allocation) => {
    const totalManMonths = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
    const baseSalaryCost = allocation.avg_monthly_salary * totalManMonths;
    return { totalManMonths, baseSalaryCost };
  };

  // Calculate individual resource selling price
  // Selling Price per row = (Salary Cost + Overhead) / (1 - profit margin)
  const calculateResourceSellingPrice = (allocation) => {
    const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(allocation);
    const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
    const totalCost = baseSalaryCost + overheadCost;
    const sellingPrice = totalCost / (1 - profitMarginPercentage / 100);
    return { totalManMonths, baseSalaryCost, overheadCost, totalCost, sellingPrice };
  };

  // Calculate wave-level logistics based on the formula from the image
  // Per-diem/Accommodation/Conveyance: Total Traveling MM × Rate × Days
  // Flights/Visa: Num Traveling Resources × Rate × Trips
  // Only resources with travel_required=true are counted for logistics
  const calculateWaveLogistics = (wave) => {
    // Prefer logistics_config if it has keys, otherwise fall back to logistics_defaults or hardcoded defaults
    const rawConfig = (wave.logistics_config && Object.keys(wave.logistics_config).length > 0) 
      ? wave.logistics_config 
      : wave.logistics_defaults || {};
    const config = {
      per_diem_daily: rawConfig.per_diem_daily ?? 50,
      per_diem_days: rawConfig.per_diem_days ?? 30,
      accommodation_daily: rawConfig.accommodation_daily ?? 80,
      accommodation_days: rawConfig.accommodation_days ?? 30,
      local_conveyance_daily: rawConfig.local_conveyance_daily ?? 15,
      local_conveyance_days: rawConfig.local_conveyance_days ?? 21,
      flight_cost_per_trip: rawConfig.flight_cost_per_trip ?? 450,
      visa_medical_per_trip: rawConfig.visa_medical_per_trip ?? rawConfig.visa_insurance_per_trip ?? 400,
      num_trips: rawConfig.num_trips ?? 6,
      contingency_percentage: rawConfig.contingency_percentage ?? 5,
    };

    // Calculate total traveling MM and count of traveling resources
    let totalTravelingMM = 0;
    let travelingResourceCount = 0;
    let totalOnsiteMM = 0;
    let onsiteResourceCount = 0;
    
    wave.grid_allocations.forEach(allocation => {
      const mm = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
      
      // Track all onsite resources for display
      if (allocation.is_onsite) {
        totalOnsiteMM += mm;
        onsiteResourceCount++;
      }
      
      // Only count resources with travel_required for logistics calculations
      if (allocation.travel_required) {
        totalTravelingMM += mm;
        travelingResourceCount++;
      }
    });

    // Calculate logistics costs using formula - only for traveling resources
    const perDiemCost = totalTravelingMM * config.per_diem_daily * config.per_diem_days;
    const accommodationCost = totalTravelingMM * config.accommodation_daily * config.accommodation_days;
    const conveyanceCost = totalTravelingMM * config.local_conveyance_daily * config.local_conveyance_days;
    const flightCost = travelingResourceCount * config.flight_cost_per_trip * config.num_trips;
    const visaMedicalCost = travelingResourceCount * config.visa_medical_per_trip * config.num_trips;
    
    const subtotal = perDiemCost + accommodationCost + conveyanceCost + flightCost + visaMedicalCost;
    const contingencyCost = subtotal * (config.contingency_percentage / 100);
    const totalLogistics = subtotal + contingencyCost;

    return {
      totalOnsiteMM,
      onsiteResourceCount,
      totalTravelingMM,
      travelingResourceCount,
      perDiemCost,
      accommodationCost,
      conveyanceCost,
      flightCost,
      visaMedicalCost,
      contingencyCost,
      totalLogistics,
      config,
    };
  };

  // Calculate wave summary
  // Row Selling Price = (Salary + Overhead) / (1 - profit margin%)
  // Resources Price = Sum of all rows selling price
  // Wave Selling Price = Resources Price + Logistics
  const calculateWaveSummary = (wave) => {
    let totalMM = 0;
    let onsiteMM = 0;
    let offshoreMM = 0;
    let onsiteSellingPrice = 0;
    let offshoreSellingPrice = 0;
    let onsiteSalaryCost = 0;
    let offshoreSalaryCost = 0;
    let totalRowsSellingPrice = 0;
    let totalBaseSalaryCost = 0;
    let totalOverheadCost = 0;
    let onsiteOverheadCost = 0;
    let offshoreOverheadCost = 0;

    // Calculate selling price for each resource row: (Salary + Overhead) / (1 - profit margin%)
    wave.grid_allocations.forEach(allocation => {
      const totalManMonths = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
      const baseSalaryCost = allocation.avg_monthly_salary * totalManMonths;
      const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
      const totalCost = baseSalaryCost + overheadCost;
      const rowSellingPrice = totalCost / (1 - profitMarginPercentage / 100);
      const effectiveSellingPrice = allocation.override_hourly_rate > 0
        ? allocation.override_hourly_rate * 176 * totalManMonths
        : rowSellingPrice;
      
      totalMM += totalManMonths;
      totalBaseSalaryCost += baseSalaryCost;
      totalOverheadCost += overheadCost;
      totalRowsSellingPrice += effectiveSellingPrice;

      // Separate by Onsite indicator (ON = is_onsite true, OFF = is_onsite false)
      if (allocation.is_onsite) {
        onsiteMM += totalManMonths;
        onsiteSellingPrice += effectiveSellingPrice;
        onsiteSalaryCost += baseSalaryCost;
        onsiteOverheadCost += overheadCost;
      } else {
        offshoreMM += totalManMonths;
        offshoreSellingPrice += effectiveSellingPrice;
        offshoreSalaryCost += baseSalaryCost;
        offshoreOverheadCost += overheadCost;
      }
    });

    // Get wave-level logistics (calculated based on travel_required flag)
    const logistics = calculateWaveLogistics(wave);
    
    // Resources Price = Sum of all rows selling price
    // Wave Selling Price = Resources Price + Logistics
    const waveSellingPrice = totalRowsSellingPrice + logistics.totalLogistics;
    
    // Total Cost (for reference) = Salary + Overhead + Logistics
    const totalCost = totalBaseSalaryCost + totalOverheadCost + logistics.totalLogistics;
    
    // Cost to Company = Salary + Overhead only (excludes logistics)
    const costToCompany = totalBaseSalaryCost + totalOverheadCost;
    
    // Calculate nego buffer (on wave selling price) — uses project-level buffer
    const negoBufferPct = negoBufferPercentage || 0;
    const negoBufferAmount = waveSellingPrice * (negoBufferPct / 100);
    const finalPrice = waveSellingPrice + negoBufferAmount;

    return {
      totalMM,
      onsiteMM,
      offshoreMM,
      onsiteSalaryCost,
      offshoreSalaryCost,
      onsiteSellingPrice,
      offshoreSellingPrice,
      totalRowsSellingPrice,  // Resources Price = sum of all rows selling price
      totalLogisticsCost: logistics.totalLogistics,
      totalCost,
      totalCostToCompany: costToCompany,  // Salary + Overhead only (excludes logistics)
      effectiveProfitMargin: totalRowsSellingPrice > 0
        ? ((totalRowsSellingPrice - costToCompany) / totalRowsSellingPrice * 100)
        : profitMarginPercentage,
      onsiteOverheadCost,
      offshoreOverheadCost,
      onsiteCTC: onsiteSalaryCost + onsiteOverheadCost,
      offshoreCTC: offshoreSalaryCost + offshoreOverheadCost,
      sellingPrice: waveSellingPrice,  // Resources Price + Logistics
      negoBufferPercentage: negoBufferPct,
      negoBufferAmount,
      finalPrice,
      onsiteResourceCount: logistics.onsiteResourceCount,
      offshoreResourceCount: (wave.grid_allocations || []).length - logistics.onsiteResourceCount,
      travelingResourceCount: logistics.travelingResourceCount,
      travelingMM: logistics.totalTravelingMM,
      logistics,
    };
  };

  // Calculate overall summary - sum of all waves
  const calculateOverallSummary = () => {
    let totalMM = 0;
    let onsiteMM = 0;
    let offshoreMM = 0;
    let onsiteSalaryCost = 0;
    let offshoreSalaryCost = 0;
    let totalLogisticsCost = 0;
    let totalCost = 0;
    let totalRowsSellingPrice = 0;
    let totalSellingPrice = 0;
    let totalNegoBuffer = 0;
    let totalFinalPrice = 0;
    let onsiteSellingPrice = 0;
    let offshoreSellingPrice = 0;

    let totalCostToCompany = 0;
    let onsiteOverheadCost = 0;
    let offshoreOverheadCost = 0;
    let totalOnsiteResourceCount = 0;
    let totalOffshoreResourceCount = 0;

    // Sum up all wave summaries
    waves.forEach(wave => {
      const summary = calculateWaveSummary(wave);
      totalMM += summary.totalMM;
      onsiteMM += summary.onsiteMM;
      offshoreMM += summary.offshoreMM;
      onsiteSalaryCost += summary.onsiteSalaryCost;
      offshoreSalaryCost += summary.offshoreSalaryCost;
      onsiteOverheadCost += summary.onsiteOverheadCost;
      offshoreOverheadCost += summary.offshoreOverheadCost;
      totalLogisticsCost += summary.totalLogisticsCost;
      totalCost += summary.totalCost;
      totalCostToCompany += summary.totalCostToCompany;  // Sum of (Salary + Overhead) per wave
      totalRowsSellingPrice += summary.totalRowsSellingPrice;
      totalSellingPrice += summary.sellingPrice;
      totalNegoBuffer += summary.negoBufferAmount;
      totalFinalPrice += summary.finalPrice;
      onsiteSellingPrice += summary.onsiteSellingPrice;
      offshoreSellingPrice += summary.offshoreSellingPrice;
      totalOnsiteResourceCount += summary.onsiteResourceCount;
      totalOffshoreResourceCount += summary.offshoreResourceCount;
    });

    // Calculate avg $/MM = Selling Price / MM for each category
    const onsiteAvgPerMM = onsiteMM > 0 ? onsiteSellingPrice / onsiteMM : 0;
    const offshoreAvgPerMM = offshoreMM > 0 ? offshoreSellingPrice / offshoreMM : 0;

    return {
      totalMM,
      onsiteMM,
      offshoreMM,
      onsiteSalaryCost,
      offshoreSalaryCost,
      totalLogisticsCost,
      totalCost,
      totalCostToCompany,  // Salary + Overhead only (excludes logistics)
      effectiveProfitMargin: totalRowsSellingPrice > 0
        ? ((totalRowsSellingPrice - totalCostToCompany) / totalRowsSellingPrice * 100)
        : 0,
      onsiteOverheadCost,
      offshoreOverheadCost,
      onsiteCTC: onsiteSalaryCost + onsiteOverheadCost,
      offshoreCTC: offshoreSalaryCost + offshoreOverheadCost,
      totalOnsiteResourceCount,
      totalOffshoreResourceCount,
      totalRowsSellingPrice,  // Total Resources Price
      sellingPrice: totalSellingPrice,  // Total Selling Price (Resources + Logistics)
      negoBuffer: totalNegoBuffer,
      finalPrice: totalFinalPrice,
      onsiteSellingPrice,
      offshoreSellingPrice,
      onsiteAvgPerMM,
      offshoreAvgPerMM,
    };
  };

  const getProjectPayload = () => {
    const selectedCustomer = customers.find(c => c.id === customerId);
    const selectedLocationNames = projectLocations.map(code => 
      COUNTRIES.find(c => c.code === code)?.name || code
    );
    const selectedTechNames = technologyIds.map(id => 
      technologies.find(t => t.id === id)?.name || ''
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
      // Keep single location for backward compatibility
      project_location: projectLocations[0] || "",
      project_location_name: selectedLocationNames[0] || "",
      // Multiple technologies
      technology_ids: technologyIds,
      technology_names: selectedTechNames,
      technology_id: technologyIds[0] || "",
      technology_name: selectedTechNames[0] || "",
      // Multiple project types
      project_type_ids: projectTypeIds,
      project_type_names: selectedTypeNames,
      project_type_id: projectTypeIds[0] || "",
      project_type_name: selectedTypeNames[0] || "",
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
    setProjectTypeIds([]);
    setProjectDescription("");
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
    navigate("/estimator");
    toast.info("Ready for new project");
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
          overhead_percentage: !isNaN(overheadPct) ? overheadPct : (location?.overhead_percentage || 30),
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
    const selectedCustomer = customers.find(c => c.id === customerId);
    const wb = new ExcelJS.Workbook();
    wb.creator = "YASH EstiPro";

    // Helper: column number to Excel letter (1=A, 2=B, ... 27=AA)
    const colL = (n) => { let s = ''; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };

    // Styles
    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const subHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
    const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
    const finalFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
    const finalFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
    const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
    const onsiteTravelFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCA5A5" } };
    const onsiteNoTravelFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
    const offshoreFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
    const logisticsFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } };
    const logisticsHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
    const logisticsHeaderFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const totalsFont = { bold: true };
    const moneyFmt = '#,##0.00';
    const intFmt = '#,##0';

    const waveRefs = []; // collect cell refs from each wave sheet for summary

    // ========= DETAIL SHEETS (per wave) =========
    const usedNames = new Set(["Summary"]);
    waves.forEach((wave) => {
      let sheetName = wave.name.replace(/[\\/*?\[\]:]/g, "").substring(0, 28) || "Wave";
      let finalName = sheetName;
      let counter = 2;
      while (usedNames.has(finalName)) { finalName = `${sheetName.substring(0, 26)}_${counter++}`; }
      usedNames.add(finalName);

      const dws = wb.addWorksheet(finalName);
      const sRef = `'${finalName.replace(/'/g, "''")}'`; // safe sheet ref for cross-sheet formulas
      const N = wave.phase_names.length; // number of phase columns
      const A = wave.grid_allocations.length; // number of allocation rows

      // Column layout (1-based)
      const C_SAL = 5;             // E: $/Month
      const C_ON = 6;              // F: Onsite
      const C_TR = 7;              // G: Travel
      const C_PH1 = 8;             // H: first phase
      const C_TMM = C_PH1 + N;     // Total MM
      const C_SC = C_TMM + 1;      // Salary Cost
      const C_OH = C_SC + 1;       // Overhead
      const C_OHP = C_OH + 1;      // OH%
      const C_TC = C_OHP + 1;      // Total Cost
      const C_SP = C_TC + 1;       // Selling Price
      const C_SPMM = C_SP + 1;     // SP/MM
      const C_HR = C_SPMM + 1;     // Hourly
      const C_OVR = C_HR + 1;      // Override $/Hr
      const C_CMT = C_OVR + 1;     // Comments
      const C_GRP = C_CMT + 1;     // Group

      // Row 1: Title
      const titleR = dws.addRow([`${wave.name} — ${wave.duration_months} months${wave.description ? ` — ${wave.description}` : ""}`]);
      titleR.font = { bold: true, size: 13 };

      // Row 2: Parameters (editable in Excel — all formulas reference these)
      const pRow = dws.addRow(["", "Profit Margin:", profitMarginPercentage / 100, "", "Nego Buffer:", negoBufferPercentage / 100]);
      pRow.getCell(2).font = { bold: true }; pRow.getCell(3).numFmt = '0.00%';
      pRow.getCell(5).font = { bold: true }; pRow.getCell(6).numFmt = '0.00%';
      const MRG = "C2"; // profit margin cell ref (decimal)
      const NGO = "F2"; // nego buffer cell ref (decimal)

      // Row 3: empty
      dws.addRow([]);

      // Row 4: Headers
      const headers = ["#", "Skill", "Level", "Location", "$/Month", "Onsite", "Travel",
        ...wave.phase_names, "Total MM", "Salary Cost", "Overhead", "OH%", "Total Cost",
        "Selling Price", "SP/MM", "Hourly", "Ovr $/Hr", "Comments", "Group"];
      const hRow = dws.addRow(headers);
      hRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
      dws.columns = headers.map((h, i) => ({
        width: i === 0 ? 5 : ["Skill", "Location", "Comments"].includes(h) ? 20 : h === "Group" ? 8 : h === "Ovr $/Hr" ? 10 : h.length > 8 ? 15 : 11
      }));

      // Data rows: 5 to 4+A
      const DR1 = 5; // first data row
      const DRN = DR1 + A - 1; // last data row

      wave.grid_allocations.forEach((alloc, idx) => {
        const rn = DR1 + idx;
        const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(alloc);
        const ohCost = baseSalaryCost * (alloc.overhead_percentage / 100);
        const tc = baseSalaryCost + ohCost;
        const sp = tc / (1 - profitMarginPercentage / 100);
        const spmm = totalManMonths > 0 ? sp / totalManMonths : 0;

        const r = dws.addRow([]);
        r.getCell(1).value = idx + 1;
        r.getCell(2).value = alloc.skill_name;
        r.getCell(3).value = alloc.proficiency_level;
        r.getCell(4).value = alloc.base_location_name;
        r.getCell(C_SAL).value = alloc.avg_monthly_salary;
        r.getCell(C_ON).value = alloc.is_onsite ? "ON" : "OFF";
        r.getCell(C_TR).value = alloc.travel_required ? "YES" : "NO";
        wave.phase_names.forEach((_, i) => { r.getCell(C_PH1 + i).value = alloc.phase_allocations[i] || 0; });

        r.getCell(C_OHP).value = alloc.overhead_percentage / 100;
        r.getCell(C_OHP).numFmt = '0%';

        // === FORMULAS ===
        const phR = `${colL(C_PH1)}${rn}:${colL(C_PH1 + N - 1)}${rn}`;
        r.getCell(C_TMM).value  = { formula: `SUM(${phR})`, result: totalManMonths };
        r.getCell(C_SC).value   = { formula: `${colL(C_TMM)}${rn}*${colL(C_SAL)}${rn}`, result: baseSalaryCost };
        r.getCell(C_OH).value   = { formula: `${colL(C_SC)}${rn}*${colL(C_OHP)}${rn}`, result: ohCost };
        r.getCell(C_TC).value   = { formula: `${colL(C_SC)}${rn}+${colL(C_OH)}${rn}`, result: tc };
        const ovrCol = colL(C_OVR);
        const hasOvr = alloc.override_hourly_rate > 0;
        const effectiveSP = hasOvr ? alloc.override_hourly_rate * 176 * totalManMonths : sp;
        const effectiveSPMM = hasOvr ? alloc.override_hourly_rate * 176 : spmm;
        const effectiveHR = hasOvr ? alloc.override_hourly_rate : spmm / 176;
        r.getCell(C_SP).value   = { formula: `IF(AND(ISNUMBER(${ovrCol}${rn}),${ovrCol}${rn}>0),${ovrCol}${rn}*176*${colL(C_TMM)}${rn},${colL(C_TC)}${rn}/(1-${MRG}))`, result: effectiveSP };
        r.getCell(C_SPMM).value = { formula: `IFERROR(${colL(C_SP)}${rn}/${colL(C_TMM)}${rn},0)`, result: effectiveSPMM };
        r.getCell(C_HR).value   = { formula: `IF(AND(ISNUMBER(${ovrCol}${rn}),${ovrCol}${rn}>0),${ovrCol}${rn},${colL(C_SPMM)}${rn}/176)`, result: effectiveHR };
        r.getCell(C_CMT).value  = alloc.comments || "";
        r.getCell(C_GRP).value  = alloc.resource_group_id || "";
        r.getCell(C_OVR).value  = alloc.override_hourly_rate > 0 ? alloc.override_hourly_rate : null;

        // Number formats for money columns
        [C_SAL, C_SC, C_OH, C_TC, C_SP, C_SPMM, C_HR, C_OVR].forEach(c => { r.getCell(c).numFmt = moneyFmt; });
        r.getCell(C_TMM).numFmt = '0.00';

        // Row coloring
        r.eachCell(c => { c.border = thinBorder; });
        if (alloc.is_onsite && alloc.travel_required) r.eachCell(c => { c.fill = onsiteTravelFill; });
        else if (alloc.is_onsite) r.eachCell(c => { c.fill = onsiteNoTravelFill; });
        else r.eachCell(c => { c.fill = offshoreFill; });
      });

      // === TOTALS ROW ===
      dws.addRow([]);
      const TR = dws.rowCount + 1; // totals row number
      const totR = dws.addRow([]);
      totR.getCell(2).value = "TOTALS";
      if (A > 0) {
        wave.phase_names.forEach((_, i) => {
          const c = colL(C_PH1 + i);
          totR.getCell(C_PH1 + i).value = { formula: `SUM(${c}${DR1}:${c}${DRN})`, result: 0 };
        });
        [C_TMM, C_SC, C_OH, C_TC, C_SP].forEach(col => {
          const c = colL(col);
          totR.getCell(col).value = { formula: `SUM(${c}${DR1}:${c}${DRN})`, result: 0 };
          totR.getCell(col).numFmt = moneyFmt;
        });
        totR.getCell(C_TMM).numFmt = '0.00';
      }
      totR.eachCell(c => { c.border = thinBorder; c.fill = subHeaderFill; });
      totR.font = totalsFont;

      // === LOGISTICS SECTION ===
      dws.addRow([]);
      const lgHdrR = dws.addRow([]);
      lgHdrR.getCell(2).value = "LOGISTICS BREAKDOWN";
      lgHdrR.eachCell(c => { c.fill = logisticsHeaderFill; c.font = logisticsHeaderFont; c.border = thinBorder; });

      const lgSubR = dws.addRow([]);
      lgSubR.getCell(2).value = "Item"; lgSubR.getCell(3).value = "Description"; lgSubR.getCell(4).value = "Amount";
      lgSubR.eachCell(c => { c.fill = logisticsFill; c.font = { bold: true }; c.border = thinBorder; });

      const lc = getLogisticsConfig(wave);
      const onCol = colL(C_ON);
      const trCol = colL(C_TR);
      const mmCol = colL(C_TMM);
      // Travel MM = SUMPRODUCT((Travel="YES")*TotalMM)
      const travelMMF = A > 0 ? `SUMPRODUCT((${trCol}${DR1}:${trCol}${DRN}="YES")*(${mmCol}${DR1}:${mmCol}${DRN}))` : "0";
      // Travel count = COUNTIF(Travel,"YES")
      const travelCntF = A > 0 ? `COUNTIF(${trCol}${DR1}:${trCol}${DRN},"YES")` : "0";
      // Onsite MM (for summary cross-refs)
      const onsMMF = A > 0 ? `SUMPRODUCT((${onCol}${DR1}:${onCol}${DRN}="ON")*(${mmCol}${DR1}:${mmCol}${DRN}))` : "0";

      const lgAmtCells = [];
      [
        ["Per-diem", `Travel MM x $${lc.per_diem_daily} x ${lc.per_diem_days}d`, `(${travelMMF})*${lc.per_diem_daily}*${lc.per_diem_days}`],
        ["Accommodation", `Travel MM x $${lc.accommodation_daily} x ${lc.accommodation_days}d`, `(${travelMMF})*${lc.accommodation_daily}*${lc.accommodation_days}`],
        ["Conveyance", `Travel MM x $${lc.local_conveyance_daily} x ${lc.local_conveyance_days}d`, `(${travelMMF})*${lc.local_conveyance_daily}*${lc.local_conveyance_days}`],
        ["Air Fare", `Travel Res x $${lc.flight_cost_per_trip} x ${lc.num_trips} trips`, `(${travelCntF})*${lc.flight_cost_per_trip}*${lc.num_trips}`],
        ["Visa & Medical", `Travel Res x $${lc.visa_medical_per_trip} x ${lc.num_trips} trips`, `(${travelCntF})*${lc.visa_medical_per_trip}*${lc.num_trips}`],
      ].forEach(([item, desc, formula]) => {
        const r = dws.addRow([]);
        r.getCell(2).value = item; r.getCell(3).value = desc;
        r.getCell(4).value = { formula, result: 0 }; r.getCell(4).numFmt = moneyFmt;
        r.eachCell(c => { c.fill = logisticsFill; c.border = thinBorder; });
        lgAmtCells.push(`D${dws.rowCount}`);
      });

      // Contingency
      const contR = dws.addRow([]);
      contR.getCell(2).value = "Contingency"; contR.getCell(3).value = `${lc.contingency_percentage}% of subtotal`;
      contR.getCell(4).value = { formula: `(${lgAmtCells.join("+")})*${lc.contingency_percentage}/100`, result: 0 };
      contR.getCell(4).numFmt = moneyFmt;
      contR.eachCell(c => { c.fill = logisticsFill; c.border = thinBorder; });
      lgAmtCells.push(`D${dws.rowCount}`);

      // Total Logistics
      const lgTotR = dws.addRow([]);
      lgTotR.getCell(2).value = "TOTAL LOGISTICS";
      lgTotR.getCell(4).value = { formula: lgAmtCells.join("+"), result: 0 }; lgTotR.getCell(4).numFmt = moneyFmt;
      lgTotR.eachCell(c => { c.fill = logisticsFill; c.font = totalsFont; c.border = thinBorder; });
      const lgTotCell = `D${dws.rowCount}`;

      // === WAVE SUMMARY ===
      dws.addRow([]);
      const addSumRow = (label, formula, style) => {
        const r = dws.addRow([]);
        r.getCell(2).value = label;
        r.getCell(3).value = { formula, result: 0 }; r.getCell(3).numFmt = moneyFmt;
        if (style) { r.font = style.font || {}; r.eachCell(c => { if (style.fill) c.fill = style.fill; }); }
        return `C${dws.rowCount}`;
      };

      const resSPCell = addSumRow("Resources Selling Price", `${colL(C_SP)}${TR}`, {});
      const waveSPCell = addSumRow("Wave Selling Price (Resources + Logistics)", `${resSPCell}+${lgTotCell}`, { font: totalsFont });
      const negoCell = addSumRow(`Nego Buffer (${negoBufferPercentage}%)`, `${waveSPCell}*${NGO}`, {});
      const finalCell = addSumRow("WAVE FINAL PRICE", `${waveSPCell}+${negoCell}`, { font: totalsFont, fill: greenFill });

      // Hidden helper cells for summary cross-refs: Onsite MM, Offshore MM, Total Cost
      const onsMMCell = addSumRow("Onsite MM", onsMMF, {});
      const offMMCell = addSumRow("Offshore MM", `${colL(C_TMM)}${TR}-${onsMMCell}`, {});
      const costCell = `${colL(C_TC)}${TR}`;

      // Collect refs for summary sheet
      waveRefs.push({
        name: wave.name, sheet: sRef,
        totalMM: `${sRef}!${colL(C_TMM)}${TR}`,
        onsiteMM: `${sRef}!${onsMMCell}`,
        offshoreMM: `${sRef}!${offMMCell}`,
        totalLogistics: `${sRef}!${lgTotCell}`,
        totalCost: `${sRef}!${costCell}`,
        resourcesSP: `${sRef}!${resSPCell}`,
        sellingPrice: `${sRef}!${waveSPCell}`,
        negoBuffer: `${sRef}!${negoCell}`,
        finalPrice: `${sRef}!${finalCell}`,
      });
    });

    // ========= SUMMARY SHEET =========
    const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: "FF0F172A" } } });
    wb.views = [{ activeTab: wb.worksheets.length - 1 }]; // make summary visible first
    // Move summary to first position
    wb.removeWorksheet(ws.id);
    const summaryWs = wb.addWorksheet("Summary");

    summaryWs.columns = [{ width: 30 }, { width: 50 }, { width: 22 }];
    summaryWs.addRow(["YASH Technologies - EstiPro"]).font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
    summaryWs.addRow(["PROJECT ESTIMATE SUMMARY"]).font = { bold: true, size: 12, color: { argb: "FF6B7280" } };
    summaryWs.addRow([]);

    const infoFields = [
      ["Project Number", projectNumber || "Not Saved"],
      ["Version", `v${projectVersion}`],
      ["Status", projectStatus || "Draft"],
      ["Customer Name", selectedCustomer?.name || ""],
      ["Project Name", projectName],
      ["Project Location(s)", projectLocations.map(code => COUNTRIES.find(c => c.code === code)?.name || code).join(", ") || "—"],
      ["Technology", technologyIds.map(id => technologies.find(t => t.id === id)?.name).filter(Boolean).join(", ") || ""],
      ["Project Type", projectTypeIds.map(id => projectTypes.find(t => t.id === id)?.name).filter(Boolean).join(", ") || ""],
      ["Sales Manager", salesManagers.find(m => m.id === salesManagerId)?.name || "—"],
      ["Description", projectDescription],
      ["Profit Margin %", `${profitMarginPercentage}%`],
      ["Nego Buffer %", `${negoBufferPercentage}%`],
    ];
    if (versionNotes) infoFields.push(["Version Notes", versionNotes]);
    infoFields.forEach(([label, val]) => {
      const r = summaryWs.addRow([label, val]);
      r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
    });
    summaryWs.addRow([]);

    // Per-wave summary with cross-sheet formulas
    waveRefs.forEach((ref) => {
      const wHdr = summaryWs.addRow([`WAVE: ${ref.name}`]);
      wHdr.font = { bold: true, size: 12 }; wHdr.eachCell(c => { c.fill = subHeaderFill; });

      const addRefRow = (label, formulaRef, fmt) => {
        const r = summaryWs.addRow([label]);
        r.getCell(2).value = { formula: formulaRef, result: 0 };
        if (fmt) r.getCell(2).numFmt = fmt;
      };

      addRefRow("Total Man-Months", ref.totalMM, '0.00');
      addRefRow("Onsite Man-Months", ref.onsiteMM, '0.00');
      addRefRow("Offshore Man-Months", ref.offshoreMM, '0.00');
      addRefRow("Total Cost to Company", ref.totalCost, moneyFmt);
      addRefRow("Total Logistics", ref.totalLogistics, moneyFmt);
      addRefRow("Resources Selling Price", ref.resourcesSP, moneyFmt);
      addRefRow("Wave Selling Price", ref.sellingPrice, moneyFmt);
      addRefRow("Nego Buffer", ref.negoBuffer, moneyFmt);
      const fpRow = summaryWs.addRow(["Wave Final Price"]);
      fpRow.getCell(2).value = { formula: ref.finalPrice, result: 0 };
      fpRow.getCell(2).numFmt = moneyFmt;
      fpRow.font = { bold: true }; fpRow.eachCell(c => { c.fill = greenFill; });
      summaryWs.addRow([]);
    });

    // Overall totals with formulas
    const oHdr = summaryWs.addRow(["OVERALL PROJECT"]);
    oHdr.font = { bold: true, size: 13 }; oHdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; });

    const addOverallRow = (label, refs, fmt, style) => {
      const r = summaryWs.addRow([label]);
      r.getCell(2).value = { formula: refs.join("+"), result: 0 };
      if (fmt) r.getCell(2).numFmt = fmt;
      if (style) { if (style.font) r.font = style.font; r.eachCell(c => { if (style.fill) c.fill = style.fill; c.border = thinBorder; }); }
    };

    addOverallRow("Total Man-Months", waveRefs.map(r => r.totalMM), '0.00');
    addOverallRow("Total Onsite MM", waveRefs.map(r => r.onsiteMM), '0.00');
    addOverallRow("Total Offshore MM", waveRefs.map(r => r.offshoreMM), '0.00');
    addOverallRow("Total Logistics", waveRefs.map(r => r.totalLogistics), moneyFmt);
    addOverallRow("Total Cost to Company", waveRefs.map(r => r.totalCost), moneyFmt);
    addOverallRow("Total Resources Price", waveRefs.map(r => r.resourcesSP), moneyFmt);
    addOverallRow("Total Selling Price", waveRefs.map(r => r.sellingPrice), moneyFmt);
    addOverallRow("Total Nego Buffer", waveRefs.map(r => r.negoBuffer), moneyFmt);

    const grandRow = summaryWs.addRow(["GRAND TOTAL (Final Price)"]);
    grandRow.getCell(2).value = { formula: waveRefs.map(r => r.finalPrice).join("+"), result: 0 };
    grandRow.getCell(2).numFmt = moneyFmt;
    grandRow.eachCell(c => { c.fill = finalFill; c.font = finalFont; c.border = thinBorder; });

    // === EFFECTIVE PROFIT MARGIN ===
    const overallSummary = calculateOverallSummary(waves);
    if (Math.abs(overallSummary.effectiveProfitMargin - profitMarginPercentage) > 0.01) {
      summaryWs.addRow([]);
      const mrgRow = summaryWs.addRow([
        "EFFECTIVE PROFIT MARGIN",
        `${overallSummary.effectiveProfitMargin.toFixed(1)}%  (Set: ${profitMarginPercentage.toFixed(1)}%)`
      ]);
      mrgRow.getCell(1).font = { bold: true, color: { argb: "FF4F46E5" } };
      mrgRow.getCell(2).font = { bold: true, color: { argb: overallSummary.effectiveProfitMargin >= profitMarginPercentage ? "FF059669" : "FFDC2626" } };
      mrgRow.getCell(1).border = thinBorder;
      mrgRow.getCell(2).border = thinBorder;
    }

    // === COLOR LEGEND ===
    summaryWs.addRow([]);
    summaryWs.addRow([]);
    const legendHdr = summaryWs.addRow(["COLOR LEGEND"]);
    legendHdr.font = { bold: true, size: 12 };
    legendHdr.getCell(1).fill = headerFill;
    legendHdr.getCell(1).font = headerFont;

    const legendItems = [
      { label: "Onsite + Travel", fill: onsiteTravelFill, desc: "Resource is onsite with travel logistics applied" },
      { label: "Onsite (No Travel)", fill: onsiteNoTravelFill, desc: "Resource is onsite without travel logistics" },
      { label: "Offshore", fill: offshoreFill, desc: "Offshore resource (no travel logistics)" },
      { label: "Logistics Section", fill: logisticsFill, desc: "Logistics cost breakdown area" },
    ];
    legendItems.forEach(({ label, fill, desc }) => {
      const r = summaryWs.addRow([label, desc]);
      r.getCell(1).fill = fill;
      r.getCell(1).font = { bold: true };
      r.getCell(1).border = thinBorder;
      r.getCell(2).border = thinBorder;
    });

    const buffer = await wb.xlsx.writeBuffer();
    const fileName = `${projectNumber || projectName || "Project"}_v${projectVersion}_Estimate.xlsx`;
    // Upload to backend, get download ID, then trigger download via hidden iframe
    const uploadRes = await fetch(`${API}/download-file`, {
      method: 'POST',
      headers: {
        'X-Filename': fileName,
        'X-Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      body: buffer,
    });
    const { download_id } = await uploadRes.json();
    // Use hidden iframe to trigger download — bypasses popup blockers
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
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);

      const getCellVal = (cell) => {
        if (!cell || !cell.value) return "";
        if (typeof cell.value === "object" && cell.value.result !== undefined) return cell.value.result;
        if (typeof cell.value === "object" && cell.value.text) return cell.value.text;
        return cell.value;
      };

      const parsedWaves = [];
      const missingSkills = new Set();
      const missingLocations = new Set();

      wb.eachSheet((ws) => {
        const name = ws.name;
        if (name.toLowerCase() === "summary") return;

        // Find the header row (look for row containing "#" and "Skill")
        let headerRowNum = 1;
        for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
          const row = ws.getRow(r);
          let hasSkill = false;
          row.eachCell((cell) => {
            const v = (cell.value || "").toString().toLowerCase();
            if (v === "skill" || v === "#") hasSkill = true;
          });
          if (hasSkill) { headerRowNum = r; break; }
        }

        const headerRow = ws.getRow(headerRowNum);
        const headers = {};
        headerRow.eachCell((cell, colNum) => {
          const val = (cell.value || "").toString().toLowerCase().replace(/[^a-z0-9$/]/g, "");
          headers[colNum] = val;
        });

        // Find column positions (returns 0 if not found — safe for getCell guards)
        const findCol = (...keywords) => {
          for (const [col, h] of Object.entries(headers)) {
            if (keywords.some(k => h.includes(k))) return parseInt(col);
          }
          return 0;
        };
        const safeCell = (row, col) => col > 0 ? getCellVal(row.getCell(col)) : "";

        const colSkill = findCol("skill");
        const colLevel = findCol("level");
        const colLocation = findCol("location");
        const colSalary = findCol("$/month", "$month");
        const colOnsite = findCol("onsite");
        const colTravel = findCol("travel");
        const colGrp = findCol("grp");
        const colOvr = findCol("ovr$/hr", "ovr$hr", "ovr");
        const colComments = findCol("comment");

        // Skip sheets without recognizable headers
        if (!colSkill || !colLevel) return;

        // Find phase columns: between Travel and "Total MM" 
        // Phase months are right after Travel column and before Total MM
        const colTMM = findCol("totalmm");
        const phaseStart = (colTravel || colOnsite || colSalary || 0) + 1;
        const phaseEnd = colTMM > 0 ? colTMM : phaseStart;

        // Read phase names from header
        const phaseNames = [];
        for (let c = phaseStart; c < phaseEnd; c++) {
          const val = getCellVal(headerRow.getCell(c));
          if (val && !val.toString().toLowerCase().includes("total")) phaseNames.push(val.toString());
        }

        // Parse data rows (start after header)
        const allocations = [];
        for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const skillName = safeCell(row, colSkill)?.toString().trim();
          if (!skillName) continue;
          if (skillName.toLowerCase().includes("sub-total") || skillName.toLowerCase().includes("logistics") || skillName.toLowerCase().includes("total")) break;

          const level = safeCell(row, colLevel)?.toString().trim() || "Mid";
          const location = safeCell(row, colLocation)?.toString().trim() || "";
          const salary = parseFloat(safeCell(row, colSalary)) || 0;
          const onsite = (safeCell(row, colOnsite) || "").toString().toUpperCase();
          const travel = (safeCell(row, colTravel) || "").toString().toUpperCase();
          const grp = safeCell(row, colGrp)?.toString() || "";
          const ovr = parseFloat(safeCell(row, colOvr)) || null;
          const comments = safeCell(row, colComments)?.toString() || "";

          // Phase allocations
          const phases = {};
          for (let c = phaseStart; c < phaseStart + phaseNames.length; c++) {
            const val = parseFloat(getCellVal(row.getCell(c))) || 0;
            phases[c - phaseStart] = val;
          }

          // Match against master data
          const matchedSkill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
          const matchedLocation = locations.find(l => l.name.toLowerCase() === location.toLowerCase());

          if (!matchedSkill && skillName) missingSkills.add(skillName);
          if (!matchedLocation && location) missingLocations.add(location);

          // Find matching rate
          const matchedRate = rates.find(r =>
            r.skill_name?.toLowerCase() === skillName.toLowerCase() &&
            r.proficiency_level?.toLowerCase() === level.toLowerCase() &&
            r.location_name?.toLowerCase() === location.toLowerCase()
          );
          const ohPct = matchedRate?.overhead_percentage || 15;

          allocations.push({
            id: `imp_${Date.now()}_${r}`,
            skill_id: matchedSkill?.id || "",
            skill_name: skillName,
            proficiency_level: level,
            base_location_id: matchedLocation?.id || "",
            base_location_name: location,
            avg_monthly_salary: salary,
            overhead_percentage: ohPct,
            is_onsite: onsite === "ON" || onsite === "YES",
            travel_required: travel === "YES",
            resource_group_id: grp,
            override_hourly_rate: ovr,
            phase_allocations: phases,
            comments,
          });
        }

        if (allocations.length > 0) {
          // Parse logistics section from the sheet
          const parsedLogistics = {};
          for (let r = headerRowNum + allocations.length + 2; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const cellB = (getCellVal(row.getCell(2)) || "").toString().trim().toLowerCase();
            const cellC = (getCellVal(row.getCell(3)) || "").toString().trim();
            if (!cellB) continue;
            // Parse description patterns like "Travel MM x $50 x 30d" or "Travel Res x $450 x 6 trips"
            const dailyMatch = cellC.match(/\$(\d+(?:\.\d+)?)\s*x\s*(\d+)\s*d/i);
            const tripsMatch = cellC.match(/\$(\d+(?:\.\d+)?)\s*x\s*(\d+)\s*trip/i);
            const pctMatch = cellC.match(/^(\d+(?:\.\d+)?)%/);
            if (cellB.includes("per-diem") && dailyMatch) {
              parsedLogistics.per_diem_daily = parseFloat(dailyMatch[1]);
              parsedLogistics.per_diem_days = parseInt(dailyMatch[2]);
            } else if (cellB.includes("accommodation") && dailyMatch) {
              parsedLogistics.accommodation_daily = parseFloat(dailyMatch[1]);
              parsedLogistics.accommodation_days = parseInt(dailyMatch[2]);
            } else if (cellB.includes("conveyance") && dailyMatch) {
              parsedLogistics.local_conveyance_daily = parseFloat(dailyMatch[1]);
              parsedLogistics.local_conveyance_days = parseInt(dailyMatch[2]);
            } else if (cellB.includes("air fare") && tripsMatch) {
              parsedLogistics.flight_cost_per_trip = parseFloat(tripsMatch[1]);
              parsedLogistics.num_trips = parseInt(tripsMatch[2]);
            } else if ((cellB.includes("visa") || cellB.includes("medical")) && tripsMatch) {
              parsedLogistics.visa_medical_per_trip = parseFloat(tripsMatch[1]);
            } else if (cellB.includes("contingency") && pctMatch) {
              parsedLogistics.contingency_percentage = parseFloat(pctMatch[1]);
            }
          }

          parsedWaves.push({
            sheetName: name,
            phaseNames,
            allocations,
            logistics: Object.keys(parsedLogistics).length > 0 ? parsedLogistics : null,
          });
        }
      });

      setSmartImportData({
        waves: parsedWaves,
        missingSkills: [...missingSkills],
        missingLocations: [...missingLocations],
        totalResources: parsedWaves.reduce((s, w) => s + w.allocations.length, 0),
      });
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
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleNewProject} variant="outline" size="sm" data-testid="new-project-button">
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
          {projectId && (
            <>
              <Button onClick={handleCloneProject} variant="outline" size="sm" className="border-[#8B5CF6] text-[#8B5CF6]" data-testid="clone-project-button">
                <Copy className="w-4 h-4 mr-1" />
                Clone
              </Button>
              <Button onClick={() => setSaveAsNewVersionDialog(true)} variant="outline" size="sm" className="border-[#F59E0B] text-[#F59E0B]" data-testid="new-version-button">
                <History className="w-4 h-4 mr-1" />
                New Version
              </Button>
              {projectStatus === "draft" && !isReadOnly && (
                <Button 
                  onClick={openSubmitForReviewDialog} 
                  variant="outline" 
                  size="sm"
                  className="border-purple-600 text-purple-600"
                  data-testid="submit-review-button"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Submit for Review
                </Button>
              )}
              {projectStatus === "in_review" && isDesignatedApprover && (
                <>
                  <Button 
                    onClick={() => setApproverSaveDialogOpen(true)}
                    size="sm"
                    className="bg-[#10B981] hover:bg-[#10B981]/90 text-white"
                    data-testid="approver-save-button"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save & Approve
                  </Button>
                  <Button 
                    onClick={() => { setApprovalAction("reject"); setApprovalActionDialog(true); }}
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-600"
                    data-testid="reject-button"
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
              {canMarkObsolete && (
                <Button 
                  onClick={() => setObsoleteConfirmOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-red-400 text-red-400 hover:bg-red-50"
                  data-testid="mark-obsolete-button"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Mark Obsolete
                </Button>
              )}
            </>
          )}
          <Button onClick={() => setSummaryDialogOpen(true)} variant="outline" size="sm" className="border-[#0EA5E9] text-[#0EA5E9]" data-testid="view-summary-button">
            View Summary
          </Button>
          <Button onClick={() => setQuickEstimateOpen(true)} variant="outline" size="sm" className="border-amber-500 text-amber-600" data-testid="quick-estimate-button">
            <Zap className="w-4 h-4 mr-1" />
            Quick Estimate
          </Button>
          <Button onClick={handleExportToExcel} variant="outline" size="sm" className="border-[#10B981] text-[#10B981]" data-testid="export-excel-button">
            <FileDown className="w-4 h-4 mr-1" />
            Export Excel
          </Button>
          {!isReadOnly && (
          <div className="relative">
            <input
              type="file"
              accept=".xlsx"
              onChange={handleSmartImportFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              data-testid="smart-import-input"
            />
            <Button variant="outline" size="sm" className="border-purple-600 text-purple-600 hover:bg-purple-50 pointer-events-none" disabled={smartImportLoading}>
              <Upload className="w-4 h-4 mr-1" />
              {smartImportLoading ? "Parsing..." : "Smart Import"}
            </Button>
          </div>
          )}
          {!isReadOnly && projectStatus !== "in_review" && (
          <Button onClick={handleSaveProject} size="sm" className="bg-[#10B981] hover:bg-[#10B981]/90 text-white" data-testid="save-project-button">
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          )}
        </div>
      </div>

      {/* Submit for Review Dialog */}
      <Dialog open={submitForReviewDialog} onOpenChange={setSubmitForReviewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Submit for Review</DialogTitle>
            <DialogDescription>Select an approver to submit this project for review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approver-select">Select Approver *</Label>
              {approversList.length === 0 ? (
                <p className="text-sm text-amber-600 py-2">
                  No approvers available. Please contact an administrator to assign approver roles.
                </p>
              ) : (
                <Select
                  value={approverEmail}
                  onValueChange={setApproverEmail}
                >
                  <SelectTrigger className="w-full h-12" data-testid="approver-select">
                    <SelectValue placeholder="Select an approver..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {approversList.map((approver) => (
                      <SelectItem key={approver.id} value={approver.email} className="py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{approver.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              approver.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {approver.role}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">{approver.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-xs text-gray-500">
              The selected approver will receive a notification and can approve, reject, or request changes to this estimate.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSubmitForReviewDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmitForReview} 
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!approverEmail || approversList.length === 0}
              data-testid="confirm-submit-review"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Action Dialog */}
      <Dialog open={approvalActionDialog} onOpenChange={setApprovalActionDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {approvalAction === "approve" ? "Approve Project" : "Reject Project"}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === "approve" 
                ? "Add any comments for the approval."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="approval-comments">Comments</Label>
              <Textarea
                id="approval-comments"
                placeholder={approvalAction === "approve" ? "Optional approval comments..." : "Reason for rejection..."}
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
                data-testid="approval-comments-input"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setApprovalActionDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleApprovalAction}
              className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
              data-testid="confirm-approval-action"
            >
              {approvalAction === "approve" ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Approve</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" /> Reject</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Header */}
      <Card className={`border ${isReadOnly ? 'border-amber-300 bg-amber-50/30' : 'border-[#E2E8F0]'} shadow-sm`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-[#0F172A]">Project Information</CardTitle>
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
      </Card>

      {/* Overall Summary Cards */}
      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Man-Months</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0F172A]" data-testid="total-mm">
              {overall.totalMM.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-mm">
              {overall.onsiteMM.toFixed(1)}
            </p>
            {overall.onsiteMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Avg: ${(overall.onsiteMM > 0 
                  ? (overall.onsiteSellingPrice / overall.onsiteMM).toFixed(0) 
                  : 0).toLocaleString()}/MM
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-mm">
              {overall.offshoreMM.toFixed(1)}
            </p>
            {overall.offshoreMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Avg: ${(overall.offshoreMM > 0 
                  ? (overall.offshoreSellingPrice / overall.offshoreMM).toFixed(0) 
                  : 0).toLocaleString()}/MM
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-400 shadow-sm bg-slate-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Resources Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-slate-600" data-testid="total-resources-price">
              ${overall.totalRowsSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">sum of all rows</p>
          </CardContent>
        </Card>
        <Card className="border border-[#8B5CF6] shadow-sm bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Logistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#8B5CF6]" data-testid="total-logistics">
              ${overall.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onsite/Offshore Price Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-[#F59E0B] shadow-sm bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite Avg. $/MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-avg-price">
              ${overall.onsiteMM > 0 
                ? (overall.onsiteSellingPrice / overall.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#F59E0B] shadow-sm bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-selling-price">
              ${overall.onsiteSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">sum of ON rows</p>
          </CardContent>
        </Card>
        <Card className="border border-[#0EA5E9] shadow-sm bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore Avg. $/MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-avg-price">
              ${overall.offshoreMM > 0 
                ? (overall.offshoreSellingPrice / overall.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#0EA5E9] shadow-sm bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-selling-price">
              ${overall.offshoreSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">sum of OFF rows</p>
          </CardContent>
        </Card>
      </div>

      {/* CTC Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="ctc-analytics-section">
        <Card className="border border-orange-400 shadow-sm bg-orange-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite CTC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-orange-600" data-testid="onsite-ctc">
              ${overall.onsiteCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">salary + overhead</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-400 shadow-sm bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Onsite Avg CTC/MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-orange-600" data-testid="onsite-avg-ctc">
              ${overall.onsiteMM > 0 
                ? (overall.onsiteCTC / overall.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-teal-400 shadow-sm bg-teal-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore CTC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-teal-600" data-testid="offshore-ctc">
              ${overall.offshoreCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">salary + overhead</p>
          </CardContent>
        </Card>
        <Card className="border border-teal-400 shadow-sm bg-teal-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Offshore Avg CTC/MM</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-teal-600" data-testid="offshore-avg-ctc">
              ${overall.offshoreMM > 0 
                ? (overall.offshoreCTC / overall.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-400 shadow-sm bg-gray-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total CTC</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-gray-700" data-testid="total-ctc">
              ${overall.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">all resources</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Selling Price & Final Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-[#10B981] shadow-sm bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Selling Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#10B981]" data-testid="selling-price">
              ${overall.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">resources + logistics</p>
          </CardContent>
        </Card>
        <Card className="border border-blue-500 shadow-sm bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Nego Buffer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-blue-600" data-testid="total-nego-buffer">
              ${overall.negoBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-600 shadow-md bg-emerald-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700">Final Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-emerald-700" data-testid="final-price">
              ${overall.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-600 mt-1">selling price + nego buffer</p>
          </CardContent>
        </Card>
      </div>

      {/* Effective Profit Margin indicator */}
      {Math.abs(overall.effectiveProfitMargin - profitMarginPercentage) > 0.01 && (
        <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-lg px-5 py-3" data-testid="effective-margin-overall">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-indigo-700">Set Margin:</span>
            <span className="font-mono font-bold text-lg text-indigo-600">{profitMarginPercentage.toFixed(1)}%</span>
          </div>
          <span className="text-indigo-300 text-lg">&rarr;</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-indigo-700">Effective Margin (with overrides):</span>
            <span className={`font-mono font-bold text-xl ${overall.effectiveProfitMargin >= profitMarginPercentage ? 'text-green-600' : 'text-red-600'}`} data-testid="effective-margin-value">
              {overall.effectiveProfitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

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
                      <div></div>
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
                      <div className="overflow-x-auto border border-[#E2E8F0] rounded">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                              <th className="text-center p-2 font-semibold text-xs w-8" style={{ position: 'sticky', left: 0, zIndex: 10, background: '#F8FAFC' }}></th>
                              <th className="text-center p-2 font-semibold text-xs w-8" style={{ position: 'sticky', left: 36, zIndex: 10, background: '#F8FAFC' }}>#</th>
                              <th className="text-left p-3 font-semibold text-sm" style={{ position: 'sticky', left: 72, zIndex: 10, background: '#F8FAFC', minWidth: 148 }}>Skill</th>
                              <th className="text-left p-3 font-semibold text-sm" style={{ position: 'sticky', left: 220, zIndex: 10, background: '#F8FAFC', minWidth: 128 }}>Level</th>
                              <th className="text-left p-3 font-semibold text-sm" style={{ position: 'sticky', left: 348, zIndex: 10, background: '#F8FAFC', minWidth: 140 }}>Location</th>
                              <th className="text-right p-3 font-semibold text-sm" style={{ position: 'sticky', left: 488, zIndex: 10, background: '#F8FAFC', minWidth: 100, boxShadow: '2px 0 5px rgba(0,0,0,0.08)' }}>$/Month</th>
                              <th className="text-center p-3 font-semibold text-sm">Onsite</th>
                              <th className="text-center p-3 font-semibold text-sm">Travel</th>
                              <th className="text-center p-2 font-semibold text-xs w-12">Grp</th>
                              {wave.phase_names.map((phaseName, index) => (
                                <th key={index} className="text-center p-2 bg-[#E0F2FE]">
                                  <Input
                                    value={phaseName}
                                    onChange={(e) => handleUpdatePhaseName(wave.id, index, e.target.value)}
                                    className="w-24 text-center font-semibold text-xs border-0 bg-transparent focus:bg-white"
                                    data-testid={`phase-name-${index}`}
                                    disabled={isReadOnly}
                                  />
                                </th>
                              ))}
                              <th className="text-right p-3 font-semibold text-sm">Total MM</th>
                              <th className="text-right p-3 font-semibold text-sm">Salary Cost</th>
                              <th className="text-right p-3 font-semibold text-sm">Overhead</th>
                              <th className="text-right p-3 font-semibold text-sm bg-gray-100">Total Cost</th>
                              <th className="text-right p-3 font-semibold text-sm bg-green-50">Selling Price</th>
                              <th className="text-right p-3 font-semibold text-sm bg-blue-50">SP/MM</th>
                              <th className="text-right p-3 font-semibold text-sm bg-blue-50">Hourly</th>
                              <th className="text-right p-2 font-semibold text-xs bg-purple-50 w-20">Ovr $/Hr</th>
                              <th className="text-left p-3 font-semibold text-sm">Comments</th>
                              <th className="text-center p-3 font-semibold text-sm">Actions</th>
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
                                  <td className="p-1 text-center" style={{ position: 'sticky', left: 0, zIndex: 2, background: stickyBg }} {...dragProvided.dragHandleProps}>
                                    {!isReadOnly && <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab mx-auto" />}
                                  </td>
                                  <td className="p-2 text-center text-xs text-gray-400 font-mono" style={{ position: 'sticky', left: 36, zIndex: 2, background: stickyBg }}>{rowIdx + 1}</td>
                                  <td className="p-2" style={{ position: 'sticky', left: 72, zIndex: 2, background: stickyBg, minWidth: 148 }}>
                                    {isReadOnly ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="font-medium text-sm cursor-help">{allocation.skill_name}</span>
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
                                              triggerClassName="w-[130px]"
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
                                  <td className="p-2" style={{ position: 'sticky', left: 220, zIndex: 2, background: stickyBg, minWidth: 128 }}>
                                    {isReadOnly ? (
                                      <span className="text-sm">{allocation.proficiency_level}</span>
                                    ) : (
                                      <SearchableSelect
                                        value={allocation.proficiency_level}
                                        onValueChange={(value) => handleGridFieldChange(wave.id, allocation.id, 'proficiency_level', value)}
                                        options={PROFICIENCY_LEVELS.map(l => ({ value: l, label: l }))}
                                        placeholder="Level..."
                                        searchPlaceholder="Search levels..."
                                        triggerClassName="w-[110px]"
                                      />
                                    )}
                                  </td>
                                  <td className="p-2" style={{ position: 'sticky', left: 348, zIndex: 2, background: stickyBg, minWidth: 140 }}>
                                    {isReadOnly ? (
                                      <span className="text-sm">{allocation.base_location_name}</span>
                                    ) : (
                                      <SearchableSelect
                                        value={allocation.base_location_id}
                                        onValueChange={(value) => handleGridFieldChange(wave.id, allocation.id, 'base_location_id', value)}
                                        options={locations.map(l => ({ value: l.id, label: l.name }))}
                                        placeholder="Location..."
                                        searchPlaceholder="Search locations..."
                                        triggerClassName="w-[120px]"
                                      />
                                    )}
                                  </td>
                                  <td className="p-3 text-right" style={{ position: 'sticky', left: 488, zIndex: 2, background: stickyBg, minWidth: 100, boxShadow: '2px 0 5px rgba(0,0,0,0.08)' }}>
                                    <Input
                                      type="number"
                                      className="w-24 text-right font-mono text-sm"
                                      value={allocation.avg_monthly_salary}
                                      onChange={(e) => handleSalaryChange(wave.id, allocation.id, e.target.value)}
                                      data-testid={`salary-${allocation.id}`}
                                      disabled={isReadOnly}
                                    />
                                  </td>
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => !isReadOnly && handleToggleOnsite(wave.id, allocation.id)}
                                      disabled={isReadOnly}
                                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                        allocation.is_onsite 
                                          ? "bg-amber-500 text-white" 
                                          : "bg-gray-200 text-gray-600"
                                      } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                                      data-testid={`onsite-toggle-${allocation.id}`}
                                    >
                                      {allocation.is_onsite ? "ON" : "OFF"}
                                    </button>
                                  </td>
                                  <td className="p-3 text-center">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          onClick={() => !isReadOnly && handleToggleTravelRequired(wave.id, allocation.id)}
                                          disabled={isReadOnly}
                                          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
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
                                  <td className="p-1 text-center">
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
      <Dialog open={editLogisticsDialogOpen} onOpenChange={setEditLogisticsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">Wave Logistics Configuration</DialogTitle>
            <DialogDescription>Configure logistics rates for this wave. Costs calculated based on total onsite MM and resource count.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Per-Diem ($/day)</Label>
                <Input type="number" value={waveLogistics.per_diem_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_daily: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Per-Diem Days/Month</Label>
                <Input type="number" value={waveLogistics.per_diem_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end">
                <p className="text-xs text-gray-500 pb-2">Onsite MM × ${waveLogistics.per_diem_daily} × {waveLogistics.per_diem_days}</p>
              </div>
              
              <div>
                <Label>Accommodation ($/day)</Label>
                <Input type="number" value={waveLogistics.accommodation_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_daily: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Accommodation Days/Month</Label>
                <Input type="number" value={waveLogistics.accommodation_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end">
                <p className="text-xs text-gray-500 pb-2">Onsite MM × ${waveLogistics.accommodation_daily} × {waveLogistics.accommodation_days}</p>
              </div>
              
              <div>
                <Label>Conveyance ($/day)</Label>
                <Input type="number" value={waveLogistics.local_conveyance_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_daily: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Conveyance Days/Month</Label>
                <Input type="number" value={waveLogistics.local_conveyance_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end">
                <p className="text-xs text-gray-500 pb-2">Onsite MM × ${waveLogistics.local_conveyance_daily} × {waveLogistics.local_conveyance_days}</p>
              </div>
              
              <div>
                <Label>Air Fare ($/trip)</Label>
                <Input type="number" value={waveLogistics.flight_cost_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, flight_cost_per_trip: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Number of Trips</Label>
                <Input type="number" value={waveLogistics.num_trips} onChange={(e) => setWaveLogistics({ ...waveLogistics, num_trips: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-end">
                <p className="text-xs text-gray-500 pb-2">Resources × ${waveLogistics.flight_cost_per_trip} × {waveLogistics.num_trips}</p>
              </div>
              
              <div>
                <Label>Visa & Medical ($/trip)</Label>
                <Input type="number" value={waveLogistics.visa_medical_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, visa_medical_per_trip: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Contingency %</Label>
                <Input type="number" value={waveLogistics.contingency_percentage} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_percentage: parseFloat(e.target.value) || 0 })} />
              </div>
              <div></div>
            </div>
            <Button onClick={handleSaveWaveLogistics} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90">
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Update Logistics Dialog */}
      <Dialog open={batchLogisticsDialogOpen} onOpenChange={setBatchLogisticsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">Batch Update Logistics</DialogTitle>
            <DialogDescription>Update logistics configuration for all onsite resources in this wave</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm">
              <p className="font-semibold">This will update the wave logistics config.</p>
              <p className="text-gray-600">Logistics are calculated at wave level based on total onsite MM and resource count.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Per-Diem ($/day)</Label>
                <Input type="number" value={waveLogistics.per_diem_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_daily: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Per-Diem Days/Month</Label>
                <Input type="number" value={waveLogistics.per_diem_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Accommodation ($/day)</Label>
                <Input type="number" value={waveLogistics.accommodation_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_daily: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Accommodation Days/Month</Label>
                <Input type="number" value={waveLogistics.accommodation_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Conveyance ($/day)</Label>
                <Input type="number" value={waveLogistics.local_conveyance_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_daily: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Conveyance Days/Month</Label>
                <Input type="number" value={waveLogistics.local_conveyance_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_days: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Air Fare ($/trip)</Label>
                <Input type="number" value={waveLogistics.flight_cost_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, flight_cost_per_trip: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Number of Trips</Label>
                <Input type="number" value={waveLogistics.num_trips} onChange={(e) => setWaveLogistics({ ...waveLogistics, num_trips: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Visa & Medical ($/trip)</Label>
                <Input type="number" value={waveLogistics.visa_medical_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, visa_medical_per_trip: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Contingency %</Label>
                <Input type="number" value={waveLogistics.contingency_percentage} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_percentage: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <Button onClick={handleBatchUpdateLogistics} className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Apply to Wave
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save as New Version Dialog */}
      <Dialog open={saveAsNewVersionDialog} onOpenChange={setSaveAsNewVersionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">Save as New Version</DialogTitle>
            <DialogDescription>Create a new version of {projectNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Version Notes (optional)</Label>
              <Textarea
                placeholder="Describe changes in this version..."
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm">
              <p className="font-semibold">This will:</p>
              <ul className="list-disc list-inside text-gray-700 mt-1">
                <li>Create version {projectVersion + 1} of {projectNumber}</li>
                <li>Mark current version as historical</li>
                <li>Keep all previous versions accessible</li>
              </ul>
            </div>
            <Button onClick={handleSaveAsNewVersion} className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white">
              <History className="w-4 h-4 mr-2" />
              Create Version {projectVersion + 1}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approver Save Dialog */}
      <Dialog open={approverSaveDialogOpen} onOpenChange={setApproverSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">
              {hasProjectChanges() ? "Save & Approve" : "Approve Project"}
            </DialogTitle>
            <DialogDescription>
              {hasProjectChanges()
                ? `Changes detected. A new version (v${projectVersion + 1}) of ${projectNumber} will be created.`
                : `No changes detected. ${projectNumber} v${projectVersion} will be approved as-is.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {hasProjectChanges() && (
              <div>
                <Label>Version Notes *</Label>
                <Textarea
                  placeholder="Describe changes made during review..."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  rows={3}
                  data-testid="approver-version-notes"
                />
              </div>
            )}
            {!hasProjectChanges() && (
              <div>
                <Label>Approval Comments (optional)</Label>
                <Textarea
                  placeholder="Add optional comments..."
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  rows={2}
                  data-testid="approver-approval-comments"
                />
              </div>
            )}
            {hasProjectChanges() ? (
              <>
                <div className="bg-amber-50 p-3 rounded text-sm border border-amber-200">
                  <p className="font-semibold text-amber-800">Choose how to save:</p>
                  <ul className="list-disc list-inside text-gray-700 mt-1 space-y-1">
                    <li><strong>Keep In Review</strong> — Save changes as v{projectVersion + 1}, keep status "In Review"</li>
                    <li><strong>Approve & Save</strong> — Save changes as v{projectVersion + 1} and set status to "Approved"</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => handleApproverSave(false)} variant="outline" className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50" data-testid="approver-save-review">
                    <Clock className="w-4 h-4 mr-2" />
                    Keep In Review
                  </Button>
                  <Button onClick={() => handleApproverSave(true)} className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90 text-white" data-testid="approver-save-approve">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve & Save
                  </Button>
                </div>
              </>
            ) : (
              <Button onClick={() => handleApproverSave(true)} className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white" data-testid="approver-approve-direct">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#0F172A]">
              Project Estimate Summary
              {projectNumber && <span className="ml-2 text-base font-normal text-gray-500">{projectNumber} v{projectVersion}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {/* Project Details */}
            <Card className="bg-[#F8FAFC]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-[#0F172A]">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="font-semibold">{customers.find(c => c.id === customerId)?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Project</p>
                  <p className="font-semibold">{projectName || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Location(s)</p>
                  <p className="font-semibold">{projectLocations.map(code => COUNTRIES.find(c => c.code === code)?.name || code).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Technology(s)</p>
                  <p className="font-semibold">{technologyIds.map(id => technologies.find(t => t.id === id)?.name).filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Project Type(s)</p>
                  <p className="font-semibold">{projectTypeIds.map(id => projectTypes.find(t => t.id === id)?.name).filter(Boolean).join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Sales Manager</p>
                  <p className="font-semibold">{salesManagers.find(m => m.id === salesManagerId)?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Profit Margin</p>
                  <p className="font-semibold">{profitMarginPercentage}%</p>
                </div>
              </CardContent>
            </Card>

            {/* Wave Summaries */}
            {waves.map(wave => {
              const summary = calculateWaveSummary(wave);
              const onsiteAvgPrice = summary.onsiteMM > 0 
                ? (summary.onsiteSalaryCost / summary.onsiteMM) * (1 + profitMarginPercentage/100) 
                : 0;
              const offshoreAvgPrice = summary.offshoreMM > 0 
                ? (summary.offshoreSalaryCost / summary.offshoreMM) * (1 + profitMarginPercentage/100) 
                : 0;
              return (
                <Card key={wave.id} className="border-2 border-[#0EA5E9]">
                  <CardHeader className="pb-3 bg-[#E0F2FE]">
                    <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center justify-between">
                      <span>{wave.name} - {wave.duration_months} months ({wave.grid_allocations.length} resources)</span>
                      <Badge className="bg-green-100 text-green-700">Profit: {profitMarginPercentage}%</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Total MM</p>
                        <p className="text-2xl font-bold font-mono">{summary.totalMM.toFixed(1)}</p>
                      </div>
                      <div className="text-center p-3 bg-amber-50 rounded">
                        <p className="text-sm text-gray-600">Onsite MM</p>
                        <p className="text-2xl font-bold font-mono text-[#F59E0B]">{summary.onsiteMM.toFixed(1)}</p>
                        <p className="text-xs text-gray-500 mt-1">Avg: ${onsiteAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/MM</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p className="text-sm text-gray-600">Offshore MM</p>
                        <p className="text-2xl font-bold font-mono text-[#0EA5E9]">{summary.offshoreMM.toFixed(1)}</p>
                        <p className="text-xs text-gray-500 mt-1">Avg: ${offshoreAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/MM</p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded">
                        <p className="text-sm text-gray-600">Logistics</p>
                        <p className="text-2xl font-bold font-mono">${summary.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="col-span-2 text-center p-4 bg-gray-100 rounded">
                        <p className="text-sm text-gray-600">Cost to Company</p>
                        <p className="text-3xl font-bold font-mono">${summary.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded">
                        <p className="text-sm text-gray-600">Wave Selling Price</p>
                        <p className="text-3xl font-bold font-mono text-[#10B981]">${summary.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded border border-blue-200">
                        <p className="text-sm text-gray-600">Nego Buffer ({summary.negoBufferPercentage}%)</p>
                        <p className="text-2xl font-bold font-mono text-blue-600">${summary.negoBufferAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="col-span-2 text-center p-4 bg-emerald-100 rounded border border-emerald-400">
                        <p className="text-sm text-emerald-700 font-semibold">Final Price (incl. buffer)</p>
                        <p className="text-3xl font-bold font-mono text-emerald-700">${summary.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Overall Summary */}
            <Card className="border-4 border-[#10B981]">
              <CardHeader className="pb-3 bg-green-50">
                <CardTitle className="text-2xl font-bold text-[#0F172A]">Overall Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Total Man-Months</p>
                    <p className="text-3xl font-bold font-mono">{overall.totalMM.toFixed(1)}</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Total Onsite MM</p>
                    <p className="text-3xl font-bold font-mono text-[#F59E0B]">{overall.onsiteMM.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Avg: ${overall.onsiteMM > 0 
                        ? ((overall.onsiteSalaryCost / overall.onsiteMM) * (1 + profitMarginPercentage/100)).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                        : 0}/MM
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Total Offshore MM</p>
                    <p className="text-3xl font-bold font-mono text-[#0EA5E9]">{overall.offshoreMM.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Avg: ${overall.offshoreMM > 0 
                        ? ((overall.offshoreSalaryCost / overall.offshoreMM) * (1 + profitMarginPercentage/100)).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                        : 0}/MM
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Avg. Selling Price/MM</p>
                    <p className="text-3xl font-bold font-mono text-[#8B5CF6]">
                      ${overall.totalMM > 0 
                        ? (overall.sellingPrice / overall.totalMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                        : 0}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Total Logistics</p>
                    <p className="text-2xl font-bold font-mono text-[#8B5CF6]">${overall.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="text-center p-4 bg-amber-100 rounded">
                    <p className="text-sm text-gray-600 mb-2">Onsite Selling Price</p>
                    <p className="text-2xl font-bold font-mono text-[#F59E0B]">${overall.onsiteSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">incl. logistics</p>
                  </div>
                  <div className="text-center p-4 bg-blue-100 rounded">
                    <p className="text-sm text-gray-600 mb-2">Offshore Selling Price</p>
                    <p className="text-2xl font-bold font-mono text-[#0EA5E9]">${overall.offshoreSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-100 rounded">
                    <p className="text-sm text-gray-600 mb-2">Cost to Company</p>
                    <p className="text-2xl font-bold font-mono">${overall.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="text-center p-4 bg-green-100 rounded">
                    <p className="text-sm text-gray-600 mb-2">Profit ({profitMarginPercentage}%)</p>
                    <p className="text-2xl font-bold font-mono text-[#10B981]">
                      ${((overall.onsiteSellingPrice + overall.offshoreSellingPrice) - overall.totalCostToCompany).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">Total Nego Buffer</p>
                    <p className="text-2xl font-bold font-mono text-blue-600">
                      ${overall.negoBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="col-span-2 text-center p-4 bg-green-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">Total Selling Price</p>
                    <p className="text-3xl font-bold font-mono text-[#10B981]">
                      ${overall.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-4 text-center p-6 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg border-2 border-emerald-600">
                    <p className="text-lg text-emerald-800 mb-3 font-semibold">GRAND TOTAL (Final Price incl. Nego Buffer)</p>
                    <p className="text-5xl font-extrabold font-mono text-emerald-700">
                      ${overall.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Smart Import Preview Dialog */}
      <Dialog open={smartImportDialog} onOpenChange={(open) => { if (!open) { setSmartImportDialog(false); setSmartImportData(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
              <Upload className="w-5 h-5 text-purple-600" />
              Smart Import Preview
            </DialogTitle>
            <DialogDescription>Review the parsed data before importing into this project.</DialogDescription>
          </DialogHeader>
          {smartImportData && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{smartImportData.waves.length}</p>
                  <p className="text-xs text-gray-500">Waves Detected</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{smartImportData.totalResources}</p>
                  <p className="text-xs text-gray-500">Total Resources</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr><th className="p-2 text-left">Wave</th><th className="p-2 text-center">Months</th><th className="p-2 text-center">Resources</th></tr>
                  </thead>
                  <tbody>
                    {smartImportData.waves.map((w, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2 font-medium">{w.sheetName}</td>
                        <td className="p-2 text-center">{w.phaseNames.length}</td>
                        <td className="p-2 text-center">{w.allocations.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(smartImportData.missingSkills.length > 0 || smartImportData.missingLocations.length > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-amber-700 mb-1">New master data will be auto-created:</p>
                  {smartImportData.missingSkills.length > 0 && (
                    <p className="text-xs text-amber-600">Skills: {smartImportData.missingSkills.join(", ")}</p>
                  )}
                  {smartImportData.missingLocations.length > 0 && (
                    <p className="text-xs text-amber-600 mt-1">Locations: {smartImportData.missingLocations.join(", ")}</p>
                  )}
                </div>
              )}

              {smartImportData.waves.some(w => w.logistics) && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-purple-700 mb-1">Logistics data detected</p>
                  <p className="text-xs text-purple-600">Logistics configuration will be imported from the Excel file.</p>
                </div>
              )}

              <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-500">
                <strong>Replace current:</strong> Overwrites all waves locally (save to persist).<br/>
                {projectId && <><strong>Import as New Version:</strong> Creates a new version and suspends the current one.</>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSmartImportDialog(false); setSmartImportData(null); }} data-testid="cancel-import-btn">
              Cancel
            </Button>
            {projectId && (
              <Button onClick={() => confirmSmartImport(true)} disabled={smartImportLoading} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="import-new-version-btn">
                {smartImportLoading ? "Creating..." : "Import as New Version"}
              </Button>
            )}
            <Button onClick={() => confirmSmartImport(false)} disabled={smartImportLoading} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="confirm-import-btn">
              {smartImportLoading ? "Importing..." : "Replace Current"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Mark Obsolete Confirmation Dialog */}
      <Dialog open={obsoleteConfirmOpen} onOpenChange={setObsoleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
              <XCircle className="w-5 h-5" />
              Mark as Obsolete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this version as <strong>Obsolete</strong>? This cannot be undone. The project will become read-only.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setObsoleteConfirmOpen(false)} data-testid="cancel-obsolete-btn">Cancel</Button>
            <Button onClick={handleMarkObsolete} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-obsolete-btn">
              Yes, Mark Obsolete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Estimate Calculator Dialog */}
      <Dialog open={quickEstimateOpen} onOpenChange={setQuickEstimateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Estimate Calculator
            </DialogTitle>
            <DialogDescription>Get a ballpark estimate in seconds — enter basic parameters below</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-4">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Onsite</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Onsite Man-Months</Label>
                  <Input type="number" min="0" value={quickEstimate.onsiteMM}
                    onChange={e => setQuickEstimate({ ...quickEstimate, onsiteMM: parseFloat(e.target.value) || 0 })}
                    data-testid="qe-onsite-mm" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Onsite Avg Salary ($/month)</Label>
                  <Input type="number" min="0" value={quickEstimate.onsiteAvgSalary}
                    onChange={e => setQuickEstimate({ ...quickEstimate, onsiteAvgSalary: parseFloat(e.target.value) || 0 })}
                    data-testid="qe-onsite-salary" />
                </div>
              </div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mt-3">Offshore</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Offshore Man-Months</Label>
                  <Input type="number" min="0" value={quickEstimate.offshoreMM}
                    onChange={e => setQuickEstimate({ ...quickEstimate, offshoreMM: parseFloat(e.target.value) || 0 })}
                    data-testid="qe-offshore-mm" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Offshore Avg Salary ($/month)</Label>
                  <Input type="number" min="0" value={quickEstimate.offshoreAvgSalary}
                    onChange={e => setQuickEstimate({ ...quickEstimate, offshoreAvgSalary: parseFloat(e.target.value) || 0 })}
                    data-testid="qe-offshore-salary" />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3">Margins</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Overhead %</Label>
                  <Input type="number" min="0" max="100" value={quickEstimate.overheadPercentage}
                    onChange={e => setQuickEstimate({ ...quickEstimate, overheadPercentage: parseFloat(e.target.value) || 0 })}
                    data-testid="qe-overhead" />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Profit Margin %</Label>
                  <Input type="number" min="0" max="100" value={quickEstimate.profitMargin}
                    onChange={e => setQuickEstimate({ ...quickEstimate, profitMargin: parseFloat(e.target.value) || 0 })}
                    data-testid="qe-profit-margin" />
                </div>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-lg p-4 border space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estimate Breakdown</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-gray-500">Total Man-Months</span>
                <span className="font-mono font-semibold text-right">{quickEstimateResult.totalMM}</span>
                <span className="text-amber-600">Onsite Cost ({quickEstimateResult.onsiteMM} MM x ${quickEstimate.onsiteAvgSalary.toLocaleString()})</span>
                <span className="font-mono text-right text-amber-600">${quickEstimateResult.onsiteCost.toLocaleString()}</span>
                <span className="text-blue-600">Offshore Cost ({quickEstimateResult.offshoreMM} MM x ${quickEstimate.offshoreAvgSalary.toLocaleString()})</span>
                <span className="font-mono text-right text-blue-600">${quickEstimateResult.offshoreCost.toLocaleString()}</span>
                <span className="text-gray-500">Base Salary Cost</span>
                <span className="font-mono text-right">${quickEstimateResult.baseCost.toLocaleString()}</span>
                <span className="text-gray-500">Overhead ({quickEstimate.overheadPercentage}%)</span>
                <span className="font-mono text-right">${quickEstimateResult.overheadCost.toLocaleString()}</span>
                <span className="text-gray-600 font-medium">Total Cost</span>
                <span className="font-mono font-semibold text-right">${quickEstimateResult.totalCost.toLocaleString()}</span>
              </div>
              <hr className="my-2" />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-gray-500">Profit Margin ({quickEstimate.profitMargin}%)</span>
                <span className="font-mono text-right">${(quickEstimateResult.sellingPrice - quickEstimateResult.totalCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-gray-600 font-medium">Selling Price</span>
                <span className="font-mono font-bold text-right text-[#10B981]">${quickEstimateResult.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-gray-500">SP per Man-Month</span>
                <span className="font-mono text-right text-blue-600">${quickEstimateResult.spPerMM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span className="text-gray-500">Hourly Rate</span>
                <span className="font-mono text-right text-blue-600">${quickEstimateResult.hourly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                {negoBufferPercentage > 0 && (
                  <>
                    <span className="text-gray-500">Nego Buffer ({negoBufferPercentage}%)</span>
                    <span className="font-mono text-right">${quickEstimateResult.negoBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </>
                )}
              </div>
              <div className="bg-emerald-600 text-white rounded-lg p-3 mt-3 text-center">
                <p className="text-xs uppercase tracking-wider opacity-80">Estimated Final Price</p>
                <p className="text-3xl font-extrabold font-mono mt-1">${quickEstimateResult.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </TooltipProvider>
  );
};

export default ProjectEstimator;
