import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, Plane, Settings, Copy, FileSpreadsheet, Minus, Upload, Download, GripVertical, Calculator, X, ChevronDown, ChevronRight } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { calculateResourceBaseCost as calcResourceBaseCostUtil } from "@/utils/estimatorCalcs";
import { evaluateSalaryExpression } from "@/utils/salaryExpression";
import { toast } from "sonner";
import { PROFICIENCY_LEVELS, getGroupColor, PHASE_OPTIONS, getPhaseColor } from "./constants";
import { AmsSharedPanel } from "./AmsSharedPanel";

// Inline cell that accepts arithmetic expressions (e.g. "3200*25%", "3200+500")
// and commits the evaluated numeric value on blur / Enter.
const SalaryExpressionInput = ({ value, onCommit, disabled, testId }) => {
  const [draft, setDraft] = useState(String(value ?? ""));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ""));
  }, [value, editing]);

  const commit = () => {
    const evald = evaluateSalaryExpression(draft);
    if (evald === null) {
      toast.error(`Invalid expression: "${draft}"`);
      setDraft(String(value ?? ""));
    } else if (evald !== Number(value)) {
      onCommit(evald);
    }
    setEditing(false);
  };

  return (
    <Input
      type="text"
      inputMode="text"
      className="w-[74px] text-right font-mono text-xs h-7"
      value={draft}
      onChange={(e) => { setEditing(true); setDraft(e.target.value); }}
      onFocus={() => setEditing(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
        if (e.key === "Escape") { setDraft(String(value ?? "")); setEditing(false); e.target.blur(); }
      }}
      data-testid={testId}
      disabled={disabled}
      title="Enter a number or an expression like 3200+500, 3200*25%, 3200/2"
    />
  );
};

export const WaveContent = ({
  wave,
  waveSummary,
  isReadOnly,
  waves,
  setWaves,
  activeWaveId,
  profitMarginPercentage,
  // Dialog state
  addResourceDialogOpen,
  setAddResourceDialogOpen,
  newAllocation,
  setNewAllocation,
  // Master data
  rates,
  skills,
  locations,
  technologyIds,
  // Handlers
  onAddPhaseColumn,
  onRemovePhaseColumn,
  onUpdatePhaseName,
  onOpenLogisticsEditor,
  onAddAllocation,
  onDeleteAllocation,
  onCopyAllocation,
  onToggleOnsite,
  onToggleTravelRequired,
  onPhaseAllocationChange,
  onSalaryChange,
  onDragEnd,
  onAllocationCommentChange,
  onApplyToAllMonths,
  onAddEmptyRow,
  onCloneWave,
  onDeleteWave,
  onGridFieldChange,
  milestones = [],
  onSaveMilestones,
}) => {
  const [phasesCollapsed, setPhasesCollapsed] = useState(false);
  const [milestonesCollapsed, setMilestonesCollapsed] = useState(false);
  const [splitRangeDialogOpen, setSplitRangeDialogOpen] = useState(false);
  const [splitRangeAllocationId, setSplitRangeAllocationId] = useState(null);
  const [splitRangeInput, setSplitRangeInput] = useState("");
  const phaseCount = (wave.phase_ranges || []).length;

  // Split-pane refs + scroll/row-height sync (freeze pane at Grp column)
  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);
  const scrollSyncingRef = useRef(false);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const handleLeftScroll = (e) => {
    if (scrollSyncingRef.current) return;
    scrollSyncingRef.current = true;
    if (rightPaneRef.current) rightPaneRef.current.scrollTop = e.target.scrollTop;
    requestAnimationFrame(() => { scrollSyncingRef.current = false; });
  };
  const handleRightScroll = (e) => {
    if (scrollSyncingRef.current) return;
    scrollSyncingRef.current = true;
    if (leftPaneRef.current) leftPaneRef.current.scrollTop = e.target.scrollTop;
    requestAnimationFrame(() => { scrollSyncingRef.current = false; });
  };

  // Sync row + header heights between left and right panes so rows visually align
  useLayoutEffect(() => {
    const left = leftPaneRef.current;
    const right = rightPaneRef.current;
    if (!left || !right) return;
    const leftRows = Array.from(left.querySelectorAll('tr[data-row-id]'));
    const rightRows = Array.from(right.querySelectorAll('tr[data-row-id]'));
    // Reset heights first
    leftRows.forEach(r => { r.style.height = ''; });
    rightRows.forEach(r => { r.style.height = ''; });
    const lHead = left.querySelector('thead tr');
    const rHead = right.querySelector('thead tr');
    if (lHead) lHead.style.height = '';
    if (rHead) rHead.style.height = '';

    const raf = requestAnimationFrame(() => {
      for (let i = 0; i < Math.min(leftRows.length, rightRows.length); i++) {
        const h = Math.max(leftRows[i].offsetHeight, rightRows[i].offsetHeight);
        leftRows[i].style.height = `${h}px`;
        rightRows[i].style.height = `${h}px`;
      }
      if (lHead && rHead) {
        const h = Math.max(lHead.offsetHeight, rHead.offsetHeight);
        lHead.style.height = `${h}px`;
        rHead.style.height = `${h}px`;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [wave.grid_allocations, wave.phase_names, wave.phase_ranges]);

  // Filter rates by project's selected technologies
  const filteredRates = (technologyIds && technologyIds.length > 0)
    ? rates.filter(r => {
        // Match by skill's technology if available, otherwise show all
        const skill = skills.find(s => s.id === r.skill_id);
        if (!skill || !skill.technology_id) return true;
        return technologyIds.includes(skill.technology_id);
      })
    : rates;

  // Filter skills by project's selected technologies (used for inline grid Skill dropdown)
  const filteredSkills = (technologyIds && technologyIds.length > 0)
    ? skills.filter(s => !s.technology_id || technologyIds.includes(s.technology_id))
    : skills;

  return (
    <div className="space-y-4">
      {/* Wave Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          {isReadOnly ? (
            <h3 className="text-lg font-semibold text-[#0F172A]">{wave.name}</h3>
          ) : (
            <Input
              value={wave.name}
              onChange={(e) => setWaves(waves.map(w => w.id === wave.id ? { ...w, name: e.target.value } : w))}
              className="text-lg font-semibold text-[#0F172A] border-0 border-b border-dashed border-gray-300 rounded-none focus:border-[#0F172A] bg-transparent px-0 w-48 h-auto py-0"
              data-testid={`wave-name-${wave.id}`}
            />
          )}
          {(() => {
            const et = wave.engagement_type || "Implementation";
            if (et === "Implementation") return null;
            const labels = {
              "AMS_Shared": { text: "AMS — Shared Support", cls: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30" },
              "AMS_Dedicated": { text: "AMS — Dedicated", cls: "bg-[#0EA5E9]/10 text-[#0EA5E9] border-[#0EA5E9]/30" },
              "AMS_Mix": { text: "AMS — Mix", cls: "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30" },
            };
            const cfg = labels[et] || labels["AMS_Shared"];
            return (
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${cfg.cls}`} data-testid={`wave-engagement-badge-${wave.id}`}>
                {cfg.text}
              </Badge>
            );
          })()}
          <span className="text-sm text-gray-600">Duration: {wave.duration_months} months</span>
          <span className="text-sm text-gray-600">Resources: {wave.grid_allocations.length}</span>
          <span className="text-sm text-[#F59E0B]">Onsite: {waveSummary.onsiteResourceCount}</span>
          <span className="text-sm text-purple-600">Traveling: {waveSummary.travelingResourceCount}</span>
          {!isReadOnly && (
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none" data-testid={`wave-exclude-toggle-${wave.id}`}>
              <Switch
                checked={!!wave.exclude_from_summary}
                onCheckedChange={(checked) => setWaves(waves.map(w => w.id === wave.id ? { ...w, exclude_from_summary: checked } : w))}
                className="scale-75"
              />
              <span className={wave.exclude_from_summary ? "text-red-500 font-medium" : "text-gray-400"}>
                {wave.exclude_from_summary ? "Excluded from Summary" : "Exclude"}
              </span>
            </label>
          )}
          {isReadOnly && wave.exclude_from_summary && (
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">Excluded from Summary</Badge>
          )}
          {!isReadOnly && waves.length > 1 && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              Starts at project M
              <input
                type="number"
                min={1}
                value={wave.wave_start_month || 1}
                onChange={(e) => setWaves(waves.map(w => w.id === wave.id ? { ...w, wave_start_month: Math.max(1, parseInt(e.target.value) || 1) } : w))}
                className="w-10 text-center text-sm border border-gray-300 rounded px-1 py-0"
                data-testid={`wave-start-month-${wave.id}`}
              />
            </span>
          )}
        </div>
      </div>

      {/* Wave Description */}
      <div>
        {isReadOnly ? (
          wave.description && <p className="text-sm text-gray-500 italic">{wave.description}</p>
        ) : (
          <Input
            value={wave.description || ""}
            onChange={(e) => setWaves(waves.map(w => w.id === wave.id ? { ...w, description: e.target.value } : w))}
            placeholder="Wave description (optional)..."
            className="text-sm text-gray-600 border-0 border-b border-dashed border-gray-200 rounded-none focus:border-gray-400 bg-transparent px-0"
            data-testid={`wave-desc-${wave.id}`}
          />
        )}
      </div>

      {/* Wave Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onOpenLogisticsEditor(wave.id)} data-testid={`edit-logistics-${wave.id}`} disabled={isReadOnly || wave.engagement_type === "AMS_Shared"}>
            <Settings className="w-4 h-4 mr-2" /> Logistics Config
          </Button>
          {!isReadOnly && wave.engagement_type !== "AMS_Shared" && (
          <Dialog open={addResourceDialogOpen && activeWaveId === wave.id} onOpenChange={setAddResourceDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-resource-button">
                <Plus className="w-4 h-4 mr-2" /> Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add Resource to {wave.name}</DialogTitle>
                <DialogDescription>Select skill and optionally override salary</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="resource-rate">Skill & Proficiency</Label>
                  <Select value={newAllocation.rate_id} onValueChange={(value) => {
                    const rate = filteredRates.find(r => r.id === value);
                    setNewAllocation({ ...newAllocation, rate_id: value, custom_salary: rate?.avg_monthly_salary?.toString() || "" });
                  }}>
                    <SelectTrigger id="resource-rate" data-testid="resource-rate-select"><SelectValue placeholder="Select skill" /></SelectTrigger>
                    <SelectContent>
                      {filteredRates.map((rate) => (
                        <SelectItem key={rate.id} value={rate.id}>
                          {rate.skill_name} ({rate.proficiency_level}) - {rate.base_location_name} - ${rate.avg_monthly_salary}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="custom-salary">Monthly Salary (override)</Label>
                  <Input id="custom-salary" type="number" placeholder="Enter custom salary" value={newAllocation.custom_salary} onChange={(e) => setNewAllocation({ ...newAllocation, custom_salary: e.target.value })} data-testid="custom-salary-input" />
                </div>
                <div>
                  <Label htmlFor="default-mm">Default Effort (apply to all months)</Label>
                  <Input id="default-mm" type="number" step="0.1" placeholder="e.g., 1 for 1 MM per month" value={newAllocation.default_mm} onChange={(e) => setNewAllocation({ ...newAllocation, default_mm: e.target.value })} data-testid="default-mm-input" />
                  <p className="text-xs text-gray-500 mt-1">If provided, this value will be set for all {wave.phase_names.length} months</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newAllocation.is_onsite} onCheckedChange={(checked) => setNewAllocation({ ...newAllocation, is_onsite: checked })} data-testid="onsite-switch" />
                  <Label className="flex items-center gap-2"><Plane className="w-4 h-4" /> Onsite Resource</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newAllocation.travel_required} onCheckedChange={(checked) => setNewAllocation({ ...newAllocation, travel_required: checked })} data-testid="travel-required-switch" />
                  <Label className="flex items-center gap-2 text-purple-600">Travel Required (Logistics Apply)</Label>
                </div>
                {newAllocation.travel_required && (
                  <div className="bg-purple-50 p-3 rounded text-xs border border-purple-200">
                    <p className="font-semibold mb-1">Logistics will be calculated at wave level:</p>
                    <p>Per-diem, Accommodation, Conveyance: Total Traveling MM x Rate x Days</p>
                    <p>Flights, Visa/Medical: Traveling Resources x Rate x Trips</p>
                  </div>
                )}
                <Button onClick={onAddAllocation} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-resource-button">Add Resource</Button>
              </div>
            </DialogContent>
          </Dialog>
          )}
          {!isReadOnly && wave.engagement_type !== "AMS_Shared" && (
          <Button size="sm" variant="outline" className="border-gray-400 text-gray-600 hover:bg-gray-50" onClick={() => onAddEmptyRow(wave.id)} data-testid={`add-row-${wave.id}`}>
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onAddPhaseColumn(wave.id)} className="border-teal-600 text-teal-600 hover:bg-teal-50" data-testid={`add-month-${wave.id}`} disabled={isReadOnly || wave.engagement_type === "AMS_Shared"}>
            <Plus className="w-4 h-4 mr-1" /> Add Month
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRemovePhaseColumn(wave.id)} className="border-orange-600 text-orange-600 hover:bg-orange-50" data-testid={`remove-month-${wave.id}`} disabled={isReadOnly || wave.engagement_type === "AMS_Shared"}>
            <Minus className="w-4 h-4 mr-1" /> Remove Month
          </Button>
          {!isReadOnly && (
          <Button size="sm" variant="outline" className="border-indigo-500 text-indigo-500 hover:bg-indigo-50" onClick={() => onCloneWave(wave.id)} data-testid={`clone-wave-${wave.id}`}>
            <Copy className="w-4 h-4 mr-2" /> Clone Wave
          </Button>
          )}
          {!isReadOnly && (
          <Button size="sm" variant="outline" className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10" onClick={() => onDeleteWave(wave.id)} data-testid={`delete-wave-${wave.id}`}>
            <X className="w-4 h-4 mr-2" /> Delete Wave
          </Button>
          )}
        </div>
      </div>

      {/* AMS Engagement Type — show shared support panel for Shared/Mix */}
      {(wave.engagement_type === "AMS_Shared" || wave.engagement_type === "AMS_Mix") && (
        <AmsSharedPanel wave={wave} waves={waves} setWaves={setWaves} isReadOnly={isReadOnly} />
      )}

      {/* Phase Range Editor — hidden for pure AMS Shared (no project phases) */}
      {wave.engagement_type !== "AMS_Shared" && (
      <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-3" data-testid={`phase-range-editor-${wave.id}`}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer select-none hover:opacity-80 transition-opacity"
            onClick={() => setPhasesCollapsed(!phasesCollapsed)}
            data-testid={`toggle-phases-${wave.id}`}
          >
            {phasesCollapsed ? <ChevronRight className="w-4 h-4 text-emerald-700" /> : <ChevronDown className="w-4 h-4 text-emerald-700" />}
            <h4 className="text-sm font-semibold text-emerald-800">Phase Ranges</h4>
            <span className="text-[10px] font-normal text-emerald-600">(defines Gantt chart timeline)</span>
            {phasesCollapsed && phaseCount > 0 && (
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-medium">{phaseCount} phase{phaseCount !== 1 ? "s" : ""}</span>
            )}
          </button>
          {!isReadOnly && !phasesCollapsed && (
            <Button size="sm" variant="outline" className="h-7 border-emerald-500 text-emerald-600 hover:bg-emerald-100" onClick={() => {
              const ranges = [...(wave.phase_ranges || []), { name: "Prepare", start_month: 1, end_month: 1 }];
              setWaves(waves.map(w => w.id === wave.id ? { ...w, phase_ranges: ranges } : w));
            }} data-testid={`add-phase-range-${wave.id}`}>
              <Plus className="w-3 h-3 mr-1" /> Add Phase
            </Button>
          )}
        </div>
        {!phasesCollapsed && (
        <div className="mt-2">
        {(wave.phase_ranges || []).length > 0 ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_90px_90px_36px] gap-2 text-[10px] font-semibold text-emerald-700 px-1 uppercase tracking-wide">
              <span>Phase Name</span><span>Start</span><span>End</span><span></span>
            </div>
            {(wave.phase_ranges || []).map((pr, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_90px_90px_36px] gap-2 items-center" data-testid={`phase-range-row-${idx}`}>
                <select
                  value={PHASE_OPTIONS.includes(pr.name) ? pr.name : "__custom__"}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val === "__custom__") {
                      const custom = window.prompt("Enter custom phase name:", pr.name);
                      if (!custom?.trim()) return;
                      val = custom.trim();
                    }
                    const ranges = [...(wave.phase_ranges || [])];
                    ranges[idx] = { ...ranges[idx], name: val };
                    setWaves(waves.map(w => w.id === wave.id ? { ...w, phase_ranges: ranges } : w));
                  }}
                  className="h-8 text-xs border border-emerald-300 rounded bg-white px-2 focus:ring-1 focus:ring-emerald-400"
                  disabled={isReadOnly}
                  data-testid={`phase-range-name-${idx}`}
                >
                  {PHASE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  {!PHASE_OPTIONS.includes(pr.name) && <option value="__custom__">{pr.name}</option>}
                  <option value="__custom__">+ Custom...</option>
                </select>
                <Input
                  type="number" min={0.25} max={wave.phase_names.length} step="0.25"
                  value={pr.start_month}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    if (isNaN(raw)) return;
                    const val = Math.max(0.25, Math.min(wave.phase_names.length, Math.round(raw * 4) / 4));
                    const ranges = [...(wave.phase_ranges || [])];
                    ranges[idx] = { ...ranges[idx], start_month: val, end_month: Math.max(val, ranges[idx].end_month) };
                    setWaves(waves.map(w => w.id === wave.id ? { ...w, phase_ranges: ranges } : w));
                  }}
                  className="h-8 text-center text-xs"
                  disabled={isReadOnly}
                  data-testid={`phase-range-start-${idx}`}
                />
                <Input
                  type="number" min={pr.start_month} max={wave.phase_names.length} step="0.25"
                  value={pr.end_month}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    if (isNaN(raw)) return;
                    const val = Math.max(pr.start_month, Math.min(wave.phase_names.length, Math.round(raw * 4) / 4));
                    const ranges = [...(wave.phase_ranges || [])];
                    ranges[idx] = { ...ranges[idx], end_month: val };
                    setWaves(waves.map(w => w.id === wave.id ? { ...w, phase_ranges: ranges } : w));
                  }}
                  className="h-8 text-center text-xs"
                  disabled={isReadOnly}
                  data-testid={`phase-range-end-${idx}`}
                />
                {!isReadOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                    const ranges = (wave.phase_ranges || []).filter((_, i) => i !== idx);
                    setWaves(waves.map(w => w.id === wave.id ? { ...w, phase_ranges: ranges } : w));
                  }} data-testid={`remove-phase-range-${idx}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
            {/* Visual timeline - continuous bar rendering */}
            <div className="mt-3 pt-2 border-t border-emerald-200">
              <p className="text-[10px] text-emerald-600 mb-1 font-medium">Timeline Preview</p>
              <div className="relative">
                {/* Month grid header */}
                <div className="flex gap-0.5 mb-1">
                  {wave.phase_names.map((phaseName, mIdx) => (
                    <div key={mIdx} className="flex-1 min-w-[28px] text-[9px] text-center text-gray-400">{phaseName}</div>
                  ))}
                </div>
                {/* Phase bars rendered as continuous strips */}
                {(wave.phase_ranges || []).map((pr, i) => {
                  const totalMonths = wave.phase_names.length;
                  // Sub-1 start values (0.25, 0.5, 0.75) snap to the BEGINNING of M1 (position 0%).
                  // For start >= 1: legacy 1-indexed-month convention (1 = start of M1, 2 = start of M2).
                  // end_month is treated as elapsed months (e.g. 0.5 = half-way into M1, 1 = end of M1, 3 = end of M3).
                  const startElapsed = pr.start_month < 1 ? 0 : pr.start_month - 1;
                  const endElapsed = pr.end_month;
                  let leftPct = (startElapsed / totalMonths) * 100;
                  let widthPct = ((endElapsed - startElapsed) / totalMonths) * 100;
                  // Minimum visible marker for zero-width ranges
                  if (widthPct < 0.5) widthPct = Math.max(0.5, (1 / totalMonths) * 8);
                  return (
                    <div key={i} className="relative h-6 mb-0.5">
                      {/* Background grid lines */}
                      <div className="absolute inset-0 flex gap-0.5">
                        {wave.phase_names.map((_, mIdx) => (
                          <div key={mIdx} className="flex-1 bg-gray-50 rounded-sm border border-gray-100"></div>
                        ))}
                      </div>
                      {/* Phase bar */}
                      <div
                        className="absolute top-0 h-6 rounded-sm text-[7px] leading-[24px] text-center truncate px-1"
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.min(widthPct, 100 - leftPct)}%`,
                          background: getPhaseColor(pr.name).bg,
                          color: getPhaseColor(pr.name).text,
                          border: `1px solid ${getPhaseColor(pr.name).border}`,
                        }}
                        title={`${pr.name}: ${pr.start_month} → ${pr.end_month}`}
                      >
                        {pr.name} ({pr.start_month}–{pr.end_month})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-emerald-600 italic">No phases defined. Add phases to generate the Gantt chart.</p>
        )}

        {/* Milestones per Phase */}
        {(wave.phase_ranges || []).length > 0 && (
          <div className="mt-3 pt-2 border-t border-emerald-200">
            {/* Header with total % */}
            {(() => {
              const wavePayMs = milestones.filter(m => m.wave_name === wave.name && (m.milestone_type || "payment") === "payment");
              const totalPct = wavePayMs.reduce((s, m) => s + (m.payment_percentage || 0), 0);
              const totalAmt = Math.round((waveSummary?.finalPrice || 0) * (totalPct / 100) * 100) / 100;
              const markerCount = milestones.filter(m => m.wave_name === wave.name && (m.milestone_type || "payment") === "marker").length;
              return (
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setMilestonesCollapsed(!milestonesCollapsed)}
                    className="flex items-center gap-1.5 cursor-pointer select-none hover:opacity-80 transition-opacity"
                    data-testid={`toggle-milestones-${wave.id}`}
                  >
                    {milestonesCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                    <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wide">Phase Milestones</p>
                    {milestonesCollapsed && wavePayMs.length + markerCount > 0 && (
                      <span className="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full font-medium">{wavePayMs.length + markerCount}</span>
                    )}
                  </button>
                  <div className="flex items-center gap-3">
                    {markerCount > 0 && <span className="text-[9px] text-blue-500 font-medium">{markerCount} marker{markerCount !== 1 ? "s" : ""}</span>}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${totalPct > 100 ? "bg-red-100 text-red-700" : totalPct === 100 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`} data-testid="wave-total-pct">
                      {totalPct.toFixed(1)}%{totalAmt > 0 ? ` ($${totalAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })})` : ""}
                    </span>
                  </div>
                </div>
              );
            })()}
            {!milestonesCollapsed && (wave.phase_ranges || []).map((pr, pIdx) => {
              const phaseMilestones = milestones.filter(m => m.wave_name === wave.name && m.phase_name === pr.name);
              const phaseColor = getPhaseColor(pr.name);
              return (
                <div key={pIdx} className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: phaseColor.bg, border: `1px solid ${phaseColor.border}` }} />
                    <span className="text-[11px] font-semibold" style={{ color: phaseColor.text }}>{pr.name}</span>
                    <span className="text-[9px] text-gray-400">({pr.start_month} → {pr.end_month})</span>
                    {!isReadOnly && (
                      <div className="flex gap-1 ml-auto">
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] text-amber-600 hover:bg-amber-50 px-1.5" onClick={() => {
                          const targetMonth = `M${Math.ceil(pr.end_month)}`;
                          const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                          const newMs = {
                            id: newId,
                            wave_name: wave.name,
                            milestone_name: "",
                            milestone_type: "payment",
                            phase_name: pr.name,
                            position: "end",
                            target_month: targetMonth,
                            completion_percentage: 0,
                            payment_percentage: 0,
                            payment_amount: 0,
                            description: "",
                          };
                          onSaveMilestones([...milestones, newMs]);
                        }} data-testid={`add-milestone-${pr.name}`}>
                          <Plus className="w-3 h-3 mr-0.5" /> Payment
                        </Button>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] text-blue-600 hover:bg-blue-50 px-1.5" onClick={() => {
                          const midMonth = pr.start_month + (pr.end_month - pr.start_month) * 0.5;
                          const targetMonth = `M${Math.ceil(midMonth)}`;
                          const newId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `ms-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                          const newMs = {
                            id: newId,
                            wave_name: wave.name,
                            milestone_name: "",
                            milestone_type: "marker",
                            phase_name: pr.name,
                            position: "50",
                            target_month: targetMonth,
                            completion_percentage: 0,
                            payment_percentage: 0,
                            payment_amount: 0,
                            description: "",
                          };
                          onSaveMilestones([...milestones, newMs]);
                        }} data-testid={`add-marker-${pr.name}`}>
                          <Plus className="w-3 h-3 mr-0.5" /> Marker
                        </Button>
                      </div>
                    )}
                  </div>
                  {phaseMilestones.length > 0 ? (
                    <div className="ml-5 space-y-1">
                      {phaseMilestones.map((ms) => {
                        const msIdx = milestones.findIndex(m => m.id === ms.id);
                        const isMarker = (ms.milestone_type || "payment") === "marker";
                        return (
                          <div key={ms.id} className={`grid gap-1.5 items-center ${isMarker ? "grid-cols-[16px_1fr_100px_40px_28px]" : "grid-cols-[16px_70px_1fr_60px_60px_28px]"}`} data-testid={`milestone-row-${ms.id}`}>
                            {/* Type indicator */}
                            <div title={isMarker ? "Marker (no payment)" : "Payment milestone"}>
                              <svg width="10" height="10" viewBox="0 0 14 14">
                                <polygon points="7,1 13,7 7,13 1,7" fill={isMarker ? "#3B82F6" : "#F59E0B"} stroke={isMarker ? "#1D4ED8" : "#D97706"} strokeWidth="1.5" />
                              </svg>
                            </div>
                            {isMarker ? (
                              <>
                                {/* Marker: Name first, then slider */}
                                <Input
                                  value={ms.milestone_name}
                                  onChange={(e) => {
                                    const updated = [...milestones];
                                    updated[msIdx] = { ...updated[msIdx], milestone_name: e.target.value };
                                    onSaveMilestones(updated);
                                  }}
                                  placeholder="e.g. Sprint 1, UAT, Phase Closure..."
                                  className="h-6 text-[10px] px-1.5"
                                  disabled={isReadOnly}
                                  data-testid={`ms-name-${ms.id}`}
                                />
                                {/* Range slider for flexible placement */}
                                <input
                                  type="range" min="0" max="100" step="5"
                                  value={(() => {
                                    const p = ms.position;
                                    if (p === "start") return 0;
                                    if (p === "mid") return 50;
                                    if (p === "end") return 100;
                                    return parseFloat(p) || 50;
                                  })()}
                                  onChange={(e) => {
                                    const pct = parseInt(e.target.value);
                                    const monthFloat = pr.start_month + (pr.end_month - pr.start_month) * (pct / 100);
                                    const targetMonth = `M${Math.ceil(monthFloat)}`;
                                    const updated = [...milestones];
                                    updated[msIdx] = { ...updated[msIdx], position: String(pct), target_month: targetMonth };
                                    onSaveMilestones(updated);
                                  }}
                                  className="h-1.5 w-full accent-blue-500 cursor-pointer"
                                  disabled={isReadOnly}
                                  title={`Position: ${(() => { const p = ms.position; if (p === "start") return "0%"; if (p === "mid") return "50%"; if (p === "end") return "100%"; return `${parseFloat(p) || 50}%`; })()} along phase`}
                                  data-testid={`ms-slider-${ms.id}`}
                                />
                                <span className="text-[9px] text-blue-500 font-mono text-center whitespace-nowrap" data-testid={`ms-pct-display-${ms.id}`}>
                                  {(() => { const p = ms.position; if (p === "start") return "0%"; if (p === "mid") return "50%"; if (p === "end") return "100%"; return `${parseFloat(p) || 50}%`; })()}
                                </span>
                              </>
                            ) : (
                              <>
                                {/* Payment: Position dropdown + name + % + month */}
                                <select
                                  value={ms.position || "end"}
                                  onChange={(e) => {
                                    const pos = e.target.value;
                                    let targetMonth;
                                    if (pos === "start") targetMonth = `M${Math.ceil(pr.start_month)}`;
                                    else if (pos === "mid") targetMonth = `M${Math.ceil((pr.start_month + pr.end_month) / 2)}`;
                                    else targetMonth = `M${Math.ceil(pr.end_month)}`;
                                    const updated = [...milestones];
                                    updated[msIdx] = { ...updated[msIdx], position: pos, target_month: targetMonth };
                                    onSaveMilestones(updated);
                                  }}
                                  className="h-6 text-[10px] border border-amber-200 rounded bg-white px-1"
                                  disabled={isReadOnly}
                                  data-testid={`ms-position-${ms.id}`}
                                >
                                  <option value="start">Start</option>
                                  <option value="mid">Mid</option>
                                  <option value="end">End</option>
                                </select>
                                <Input
                                  value={ms.milestone_name}
                                  onChange={(e) => {
                                    const updated = [...milestones];
                                    updated[msIdx] = { ...updated[msIdx], milestone_name: e.target.value };
                                    onSaveMilestones(updated);
                                  }}
                                  placeholder="Milestone name..."
                                  className="h-6 text-[10px] px-1.5"
                                  disabled={isReadOnly}
                                  data-testid={`ms-name-${ms.id}`}
                                />
                                <Input
                                  type="number" min={0} max={100} step={1}
                                  value={ms.payment_percentage || ""}
                                  onChange={(e) => {
                                    const pct = parseFloat(e.target.value) || 0;
                                    const amount = Math.round((waveSummary?.finalPrice || 0) * (pct / 100) * 100) / 100;
                                    const updated = [...milestones];
                                    updated[msIdx] = { ...updated[msIdx], payment_percentage: pct, payment_amount: amount };
                                    onSaveMilestones(updated);
                                  }}
                                  placeholder="%"
                                  className="h-6 text-[10px] text-center px-1"
                                  disabled={isReadOnly}
                                  data-testid={`ms-pct-${ms.id}`}
                                />
                                <span className="text-[9px] text-gray-400 text-center">{ms.target_month}</span>
                              </>
                            )}
                            {!isReadOnly && (
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => {
                                onSaveMilestones(milestones.filter(m => m.id !== ms.id));
                              }} data-testid={`remove-ms-${ms.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="ml-5 text-[9px] text-gray-400 italic">No milestones for this phase</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
        )}
      </div>
      )}

      {/* Grid Table — hidden for pure AMS Shared (no resource allocation grid) */}
      {wave.engagement_type !== "AMS_Shared" && (
      <>
      {wave.grid_allocations.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded">
          <p className="text-gray-500">No resources in this wave. Click &quot;Add Resource&quot; or &quot;Add Row&quot; to start.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={(result) => onDragEnd(result, wave.id)}>
        <div className="flex border border-[#E2E8F0] rounded overflow-hidden bg-white" style={{ maxHeight: '70vh' }} id="grid-split-container" data-testid={`grid-split-container-${wave.id}`}>
          {/* ============ LEFT PANE (up to Grp) ============ */}
          <div
            ref={leftPaneRef}
            onScroll={handleLeftScroll}
            className="flex-shrink-0 overflow-y-auto overflow-x-hidden bg-white no-scrollbar"
            style={{ width: 622 }}
            data-testid={`grid-left-pane-${wave.id}`}
          >
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: 32 }} />
                <col style={{ width: 32 }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 106 }} />
                <col style={{ width: 106 }} />
                <col style={{ width: 86 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 50 }} />
                <col style={{ width: 40 }} />
              </colgroup>
              <thead className="sticky top-0 z-20 bg-[#F8FAFC]">
                <tr className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="text-center p-2 font-semibold text-xs"></th>
                  <th className="text-center p-2 font-semibold text-xs">#</th>
                  <th className="text-left p-2 font-semibold text-xs">Skill</th>
                  <th className="text-left p-2 font-semibold text-xs">Level</th>
                  <th className="text-left p-2 font-semibold text-xs">Location</th>
                  <th className="text-right p-2 font-semibold text-xs">$/Month</th>
                  <th className="text-center p-2 font-semibold text-xs">Onsite</th>
                  <th className="text-center p-2 font-semibold text-xs">Travel</th>
                  <th className="text-center p-2 font-semibold text-xs">Grp</th>
                </tr>
              </thead>
              <Droppable droppableId={`wave-${wave.id}`}>
                {(provided) => (
              <tbody ref={provided.innerRef} {...provided.droppableProps}>
                {wave.grid_allocations.map((allocation, rowIdx) => {
                  const rowBg = allocation.is_onsite && allocation.travel_required
                    ? "bg-amber-100/60"
                    : allocation.is_onsite
                    ? "bg-amber-50/40"
                    : "bg-white";
                  const groupColor = getGroupColor(allocation.resource_group_id);
                  const isHovered = hoveredRowId === allocation.id;
                  return (
                    <Draggable key={allocation.id} draggableId={allocation.id} index={rowIdx} isDragDisabled={isReadOnly}>
                      {(dragProvided, snapshot) => (
                    <tr
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      data-row-id={allocation.id}
                      onMouseEnter={() => setHoveredRowId(allocation.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className={`border-b border-[#E2E8F0] ${rowBg} ${isHovered ? 'ring-1 ring-inset ring-[#3B82F6]/30 bg-[#E0F2FE]/40' : ''} ${snapshot.isDragging ? "shadow-lg opacity-90 bg-blue-50" : ""}`}
                      style={{ ...dragProvided.draggableProps.style, borderLeft: groupColor ? `4px solid ${groupColor}` : undefined }}
                      data-testid={`allocation-row-${allocation.id}`}
                    >
                      {/* Drag handle */}
                      <td className="p-1 text-center align-middle" {...dragProvided.dragHandleProps}>
                        {!isReadOnly && <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab mx-auto" />}
                      </td>
                      {/* Row number */}
                      <td className="p-1 text-center text-xs text-gray-400 font-mono align-middle">{rowIdx + 1}</td>
                      {/* Skill */}
                      <td className="p-1 align-middle">
                        {isReadOnly ? (
                          <Tooltip><TooltipTrigger asChild>
                            <span className="font-medium text-xs cursor-help truncate block">{allocation.skill_name}</span>
                          </TooltipTrigger><TooltipContent side="bottom" className="max-w-xs p-2">
                            <p className="font-semibold">{allocation.skill_name}</p>
                            <p className="text-xs text-gray-500">{allocation.proficiency_level} &middot; {allocation.base_location_name}</p>
                          </TooltipContent></Tooltip>
                        ) : (
                          <Tooltip><TooltipTrigger asChild><div>
                            <SearchableSelect
                              value={allocation.skill_id}
                              onValueChange={(value) => onGridFieldChange(wave.id, allocation.id, 'skill_id', value)}
                              options={filteredSkills.map(s => ({ value: s.id, label: s.name }))}
                              placeholder="Skill..."
                              searchPlaceholder="Search skills..."
                              triggerClassName="w-[110px] text-xs"
                            />
                          </div></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs p-2">
                            <p className="font-semibold">{allocation.skill_name}</p>
                            <p className="text-xs text-gray-500">{allocation.proficiency_level} &middot; {allocation.base_location_name}</p>
                          </TooltipContent></Tooltip>
                        )}
                      </td>
                      {/* Level */}
                      <td className="p-1 align-middle">
                        {isReadOnly ? (
                          <Tooltip><TooltipTrigger asChild>
                            <span className="text-xs cursor-default truncate block">{allocation.proficiency_level}</span>
                          </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs font-medium">{allocation.proficiency_level}</p></TooltipContent></Tooltip>
                        ) : (
                          <Tooltip><TooltipTrigger asChild><div>
                            <SearchableSelect
                              value={allocation.proficiency_level}
                              onValueChange={(value) => onGridFieldChange(wave.id, allocation.id, 'proficiency_level', value)}
                              options={PROFICIENCY_LEVELS.map(l => ({ value: l, label: l }))}
                              placeholder="Level..."
                              searchPlaceholder="Search levels..."
                              triggerClassName="w-[96px] text-xs"
                            />
                          </div></TooltipTrigger><TooltipContent side="bottom"><p className="text-xs font-medium">{allocation.proficiency_level || 'Select level'}</p></TooltipContent></Tooltip>
                        )}
                      </td>
                      {/* Location */}
                      <td className="p-1 align-middle">
                        {isReadOnly ? (
                          <Tooltip><TooltipTrigger asChild>
                            <span className="text-xs cursor-default truncate block">{allocation.base_location_name}</span>
                          </TooltipTrigger><TooltipContent side="bottom"><p className="text-xs font-medium">{allocation.base_location_name}</p></TooltipContent></Tooltip>
                        ) : (
                          <Tooltip><TooltipTrigger asChild><div>
                            <SearchableSelect
                              value={allocation.base_location_id}
                              onValueChange={(value) => onGridFieldChange(wave.id, allocation.id, 'base_location_id', value)}
                              options={locations.map(l => ({ value: l.id, label: l.name }))}
                              placeholder="Location..."
                              searchPlaceholder="Search locations..."
                              triggerClassName="w-[96px] text-xs"
                            />
                          </div></TooltipTrigger><TooltipContent side="bottom">
                            <p className="text-xs font-medium">{allocation.base_location_name || 'Select location'}</p>
                            {allocation.overhead_percentage > 0 && <p className="text-[10px] text-gray-400">OH: {allocation.overhead_percentage}%</p>}
                          </TooltipContent></Tooltip>
                        )}
                      </td>
                      {/* $/Month */}
                      <td className="p-1 text-right align-middle">
                        <Tooltip><TooltipTrigger asChild><div>
                          <SalaryExpressionInput
                            value={allocation.avg_monthly_salary}
                            onCommit={(newVal) => onSalaryChange(wave.id, allocation.id, newVal)}
                            disabled={isReadOnly}
                            testId={`salary-${allocation.id}`}
                          />
                        </div></TooltipTrigger><TooltipContent side="bottom">
                          <p className="text-xs font-medium">${Number(allocation.avg_monthly_salary || 0).toLocaleString()}/month</p>
                          <p className="text-[10px] text-gray-500">Tip: enter formulas like <code>3200+500</code>, <code>3200*25%</code>, <code>3200/2</code></p>
                          {allocation.original_monthly_salary > 0 && allocation.avg_monthly_salary !== allocation.original_monthly_salary && (
                            <p className="text-[10px] text-gray-400">Master rate: ${Number(allocation.original_monthly_salary).toLocaleString()}</p>
                          )}
                        </TooltipContent></Tooltip>
                      </td>
                      {/* Onsite */}
                      <td className="p-1 text-center align-middle">
                        <button
                          onClick={() => !isReadOnly && onToggleOnsite(wave.id, allocation.id)}
                          disabled={isReadOnly}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${allocation.is_onsite ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600"} ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                          data-testid={`onsite-toggle-${allocation.id}`}
                        >
                          {allocation.is_onsite ? "ON" : "OFF"}
                        </button>
                      </td>
                      {/* Travel */}
                      <td className="p-1 text-center align-middle">
                        <Tooltip><TooltipTrigger asChild>
                          <button
                            onClick={() => !isReadOnly && onToggleTravelRequired(wave.id, allocation.id)}
                            disabled={isReadOnly}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${allocation.travel_required ? "bg-purple-500 text-white" : "bg-gray-200 text-gray-600"} ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                            data-testid={`travel-toggle-${allocation.id}`}
                          >
                            {allocation.travel_required ? "YES" : "NO"}
                          </button>
                        </TooltipTrigger><TooltipContent side="bottom" className="max-w-xs p-3 text-xs">
                          {allocation.travel_required ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 font-semibold text-purple-600"><Calculator className="w-4 h-4" /> Logistics Formula Applied</div>
                              <div className="space-y-1 text-gray-600">
                                <p><span className="font-medium">Per-diem:</span> MM x ${waveSummary.logistics?.config?.per_diem_daily || 50} x {waveSummary.logistics?.config?.per_diem_days || 30} days</p>
                                <p><span className="font-medium">Accommodation:</span> MM x ${waveSummary.logistics?.config?.accommodation_daily || 80} x {waveSummary.logistics?.config?.accommodation_days || 30} days</p>
                                <p><span className="font-medium">Conveyance:</span> MM x ${waveSummary.logistics?.config?.local_conveyance_daily || 15} x {waveSummary.logistics?.config?.local_conveyance_days || 21} days</p>
                                <p><span className="font-medium">Air Fare:</span> 1 resource x ${waveSummary.logistics?.config?.flight_cost_per_trip || 450} x {waveSummary.logistics?.config?.num_trips || 6} trips</p>
                                <p><span className="font-medium">Visa/Medical:</span> 1 resource x ${waveSummary.logistics?.config?.visa_medical_per_trip || 400} x {waveSummary.logistics?.config?.num_trips || 6} trips</p>
                              </div>
                            </div>
                          ) : (
                            <p>No travel logistics. Click to enable travel costs for this resource.</p>
                          )}
                        </TooltipContent></Tooltip>
                      </td>
                      {/* Group */}
                      <td className="p-1 text-center align-middle">
                        <Input
                          type="text"
                          placeholder=""
                          className="w-10 text-center font-mono text-xs p-1"
                          value={allocation.resource_group_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWaves(waves.map(w =>
                              w.id === wave.id
                                ? { ...w, grid_allocations: w.grid_allocations.map(a => a.id === allocation.id ? { ...a, resource_group_id: val } : a) }
                                : w
                            ));
                          }}
                          disabled={isReadOnly}
                          data-testid={`group-${allocation.id}`}
                        />
                      </td>
                    </tr>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </tbody>
                )}
              </Droppable>
            </table>
          </div>

          {/* ============ DIVIDER ============ */}
          <div className="flex-shrink-0 w-[3px] bg-gradient-to-b from-[#0EA5E9]/40 via-[#3B82F6]/60 to-[#0EA5E9]/40" title="Freeze pane divider" />

          {/* ============ RIGHT PANE (Phase months + calcs + actions) ============ */}
          <div
            ref={rightPaneRef}
            onScroll={handleRightScroll}
            className="flex-1 overflow-auto bg-white"
            data-testid={`grid-right-pane-${wave.id}`}
          >
            <table className="border-collapse" style={{ minWidth: '100%' }}>
              <thead className="sticky top-0 z-20 bg-[#F8FAFC]">
                <tr className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                  {wave.phase_names.map((phaseName, index) => (
                    <th key={index} className="text-center p-2 bg-[#E0F2FE]">
                      <Input
                        value={phaseName}
                        onChange={(e) => onUpdatePhaseName(wave.id, index, e.target.value)}
                        className="w-20 text-center font-semibold text-xs border-0 bg-transparent focus:bg-white"
                        data-testid={`phase-name-${index}`}
                        disabled={isReadOnly}
                      />
                    </th>
                  ))}
                  <th className="text-right p-2 font-semibold text-xs">Total MM</th>
                  <th className="text-right p-2 font-semibold text-xs">Salary Cost</th>
                  <th className="text-right p-2 font-semibold text-xs">Overhead</th>
                  <th className="text-right p-2 font-semibold text-xs bg-gray-50">Total Cost</th>
                  <th className="text-right p-2 font-semibold text-xs bg-green-50">Selling Price</th>
                  <th className="text-right p-2 font-semibold text-xs bg-blue-50">SP/MM</th>
                  <th className="text-right p-2 font-semibold text-xs bg-blue-50">Hourly</th>
                  <th className="text-right p-2 font-semibold text-xs w-16 bg-purple-50">Ovr $/Hr</th>
                  <th className="text-left p-2 font-semibold text-xs">Comments</th>
                  <th className="text-center p-2 font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wave.grid_allocations.map((allocation, rowIdx) => {
                  const { totalManMonths, baseSalaryCost } = calcResourceBaseCostUtil(allocation);
                  const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
                  const totalCost = baseSalaryCost + overheadCost;
                  const calcSellingPrice = totalCost / (1 - profitMarginPercentage / 100);
                  const hasOverride = allocation.override_hourly_rate > 0;
                  const sellingPrice = hasOverride ? allocation.override_hourly_rate * 176 * totalManMonths : calcSellingPrice;
                  const spPerMM = totalManMonths > 0 ? sellingPrice / totalManMonths : 0;
                  const hourlyPrice = hasOverride ? allocation.override_hourly_rate : (spPerMM / 176);
                  const rowBg = allocation.is_onsite && allocation.travel_required
                    ? "bg-amber-100/60"
                    : allocation.is_onsite
                    ? "bg-amber-50/40"
                    : "bg-white";
                  const isHovered = hoveredRowId === allocation.id;
                  return (
                    <tr
                      key={allocation.id}
                      data-row-id={allocation.id}
                      onMouseEnter={() => setHoveredRowId(allocation.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className={`border-b border-[#E2E8F0] ${rowBg} ${isHovered ? 'ring-1 ring-inset ring-[#3B82F6]/30 bg-[#E0F2FE]/40' : ''}`}
                      data-testid={`allocation-row-right-${allocation.id}`}
                    >
                      {/* Phase columns */}
                      {wave.phase_names.map((_, phaseIndex) => (
                        <td key={phaseIndex} className="p-2 align-middle">
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="0"
                            className="w-20 text-center font-mono text-sm"
                            value={allocation.phase_allocations[phaseIndex] || ""}
                            onChange={(e) => onPhaseAllocationChange(wave.id, allocation.id, phaseIndex, e.target.value)}
                            data-testid={`phase-${phaseIndex}-${allocation.id}`}
                            disabled={isReadOnly}
                          />
                        </td>
                      ))}
                      {/* Calculated columns */}
                      <td className="p-3 text-right font-mono tabular-nums font-semibold text-sm align-middle">{totalManMonths.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-600 align-middle">${baseSalaryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-500 align-middle">
                        ${overheadCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs ml-1">({allocation.overhead_percentage}%)</span>
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold bg-gray-50 align-middle">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold text-[#10B981] bg-green-50/50 align-middle">
                        ${sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        {hasOverride && <div className="text-[10px] line-through text-gray-400">${calcSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-sm text-blue-600 bg-blue-50/30 align-middle">
                        ${spPerMM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        {hasOverride && <div className="text-[10px] line-through text-gray-400">${(totalManMonths > 0 ? calcSellingPrice / totalManMonths : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-sm text-blue-600 bg-blue-50/30 align-middle">
                        ${hourlyPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        {hasOverride && <div className="text-[10px] line-through text-gray-400">${(totalManMonths > 0 ? calcSellingPrice / totalManMonths / 176 : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                      </td>
                      {/* Override hourly rate */}
                      <td className="p-1 text-right bg-purple-50/30 align-middle">
                        <Input
                          type="number"
                          step="1"
                          placeholder=""
                          className="w-16 text-right font-mono text-xs p-1"
                          value={allocation.override_hourly_rate || ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseFloat(e.target.value) : null;
                            setWaves(waves.map(w =>
                              w.id === wave.id
                                ? { ...w, grid_allocations: w.grid_allocations.map(a => a.id === allocation.id ? { ...a, override_hourly_rate: val } : a) }
                                : w
                            ));
                          }}
                          disabled={isReadOnly}
                          data-testid={`override-hr-${allocation.id}`}
                        />
                      </td>
                      {/* Comments */}
                      <td className="p-2 align-middle">
                        <Textarea
                          placeholder="Comments..."
                          className="w-32 h-8 text-xs resize-none min-h-[32px]"
                          value={allocation.comments || ""}
                          onChange={(e) => onAllocationCommentChange(wave.id, allocation.id, e.target.value)}
                          disabled={isReadOnly}
                          data-testid={`comment-${allocation.id}`}
                        />
                      </td>
                      {/* Actions */}
                      <td className="p-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          {!isReadOnly && (
                            <>
                              <Tooltip><TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                                  onClick={() => {
                                    setSplitRangeAllocationId(allocation.id);
                                    setSplitRangeInput("");
                                    setSplitRangeDialogOpen(true);
                                  }}
                                  data-testid={`apply-all-${allocation.id}`}
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger><TooltipContent><p>Apply value to months (supports split ranges)</p></TooltipContent></Tooltip>
                              <Tooltip><TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon"
                                  className="h-7 w-7 text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                                  onClick={() => onCopyAllocation && onCopyAllocation(wave.id, allocation.id)}
                                  data-testid={`copy-allocation-${allocation.id}`}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger><TooltipContent><p>Copy this row as a new row below</p></TooltipContent></Tooltip>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                                onClick={() => onDeleteAllocation(wave.id, allocation.id)}
                                data-testid={`delete-allocation-${allocation.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </DragDropContext>
      )}

      {/* Add Row button — placed immediately after grid, before logistics */}
      {!isReadOnly && wave.engagement_type !== "AMS_Shared" && (
        <div className="flex justify-center -mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddEmptyRow(wave.id)}
            className="bg-white border-dashed border-2 border-[#0EA5E9] text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
            data-testid={`add-row-after-grid-${wave.id}`}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
        </div>
      )}

      {/* Logistics Breakdown */}
      {wave.grid_allocations.length > 0 && waveSummary.travelingResourceCount > 0 && (
        <Card className="bg-purple-50/50 border border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Plane className="w-4 h-4 text-purple-600" />
              Logistics Cost Breakdown
              <Badge variant="outline" className="ml-2 text-purple-600 border-purple-300">
                {waveSummary.travelingResourceCount} traveling resource(s), {waveSummary.travelingMM.toFixed(2)} MM
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Traveling MM/Res</th>
                    <th className="text-right py-2">Rate (USD)</th>
                    <th className="text-right py-2">Qty</th>
                    <th className="text-right py-2 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">Per-diems</td>
                    <td className="text-right font-mono">{waveSummary.travelingMM.toFixed(2)}</td>
                    <td className="text-right font-mono">${waveSummary.logistics.config.per_diem_daily}</td>
                    <td className="text-right font-mono">{waveSummary.logistics.config.per_diem_days}</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.perDiemCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Accommodation</td>
                    <td className="text-right font-mono">{waveSummary.travelingMM.toFixed(2)}</td>
                    <td className="text-right font-mono">${waveSummary.logistics.config.accommodation_daily}</td>
                    <td className="text-right font-mono">{waveSummary.logistics.config.accommodation_days}</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.accommodationCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Local Conveyance</td>
                    <td className="text-right font-mono">{waveSummary.travelingMM.toFixed(2)}</td>
                    <td className="text-right font-mono">${waveSummary.logistics.config.local_conveyance_daily}</td>
                    <td className="text-right font-mono">{waveSummary.logistics.config.local_conveyance_days}</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.conveyanceCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Travel - Air Fare</td>
                    <td className="text-right font-mono">{waveSummary.travelingResourceCount}</td>
                    <td className="text-right font-mono">${waveSummary.logistics.config.flight_cost_per_trip}</td>
                    <td className="text-right font-mono">{waveSummary.logistics.config.num_trips}</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.flightCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Visa & Medical</td>
                    <td className="text-right font-mono">{waveSummary.travelingResourceCount}</td>
                    <td className="text-right font-mono">${waveSummary.logistics.config.visa_medical_per_trip}</td>
                    <td className="text-right font-mono">{waveSummary.logistics.config.num_trips}</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.visaMedicalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Other Contingency</td>
                    <td className="text-right font-mono">1</td>
                    <td className="text-right font-mono">{waveSummary.logistics.config.contingency_percentage}%</td>
                    <td className="text-right font-mono">1</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.contingencyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  {waveSummary.logistics.contingencyAbsolute > 0 && (
                  <tr>
                    <td className="py-1">Contingency (Absolute)</td>
                    <td className="text-right font-mono">-</td>
                    <td className="text-right font-mono">Fixed</td>
                    <td className="text-right font-mono">-</td>
                    <td className="text-right font-mono font-semibold">${waveSummary.logistics.contingencyAbsolute.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  </tr>
                  )}
                  <tr className="border-t-2 font-bold">
                    <td className="py-2">Total</td>
                    <td></td><td></td><td></td>
                    <td className="text-right font-mono text-purple-600">${waveSummary.logistics.totalLogistics.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wave Summary */}
      {wave.grid_allocations.length > 0 && (
        <Card className="bg-[#F8FAFC] border border-[#E2E8F0]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-[#0F172A]">{wave.name} Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Row 1: Man-Months */}
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total MM</p>
                <p className="font-mono font-bold text-xl mt-1">{waveSummary.totalMM.toFixed(2)}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 uppercase tracking-wide">Onsite MM</p>
                <p className="font-mono font-bold text-xl text-[#F59E0B] mt-1">{waveSummary.onsiteMM.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{waveSummary.onsiteResourceCount} resources</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-lg border border-amber-300">
                <p className="text-xs text-amber-800 uppercase tracking-wide">Onsite Avg $/MM</p>
                <p className="font-mono font-bold text-xl text-[#D97706] mt-1">
                  ${waveSummary.onsiteMM > 0 ? (waveSummary.onsiteSellingPrice / waveSummary.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </p>
              </div>
              <div className="bg-sky-50 p-3 rounded-lg border border-sky-200">
                <p className="text-xs text-sky-700 uppercase tracking-wide">Offshore MM</p>
                <p className="font-mono font-bold text-xl text-[#0EA5E9] mt-1">{waveSummary.offshoreMM.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{waveSummary.offshoreResourceCount} resources</p>
              </div>
              <div className="bg-sky-100 p-3 rounded-lg border border-sky-300">
                <p className="text-xs text-sky-800 uppercase tracking-wide">Offshore Avg $/MM</p>
                <p className="font-mono font-bold text-xl text-[#0284C7] mt-1">
                  ${waveSummary.offshoreMM > 0 ? (waveSummary.offshoreSellingPrice / waveSummary.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </p>
              </div>
            </div>
            {/* Row 2: Pricing */}
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-slate-100 p-3 rounded-lg border border-slate-300">
                <p className="text-xs text-slate-600 uppercase tracking-wide">Resources Price</p>
                <p className="font-mono font-bold text-xl text-slate-700 mt-1">${waveSummary.totalRowsSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">sum of rows</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 uppercase tracking-wide">Logistics</p>
                <p className="font-mono font-bold text-xl text-purple-600 mt-1">${waveSummary.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-300">
                <p className="text-xs text-green-700 uppercase tracking-wide">Selling Price</p>
                <p className="font-mono font-bold text-xl text-[#10B981] mt-1">${waveSummary.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">resources + logistics</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 uppercase tracking-wide">Nego Buffer ({waveSummary.negoBufferPercentage}%)</p>
                <p className="font-mono font-bold text-xl text-blue-600 mt-1">${waveSummary.negoBufferAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg border-2 border-emerald-500">
                <p className="text-xs text-emerald-800 uppercase tracking-wide font-semibold">Final Price</p>
                <p className="font-mono font-bold text-2xl text-emerald-700 mt-1">${waveSummary.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
            {/* AMS Shared Support roll-up for the wave (only when wave has AMS shared billing) */}
            {(waveSummary.amsSharedAnnual || 0) > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3" data-testid={`wave-ams-summary-${wave.id}`}>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-700 uppercase tracking-wide">AMS Monthly Billing</p>
                  <p className="font-mono font-bold text-xl text-[#8B5CF6] mt-1" data-testid={`wave-ams-monthly-${wave.id}`}>
                    ${waveSummary.amsSharedMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">hours × hourly rate (all buckets)</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg border border-purple-300">
                  <p className="text-xs text-purple-700 uppercase tracking-wide">AMS Annual ({waveSummary.amsContractMonths} mo)</p>
                  <p className="font-mono font-bold text-xl text-[#8B5CF6] mt-1" data-testid={`wave-ams-annual-${wave.id}`}>
                    ${waveSummary.amsSharedAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">annual recurring</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-purple-50 p-3 rounded-lg border-2 border-[#0F172A]">
                  <p className="text-xs text-[#0F172A] uppercase tracking-wide font-semibold">Wave Grand Total</p>
                  <p className="font-mono font-bold text-2xl text-[#0F172A] mt-1" data-testid={`wave-grand-total-${wave.id}`}>
                    ${waveSummary.grandTotalFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">Final Price + Annual AMS</p>
                </div>
              </div>
            )}
            {/* Effective Profit Margin indicator */}
            {Math.abs(waveSummary.effectiveProfitMargin - profitMarginPercentage) > 0.01 && (
              <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-700 uppercase">Set Margin:</span>
                  <span className="font-mono font-bold text-indigo-600">{profitMarginPercentage.toFixed(1)}%</span>
                </div>
                <span className="text-indigo-300">&rarr;</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-700 uppercase">Effective Margin:</span>
                  <span className={`font-mono font-bold text-lg ${waveSummary.effectiveProfitMargin >= profitMarginPercentage ? 'text-green-600' : 'text-red-600'}`}>
                    {waveSummary.effectiveProfitMargin.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-indigo-400 ml-auto">based on overrides applied</span>
              </div>
            )}
            {/* Row 3: CTC Analytics */}
            <div className="grid grid-cols-5 gap-3">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                <p className="text-xs text-orange-700 uppercase tracking-wide">Onsite CTC</p>
                <p className="font-mono font-bold text-xl text-orange-600 mt-1">${waveSummary.onsiteCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">salary + overhead</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg border border-orange-300">
                <p className="text-xs text-orange-800 uppercase tracking-wide">Onsite Avg CTC/MM</p>
                <p className="font-mono font-bold text-xl text-orange-700 mt-1">
                  ${waveSummary.onsiteMM > 0 ? (waveSummary.onsiteCTC / waveSummary.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </p>
              </div>
              <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
                <p className="text-xs text-teal-700 uppercase tracking-wide">Offshore CTC</p>
                <p className="font-mono font-bold text-xl text-teal-600 mt-1">${waveSummary.offshoreCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">salary + overhead</p>
              </div>
              <div className="bg-teal-100 p-3 rounded-lg border border-teal-300">
                <p className="text-xs text-teal-800 uppercase tracking-wide">Offshore Avg CTC/MM</p>
                <p className="font-mono font-bold text-xl text-teal-700 mt-1">
                  ${waveSummary.offshoreMM > 0 ? (waveSummary.offshoreCTC / waveSummary.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
                </p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                <p className="text-xs text-gray-600 uppercase tracking-wide">Total CTC</p>
                <p className="font-mono font-bold text-xl text-gray-700 mt-1">${waveSummary.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500 mt-0.5">all resources</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* AMS-only Wave Summary (renders for pure AMS_Shared waves where Wave Summary card above is hidden) */}
      {wave.engagement_type === "AMS_Shared" && (waveSummary.amsSharedAnnual || 0) > 0 && (
        <Card className="bg-[#F8FAFC] border border-[#E2E8F0]" data-testid={`wave-ams-only-summary-${wave.id}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-[#0F172A]">{wave.name} Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 uppercase tracking-wide">AMS Monthly Billing</p>
                <p className="font-mono font-bold text-xl text-[#8B5CF6] mt-1" data-testid={`wave-ams-monthly-${wave.id}`}>
                  ${waveSummary.amsSharedMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">hours × hourly rate (all buckets)</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg border border-purple-300">
                <p className="text-xs text-purple-700 uppercase tracking-wide">AMS Annual ({waveSummary.amsContractMonths} mo)</p>
                <p className="font-mono font-bold text-xl text-[#8B5CF6] mt-1" data-testid={`wave-ams-annual-${wave.id}`}>
                  ${waveSummary.amsSharedAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">annual recurring</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-purple-50 p-3 rounded-lg border-2 border-[#0F172A]">
                <p className="text-xs text-[#0F172A] uppercase tracking-wide font-semibold">Wave Grand Total</p>
                <p className="font-mono font-bold text-2xl text-[#0F172A] mt-1" data-testid={`wave-grand-total-${wave.id}`}>
                  ${waveSummary.grandTotalFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">Year-1 contract value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split Range Allocation Dialog */}
      <Dialog open={splitRangeDialogOpen} onOpenChange={setSplitRangeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Apply Values to Months</DialogTitle>
            <DialogDescription>
              Enter a single value for all months, or use split ranges for ramp-up/down patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Value or Range Pattern</Label>
              <Input
                placeholder="e.g., 1 or M1-M3:1, M4-M5:0.5, M6:0"
                value={splitRangeInput}
                onChange={(e) => setSplitRangeInput(e.target.value)}
                data-testid="split-range-input"
              />
              <p className="text-xs text-gray-500 mt-2">
                <strong>Simple:</strong> Enter a number (e.g., <code className="bg-gray-100 px-1 rounded">1</code>) to apply to all months.<br />
                <strong>Split range:</strong> Use <code className="bg-gray-100 px-1 rounded">M1-M3:1, M4-M5:0.5, M6:0</code> format.<br />
                Months use M1, M2, ... matching the wave&apos;s column headers.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#0F172A] hover:bg-[#0F172A]/90"
                data-testid="split-range-apply-btn"
                onClick={() => {
                  const input = splitRangeInput.trim();
                  if (!input) return;
                  const phaseNames = wave.phase_names;
                  // Check if it's a simple number
                  const simpleNum = parseFloat(input);
                  if (!isNaN(simpleNum) && !input.includes("M") && !input.includes(":")) {
                    onApplyToAllMonths(wave.id, splitRangeAllocationId, input);
                    setSplitRangeDialogOpen(false);
                    return;
                  }
                  // Parse split ranges: "M1-M3:1, M4-M5:0.5, M6:0"
                  const segments = input.split(",").map(s => s.trim());
                  const monthValues = {};
                  for (const seg of segments) {
                    const match = seg.match(/^M(\d+)(?:-M(\d+))?:(.+)$/i);
                    if (!match) continue;
                    const start = parseInt(match[1]);
                    const end = match[2] ? parseInt(match[2]) : start;
                    const val = parseFloat(match[3]);
                    if (isNaN(val)) continue;
                    for (let m = start; m <= end; m++) {
                      const idx = m - 1;
                      if (idx >= 0 && idx < phaseNames.length) {
                        // phase_allocations is keyed by index (0,1,2...) — match the inline grid input
                        monthValues[idx] = val;
                      }
                    }
                  }
                  // Apply the values
                  if (Object.keys(monthValues).length > 0) {
                    setWaves(waves.map(w => {
                      if (w.id !== wave.id) return w;
                      return {
                        ...w,
                        grid_allocations: w.grid_allocations.map(a => {
                          if (a.id !== splitRangeAllocationId) return a;
                          const newPhaseAllocations = { ...a.phase_allocations };
                          Object.entries(monthValues).forEach(([idx, val]) => {
                            newPhaseAllocations[idx] = val;
                          });
                          return { ...a, phase_allocations: newPhaseAllocations };
                        })
                      };
                    }));
                    setSplitRangeDialogOpen(false);
                  }
                }}
              >
                Apply
              </Button>
              <Button variant="outline" onClick={() => setSplitRangeDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
