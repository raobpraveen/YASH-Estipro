import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, DollarSign, Target, ChevronDown, ChevronRight, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentMilestones = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collapsedWaves, setCollapsedWaves] = useState({});

  // Project list state
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [milestoneCounts, setMilestoneCounts] = useState({});

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchMilestones();
    } else {
      fetchProjectsList();
    }
  }, [projectId]);

  const fetchProjectsList = async () => {
    setLoadingProjects(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects?latest_only=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allProjects = res.data || [];
      setProjects(allProjects);
      const counts = {};
      await Promise.all(
        allProjects.map(async (p) => {
          try {
            const msRes = await axios.get(`${API}/projects/${p.id}/milestones`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const ms = msRes.data.milestones || [];
            if (ms.length > 0) counts[p.id] = ms.length;
          } catch { /* ignore */ }
        })
      );
      setMilestoneCounts(counts);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(res.data);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/${projectId}/milestones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMilestones(res.data.milestones || []);
    } catch { /* No milestones yet */ }
  };

  const getWaveFinalPrice = (waveName) => {
    if (!project) return 0;
    const wave = project.waves?.find((w) => w.name === waveName);
    if (!wave) return 0;
    const pm = project.profit_margin_percentage || 35;
    let totalSP = 0;
    for (const alloc of wave.grid_allocations || []) {
      const pa = alloc.phase_allocations || {};
      const mm = typeof pa === "object" && !Array.isArray(pa)
        ? Object.values(pa).reduce((s, v) => s + v, 0)
        : Array.isArray(pa) ? pa.reduce((s, v) => s + v, 0) : 0;
      const salary = alloc.avg_monthly_salary || 0;
      const oh = salary * mm * ((alloc.overhead_percentage || 0) / 100);
      const tc = salary * mm + oh;
      const sp = pm < 100 ? tc / (1 - pm / 100) : tc;
      totalSP += sp;
    }
    return totalSP;
  };

  const getWaveMonthCount = (waveName) => {
    const wave = project?.waves?.find((w) => w.name === waveName);
    return wave?.phase_names?.length || 12;
  };

  const addMilestoneToWave = (waveName) => {
    const waveMilestones = milestones.filter((m) => m.wave_name === waveName);
    setMilestones([
      ...milestones,
      {
        id: crypto.randomUUID(),
        wave_name: waveName,
        milestone_name: `Milestone ${waveMilestones.length + 1}`,
        target_month: "M1",
        payment_percentage: 0,
        payment_amount: 0,
        description: "",
      },
    ]);
    setCollapsedWaves((prev) => ({ ...prev, [waveName]: false }));
  };

  const updateMilestone = (id, field, value) => {
    setMilestones(
      milestones.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        if (field === "payment_percentage" || field === "wave_name") {
          const wavePrice = getWaveFinalPrice(field === "wave_name" ? value : updated.wave_name);
          const pct = field === "payment_percentage" ? value : updated.payment_percentage;
          updated.payment_amount = Math.round(wavePrice * (pct / 100) * 100) / 100;
        }
        return updated;
      })
    );
  };

  const removeMilestone = (id) => setMilestones(milestones.filter((m) => m.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/projects/${projectId}/milestones`, { milestones }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Payment milestones saved");
    } catch {
      toast.error("Failed to save milestones");
    } finally {
      setSaving(false);
    }
  };

  const toggleWave = (waveName) => setCollapsedWaves((prev) => ({ ...prev, [waveName]: !prev[waveName] }));

  // ===== EXCEL EXPORT =====
  const handleExportExcel = async () => {
    if (!project || milestones.length === 0) { toast.error("No milestones to export"); return; }
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "YASH EstiPro";
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const waveFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      const moneyFmt = "#,##0.00";
      const pctFmt = "0.00%";

      const waves = project.waves || [];
      for (const wave of waves) {
        const waveName = wave.name;
        const wMs = milestones.filter((m) => m.wave_name === waveName);
        if (wMs.length === 0) continue;
        const ws = wb.addWorksheet(waveName.substring(0, 31));
        ws.columns = [{ width: 6 }, { width: 30 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 30 }];

        // Wave selling price reference
        const waveSP = getWaveFinalPrice(waveName);
        ws.addRow([`${waveName} — Payment Milestones`]).font = { bold: true, size: 13 };
        const spRow = ws.addRow(["", "Wave Selling Price", waveSP]);
        spRow.getCell(3).numFmt = moneyFmt;
        spRow.getCell(3).font = { bold: true };
        const spCellRef = `C2`; // wave SP cell reference
        ws.addRow([]);

        // Headers
        const hRow = ws.addRow(["#", "Milestone Name", "Target Month", "Payment %", "Payment Amount", "Description"]);
        hRow.eachCell((c) => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
        const dataStartRow = 5; // row after header

        wMs.forEach((ms, idx) => {
          const rowNum = dataStartRow + idx;
          const r = ws.addRow([
            idx + 1,
            ms.milestone_name || "",
            ms.target_month || "M1",
            (ms.payment_percentage || 0) / 100,
            { formula: `${spCellRef}*D${rowNum}`, result: ms.payment_amount || 0 },
            ms.description || "",
          ]);
          r.getCell(4).numFmt = pctFmt;
          r.getCell(5).numFmt = moneyFmt;
          r.eachCell((c) => { c.border = thinBorder; });
        });

        // Totals row
        const totalRowNum = dataStartRow + wMs.length;
        ws.addRow([]);
        const pctRange = `D${dataStartRow}:D${totalRowNum - 1}`;
        const amtRange = `E${dataStartRow}:E${totalRowNum - 1}`;
        const totRow = ws.addRow(["", "TOTAL", "", { formula: `SUM(${pctRange})`, result: 0 }, { formula: `SUM(${amtRange})`, result: 0 }, ""]);
        totRow.font = { bold: true };
        totRow.getCell(4).numFmt = pctFmt;
        totRow.getCell(5).numFmt = moneyFmt;
        totRow.eachCell((c) => { c.fill = waveFill; c.border = thinBorder; });
      }

      const buffer = await wb.xlsx.writeBuffer();
      const fileName = `${project.project_number || "Project"}_Milestones.xlsx`;
      const uploadRes = await fetch(`${API}/download-file`, {
        method: "POST",
        headers: { "X-Filename": fileName, "X-Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        body: buffer,
      });
      const { download_id } = await uploadRes.json();
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = `${API}/download-file/${download_id}`;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 30000);
      toast.success("Milestones exported to Excel");
    } catch (err) {
      toast.error("Export failed: " + (err.message || "Unknown"));
    }
  };

  const totalPayment = milestones.reduce((s, m) => s + (m.payment_amount || 0), 0);

  // ========== PROJECT LIST VIEW ==========
  if (!projectId) {
    const filtered = projects.filter((p) =>
      (p.name || "").toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.project_number || "").toLowerCase().includes(projectSearch.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => (milestoneCounts[b.id] ? 1 : 0) - (milestoneCounts[a.id] ? 1 : 0));

    return (
      <div data-testid="milestones-project-list">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Payment Milestones</h1>
          <p className="text-sm text-gray-600 mt-1">Select a project to manage payment milestones</p>
        </div>
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search projects..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="pl-10" data-testid="project-search" />
        </div>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div></div>
        ) : sorted.length === 0 ? (
          <Card className="border border-dashed"><CardContent className="py-12 text-center"><p className="text-gray-500">No projects found</p></CardContent></Card>
        ) : (
          <Card className="border border-[#E2E8F0]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Project #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-20 text-center">Version</TableHead>
                    <TableHead className="w-20 text-center">Waves</TableHead>
                    <TableHead className="w-28 text-center">Milestones</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                      onClick={() => navigate(`/payment-milestones?project=${p.id}`)}
                      data-testid={`project-row-${p.id}`}
                    >
                      <TableCell className="font-mono text-[#0EA5E9] text-sm">{p.project_number}</TableCell>
                      <TableCell className="font-medium text-[#0F172A]">{p.name}</TableCell>
                      <TableCell className="text-center text-gray-500">v{p.version}</TableCell>
                      <TableCell className="text-center text-gray-500">{p.waves?.length || 0}</TableCell>
                      <TableCell className="text-center">
                        {milestoneCounts[p.id] ? (
                          <span className="text-xs bg-[#10B981]/10 text-[#10B981] font-semibold px-2 py-0.5 rounded-full">
                            {milestoneCounts[p.id]}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-[#0EA5E9]">Open</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ========== LOADING ==========
  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div></div>;

  const waves = project?.waves || [];

  // ========== MILESTONE EDITOR ==========
  return (
    <div data-testid="payment-milestones-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/payment-milestones")} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-1" /> All Projects
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Payment Milestones</h1>
            <p className="text-sm text-gray-600 mt-1">{project?.project_number} — {project?.name} (v{project?.version})</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline" size="sm" className="border-[#10B981] text-[#10B981]" data-testid="export-milestones-btn">
            <FileDown className="w-4 h-4 mr-1" /> Export Excel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="save-milestones-btn">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-[#0EA5E9]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total Milestones</p>
            <p className="text-2xl font-bold text-[#0F172A]" data-testid="total-milestones">{milestones.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#10B981]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total Payment Amount</p>
            <p className="text-2xl font-bold text-[#10B981]" data-testid="total-payment">${totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#F59E0B]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Waves</p>
            <p className="text-2xl font-bold text-[#F59E0B]" data-testid="wave-count">{waves.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Wave Sections */}
      <div className="space-y-4">
        {waves.map((wave) => {
          const waveName = wave.name;
          const waveMilestones = milestones.filter((m) => m.wave_name === waveName);
          const isCollapsed = collapsedWaves[waveName] ?? false;
          const waveFP = getWaveFinalPrice(waveName);
          const wavePctTotal = waveMilestones.reduce((s, m) => s + (m.payment_percentage || 0), 0);
          const wavePayTotal = waveMilestones.reduce((s, m) => s + (m.payment_amount || 0), 0);
          const monthCount = getWaveMonthCount(waveName);

          return (
            <Card key={waveName} className="border border-[#E2E8F0] shadow-sm" data-testid={`wave-section-${waveName}`}>
              <CardHeader className="flex flex-row items-center justify-between py-3 px-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors" onClick={() => toggleWave(waveName)}>
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  <CardTitle className="text-lg font-bold text-[#0F172A]">{waveName}</CardTitle>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{waveMilestones.length} milestone{waveMilestones.length !== 1 ? "s" : ""}</span>
                  <span className="text-xs text-gray-400">{monthCount} months</span>
                </div>
                <div className="flex items-center gap-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <span className="text-gray-500">SP: <span className="font-semibold text-[#0F172A]">${waveFP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  <span className={`font-semibold ${wavePctTotal > 100 ? "text-red-500" : "text-[#0F172A]"}`}>{wavePctTotal.toFixed(1)}%</span>
                  <span className="text-[#10B981] font-semibold">${wavePayTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </CardHeader>
              {!isCollapsed && (
                <CardContent className="pt-0 pb-4">
                  {waveMilestones.length > 0 && (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Milestone Name</TableHead>
                            <TableHead className="w-28">Target Month</TableHead>
                            <TableHead className="w-28">Payment %</TableHead>
                            <TableHead className="text-right w-36">Payment Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {waveMilestones.map((ms, idx) => (
                            <TableRow key={ms.id} data-testid={`milestone-row-${ms.id}`}>
                              <TableCell className="font-mono text-gray-400">{idx + 1}</TableCell>
                              <TableCell><Input value={ms.milestone_name} onChange={(e) => updateMilestone(ms.id, "milestone_name", e.target.value)} className="w-48" data-testid={`ms-name-${ms.id}`} /></TableCell>
                              <TableCell>
                                <Select value={ms.target_month || "M1"} onValueChange={(v) => updateMilestone(ms.id, "target_month", v)}>
                                  <SelectTrigger className="w-24" data-testid={`ms-month-${ms.id}`}><SelectValue /></SelectTrigger>
                                  <SelectContent>{Array.from({ length: monthCount }, (_, i) => (<SelectItem key={i} value={`M${i + 1}`}>M{i + 1}</SelectItem>))}</SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell><Input type="number" min={0} max={100} value={ms.payment_percentage} onChange={(e) => updateMilestone(ms.id, "payment_percentage", parseFloat(e.target.value) || 0)} className="w-24" data-testid={`ms-pct-${ms.id}`} /></TableCell>
                              <TableCell className="text-right font-mono font-semibold text-[#10B981]" data-testid={`ms-amount-${ms.id}`}>${(ms.payment_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                              <TableCell><Input value={ms.description || ""} onChange={(e) => updateMilestone(ms.id, "description", e.target.value)} className="w-40" placeholder="Optional" data-testid={`ms-desc-${ms.id}`} /></TableCell>
                              <TableCell><Button variant="ghost" size="sm" onClick={() => removeMilestone(ms.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" data-testid={`ms-delete-${ms.id}`}><Trash2 className="w-4 h-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {!waveMilestones.length && <p className="text-sm text-gray-400 py-3 text-center">No milestones for this wave yet.</p>}
                  <div className="mt-3 flex justify-center">
                    <Button variant="outline" size="sm" onClick={() => addMilestoneToWave(waveName)} className="text-[#0EA5E9] border-[#0EA5E9]/30 hover:bg-[#0EA5E9]/5" data-testid={`add-ms-${waveName}`}>
                      <Plus className="w-4 h-4 mr-1" /> Add Milestone
                    </Button>
                  </div>
                  {wavePctTotal > 100 && <p className="text-xs text-red-500 mt-2 text-center font-medium">Total payment percentage ({wavePctTotal.toFixed(1)}%) exceeds 100%</p>}
                </CardContent>
              )}
            </Card>
          );
        })}
        {waves.length === 0 && (
          <Card className="border border-dashed"><CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No waves in this project</p>
            <p className="text-gray-400 text-sm">Add waves to the project estimator first, then define milestones.</p>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
};

export default PaymentMilestones;
