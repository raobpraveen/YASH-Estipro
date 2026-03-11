import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, ArrowLeft, DollarSign, Target } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PaymentMilestones = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get("project");

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchMilestones();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProject(res.data);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/projects/${projectId}/milestones`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMilestones(res.data.milestones || []);
    } catch {
      // No milestones yet
    }
  };

  const getWaveFinalPrice = (waveName) => {
    if (!project) return 0;
    const wave = project.waves?.find((w) => w.name === waveName);
    if (!wave) return 0;
    const pm = project.profit_margin_percentage || 35;
    let totalSP = 0;
    for (const alloc of wave.grid_allocations || []) {
      const pa = alloc.phase_allocations || {};
      const mm = typeof pa === "object" && !Array.isArray(pa) ? Object.values(pa).reduce((s, v) => s + v, 0) : Array.isArray(pa) ? pa.reduce((s, v) => s + v, 0) : 0;
      const salary = alloc.avg_monthly_salary || 0;
      const oh = salary * mm * ((alloc.overhead_percentage || 0) / 100);
      const tc = salary * mm + oh;
      const sp = pm < 100 ? tc / (1 - pm / 100) : tc;
      totalSP += sp;
    }
    return totalSP;
  };

  const addMilestone = () => {
    const firstWave = project?.waves?.[0]?.name || "Wave 1";
    setMilestones([
      ...milestones,
      {
        id: crypto.randomUUID(),
        wave_name: firstWave,
        milestone_name: `Milestone ${milestones.length + 1}`,
        completion_percentage: 0,
        payment_percentage: 0,
        payment_amount: 0,
        description: "",
      },
    ]);
  };

  const updateMilestone = (id, field, value) => {
    setMilestones(
      milestones.map((m) => {
        if (m.id !== id) return m;
        const updated = { ...m, [field]: value };
        // Auto-calculate payment_amount when payment_percentage changes
        if (field === "payment_percentage" || field === "wave_name") {
          const wavePrice = getWaveFinalPrice(field === "wave_name" ? value : updated.wave_name);
          const pct = field === "payment_percentage" ? value : updated.payment_percentage;
          updated.payment_amount = Math.round(wavePrice * (pct / 100) * 100) / 100;
        }
        return updated;
      })
    );
  };

  const removeMilestone = (id) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${API}/projects/${projectId}/milestones`, { milestones }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Payment milestones saved");
    } catch {
      toast.error("Failed to save milestones");
    } finally {
      setSaving(false);
    }
  };

  const totalPayment = milestones.reduce((s, m) => s + (m.payment_amount || 0), 0);

  // Group milestones by wave
  const waveGroups = {};
  for (const m of milestones) {
    if (!waveGroups[m.wave_name]) waveGroups[m.wave_name] = [];
    waveGroups[m.wave_name].push(m);
  }

  if (!projectId) {
    return (
      <div className="text-center py-20" data-testid="no-project-selected">
        <p className="text-gray-500 text-lg">No project selected. Please open this from a project.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/projects")}>Go to Projects</Button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div></div>;
  }

  return (
    <div data-testid="payment-milestones-page">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} data-testid="back-button">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Payment Milestones</h1>
            <p className="text-sm text-gray-600 mt-1">{project?.project_number} — {project?.name} (v{project?.version})</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={addMilestone} className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90" data-testid="add-milestone-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Milestone
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#0F172A] hover:bg-[#0F172A]/90" data-testid="save-milestones-btn">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-[#0EA5E9]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total Milestones</p>
            <p className="text-2xl font-bold text-[#0F172A]" data-testid="total-milestones">{milestones.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#10B981]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Total Payment Amount</p>
            <p className="text-2xl font-bold text-[#10B981]" data-testid="total-payment">${totalPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#F59E0B]">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-gray-500">Waves</p>
            <p className="text-2xl font-bold text-[#F59E0B]" data-testid="wave-count">{project?.waves?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {milestones.length === 0 ? (
        <Card className="border border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg mb-2">No payment milestones defined yet</p>
            <p className="text-gray-400 text-sm mb-4">Define milestones to track payment schedules for each wave.</p>
            <Button onClick={addMilestone} className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90">
              <Plus className="w-4 h-4 mr-2" /> Add First Milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#10B981]" /> Milestone Definitions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Wave</TableHead>
                    <TableHead>Milestone Name</TableHead>
                    <TableHead>Phase Completion %</TableHead>
                    <TableHead>Payment %</TableHead>
                    <TableHead className="text-right">Payment Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((ms, idx) => (
                    <TableRow key={ms.id} data-testid={`milestone-row-${idx}`}>
                      <TableCell className="font-mono text-gray-400">{idx + 1}</TableCell>
                      <TableCell>
                        <Select value={ms.wave_name} onValueChange={(v) => updateMilestone(ms.id, "wave_name", v)}>
                          <SelectTrigger className="w-40" data-testid={`ms-wave-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(project?.waves || []).map((w) => (
                              <SelectItem key={w.name} value={w.name}>{w.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={ms.milestone_name} onChange={(e) => updateMilestone(ms.id, "milestone_name", e.target.value)} className="w-44" data-testid={`ms-name-${idx}`} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={100} value={ms.completion_percentage} onChange={(e) => updateMilestone(ms.id, "completion_percentage", parseFloat(e.target.value) || 0)} className="w-24" data-testid={`ms-completion-${idx}`} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={100} value={ms.payment_percentage} onChange={(e) => updateMilestone(ms.id, "payment_percentage", parseFloat(e.target.value) || 0)} className="w-24" data-testid={`ms-payment-pct-${idx}`} />
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-[#10B981]" data-testid={`ms-amount-${idx}`}>
                        ${(ms.payment_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <Input value={ms.description || ""} onChange={(e) => updateMilestone(ms.id, "description", e.target.value)} className="w-40" placeholder="Optional" data-testid={`ms-desc-${idx}`} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeMilestone(ms.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" data-testid={`ms-delete-${idx}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Per-wave summary */}
            {Object.keys(waveGroups).length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(waveGroups).map(([waveName, wms]) => {
                  const waveTotal = wms.reduce((s, m) => s + (m.payment_amount || 0), 0);
                  const wavePctTotal = wms.reduce((s, m) => s + (m.payment_percentage || 0), 0);
                  const waveFP = getWaveFinalPrice(waveName);
                  return (
                    <Card key={waveName} className="bg-[#F8FAFC] border border-[#E2E8F0]">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-semibold text-[#0F172A]">{waveName}</p>
                          <span className="text-xs text-gray-500">Wave SP: ${waveFP.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Payment %: <span className={`font-bold ${wavePctTotal > 100 ? "text-red-500" : "text-[#0F172A]"}`}>{wavePctTotal.toFixed(1)}%</span></span>
                          <span className="text-[#10B981] font-semibold">${waveTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                        {wavePctTotal > 100 && <p className="text-xs text-red-500 mt-1">Payment % exceeds 100%</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentMilestones;
