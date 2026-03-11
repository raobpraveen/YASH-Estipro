import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, FileDown, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CashflowStatement = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");

  const [cashflow, setCashflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) fetchCashflow();
  }, [projectId]);

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

  const exportToExcel = async () => {
    if (!cashflow) return;
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "YASH EstiPro";
      const ws = wb.addWorksheet("Cashflow Statement");

      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      const redFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      const moneyFmt = "#,##0.00";

      // Title
      ws.addRow([`${cashflow.project_number} — Cashflow Statement`]).font = { bold: true, size: 14 };
      ws.addRow([`Project: ${cashflow.project_name}`]).font = { size: 11, color: { argb: "FF6B7280" } };
      ws.addRow([]);

      // Headers
      const hRow = ws.addRow(["Month", "Phase", "Cost (Outflow)", "Revenue (Inflow)", "Net", "Cumulative"]);
      hRow.eachCell((c) => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
      ws.columns = [{ width: 10 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }];

      // Data
      for (const m of cashflow.monthly_data) {
        const r = ws.addRow([m.month, m.phase || "", m.cost, m.revenue, m.net, m.cumulative]);
        r.getCell(3).numFmt = moneyFmt;
        r.getCell(4).numFmt = moneyFmt;
        r.getCell(5).numFmt = moneyFmt;
        r.getCell(6).numFmt = moneyFmt;
        r.eachCell((c) => { c.border = thinBorder; });
        if (m.net > 0) { r.getCell(5).fill = greenFill; }
        else if (m.net < 0) { r.getCell(5).fill = redFill; }
      }

      // Totals
      ws.addRow([]);
      const totRow = ws.addRow(["", "TOTALS", cashflow.summary.total_cost, cashflow.summary.total_revenue, cashflow.summary.net_cashflow, ""]);
      totRow.font = { bold: true };
      totRow.getCell(3).numFmt = moneyFmt;
      totRow.getCell(4).numFmt = moneyFmt;
      totRow.getCell(5).numFmt = moneyFmt;
      totRow.eachCell((c) => { c.border = thinBorder; });

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

  if (!projectId) {
    return (
      <div className="text-center py-20" data-testid="no-project-selected">
        <p className="text-gray-500 text-lg">No project selected.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div></div>;
  }

  if (!cashflow) {
    return <div className="text-center py-20"><p className="text-gray-500">No cashflow data available.</p></div>;
  }

  const { summary, monthly_data } = cashflow;

  return (
    <div data-testid="cashflow-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Cashflow Statement</h1>
            <p className="text-sm text-gray-600 mt-1">{cashflow.project_number} — {cashflow.project_name}</p>
          </div>
        </div>
        <Button onClick={exportToExcel} variant="outline" className="border-[#10B981] text-[#10B981]" data-testid="export-cashflow-btn">
          <FileDown className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <p className="text-sm text-gray-500">Total Outflow (Costs)</p>
            </div>
            <p className="text-2xl font-bold text-red-600" data-testid="total-cost">${summary.total_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#10B981]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#10B981]" />
              <p className="text-sm text-gray-500">Total Inflow (Revenue)</p>
            </div>
            <p className="text-2xl font-bold text-[#10B981]" data-testid="total-revenue">${summary.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${summary.net_cashflow >= 0 ? "border-l-[#0EA5E9]" : "border-l-[#F59E0B]"}`}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#0EA5E9]" />
              <p className="text-sm text-gray-500">Net Cashflow</p>
            </div>
            <p className={`text-2xl font-bold ${summary.net_cashflow >= 0 ? "text-[#0EA5E9]" : "text-[#F59E0B]"}`} data-testid="net-cashflow">
              ${summary.net_cashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {monthly_data.length === 0 ? (
        <Card className="border border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No monthly data available. Add waves and resources to your project.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-[#0F172A]">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Month</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead className="text-right">Cost (Outflow)</TableHead>
                    <TableHead className="text-right">Revenue (Inflow)</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthly_data.map((m, idx) => (
                    <TableRow key={idx} data-testid={`cashflow-row-${idx}`}>
                      <TableCell className="font-mono">{m.month}</TableCell>
                      <TableCell className="text-gray-600">{m.phase || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">${m.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right font-mono text-[#10B981]">${m.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${m.net >= 0 ? "text-[#10B981]" : "text-red-600"}`}>
                        ${m.net.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${m.cumulative >= 0 ? "text-[#0EA5E9]" : "text-[#F59E0B]"}`}>
                        ${m.cumulative.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 bg-[#F8FAFC] font-bold">
                    <TableCell></TableCell>
                    <TableCell className="font-bold text-[#0F172A]">TOTALS</TableCell>
                    <TableCell className="text-right font-mono text-red-600">${summary.total_cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right font-mono text-[#10B981]">${summary.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className={`text-right font-mono ${summary.net_cashflow >= 0 ? "text-[#10B981]" : "text-red-600"}`}>
                      ${summary.net_cashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Visual bar chart representation */}
            <div className="mt-8">
              <h3 className="font-semibold text-[#0F172A] mb-4">Monthly Cash Flow Visualization</h3>
              <div className="space-y-2">
                {monthly_data.map((m, idx) => {
                  const maxVal = Math.max(...monthly_data.map((d) => Math.max(d.cost, d.revenue, 1)));
                  const costWidth = (m.cost / maxVal) * 100;
                  const revWidth = (m.revenue / maxVal) * 100;
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-right font-mono text-gray-500">M{m.month}</span>
                      <div className="flex-1 flex gap-1">
                        <div className="h-4 bg-red-400 rounded-sm transition-all" style={{ width: `${costWidth}%` }} title={`Cost: $${m.cost.toLocaleString()}`}></div>
                      </div>
                      <div className="flex-1 flex gap-1">
                        <div className="h-4 bg-emerald-400 rounded-sm transition-all" style={{ width: `${revWidth}%` }} title={`Revenue: $${m.revenue.toLocaleString()}`}></div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm inline-block"></span> Cost (Outflow)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-400 rounded-sm inline-block"></span> Revenue (Inflow)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CashflowStatement;
