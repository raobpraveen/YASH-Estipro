import { Clock, History, CheckCircle, XCircle } from "lucide-react";

export const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-100 text-amber-700", icon: Clock },
  superseded: { label: "Superseded", color: "bg-gray-100 text-gray-500", icon: History },
  suspended: { label: "Suspended", color: "bg-orange-100 text-orange-700", icon: Clock },
  obsolete: { label: "Obsolete", color: "bg-red-50 text-red-400", icon: XCircle },
  approved: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

export const PROFICIENCY_LEVELS = ["Junior", "Mid", "Senior", "Lead", "Architect", "Project Management", "Delivery"];

export const GROUP_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export const getGroupColor = (groupId) =>
  groupId ? GROUP_COLORS[(parseInt(groupId) - 1) % GROUP_COLORS.length] || GROUP_COLORS[0] : null;

export const PHASE_COLORS = {
  Prepare: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E40AF" },
  Explore: { bg: "#E0E7FF", border: "#6366F1", text: "#4338CA" },
  Realize: { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E" },
  Deploy: { bg: "#D1FAE5", border: "#10B981", text: "#065F46" },
  "Go-live": { bg: "#CCFBF1", border: "#14B8A6", text: "#134E4A" },
  Hypercare: { bg: "#FCE7F3", border: "#EC4899", text: "#9D174D" },
  Design: { bg: "#EDE9FE", border: "#8B5CF6", text: "#5B21B6" },
  Build: { bg: "#FFF7ED", border: "#F97316", text: "#9A3412" },
  Test: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" },
  UAT: { bg: "#FEF9C3", border: "#EAB308", text: "#854D0E" },
  Support: { bg: "#F0FDFA", border: "#2DD4BF", text: "#115E59" },
};

export const getPhaseColor = (phase) => PHASE_COLORS[phase] || { bg: "#F1F5F9", border: "#94A3B8", text: "#475569" };

export const PHASE_OPTIONS = ["Prepare", "Explore", "Realize", "Deploy", "Go-live", "Hypercare", "Design", "Build", "Test", "UAT", "Support"];

/** Convert legacy month_phases array to phase_ranges */
export const convertMonthPhasesToRanges = (monthPhases) => {
  if (!monthPhases || monthPhases.length === 0) return [];
  const ranges = [];
  let current = null;
  for (let i = 0; i < monthPhases.length; i++) {
    const phase = monthPhases[i];
    if (!phase) { if (current) { ranges.push(current); current = null; } continue; }
    if (current && current.name === phase) { current.end_month = i + 1; }
    else { if (current) ranges.push(current); current = { name: phase, start_month: i + 1, end_month: i + 1 }; }
  }
  if (current) ranges.push(current);
  return ranges;
};
