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
import { useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { calculateResourceBaseCost as calcResourceBaseCostUtil } from "@/utils/estimatorCalcs";
import { PROFICIENCY_LEVELS, getGroupColor, PHASE_OPTIONS, getPhaseColor } from "./constants";

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
  // Handlers
  onAddPhaseColumn,
  onRemovePhaseColumn,
  onUpdatePhaseName,
  onOpenLogisticsEditor,
  onAddAllocation,
  onDeleteAllocation,
  onToggleOnsite,
  onToggleTravelRequired,
  onPhaseAllocationChange,
  onSalaryChange,
  onDragEnd,
  onAllocationCommentChange,
  onApplyToAllMonths,
  onAddEmptyRow,
  onDownloadWaveTemplate,
  onDownloadWaveData,
  onUploadWaveGrid,
  onCloneWave,
  onDeleteWave,
  onGridFieldChange,
  milestones = [],
  onSaveMilestones,
}) => {
  const [phasesCollapsed, setPhasesCollapsed] = useState(false);
  const phaseCount = (wave.phase_ranges || []).length;

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
          <span className="text-sm text-gray-600">Duration: {wave.duration_months} months</span>
          <span className="text-sm text-gray-600">Resources: {wave.grid_allocations.length}</span>
          <span className="text-sm text-[#F59E0B]">Onsite: {waveSummary.onsiteResourceCount}</span>
          <span className="text-sm text-purple-600">Traveling: {waveSummary.travelingResourceCount}</span>
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
          <Button size="sm" variant="outline" onClick={() => onOpenLogisticsEditor(wave.id)} data-testid={`edit-logistics-${wave.id}`} disabled={isReadOnly}>
            <Settings className="w-4 h-4 mr-2" /> Logistics Config
          </Button>
          {!isReadOnly && (
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
                    const rate = rates.find(r => r.id === value);
                    setNewAllocation({ ...newAllocation, rate_id: value, custom_salary: rate?.avg_monthly_salary?.toString() || "" });
                  }}>
                    <SelectTrigger id="resource-rate" data-testid="resource-rate-select"><SelectValue placeholder="Select skill" /></SelectTrigger>
                    <SelectContent>
                      {rates.map((rate) => (
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
          {!isReadOnly && (
          <Button size="sm" variant="outline" className="border-gray-400 text-gray-600 hover:bg-gray-50" onClick={() => onAddEmptyRow(wave.id)} data-testid={`add-row-${wave.id}`}>
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onAddPhaseColumn(wave.id)} className="border-teal-600 text-teal-600 hover:bg-teal-50" data-testid={`add-month-${wave.id}`} disabled={isReadOnly}>
            <Plus className="w-4 h-4 mr-1" /> Add Month
          </Button>
          <Button size="sm" variant="outline" onClick={() => onRemovePhaseColumn(wave.id)} className="border-orange-600 text-orange-600 hover:bg-orange-50" data-testid={`remove-month-${wave.id}`} disabled={isReadOnly}>
            <Minus className="w-4 h-4 mr-1" /> Remove Month
          </Button>
          <Button size="sm" variant="outline" onClick={onDownloadWaveTemplate} className="border-emerald-600 text-emerald-600 hover:bg-emerald-50" data-testid="download-template-button">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Download Template
          </Button>
          <Button size="sm" variant="outline" onClick={onDownloadWaveData} className="border-indigo-600 text-indigo-600 hover:bg-indigo-50" data-testid="download-data-button">
            <Download className="w-4 h-4 mr-2" /> Download Data
          </Button>
          {!isReadOnly && (
          <div className="relative">
            <input type="file" accept=".xlsx,.xls" onChange={onUploadWaveGrid} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" data-testid="upload-grid-input" />
            <Button size="sm" variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50 pointer-events-none">
              <Upload className="w-4 h-4 mr-2" /> Upload Grid
            </Button>
          </div>
          )}
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

      {/* Phase Range Editor */}
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
                  type="number" min={0.5} max={wave.phase_names.length} step="0.5"
                  value={pr.start_month}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    if (isNaN(raw)) return;
                    const val = Math.max(0.5, Math.min(wave.phase_names.length, Math.round(raw * 2) / 2));
                    const ranges = [...(wave.phase_ranges || [])];
                    ranges[idx] = { ...ranges[idx], start_month: val, end_month: Math.max(val, ranges[idx].end_month) };
                    setWaves(waves.map(w => w.id === wave.id ? { ...w, phase_ranges: ranges } : w));
                  }}
                  className="h-8 text-center text-xs"
                  disabled={isReadOnly}
                  data-testid={`phase-range-start-${idx}`}
                />
                <Input
                  type="number" min={pr.start_month} max={wave.phase_names.length} step="0.5"
                  value={pr.end_month}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    if (isNaN(raw)) return;
                    const val = Math.max(pr.start_month, Math.min(wave.phase_names.length, Math.round(raw * 2) / 2));
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
                  const leftPct = ((pr.start_month - 1) / totalMonths) * 100;
                  const widthPct = ((pr.end_month - pr.start_month + 1) / totalMonths) * 100;
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
            <p className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide mb-2">Phase Milestones (linked to payments)</p>
            {(wave.phase_ranges || []).map((pr, pIdx) => {
              const phaseMilestones = milestones.filter(m => m.wave_name === wave.name && m.phase_name === pr.name);
              const phaseColor = getPhaseColor(pr.name);
              return (
                <div key={pIdx} className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: phaseColor.bg, border: `1px solid ${phaseColor.border}` }} />
                    <span className="text-[11px] font-semibold" style={{ color: phaseColor.text }}>{pr.name}</span>
                    <span className="text-[9px] text-gray-400">({pr.start_month} → {pr.end_month})</span>
                    {!isReadOnly && (
                      <Button variant="ghost" size="sm" className="h-5 text-[9px] text-amber-600 hover:bg-amber-50 px-1.5 ml-auto" onClick={() => {
                        const mid = Math.round(((pr.start_month + pr.end_month) / 2) * 2) / 2;
                        const targetMonth = `M${Math.ceil(mid)}`;
                        const newMs = {
                          id: crypto.randomUUID(),
                          wave_name: wave.name,
                          milestone_name: "",
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
                        <Plus className="w-3 h-3 mr-0.5" /> Milestone
                      </Button>
                    )}
                  </div>
                  {phaseMilestones.length > 0 ? (
                    <div className="ml-5 space-y-1">
                      {phaseMilestones.map((ms) => {
                        const msIdx = milestones.findIndex(m => m.id === ms.id);
                        return (
                          <div key={ms.id} className="grid grid-cols-[70px_1fr_60px_60px_28px] gap-1.5 items-center" data-testid={`milestone-row-${ms.id}`}>
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

      {/* Grid Table */}
      {wave.grid_allocations.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-300 rounded">
          <p className="text-gray-500">No resources in this wave. Click "Add Resource" or "Add Row" to start.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={(result) => onDragEnd(result, wave.id)}>
        <div className="overflow-x-auto border border-[#E2E8F0] rounded" id="grid-split-container">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-[#E2E8F0] bg-[#F8FAFC]">
                <th className="text-center p-2 font-semibold text-xs w-8" style={{ position: 'sticky', left: 0, zIndex: 10, background: '#F8FAFC' }}></th>
                <th className="text-center p-2 font-semibold text-xs w-8" style={{ position: 'sticky', left: 32, zIndex: 10, background: '#F8FAFC' }}>#</th>
                <th className="text-left p-2 font-semibold text-xs" style={{ position: 'sticky', left: 64, zIndex: 10, background: '#F8FAFC', minWidth: 120, maxWidth: 120 }}>Skill</th>
                <th className="text-left p-2 font-semibold text-xs" style={{ position: 'sticky', left: 184, zIndex: 10, background: '#F8FAFC', minWidth: 106, maxWidth: 106 }}>Level</th>
                <th className="text-left p-2 font-semibold text-xs" style={{ position: 'sticky', left: 290, zIndex: 10, background: '#F8FAFC', minWidth: 106, maxWidth: 106 }}>Location</th>
                <th className="text-right p-2 font-semibold text-xs" style={{ position: 'sticky', left: 396, zIndex: 10, background: '#F8FAFC', minWidth: 86, maxWidth: 86 }}>$/Month</th>
                <th className="text-center p-2 font-semibold text-xs" style={{ position: 'sticky', left: 482, zIndex: 10, background: '#F8FAFC', minWidth: 50, maxWidth: 50 }}>Onsite</th>
                <th className="text-center p-2 font-semibold text-xs" style={{ position: 'sticky', left: 532, zIndex: 10, background: '#F8FAFC', minWidth: 50, maxWidth: 50 }}>Travel</th>
                <th className="text-center p-2 font-semibold text-xs" style={{ position: 'sticky', left: 582, zIndex: 10, background: '#F8FAFC', minWidth: 40, maxWidth: 40, boxShadow: '3px 0 6px rgba(0,0,0,0.1)' }}>Grp</th>
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
                <th className="text-right p-2 font-semibold text-xs bg-gray-100">Total Cost</th>
                <th className="text-right p-2 font-semibold text-xs bg-green-50">Selling Price</th>
                <th className="text-right p-2 font-semibold text-xs bg-blue-50">SP/MM</th>
                <th className="text-right p-2 font-semibold text-xs bg-blue-50">Hourly</th>
                <th className="text-right p-2 font-semibold text-xs bg-purple-50 w-16">Ovr $/Hr</th>
                <th className="text-left p-2 font-semibold text-xs">Comments</th>
                <th className="text-center p-2 font-semibold text-xs">Actions</th>
              </tr>
            </thead>
            <Droppable droppableId={`wave-${wave.id}`}>
              {(provided) => (
            <tbody ref={provided.innerRef} {...provided.droppableProps}>
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
                const stickyBg = allocation.is_onsite && allocation.travel_required
                  ? '#FEF3C7'
                  : allocation.is_onsite
                  ? '#FFFBEB'
                  : '#FFFFFF';
                const groupColor = getGroupColor(allocation.resource_group_id);
                return (
                  <Draggable key={allocation.id} draggableId={allocation.id} index={rowIdx} isDragDisabled={isReadOnly}>
                    {(dragProvided, snapshot) => (
                  <tr
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={`border-b border-[#E2E8F0] ${rowBg} ${snapshot.isDragging ? "shadow-lg opacity-90 bg-blue-50" : ""}`}
                    style={{ ...dragProvided.draggableProps.style, borderLeft: groupColor ? `4px solid ${groupColor}` : undefined }}
                    data-testid={`allocation-row-${allocation.id}`}
                  >
                    {/* Drag handle */}
                    <td className="p-1 text-center" style={{ position: 'sticky', left: 0, zIndex: 2, background: stickyBg }} {...dragProvided.dragHandleProps}>
                      {!isReadOnly && <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-grab mx-auto" />}
                    </td>
                    {/* Row number */}
                    <td className="p-1 text-center text-xs text-gray-400 font-mono" style={{ position: 'sticky', left: 32, zIndex: 2, background: stickyBg }}>{rowIdx + 1}</td>
                    {/* Skill */}
                    <td className="p-1" style={{ position: 'sticky', left: 64, zIndex: 2, background: stickyBg, minWidth: 120, maxWidth: 120 }}>
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
                            options={skills.map(s => ({ value: s.id, label: s.name }))}
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
                    <td className="p-1" style={{ position: 'sticky', left: 184, zIndex: 2, background: stickyBg, minWidth: 106, maxWidth: 106 }}>
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
                    <td className="p-1" style={{ position: 'sticky', left: 290, zIndex: 2, background: stickyBg, minWidth: 106, maxWidth: 106 }}>
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
                    <td className="p-1 text-right" style={{ position: 'sticky', left: 396, zIndex: 2, background: stickyBg, minWidth: 86, maxWidth: 86 }}>
                      <Tooltip><TooltipTrigger asChild><div>
                        <Input
                          type="number"
                          className="w-[74px] text-right font-mono text-xs h-7"
                          value={allocation.avg_monthly_salary}
                          onChange={(e) => onSalaryChange(wave.id, allocation.id, e.target.value)}
                          data-testid={`salary-${allocation.id}`}
                          disabled={isReadOnly}
                        />
                      </div></TooltipTrigger><TooltipContent side="bottom">
                        <p className="text-xs font-medium">${Number(allocation.avg_monthly_salary || 0).toLocaleString()}/month</p>
                        {allocation.original_monthly_salary > 0 && allocation.avg_monthly_salary !== allocation.original_monthly_salary && (
                          <p className="text-[10px] text-gray-400">Master rate: ${Number(allocation.original_monthly_salary).toLocaleString()}</p>
                        )}
                      </TooltipContent></Tooltip>
                    </td>
                    {/* Onsite */}
                    <td className="p-1 text-center" style={{ position: 'sticky', left: 482, zIndex: 2, background: stickyBg, minWidth: 50, maxWidth: 50 }}>
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
                    <td className="p-1 text-center" style={{ position: 'sticky', left: 532, zIndex: 2, background: stickyBg, minWidth: 50, maxWidth: 50 }}>
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
                    <td className="p-1 text-center" style={{ position: 'sticky', left: 582, zIndex: 2, background: stickyBg, minWidth: 40, maxWidth: 40, boxShadow: '3px 0 6px rgba(0,0,0,0.1)' }}>
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
                    {/* Phase columns */}
                    {wave.phase_names.map((_, phaseIndex) => (
                      <td key={phaseIndex} className="p-2">
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
                    <td className="p-3 text-right font-mono tabular-nums font-semibold text-sm">{totalManMonths.toFixed(1)}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-600">${baseSalaryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-500">
                      ${overheadCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      <span className="text-xs ml-1">({allocation.overhead_percentage}%)</span>
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold bg-gray-50">${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold text-[#10B981] bg-green-50/50">
                      ${sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      {hasOverride && <div className="text-[10px] line-through text-gray-400">${calcSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm text-blue-600 bg-blue-50/30">
                      ${spPerMM.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      {hasOverride && <div className="text-[10px] line-through text-gray-400">${(totalManMonths > 0 ? calcSellingPrice / totalManMonths : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums text-sm text-blue-600 bg-blue-50/30">
                      ${hourlyPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      {hasOverride && <div className="text-[10px] line-through text-gray-400">${(totalManMonths > 0 ? calcSellingPrice / totalManMonths / 176 : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                    </td>
                    {/* Override hourly rate */}
                    <td className="p-1 text-right bg-purple-50/30">
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
                    <td className="p-2">
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
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {!isReadOnly && (
                          <>
                            <Tooltip><TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                                onClick={() => {
                                  const value = prompt(`Enter MM value to apply to all ${wave.phase_names.length} months:`, "1");
                                  if (value !== null) onApplyToAllMonths(wave.id, allocation.id, value);
                                }}
                                data-testid={`apply-all-${allocation.id}`}
                              >
                                <Calculator className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger><TooltipContent><p>Apply same value to all months</p></TooltipContent></Tooltip>
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
        </DragDropContext>
      )}

      {/* Logistics Breakdown */}
      {wave.grid_allocations.length > 0 && waveSummary.travelingResourceCount > 0 && (
        <Card className="bg-purple-50/50 border border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Plane className="w-4 h-4 text-purple-600" />
              Logistics Cost Breakdown
              <Badge variant="outline" className="ml-2 text-purple-600 border-purple-300">
                {waveSummary.travelingResourceCount} traveling resource(s), {waveSummary.travelingMM.toFixed(1)} MM
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
                <p className="font-mono font-bold text-xl mt-1">{waveSummary.totalMM.toFixed(1)}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-700 uppercase tracking-wide">Onsite MM</p>
                <p className="font-mono font-bold text-xl text-[#F59E0B] mt-1">{waveSummary.onsiteMM.toFixed(1)}</p>
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
                <p className="font-mono font-bold text-xl text-[#0EA5E9] mt-1">{waveSummary.offshoreMM.toFixed(1)}</p>
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
    </div>
  );
};
