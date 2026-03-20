import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Upload, Trash2 } from "lucide-react";
import { useMemo } from "react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PHASE_COLORS = {
  Prepare: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
  Explore: { bg: "#E0E7FF", border: "#6366F1", text: "#4338CA" },
  Realize: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
  Deploy: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
  "Go-live": { bg: "#CCFBF1", border: "#14B8A6", text: "#134E4A" },
  Hypercare: { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D" },
  Design: { bg: "#EDE9FE", border: "#8B5CF6", text: "#5B21B6" },
  Build: { bg: "#FFF7ED", border: "#F97316", text: "#9A3412" },
  Test: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
  UAT: { bg: "#FEF9C3", border: "#EAB308", text: "#854D0E" },
  Support: { bg: "#F0FDFA", border: "#2DD4BF", text: "#115E59" },
};
const getPhaseColor = (phase) => PHASE_COLORS[phase] || { bg: "#F1F5F9", border: "#94A3B8", text: "#475569" };

/**
 * Build staircase gantt rows from wave data.
 * Each unique phase becomes its own row with absolute month positioning.
 */
const buildGanttRows = (waves) => {
  const rows = []; // { waveName, phase, absStart, absEnd, color }
  let maxMonth = 0;

  for (const w of waves) {
    const mp = w.month_phases || [];
    if (mp.every(p => !p)) continue;
    const offset = (w.wave_start_month || 1) - 1; // 0-based offset
    let current = null;

    for (let i = 0; i < mp.length; i++) {
      const phase = mp[i] || "";
      const absMonth = offset + i; // 0-based absolute month
      if (!phase) {
        if (current) { rows.push(current); current = null; }
        continue;
      }
      if (current && current.phase === phase) {
        current.absEnd = absMonth;
      } else {
        if (current) rows.push(current);
        current = { waveName: w.name, phase, absStart: absMonth, absEnd: absMonth, color: getPhaseColor(phase) };
      }
      if (absMonth + 1 > maxMonth) maxMonth = absMonth + 1;
    }
    if (current) rows.push(current);
  }

  return { rows, maxMonth };
};

export const GanttCard = ({ projectId, waves, ganttChart, ganttLoading, ganttInputRef, handleGanttUpload, handleGanttDelete, isReadOnly, collapsedSections, toggleSection }) => {
  const { rows: ganttRows, maxMonth } = useMemo(() => {
    if (!waves || waves.length === 0) return { rows: [], maxMonth: 0 };
    return buildGanttRows(waves);
  }, [waves]);

  if (!projectId) return null;

  const hasAutoGantt = ganttRows.length > 0;
  // Group rows by wave for rendering
  const waveGroups = [];
  const seenWaves = new Set();
  for (const row of ganttRows) {
    if (!seenWaves.has(row.waveName)) {
      seenWaves.add(row.waveName);
      waveGroups.push({ waveName: row.waveName, rows: ganttRows.filter(r => r.waveName === row.waveName) });
    }
  }

  return (
    <Card className="border border-[#E2E8F0] shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer select-none" onClick={() => toggleSection("gantt")}>
        <div className="flex items-center gap-2">
          {collapsedSections.gantt ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
          <CardTitle className="text-lg font-bold text-[#0F172A]">Timeline / Gantt Chart</CardTitle>
          {hasAutoGantt && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Auto-generated</span>}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
          <div data-testid="auto-gantt-chart">
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
                {waveGroups.map((wg) => {
                  const wave = waves.find(w => w.name === wg.waveName);
                  const startMonth = wave?.wave_start_month || 1;
                  return (
                    <div key={wg.waveName} className="mb-1">
                      {/* Wave label */}
                      <div className="flex items-center h-6 mb-0.5">
                        <div className="w-[140px] pr-2 text-right">
                          <span className="text-[11px] font-bold text-[#0F172A] truncate">{wg.waveName}</span>
                          {startMonth > 1 && <span className="text-[9px] text-gray-400 ml-1">(from M{startMonth})</span>}
                        </div>
                        <div className="flex-1 border-b border-dashed border-gray-200" />
                      </div>

                      {/* Phase rows - one per unique phase (staircase) */}
                      {wg.rows.map((row, rIdx) => (
                        <div key={rIdx} className="flex items-center h-8 group" data-testid={`gantt-row-${row.phase}`}>
                          {/* Phase label */}
                          <div className="w-[140px] pr-2 text-right shrink-0">
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
