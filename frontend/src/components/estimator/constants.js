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
