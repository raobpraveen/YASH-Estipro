import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, GitCompare, Plus, Minus, RefreshCw, ChevronDown, ChevronRight,
  FileText, Settings, Truck, History, AlertCircle, Users, Calendar, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CompareVersions = () => {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [leftVersionId, setLeftVersionId] = useState("");
  const [rightVersionId, setRightVersionId] = useState("");
  const [diff, setDiff] = useState(null);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diffLoading, setDiffLoading] = useState(false);
  const [expandedWaves, setExpandedWaves] = useState({});
  const [expandedLogs, setExpandedLogs] = useState({});
  const [activeTab, setActiveTab] = useState("comparison");

  useEffect(() => {
    if (projectId) fetchVersions();
  }, [projectId]);

  useEffect(() => {
    if (leftVersionId && rightVersionId && leftVersionId !== rightVersionId) {
      fetchDiff();
    } else {
      setDiff(null);
    }
  }, [leftVersionId, rightVersionId]);

  const fetchVersions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/${projectId}/versions`, { headers: { Authorization: `Bearer ${token}` } });
      const vers = res.data;
      setVersions(vers);
      // Auto-select from URL params or latest two
      const v1 = searchParams.get("v1");
      const v2 = searchParams.get("v2");
      if (v1 && v2) {
        setLeftVersionId(v1);
        setRightVersionId(v2);
      } else if (vers.length >= 2) {
        setLeftVersionId(vers[1].id);
        setRightVersionId(vers[0].id);
      }
      // Fetch change logs
      if (vers.length > 0) {
        const pn = vers[0].project_number;
        try {
          const logsRes = await axios.get(`${API}/change-logs/${pn}`, { headers: { Authorization: `Bearer ${token}` } });
          setChangeLogs(logsRes.data);
        } catch { /* no logs yet */ }
      }
    } catch {
      toast.error("Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  const fetchDiff = async () => {
    setDiffLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/compare-detail?v1=${leftVersionId}&v2=${rightVersionId}`, { headers: { Authorization: `Bearer ${token}` } });
      setDiff(res.data);
      // Auto-expand waves that have changes
      const expanded = {};
      (res.data.wave_diffs || []).forEach((wd, i) => {
        if (wd.status !== "unchanged") expanded[i] = true;
      });
      setExpandedWaves(expanded);
    } catch (err) {
      toast.error("Failed to compute diff");
    } finally {
      setDiffLoading(false);
    }
  };

  const toggleWave = (i) => setExpandedWaves(prev => ({ ...prev, [i]: !prev[i] }));
  const toggleLog = (i) => setExpandedLogs(prev => ({ ...prev, [i]: !prev[i] }));

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading versions...</p></div>;
  }
  if (versions.length < 2) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/projects")}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <div className="text-center py-12"><p className="text-gray-500">Need at least 2 versions to compare.</p></div>
      </div>
    );
  }

  const projectNumber = versions[0]?.project_number || "Project";

  return (
    <div data-testid="compare-versions" className="space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-violet-600" />
              Version Comparison
            </h1>
            <p className="text-sm text-gray-500">{projectNumber} — {versions[0]?.name}</p>
          </div>
        </div>
      </div>

      {/* Version Selectors */}
      <div className="flex items-center gap-4 bg-slate-50 border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Baseline:</span>
          <Select value={leftVersionId} onValueChange={setLeftVersionId}>
            <SelectTrigger className="w-44" data-testid="left-version-select">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map(v => (
                <SelectItem key={v.id} value={v.id}>v{v.version} — {v.status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <GitCompare className="w-5 h-5 text-gray-400" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Compare:</span>
          <Select value={rightVersionId} onValueChange={setRightVersionId}>
            <SelectTrigger className="w-44" data-testid="right-version-select">
              <SelectValue placeholder="Select version" />
            </SelectTrigger>
            <SelectContent>
              {versions.map(v => (
                <SelectItem key={v.id} value={v.id}>v{v.version} — {v.status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {leftVersionId === rightVersionId && (
          <span className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Select different versions</span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="comparison" data-testid="tab-comparison"><GitCompare className="w-4 h-4 mr-1" /> Side-by-Side Diff</TabsTrigger>
          <TabsTrigger value="changelog" data-testid="tab-changelog"><History className="w-4 h-4 mr-1" /> Change History ({changeLogs.length})</TabsTrigger>
        </TabsList>

        {/* ===== COMPARISON TAB ===== */}
        <TabsContent value="comparison" className="space-y-4">
          {diffLoading && <div className="text-center py-8 text-gray-500">Computing diff...</div>}
          {!diff && !diffLoading && <div className="text-center py-8 text-gray-400">Select two different versions above to compare.</div>}

          {diff && (
            <>
              {/* Summary Banner */}
              <div className="bg-slate-900 text-white rounded-lg p-4 flex items-center gap-6" data-testid="diff-summary">
                <span className="font-bold text-lg">v{diff.left_version} → v{diff.right_version}</span>
                <div className="flex gap-4 text-sm">
                  <SummaryPill icon={<RefreshCw className="w-3 h-3" />} count={diff.summary.total_changes} label="Total Changes" color="text-violet-300" />
                  <SummaryPill icon={<FileText className="w-3 h-3" />} count={diff.summary.header_changes} label="Header" color="text-sky-300" />
                  <SummaryPill icon={<Plus className="w-3 h-3" />} count={diff.summary.resources_added} label="Added" color="text-emerald-300" />
                  <SummaryPill icon={<Minus className="w-3 h-3" />} count={diff.summary.resources_removed} label="Removed" color="text-red-300" />
                  <SummaryPill icon={<RefreshCw className="w-3 h-3" />} count={diff.summary.resources_modified} label="Modified" color="text-amber-300" />
                  <SummaryPill icon={<Settings className="w-3 h-3" />} count={diff.summary.allocation_changes} label="Cell Changes" color="text-cyan-300" />
                  <SummaryPill icon={<Truck className="w-3 h-3" />} count={diff.summary.logistics_changes} label="Logistics" color="text-purple-300" />
                </div>
              </div>

              {/* Key Metrics Summary Card */}
              {diff.metrics && (
                <Card className="border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50" data-testid="metrics-summary">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
                      <TrendingUp className="w-5 h-5 text-sky-600" /> Key Metrics Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Project-Level Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      <MetricCard 
                        icon={<Users className="w-4 h-4" />}
                        label="Total Resources"
                        oldVal={diff.metrics.old.total_resources}
                        newVal={diff.metrics.new.total_resources}
                      />
                      <MetricCard 
                        icon={<Calendar className="w-4 h-4" />}
                        label="Total Man-Months"
                        oldVal={diff.metrics.old.total_mm}
                        newVal={diff.metrics.new.total_mm}
                        suffix=" MM"
                      />
                      <MetricCard 
                        icon={<Calendar className="w-4 h-4" />}
                        label="Onsite MM"
                        oldVal={diff.metrics.old.onsite_mm}
                        newVal={diff.metrics.new.onsite_mm}
                        suffix=" MM"
                      />
                      <MetricCard 
                        icon={<Calendar className="w-4 h-4" />}
                        label="Offshore MM"
                        oldVal={diff.metrics.old.offshore_mm}
                        newVal={diff.metrics.new.offshore_mm}
                        suffix=" MM"
                      />
                      <MetricCard 
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Avg Onsite Cost/MM"
                        oldVal={diff.metrics.old.avg_onsite_cost_per_mm}
                        newVal={diff.metrics.new.avg_onsite_cost_per_mm}
                        prefix="$"
                        format="currency"
                      />
                      <MetricCard 
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Avg Offshore Cost/MM"
                        oldVal={diff.metrics.old.avg_offshore_cost_per_mm}
                        newVal={diff.metrics.new.avg_offshore_cost_per_mm}
                        prefix="$"
                        format="currency"
                      />
                      <MetricCard 
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Avg Onsite Sell/MM"
                        oldVal={diff.metrics.old.avg_onsite_selling_per_mm}
                        newVal={diff.metrics.new.avg_onsite_selling_per_mm}
                        prefix="$"
                        format="currency"
                        inverseColor
                      />
                      <MetricCard 
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Avg Offshore Sell/MM"
                        oldVal={diff.metrics.old.avg_offshore_selling_per_mm}
                        newVal={diff.metrics.new.avg_offshore_selling_per_mm}
                        prefix="$"
                        format="currency"
                        inverseColor
                      />
                      <MetricCard 
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Total Cost"
                        oldVal={diff.metrics.old.total_cost}
                        newVal={diff.metrics.new.total_cost}
                        prefix="$"
                        format="currency"
                      />
                      <MetricCard 
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Selling Price"
                        oldVal={diff.metrics.old.selling_price}
                        newVal={diff.metrics.new.selling_price}
                        prefix="$"
                        format="currency"
                        inverseColor
                      />
                      <MetricCard 
                        icon={<Truck className="w-4 h-4" />}
                        label="Logistics"
                        oldVal={diff.metrics.old.logistics}
                        newVal={diff.metrics.new.logistics}
                        prefix="$"
                        format="currency"
                      />
                      <MetricCard 
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Profit Margin"
                        oldVal={diff.metrics.old.profit_margin}
                        newVal={diff.metrics.new.profit_margin}
                        suffix="%"
                      />
                    </div>
                    
                    {/* Wave-Level Metrics */}
                    {diff.metrics.old.wave_metrics && diff.metrics.new.wave_metrics && (
                      <div className="pt-3 border-t">
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">Wave-Level Breakdown</h4>
                        <div className="space-y-4">
                          {diff.metrics.new.wave_metrics.map((newWave, idx) => {
                            const oldWave = diff.metrics.old.wave_metrics[idx] || {
                              resources: 0, total_mm: 0, onsite_mm: 0, offshore_mm: 0,
                              avg_onsite_cost_per_mm: 0, avg_offshore_cost_per_mm: 0,
                              avg_onsite_selling_per_mm: 0, avg_offshore_selling_per_mm: 0, logistics: 0
                            };
                            return (
                              <div key={idx} className="bg-white/60 rounded-lg p-3 border border-sky-100">
                                <h5 className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">{newWave.wave_name}</h5>
                                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-2">
                                  <MetricCard icon={<Users className="w-3 h-3" />} label="Resources" oldVal={oldWave.resources} newVal={newWave.resources} />
                                  <MetricCard icon={<Calendar className="w-3 h-3" />} label="Total MM" oldVal={oldWave.total_mm} newVal={newWave.total_mm} />
                                  <MetricCard icon={<Calendar className="w-3 h-3" />} label="Onsite MM" oldVal={oldWave.onsite_mm} newVal={newWave.onsite_mm} />
                                  <MetricCard icon={<Calendar className="w-3 h-3" />} label="Offshore MM" oldVal={oldWave.offshore_mm} newVal={newWave.offshore_mm} />
                                  <MetricCard icon={<DollarSign className="w-3 h-3" />} label="Onsite $/MM" oldVal={oldWave.avg_onsite_cost_per_mm} newVal={newWave.avg_onsite_cost_per_mm} prefix="$" format="currency" />
                                  <MetricCard icon={<DollarSign className="w-3 h-3" />} label="Offshore $/MM" oldVal={oldWave.avg_offshore_cost_per_mm} newVal={newWave.avg_offshore_cost_per_mm} prefix="$" format="currency" />
                                  <MetricCard icon={<DollarSign className="w-3 h-3" />} label="Onsite Sell/MM" oldVal={oldWave.avg_onsite_selling_per_mm} newVal={newWave.avg_onsite_selling_per_mm} prefix="$" format="currency" inverseColor />
                                  <MetricCard icon={<DollarSign className="w-3 h-3" />} label="Offshore Sell/MM" oldVal={oldWave.avg_offshore_selling_per_mm} newVal={newWave.avg_offshore_selling_per_mm} prefix="$" format="currency" inverseColor />
                                  <MetricCard icon={<Truck className="w-3 h-3" />} label="Logistics" oldVal={oldWave.logistics} newVal={newWave.logistics} prefix="$" format="currency" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Header Diff */}
              {diff.header_diff.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-600" /> Header Changes
                      <Badge variant="secondary" className="ml-1">{diff.header_diff.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-48">Field</TableHead>
                          <TableHead className="bg-red-50/50">v{diff.left_version} (Old)</TableHead>
                          <TableHead className="bg-green-50/50">v{diff.right_version} (New)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diff.header_diff.map((h, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{h.field}</TableCell>
                            <TableCell className="bg-red-50/30"><DiffValue value={h.old_value} type="old" /></TableCell>
                            <TableCell className="bg-green-50/30"><DiffValue value={h.new_value} type="new" /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Wave Diffs */}
              {diff.wave_diffs.map((wd, wi) => (
                <Card key={wi} className={`border-l-4 ${wd.status === "added" ? "border-l-emerald-500" : wd.status === "removed" ? "border-l-red-500" : wd.status === "modified" ? "border-l-amber-500" : "border-l-gray-200"}`}>
                  <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleWave(wi)}>
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {expandedWaves[wi] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {wd.wave_name}
                        <WaveStatusBadge status={wd.status} />
                      </div>
                      <div className="flex gap-2 text-xs font-normal text-gray-500">
                        {wd.resources?.filter(r => r.status === "added").length > 0 && <span className="text-emerald-600">+{wd.resources.filter(r => r.status === "added").length} res</span>}
                        {wd.resources?.filter(r => r.status === "removed").length > 0 && <span className="text-red-600">-{wd.resources.filter(r => r.status === "removed").length} res</span>}
                        {wd.resources?.filter(r => r.status === "modified").length > 0 && <span className="text-amber-600">{wd.resources.filter(r => r.status === "modified").length} changed</span>}
                        {wd.phases_added?.length > 0 && <span className="text-emerald-600">+{wd.phases_added.length} months</span>}
                        {wd.phases_removed?.length > 0 && <span className="text-red-600">-{wd.phases_removed.length} months</span>}
                      </div>
                    </CardTitle>
                  </CardHeader>

                  {expandedWaves[wi] && (
                    <CardContent className="space-y-4 pt-0">
                      {/* Wave config changes */}
                      {wd.config_diff?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Settings className="w-3 h-3" /> Wave Config</h4>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            {wd.config_diff.map((cd, ci) => (
                              <div key={ci} className="bg-amber-50 border border-amber-100 rounded p-2">
                                <span className="text-xs text-gray-500 block">{cd.field}</span>
                                <span className="text-red-600 line-through mr-2">{cd.old_value}</span>
                                <span className="text-emerald-700 font-medium">{cd.new_value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Phase changes */}
                      {(wd.phases_added?.length > 0 || wd.phases_removed?.length > 0) && (
                        <div className="flex gap-4 text-sm">
                          {wd.phases_added?.length > 0 && (
                            <div className="flex items-center gap-1 text-emerald-700">
                              <Plus className="w-3 h-3" /> Months added: {wd.phases_added.join(", ")}
                            </div>
                          )}
                          {wd.phases_removed?.length > 0 && (
                            <div className="flex items-center gap-1 text-red-600">
                              <Minus className="w-3 h-3" /> Months removed: {wd.phases_removed.join(", ")}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Resources table */}
                      {wd.resources?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Resources</h4>
                          <div className="overflow-x-auto border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-slate-50">
                                  <TableHead className="w-8"></TableHead>
                                  <TableHead className="text-xs">Skill</TableHead>
                                  <TableHead className="text-xs">Level</TableHead>
                                  <TableHead className="text-xs">Location</TableHead>
                                  <TableHead className="text-xs">Changes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {wd.resources.filter(r => r.status !== "unchanged").map((res, ri) => (
                                  <TableRow key={ri} className={res.status === "added" ? "bg-emerald-50" : res.status === "removed" ? "bg-red-50" : ""}>
                                    <TableCell><ResourceStatusIcon status={res.status} /></TableCell>
                                    <TableCell className="text-sm font-medium">{res.skill_name}</TableCell>
                                    <TableCell className="text-sm">{res.level}</TableCell>
                                    <TableCell className="text-sm">{res.location}</TableCell>
                                    <TableCell>
                                      {res.status === "added" && <Badge className="bg-emerald-100 text-emerald-700 text-xs">New Resource</Badge>}
                                      {res.status === "removed" && <Badge className="bg-red-100 text-red-700 text-xs">Removed</Badge>}
                                      {res.status === "modified" && (
                                        <div className="flex flex-wrap gap-1">
                                          {res.field_changes.map((fc, fi) => (
                                            <div key={fi} className="inline-flex items-center bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-xs">
                                              <span className="font-medium text-gray-700 mr-1">{fc.field}:</span>
                                              <span className="text-red-600 line-through mr-1">{fc.old_value || "—"}</span>
                                              <span className="text-gray-400 mr-1">→</span>
                                              <span className="text-emerald-700 font-medium">{fc.new_value || "—"}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                {wd.resources.filter(r => r.status !== "unchanged").length === 0 && (
                                  <TableRow><TableCell colSpan={5} className="text-center text-gray-400 text-sm py-3">No resource changes</TableCell></TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                          {wd.resources.filter(r => r.status === "unchanged").length > 0 && (
                            <p className="text-xs text-gray-400 mt-1">{wd.resources.filter(r => r.status === "unchanged").length} unchanged resource(s) hidden</p>
                          )}
                        </div>
                      )}

                      {/* Logistics diff */}
                      {wd.logistics_diff?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1"><Truck className="w-3 h-3" /> Logistics Changes</h4>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            {wd.logistics_diff.map((ld, li) => (
                              <div key={li} className="bg-purple-50 border border-purple-100 rounded p-2">
                                <span className="text-xs text-gray-500 block">{ld.field}</span>
                                <span className="text-red-600 line-through mr-2">{ld.old_value}</span>
                                <span className="text-emerald-700 font-medium">{ld.new_value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}

              {diff.summary.total_changes === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <GitCompare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No differences found between these versions.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ===== CHANGE HISTORY TAB ===== */}
        <TabsContent value="changelog" className="space-y-3">
          {changeLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No change history recorded yet.</p>
              <p className="text-xs mt-1">Changes will be recorded automatically on each save.</p>
            </div>
          ) : (
            changeLogs.map((log, li) => (
              <Card key={li} className="border-l-4 border-l-violet-400">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleLog(li)}>
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {expandedLogs[li] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="text-gray-600">{new Date(log.timestamp).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">v{log.version}</Badge>
                      <span className="text-gray-500">{log.user_name || log.user_email}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      {log.summary?.header_changes > 0 && <Badge className="bg-sky-100 text-sky-700">{log.summary.header_changes} header</Badge>}
                      {log.summary?.resources_added > 0 && <Badge className="bg-emerald-100 text-emerald-700">+{log.summary.resources_added} res</Badge>}
                      {log.summary?.resources_removed > 0 && <Badge className="bg-red-100 text-red-700">-{log.summary.resources_removed} res</Badge>}
                      {log.summary?.resources_modified > 0 && <Badge className="bg-amber-100 text-amber-700">{log.summary.resources_modified} modified</Badge>}
                      {log.summary?.allocation_changes > 0 && <Badge className="bg-cyan-100 text-cyan-700">{log.summary.allocation_changes} cells</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                {expandedLogs[li] && (
                  <CardContent className="pt-0 space-y-3">
                    {log.header_diff?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Header Changes</h4>
                        <div className="space-y-1">
                          {log.header_diff.map((h, hi) => (
                            <div key={hi} className="text-sm flex items-center gap-2">
                              <span className="font-medium text-gray-700 w-36">{h.field}:</span>
                              <span className="text-red-600 line-through">{h.old_value || "—"}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-emerald-700 font-medium">{h.new_value || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {log.wave_diffs?.filter(w => w.status !== "unchanged").map((wd, wi) => (
                      <div key={wi}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">{wd.wave_name} <WaveStatusBadge status={wd.status} /></h4>
                        {wd.resources?.filter(r => r.status !== "unchanged").map((res, ri) => (
                          <div key={ri} className="ml-4 text-sm mb-1">
                            <span className="font-medium">{res.skill_name} ({res.level}, {res.location})</span>
                            {res.status === "added" && <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-xs">Added</Badge>}
                            {res.status === "removed" && <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Removed</Badge>}
                            {res.status === "modified" && (
                              <div className="ml-4 mt-1 flex flex-wrap gap-1">
                                {res.field_changes.map((fc, fi) => (
                                  <span key={fi} className="inline-flex items-center bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 text-xs">
                                    {fc.field}: <span className="text-red-600 line-through mx-0.5">{fc.old_value || "—"}</span> → <span className="text-emerald-700 font-medium ml-0.5">{fc.new_value || "—"}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {wd.logistics_diff?.length > 0 && (
                          <div className="ml-4 text-xs text-purple-600">
                            Logistics: {wd.logistics_diff.map(l => `${l.field}: ${l.old_value}→${l.new_value}`).join(", ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// --- Small helper components ---

const SummaryPill = ({ icon, count, label, color }) => (
  <div className={`flex items-center gap-1 ${color}`}>
    {icon} <span className="font-bold">{count}</span> <span className="opacity-70">{label}</span>
  </div>
);

const MetricCard = ({ icon, label, oldVal, newVal, prefix = "", suffix = "", format = "number", inverseColor = false }) => {
  const formatValue = (val) => {
    if (format === "currency" && val >= 1000) {
      return val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}K`;
    }
    return val;
  };
  const changed = oldVal !== newVal;
  const increased = newVal > oldVal;
  // For selling price, decrease is good (green), increase is bad (red) - use inverseColor prop
  const isPositive = inverseColor ? !increased : increased;
  const changePercent = oldVal > 0 ? Math.round(((newVal - oldVal) / oldVal) * 100) : (newVal > 0 ? 100 : 0);
  
  return (
    <div className={`bg-white rounded-lg p-3 border ${changed ? "border-amber-300 shadow-sm" : "border-gray-200"}`}>
      <div className="flex items-center gap-1.5 text-gray-500 mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        {changed ? (
          <>
            <span className="text-xs text-gray-400 line-through">{prefix}{formatValue(oldVal)}{suffix}</span>
            <ArrowRight className="w-3 h-3 text-gray-300" />
          </>
        ) : null}
        <span className={`text-sm font-bold ${changed ? (isPositive ? "text-emerald-600" : "text-red-600") : "text-gray-700"}`}>
          {prefix}{formatValue(newVal)}{suffix}
        </span>
      </div>
      {changed && (
        <div className={`text-xs mt-1 flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
          {increased ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {changePercent > 0 ? "+" : ""}{changePercent}%
        </div>
      )}
    </div>
  );
};

const DiffValue = ({ value, type }) => {
  if (!value && value !== 0) return <span className="text-gray-300">—</span>;
  return (
    <span className={`text-sm font-mono ${type === "old" ? "text-red-700 bg-red-100 px-1.5 py-0.5 rounded" : "text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded"}`}>
      {value}
    </span>
  );
};

const WaveStatusBadge = ({ status }) => {
  const config = {
    added: { label: "Added", className: "bg-emerald-100 text-emerald-700" },
    removed: { label: "Removed", className: "bg-red-100 text-red-700" },
    modified: { label: "Modified", className: "bg-amber-100 text-amber-700" },
    unchanged: { label: "No Changes", className: "bg-gray-100 text-gray-500" },
  };
  const c = config[status] || config.unchanged;
  return <Badge className={`${c.className} text-xs ml-2`}>{c.label}</Badge>;
};

const ResourceStatusIcon = ({ status }) => {
  if (status === "added") return <Plus className="w-4 h-4 text-emerald-600" />;
  if (status === "removed") return <Minus className="w-4 h-4 text-red-600" />;
  if (status === "modified") return <RefreshCw className="w-4 h-4 text-amber-600" />;
  return null;
};

export default CompareVersions;
