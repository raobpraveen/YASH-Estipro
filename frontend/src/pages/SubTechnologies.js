import { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, Filter } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SubTechnologies = () => {
  const [subTechnologies, setSubTechnologies] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", technology_id: "", technology_name: "" });
  const [filterTechId, setFilterTechId] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stRes, tRes] = await Promise.all([
        axios.get(`${API}/sub-technologies`),
        axios.get(`${API}/technologies`),
      ]);
      setSubTechnologies(stRes.data);
      setTechnologies(tRes.data);
    } catch {
      toast.error("Failed to fetch data");
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.technology_id) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await axios.post(`${API}/sub-technologies`, form);
      toast.success("Sub-technology added");
      setForm({ name: "", technology_id: "", technology_name: "" });
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to add sub-technology");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/sub-technologies/${id}`);
      toast.success("Sub-technology deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = subTechnologies
    .filter(st => filterTechId === "all" || st.technology_id === filterTechId)
    .filter(st => !searchTerm || st.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div data-testid="sub-technologies">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Sub Technologies</h1>
          <p className="text-base text-gray-600 mt-2">Manage sub-technologies linked to parent technologies</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-sub-tech-button">
              <Plus className="w-4 h-4 mr-2" /> Add Sub Technology
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add Sub Technology</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Parent Technology *</Label>
                <Select
                  value={form.technology_id}
                  onValueChange={(v) => {
                    const tech = technologies.find(t => t.id === v);
                    setForm({ ...form, technology_id: v, technology_name: tech?.name || "" });
                  }}
                >
                  <SelectTrigger data-testid="parent-tech-select"><SelectValue placeholder="Select technology" /></SelectTrigger>
                  <SelectContent>
                    {technologies.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub Technology Name *</Label>
                <Input
                  placeholder="e.g., SAP FICO, React Native"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  data-testid="sub-tech-name-input"
                />
              </div>
              <Button onClick={handleAdd} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-sub-tech-button">
                Add Sub Technology
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search sub-technologies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="search-sub-tech"
          />
        </div>
        <Select value={filterTechId} onValueChange={setFilterTechId}>
          <SelectTrigger className="w-48" data-testid="filter-tech-select">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Filter by technology" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technologies</SelectItem>
            {technologies.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#0F172A]">Sub Technologies ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No sub-technologies found. Click "Add Sub Technology" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sub Technology</TableHead>
                  <TableHead>Parent Technology</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((st) => (
                  <TableRow key={st.id} data-testid={`sub-tech-row-${st.id}`}>
                    <TableCell className="font-medium">{st.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700">{st.technology_name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDelete(st.id)}
                        className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                        data-testid={`delete-sub-tech-${st.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubTechnologies;
