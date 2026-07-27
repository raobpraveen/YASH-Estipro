import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, XCircle, Mail, Copy, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

/**
 * Shows level-by-level approval progress for a project with a Billing Entity Approval Matrix.
 *
 * Props:
 *   projectStatus         string  — 'draft' | 'in_review' | 'approved' | 'rejected'
 *   matrixLevels          array   — [{ level, emails: [...], label? }]  (persisted on project)
 *   approvalHistory       array   — [{ level, approver_email, approver_name, approved_at, comments }]
 *   currentApprovalLevel  number  — level currently awaiting action
 *   matrixLabels          object  — optional { [level]: labelString } for pretty names
 */
const fmtDate = (iso) => {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
};

const copyEmail = (email) => {
  navigator.clipboard?.writeText(email);
  toast.success(`Copied ${email}`);
};

const ApprovalStatusTracker = ({
  projectStatus,
  matrixLevels = [],
  approvalHistory = [],
  currentApprovalLevel = 1,
  matrixLabels = {},
}) => {
  const [collapsed, setCollapsed] = useState(false);
  if (!matrixLevels || matrixLevels.length === 0) return null;
  if (!["in_review", "approved", "rejected"].includes(projectStatus)) return null;

  // Build a map: level -> approval record (if any)
  const approvalByLevel = {};
  approvalHistory.forEach(h => { approvalByLevel[h.level] = h; });

  const sortedLevels = [...matrixLevels].sort((a, b) => (a.level || 0) - (b.level || 0));

  const getLevelStatus = (levelNum) => {
    if (projectStatus === "rejected" && approvalByLevel[levelNum]) return "rejected";
    if (approvalByLevel[levelNum]) return "approved";
    if (projectStatus === "in_review" && levelNum === currentApprovalLevel) return "current";
    if (projectStatus === "approved") return "approved"; // shouldn't happen (all should have history)
    return "pending";
  };

  const statusMeta = {
    approved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Approved" },
    current:  { icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-300",   label: "Awaiting" },
    pending:  { icon: Circle,       color: "text-gray-400",    bg: "bg-white",      border: "border-gray-200",    label: "Pending" },
    rejected: { icon: XCircle,      color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     label: "Rejected" },
  };

  return (
    <Card className="border-blue-100" data-testid="approval-status-tracker">
      <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setCollapsed(v => !v)} data-testid="approval-status-toggle">
        <CardTitle className="text-base flex items-center gap-2">
          {collapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
          Approval Progress
          {projectStatus === "in_review" && (
            <Badge className="bg-amber-100 text-amber-700 text-[10px] ml-2">In Review — Level {currentApprovalLevel}</Badge>
          )}
          {projectStatus === "approved" && (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px] ml-2">All Levels Approved</Badge>
          )}
          {projectStatus === "rejected" && (
            <Badge className="bg-red-100 text-red-700 text-[10px] ml-2">Rejected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      {!collapsed && (
        <CardContent className="pt-0">
        <div className="space-y-2">
          {sortedLevels.map((lvl) => {
            const st = getLevelStatus(lvl.level);
            const meta = statusMeta[st];
            const Icon = meta.icon;
            const record = approvalByLevel[lvl.level];
            const emails = lvl.emails || lvl.approver_emails || [];
            const names = lvl.names || lvl.approver_names || [];

            return (
              <div
                key={lvl.level}
                className={`rounded-lg border ${meta.border} ${meta.bg} p-3 transition-colors`}
                data-testid={`approval-level-${lvl.level}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-[#0F172A]">Level {lvl.level}</span>
                      {(matrixLabels[lvl.level] || lvl.label) && (
                        <span className="text-xs text-gray-500 italic">— {matrixLabels[lvl.level] || lvl.label}</span>
                      )}
                      <Badge className={`text-[10px] ${meta.color} bg-white border ${meta.border}`}>{meta.label}</Badge>
                      {st === "current" && (
                        <span className="text-[10px] text-amber-700 font-medium">Emails sent, waiting on any one approver</span>
                      )}
                    </div>

                    {/* Approver chips */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {emails.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No approvers configured</span>
                      ) : emails.map((em, ei) => {
                        const isTheApprover = record && (record.approver_email || "").toLowerCase() === (em || "").toLowerCase();
                        return (
                          <span
                            key={ei}
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] border ${
                              isTheApprover ? "bg-emerald-100 border-emerald-300 text-emerald-800 font-semibold" :
                              st === "current" ? "bg-white border-amber-300 text-amber-800" :
                              "bg-white border-gray-200 text-gray-600"
                            }`}
                            data-testid={`approver-chip-${lvl.level}-${ei}`}
                          >
                            {isTheApprover && <CheckCircle2 className="w-3 h-3" />}
                            {names[ei] || em}
                            <span className="opacity-70">&lt;{em}&gt;</span>
                            <button
                              className="ml-0.5 text-gray-400 hover:text-gray-700"
                              title="Copy email"
                              onClick={() => copyEmail(em)}
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {st === "current" && !isTheApprover && (
                              <a
                                href={`mailto:${em}?subject=Follow-up: Project approval pending your action`}
                                className="ml-0.5 text-amber-700 hover:text-amber-900"
                                title="Follow up via email"
                              >
                                <Mail className="w-3 h-3" />
                              </a>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {/* Approval record details */}
                    {record && (
                      <div className="mt-2 text-[11px] text-gray-600 pl-1 border-l-2 border-emerald-300 pl-2">
                        <div>
                          <span className="font-medium text-emerald-700">{record.approver_name || record.approver_email}</span>
                          {" "}on {fmtDate(record.approved_at)}
                        </div>
                        {record.comments && (
                          <div className="italic text-gray-500 mt-0.5">&quot;{record.comments}&quot;</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ApprovalStatusTracker;
