import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Upload, Image, Trash2, Download, FileSpreadsheet } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import { useRef } from "react";

const API = process.env.REACT_APP_BACKEND_URL;

const PHASE_COLORS = {
  Prepare:   { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  Explore:   { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  Realize:   { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  Deploy:    { bg: "#FCE7F3", text: "#9D174D", border: "#F9A8D4" },
  "Go-live": { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  Hypercare: { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
  Design:    { bg: "#E0E7FF", text: "#3730A3", border: "#A5B4FC" },
  Build:     { bg: "#CCFBF1", text: "#134E4A", border: "#5EEAD4" },
  Test:      { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  UAT:       { bg: "#F3E8FF", text: "#6B21A8", border: "#D8B4FE" },
  Support:   { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" },
};
const DEFAULT_COLOR = { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" };
const getPhaseColor = (name) => PHASE_COLORS[name] || DEFAULT_COLOR;

/**
 * Build gantt rows from wave phase_ranges data.
 * Supports half-month precision (float start/end values).
 */
const buildGanttRows = (waves) => {
  const rows = [];
  let maxMonth = 0;

  for (const w of waves) {
    const ranges = w.phase_ranges || [];
    if (ranges.length === 0) continue;
    const offset = (w.wave_start_month || 1) - 1;

    for (const pr of ranges) {
      const startVal = pr.start_month || 1;
      const endVal = pr.end_month || startVal;
      const absStart = offset + startVal - 1;
      const absEnd = offset + endVal;
      rows.push({
        waveName: w.name,
        waveId: w.id,
        phase: pr.name,
        absStart,
        absEnd,
        startLabel: startVal,
        endLabel: endVal,
        color: getPhaseColor(pr.name),
      });
      if (absEnd > maxMonth) maxMonth = absEnd;
    }
  }

  maxMonth = Math.ceil(maxMonth);
  return { rows, maxMonth };
};

/**
 * Build milestone markers from PaymentMilestones data.
 * Each milestone has a wave_name and target_month (e.g., "M3").
 */
const buildMilestoneMarkers = (milestones, waves) => {
  const markers = [];
  for (const ms of milestones) {
    const wave = waves.find(w => w.name === ms.wave_name);
    if (!wave) continue;
    const offset = (wave.wave_start_month || 1) - 1;
    const monthNum = parseInt(ms.target_month?.replace("M", "") || "0");
    if (!monthNum) continue;
    // Position: center of the target month
    const absPos = offset + monthNum - 0.5;
    markers.push({
      waveName: ms.wave_name,
      name: ms.milestone_name,
      absPos,
      month: ms.target_month,
      percentage: ms.payment_percentage,
      amount: ms.payment_amount,
    });
  }
  return markers;
};

/**
 * Build dependency arrows from wave phase_dependencies.
 * Each dependency: { from_phase, to_phase, type: "FS" }
 */
const buildDependencyArrows = (waves, rows) => {
  const arrows = [];
  for (const w of waves) {
    const deps = w.phase_dependencies || [];
    for (const dep of deps) {
      const fromRow = rows.find(r => r.waveName === w.name && r.phase === dep.from_phase);
      const toRow = rows.find(r => r.waveName === w.name && r.phase === dep.to_phase);
      if (fromRow && toRow) {
        arrows.push({
          fromPhase: dep.from_phase,
          toPhase: dep.to_phase,
          fromEnd: fromRow.absEnd,
          toStart: toRow.absStart,
          fromIdx: rows.indexOf(fromRow),
          toIdx: rows.indexOf(toRow),
          waveName: w.name,
        });
      }
    }
  }
  return arrows;
};

export const GanttCard = ({
  projectId, waves, setWaves, milestones = [], ganttChart, ganttLoading,
  ganttInputRef, handleGanttUpload, handleGanttDelete,
  isReadOnly, collapsedSections, toggleSection,
}) => {
  const chartRef = useRef(null);
  const { rows, maxMonth } = buildGanttRows(waves);
  const milestoneMarkers = buildMilestoneMarkers(milestones, waves);
  const dependencyArrows = buildDependencyArrows(waves, rows);

  // Group rows by wave
  const waveGroups = [];
  let lastWave = null;
  for (const row of rows) {
    if (row.waveName !== lastWave) {
      waveGroups.push({ waveName: row.waveName, rows: [row] });
      lastWave = row.waveName;
    } else {
      waveGroups[waveGroups.length - 1].rows.push(row);
    }
  }

  const ROW_H = 32; // Height of each phase row in px
  const LABEL_W = 140; // Left label column width

  const exportGanttPNG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, backgroundColor: "#FFFFFF" });
      canvas.toBlob(blob => { if (blob) saveAs(blob, "gantt-chart.png"); });
    } catch (e) { console.error("PNG export failed:", e); }
  };

  const exportGanttExcel = async () => {
    if (rows.length === 0) return;
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Gantt Chart");
      const thinBorder = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };

      // Header row
      const headerData = ["Wave", "Phase"];
      for (let m = 1; m <= maxMonth; m++) headerData.push(`M${m}`);
      const headerRow = ws.addRow(headerData);
      headerRow.font = { bold: true, size: 10 };
      headerRow.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }; c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.border = thinBorder; });

      // Phase data rows
      for (const wg of waveGroups) {
        const wave = waves.find(w => w.name === wg.waveName);
        const desc = wave?.description ? ` (${wave.description})` : "";
        const sepRow = ws.addRow([`${wg.waveName}${desc}`]);
        sepRow.font = { bold: true, size: 11 };
        ws.mergeCells(sepRow.number, 1, sepRow.number, maxMonth + 2);
        sepRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        sepRow.getCell(1).border = { top: { style: "medium", color: { argb: "FF94A3B8" } } };

        for (const row of wg.rows) {
          const dataRow = ["", row.phase];
          for (let m = 0; m < maxMonth; m++) dataRow.push("");
          const argb = row.color.bg.replace("#", "FF");
          const borderArgb = row.color.border.replace("#", "FF");
          const xlRow = ws.addRow(dataRow);
          xlRow.font = { size: 9 };
          xlRow.alignment = { horizontal: "center" };
          const cellStart = Math.floor(row.absStart);
          const cellEnd = Math.ceil(row.absEnd) - 1;
          for (let m = cellStart; m <= cellEnd && m < maxMonth; m++) {
            const cell = xlRow.getCell(m + 3);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
            cell.value = row.phase;
            cell.font = { bold: true, size: 9, color: { argb: row.color.text.replace("#", "FF") } };
            cell.border = {
              top: { style: "thin", color: { argb: borderArgb } },
              bottom: { style: "thin", color: { argb: borderArgb } },
              left: m === cellStart ? { style: "medium", color: { argb: borderArgb } } : undefined,
              right: m === cellEnd ? { style: "medium", color: { argb: borderArgb } } : undefined,
            };
          }
        }
      }

      // Milestones section
      if (milestoneMarkers.length > 0) {
        ws.addRow([]);
        const msHdr = ws.addRow(["MILESTONES"]);
        msHdr.font = { bold: true, size: 11 };
        const msColHdr = ws.addRow(["Wave", "Milestone", "Month", "Payment %", "Amount"]);
        msColHdr.eachCell(c => { c.font = { bold: true }; c.border = thinBorder; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7ED" } }; });
        for (const ms of milestoneMarkers) {
          const r = ws.addRow([ms.waveName, ms.name, ms.month, ms.percentage || "", ms.amount || ""]);
          r.eachCell(c => { c.border = thinBorder; });
        }
      }

      // Dependencies section
      const allDeps = waves.flatMap(w => (w.phase_dependencies || []).map(d => ({ wave: w.name, ...d })));
      if (allDeps.length > 0) {
        ws.addRow([]);
        const depHdr = ws.addRow(["DEPENDENCIES"]);
        depHdr.font = { bold: true, size: 11 };
        const depColHdr = ws.addRow(["Wave", "From Phase", "To Phase", "Type"]);
        depColHdr.eachCell(c => { c.font = { bold: true }; c.border = thinBorder; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }; });
        for (const d of allDeps) {
          const r = ws.addRow([d.wave, d.from_phase, d.to_phase, d.type || "FS"]);
          r.eachCell(c => { c.border = thinBorder; });
        }
      }

      ws.getColumn(1).width = 18;
      ws.getColumn(2).width = 16;
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "gantt-chart.xlsx");
    } catch (e) { console.error("Excel export failed:", e); }
  };

  const hasContent = rows.length > 0 || ganttChart;
  const isCollapsed = collapsedSections["gantt"];

  return (
    <Card className="border border-[#E2E8F0] shadow-sm" data-testid="gantt-card">
      <CardHeader className="cursor-pointer select-none" onClick={() => toggleSection("gantt")}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            Timeline / Gantt Chart
          </CardTitle>
          {!isCollapsed && hasContent && (
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={exportGanttPNG} data-testid="gantt-export-png"><Image className="w-3.5 h-3.5 mr-1" />PNG</Button>
              <Button size="sm" variant="outline" onClick={exportGanttExcel} data-testid="gantt-export-xlsx"><FileSpreadsheet className="w-3.5 h-3.5 mr-1" />Excel</Button>
            </div>
          )}
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent>
          {rows.length > 0 && (
            <div ref={chartRef} className="bg-white p-4 rounded-lg border" data-testid="gantt-auto-chart">
              <h4 className="text-sm font-semibold text-[#0F172A] mb-3">Auto-Generated Gantt Chart</h4>

              {/* Month headers */}
              <div className="flex items-center mb-1">
                <div style={{ width: LABEL_W }} className="shrink-0" />
                <div className="flex-1 flex">
                  {Array.from({ length: maxMonth }, (_, i) => (
                    <div key={i} className="flex-1 text-center text-[10px] text-gray-400 font-medium">M{i + 1}</div>
                  ))}
                </div>
              </div>

              {/* Chart area with relative positioning for arrows + milestones */}
              <div className="relative">
                {/* Phase bars */}
                {waveGroups.map((wg, wIdx) => {
                  const wave = waves.find(w => w.name === wg.waveName);
                  const description = wave?.description;
                  const midIdx = Math.floor(wg.rows.length / 2);

                  return (
                    <div key={wIdx} data-testid={`gantt-wave-${wg.waveName}`}>
                      {wIdx > 0 && <div className="h-3" />}
                      {wg.rows.map((row, rIdx) => (
                        <div key={rIdx} className="flex items-center" style={{ height: ROW_H }} data-testid={`gantt-row-${row.phase}`}>
                          <div style={{ width: LABEL_W }} className="pr-2 text-right shrink-0">
                            {rIdx === midIdx && description ? (
                              <span className="text-[9px] text-gray-400 italic block leading-tight mb-0.5">{description}</span>
                            ) : null}
                            <span className="text-[10px] font-medium text-gray-600 truncate">{row.phase}</span>
                            <span className="text-[9px] text-gray-400 ml-1">{row.startLabel}{row.endLabel > row.startLabel ? `\u2013${row.endLabel}` : ""}</span>
                          </div>
                          <div className="flex-1 relative" style={{ height: ROW_H }}>
                            {/* Grid lines */}
                            {Array.from({ length: maxMonth }, (_, i) => (
                              <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(i / maxMonth) * 100}%` }} />
                            ))}
                            {/* Phase bar */}
                            <div
                              className="absolute top-1 bottom-1 rounded-md flex items-center justify-center transition-all hover:shadow-md"
                              style={{
                                left: `${(row.absStart / maxMonth) * 100}%`,
                                width: `${((row.absEnd - row.absStart) / maxMonth) * 100}%`,
                                backgroundColor: row.color.bg,
                                border: `2px solid ${row.color.border}`,
                              }}
                              data-testid={`gantt-bar-${row.phase}`}
                            >
                              <span className="text-[10px] font-semibold truncate px-1" style={{ color: row.color.text }}>{row.phase}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* SVG overlay for dependency arrows - positioned over the bar track area */}
                {dependencyArrows.length > 0 && (() => {
                  // Calculate total chart height
                  let totalRows = 0;
                  waveGroups.forEach((wg, wIdx) => {
                    if (wIdx > 0) totalRows += 0.4; // spacer
                    totalRows += wg.rows.length;
                  });
                  const totalH = totalRows * ROW_H;

                  // Build a cumulative row Y map
                  const rowYMap = {};
                  let cumRow = 0;
                  waveGroups.forEach((wg, wIdx) => {
                    if (wIdx > 0) cumRow += 0.4; // spacer
                    wg.rows.forEach((row) => {
                      const globalIdx = rows.indexOf(row);
                      rowYMap[globalIdx] = cumRow * ROW_H + ROW_H / 2;
                      cumRow++;
                    });
                  });

                  return (
                    <svg
                      className="absolute top-0 pointer-events-none"
                      style={{ left: LABEL_W, width: `calc(100% - ${LABEL_W}px)`, height: totalH }}
                    >
                      <defs>
                        <marker id="dep-arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill="#6366F1" />
                        </marker>
                      </defs>
                      {dependencyArrows.map((arrow, aIdx) => {
                        const fromX = `${(arrow.fromEnd / maxMonth) * 100}%`;
                        const toX = `${(arrow.toStart / maxMonth) * 100}%`;
                        const fromY = rowYMap[arrow.fromIdx] || 0;
                        const toY = rowYMap[arrow.toIdx] || 0;
                        // Percentage X values don't work in SVG path, so use line elements
                        return (
                          <g key={aIdx}>
                            <line
                              x1={fromX} y1={fromY}
                              x2={fromX} y2={(fromY + toY) / 2}
                              stroke="#6366F1" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"
                            />
                            <line
                              x1={fromX} y1={(fromY + toY) / 2}
                              x2={toX} y2={(fromY + toY) / 2}
                              stroke="#6366F1" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"
                            />
                            <line
                              x1={toX} y1={(fromY + toY) / 2}
                              x2={toX} y2={toY}
                              stroke="#6366F1" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"
                              markerEnd="url(#dep-arrowhead)"
                            />
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Milestone markers row */}
              {milestoneMarkers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center mb-1">
                    <div style={{ width: LABEL_W }} className="shrink-0 text-right pr-2">
                      <span className="text-[10px] font-semibold text-amber-700">Milestones</span>
                    </div>
                    <div className="flex-1 relative" style={{ height: 36 }}>
                      {/* Grid lines */}
                      {Array.from({ length: maxMonth }, (_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-gray-100" style={{ left: `${(i / maxMonth) * 100}%` }} />
                      ))}
                      {/* Diamond markers */}
                      {milestoneMarkers.map((ms, mIdx) => {
                        const leftPct = (ms.absPos / maxMonth) * 100;
                        return (
                          <div key={mIdx} className="absolute flex flex-col items-center" style={{ left: `${leftPct}%`, top: 0, transform: "translateX(-50%)" }} title={`${ms.name} (${ms.month}${ms.percentage ? `, ${ms.percentage}%` : ""})`} data-testid={`gantt-milestone-${mIdx}`}>
                            <svg width="14" height="14" viewBox="0 0 14 14">
                              <polygon points="7,1 13,7 7,13 1,7" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
                            </svg>
                            <span className="text-[8px] text-amber-700 font-medium whitespace-nowrap max-w-[60px] truncate mt-0.5">{ms.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-100">
                {[...new Set(rows.map(r => r.phase))].map(phase => {
                  const c = getPhaseColor(phase);
                  return (
                    <div key={phase} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
                      <span className="text-[10px] text-gray-600">{phase}</span>
                    </div>
                  );
                })}
                {milestoneMarkers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" /></svg>
                    <span className="text-[10px] text-gray-600">Milestone</span>
                  </div>
                )}
                {dependencyArrows.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg width="20" height="12"><line x1="0" y1="6" x2="16" y2="6" stroke="#6366F1" strokeWidth="2" strokeDasharray="4,2" /><polygon points="16,3 20,6 16,9" fill="#6366F1" /></svg>
                    <span className="text-[10px] text-gray-600">Dependency</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {rows.length === 0 && !ganttChart && (
            <p className="text-sm text-gray-400 italic">No phase ranges defined yet. Add phases in the wave editor above to auto-generate a Gantt chart.</p>
          )}

          {/* Custom Gantt Image */}
          {ganttChart && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-[#0F172A]">Custom Gantt Image</h4>
                {!isReadOnly && (
                  <Button size="sm" variant="destructive" onClick={handleGanttDelete}><Trash2 className="w-3 h-3 mr-1" /> Remove</Button>
                )}
              </div>
              <img src={`${API}/uploads/${ganttChart.filename}`} alt="Gantt Chart" className="rounded border max-h-[500px] object-contain" />
            </div>
          )}

          {!isReadOnly && !ganttChart && (
            <div className="mt-4 flex items-center gap-3">
              <input type="file" ref={ganttInputRef} accept="image/*" className="hidden" onChange={handleGanttUpload} />
              <Button variant="outline" size="sm" onClick={() => ganttInputRef.current?.click()} disabled={ganttLoading}>
                <Upload className="w-3.5 h-3.5 mr-1" /> {ganttLoading ? "Uploading..." : "Upload Custom Image"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
