import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, Clock, AlertTriangle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SharedProjectView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/shared/${token}`)
      .then(res => setData(res.data))
      .catch(err => {
        const status = err.response?.status;
        if (status === 410) setError("This share link has expired.");
        else if (status === 404) setError("Share link not found or has been revoked.");
        else setError("Failed to load project data.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownloadPdf = async () => {
    try {
      const res = await axios.get(`${API}/shared/${token}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a"); a.href = url;
      a.download = `${data?.project_number || "estimate"}_v${data?.version || 1}_client.pdf`;
      a.click(); window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0EA5E9]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <Card className="max-w-md w-full border-2 border-red-200 shadow-lg">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-gray-800">Link Unavailable</h2>
            <p className="text-gray-600">{error}</p>
            <p className="text-sm text-gray-400">Please contact the project owner for a new link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fmt = (v) => `$${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const expires = new Date(data.expires_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" data-testid="shared-project-view">
      {/* Header */}
      <div className="bg-[#0F172A] text-white">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/yash-logo-new.png" alt="YASH" className="h-8 object-contain brightness-0 invert" />
            <div>
              <h1 className="text-xl font-bold">{data.name}</h1>
              <p className="text-sm text-slate-300">{data.project_number} v{data.version} — {data.customer_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleDownloadPdf} variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" data-testid="shared-download-pdf">
              <FileDown className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Expires {expires.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Project Info */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-[#0F172A]">Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-gray-500 text-xs uppercase tracking-wide">Customer</p><p className="font-semibold text-gray-800 mt-0.5">{data.customer_name}</p></div>
            <div><p className="text-gray-500 text-xs uppercase tracking-wide">Technology</p><p className="font-semibold text-gray-800 mt-0.5">{(data.technology_names || []).join(", ") || "—"}</p></div>
            <div><p className="text-gray-500 text-xs uppercase tracking-wide">Project Type</p><p className="font-semibold text-gray-800 mt-0.5">{(data.project_type_names || []).join(", ") || "—"}</p></div>
            <div><p className="text-gray-500 text-xs uppercase tracking-wide">Location</p><p className="font-semibold text-gray-800 mt-0.5">{(data.location_names || []).join(", ") || "—"}</p></div>
          </CardContent>
        </Card>

        {/* Overall KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Man-Months</p>
              <p className="text-2xl font-extrabold font-mono text-[#0F172A] mt-1" data-testid="shared-total-mm">{data.overall.total_mm}</p>
            </CardContent>
          </Card>
          <Card className="border border-amber-300 shadow-sm bg-amber-50/40">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Onsite MM</p>
              <p className="text-2xl font-extrabold font-mono text-amber-600 mt-1">{data.overall.onsite_mm}</p>
            </CardContent>
          </Card>
          <Card className="border border-sky-300 shadow-sm bg-sky-50/40">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Offshore MM</p>
              <p className="text-2xl font-extrabold font-mono text-sky-600 mt-1">{data.overall.offshore_mm}</p>
            </CardContent>
          </Card>
          <Card className="border border-emerald-300 shadow-sm bg-emerald-50/40">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Selling Price</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-600 mt-1">{fmt(data.overall.selling_price)}</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-emerald-600 shadow-md bg-emerald-50">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-xs text-emerald-700 uppercase tracking-wide font-semibold">Quoted Price</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-700 mt-1" data-testid="shared-final-price">{fmt(data.overall.final_price)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Wave Details */}
        {data.waves.map((wave, idx) => (
          <Card key={idx} className="border border-slate-200 shadow-sm" data-testid={`shared-wave-${idx}`}>
            <CardHeader className="pb-3 bg-gradient-to-r from-sky-50 to-blue-50 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-[#0F172A]">{wave.name}</CardTitle>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="border-sky-300 text-sky-600">{wave.duration_months} months</Badge>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-600">{wave.resources.length} resources</Badge>
                  <span className="font-mono font-bold text-emerald-700 text-lg">{fmt(wave.final_price)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Wave summary row */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Total MM</p>
                  <p className="text-lg font-bold font-mono">{wave.total_mm}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Onsite MM</p>
                  <p className="text-lg font-bold font-mono text-amber-600">{wave.onsite_mm}</p>
                </div>
                <div className="bg-sky-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Offshore MM</p>
                  <p className="text-lg font-bold font-mono text-sky-600">{wave.offshore_mm}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500">Wave Price</p>
                  <p className="text-lg font-bold font-mono text-emerald-600">{fmt(wave.final_price)}</p>
                </div>
              </div>

              {/* Resource table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#0F172A] text-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Role / Skill</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Level</th>
                      <th className="px-3 py-2 text-center text-xs font-medium">Type</th>
                      <th className="px-3 py-2 text-center text-xs font-medium">Man-Months</th>
                      <th className="px-3 py-2 text-right text-xs font-medium">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wave.resources.map((r, j) => (
                      <tr key={j} className={j % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-3 py-2 text-gray-400">{j + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-800">{r.skill_name}</td>
                        <td className="px-3 py-2 text-gray-600">{r.proficiency_level || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline" className={r.is_onsite ? "border-amber-300 text-amber-600" : "border-sky-300 text-sky-600"}>
                            {r.is_onsite ? "Onsite" : "Offshore"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center font-mono">{r.man_months}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">{fmt(r.selling_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Grand Total */}
        <Card className="border-2 border-emerald-600 shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-emerald-700 font-semibold uppercase tracking-wider mb-3">Total Quoted Price</p>
            <p className="text-5xl font-extrabold font-mono text-emerald-700" data-testid="shared-grand-total">
              {fmt(data.overall.final_price)}
            </p>
            <p className="text-sm text-gray-500 mt-3">{data.overall.total_mm} man-months across {data.waves.length} wave{data.waves.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-200 mt-6">
          <p>Generated by <strong>YASH EstPro</strong> — Confidential estimate for {data.customer_name}</p>
          <p className="mt-1">This link expires on {expires.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
