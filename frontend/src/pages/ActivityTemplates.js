import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, FileText, ChevronDown, ChevronRight, CheckSquare, ListChecks, Search, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const generateId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export default function ActivityTemplates() {
  const [technologies, setTechnologies] = useState([]);
  const [subTechnologies, setSubTechnologies] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Filters
  const [selTech, setSelTech] = useState("");
  const [selSubTech, setSelSubTech] = useState("");
  const [selProjType, setSelProjType] = useState("");

  // Editor state
  const [editPhase, setEditPhase] = useState("");
  const [editActivities, setEditActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [newPhaseName, setNewPhaseName] = useState("");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/technologies`, { headers }),
      axios.get(`${API}/sub-technologies`, { headers }),
      axios.get(`${API}/project-types`, { headers }),
      axios.get(`${API}/activity-templates`, { headers }),
    ]).then(([techRes, subRes, ptRes, tplRes]) => {
      setTechnologies(techRes.data || []);
      setSubTechnologies(subRes.data || []);
      setProjectTypes(ptRes.data || []);
      setTemplates(tplRes.data || []);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredSubTechs = subTechnologies.filter(s => s.technology_id === selTech);

  // Ctrl+S keyboard shortcut ref
  const saveRef = useRef(null);

  const filteredTemplates = templates.filter(t =>
    (!selTech || t.technology_id === selTech) &&
    (!selSubTech || t.sub_technology_id === selSubTech) &&
    (!selProjType || t.project_type_id === selProjType)
  );

  // Group templates by phase
  const phaseNames = [...new Set(filteredTemplates.map(t => t.phase_name))].sort();

  const loadPhaseEditor = (phaseName) => {
    if (editPhase === phaseName) { setEditPhase(""); return; }
    const tpl = filteredTemplates.find(t => t.phase_name === phaseName);
    setEditActivities(tpl ? [...tpl.activities] : []);
    setEditPhase(phaseName);
  };

  const handleSavePhase = async () => {
    if (!selTech || !selProjType || !editPhase) { toast.error("Select Technology, Project Type, and Phase"); return; }
    setSaving(true);
    try {
      const techName = technologies.find(t => t.id === selTech)?.name || "";
      const subTechName = filteredSubTechs.find(s => s.id === selSubTech)?.name || "";
      const ptName = projectTypes.find(p => p.id === selProjType)?.name || "";
      const res = await axios.put(`${API}/activity-templates`, {
        technology_id: selTech,
        sub_technology_id: selSubTech || "",
        project_type_id: selProjType,
        phase_name: editPhase,
        activities: editActivities,
        technology_name: techName,
        sub_technology_name: subTechName,
        project_type_name: ptName,
      }, { headers });
      toast.success(`Template saved for ${editPhase}`);
      // Refresh templates
      const tplRes = await axios.get(`${API}/activity-templates`, { headers });
      setTemplates(tplRes.data || []);
    } catch (err) {
      toast.error("Failed to save template");
    } finally { setSaving(false); }
  };

  // Ctrl+S keyboard shortcut
  saveRef.current = handleSavePhase;
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (saveRef.current && editPhase) saveRef.current();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editPhase]);

  const handleDeletePhase = async (phaseName) => {
    const tpl = filteredTemplates.find(t => t.phase_name === phaseName);
    if (!tpl) return;
    if (!window.confirm(`Delete template for phase "${phaseName}"?`)) return;
    try {
      await axios.delete(`${API}/activity-templates/${tpl.id}`, { headers });
      toast.success("Template deleted");
      const tplRes = await axios.get(`${API}/activity-templates`, { headers });
      setTemplates(tplRes.data || []);
      if (editPhase === phaseName) setEditPhase("");
    } catch { toast.error("Failed to delete"); }
  };

  const addItem = (isDeliverable) => {
    setEditActivities(prev => [...prev, {
      id: generateId(), name: "", description: "", is_deliverable: isDeliverable, owner: "", sort_order: prev.length,
    }]);
  };

  const updateItem = (id, field, value) => {
    setEditActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeItem = (id) => {
    setEditActivities(prev => prev.filter(a => a.id !== id));
  };

  const addNewPhase = () => {
    const name = newPhaseName.trim();
    if (!name) return;
    if (phaseNames.includes(name)) { toast.error("Phase already exists"); return; }
    setNewPhaseName("");
    setEditActivities([]);
    setEditPhase(name);
  };

  const toggleSection = (key) => setCollapsedSections(p => ({ ...p, [key]: !p[key] }));
  const activities = editActivities.filter(a => !a.is_deliverable);
  const deliverables = editActivities.filter(a => a.is_deliverable);

  // Excel Export — download all templates for the selected combination
  const handleExportTemplates = async () => {
    if (!selTech || !selProjType) { toast.error("Select Technology and Project Type first"); return; }
    const techName = technologies.find(t => t.id === selTech)?.name || "Tech";
    const subTechName = filteredSubTechs.find(s => s.id === selSubTech)?.name || "";
    const ptName = projectTypes.find(p => p.id === selProjType)?.name || "Type";

    const wb = new ExcelJS.Workbook();
    const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const actFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    const delFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    const border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };

    for (const phase of phaseNames) {
      const tpl = filteredTemplates.find(t => t.phase_name === phase);
      if (!tpl) continue;
      const sheetName = phase.substring(0, 31);
      const ws = wb.addWorksheet(sheetName);
      ws.columns = [{ width: 5 }, { width: 30 }, { width: 40 }, { width: 16 }, { width: 14 }];

      // Metadata for import
      ws.addRow([`Phase: ${phase}`]).font = { bold: true, size: 14 };
      ws.addRow([`Technology: ${techName}`, `Sub-Technology: ${subTechName}`, `Project Type: ${ptName}`]).font = { italic: true, color: { argb: "FF64748B" } };
      ws.addRow([]);

      const hdr = ws.addRow(["#", "Name", "Description", "Owner", "Type"]);
      hdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = border; });

      tpl.activities.forEach((a, i) => {
        const r = ws.addRow([i + 1, a.name, a.description || "", a.owner || "", a.is_deliverable ? "Deliverable" : "Activity"]);
        r.eachCell(c => { c.fill = a.is_deliverable ? delFill : actFill; c.border = border; });
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `ActivityTemplate_${techName}_${subTechName || "All"}_${ptName}.xlsx`);
    toast.success("Templates exported");
  };

  // Excel Import — upload templates from Excel
  const handleImportTemplates = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selTech || !selProjType) { toast.error("Select Technology and Project Type first, then upload"); return; }

    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const techName = technologies.find(t => t.id === selTech)?.name || "";
      const subTechName = filteredSubTechs.find(s => s.id === selSubTech)?.name || "";
      const ptName = projectTypes.find(p => p.id === selProjType)?.name || "";

      let imported = 0;
      for (const ws of wb.worksheets) {
        // Parse phase name from row 1
        const r1Val = (ws.getRow(1).getCell(1).value || "").toString().trim();
        const match = r1Val.match(/^Phase:\s*(.+)$/i);
        const phaseName = match ? match[1].trim() : ws.name.trim();
        if (!phaseName) continue;

        // Parse activities from row 5+ (after header at row 4)
        const items = [];
        for (let r = 5; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const num = row.getCell(1).value;
          if (!num || isNaN(parseInt(num))) continue;
          const name = (row.getCell(2).value || "").toString().trim();
          if (!name) continue;
          const desc = (row.getCell(3).value || "").toString().trim();
          const owner = (row.getCell(4).value || "").toString().trim();
          const typeVal = (row.getCell(5).value || "").toString().trim().toLowerCase();
          items.push({
            id: generateId(),
            name,
            description: desc,
            owner,
            is_deliverable: typeVal.includes("deliverable"),
            sort_order: items.length,
          });
        }

        if (items.length > 0) {
          await axios.put(`${API}/activity-templates`, {
            technology_id: selTech,
            sub_technology_id: selSubTech || "",
            project_type_id: selProjType,
            phase_name: phaseName,
            activities: items,
            technology_name: techName,
            sub_technology_name: subTechName,
            project_type_name: ptName,
          }, { headers });
          imported++;
        }
      }

      // Refresh
      const tplRes = await axios.get(`${API}/activity-templates`, { headers });
      setTemplates(tplRes.data || []);
      toast.success(`Imported ${imported} phase template(s) from Excel`);
    } catch (err) {
      toast.error("Import failed: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="activity-templates-page">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-indigo-600" />
        <div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Activity Templates</h1>
          <p className="text-sm text-gray-500">Define reusable phase activities & deliverables per Technology, Sub-Technology, and Project Type</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Technology *</label>
              <Select value={selTech} onValueChange={(v) => { setSelTech(v); setSelSubTech(""); setEditPhase(""); }}>
                <SelectTrigger data-testid="tpl-tech-select"><SelectValue placeholder="Select technology" /></SelectTrigger>
                <SelectContent>{technologies.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sub-Technology</label>
              <Select value={selSubTech} onValueChange={(v) => { setSelSubTech(v); setEditPhase(""); }}>
                <SelectTrigger data-testid="tpl-subtech-select"><SelectValue placeholder="Any sub-technology" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any</SelectItem>
                  {filteredSubTechs.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Project Type *</label>
              <Select value={selProjType} onValueChange={(v) => { setSelProjType(v); setEditPhase(""); }}>
                <SelectTrigger data-testid="tpl-projtype-select"><SelectValue placeholder="Select project type" /></SelectTrigger>
                <SelectContent>{projectTypes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template phases list */}
      {selTech && selProjType ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F172A]">
              Phases
              <span className="text-sm font-normal text-gray-400 ml-2">({phaseNames.length} defined)</span>
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportTemplates} className="text-indigo-600 border-indigo-200 text-xs" data-testid="export-templates-btn">
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Export Excel
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".xlsx,.xls" onChange={handleImportTemplates} className="hidden" />
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs border border-indigo-200 text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Import Excel
                </span>
              </label>
              <Input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)} placeholder="New phase name..." className="h-8 w-48 text-sm" data-testid="new-phase-input"
                onKeyDown={e => e.key === "Enter" && addNewPhase()} />
              <Button size="sm" variant="outline" onClick={addNewPhase} disabled={!newPhaseName.trim()} data-testid="add-phase-btn">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Phase
              </Button>
            </div>
          </div>

          {phaseNames.length === 0 && !editPhase && (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
              <CardContent className="py-10 text-center text-gray-400">
                <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No templates yet for this combination. Add a phase to get started.</p>
              </CardContent>
            </Card>
          )}

          {/* Phase cards */}
          {[...phaseNames, ...(editPhase && !phaseNames.includes(editPhase) ? [editPhase] : [])].map(phase => {
            const tpl = filteredTemplates.find(t => t.phase_name === phase);
            const actCount = tpl ? tpl.activities.filter(a => !a.is_deliverable).length : 0;
            const delCount = tpl ? tpl.activities.filter(a => a.is_deliverable).length : 0;
            const isEditing = editPhase === phase;

            return (
              <Card key={phase} className={`border transition-colors ${isEditing ? "border-indigo-300 shadow-md" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="flex items-center justify-between px-5 py-3 cursor-pointer" onClick={() => loadPhaseEditor(phase)}>
                  <div className="flex items-center gap-3">
                    {isEditing ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="font-semibold text-[#0F172A]">{phase}</span>
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">{actCount} activities</Badge>
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">{delCount} deliverables</Badge>
                  </div>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-600 h-7" onClick={() => handleDeletePhase(phase)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <CardContent className="pt-0 pb-4 space-y-4">
                    {/* Activities */}
                    <div>
                      <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection(`act_${phase}`)}>
                        <div className="flex items-center gap-2">
                          {collapsedSections[`act_${phase}`] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span className="text-sm font-bold">Activities</span>
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{activities.length}</span>
                        </div>
                        {!collapsedSections[`act_${phase}`] && (
                          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); addItem(false); }} className="text-xs h-7" data-testid={`add-tpl-activity-${phase}`}>
                            <Plus className="w-3 h-3 mr-1" />Activity
                          </Button>
                        )}
                      </div>
                      {!collapsedSections[`act_${phase}`] && (
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-28">Owner</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {activities.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center text-sm text-gray-400 py-3">No activities</TableCell></TableRow>
                            ) : activities.map((a, i) => (
                              <TableRow key={a.id}>
                                <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                                <TableCell><Input value={a.name} onChange={e => updateItem(a.id, "name", e.target.value)} className="h-7 text-sm" /></TableCell>
                                <TableCell><Input value={a.description} onChange={e => updateItem(a.id, "description", e.target.value)} className="h-7 text-sm" /></TableCell>
                                <TableCell><Input value={a.owner} onChange={e => updateItem(a.id, "owner", e.target.value)} className="h-7 text-sm" /></TableCell>
                                <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(a.id)} className="text-red-400 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    {/* Deliverables */}
                    <div>
                      <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => toggleSection(`del_${phase}`)}>
                        <div className="flex items-center gap-2">
                          {collapsedSections[`del_${phase}`] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span className="text-sm font-bold">Deliverables</span>
                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{deliverables.length}</span>
                        </div>
                        {!collapsedSections[`del_${phase}`] && (
                          <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); addItem(true); }} className="text-xs h-7" data-testid={`add-tpl-deliverable-${phase}`}>
                            <Plus className="w-3 h-3 mr-1" />Deliverable
                          </Button>
                        )}
                      </div>
                      {!collapsedSections[`del_${phase}`] && (
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-28">Owner</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {deliverables.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center text-sm text-gray-400 py-3">No deliverables</TableCell></TableRow>
                            ) : deliverables.map((d, i) => (
                              <TableRow key={d.id}>
                                <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                                <TableCell><Input value={d.name} onChange={e => updateItem(d.id, "name", e.target.value)} className="h-7 text-sm" /></TableCell>
                                <TableCell><Input value={d.description} onChange={e => updateItem(d.id, "description", e.target.value)} className="h-7 text-sm" /></TableCell>
                                <TableCell><Input value={d.owner} onChange={e => updateItem(d.id, "owner", e.target.value)} className="h-7 text-sm" /></TableCell>
                                <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(d.id)} className="text-red-400 h-6 w-6 p-0"><Trash2 className="w-3 h-3" /></Button></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSavePhase} disabled={saving} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid={`save-tpl-${phase}`}>
                        <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Phase Template"}
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-2 border-gray-200 bg-gray-50/50">
          <CardContent className="py-10 text-center text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a Technology and Project Type to view or create templates.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
