import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const MAX_LEVELS = 5;

const emptyLevel = (n) => ({ level: n, approver_emails: [], approver_names: [], label: "" });

const ApprovalMatrix = () => {
  const [billingEntities, setBillingEntities] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [levels, setLevels] = useState([emptyLevel(1)]);
  const [existingMatrix, setExistingMatrix] = useState(null);

  useEffect(() => {
    (async () => {
      try { setBillingEntities((await axios.get(`${API}/billing-entities`)).data); } catch { /* noop */ }
      try { setUsers((await axios.get(`${API}/users/approvers/list`)).data); } catch { /* noop */ }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEntityId) { setLevels([emptyLevel(1)]); setExistingMatrix(null); return; }
    (async () => {
      try {
        const r = await axios.get(`${API}/approval-matrices/${selectedEntityId}`);
        setExistingMatrix(r.data);
        const lv = (r.data.levels || []).map(l => ({ ...l, approver_emails: l.approver_emails || [], approver_names: l.approver_names || [] }));
        setLevels(lv.length > 0 ? lv : [emptyLevel(1)]);
      } catch {
        setExistingMatrix(null);
        setLevels([emptyLevel(1)]);
      }
    })();
  }, [selectedEntityId]);

  const addLevel = () => {
    if (levels.length >= MAX_LEVELS) { toast.error(`Max ${MAX_LEVELS} levels`); return; }
    setLevels([...levels, emptyLevel(levels.length + 1)]);
  };

  const removeLevel = (idx) => {
    const next = levels.filter((_, i) => i !== idx).map((l, i) => ({ ...l, level: i + 1 }));
    setLevels(next.length ? next : [emptyLevel(1)]);
  };

  const updateLevel = (idx, patch) => setLevels(levels.map((l, i) => i === idx ? { ...l, ...patch } : l));

  const addApproverToLevel = (idx, userId) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    const lv = levels[idx];
    if (lv.approver_emails.includes(u.email)) { toast.info("Already added at this level"); return; }
    updateLevel(idx, {
      approver_emails: [...lv.approver_emails, u.email],
      approver_names: [...lv.approver_names, u.name],
    });
  };

  const removeApprover = (idx, ei) => {
    const lv = levels[idx];
    updateLevel(idx, {
      approver_emails: lv.approver_emails.filter((_, i) => i !== ei),
      approver_names: lv.approver_names.filter((_, i) => i !== ei),
    });
  };

  const handleSave = async () => {
    if (!selectedEntityId) { toast.error("Select a Billing Entity first"); return; }
    if (levels.every(l => l.approver_emails.length === 0)) {
      toast.error("Add at least one approver in one level"); return;
    }
    try {
      await axios.put(`${API}/approval-matrices`, { billing_entity_id: selectedEntityId, levels });
      toast.success("Approval matrix saved");
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to save"); }
  };

  const handleDelete = async () => {
    if (!selectedEntityId || !existingMatrix) return;
    if (!window.confirm("Delete approval matrix for this billing entity?")) return;
    try {
      await axios.delete(`${API}/approval-matrices/${selectedEntityId}`);
      toast.success("Approval matrix deleted");
      setExistingMatrix(null); setLevels([emptyLevel(1)]);
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to delete"); }
  };

  return (
    <div className="p-6 space-y-6" data-testid="approval-matrix-page">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-[#3B82F6]" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#0F172A]">Approval Matrix</h1>
          <p className="text-sm text-gray-500">Configure multi-level approvers per Billing Entity. Up to {MAX_LEVELS} levels. When a project is submitted for review, every approver listed here receives an email.</p>
        </div>
        <div
          className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
          data-testid="approver-role-count"
          title="Active users with the Approver role available for selection below"
        >
          <Shield className="w-4 h-4 text-amber-600" />
          <div className="leading-tight">
            <div className="text-lg font-bold text-amber-700">{users.filter(u => u.role === 'approver').length}</div>
            <div className="text-[10px] uppercase tracking-wider text-amber-700/80 font-semibold">Approver Users</div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-lg">Billing Entity</CardTitle></CardHeader>
        <CardContent>
          <Label>Select a billing entity to configure its approval matrix</Label>
          <Select value={selectedEntityId || ""} onValueChange={setSelectedEntityId}>
            <SelectTrigger data-testid="matrix-entity-select" className="max-w-md">
              <SelectValue placeholder="Choose billing entity..." />
            </SelectTrigger>
            <SelectContent>
              {billingEntities.map(be => (
                <SelectItem key={be.id} value={be.id}>{be.name}{be.code ? ` (${be.code})` : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {existingMatrix && (
            <p className="text-xs text-emerald-600 mt-2">✓ Matrix exists — modify below and click Save. Last updated: {existingMatrix.updated_at?.slice(0, 10) || "—"}</p>
          )}
        </CardContent>
      </Card>

      {selectedEntityId && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Approval Levels</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addLevel} disabled={levels.length >= MAX_LEVELS} data-testid="matrix-add-level">
                <Plus className="w-4 h-4 mr-1" /> Add Level
              </Button>
              {existingMatrix && (
                <Button size="sm" variant="outline" className="text-red-600" onClick={handleDelete} data-testid="matrix-delete">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Matrix
                </Button>
              )}
              <Button size="sm" onClick={handleSave} data-testid="matrix-save">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {levels.map((lv, idx) => (
              <div key={idx} className="border border-slate-200 rounded p-3 bg-slate-50" data-testid={`level-block-${idx}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-[#3B82F6] text-lg">Level {lv.level}</span>
                  <Input
                    className="max-w-xs h-8 text-xs"
                    placeholder="Label (e.g. Delivery Head, CFO)"
                    value={lv.label || ""}
                    onChange={(e) => updateLevel(idx, { label: e.target.value })}
                  />
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeLevel(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                  <div>
                    <Label className="text-xs">Add approver</Label>
                    <Select value="" onValueChange={(v) => addApproverToLevel(idx, v)}>
                      <SelectTrigger><SelectValue placeholder="Select a user..." /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs">Approvers at this level ({lv.approver_emails.length})</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {lv.approver_emails.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No approvers yet</span>
                      ) : lv.approver_emails.map((e, ei) => (
                        <span key={ei} className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs">
                          {lv.approver_names[ei] || e}
                          <span className="text-slate-400">&lt;{e}&gt;</span>
                          <button className="ml-1 text-red-500 hover:text-red-700" onClick={() => removeApprover(idx, ei)}>&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ApprovalMatrix;
