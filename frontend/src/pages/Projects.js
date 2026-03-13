import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Trash2, Edit2, Copy, FileText, GitCompare, 
  ChevronDown, ChevronRight, Clock, CheckCircle, XCircle, FileEdit,
  Bookmark, BookmarkCheck, Plus, Filter, Search, X, User, Calendar,
  Eye, Archive, ArchiveRestore, FolderKanban, History, Download
} from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { calculateOverallSummary } from "@/utils/estimatorCalcs";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileEdit },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  superseded: { label: "Superseded", color: "bg-gray-100 text-gray-500", icon: History },
  suspended: { label: "Suspended", color: "bg-orange-100 text-orange-700", icon: Clock },
  obsolete: { label: "Obsolete", color: "bg-red-50 text-red-400", icon: XCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [archivedProjects, setArchivedProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [allVersions, setAllVersions] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [loadingVersions, setLoadingVersions] = useState({});
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [createFromTemplateDialogOpen, setCreateFromTemplateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Filters state
  const [filters, setFilters] = useState({
    customerName: "",
    description: "",
    createdBy: "",
    dateFrom: "",
    dateTo: "",
    salesManager: "",
    projectType: "",
    technology: "",
  });

  useEffect(() => {
    fetchProjects();
    fetchArchivedProjects();
    fetchTemplates();
    fetchCustomers();
    fetchUsers();
    fetchTechnologies();
    fetchProjectTypes();
    fetchSalesManagers();
  }, []);

  // Handle URL query params from dashboard drill-down
  useEffect(() => {
    const filterType = searchParams.get("filter_type");
    const filterValue = searchParams.get("filter_value");
    if (filterType && filterValue) {
      setShowFilters(true);
      if (filterType === "technology") setFilters(prev => ({ ...prev, technology: filterValue }));
      else if (filterType === "project_type") setFilters(prev => ({ ...prev, projectType: filterValue }));
      else if (filterType === "location") setFilters(prev => ({ ...prev, description: filterValue }));
      else if (filterType === "sales_manager") setFilters(prev => ({ ...prev, salesManager: filterValue }));
      else if (filterType === "customer") setFilters(prev => ({ ...prev, customerName: filterValue }));
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [projects, filters]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      toast.error("Failed to fetch projects");
    }
  };

  const fetchArchivedProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/projects/archived`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArchivedProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch archived projects");
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error("Failed to fetch templates");
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`);
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers");
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users");
    }
  };

  const fetchTechnologies = async () => {
    try { setTechnologies((await axios.get(`${API}/technologies`)).data); } catch {}
  };
  const fetchProjectTypes = async () => {
    try { setProjectTypes((await axios.get(`${API}/project-types`)).data); } catch {}
  };
  const fetchSalesManagers = async () => {
    try { setSalesManagers((await axios.get(`${API}/sales-managers`)).data); } catch {}
  };

  const applyFilters = () => {
    let result = [...projects];
    
    if (filters.customerName) {
      result = result.filter(p => 
        p.customer_name?.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }
    
    if (filters.description) {
      result = result.filter(p => 
        p.description?.toLowerCase().includes(filters.description.toLowerCase()) ||
        p.name?.toLowerCase().includes(filters.description.toLowerCase()) ||
        p.project_locations?.some(l => l.toLowerCase().includes(filters.description.toLowerCase()))
      );
    }
    
    if (filters.createdBy) {
      result = result.filter(p => p.created_by_id === filters.createdBy);
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      result = result.filter(p => new Date(p.created_at) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59);
      result = result.filter(p => new Date(p.created_at) <= toDate);
    }
    
    if (filters.salesManager) {
      result = result.filter(p => 
        p.sales_manager_name?.toLowerCase().includes(filters.salesManager.toLowerCase())
      );
    }
    
    if (filters.projectType) {
      result = result.filter(p => 
        p.project_type_names?.some(t => t.toLowerCase().includes(filters.projectType.toLowerCase()))
      );
    }
    
    if (filters.technology) {
      result = result.filter(p => 
        p.technology_names?.some(t => t.toLowerCase().includes(filters.technology.toLowerCase()))
      );
    }
    
    setFilteredProjects(result);
  };

  const clearFilters = () => {
    setFilters({
      customerName: "",
      description: "",
      createdBy: "",
      dateFrom: "",
      dateTo: "",
      salesManager: "",
      projectType: "",
      technology: "",
    });
  };

  const fetchVersions = async (projectId, projectNumber) => {
    if (allVersions[projectNumber]) {
      return;
    }
    
    setLoadingVersions(prev => ({ ...prev, [projectNumber]: true }));
    try {
      const response = await axios.get(`${API}/projects/${projectId}/versions`);
      setAllVersions(prev => ({ ...prev, [projectNumber]: response.data }));
    } catch (error) {
      toast.error("Failed to fetch versions");
    } finally {
      setLoadingVersions(prev => ({ ...prev, [projectNumber]: false }));
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!selectedProject || !templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    try {
      await axios.post(`${API}/projects/${selectedProject.id}/save-as-template?template_name=${encodeURIComponent(templateName)}`);
      toast.success("Project saved as template");
      setTemplateDialogOpen(false);
      setTemplateName("");
      setSelectedProject(null);
      fetchProjects();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save as template");
    }
  };

  const handleRemoveTemplate = async (projectId) => {
    try {
      await axios.post(`${API}/projects/${projectId}/remove-template`);
      toast.success("Template removed");
      fetchProjects();
      fetchTemplates();
    } catch (error) {
      toast.error("Failed to remove template");
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/projects/create-from-template/${selectedTemplateId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Project created from template");
      setCreateFromTemplateDialogOpen(false);
      setSelectedTemplateId("");
      navigate(`/estimator?edit=${response.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create from template");
    }
  };

  const openTemplateDialog = (project) => {
    setSelectedProject(project);
    setTemplateName(project.name);
    setTemplateDialogOpen(true);
  };

  const toggleExpanded = async (project) => {
    const projectNumber = project.project_number;
    const isExpanded = expandedProjects[projectNumber];
    
    if (!isExpanded) {
      await fetchVersions(project.id, projectNumber);
    }
    
    setExpandedProjects(prev => ({
      ...prev,
      [projectNumber]: !prev[projectNumber]
    }));
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    
    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Project deleted successfully");
      fetchProjects();
      fetchArchivedProjects();
      setAllVersions({});
    } catch (error) {
      toast.error("Failed to delete project");
    }
  };

  const handleArchiveProject = async (id) => {
    try {
      await axios.post(`${API}/projects/${id}/archive`);
      toast.success("Project archived successfully");
      fetchProjects();
      fetchArchivedProjects();
    } catch (error) {
      toast.error("Failed to archive project");
    }
  };

  const handleUnarchiveProject = async (id) => {
    try {
      await axios.post(`${API}/projects/${id}/unarchive`);
      toast.success("Project restored successfully");
      fetchProjects();
      fetchArchivedProjects();
    } catch (error) {
      toast.error("Failed to restore project");
    }
  };

  const handleCloneProject = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/projects/${id}/clone`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Project cloned as ${response.data.project_number}`);
      fetchProjects();
    } catch (error) {
      toast.error("Failed to clone project");
    }
  };

  // Check if current user can edit the project
  const canEditProject = (project) => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (project.created_by_id === currentUser.id) return true;
    return false;
  };

  const calculateProjectValue = (project) => {
    if (!project.waves || project.waves.length === 0) {
      return { baseCost: 0, withOverhead: 0, sellingPrice: 0, negoBuffer: 0, finalPrice: 0, totalMM: 0, resourceCount: 0 };
    }
    const summary = calculateOverallSummary(project.waves, project.profit_margin_percentage ?? 35, project.nego_buffer_percentage ?? 0);
    const resourceCount = project.waves.reduce((sum, w) => sum + (w.grid_allocations?.length || 0), 0);
    return { 
      baseCost: summary.onsiteSalaryCost + summary.offshoreSalaryCost, 
      withOverhead: summary.totalRowsSellingPrice, 
      sellingPrice: summary.sellingPrice, 
      negoBuffer: summary.negoBuffer, 
      finalPrice: summary.finalPrice, 
      totalMM: summary.totalMM, 
      resourceCount 
    };
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const renderProjectRow = (project, isSubVersion = false) => {
    const { sellingPrice, negoBuffer, finalPrice, totalMM, resourceCount } = calculateProjectValue(project);
    const hasVersions = project.version > 1 || (allVersions[project.project_number]?.length > 1);
    const isExpanded = expandedProjects[project.project_number];
    const isLoading = loadingVersions[project.project_number];
    const canEdit = canEditProject(project);
    
    return (
      <TableRow 
        key={project.id} 
        className={isSubVersion ? "bg-gray-50/50" : ""}
        data-testid={`project-row-${project.id}`}
      >
        <TableCell className="font-mono font-medium">
          <div className="flex items-center gap-2">
            {!isSubVersion && hasVersions && (
              <button
                onClick={() => toggleExpanded(project)}
                className="p-1 hover:bg-gray-100 rounded"
                disabled={isLoading}
                data-testid={`expand-versions-${project.id}`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
            {isSubVersion && <span className="w-6" />}
            <span className={isSubVersion ? "text-gray-500" : ""}>
              {project.project_number || "—"}
            </span>
          </div>
        </TableCell>
        <TableCell className={`font-medium max-w-xs truncate ${isSubVersion ? "text-gray-600" : ""}`}>
          <div className="flex items-center gap-2">
            {project.name}
            {project.is_template && (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                <Bookmark className="w-3 h-3 mr-1" />
                Template
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell>{project.customer_name || "—"}</TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className={`font-mono ${!project.is_latest_version ? "bg-gray-100" : ""}`}>
            v{project.version || 1}
            {project.is_latest_version && <span className="ml-1 text-green-600">●</span>}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          {getStatusBadge(project.status)}
        </TableCell>
        <TableCell className="text-center">{resourceCount}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">{totalMM.toFixed(1)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums font-semibold text-[#10B981]">
          ${sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums text-blue-600">
          ${negoBuffer.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums font-bold text-emerald-700">
          ${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </TableCell>
        <TableCell className="text-xs text-gray-500">
          <div className="flex flex-col">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {project.created_by_name || "—"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(project.created_at)}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/summary`)}
              className="text-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
              title="View Summary"
              data-testid={`summary-project-${project.id}`}
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/compare`)}
              className="text-indigo-600 hover:text-indigo-600 hover:bg-indigo-600/10"
              title="Compare Versions"
              data-testid={`compare-project-${project.id}`}
            >
              <GitCompare className="w-4 h-4" />
            </Button>
            {canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/estimator?edit=${project.id}`)}
                className="text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                title="Edit"
                data-testid={`edit-project-${project.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/estimator?view=${project.id}`)}
                className="text-gray-500 hover:text-gray-600 hover:bg-gray-100"
                title="View Only"
                data-testid={`view-project-${project.id}`}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCloneProject(project.id)}
              className="text-[#F59E0B] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10"
              title="Clone"
              data-testid={`clone-project-${project.id}`}
            >
              <Copy className="w-4 h-4" />
            </Button>
            {canEdit && (
              <>
                {project.is_template ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTemplate(project.id)}
                    className="text-emerald-600 hover:text-emerald-600 hover:bg-emerald-600/10"
                    title="Remove Template"
                    data-testid={`remove-template-${project.id}`}
                  >
                    <BookmarkCheck className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openTemplateDialog(project)}
                    className="text-cyan-600 hover:text-cyan-600 hover:bg-cyan-600/10"
                    title="Save as Template"
                    data-testid={`save-template-${project.id}`}
                  >
                    <Bookmark className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchiveProject(project.id)}
                  className="text-orange-600 hover:text-orange-600 hover:bg-orange-600/10"
                  title="Archive"
                  data-testid={`archive-project-${project.id}`}
                >
                  <Archive className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                  title="Delete"
                  data-testid={`delete-project-${project.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Render archived project row
  const renderArchivedProjectRow = (project) => {
    const { sellingPrice, negoBuffer, finalPrice, totalMM, resourceCount } = calculateProjectValue(project);
    
    return (
      <TableRow key={project.id} className="bg-gray-50" data-testid={`archived-row-${project.id}`}>
        <TableCell className="font-mono font-medium">{project.project_number || "—"}</TableCell>
        <TableCell className="font-medium max-w-xs truncate">{project.name}</TableCell>
        <TableCell>{project.customer_name || "—"}</TableCell>
        <TableCell className="text-center">{getStatusBadge(project.status)}</TableCell>
        <TableCell className="text-center">{resourceCount}</TableCell>
        <TableCell className="text-right font-mono tabular-nums">{totalMM.toFixed(1)}</TableCell>
        <TableCell className="text-right font-mono tabular-nums font-semibold text-gray-500">
          ${sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums text-blue-600">
          ${negoBuffer.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </TableCell>
        <TableCell className="text-right font-mono tabular-nums font-bold text-emerald-700">
          ${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </TableCell>
        <TableCell className="text-xs text-gray-500">{formatDate(project.archived_at)}</TableCell>
        <TableCell className="text-right">
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/projects/${project.id}/summary`)}
              className="text-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
              title="View Summary"
            >
              <FileText className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnarchiveProject(project.id)}
              className="text-green-600 hover:text-green-600 hover:bg-green-600/10"
              title="Restore"
              data-testid={`unarchive-project-${project.id}`}
            >
              <ArchiveRestore className="w-4 h-4" />
            </Button>
            {canEditProject(project) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteProject(project.id)}
                className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                title="Delete Permanently"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const handleExportProjectList = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      // Fetch ALL projects (including all versions) for the export
      const res = await axios.get(`${API}/projects?latest_only=false`, { headers });
      const allProjects = res.data;
      // Group by project_number
      const grouped = {};
      allProjects.forEach(p => {
        const pn = p.project_number || p.id;
        if (!grouped[pn]) grouped[pn] = [];
        grouped[pn].push(p);
      });
      // Sort versions within each group
      Object.values(grouped).forEach(versions => versions.sort((a, b) => (a.version || 1) - (b.version || 1)));

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Projects List");
      const headerRow = ws.addRow([
        "Project #", "Version", "Project Name", "Customer", "Status",
        "Technologies", "Sub Technologies", "Project Types", "Sales Manager",
        "CRM ID", "Locations", "Profit Margin %", "Nego Buffer %",
        "Created By", "Created Date", "Updated Date", "Approver", "Description"
      ]);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0EA5E9" } }; c.alignment = { horizontal: "center" }; });

      Object.values(grouped).forEach(versions => {
        versions.forEach(p => {
          ws.addRow([
            p.project_number || "", p.version || 1, p.name || "",
            p.customer_name || "", (p.status || "").toUpperCase(),
            (p.technology_names || []).join(", "), (p.sub_technology_names || []).join(", "),
            (p.project_type_names || []).join(", "), p.sales_manager_name || "",
            p.crm_id || "", (p.project_location_names || []).join(", "),
            p.profit_margin_percentage || 0, p.nego_buffer_percentage || 0,
            p.created_by_name || "", p.created_at ? new Date(p.created_at).toLocaleDateString() : "",
            p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "",
            p.approver_email || "", p.description || ""
          ]);
        });
      });

      // Auto-fit columns
      ws.columns.forEach(col => { col.width = 18; });
      ws.getColumn(1).width = 12;
      ws.getColumn(2).width = 8;
      ws.getColumn(3).width = 30;

      const buffer = await wb.xlsx.writeBuffer();
      const fileName = `YASH_EstPro_Projects_List_${new Date().toISOString().slice(0,10)}.xlsx`;
      const uploadRes = await fetch(`${API}/download-file`, {
        method: 'POST',
        headers: { 'X-Filename': fileName, 'X-Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: buffer,
      });
      const { download_id } = await uploadRes.json();
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `${API}/download-file/${download_id}`;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 30000);
      toast.success("Projects list exported successfully");
    } catch (err) {
      toast.error("Export failed: " + (err.message || "Unknown error"));
    }
  };


  return (
    <div data-testid="projects">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img src="/yash-logo-new.png" alt="YASH" className="h-12 object-contain" />
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Saved Projects</h1>
            <p className="text-base text-gray-600 mt-2">View and manage your project estimates</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExportProjectList}
            data-testid="export-projects-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => setCreateFromTemplateDialogOpen(true)}
            disabled={templates.length === 0}
            data-testid="create-from-template-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            From Template
          </Button>
          <Button
            onClick={() => navigate("/estimator")}
            className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90"
            data-testid="new-project-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6 border border-[#E2E8F0]">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Customer Name</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search customer..."
                    value={filters.customerName}
                    onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                    className="pl-9"
                    data-testid="filter-customer-name"
                  />
                </div>
              </div>
              <div>
                <Label>Project Name/Description</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search description..."
                    value={filters.description}
                    onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                    className="pl-9"
                    data-testid="filter-description"
                  />
                </div>
              </div>
              <div>
                <Label>Created By</Label>
                <Select 
                  value={filters.createdBy || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, createdBy: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-created-by">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  data-testid="filter-date-from"
                />
              </div>
              <div>
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  data-testid="filter-date-to"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Sales Manager</Label>
                <Select 
                  value={filters.salesManager || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, salesManager: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-sales-manager">
                    <SelectValue placeholder="All Sales Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Managers</SelectItem>
                    {salesManagers.map(sm => (
                      <SelectItem key={sm.id} value={sm.name}>{sm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Project Type</Label>
                <Select 
                  value={filters.projectType || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, projectType: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-project-type">
                    <SelectValue placeholder="All Project Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Project Types</SelectItem>
                    {projectTypes.map(pt => (
                      <SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Technology</Label>
                <Select 
                  value={filters.technology || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, technology: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-technology">
                    <SelectValue placeholder="All Technologies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Technologies</SelectItem>
                    {technologies.map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters} data-testid="clear-filters">
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4" />
            Active Projects ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Archived ({archivedProjects.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card className="border border-[#E2E8F0] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold text-[#0F172A]">
                Projects List {filteredProjects.length !== projects.length && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({filteredProjects.length} of {projects.length})
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-1 inline-block"></span>
                  Latest Version
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {projects.length === 0 
                      ? "No projects saved yet. Create an estimate in the Estimator page."
                      : "No projects match your filter criteria."
                    }
                  </p>
                  {projects.length === 0 && (
                    <Button className="mt-4 bg-[#0EA5E9]" onClick={() => navigate("/estimator")}>
                      Create New Project
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project #</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-center">Version</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Resources</TableHead>
                      <TableHead className="text-right">Man-Months</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Nego Buffer</TableHead>
                      <TableHead className="text-right">Final Price</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => {
                      const isExpanded = expandedProjects[project.project_number];
                      const versions = allVersions[project.project_number] || [];
                      const otherVersions = versions.filter(v => v.id !== project.id);
                      
                      return (
                        <React.Fragment key={project.id}>
                          {renderProjectRow(project)}
                          {isExpanded && otherVersions.map((version) => (
                            <React.Fragment key={version.id}>
                              {renderProjectRow(version, true)}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived">
          <Card className="border border-[#E2E8F0] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-[#0F172A]">
                Archived Projects ({archivedProjects.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {archivedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No archived projects</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Archive projects from the Active tab to move them here
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project #</TableHead>
                      <TableHead>Project Name</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Resources</TableHead>
                      <TableHead className="text-right">Man-Months</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Nego Buffer</TableHead>
                      <TableHead className="text-right">Final Price</TableHead>
                      <TableHead>Archived</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedProjects.map((project) => renderArchivedProjectRow(project))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                data-testid="template-name-input"
              />
            </div>
            <p className="text-sm text-gray-500">
              This will save the project structure (waves, resources, logistics config) as a reusable template.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveAsTemplate} data-testid="confirm-save-template">Save Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create from Template Dialog */}
      <Dialog open={createFromTemplateDialogOpen} onOpenChange={setCreateFromTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create from Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger data-testid="template-select">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name} ({template.waves?.length || 0} waves)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-500">
              A new project will be created with the template's waves, resources, and configuration.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateFromTemplateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateFromTemplate} data-testid="confirm-create-from-template">Create Project</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Projects;
