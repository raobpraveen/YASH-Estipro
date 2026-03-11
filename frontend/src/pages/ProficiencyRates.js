import { useEffect, useState, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Upload, Download, Edit2, Check, X, Filter, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { PROFICIENCY_LEVELS } from "@/utils/constants";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProficiencyRates = () => {
  const [rates, setRates] = useState([]);
  const [filteredRates, setFilteredRates] = useState([]);
  const [skills, setSkills] = useState([]);
  const [locations, setLocations] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ skill: "", location: "", proficiency: "" });
  const fileInputRef = useRef(null);
  const [newRate, setNewRate] = useState({
    skill_id: "",
    base_location_id: "",
    proficiency_level: "",
    avg_monthly_salary: "",
  });
  const [editingRate, setEditingRate] = useState(null);
  const [editSalary, setEditSalary] = useState("");

  useEffect(() => {
    fetchSkills();
    fetchLocations();
    fetchRates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [rates, filters]);

  const applyFilters = () => {
    let result = [...rates];
    if (filters.skill) {
      result = result.filter(r => r.skill_id === filters.skill);
    }
    if (filters.location) {
      result = result.filter(r => r.base_location_id === filters.location);
    }
    if (filters.proficiency) {
      result = result.filter(r => r.proficiency_level === filters.proficiency);
    }
    setFilteredRates(result);
  };

  const clearFilters = () => {
    setFilters({ skill: "", location: "", proficiency: "" });
  };

  const fetchSkills = async () => {
    try {
      const response = await axios.get(`${API}/skills`);
      setSkills(response.data);
    } catch (error) {
      toast.error("Failed to fetch skills");
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/base-locations`);
      setLocations(response.data);
    } catch (error) {
      toast.error("Failed to fetch base locations");
    }
  };

  const fetchRates = async () => {
    try {
      const response = await axios.get(`${API}/proficiency-rates`);
      setRates(response.data);
    } catch (error) {
      toast.error("Failed to fetch proficiency rates");
    }
  };

  const handleAddRate = async () => {
    if (!newRate.skill_id || !newRate.base_location_id || !newRate.proficiency_level || !newRate.avg_monthly_salary) {
      toast.error("Please fill all fields");
      return;
    }

    const selectedSkill = skills.find((s) => s.id === newRate.skill_id);
    const selectedLocation = locations.find((l) => l.id === newRate.base_location_id);
    
    if (!selectedSkill || !selectedLocation) {
      toast.error("Invalid selections");
      return;
    }

    try {
      await axios.post(`${API}/proficiency-rates`, {
        skill_id: newRate.skill_id,
        skill_name: selectedSkill.name,
        technology_id: selectedSkill.technology_id,
        technology_name: selectedSkill.technology_name,
        base_location_id: newRate.base_location_id,
        base_location_name: selectedLocation.name,
        proficiency_level: newRate.proficiency_level,
        avg_monthly_salary: parseFloat(newRate.avg_monthly_salary),
      });
      toast.success("Proficiency rate added successfully");
      setNewRate({ skill_id: "", base_location_id: "", proficiency_level: "", avg_monthly_salary: "" });
      setDialogOpen(false);
      fetchRates();
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail || "Rate already exists for this combination");
      } else {
        toast.error("Failed to add proficiency rate");
      }
    }
  };

  const handleDeleteRate = async (id) => {
    try {
      await axios.delete(`${API}/proficiency-rates/${id}`);
      toast.success("Proficiency rate deleted successfully");
      fetchRates();
    } catch (error) {
      toast.error("Failed to delete proficiency rate");
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      ["Technology", "Skill Name", "Base Location", "Proficiency Level", "Avg Monthly Salary"],
      ["SAP S/4HANA", "Finance Consultant", "UAE", "Senior", "8000"],
      ["SAP S/4HANA", "Technical Architect", "India", "Architect", "12000"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rates Template");
    XLSX.writeFile(wb, "proficiency_rates_template.xlsx");
    toast.success("Template downloaded");
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Skip header row
      const dataRows = rows.slice(1).filter(row => row.length >= 5 && row[0] && row[1] && row[2] && row[3] && row[4]);
      
      let added = 0;
      let skipped = 0;

      for (const row of dataRows) {
        const technologyName = String(row[0]).trim();
        const skillName = String(row[1]).trim();
        const locationName = String(row[2]).trim();
        const proficiencyLevel = String(row[3]).trim();
        const salary = parseFloat(row[4]);

        // Find skill by name and technology
        const skill = skills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase() && 
          s.technology_name?.toLowerCase() === technologyName.toLowerCase()
        );
        if (!skill) {
          skipped++;
          continue;
        }

        // Find location by name
        const location = locations.find(l => l.name.toLowerCase() === locationName.toLowerCase());
        if (!location) {
          skipped++;
          continue;
        }

        // Validate proficiency level
        if (!PROFICIENCY_LEVELS.includes(proficiencyLevel)) {
          skipped++;
          continue;
        }

        // Check if rate already exists
        const exists = rates.some(r => 
          r.skill_id === skill.id && 
          r.base_location_id === location.id && 
          r.proficiency_level === proficiencyLevel
        );
        if (exists) {
          skipped++;
          continue;
        }

        try {
          await axios.post(`${API}/proficiency-rates`, {
            skill_id: skill.id,
            skill_name: skill.name,
            technology_id: skill.technology_id,
            technology_name: skill.technology_name,
            base_location_id: location.id,
            base_location_name: location.name,
            proficiency_level: proficiencyLevel,
            avg_monthly_salary: salary,
          });
          added++;
        } catch {
          skipped++;
        }
      }

      toast.success(`Upload complete: ${added} added, ${skipped} skipped`);
      fetchRates();
    } catch (error) {
      toast.error("Failed to process Excel file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startEditRate = (rate) => {
    setEditingRate(rate.id);
    setEditSalary(rate.avg_monthly_salary.toString());
  };

  const handleCopyRate = (rate) => {
    setNewRate({
      skill_id: rate.skill_id,
      base_location_id: rate.base_location_id,
      proficiency_level: rate.proficiency_level,
      avg_monthly_salary: rate.avg_monthly_salary.toString(),
    });
    setDialogOpen(true);
  };

  const cancelEditRate = () => {
    setEditingRate(null);
    setEditSalary("");
  };

  const saveEditRate = async (rateId) => {
    const salary = parseFloat(editSalary);
    if (isNaN(salary) || salary <= 0) {
      toast.error("Please enter a valid salary");
      return;
    }
    try {
      await axios.put(`${API}/proficiency-rates/${rateId}?avg_monthly_salary=${salary}`);
      toast.success("Rate updated successfully");
      setEditingRate(null);
      setEditSalary("");
      fetchRates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update rate");
    }
  };

  return (
    <div data-testid="proficiency-rates">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight">Proficiency Rates</h1>
          <p className="text-base text-gray-600 mt-2">Configure average monthly salaries for skills</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} data-testid="toggle-filters">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={handleDownloadTemplate} data-testid="download-template-button">
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            data-testid="upload-excel-button"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Excel"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white" data-testid="add-rate-button">
                <Plus className="w-4 h-4 mr-2" />
                Add Rate
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#0F172A]">Add Proficiency Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="skill-select">Skill</Label>
                <Select value={newRate.skill_id} onValueChange={(value) => setNewRate({ ...newRate, skill_id: value })}>
                  <SelectTrigger id="skill-select" data-testid="skill-select">
                    <SelectValue placeholder="Select a skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name} ({skill.technology_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="base-location-select">Base Location</Label>
                <Select value={newRate.base_location_id} onValueChange={(value) => setNewRate({ ...newRate, base_location_id: value })}>
                  <SelectTrigger id="base-location-select" data-testid="base-location-select">
                    <SelectValue placeholder="Select base location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} (Overhead: {location.overhead_percentage}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="proficiency-select">Proficiency Level</Label>
                <Select
                  value={newRate.proficiency_level}
                  onValueChange={(value) => setNewRate({ ...newRate, proficiency_level: value })}
                >
                  <SelectTrigger id="proficiency-select" data-testid="proficiency-select">
                    <SelectValue placeholder="Select proficiency" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="salary-input">Avg. Monthly Salary (USD)</Label>
                <Input
                  id="salary-input"
                  type="number"
                  placeholder="e.g., 5000"
                  value={newRate.avg_monthly_salary}
                  onChange={(e) => setNewRate({ ...newRate, avg_monthly_salary: e.target.value })}
                  data-testid="salary-input"
                />
              </div>
              <Button onClick={handleAddRate} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="submit-rate-button">
                Add Rate
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6 border border-[#E2E8F0]">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Skill</Label>
                <Select 
                  value={filters.skill || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, skill: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-skill">
                    <SelectValue placeholder="All Skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    {skills.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select 
                  value={filters.location || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, location: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-location">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Proficiency Level</Label>
                <Select 
                  value={filters.proficiency || "all"} 
                  onValueChange={(v) => setFilters({ ...filters, proficiency: v === "all" ? "" : v })}
                >
                  <SelectTrigger data-testid="filter-proficiency">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {PROFICIENCY_LEVELS.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full" data-testid="clear-filters">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-[#E2E8F0] shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-[#0F172A]">
            Configured Rates
            {filteredRates.length !== rates.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredRates.length} of {rates.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {rates.length === 0 
                  ? "No proficiency rates configured yet."
                  : "No rates match your filter criteria."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technology</TableHead>
                    <TableHead>Skill Name</TableHead>
                    <TableHead>Base Location</TableHead>
                    <TableHead>Proficiency Level</TableHead>
                    <TableHead className="text-right">Avg. Monthly Salary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRates.map((rate) => (
                    <TableRow key={rate.id} data-testid={`rate-row-${rate.id}`}>
                      <TableCell>{rate.technology_name}</TableCell>
                      <TableCell className="font-medium">{rate.skill_name}</TableCell>
                      <TableCell>{rate.base_location_name}</TableCell>
                      <TableCell>{rate.proficiency_level}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {editingRate === rate.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-500">$</span>
                            <Input
                              type="number"
                              value={editSalary}
                              onChange={(e) => setEditSalary(e.target.value)}
                              className="w-28 text-right"
                              autoFocus
                              data-testid={`edit-salary-${rate.id}`}
                            />
                          </div>
                        ) : (
                          <span>${rate.avg_monthly_salary.toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {editingRate === rate.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveEditRate(rate.id)}
                                className="text-[#10B981] hover:text-[#10B981] hover:bg-[#10B981]/10"
                                data-testid={`save-rate-${rate.id}`}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={cancelEditRate}
                                className="text-gray-500 hover:text-gray-500 hover:bg-gray-100"
                                data-testid={`cancel-edit-${rate.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyRate(rate)}
                                className="text-[#8B5CF6] hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                                data-testid={`copy-rate-${rate.id}`}
                                title="Copy this rate"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditRate(rate)}
                                className="text-[#0EA5E9] hover:text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                                data-testid={`edit-rate-${rate.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteRate(rate.id)}
                                className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                                data-testid={`delete-rate-${rate.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProficiencyRates;