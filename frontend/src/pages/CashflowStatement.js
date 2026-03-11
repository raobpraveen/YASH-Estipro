import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileDown, TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronRight, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const fmt = (v) => `$${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CashflowStatement = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");

  const [cashflow, setCashflow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsedWaves, setCollapsedWaves] = useState({});

  // Project list state
  const [projects, setProjects] = useState([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchCashflow();
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
      // Show only projects that have waves with allocations
      const allProjects = (res.data || []).filter(
        (p) => p.waves && p.waves.some((w) => (w.grid_allocations || []).length > 0)
      );
      setProjects(allProjects);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchCashflow = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/${projectId}/cashflow`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCashflow(res.data);
    } catch {
      toast.error("Failed to load cashflow data");
    } finally {
      setLoading(false);
    }
  };

  const toggleWave = (name) => setCollapsedWaves((p) => ({ ...p, [name]: !p[name] }));

  const exportToExcel = async () => {
    if (!cashflow) return;
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "YASH EstiPro";
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const waveFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      const redFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      const moneyFmt = "#,##0.00";

      // Per-wave sheets
      const waveSheetRefs = [];
      for (const wd of cashflow.wave_data || []) {
        const safeName = wd.wave_name.substring(0, 31);
        const ws = wb.addWorksheet(safeName);
        ws.columns = [{ width: 10 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }];
        ws.addRow([`${wd.wave_name} — Cashflow`]).font = { bold: true, size: 13 };
        ws.addRow([]);
        const hRow = ws.addRow(["Month", "Phase", "Cash-Out (Cost)", "Cash-In (Revenue)", "Net"]);
        hRow.eachCell((c) => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
        const dataStart = 4;
        const costCells = [];
        const revCells = [];
        wd.monthly_data.forEach((m, idx) => {
          const rn = dataStart + idx;
          const r = ws.addRow([`M${m.month}`, m.phase || "", m.cost, m.revenue, { formula: `D${rn}-C${rn}`, result: m.revenue - m.cost }]);
          r.getCell(3).numFmt = moneyFmt;
          r.getCell(4).numFmt = moneyFmt;
          r.getCell(5).numFmt = moneyFmt;
          r.eachCell((c) => { c.border = thinBorder; });
          if ((m.revenue - m.cost) >= 0) r.getCell(5).fill = greenFill; else r.getCell(5).fill = redFill;
          costCells.push(`C${rn}`);
          revCells.push(`D${rn}`);
        });
        ws.addRow([]);
        const totRn = dataStart + wd.monthly_data.length + 1;
        const totRow = ws.addRow(["", "TOTAL", { formula: `SUM(C${dataStart}:C${totRn - 2})`, result: wd.total_cost }, { formula: `SUM(D${dataStart}:D${totRn - 2})`, result: wd.total_revenue }, { formula: `D${totRn}-C${totRn}`, result: wd.net }]);
        totRow.font = { bold: true };
        totRow.getCell(3).numFmt = moneyFmt;
        totRow.getCell(4).numFmt = moneyFmt;
        totRow.getCell(5).numFmt = moneyFmt;
        totRow.eachCell((c) => { c.fill = waveFill; c.border = thinBorder; });
        waveSheetRefs.push({ name: safeName, dataStart, rows: wd.monthly_data.length });
      }

      // Combined Summary sheet
      const sws = wb.addWorksheet("Combined Summary");
      sws.columns = [{ width: 10 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];
      sws.addRow([`${cashflow.project_number} — Combined Cashflow Statement`]).font = { bold: true, size: 14 };
      sws.addRow([`Project: ${cashflow.project_name}`]).font = { size: 11, color: { argb: "FF6B7280" } };
      sws.addRow([]);
      const shRow = sws.addRow(["Month", "Phase", "Cash-Out (Cost)", "Cash-In (Revenue)", "Net", "Cumulative"]);
      shRow.eachCell((c) => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
      const sDataStart = 5;
      (cashflow.combined_data || []).forEach((m, idx) => {
        const rn = sDataStart + idx;
        // Build SUM formulas across wave sheets for this month
        const costParts = [];
        const revParts = [];
        for (const ref of waveSheetRefs) {
          if (idx < ref.rows) {
            costParts.push(`'${ref.name}'!C${ref.dataStart + idx}`);
            revParts.push(`'${ref.name}'!D${ref.dataStart + idx}`);
          }
        }
        const costFormula = costParts.length > 0 ? costParts.join("+") : "0";
        const revFormula = revParts.length > 0 ? revParts.join("+") : "0";
        const prevCumCell = idx > 0 ? `F${rn - 1}` : "0";
        const r = sws.addRow([
          `M${m.month}`,
          m.phase || "",
          { formula: costFormula, result: m.cost },
          { formula: revFormula, result: m.revenue },
          { formula: `D${rn}-C${rn}`, result: m.net },
          { formula: `${prevCumCell}+E${rn}`, result: m.cumulative },
        ]);
        r.getCell(3).numFmt = moneyFmt;
        r.getCell(4).numFmt = moneyFmt;
        r.getCell(5).numFmt = moneyFmt;
        r.getCell(6).numFmt = moneyFmt;
        r.eachCell((c) => { c.border = thinBorder; });
        if (m.net >= 0) r.getCell(5).fill = greenFill; else r.getCell(5).fill = redFill;
      });
      sws.addRow([]);
      const cd = cashflow.combined_data || [];
      const sLastRow = sDataStart + cd.length - 1;
      const stRow = sws.addRow(["", "TOTALS", { formula: `SUM(C${sDataStart}:C${sLastRow})`, result: cashflow.summary.total_cost }, { formula: `SUM(D${sDataStart}:D${sLastRow})`, result: cashflow.summary.total_revenue }, { formula: `SUM(E${sDataStart}:E${sLastRow})`, result: cashflow.summary.net_cashflow }, ""]);
      stRow.font = { bold: true };
      stRow.getCell(3).numFmt = moneyFmt;
      stRow.getCell(4).numFmt = moneyFmt;
      stRow.getCell(5).numFmt = moneyFmt;
      stRow.eachCell((c) => { c.fill = waveFill; c.border = thinBorder; });

      const buffer = await wb.xlsx.writeBuffer();
      const fileName = `${cashflow.project_number || "Project"}_Cashflow.xlsx`;
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
      toast.success("Cashflow exported to Excel");
    } catch (err) {
      toast.error("Export failed: " + (err.message || "Unknown error"));
    }
  };

  // ========== PROJECT LIST VIEW ==========
  if (!projectId) {
    const filtered = projects.filter((p) =>
      (p.name || "").toLowerCase().includes(projectSearch.toLowerCase()) ||
      (p.project_number || "").toLowerCase().includes(projectSearch.toLowerCase())
    );

    return (
      <div data-testid="cashflow-project-list">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Cashflow Statement</h1>
          <p className="text-sm text-gray-600 mt-1">Select a project to view cashflow data</p>
        </div>
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search projects..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="pl-10" data-testid="cashflow-project-search" />
        </div>
        {loadingProjects ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div></div>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed"><CardContent className="py-12 text-center"><p className="text-gray-500">No projects with resource data found.</p></CardContent></Card>
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
                    <TableHead className="w-28 text-center">Resources</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const totalRes = (p.waves || []).reduce((s, w) => s + (w.grid_allocations || []).length, 0);
                    return (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-[#F8FAFC] transition-colors" onClick={() => navigate(`/cashflow?project=${p.id}`)} data-testid={`cashflow-project-row-${p.id}`}>
                        <TableCell className="font-mono text-[#0EA5E9] text-sm">{p.project_number}</TableCell>
                        <TableCell className="font-medium text-[#0F172A]">{p.name}</TableCell>
                        <TableCell className="text-center text-gray-500">v{p.version}</TableCell>
                        <TableCell className="text-center text-gray-500">{p.waves?.length || 0}</TableCell>
                        <TableCell className="text-center"><span className="text-xs bg-[#0EA5E9]/10 text-[#0EA5E9] font-semibold px-2 py-0.5 rounded-full">{totalRes}</span></TableCell>
                        <TableCell><Button variant="ghost" size="sm" className="text-[#0EA5E9]">Open</Button></TableCell>
                      </TableRow>
                    );
                  })}
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

  if (!cashflow) return <div className="text-center py-20"><p className="text-gray-500">No cashflow data available.</p></div>;

  const { summary, wave_data, combined_data } = cashflow;

  return (
    <div data-testid="cashflow-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/cashflow")} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-1" /> All Projects
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Cashflow Statement</h1>
            <p className="text-sm text-gray-600 mt-1">{cashflow.project_number} — {cashflow.project_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/estimator?project=${projectId}`)} className="border-[#0F172A] text-[#0F172A]" data-testid="open-estimator-btn">
            <ExternalLink className="w-4 h-4 mr-1" /> Open Estimator
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="border-[#10B981] text-[#10B981]" data-testid="export-cashflow-btn">
            <FileDown className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500">Total Cash-Out (Costs)</p>
            </div>
            <p className="text-2xl font-bold text-red-600" data-testid="total-cost">{fmt(summary.total_cost)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#10B981]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-500">Total Cash-In (Revenue)</p>
            </div>
            <p className="text-2xl font-bold text-[#10B981]" data-testid="total-revenue">{fmt(summary.total_revenue)}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${summary.net_cashflow >= 0 ? "border-l-[#0EA5E9]" : "border-l-[#F59E0B]"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#0EA5E9]" />
              <p className="text-sm text-gray-500">Net Cashflow</p>
            </div>
            <p className={`text-2xl font-bold ${summary.net_cashflow >= 0 ? "text-[#0EA5E9]" : "text-[#F59E0B]"}`} data-testid="net-cashflow">{fmt(summary.net_cashflow)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Wave Breakdown Sections */}
      <div className="space-y-4 mb-6">
        {(wave_data || []).map((wd) => {
          const isCollapsed = collapsedWaves[wd.wave_name] ?? false;
          return (
            <Card key={wd.wave_name} className="border border-[#E2E8F0] shadow-sm" data-testid={`cashflow-wave-${wd.wave_name}`}>
              <CardHeader className="flex flex-row items-center justify-between py-3 px-5 cursor-pointer select-none hover:bg-gray-50/50 transition-colors" onClick={() => toggleWave(wd.wave_name)}>
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  <CardTitle className="text-lg font-bold text-[#0F172A]">{wd.wave_name}</CardTitle>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{wd.months} months</span>
                </div>
                <div className="flex items-center gap-5 text-sm" onClick={(e) => e.stopPropagation()}>
                  <span className="text-red-500">Out: <span className="font-semibold">{fmt(wd.total_cost)}</span></span>
                  <span className="text-[#10B981]">In: <span className="font-semibold">{fmt(wd.total_revenue)}</span></span>
                  <span className={`font-semibold ${wd.net >= 0 ? "text-[#0EA5E9]" : "text-[#F59E0B]"}`}>Net: {fmt(wd.net)}</span>
                </div>
              </CardHeader>
              {!isCollapsed && (
                <CardContent className="pt-0 pb-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">Month</TableHead>
                          <TableHead>Phase</TableHead>
                          <TableHead className="text-right">Cash-Out (Cost)</TableHead>
                          <TableHead className="text-right">Cash-In (Revenue)</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wd.monthly_data.map((m, idx) => {
                          const net = m.revenue - m.cost;
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono">M{m.month}</TableCell>
                              <TableCell className="text-gray-600">{m.phase || "—"}</TableCell>
                              <TableCell className="text-right font-mono text-red-600">{fmt(m.cost)}</TableCell>
                              <TableCell className="text-right font-mono text-[#10B981]">{fmt(m.revenue)}</TableCell>
                              <TableCell className={`text-right font-mono font-semibold ${net >= 0 ? "text-[#10B981]" : "text-red-600"}`}>{fmt(net)}</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="border-t-2 bg-[#F8FAFC] font-bold">
                          <TableCell></TableCell>
                          <TableCell className="font-bold">TOTAL</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{fmt(wd.total_cost)}</TableCell>
                          <TableCell className="text-right font-mono text-[#10B981]">{fmt(wd.total_revenue)}</TableCell>
                          <TableCell className={`text-right font-mono font-bold ${wd.net >= 0 ? "text-[#10B981]" : "text-red-600"}`}>{fmt(wd.net)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Combined Summary Section */}
      {(combined_data || []).length > 0 && (
        <Card className="border-2 border-[#0F172A]/20 shadow-md" data-testid="cashflow-combined">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-[#0F172A]">Combined Monthly Summary</CardTitle>
            <p className="text-xs text-gray-500">Sum of all waves per month (M1 of Wave 1 + M1 of Wave 2 + ...)</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Month</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead className="text-right">Cash-Out (Cost)</TableHead>
                    <TableHead className="text-right">Cash-In (Revenue)</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combined_data.map((m, idx) => (
                    <TableRow key={idx} data-testid={`combined-row-${idx}`}>
                      <TableCell className="font-mono">M{m.month}</TableCell>
                      <TableCell className="text-gray-600">{m.phase || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">{fmt(m.cost)}</TableCell>
                      <TableCell className="text-right font-mono text-[#10B981]">{fmt(m.revenue)}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${m.net >= 0 ? "text-[#10B981]" : "text-red-600"}`}>{fmt(m.net)}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${m.cumulative >= 0 ? "text-[#0EA5E9]" : "text-[#F59E0B]"}`}>{fmt(m.cumulative)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 bg-[#F8FAFC] font-bold">
                    <TableCell></TableCell>
                    <TableCell className="font-bold text-[#0F172A]">TOTALS</TableCell>
                    <TableCell className="text-right font-mono text-red-600">{fmt(summary.total_cost)}</TableCell>
                    <TableCell className="text-right font-mono text-[#10B981]">{fmt(summary.total_revenue)}</TableCell>
                    <TableCell className={`text-right font-mono ${summary.net_cashflow >= 0 ? "text-[#10B981]" : "text-red-600"}`}>{fmt(summary.net_cashflow)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Recharts Visualization */}
            <div className="mt-8">
              <h3 className="font-semibold text-[#0F172A] mb-4">Monthly Cash Flow Visualization</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={combined_data.map((m) => ({
                      name: `M${m.month}`,
                      "Cash-Out": m.cost,
                      "Cash-In": m.revenue,
                      Net: m.net,
                      Cumulative: m.cumulative,
                    }))}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`}
                    />
                    <Tooltip
                      formatter={(value, name) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name]}
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: 8, border: "none", color: "#fff", fontSize: 12 }}
                      labelStyle={{ color: "#94A3B8", marginBottom: 4 }}
                      itemStyle={{ color: "#F8FAFC" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                    <Bar dataKey="Cash-Out" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Cash-In" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Net & Cumulative line area */}
              <div className="mt-6 h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={combined_data.map((m) => ({
                      name: `M${m.month}`,
                      Net: m.net,
                      Cumulative: m.cumulative,
                    }))}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : v <= -1000 ? `-$${(Math.abs(v) / 1000).toFixed(0)}K` : `$${v}`}
                    />
                    <Tooltip
                      formatter={(value, name) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, name]}
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: 8, border: "none", color: "#fff", fontSize: 12 }}
                      labelStyle={{ color: "#94A3B8", marginBottom: 4 }}
                      itemStyle={{ color: "#F8FAFC" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#94A3B8" strokeDasharray="3 3" />
                    <Bar dataKey="Net" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="Cumulative" fill="#0EA5E9" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CashflowStatement;
