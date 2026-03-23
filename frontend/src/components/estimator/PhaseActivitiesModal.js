import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Download, ChevronDown, ChevronRight, FileText, CheckSquare, GripVertical } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const generateId = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const PhaseActivitiesModal = ({ open, onOpenChange, projectId, waves, projectTypes, projectTypeIds }) => {
  const [selectedWave, setSelectedWave] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("");
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsedPhases, setCollapsedPhases] = useState({});

  // Template management
  const [templateMode, setTemplateMode] = useState(false);
  const [selectedTemplateType, setSelectedTemplateType] = useState("");
  const [templateActivities, setTemplateActivities] = useState([]);
  const [templateLoading, setTemplateLoading] = useState(false);

  // All project activities (for overview)
  const [allActivities, setAllActivities] = useState([]);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const currentWave = waves.find(w => w.name === selectedWave);
  const phases = currentWave ? (currentWave.phase_ranges || []).map(p => p.name).filter(Boolean) : [];

  useEffect(() => {
    if (open && projectId) {
      loadAllActivities();
      if (waves.length > 0 && !selectedWave) setSelectedWave(waves[0].name);
    }
  }, [open, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedWave && selectedPhase && projectId && !templateMode) {
      loadPhaseActivities();
    }
  }, [selectedWave, selectedPhase, projectId, templateMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (templateMode && selectedTemplateType && selectedPhase) {
      loadTemplateActivities();
    }
  }, [templateMode, selectedTemplateType, selectedPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAllActivities = async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/activities`, { headers });
      setAllActivities(res.data || []);
    } catch { /* ignore */ }
  };

  const loadPhaseActivities = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/projects/${projectId}/activities/${encodeURIComponent(selectedWave)}/${encodeURIComponent(selectedPhase)}`, { headers });
      setActivities(res.data.activities || []);
    } catch {
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateActivities = async () => {
    setTemplateLoading(true);
    try {
      const res = await axios.get(`${API}/activity-templates/${selectedTemplateType}`, { headers });
      const match = (res.data || []).find(t => t.phase_name === selectedPhase);
      setTemplateActivities(match ? match.activities : []);
    } catch {
      setTemplateActivities([]);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedWave || !selectedPhase) return;
    setSaving(true);
    try {
      if (templateMode) {
        await axios.put(`${API}/activity-templates/${selectedTemplateType}/${encodeURIComponent(selectedPhase)}`, {
          activities: templateActivities,
          project_type_name: projectTypes.find(pt => pt.id === selectedTemplateType)?.name || "",
        }, { headers });
        toast.success("Template saved");
      } else {
        await axios.put(`${API}/projects/${projectId}/activities/${encodeURIComponent(selectedWave)}/${encodeURIComponent(selectedPhase)}`, {
          activities,
        }, { headers });
        toast.success("Activities saved");
        loadAllActivities();
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAdoptTemplate = async () => {
    if (!selectedWave || !selectedPhase || !selectedTemplateType) return;
    try {
      // Use first project type if available
      const typeId = selectedTemplateType || (projectTypeIds.length > 0 ? projectTypeIds[0] : "");
      if (!typeId) { toast.error("Select a project type for the template"); return; }
      const res = await axios.post(`${API}/projects/${projectId}/activities/${encodeURIComponent(selectedWave)}/${encodeURIComponent(selectedPhase)}/adopt-template`, {
        project_type_id: typeId,
      }, { headers });
      setActivities(res.data.activities || []);
      toast.success("Template adopted — you can now customize it");
      loadAllActivities();
    } catch (err) {
      toast.error(err.response?.data?.detail || "No template found for this combination");
    }
  };

  const addActivity = (isDeliverable = false) => {
    const list = templateMode ? templateActivities : activities;
    const setter = templateMode ? setTemplateActivities : setActivities;
    setter([...list, {
      id: generateId(),
      name: "",
      description: "",
      is_deliverable: isDeliverable,
      owner: "",
      sort_order: list.length,
    }]);
  };

  const updateActivity = (id, field, value) => {
    const list = templateMode ? templateActivities : activities;
    const setter = templateMode ? setTemplateActivities : setActivities;
    setter(list.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const removeActivity = (id) => {
    const list = templateMode ? templateActivities : activities;
    const setter = templateMode ? setTemplateActivities : setActivities;
    setter(list.filter(a => a.id !== id));
  };

  const currentList = templateMode ? templateActivities : activities;
  const activityItems = currentList.filter(a => !a.is_deliverable);
  const deliverableItems = currentList.filter(a => a.is_deliverable);

  const togglePhase = (key) => setCollapsedPhases(p => ({ ...p, [key]: !p[key] }));

  // Get count of activities for a wave/phase combo
  const getPhaseActivityCount = (waveName, phaseName) => {
    const match = allActivities.find(a => a.wave_name === waveName && a.phase_name === phaseName);
    return match ? (match.activities || []).length : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto" data-testid="activities-modal">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Phase Activities & Deliverables
          </DialogTitle>
          <DialogDescription>Define activities and deliverables per phase. Use templates or customize per project.</DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="flex items-center gap-3 border-b pb-3">
          <Button variant={!templateMode ? "default" : "outline"} size="sm" onClick={() => setTemplateMode(false)} data-testid="project-mode-btn"
            className={!templateMode ? "bg-[#0F172A]" : ""}>
            Project Activities
          </Button>
          <Button variant={templateMode ? "default" : "outline"} size="sm" onClick={() => setTemplateMode(true)} data-testid="template-mode-btn"
            className={templateMode ? "bg-indigo-600 hover:bg-indigo-700" : ""}>
            Manage Templates
          </Button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-3 gap-3">
          {!templateMode ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Wave</label>
              <Select value={selectedWave} onValueChange={setSelectedWave}>
                <SelectTrigger data-testid="activities-wave-select"><SelectValue placeholder="Select wave" /></SelectTrigger>
                <SelectContent>
                  {waves.map(w => <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Project Type</label>
              <Select value={selectedTemplateType} onValueChange={setSelectedTemplateType}>
                <SelectTrigger data-testid="template-type-select"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {projectTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phase</label>
            <Select value={selectedPhase} onValueChange={setSelectedPhase}>
              <SelectTrigger data-testid="activities-phase-select"><SelectValue placeholder="Select phase" /></SelectTrigger>
              <SelectContent>
                {phases.length > 0 ? phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>) : (
                  <SelectItem value="__none" disabled>No phases defined</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            {!templateMode && selectedPhase && (
              <div className="flex items-end gap-1 flex-1">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Adopt Template</label>
                  <Select value={selectedTemplateType} onValueChange={setSelectedTemplateType}>
                    <SelectTrigger className="text-xs"><SelectValue placeholder="Type..." /></SelectTrigger>
                    <SelectContent>
                      {projectTypes.map(pt => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" onClick={handleAdoptTemplate} disabled={!selectedTemplateType} className="border-indigo-300 text-indigo-600 text-xs" data-testid="adopt-template-btn">
                  <Download className="w-3.5 h-3.5 mr-1" />Adopt
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Overview: Phase activity counts */}
        {!templateMode && !selectedPhase && selectedWave && (
          <div className="border rounded-lg p-3 bg-gray-50/50">
            <p className="text-sm font-semibold text-[#0F172A] mb-2">Phase Overview — {selectedWave}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {phases.map(p => {
                const count = getPhaseActivityCount(selectedWave, p);
                return (
                  <div key={p} className="bg-white border rounded-md p-2 cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => setSelectedPhase(p)} data-testid={`phase-overview-${p}`}>
                    <p className="text-xs font-medium text-gray-600">{p}</p>
                    <p className="text-lg font-bold text-[#0F172A]">{count} <span className="text-xs font-normal text-gray-400">items</span></p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Activity/Deliverable Editor */}
        {selectedPhase && (loading || templateLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Activities Section */}
            <div>
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => togglePhase("activities")}>
                <div className="flex items-center gap-2">
                  {collapsedPhases["activities"] ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm font-bold text-[#0F172A]">Activities</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{activityItems.length}</span>
                </div>
                {!collapsedPhases["activities"] && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); addActivity(false); }} className="text-xs h-7" data-testid="add-activity-btn">
                    <Plus className="w-3 h-3 mr-1" />Activity
                  </Button>
                )}
              </div>
              {!collapsedPhases["activities"] && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Activity Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28">Owner</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activityItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-gray-400 py-4">No activities yet. Click "+ Activity" to add one.</TableCell></TableRow>
                    ) : activityItems.map((a, idx) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                        <TableCell>
                          <Input value={a.name} onChange={(e) => updateActivity(a.id, "name", e.target.value)}
                            placeholder="Activity name" className="h-8 text-sm" data-testid={`activity-name-${idx}`} />
                        </TableCell>
                        <TableCell>
                          <Input value={a.description} onChange={(e) => updateActivity(a.id, "description", e.target.value)}
                            placeholder="Description" className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input value={a.owner} onChange={(e) => updateActivity(a.id, "owner", e.target.value)}
                            placeholder="Owner" className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeActivity(a.id)} className="text-red-400 hover:text-red-600 h-7 w-7 p-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Deliverables Section */}
            <div>
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => togglePhase("deliverables")}>
                <div className="flex items-center gap-2">
                  {collapsedPhases["deliverables"] ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm font-bold text-[#0F172A]">Deliverables</span>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{deliverableItems.length}</span>
                </div>
                {!collapsedPhases["deliverables"] && (
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); addActivity(true); }} className="text-xs h-7" data-testid="add-deliverable-btn">
                    <Plus className="w-3 h-3 mr-1" />Deliverable
                  </Button>
                )}
              </div>
              {!collapsedPhases["deliverables"] && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>Deliverable Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-28">Owner</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliverableItems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-sm text-gray-400 py-4">No deliverables yet. Click "+ Deliverable" to add one.</TableCell></TableRow>
                    ) : deliverableItems.map((d, idx) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs text-gray-400">{idx + 1}</TableCell>
                        <TableCell>
                          <Input value={d.name} onChange={(e) => updateActivity(d.id, "name", e.target.value)}
                            placeholder="Deliverable name" className="h-8 text-sm" data-testid={`deliverable-name-${idx}`} />
                        </TableCell>
                        <TableCell>
                          <Input value={d.description} onChange={(e) => updateActivity(d.id, "description", e.target.value)}
                            placeholder="Description" className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Input value={d.owner} onChange={(e) => updateActivity(d.id, "owner", e.target.value)}
                            placeholder="Owner" className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeActivity(d.id)} className="text-red-400 hover:text-red-600 h-7 w-7 p-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ))}

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {selectedPhase && (
            <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="save-activities-btn">
              <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
