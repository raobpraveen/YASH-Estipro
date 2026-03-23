import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Download, ChevronDown, ChevronRight, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const generateId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const PhaseActivitiesModal = ({ open, onOpenChange, projectId, waves, projectName, projectNumber, technologies, subTechnologies, projectTypes, projectTypeIds, technologyIds, subTechnologyIds }) => {
  const [selectedWave, setSelectedWave] = useState("");
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [editingPhase, setEditingPhase] = useState("");
  const [activities, setActivities] = useState([]);
  const [waveActivities, setWaveActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  // Adopt template selectors
  const [adoptTechId, setAdoptTechId] = useState("");
  const [adoptSubTechId, setAdoptSubTechId] = useState("");
  const [adoptProjTypeId, setAdoptProjTypeId] = useState("");
  const [adopting, setAdopting] = useState(false);

  // All project activities (for overview)
  const [allActivities, setAllActivities] = useState([]);
  const [exporting, setExporting] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const currentWave = waves.find(w => w.name === selectedWave);
  const phases = currentWave ? (currentWave.phase_ranges || []).map(p => p.name).filter(Boolean) : [];
  const filteredSubTechs = (subTechnologies || []).filter(s => s.technology_id === adoptTechId);

  useEffect(() => {
    if (open && projectId) {
      loadAllActivities();
      if (waves.length > 0 && !selectedWave) setSelectedWave(waves[0].name);
      // Pre-fill adopt selectors from project settings
      if (technologyIds?.length > 0) setAdoptTechId(technologyIds[0]);
      if (subTechnologyIds?.length > 0) setAdoptSubTechId(subTechnologyIds[0]);
      if (projectTypeIds?.length > 0) setAdoptProjTypeId(projectTypeIds[0]);
    }
  }, [open, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingPhase && selectedWave && projectId) loadPhaseActivities();
  }, [editingPhase, selectedWave, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllActivities = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/activities`, { headers });
      setAllActivities(res.data || []);
    } catch { /* ignore */ }
  };

  const loadPhaseActivities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/projects/${projectId}/activities/${encodeURIComponent(selectedWave)}/${encodeURIComponent(editingPhase)}`, { headers });
      setActivities(res.data.activities || []);
      setWaveActivities(res.data.wave_activities || []);
    } catch {
      setActivities([]);
      setWaveActivities([]);
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!selectedWave || !editingPhase) return;
    setSaving(true);
    try {
      await axios.put(`${API}/projects/${projectId}/activities/${encodeURIComponent(selectedWave)}/${encodeURIComponent(editingPhase)}`, {
        activities,
        wave_activities: waveActivities,
      }, { headers });
      toast.success(`Activities saved for ${editingPhase}`);
      loadAllActivities();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const handleAdoptSelected = async () => {
    if (!adoptTechId || !adoptProjTypeId || selectedPhases.length === 0 || !selectedWave) {
      toast.error("Select technology, project type, and at least one phase");
      return;
    }
    setAdopting(true);
    try {
      const res = await axios.post(`${API}/projects/${projectId}/activities/adopt-templates`, {
        technology_id: adoptTechId,
        sub_technology_id: adoptSubTechId || "",
        project_type_id: adoptProjTypeId,
        wave_name: selectedWave,
        phase_names: selectedPhases,
      }, { headers });
      const adopted = res.data.adopted || [];
      toast.success(`Templates adopted for ${adopted.length} phase(s): ${adopted.map(a => `${a.phase_name} (${a.count})`).join(", ")}`);
      loadAllActivities();
      if (editingPhase && selectedPhases.includes(editingPhase)) loadPhaseActivities();
      setSelectedPhases([]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to adopt templates");
    } finally { setAdopting(false); }
  };

  const togglePhaseSelect = (phase) => {
    setSelectedPhases(prev => prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]);
  };
  const selectAllPhases = () => {
    setSelectedPhases(prev => prev.length === phases.length ? [] : [...phases]);
  };

  const addItem = (list, setter, isDeliverable) => {
    setter([...list, { id: generateId(), name: "", description: "", is_deliverable: isDeliverable, owner: "", sort_order: list.length }]);
  };
  const updateItem = (list, setter, id, field, value) => {
    setter(list.map(a => a.id === id ? { ...a, [field]: value } : a));
  };
  const removeItem = (list, setter, id) => {
    setter(list.filter(a => a.id !== id));
  };

  const toggleSection = (key) => setCollapsedSections(p => ({ ...p, [key]: !p[key] }));

  const getPhaseStats = (waveName, phaseName) => {
    const match = allActivities.find(a => a.wave_name === waveName && a.phase_name === phaseName);
    if (!match) return { activities: 0, deliverables: 0, waveItems: 0 };
    const acts = (match.activities || []);
    const wActs = (match.wave_activities || []);
    return {
      activities: acts.filter(a => !a.is_deliverable).length,
      deliverables: acts.filter(a => a.is_deliverable).length,
      waveItems: wActs.length,
    };
  };

  // Export activities to Excel
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const allRes = await axios.get(`${API}/projects/${projectId}/activities`, { headers });
      const allData = allRes.data || [];
      if (allData.length === 0) { toast.error("No activities to export"); setExporting(false); return; }

      const wb = new ExcelJS.Workbook();
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      const actFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
      const delFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
      const waveFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      const border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

      // Group by wave
      const waveMap = {};
      allData.forEach(d => {
        if (!waveMap[d.wave_name]) waveMap[d.wave_name] = [];
        waveMap[d.wave_name].push(d);
      });

      for (const [waveName, phaseData] of Object.entries(waveMap)) {
        const sheetName = `${waveName} Activities`.substring(0, 31);
        const ws = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: "FF6366F1" } } });
        ws.columns = [{ width: 5 }, { width: 8 }, { width: 30 }, { width: 40 }, { width: 16 }, { width: 12 }];

        ws.addRow([`${waveName} — Activities & Deliverables`]).font = { bold: true, size: 14 };
        ws.addRow([`Project: ${projectNumber || ""} ${projectName || ""}`]).font = { italic: true, color: { argb: "FF64748B" } };
        ws.addRow([]);

        const sortedPhases = phaseData.sort((a, b) => {
          const wave = waves.find(w => w.name === waveName);
          if (!wave) return 0;
          const pi = (wave.phase_ranges || []).findIndex(p => p.name === a.phase_name);
          const qi = (wave.phase_ranges || []).findIndex(p => p.name === b.phase_name);
          return pi - qi;
        });

        for (const pd of sortedPhases) {
          const templateActs = (pd.activities || []).filter(a => !a.is_deliverable);
          const templateDels = (pd.activities || []).filter(a => a.is_deliverable);
          const waveItems = pd.wave_activities || [];
          const total = templateActs.length + templateDels.length + waveItems.length;
          if (total === 0) continue;

          // Phase header
          const phR = ws.addRow(["", pd.phase_name]);
          phR.getCell(2).font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
          phR.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

          // Activities
          if (templateActs.length > 0) {
            const hdr = ws.addRow(["", "#", "Activity", "Description", "Owner", "Source"]);
            hdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
            templateActs.forEach((a, i) => {
              const r = ws.addRow(["", i + 1, a.name, a.description || "", a.owner || "", "Template"]);
              r.eachCell(c => { c.fill = actFill; c.border = border; });
            });
          }

          // Deliverables
          if (templateDels.length > 0) {
            const hdr = ws.addRow(["", "#", "Deliverable", "Description", "Owner", "Source"]);
            hdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
            templateDels.forEach((d, i) => {
              const r = ws.addRow(["", i + 1, d.name, d.description || "", d.owner || "", "Template"]);
              r.eachCell(c => { c.fill = delFill; c.border = border; });
            });
          }

          // Wave-specific items
          if (waveItems.length > 0) {
            const hdr = ws.addRow(["", "#", "Wave-Specific Item", "Description", "Owner", "Source"]);
            hdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });
            waveItems.forEach((w, i) => {
              const r = ws.addRow(["", i + 1, w.name, w.description || "", w.owner || "", "Wave"]);
              r.eachCell(c => { c.fill = waveFill; c.border = border; });
            });
          }
          ws.addRow([]);
        }
      }

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      saveAs(blob, `${projectNumber || "Project"}_Activities.xlsx`);
      toast.success("Activities exported to Excel");
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally { setExporting(false); }
  };

  const actItems = activities.filter(a => !a.is_deliverable);
  const delItems = activities.filter(a => a.is_deliverable);
  const waveActItems = waveActivities.filter(a => !a.is_deliverable);
  const waveDelItems = waveActivities.filter(a => a.is_deliverable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" data-testid="activities-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Phase Activities & Deliverables
          </DialogTitle>
          <DialogDescription>Adopt from templates or customize per project. Wave-specific items are additive.</DialogDescription>
        </DialogHeader>

        {/* Wave Selector + Export */}
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Wave</label>
            <Select value={selectedWave} onValueChange={(v) => { setSelectedWave(v); setEditingPhase(""); }}>
              <SelectTrigger data-testid="activities-wave-select"><SelectValue placeholder="Select wave" /></SelectTrigger>
              <SelectContent>{waves.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting} className="text-indigo-600 border-indigo-200" data-testid="export-activities-btn">
              <FileSpreadsheet className="w-4 h-4 mr-1" />{exporting ? "Exporting..." : "Export Excel"}
            </Button>
          </div>
        </div>

        {/* Adopt Templates Section */}
        {selectedWave && phases.length > 0 && (
          <div className="border rounded-lg p-3 bg-indigo-50/30 space-y-3">
            <p className="text-sm font-semibold text-[#0F172A]">Adopt from Template</p>
            <div className="grid grid-cols-3 gap-2">
              <Select value={adoptTechId} onValueChange={(v) => { setAdoptTechId(v); setAdoptSubTechId(""); }}>
                <SelectTrigger className="text-xs h-8" data-testid="adopt-tech-select"><SelectValue placeholder="Technology" /></SelectTrigger>
                <SelectContent>{(technologies || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={adoptSubTechId} onValueChange={setAdoptSubTechId}>
                <SelectTrigger className="text-xs h-8" data-testid="adopt-subtech-select"><SelectValue placeholder="Sub-Technology" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Any</SelectItem>
                  {filteredSubTechs.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={adoptProjTypeId} onValueChange={setAdoptProjTypeId}>
                <SelectTrigger className="text-xs h-8" data-testid="adopt-projtype-select"><SelectValue placeholder="Project Type" /></SelectTrigger>
                <SelectContent>{(projectTypes || []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={selectAllPhases}>
                {selectedPhases.length === phases.length ? "Deselect All" : "Select All"}
              </Button>
              {phases.map(p => (
                <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer bg-white border rounded-md px-2 py-1 hover:border-indigo-300">
                  <Checkbox checked={selectedPhases.includes(p)} onCheckedChange={() => togglePhaseSelect(p)} className="w-3.5 h-3.5" />
                  {p}
                </label>
              ))}
            </div>
            <Button size="sm" onClick={handleAdoptSelected} disabled={adopting || selectedPhases.length === 0 || !adoptTechId || !adoptProjTypeId}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs" data-testid="adopt-selected-btn">
              <Download className="w-3.5 h-3.5 mr-1" />{adopting ? "Adopting..." : `Adopt for ${selectedPhases.length} Phase(s)`}
            </Button>
          </div>
        )}

        {/* Phase Overview Grid */}
        {selectedWave && !editingPhase && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#0F172A]">Phases — {selectedWave}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {phases.map(p => {
                const stats = getPhaseStats(selectedWave, p);
                const total = stats.activities + stats.deliverables + stats.waveItems;
                return (
                  <div key={p} className="bg-white border rounded-lg p-3 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
                    onClick={() => setEditingPhase(p)} data-testid={`phase-card-${p}`}>
                    <p className="text-sm font-semibold text-[#0F172A] mb-1">{p}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {stats.activities > 0 && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">{stats.activities} act</Badge>}
                      {stats.deliverables > 0 && <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">{stats.deliverables} del</Badge>}
                      {stats.waveItems > 0 && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">{stats.waveItems} wave</Badge>}
                      {total === 0 && <span className="text-[10px] text-gray-400">No items</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase Editor */}
        {editingPhase && (loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditingPhase("")}>
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </Button>
                <span className="font-semibold text-[#0F172A]">{editingPhase}</span>
                <span className="text-xs text-gray-400">({selectedWave})</span>
              </div>
            </div>

            {/* Template Activities Section */}
            <ActivitySection
              title="Activities" subtitle="(from template)" badgeColor="blue"
              items={actItems} collapsed={collapsedSections["tpl_act"]}
              onToggle={() => toggleSection("tpl_act")}
              onAdd={() => addItem(activities, setActivities, false)}
              onUpdate={(id, f, v) => updateItem(activities, setActivities, id, f, v)}
              onRemove={(id) => removeItem(activities, setActivities, id)}
              testIdPrefix="tpl-act"
            />
            <ActivitySection
              title="Deliverables" subtitle="(from template)" badgeColor="green"
              items={delItems} collapsed={collapsedSections["tpl_del"]}
              onToggle={() => toggleSection("tpl_del")}
              onAdd={() => addItem(activities, setActivities, true)}
              onUpdate={(id, f, v) => updateItem(activities, setActivities, id, f, v)}
              onRemove={(id) => removeItem(activities, setActivities, id)}
              testIdPrefix="tpl-del"
            />

            {/* Wave-Specific Section */}
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">Wave-Specific Additions</p>
              <ActivitySection
                title="Wave Activities" badgeColor="amber"
                items={waveActItems} collapsed={collapsedSections["wave_act"]}
                onToggle={() => toggleSection("wave_act")}
                onAdd={() => addItem(waveActivities, setWaveActivities, false)}
                onUpdate={(id, f, v) => updateItem(waveActivities, setWaveActivities, id, f, v)}
                onRemove={(id) => removeItem(waveActivities, setWaveActivities, id)}
                testIdPrefix="wave-act"
              />
              <ActivitySection
                title="Wave Deliverables" badgeColor="amber"
                items={waveDelItems} collapsed={collapsedSections["wave_del"]}
                onToggle={() => toggleSection("wave_del")}
                onAdd={() => addItem(waveActivities, setWaveActivities, true)}
                onUpdate={(id, f, v) => updateItem(waveActivities, setWaveActivities, id, f, v)}
                onRemove={(id) => removeItem(waveActivities, setWaveActivities, id)}
                testIdPrefix="wave-del"
              />
            </div>
          </div>
        ))}

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => editingPhase ? setEditingPhase("") : onOpenChange(false)}>
            {editingPhase ? "Back to Overview" : "Close"}
          </Button>
          {editingPhase && (
            <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="save-activities-btn">
              <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Reusable sub-section for activities/deliverables list
const ActivitySection = ({ title, subtitle, badgeColor, items, collapsed, onToggle, onAdd, onUpdate, onRemove, testIdPrefix }) => {
  const colors = {
    blue: { badge: "bg-blue-50 text-blue-700", border: "border-blue-200" },
    green: { badge: "bg-green-50 text-green-700", border: "border-green-200" },
    amber: { badge: "bg-amber-50 text-amber-700", border: "border-amber-200" },
  };
  const c = colors[badgeColor] || colors.blue;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          <span className="text-sm font-bold text-[#0F172A]">{title}</span>
          {subtitle && <span className="text-[10px] text-gray-400">{subtitle}</span>}
          <Badge variant="outline" className={`text-[10px] ${c.badge} ${c.border}`}>{items.length}</Badge>
        </div>
        {!collapsed && (
          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); onAdd(); }} className="text-xs h-6" data-testid={`${testIdPrefix}-add-btn`}>
            <Plus className="w-3 h-3 mr-1" />Add
          </Button>
        )}
      </div>
      {!collapsed && (
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-6 py-1">#</TableHead>
            <TableHead className="py-1">Name</TableHead>
            <TableHead className="py-1">Description</TableHead>
            <TableHead className="w-24 py-1">Owner</TableHead>
            <TableHead className="w-8 py-1"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-xs text-gray-400 py-2">None yet</TableCell></TableRow>
            ) : items.map((a, i) => (
              <TableRow key={a.id}>
                <TableCell className="text-[10px] text-gray-400 py-1">{i + 1}</TableCell>
                <TableCell className="py-1"><Input value={a.name} onChange={e => onUpdate(a.id, "name", e.target.value)} className="h-7 text-xs" data-testid={`${testIdPrefix}-name-${i}`} /></TableCell>
                <TableCell className="py-1"><Input value={a.description || ""} onChange={e => onUpdate(a.id, "description", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell className="py-1"><Input value={a.owner || ""} onChange={e => onUpdate(a.id, "owner", e.target.value)} className="h-7 text-xs" /></TableCell>
                <TableCell className="py-1"><Button variant="ghost" size="sm" onClick={() => onRemove(a.id)} className="text-red-400 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
