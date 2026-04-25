import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Competencies = () => {
  const [competencies, setCompetencies] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editForm, setEditForm] = useState(null);

  useEffect(() => { fetchCompetencies(); }, []);

  const fetchCompetencies = async () => {
    try {
      setCompetencies((await axios.get(`${API}/competencies`)).data);
    } catch { toast.error("Failed to fetch competencies"); }
  };

  const handleAdd = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    try {
      await axios.post(`${API}/competencies`, form);
      toast.success("Competency added");
      setForm({ name: "", description: "" });
      setDialogOpen(false);
      fetchCompetencies();
    } catch { toast.error("Failed to add competency"); }
  };

  const handleEdit = (item) => {
    setEditForm({ id: item.id, name: item.name, description: item.description || "" });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editForm?.name.trim()) { toast.error("Name is required"); return; }
    try {
      await axios.put(`${API}/competencies/${editForm.id}`, { name: editForm.name, description: editForm.description });
      toast.success("Competency updated");
      setEditDialogOpen(false);
      fetchCompetencies();
    } catch { toast.error("Failed to update competency"); }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/competencies/${id}`);
      toast.success("Competency deleted");
      fetchCompetencies();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div data-testid="competencies-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Competencies</h1>
          <p className="text-base text-gray-600 mt-2">Manage competency areas for project classification</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-competency-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Competency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add Competency</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name *</Label>
                <Input placeholder="e.g., SAP ERP, Cloud, Digital" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="comp-name-input" />
              </div>
              <div>
                <Label>Description</Label>
                <Input placeholder="Optional description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="comp-desc-input" />
              </div>
              <Button onClick={handleAdd} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-comp-btn">Add Competency</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader><CardTitle className="text-xl font-bold text-[#0F172A]">Competencies ({competencies.length})</CardTitle></CardHeader>
        <CardContent>
          {competencies.length === 0 ? (
            <div className="text-center py-12"><p className="text-gray-500">No competencies added yet.</p></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competencies.map((item) => (
                  <TableRow key={item.id} data-testid={`comp-row-${item.id}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-gray-600">{item.description || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} className="text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10" data-testid={`edit-comp-${item.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10" data-testid={`delete-comp-${item.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-2xl font-bold text-[#0F172A]">Edit Competency</DialogTitle></DialogHeader>
          {editForm && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="edit-comp-name-input" />
              </div>
              <div>
                <Label>Description</Label>
                <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} data-testid="edit-comp-desc-input" />
              </div>
              <Button onClick={handleUpdate} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="update-comp-btn">Update Competency</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Competencies;
