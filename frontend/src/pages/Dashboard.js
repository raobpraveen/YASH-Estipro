import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FolderKanban, TrendingUp, DollarSign, Users, 
  FileCheck, FileClock, FileEdit,
  ArrowRight, Filter, X,
  Cpu, MapPin, Briefcase, UserCircle, Trophy, Award,
  ArrowUpRight, ArrowDownRight, Minus, GitCompare
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { COUNTRIES } from "@/utils/constants";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const STATUS_COLORS = {
  draft: "#6B7280",
  in_review: "#F59E0B", 
  approved: "#10B981",
  rejected: "#EF4444"
};

// Custom tooltip for KPI charts showing project numbers
const KpiTooltip = ({ active, payload, formatCurrency }) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
      <p className="font-bold text-sm text-[#0F172A] mb-1">{data.name}</p>
      <p className="text-sm text-gray-600">Value: <span className="font-mono font-bold text-[#10B981]">{formatCurrency(data.value)}</span></p>
      <p className="text-sm text-gray-600">Projects: <span className="font-mono font-bold">{data.count}</span></p>
      {data.project_numbers?.length > 0 && (
        <div className="mt-2 border-t pt-2">
          <p className="text-xs text-gray-500 mb-1">Project Numbers:</p>
          <div className="flex flex-wrap gap-1">
            {data.project_numbers.slice(0, 8).map(pn => (
              <span key={pn} className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{pn}</span>
            ))}
            {data.project_numbers.length > 8 && (
              <span className="text-xs text-gray-400">+{data.project_numbers.length - 8} more</span>
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-blue-500 mt-2 italic">Click bar to view projects</p>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [salesManagers, setSalesManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    customerId: "",
    selectedProjectTypeIds: [],
    selectedLocationCodes: [],
    selectedSalesManagerIds: [],
  });
  const [comparison, setComparison] = useState({
    p1From: "", p1To: "", p2From: "", p2To: ""
  });

  useEffect(() => {
    fetchDashboardData();
    fetchCustomers();
    fetchProjectTypes();
    fetchSalesManagers();
  }, []);

  const fetchCustomers = async () => {
    try { setCustomers((await axios.get(`${API}/customers`)).data); } catch {}
  };
  const fetchProjectTypes = async () => {
    try { setProjectTypes((await axios.get(`${API}/project-types`)).data); } catch {}
  };
  const fetchSalesManagers = async () => {
    try { setSalesManagers((await axios.get(`${API}/sales-managers`)).data); } catch {}
  };

  const fetchDashboardData = async () => {
    try {
      let url = `${API}/dashboard/analytics`;
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters.dateTo) params.append("date_to", filters.dateTo);
      if (filters.customerId) params.append("customer_id", filters.customerId);
      if (filters.selectedProjectTypeIds.length > 0) params.append("project_type_ids", filters.selectedProjectTypeIds.join(","));
      if (filters.selectedLocationCodes.length > 0) params.append("location_codes", filters.selectedLocationCodes.join(","));
      if (filters.selectedSalesManagerIds.length > 0) params.append("sales_manager_ids", filters.selectedSalesManagerIds.join(","));
      if (params.toString()) url += `?${params.toString()}`;
      setAnalytics((await axios.get(url)).data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async () => {
    if (!comparison.p1From || !comparison.p1To || !comparison.p2From || !comparison.p2To) return;
    setComparisonLoading(true);
    try {
      const res = await axios.get(`${API}/dashboard/compare`, {
        params: { period1_from: comparison.p1From, period1_to: comparison.p1To, period2_from: comparison.p2From, period2_to: comparison.p2To }
      });
      setComparisonData(res.data);
    } catch (error) {
      console.error("Failed to fetch comparison:", error);
    } finally {
      setComparisonLoading(false);
    }
  };

  const applyFilters = () => { setLoading(true); fetchDashboardData(); };
  const clearFilters = () => {
    setFilters({ dateFrom: "", dateTo: "", customerId: "", selectedProjectTypeIds: [], selectedLocationCodes: [], selectedSalesManagerIds: [] });
    setLoading(true);
    setTimeout(() => fetchDashboardData(), 100);
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${Math.round(value)}`;
  };

  const toggleFilter = (key, value) => {
    setFilters(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  // Navigate to projects list with a filter type and value
  const navigateToProjects = (filterType, filterValue) => {
    navigate(`/projects?filter_type=${encodeURIComponent(filterType)}&filter_value=${encodeURIComponent(filterValue)}`);
  };

  // Handle bar click for KPI charts
  const handleBarClick = (data, filterType) => {
    if (data?.name) navigateToProjects(filterType, data.name);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5E9]"></div>
      </div>
    );
  }

  const statusData = analytics ? [
    { name: "Draft", value: analytics.projects_by_status?.draft || 0, color: STATUS_COLORS.draft },
    { name: "In Review", value: analytics.projects_by_status?.in_review || 0, color: STATUS_COLORS.in_review },
    { name: "Approved", value: analytics.projects_by_status?.approved || 0, color: STATUS_COLORS.approved },
    { name: "Rejected", value: analytics.projects_by_status?.rejected || 0, color: STATUS_COLORS.rejected },
  ].filter(item => item.value > 0) : [];

  const vbs = analytics?.value_by_status || {};
  const activeFilterCount = [
    filters.dateFrom, filters.dateTo, filters.customerId,
    ...filters.selectedProjectTypeIds, ...filters.selectedLocationCodes, ...filters.selectedSalesManagerIds
  ].filter(Boolean).length;

  const DeltaIndicator = ({ value, suffix = "%" }) => {
    if (value > 0) return <span className="text-green-600 flex items-center gap-1 text-sm font-medium"><ArrowUpRight className="w-4 h-4" />+{value}{suffix}</span>;
    if (value < 0) return <span className="text-red-500 flex items-center gap-1 text-sm font-medium"><ArrowDownRight className="w-4 h-4" />{value}{suffix}</span>;
    return <span className="text-gray-400 flex items-center gap-1 text-sm"><Minus className="w-4 h-4" />0{suffix}</span>;
  };

  return (
    <div data-testid="dashboard" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/yash-logo-new.png" alt="YASH" className="h-12 object-contain" />
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Estimations Overview</h1>
            <p className="text-base text-gray-600 mt-2">Project Estimations Analyzer</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowComparison(!showComparison)} className={showComparison ? "bg-purple-50 border-purple-300" : ""} data-testid="toggle-comparison-button">
            <GitCompare className="w-4 h-4 mr-2" />Compare Periods
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={showFilters ? "bg-cyan-50 border-cyan-300" : ""} data-testid="toggle-filters-button">
            <Filter className="w-4 h-4 mr-2" />Filters
            {activeFilterCount > 0 && <Badge className="ml-2 bg-[#0EA5E9] text-white text-xs">{activeFilterCount}</Badge>}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="border border-cyan-200 bg-cyan-50/30">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label>Date From</Label>
                <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} data-testid="filter-date-from" />
              </div>
              <div>
                <Label>Date To</Label>
                <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} data-testid="filter-date-to" />
              </div>
              <div>
                <Label>Customer</Label>
                <Select value={filters.customerId || "all"} onValueChange={(v) => setFilters({ ...filters, customerId: v === "all" ? "" : v })}>
                  <SelectTrigger data-testid="filter-customer"><SelectValue placeholder="All Customers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={applyFilters} className="bg-[#0EA5E9]" data-testid="apply-filters">Apply</Button>
                <Button variant="outline" onClick={clearFilters} data-testid="clear-filters"><X className="w-4 h-4 mr-1" />Clear</Button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Project Type(s)</Label>
              <div className="flex flex-wrap gap-2" data-testid="filter-project-types">
                {projectTypes.map(pt => (
                  <button key={pt.id} onClick={() => toggleFilter("selectedProjectTypeIds", pt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.selectedProjectTypeIds.includes(pt.id) ? "bg-[#0EA5E9] text-white border-[#0EA5E9]" : "bg-white text-gray-700 border-gray-300 hover:border-[#0EA5E9]"}`}>{pt.name}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Project Location(s)</Label>
              <div className="flex flex-wrap gap-2" data-testid="filter-locations">
                {COUNTRIES.slice(0, 20).map(c => (
                  <button key={c.code} onClick={() => toggleFilter("selectedLocationCodes", c.code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.selectedLocationCodes.includes(c.code) ? "bg-[#10B981] text-white border-[#10B981]" : "bg-white text-gray-700 border-gray-300 hover:border-[#10B981]"}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Sales Manager(s)</Label>
              <div className="flex flex-wrap gap-2" data-testid="filter-sales-managers">
                {salesManagers.map(sm => (
                  <button key={sm.id} onClick={() => toggleFilter("selectedSalesManagerIds", sm.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filters.selectedSalesManagerIds.includes(sm.id) ? "bg-[#F59E0B] text-white border-[#F59E0B]" : "bg-white text-gray-700 border-gray-300 hover:border-[#F59E0B]"}`}>{sm.name}</button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Panel */}
      {showComparison && (
        <Card className="border border-purple-200 bg-purple-50/30" data-testid="comparison-panel">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-purple-600" />Period Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="font-semibold text-purple-700">Period 1 (Baseline)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={comparison.p1From} onChange={(e) => setComparison({...comparison, p1From: e.target.value})} data-testid="compare-p1-from" />
                  <Input type="date" value={comparison.p1To} onChange={(e) => setComparison({...comparison, p1To: e.target.value})} data-testid="compare-p1-to" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-purple-700">Period 2 (Current)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={comparison.p2From} onChange={(e) => setComparison({...comparison, p2From: e.target.value})} data-testid="compare-p2-from" />
                  <Input type="date" value={comparison.p2To} onChange={(e) => setComparison({...comparison, p2To: e.target.value})} data-testid="compare-p2-to" />
                </div>
              </div>
            </div>
            <Button onClick={fetchComparison} className="bg-purple-600 hover:bg-purple-700" disabled={comparisonLoading} data-testid="run-comparison">
              {comparisonLoading ? "Comparing..." : "Compare"}
            </Button>

            {comparisonData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4" data-testid="comparison-results">
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-gray-500">Total Projects</p>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      <span className="text-lg font-mono text-gray-400">{comparisonData.period1.total_projects}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                      <span className="text-lg font-mono font-bold">{comparisonData.period2.total_projects}</span>
                    </div>
                    <DeltaIndicator value={comparisonData.deltas.total_projects} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-gray-500">Total Value</p>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      <span className="text-lg font-mono text-gray-400">{formatCurrency(comparisonData.period1.total_value)}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                      <span className="text-lg font-mono font-bold text-[#10B981]">{formatCurrency(comparisonData.period2.total_value)}</span>
                    </div>
                    <DeltaIndicator value={comparisonData.deltas.total_value} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-gray-500">Approved</p>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      <span className="text-lg font-mono text-gray-400">{comparisonData.period1.approved}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                      <span className="text-lg font-mono font-bold text-green-600">{comparisonData.period2.approved}</span>
                    </div>
                    <DeltaIndicator value={comparisonData.deltas.approved} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-3 text-center">
                    <p className="text-xs text-gray-500">Approval Rate</p>
                    <div className="flex items-center justify-center gap-3 mt-1">
                      <span className="text-lg font-mono text-gray-400">{comparisonData.period1.approval_rate}%</span>
                      <ArrowRight className="w-4 h-4 text-gray-300" />
                      <span className="text-lg font-mono font-bold">{comparisonData.period2.approval_rate}%</span>
                    </div>
                    <DeltaIndicator value={comparisonData.deltas.approval_rate} suffix="pp" />
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-[#E2E8F0] shadow-sm cursor-pointer hover:shadow-md transition-shadow" data-testid="total-projects-card" onClick={() => navigate("/projects")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#0EA5E9]" />Total Projects
              <ArrowRight className="w-3 h-3 ml-auto text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold font-mono tabular-nums text-[#0F172A]">{analytics?.total_projects || 0}</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="total-estimation-value-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#10B981]" />Total Value of Estimations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold font-mono tabular-nums text-[#10B981]">{formatCurrency(analytics?.total_revenue || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="approved-projects-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#10B981]" />Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold font-mono tabular-nums text-[#10B981]">{analytics?.projects_by_status?.approved || 0}</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="pending-review-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileClock className="w-4 h-4 text-[#F59E0B]" />In Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-extrabold font-mono tabular-nums text-[#F59E0B]">{analytics?.projects_by_status?.in_review || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Value by Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="value-by-status-section">
        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-gray-500">Draft Value</p>
            <p className="text-xl font-bold font-mono text-gray-600" data-testid="draft-value">{formatCurrency(vbs.draft || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-400">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-amber-600">In Review Value</p>
            <p className="text-xl font-bold font-mono text-amber-600" data-testid="in-review-value">{formatCurrency(vbs.in_review || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-green-600">Approved Value</p>
            <p className="text-xl font-bold font-mono text-green-600" data-testid="approved-value">{formatCurrency(vbs.approved || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs font-medium text-red-500">Rejected Value</p>
            <p className="text-xl font-bold font-mono text-red-500" data-testid="rejected-value">{formatCurrency(vbs.rejected || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 - Status + Revenue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader><CardTitle className="text-lg font-bold text-[#0F172A]">Projects by Status</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {statusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Projects"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500">No project data available</div>)}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-lg font-bold text-[#0F172A]">Estimation Value Trend</CardTitle></CardHeader>
          <CardContent>
            {analytics?.monthly_data?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.monthly_data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => [formatCurrency(value), "Value"]} labelFormatter={(l) => `Month: ${l}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} dot={{ fill: "#10B981", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500">No trend data available</div>)}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      {analytics?.sales_manager_leaderboard?.length > 0 && (
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="sales-manager-leaderboard">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#F59E0B]" />Sales Manager Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-semibold">#</th>
                    <th className="text-left p-3 font-semibold">Sales Manager</th>
                    <th className="text-right p-3 font-semibold">Total Value</th>
                    <th className="text-center p-3 font-semibold">Projects</th>
                    <th className="text-center p-3 font-semibold">Approved</th>
                    <th className="text-center p-3 font-semibold">Rejected</th>
                    <th className="text-center p-3 font-semibold">Approval Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.sales_manager_leaderboard.map((sm, idx) => (
                    <tr key={sm.name} className="border-b hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigateToProjects("sales_manager", sm.name)}>
                      <td className="p-3">
                        {idx === 0 ? <Award className="w-5 h-5 text-[#F59E0B]" /> :
                         idx === 1 ? <Award className="w-5 h-5 text-gray-400" /> :
                         idx === 2 ? <Award className="w-5 h-5 text-amber-700" /> :
                         <span className="text-gray-500 pl-1">{idx + 1}</span>}
                      </td>
                      <td className="p-3 font-medium">{sm.name}</td>
                      <td className="p-3 text-right font-mono font-bold text-[#10B981]">{formatCurrency(sm.total_value)}</td>
                      <td className="p-3 text-center font-mono">{sm.total_projects}</td>
                      <td className="p-3 text-center"><Badge className="bg-green-100 text-green-700">{sm.approved}</Badge></td>
                      <td className="p-3 text-center"><Badge className="bg-red-100 text-red-700">{sm.rejected}</Badge></td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-[#10B981] rounded-full" style={{ width: `${sm.approval_rate}%` }} />
                          </div>
                          <span className="text-xs font-mono text-gray-600">{sm.approval_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 2 - Technology + Project Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="technology-kpi-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#8B5CF6]" />By Technology
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.technology_data?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.technology_data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<KpiTooltip formatCurrency={formatCurrency} />} />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "technology")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500">No technology data</div>)}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="project-type-kpi-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-[#0EA5E9]" />By Project Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.project_type_data?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.project_type_data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<KpiTooltip formatCurrency={formatCurrency} />} />
                    <Bar dataKey="value" fill="#0EA5E9" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "project_type")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500">No project type data</div>)}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 - Location + Sales Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="location-kpi-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#10B981]" />By Project Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.location_data?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.location_data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<KpiTooltip formatCurrency={formatCurrency} />} />
                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "location")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500">No location data</div>)}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm" data-testid="sales-manager-kpi-card">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
              <UserCircle className="w-5 h-5 text-[#F59E0B]" />By Sales Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.sales_manager_data?.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.sales_manager_data} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<KpiTooltip formatCurrency={formatCurrency} />} />
                    <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => handleBarClick(data, "sales_manager")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (<div className="h-64 flex items-center justify-center text-gray-500">No sales manager data</div>)}
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#8B5CF6]" />Top Customers by Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.top_customers?.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.top_customers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [formatCurrency(value), "Value"]} />
                  <Bar dataKey="revenue" fill="#8B5CF6" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(data) => navigateToProjects("customer", data.name)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (<div className="h-64 flex items-center justify-center text-gray-500">No customer data available</div>)}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader><CardTitle className="text-lg font-bold text-[#0F172A]">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10" onClick={() => navigate("/estimator")} data-testid="quick-new-estimate">
              <FileEdit className="w-6 h-6" /><span>New Estimate</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6]/10" onClick={() => navigate("/projects")} data-testid="quick-view-projects">
              <FolderKanban className="w-6 h-6" /><span>View Projects</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10" onClick={() => navigate("/customers")} data-testid="quick-manage-customers">
              <Users className="w-6 h-6" /><span>Manage Customers</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2 border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10" onClick={() => navigate("/proficiency-rates")} data-testid="quick-update-rates">
              <TrendingUp className="w-6 h-6" /><span>Update Rates</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
