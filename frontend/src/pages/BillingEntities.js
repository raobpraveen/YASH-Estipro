import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Building2 } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BillingEntities = () => {
  const [entities, setEntities] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", country: "", description: "" });
  const [editForm, setEditForm] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { fetchEntities(); }, []);

  const fetchEntities = async () => {
    try { setEntities((await axios.get(`${API}/billing-entities`)).data); }
    catch { toast.error("Failed to load billing entities"); }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      await axios.post(`${API}/billing-entities`, form);
      toast.success(`Billing entity "${form.name}" created`);
      setForm({ name: "", code: "", country: "", description: "" });
      fetchEntities();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to create"); }
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) { toast.error("Name is required"); return; }
    try {
      await axios.put(`${API}/billing-entities/${editForm.id}`, {
        name: editForm.name, code: editForm.code || "", country: editForm.country || "", description: editForm.description || "",
      });
      toast.success("Updated");
      setEditOpen(false); setEditForm(null); fetchEntities();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to update"); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete billing entity "${name}"?`)) return;
    try {
      await axios.delete(`${API}/billing-entities/${id}`);
      toast.success("Deleted"); fetchEntities();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed to delete"); }
  };

  return (
    <div className="p-6 space-y-6" data-testid="billing-entities-page">
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-[#3B82F6]" />
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Billing Entities</h1>
          <p className="text-sm text-gray-500">YASH legal entities used to bill customers on approved estimates.</p>
        </div>
      </div>

      <Card className="border border-[#E2E8F0]">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-4 h-4" /> New Billing Entity</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. YASH Technologies Inc" data-testid="be-name-input" />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. YTI-US" data-testid="be-code-input" />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="e.g. USA" data-testid="be-country-input" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} className="w-full" data-testid="be-create-btn"><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
            <div className="md:col-span-4">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" data-testid="be-desc-input" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E2E8F0]">
        <CardHeader className="pb-3"><CardTitle className="text-lg">All Billing Entities ({entities.length})</CardTitle></CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Country</TableHead>
                <TableHead>Description</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">No billing entities yet — add one above.</TableCell></TableRow>
              ) : entities.map(e => (
                <TableRow key={e.id} data-testid={`be-row-${e.id}`}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="font-mono text-xs">{e.code || "—"}</TableCell>
                  <TableCell>{e.country || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-600 truncate max-w-md">{e.description || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditForm(e); setEditOpen(true); }} data-testid={`be-edit-${e.id}`}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id, e.name)} data-testid={`be-delete-${e.id}`}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Billing Entity</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="be-edit-name" /></div>
              <div><Label>Code</Label><Input value={editForm.code || ""} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} /></div>
              <div><Label>Country</Label><Input value={editForm.country || ""} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} data-testid="be-save-edit">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillingEntities;
