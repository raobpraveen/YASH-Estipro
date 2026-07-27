import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Iter 86: Approver Load widget.
 *
 * Shows every user with the Approver role (and admins), the number of `in_review`
 * projects currently awaiting them at their CURRENT matrix level, and the single
 * longest-waiting project so admins can chase the right person first.
 */
const ApproverLoadWidget = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/admin/approver-load`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRows(res.data?.approvers || []);
      setTotal(res.data?.total_active || 0);
    } catch (e) {
      // silently ignore — widget is optional
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="border-purple-100" data-testid="approver-load-widget">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          Approver Load
          <Badge className="bg-purple-100 text-purple-700 text-[10px] ml-1">
            {total} active review{total === 1 ? "" : "s"}
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-7 w-7 p-0" data-testid="approver-load-refresh" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="pt-2">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-2">No approver data.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {rows.map((r, i) => (
              <div key={i} className="py-2 flex items-center gap-3" data-testid={`approver-load-row-${i}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#0F172A] truncate">{r.name}</span>
                    <span className={`text-[9px] px-1.5 py-0 rounded-full ${r.role === "admin" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{r.role}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">{r.email}</div>
                  {r.longest && (
                    <button
                      className="mt-1 flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline text-left"
                      onClick={() => navigate(`/estimator?view=${r.longest.project_id}`)}
                      title="Open the longest-waiting project"
                      data-testid={`approver-load-longest-${i}`}
                    >
                      <Clock className="w-3 h-3" />
                      <span className="truncate max-w-[220px]">
                        Longest wait: <strong>{r.longest.project_number}</strong> · L{r.longest.level} · {r.longest.waited_days}d
                      </span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-lg font-bold ${r.count === 0 ? "text-gray-300" : r.count >= 3 ? "text-red-600" : "text-purple-700"}`}>{r.count}</span>
                  <span className="text-[9px] uppercase tracking-wider text-gray-400">pending</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApproverLoadWidget;
