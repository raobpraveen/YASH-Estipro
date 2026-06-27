import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, DollarSign, Target, ChevronDown, ChevronRight, Search, FileDown, ExternalLink, Copy, Clock } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { calculateWaveSummary } from "@/utils/estimatorCalcs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentMilestones = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [paymentTermsDays, setPaymentTermsDays] = useState(0);
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
      loadProjectAndMilestones();
    } else {
      fetchProjectsList();
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProjectsList = async () => {
    setLoadingProjects(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allProjects = (res.data || [])
        .filter(p => p.is_latest_version !== false)
        .sort((a, b) => {
        const pnCmp = (a.project_number || "").localeCompare(b.project_number || "");
        if (pnCmp !== 0) return pnCmp;
        return (b.version || 1) - (a.version || 1);
      });
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

  const loadProjectAndMilestones = async () => {
    try {
      const token = localStorage.getItem("token");
      const [projectRes, milestonesRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/projects/${projectId}/milestones`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { milestones: [], payment_terms_days: 0 } })),
      ]);
      const projectData = projectRes.data;
      const loadedMilestones = milestonesRes.data.milestones || [];
      const loadedTerms = milestonesRes.data.payment_terms_days || 0;
      const pm = projectData.profit_margin_percentage ?? 35;
      const nbp = projectData.nego_buffer_percentage ?? 0;
      // Recalculate milestone amounts using the same formula as the estimator
      const recalculated = loadedMilestones.map((m) => {
        if (!m.payment_percentage) return m;
        const wave = projectData.waves?.find((w) => w.name === m.wave_name);
        if (!wave) return m;
        const wavePrice = calculateWaveSummary(wave, pm, nbp).finalPrice;
        return { ...m, payment_amount: Math.round(wavePrice * (m.payment_percentage / 100) * 100) / 100 };
      });
      setProject(projectData);
      setMilestones(recalculated);
      setPaymentTermsDays(loadedTerms);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const getWaveFinalPrice = (waveName) => {
    if (!project) return 0;
    const wave = project.waves?.find((w) => w.name === waveName);
    if (!wave) return 0;
    return calculateWaveSummary(wave, project.profit_margin_percentage ?? 35, project.nego_buffer_percentage ?? 0).finalPrice;
  };

  const getWaveMonthCount = (waveName) => {
    const wave = project?.waves?.find((w) => w.name === waveName);
    if (!wave) return 12;
    // Prefer phase_ranges max end_month, fallback to phase_names length
    const ranges = wave.phase_ranges || [];
    if (ranges.length > 0) {
      return Math.ceil(Math.max(...ranges.map(r => r.end_month || 1)));
    }
    return wave.phase_names?.length || 12;
  };

  const addMilestoneToWave = (waveName, type = "payment") => {
    const waveMilestones = milestones.filter((m) => m.wave_name === waveName);
    const newId = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setMilestones([
      ...milestones,
      {
        id: newId,
        wave_name: waveName,
        milestone_type: type,
        milestone_name: type === "marker" ? `Key Milestone ${waveMilestones.filter(m => (m.milestone_type || "payment") === "marker").length + 1}` : `Milestone ${waveMilestones.filter(m => (m.milestone_type || "payment") === "payment").length + 1}`,
        phase_name: "",
        position: type === "marker" ? "50" : "end",
        target_month: "M1",
        payment_percentage: 0,
        payment_amount: 0,
        is_advance: false,
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

  const copyMilestonesToWave = (sourceWaveName, targetWaveName) => {
    const sourceMilestones = milestones.filter((m) => m.wave_name === sourceWaveName);
    if (sourceMilestones.length === 0) {
      toast.error("No milestones to copy from this wave");
      return;
    }
    // Remove existing milestones in target wave first, then copy
    const filtered = milestones.filter((m) => m.wave_name !== targetWaveName);
    const targetMaxMonths = getWaveMonthCount(targetWaveName);
    const copied = sourceMilestones.map((m) => {
      const newId = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      // Clamp target_month to the target wave's month count
      const monthNum = parseInt(m.target_month?.replace("M", "") || "1");
      const clampedMonth = `M${Math.min(monthNum, targetMaxMonths)}`;
      const wavePrice = getWaveFinalPrice(targetWaveName);
      return {
        ...m,
        id: newId,
        wave_name: targetWaveName,
        target_month: clampedMonth,
        payment_amount: Math.round(wavePrice * ((m.payment_percentage || 0) / 100) * 100) / 100,
      };
    });
    setMilestones([...filtered, ...copied]);
    setCollapsedWaves((prev) => ({ ...prev, [targetWaveName]: false }));
    toast.success(`Copied ${sourceMilestones.length} milestones to ${targetWaveName}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/projects/${projectId}/milestones`, { milestones, payment_terms_days: paymentTermsDays }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Payment milestones saved");
    } catch {
      toast.error("Failed to save milestones");
    } finally {
      setSaving(false);
    }
  };

  // Ctrl+S keyboard shortcut — use ref to always call the latest handleSave
  const saveHandlerRef = useRef(null);
  saveHandlerRef.current = handleSave;

  useEffect(() => {
    if (!projectId) return;
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveHandlerRef.current) saveHandlerRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [projectId]);

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

  const paymentOnly = milestones.filter(m => (m.milestone_type || "payment") === "payment");
  const markerOnly = milestones.filter(m => (m.milestone_type || "payment") === "marker");
  const totalPayment = paymentOnly.reduce((s, m) => s + (m.payment_amount || 0), 0);
  const totalProjectFinalPrice = (project?.waves || []).reduce((sum, w) => sum + getWaveFinalPrice(w.name), 0);

  // ========== PROJECT LIST VIEW ==========
  if (!projectId) {
    const filtered = projects.filter((p) =>
      (p.name || "").toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.project_number || "").toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.customer_name || "").toLowerCase().includes(projectSearch.toLowerCase())
    );
    // Sort: projects with milestones first, then by project_number asc, version desc
    const sorted = [...filtered].sort((a, b) => {
      const pnCmp = (a.project_number || "").localeCompare(b.project_number || "", undefined, { numeric: true });
      if (pnCmp !== 0) return pnCmp;
      return (b.version || 1) - (a.version || 1);
    });

    return (
      <div data-testid="milestones-project-list">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <img src="/yash-logo-new.png" alt="YASH" className="h-10 object-contain" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Payment Milestones</h1>
              <p className="text-sm text-gray-600 mt-1">Select a project version to manage payment milestones</p>
            </div>
          </div>
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
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-24 text-center">Version</TableHead>
                    <TableHead className="w-20 text-center">Status</TableHead>
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
                      <TableCell className="text-sm text-gray-600">{p.customer_name || "—"}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-[#0F172A]">v{p.version}</span>
                        {p.is_latest_version && <span className="ml-1 text-[10px] bg-[#0EA5E9]/10 text-[#0EA5E9] font-semibold px-1.5 py-0.5 rounded">latest</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          p.status === "in_review" ? "bg-amber-100 text-amber-700" :
                          p.status === "rejected" ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{(p.status || "draft").replace("_", " ")}</span>
                      </TableCell>
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
          <img src="/yash-logo-new.png" alt="YASH" className="h-10 object-contain" />
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Payment Milestones</h1>
            <p className="text-sm text-gray-600 mt-1">{project?.project_number} — {project?.name} (v{project?.version})</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/estimator?edit=${projectId}`)} className="border-[#0F172A] text-[#0F172A]" data-testid="open-estimator-btn">
            <ExternalLink className="w-4 h-4 mr-1" /> Open Estimator
          </Button>
          <Button onClick={handleExportExcel} variant="outline" size="sm" className="border-[#10B981] text-[#10B981]" data-testid="export-milestones-btn">
            <FileDown className="w-4 h-4 mr-1" /> Export Excel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="save-milestones-btn">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-l-4 border-l-[#0EA5E9]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total Milestones</p>
            <p className="text-2xl font-bold text-[#0F172A]" data-testid="total-milestones">{paymentOnly.length}{markerOnly.length > 0 && <span className="text-sm font-normal text-blue-500 ml-1">+{markerOnly.length} markers</span>}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#8B5CF6]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Project Final Price</p>
            <p className="text-2xl font-bold text-[#8B5CF6]" data-testid="project-final-price">${totalProjectFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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
            <p className="text-sm text-gray-500">Coverage</p>
            <p className={`text-2xl font-bold ${totalProjectFinalPrice > 0 && Math.abs((totalPayment / totalProjectFinalPrice) * 100 - 100) < 1 ? "text-[#10B981]" : "text-[#F59E0B]"}`} data-testid="coverage-pct">{totalProjectFinalPrice > 0 ? ((totalPayment / totalProjectFinalPrice) * 100).toFixed(1) : 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Terms */}
      <Card className="mb-6 border border-[#E2E8F0]">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Clock className="w-5 h-5 text-[#6366F1]" />
            <div>
              <p className="text-sm font-medium text-gray-700">Payment Terms (Days)</p>
              <p className="text-xs text-gray-500">Cash-In will be shifted in the Cashflow by this many days (30 days = +1 month). Applies to all waves.</p>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Select
                value={String(paymentTermsDays)}
                onValueChange={(v) => setPaymentTermsDays(Number(v))}
                data-testid="payment-terms-select"
              >
                <SelectTrigger className="w-36" data-testid="payment-terms-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 days (Immediate)</SelectItem>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">30 days (+1 month)</SelectItem>
                  <SelectItem value="45">45 days (+2 months)</SelectItem>
                  <SelectItem value="60">60 days (+2 months)</SelectItem>
                  <SelectItem value="90">90 days (+3 months)</SelectItem>
                  <SelectItem value="120">120 days (+4 months)</SelectItem>
                </SelectContent>
              </Select>
              {paymentTermsDays > 0 && (
                <span className="text-xs text-[#6366F1] font-medium whitespace-nowrap">
                  Cash-In shifts by +{Math.ceil(paymentTermsDays / 30)} month{Math.ceil(paymentTermsDays / 30) > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wave Sections */}
      <div className="space-y-4">
        {waves.map((wave) => {
          const waveName = wave.name;
          const waveMilestones = milestones.filter((m) => m.wave_name === waveName);
          const paymentMilestones = waveMilestones.filter(m => (m.milestone_type || "payment") === "payment");
          const markerMilestones = waveMilestones.filter(m => (m.milestone_type || "payment") === "marker");
          const isCollapsed = collapsedWaves[waveName] ?? false;
          const waveFP = getWaveFinalPrice(waveName);
          const wavePctTotal = paymentMilestones.reduce((s, m) => s + (m.payment_percentage || 0), 0);
          const wavePayTotal = paymentMilestones.reduce((s, m) => s + (m.payment_amount || 0), 0);
          const monthCount = getWaveMonthCount(waveName);
          const wavePhases = (wave.phase_ranges || []).map(p => p.name).filter(n => n);

          return (
            <Card key={waveName} className="border border-[#E2E8F0] shadow-sm" data-testid={`wave-section-${waveName}`}>
              <CardHeader className="flex flex-row items-center justify-between py-3 px-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors" onClick={() => toggleWave(waveName)}>
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  <CardTitle className="text-lg font-bold text-[#0F172A]">{waveName}</CardTitle>
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{paymentMilestones.length} payment</span>
                  {markerMilestones.length > 0 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{markerMilestones.length} key</span>}
                  <span className="text-xs text-gray-400">{monthCount} months</span>
                </div>
                <div className="flex items-center gap-4 text-sm" onClick={(e) => e.stopPropagation()}>
                  <span className="text-gray-500">Final Price: <span className="font-semibold text-[#0F172A]">${waveFP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                  <span className={`font-semibold ${wavePctTotal > 100 ? "text-red-500" : "text-[#0F172A]"}`}>{wavePctTotal.toFixed(1)}%</span>
                  <span className="text-[#10B981] font-semibold">${wavePayTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </CardHeader>
              {!isCollapsed && (
                <CardContent className="pt-0 pb-4">
                  {/* AMS Shared Support Recurring Billing — read-only info card */}
                  {(wave.engagement_type === "AMS_Shared" || wave.engagement_type === "AMS_Mix") && (wave.ams_shared_buckets || []).length > 0 && (() => {
                    const buckets = wave.ams_shared_buckets || [];
                    const contractMonths = parseInt(wave.ams_contract_months) || 12;
                    const monthly = buckets.reduce((s, b) => s + (parseFloat(b.hours_per_month) || 0) * (parseFloat(b.hourly_rate) || 0), 0);
                    const annual = monthly * contractMonths;
                    return (
                      <div className="mb-4 border border-purple-200 rounded-lg p-3 bg-purple-50/40" data-testid={`ams-recurring-card-${waveName}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-[#8B5CF6] text-white px-2 py-0.5 rounded uppercase tracking-wide">AMS Recurring Billing</span>
                            <span className="text-xs text-gray-500">read-only · auto-flows to Cashflow</span>
                          </div>
                          <div className="text-xs text-gray-600">{contractMonths} months contract</div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8">#</TableHead>
                              <TableHead>Service / Bucket</TableHead>
                              <TableHead className="text-right w-28">Hours / Month</TableHead>
                              <TableHead className="text-right w-28">Hourly Rate</TableHead>
                              <TableHead className="text-right w-32">Billing / Month</TableHead>
                              <TableHead className="text-right w-32">Billing / Year</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {buckets.map((b, i) => {
                              const m = (parseFloat(b.hours_per_month) || 0) * (parseFloat(b.hourly_rate) || 0);
                              return (
                                <TableRow key={b.id || i} className="text-xs">
                                  <TableCell className="text-gray-400 font-mono">{i + 1}</TableCell>
                                  <TableCell className="font-medium">{b.name}</TableCell>
                                  <TableCell className="text-right font-mono">{b.hours_per_month}</TableCell>
                                  <TableCell className="text-right font-mono">${b.hourly_rate}</TableCell>
                                  <TableCell className="text-right font-mono text-[#8B5CF6]">${m.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                                  <TableCell className="text-right font-mono text-[#8B5CF6]">${(m * contractMonths).toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-purple-100/50 font-semibold text-xs">
                              <TableCell colSpan={4} className="text-right">Total</TableCell>
                              <TableCell className="text-right font-mono text-[#8B5CF6]" data-testid={`ams-recurring-monthly-${waveName}`}>${monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                              <TableCell className="text-right font-mono text-[#8B5CF6]" data-testid={`ams-recurring-annual-${waveName}`}>${annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                        <p className="text-[11px] text-gray-500 mt-2">Edit hours / rate from the wave grid (AMS Shared Support panel). This information is not part of the payment milestone schedule — it is billed automatically each month.</p>
                      </div>
                    );
                  })()}

                  {/* Payment Milestones Table */}
                  {paymentMilestones.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" /></svg>
                        Payment Milestones
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Milestone Name</TableHead>
                            <TableHead className="w-20 text-center">Advance</TableHead>
                            <TableHead className="w-32">Linked Phase</TableHead>
                            <TableHead className="w-28">Target Month</TableHead>
                            <TableHead className="w-28">Payment %</TableHead>
                            <TableHead className="text-right w-36">Payment Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentMilestones.map((ms, idx) => (
                            <TableRow key={ms.id} data-testid={`milestone-row-${ms.id}`}>
                              <TableCell className="font-mono text-gray-400">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input value={ms.milestone_name} onChange={(e) => updateMilestone(ms.id, "milestone_name", e.target.value)} className="w-48" data-testid={`ms-name-${ms.id}`} />
                                  {ms.is_advance && <span className="text-[10px] font-bold bg-[#8B5CF6]/10 text-[#8B5CF6] px-1.5 py-0.5 rounded uppercase tracking-wide">Adv</span>}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <input
                                  type="checkbox"
                                  checked={!!ms.is_advance}
                                  onChange={(e) => updateMilestone(ms.id, "is_advance", e.target.checked)}
                                  className="h-4 w-4 accent-[#8B5CF6] cursor-pointer"
                                  data-testid={`ms-advance-${ms.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Select value={ms.phase_name || "__none__"} onValueChange={(v) => {
                                  const actualValue = v === "__none__" ? "" : v;
                                  setMilestones(milestones.map(m => m.id === ms.id ? { ...m, phase_name: actualValue } : m));
                                }}>
                                  <SelectTrigger className="w-28" data-testid={`ms-phase-${ms.id}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">-- None --</SelectItem>
                                    {wavePhases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select value={ms.target_month || "M1"} onValueChange={(v) => {
                                  // Auto-derive position from target month + phase
                                  const monthNum = parseInt(v.replace("M", ""));
                                  const ph = (wave.phase_ranges || []).find(p => p.name === ms.phase_name);
                                  let position = ms.position || "end";
                                  if (ph) {
                                    if (monthNum <= Math.ceil(ph.start_month)) position = "start";
                                    else if (monthNum >= Math.ceil(ph.end_month)) position = "end";
                                    else position = "mid";
                                  }
                                  setMilestones(milestones.map(m => m.id === ms.id ? { ...m, target_month: v, position } : m));
                                }}>
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

                  {/* Marker Milestones Table */}
                  {markerMilestones.length > 0 && (
                    <div className="overflow-x-auto mb-4">
                      <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                        <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="1.5" /></svg>
                        Key Milestones (no payment linkage)
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Milestone Name</TableHead>
                            <TableHead className="w-32">Linked Phase</TableHead>
                            <TableHead className="w-40">Position on Bar</TableHead>
                            <TableHead className="w-20">Target</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {markerMilestones.map((ms, idx) => {
                            const posVal = (() => { const p = ms.position; if (p === "start") return 0; if (p === "mid") return 50; if (p === "end") return 100; return parseFloat(p) || 50; })();
                            return (
                            <TableRow key={ms.id} data-testid={`marker-row-${ms.id}`}>
                              <TableCell className="font-mono text-gray-400">{idx + 1}</TableCell>
                              <TableCell><Input value={ms.milestone_name} onChange={(e) => updateMilestone(ms.id, "milestone_name", e.target.value)} className="w-48" data-testid={`mk-name-${ms.id}`} /></TableCell>
                              <TableCell>
                                <Select value={ms.phase_name || "__none__"} onValueChange={(v) => {
                                  const actualValue = v === "__none__" ? "" : v;
                                  const ph = (wave.phase_ranges || []).find(p => p.name === actualValue);
                                  let targetMonth = ms.target_month;
                                  if (ph) {
                                    const monthFloat = ph.start_month + (ph.end_month - ph.start_month) * (posVal / 100);
                                    targetMonth = `M${Math.ceil(monthFloat)}`;
                                  }
                                  setMilestones(milestones.map(m => m.id === ms.id ? { ...m, phase_name: actualValue, target_month: targetMonth } : m));
                                }}>
                                  <SelectTrigger className="w-28" data-testid={`mk-phase-${ms.id}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">-- None --</SelectItem>
                                    {wavePhases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range" min="0" max="100" step="5"
                                    value={posVal}
                                    onChange={(e) => {
                                      const pct = parseInt(e.target.value);
                                      const ph = (wave.phase_ranges || []).find(p => p.name === ms.phase_name);
                                      let targetMonth = ms.target_month;
                                      if (ph) {
                                        const monthFloat = ph.start_month + (ph.end_month - ph.start_month) * (pct / 100);
                                        targetMonth = `M${Math.ceil(monthFloat)}`;
                                      }
                                      setMilestones(milestones.map(m => m.id === ms.id ? { ...m, position: String(pct), target_month: targetMonth } : m));
                                    }}
                                    className="h-1.5 flex-1 accent-blue-500 cursor-pointer"
                                    data-testid={`mk-slider-${ms.id}`}
                                  />
                                  <span className="text-[10px] font-mono text-blue-600 w-8 text-right">{posVal}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-gray-500 font-mono" data-testid={`mk-month-${ms.id}`}>{ms.target_month}</TableCell>
                              <TableCell><Input value={ms.description || ""} onChange={(e) => updateMilestone(ms.id, "description", e.target.value)} className="w-full" placeholder="Description..." data-testid={`mk-desc-${ms.id}`} /></TableCell>
                              <TableCell><Button variant="ghost" size="sm" onClick={() => removeMilestone(ms.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" data-testid={`mk-delete-${ms.id}`}><Trash2 className="w-4 h-4" /></Button></TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {!waveMilestones.length && <p className="text-sm text-gray-400 py-3 text-center">No milestones for this wave yet.</p>}
                  <div className="mt-3 flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => addMilestoneToWave(waveName, "payment")} className="text-amber-600 border-amber-300 hover:bg-amber-50" data-testid={`add-ms-${waveName}`}>
                      <Plus className="w-4 h-4 mr-1" /> Payment Milestone
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => addMilestoneToWave(waveName, "marker")} className="text-blue-600 border-blue-300 hover:bg-blue-50" data-testid={`add-marker-${waveName}`}>
                      <Plus className="w-4 h-4 mr-1" /> Key Milestone
                    </Button>
                    {waves.length > 1 && waveMilestones.length > 0 && (
                      <Select onValueChange={(targetWave) => copyMilestonesToWave(waveName, targetWave)}>
                        <SelectTrigger className="w-auto h-8 text-xs border-[#8B5CF6]/30 text-[#8B5CF6] px-3" data-testid={`copy-ms-${waveName}`}>
                          <Copy className="w-3.5 h-3.5 mr-1" /><span>Copy to Wave</span>
                        </SelectTrigger>
                        <SelectContent>
                          {waves.filter((w) => w.name !== waveName).map((w) => (
                            <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
