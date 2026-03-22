import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Upload, Trash2, Download, FileSpreadsheet } from "lucide-react";
import { useMemo, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import ExcelJS from "exceljs";
import { toast } from "sonner";
import { getPhaseColor } from "./constants";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Build gantt rows from wave phase_ranges data.
 * Each phase range becomes its own row with absolute month positioning.
 * Supports overlapping phases natively.
 */
const buildGanttRows = (waves) => {
  const rows = [];
  let maxMonth = 0;

  for (const w of waves) {
    const ranges = w.phase_ranges || [];
    if (ranges.length === 0) continue;
    const offset = (w.wave_start_month || 1) - 1;

    for (const pr of ranges) {
      const absStart = offset + (pr.start_month || 1) - 1;
      const absEnd = offset + (pr.end_month || pr.start_month || 1) - 1;
      rows.push({
        waveName: w.name,
        phase: pr.name,
        absStart,
        absEnd,
        color: getPhaseColor(pr.name),
      });
      if (absEnd + 1 > maxMonth) maxMonth = absEnd + 1;
    }
  }

  return { rows, maxMonth };
};

export const GanttCard = ({ projectId, waves, ganttChart, ganttLoading, ganttInputRef, handleGanttUpload, handleGanttDelete, isReadOnly, collapsedSections, toggleSection }) => {
  const { rows: ganttRows, maxMonth } = useMemo(() => {
    if (!waves || waves.length === 0) return { rows: [], maxMonth: 0 };
    return buildGanttRows(waves);
  }, [waves]);

  const chartRef = useRef(null);

  const waveGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    for (const row of ganttRows) {
      if (!seen.has(row.waveName)) {
        seen.add(row.waveName);
        groups.push({ waveName: row.waveName, rows: ganttRows.filter(r => r.waveName === row.waveName) });
      }
    }
    return groups;
  }, [ganttRows]);

  const handleExportPng = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "gantt-chart.png";
      link.href = dataUrl;
      link.click();
      toast.success("Gantt chart exported as PNG");
    } catch {
      toast.error("Failed to export image");
    }
  }, []);

  const handleExportExcel = useCallback(async () => {
    if (!waves || waveGroups.length === 0) return;
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Gantt Chart");

      // Header row: blank + month labels
      const headerRow = ["Wave", "Phase"];
      for (let i = 0; i < maxMonth; i++) headerRow.push(`M${i + 1}`);
      ws.addRow(headerRow);
      const hRow = ws.getRow(1);
      hRow.font = { bold: true, size: 10 };
      hRow.alignment = { horizontal: "center" };
      for (let c = 3; c <= maxMonth + 2; c++) {
        hRow.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
        hRow.getCell(c).border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
      }

      for (const wg of waveGroups) {
        const wave = waves.find(w => w.name === wg.waveName);
        const desc = wave?.description ? ` (${wave.description})` : "";
        // Wave separator row
        const sepRow = ws.addRow([`${wg.waveName}${desc}`]);
        sepRow.font = { bold: true, size: 11 };
        ws.mergeCells(sepRow.number, 1, sepRow.number, maxMonth + 2);
        sepRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        sepRow.getCell(1).border = { top: { style: "medium", color: { argb: "FF94A3B8" } } };

        for (const row of wg.rows) {
          const dataRow = ["", row.phase];
          const argb = row.color.bg.replace("#", "FF");
          const borderArgb = row.color.border.replace("#", "FF");
          for (let m = 0; m < maxMonth; m++) {
            if (m >= row.absStart && m <= row.absEnd) {
              dataRow.push(row.phase);
            } else {
              dataRow.push("");
            }
          }
          const xlRow = ws.addRow(dataRow);
          xlRow.font = { size: 9 };
          xlRow.alignment = { horizontal: "center" };
          // Color the phase cells
          for (let m = 0; m < maxMonth; m++) {
            const cell = xlRow.getCell(m + 3);
            if (m >= row.absStart && m <= row.absEnd) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
              cell.font = { bold: true, size: 9, color: { argb: row.color.text.replace("#", "FF") } };
              cell.border = {
                top: { style: "thin", color: { argb: borderArgb } },
                bottom: { style: "thin", color: { argb: borderArgb } },
                left: m === row.absStart ? { style: "medium", color: { argb: borderArgb } } : undefined,
                right: m === row.absEnd ? { style: "medium", color: { argb: borderArgb } } : undefined,
              };
            }
          }
        }
      }

      // Auto-width columns
      ws.getColumn(1).width = 16;
      ws.getColumn(2).width = 14;
      for (let c = 3; c <= maxMonth + 2; c++) ws.getColumn(c).width = 12;

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const link = document.createElement("a");
      link.download = "gantt-chart.xlsx";
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success("Gantt chart exported as Excel");
    } catch {
      toast.error("Failed to export Excel");
    }
  }, [waves, waveGroups, maxMonth]);

  if (!projectId) return null;
  const hasAutoGantt = ganttRows.length > 0;

  return (
    <Card className="border border-[#E2E8F0] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer select-none" onClick={() => toggleSection("gantt")}>
        <div className="flex items-center gap-2">
          {collapsedSections.gantt ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          <CardTitle className="text-lg font-bold text-[#0F172A]">Timeline / Gantt Chart</CardTitle>
          {hasAutoGantt && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Auto-generated</span>}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {hasAutoGantt && (
            <>
              <Button variant="outline" size="sm" onClick={handleExportPng} className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" data-testid="export-gantt-png">
                <Download className="w-4 h-4 mr-1" /> PNG
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-[#6366F1] border-[#6366F1]/30 hover:bg-[#6366F1]/5" data-testid="export-gantt-excel">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
              </Button>
            </>
          )}
          {!isReadOnly && (
            <>
              <input type="file" ref={ganttInputRef} accept="image/*" onChange={handleGanttUpload} className="hidden" />
              <Button variant="outline" size="sm" onClick={() => ganttInputRef.current?.click()} disabled={ganttLoading} data-testid="upload-gantt-btn">
                <Upload className="w-4 h-4 mr-1" /> {ganttLoading ? "Uploading..." : "Upload Image"}
              </Button>
              {ganttChart && (
                <Button variant="outline" size="sm" className="text-red-500 border-red-300" onClick={handleGanttDelete} data-testid="delete-gantt-btn">
                  <Trash2 className="w-4 h-4 mr-1" /> Remove
                </Button>
              )}
            </>
          )}
        </div>
      </CardHeader>
      {!collapsedSections.gantt && (
      <CardContent className="space-y-6">
        {/* Auto-generated Staircase Gantt Chart */}
        {hasAutoGantt && (
          <div ref={chartRef} data-testid="auto-gantt-chart" className="p-4 bg-white">
            <p className="text-xs text-gray-500 mb-4">Generated from phase assignments. Each phase step-down represents a new project phase across the timeline.</p>
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(600, maxMonth * 70) }}>
                {/* Month Header */}
                <div className="flex ml-[140px]">
                  {Array.from({ length: maxMonth }, (_, i) => (
                    <div key={i} className="flex-1 text-center text-[10px] font-mono text-gray-500 border-l border-gray-200 pb-1" style={{ minWidth: 50 }}>
                      M{i + 1}
                    </div>
                  ))}
                </div>

                {/* Wave Groups with Staircase Rows */}
                {waveGroups.map((wg, wgIdx) => {
                  const wave = waves.find(w => w.name === wg.waveName);
                  const startMonth = wave?.wave_start_month || 1;
                  const description = wave?.description || "";
                  const totalRows = wg.rows.length;
                  const midIdx = Math.floor(totalRows / 2);
                  return (
                    <div key={wg.waveName} className={wgIdx > 0 ? "mt-3 pt-3 border-t-2 border-[#CBD5E1]" : ""}>
                      {/* Wave header bar */}
                      <div className="flex items-center h-7 mb-1 rounded bg-[#F1F5F9]">
                        <div className="w-[140px] pr-2 text-right shrink-0">
                          <span className="text-[11px] font-bold text-[#0F172A]">{wg.waveName}</span>
                          {startMonth > 1 && <span className="text-[9px] text-[#6366F1] ml-1 font-medium">(from M{startMonth})</span>}
                        </div>
                        <div className="flex-1 flex items-center px-2">
                          <div className="h-px flex-1 bg-[#CBD5E1]" />
                          {description && <span className="text-[10px] text-gray-500 italic px-2 whitespace-nowrap">{description}</span>}
                          {description && <div className="h-px flex-1 bg-[#CBD5E1]" />}
                        </div>
                      </div>

                      {/* Phase rows - one per unique phase (staircase) */}
                      {wg.rows.map((row, rIdx) => (
                        <div key={rIdx} className="flex items-center h-8 group" data-testid={`gantt-row-${row.phase}`}>
                          {/* Phase label + wave description in center row */}
                          <div className="w-[140px] pr-2 text-right shrink-0">
                            {rIdx === midIdx && description ? (
                              <span className="text-[9px] text-gray-400 italic block leading-tight mb-0.5">{description}</span>
                            ) : null}
                            <span className="text-[10px] font-medium text-gray-600 truncate">{row.phase}</span>
                            <span className="text-[9px] text-gray-400 ml-1">M{row.absStart + 1}{row.absEnd > row.absStart ? `–M${row.absEnd + 1}` : ""}</span>
                          </div>
                          {/* Bar track */}
                          <div className="flex-1 relative h-7 bg-gray-50/50">
                            {/* Grid lines */}
                            {Array.from({ length: maxMonth }, (_, i) => (
                              <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(i / maxMonth) * 100}%` }} />
                            ))}
                            {/* Phase bar */}
                            <div
                              className="absolute top-0.5 bottom-0.5 rounded-md flex items-center justify-center transition-all group-hover:shadow-md"
                              style={{
                                left: `${(row.absStart / maxMonth) * 100}%`,
                                width: `${((row.absEnd - row.absStart + 1) / maxMonth) * 100}%`,
                                backgroundColor: row.color.bg,
                                border: `2px solid ${row.color.border}`,
                              }}
                              data-testid={`gantt-bar-${row.phase}`}
                            >
                              <span className="text-[10px] font-semibold truncate px-1" style={{ color: row.color.text }}>
                                {row.phase}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100">
              {[...new Set(ganttRows.map(r => r.phase))].map(phase => {
                const color = getPhaseColor(phase);
                return (
                  <div key={phase} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color.bg, border: `1.5px solid ${color.border}` }} />
                    <span className="text-[10px] font-medium" style={{ color: color.text }}>{phase}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Uploaded Image */}
        {ganttChart ? (
          <div className="relative">
            {hasAutoGantt && <p className="text-xs font-medium text-gray-500 mb-2 mt-2">Uploaded Timeline Image</p>}
            <img src={`${API}/projects/${projectId}/gantt?t=${ganttChart.uploaded_at}`} alt="Gantt Chart" className="w-full rounded-lg border border-gray-200 max-h-[500px] object-contain" data-testid="gantt-image" />
            <p className="text-xs text-gray-400 mt-2">{ganttChart.filename} — uploaded {new Date(ganttChart.uploaded_at).toLocaleDateString()}</p>
          </div>
        ) : !hasAutoGantt ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No timeline data yet.</p>
            {!isReadOnly && <p className="text-xs mt-1">Assign phases to months in the wave grid, or upload a Gantt chart image.</p>}
          </div>
        ) : null}
      </CardContent>
      )}
    </Card>
  );
};
