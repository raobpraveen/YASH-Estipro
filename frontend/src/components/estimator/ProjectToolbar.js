import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Save, FileDown, Copy, History, Send, CheckCircle, XCircle, Upload, Eye, Target, BarChart3, Zap, FileText } from "lucide-react";
import { STATUS_CONFIG } from "./constants";

export const ProjectToolbar = ({
  projectId, projectNumber, projectVersion, projectStatus,
  isReadOnly, isDesignatedApprover, canMarkObsolete,
  approvalComments, approverEmail, smartImportLoading,
  navigate,
  onNewProject, onCloneProject, onOpenNewVersion,
  onExportExcel, onSmartImportFile,
  onOpenSummary, onOpenQuickEstimate,
  onOpenSubmitReview, onOpenApproverSave, onReject, onOpenObsolete,
  onSaveProject, onOpenActivities,
}) => {
  const getStatusBadge = () => {
    const config = STATUS_CONFIG[projectStatus] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <img src="/yash-logo-new.png" alt="YASH" className="h-10 object-contain" />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">Project Estimator</h1>
          {projectNumber && (
            <Badge variant="outline" className="text-sm font-mono" data-testid="project-number-badge">
              {projectNumber} v{projectVersion}
            </Badge>
          )}
          {projectId && getStatusBadge()}
        </div>
        <p className="text-sm text-gray-600 mt-1">Wave-based project estimation with version management</p>
        {approvalComments && (projectStatus === "approved" || projectStatus === "rejected") && (
          <div className={`mt-3 p-3 rounded-lg border ${projectStatus === "approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`} data-testid="approval-comments-display">
            <div className="flex items-start gap-2">
              {projectStatus === "approved" ? (
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-semibold ${projectStatus === "approved" ? "text-green-700" : "text-red-700"}`}>
                  {projectStatus === "approved" ? "Approval Comments" : "Rejection Reason"}
                </p>
                <p className="text-sm text-gray-700 mt-1">{approvalComments}</p>
                {approverEmail && <p className="text-xs text-gray-500 mt-1">By: {approverEmail}</p>}
              </div>
            </div>
          </div>
        )}
        {projectStatus === "in_review" && approverEmail && (
          <div className="mt-3 p-3 rounded-lg border bg-purple-50 border-purple-200" data-testid="in-review-info">
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-600" />
              <p className="text-sm text-purple-700">
                Submitted for review to: <span className="font-semibold">{approverEmail}</span>
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Project Actions Group */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="project-actions-group">
          <Tooltip><TooltipTrigger asChild>
            <Button onClick={onNewProject} variant="ghost" size="sm" className="h-8 px-2.5 text-slate-700 hover:bg-white hover:text-[#0F172A]" data-testid="new-project-button">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </TooltipTrigger><TooltipContent>Create a new project</TooltipContent></Tooltip>
          {projectId && (
            <>
              <Tooltip><TooltipTrigger asChild>
                <Button onClick={onCloneProject} variant="ghost" size="sm" className="h-8 px-2.5 text-[#8B5CF6] hover:bg-purple-50" data-testid="clone-project-button">
                  <Copy className="w-4 h-4 mr-1" /> Clone
                </Button>
              </TooltipTrigger><TooltipContent>Clone this project as a new project</TooltipContent></Tooltip>
              <Tooltip><TooltipTrigger asChild>
                <Button onClick={onOpenNewVersion} variant="ghost" size="sm" className="h-8 px-2.5 text-[#F59E0B] hover:bg-amber-50" data-testid="new-version-button">
                  <History className="w-4 h-4 mr-1" /> Version
                </Button>
              </TooltipTrigger><TooltipContent>Create a new version</TooltipContent></Tooltip>
            </>
          )}
        </div>

        {/* Utilities Group */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="utilities-group">
          <Tooltip><TooltipTrigger asChild>
            <Button onClick={onExportExcel} variant="ghost" size="sm" className="h-8 px-2.5 text-[#10B981] hover:bg-emerald-50" data-testid="export-excel-button">
              <FileDown className="w-4 h-4 mr-1" /> Export
            </Button>
          </TooltipTrigger><TooltipContent>Export to Excel</TooltipContent></Tooltip>
          {!isReadOnly && (
            <Tooltip><TooltipTrigger asChild>
              <div className="relative">
                <input type="file" accept=".xlsx" onChange={onSmartImportFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" data-testid="smart-import-input" />
                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[#8B5CF6] hover:bg-purple-50 pointer-events-none" disabled={smartImportLoading}>
                  <Upload className="w-4 h-4 mr-1" /> {smartImportLoading ? "Parsing..." : "Import"}
                </Button>
              </div>
            </TooltipTrigger><TooltipContent>Smart Import from Excel</TooltipContent></Tooltip>
          )}
          <Tooltip><TooltipTrigger asChild>
            <Button onClick={onOpenSummary} variant="ghost" size="sm" className="h-8 px-2.5 text-[#0EA5E9] hover:bg-sky-50" data-testid="view-summary-button">
              <Eye className="w-4 h-4 mr-1" /> Summary
            </Button>
          </TooltipTrigger><TooltipContent>View full project summary</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button onClick={onOpenQuickEstimate} variant="ghost" size="sm" className="h-8 px-2.5 text-amber-600 hover:bg-amber-50" data-testid="quick-estimate-button">
              <Zap className="w-4 h-4 mr-1" /> Quick Est.
            </Button>
          </TooltipTrigger><TooltipContent>Quick Estimate Calculator</TooltipContent></Tooltip>
        </div>

        {/* Financial Links Group */}
        {projectId && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="financial-links-group">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[#8B5CF6] hover:bg-purple-50" onClick={() => navigate(`/payment-milestones?project=${projectId}`)} data-testid="milestones-button">
                <Target className="w-4 h-4 mr-1" /> Milestones
              </Button>
            </TooltipTrigger><TooltipContent>Payment Milestones</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-[#0EA5E9] hover:bg-sky-50" onClick={() => navigate(`/cashflow?project=${projectId}`)} data-testid="cashflow-button">
                <BarChart3 className="w-4 h-4 mr-1" /> Cashflow
              </Button>
            </TooltipTrigger><TooltipContent>Cashflow Statement</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2.5 text-indigo-600 hover:bg-indigo-50" onClick={onOpenActivities} data-testid="activities-button">
                <FileText className="w-4 h-4 mr-1" /> Activities
              </Button>
            </TooltipTrigger><TooltipContent>Phase Activities & Deliverables</TooltipContent></Tooltip>
          </div>
        )}

        {/* Workflow Actions */}
        {projectId && (projectStatus === "draft" || projectStatus === "in_review" || canMarkObsolete) && (
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1" data-testid="workflow-group">
            {projectStatus === "draft" && !isReadOnly && (
              <Tooltip><TooltipTrigger asChild>
                <Button onClick={onOpenSubmitReview} variant="ghost" size="sm" className="h-8 px-2.5 text-purple-600 hover:bg-purple-50" data-testid="submit-review-button">
                  <Send className="w-4 h-4 mr-1" /> Submit
                </Button>
              </TooltipTrigger><TooltipContent>Submit for Review</TooltipContent></Tooltip>
            )}
            {projectStatus === "in_review" && isDesignatedApprover && (
              <>
                <Button onClick={onOpenApproverSave} size="sm" className="h-8 bg-[#10B981] hover:bg-[#10B981]/90 text-white" data-testid="approver-save-button">
                  <Save className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button onClick={onReject} variant="ghost" size="sm" className="h-8 px-2.5 text-red-600 hover:bg-red-50" data-testid="reject-button">
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              </>
            )}
            {canMarkObsolete && (
              <Tooltip><TooltipTrigger asChild>
                <Button onClick={onOpenObsolete} variant="ghost" size="sm" className="h-8 px-2.5 text-red-400 hover:bg-red-50" data-testid="mark-obsolete-button">
                  <XCircle className="w-4 h-4 mr-1" /> Obsolete
                </Button>
              </TooltipTrigger><TooltipContent>Mark as Obsolete</TooltipContent></Tooltip>
            )}
          </div>
        )}

        {/* Save Button */}
        {!isReadOnly && projectStatus !== "in_review" && (
          <Button onClick={onSaveProject} size="sm" className="h-8 bg-[#10B981] hover:bg-[#10B981]/90 text-white shadow-sm" data-testid="save-project-button">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        )}
      </div>
    </div>
  );
};
