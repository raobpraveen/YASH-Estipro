import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Send, CheckCircle, XCircle, Clock, History, RefreshCw, Upload, Zap, Link, ExternalLink, Copy, Trash2 } from "lucide-react";
import { COUNTRIES } from "@/utils/constants";

export const SubmitReviewDialog = ({ open, onOpenChange, approverEmail, setApproverEmail, approversList, onSubmit }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-[#0F172A]">Submit for Review</DialogTitle>
        <DialogDescription>Select an approver to submit this project for review.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="approver-select">Select Approver *</Label>
          {approversList.length === 0 ? (
            <p className="text-sm text-amber-600 py-2">No approvers available. Please contact an administrator to assign approver roles.</p>
          ) : (
            <Select value={approverEmail} onValueChange={setApproverEmail}>
              <SelectTrigger className="w-full h-12" data-testid="approver-select">
                <SelectValue placeholder="Select an approver..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {approversList.map((approver) => (
                  <SelectItem key={approver.id} value={approver.email} className="py-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{approver.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${approver.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {approver.role}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{approver.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <p className="text-xs text-gray-500">The selected approver will receive a notification and can approve, reject, or request changes to this estimate.</p>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onSubmit} className="bg-purple-600 hover:bg-purple-700 text-white" disabled={!approverEmail || approversList.length === 0} data-testid="confirm-submit-review">
          <Send className="w-4 h-4 mr-2" /> Submit for Review
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const ApprovalActionDialog = ({ open, onOpenChange, approvalAction, approvalComments, setApprovalComments, onAction }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="text-xl font-bold text-[#0F172A]">
          {approvalAction === "approve" ? "Approve Project" : "Reject Project"}
        </DialogTitle>
        <DialogDescription>
          {approvalAction === "approve" ? "Add any comments for the approval." : "Please provide a reason for rejection."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div>
          <Label htmlFor="approval-comments">Comments</Label>
          <Textarea id="approval-comments" placeholder={approvalAction === "approve" ? "Optional approval comments..." : "Reason for rejection..."} value={approvalComments} onChange={(e) => setApprovalComments(e.target.value)} rows={3} data-testid="approval-comments-input" />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={onAction} className={approvalAction === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"} data-testid="confirm-approval-action">
          {approvalAction === "approve" ? (<><CheckCircle className="w-4 h-4 mr-2" /> Approve</>) : (<><XCircle className="w-4 h-4 mr-2" /> Reject</>)}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const LogisticsDialog = ({ open, onOpenChange, waveLogistics, setWaveLogistics, onSave }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-[#0F172A]">Wave Logistics Configuration</DialogTitle>
        <DialogDescription>Configure logistics rates for this wave. Costs calculated based on total onsite MM and resource count.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div><Label>Per-Diem ($/day)</Label><Input type="number" value={waveLogistics.per_diem_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_daily: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Per-Diem Days/Month</Label><Input type="number" value={waveLogistics.per_diem_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_days: parseInt(e.target.value) || 0 })} /></div>
          <div className="flex items-end"><p className="text-xs text-gray-500 pb-2">Onsite MM × ${waveLogistics.per_diem_daily} × {waveLogistics.per_diem_days}</p></div>
          <div><Label>Accommodation ($/day)</Label><Input type="number" value={waveLogistics.accommodation_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_daily: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Accommodation Days/Month</Label><Input type="number" value={waveLogistics.accommodation_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_days: parseInt(e.target.value) || 0 })} /></div>
          <div className="flex items-end"><p className="text-xs text-gray-500 pb-2">Onsite MM × ${waveLogistics.accommodation_daily} × {waveLogistics.accommodation_days}</p></div>
          <div><Label>Conveyance ($/day)</Label><Input type="number" value={waveLogistics.local_conveyance_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_daily: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Conveyance Days/Month</Label><Input type="number" value={waveLogistics.local_conveyance_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_days: parseInt(e.target.value) || 0 })} /></div>
          <div className="flex items-end"><p className="text-xs text-gray-500 pb-2">Onsite MM × ${waveLogistics.local_conveyance_daily} × {waveLogistics.local_conveyance_days}</p></div>
          <div><Label>Air Fare ($/trip)</Label><Input type="number" value={waveLogistics.flight_cost_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, flight_cost_per_trip: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Number of Trips</Label><Input type="number" value={waveLogistics.num_trips} onChange={(e) => setWaveLogistics({ ...waveLogistics, num_trips: parseInt(e.target.value) || 0 })} /></div>
          <div className="flex items-end"><p className="text-xs text-gray-500 pb-2">Resources × ${waveLogistics.flight_cost_per_trip} × {waveLogistics.num_trips}</p></div>
          <div><Label>Visa & Medical ($/trip)</Label><Input type="number" value={waveLogistics.visa_medical_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, visa_medical_per_trip: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Contingency %</Label><Input type="number" value={waveLogistics.contingency_percentage} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_percentage: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Contingency ($)</Label><Input type="number" value={waveLogistics.contingency_absolute} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_absolute: parseFloat(e.target.value) || 0 })} placeholder="Absolute amount" /></div>
        </div>
        <Button onClick={onSave} className="w-full bg-[#0F172A] hover:bg-[#0F172A]/90">Save Configuration</Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const BatchLogisticsDialog = ({ open, onOpenChange, waveLogistics, setWaveLogistics, onApply }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-[#0F172A]">Batch Update Logistics</DialogTitle>
        <DialogDescription>Update logistics configuration for all onsite resources in this wave</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm">
          <p className="font-semibold">This will update the wave logistics config.</p>
          <p className="text-gray-600">Logistics are calculated at wave level based on total onsite MM and resource count.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Per-Diem ($/day)</Label><Input type="number" value={waveLogistics.per_diem_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_daily: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Per-Diem Days/Month</Label><Input type="number" value={waveLogistics.per_diem_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, per_diem_days: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Accommodation ($/day)</Label><Input type="number" value={waveLogistics.accommodation_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_daily: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Accommodation Days/Month</Label><Input type="number" value={waveLogistics.accommodation_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, accommodation_days: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Conveyance ($/day)</Label><Input type="number" value={waveLogistics.local_conveyance_daily} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_daily: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Conveyance Days/Month</Label><Input type="number" value={waveLogistics.local_conveyance_days} onChange={(e) => setWaveLogistics({ ...waveLogistics, local_conveyance_days: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Air Fare ($/trip)</Label><Input type="number" value={waveLogistics.flight_cost_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, flight_cost_per_trip: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Number of Trips</Label><Input type="number" value={waveLogistics.num_trips} onChange={(e) => setWaveLogistics({ ...waveLogistics, num_trips: parseInt(e.target.value) || 0 })} /></div>
          <div><Label>Visa & Medical ($/trip)</Label><Input type="number" value={waveLogistics.visa_medical_per_trip} onChange={(e) => setWaveLogistics({ ...waveLogistics, visa_medical_per_trip: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Contingency %</Label><Input type="number" value={waveLogistics.contingency_percentage} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_percentage: parseFloat(e.target.value) || 0 })} /></div>
          <div><Label>Contingency ($)</Label><Input type="number" value={waveLogistics.contingency_absolute} onChange={(e) => setWaveLogistics({ ...waveLogistics, contingency_absolute: parseFloat(e.target.value) || 0 })} placeholder="Absolute amount" /></div>
        </div>
        <Button onClick={onApply} className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white">
          <RefreshCw className="w-4 h-4 mr-2" /> Apply to Wave
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const SaveVersionDialog = ({ open, onOpenChange, projectNumber, projectVersion, versionNotes, setVersionNotes, onSave }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-[#0F172A]">Save as New Version</DialogTitle>
        <DialogDescription>Create a new version of {projectNumber}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div>
          <Label>Version Notes (optional)</Label>
          <Textarea placeholder="Describe changes in this version..." value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} rows={3} />
        </div>
        <div className="bg-blue-50 p-3 rounded text-sm">
          <p className="font-semibold">This will:</p>
          <ul className="list-disc list-inside text-gray-700 mt-1">
            <li>Create version {projectVersion + 1} of {projectNumber}</li>
            <li>Mark current version as historical</li>
            <li>Keep all previous versions accessible</li>
          </ul>
        </div>
        <Button onClick={onSave} className="w-full bg-[#F59E0B] hover:bg-[#F59E0B]/90 text-white">
          <History className="w-4 h-4 mr-2" /> Create Version {projectVersion + 1}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export const ApproverSaveDialog = ({ open, onOpenChange, projectNumber, projectVersion, hasChanges, versionNotes, setVersionNotes, onSave }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-[#0F172A]">
          {hasChanges ? "Save & Approve" : "Approve Project"}
        </DialogTitle>
        <DialogDescription>
          {hasChanges
            ? `Changes detected. A new version (v${projectVersion + 1}) of ${projectNumber} will be created.`
            : `No changes detected. ${projectNumber} v${projectVersion} will be approved as-is.`}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        {hasChanges && (
          <div>
            <Label>Version Notes *</Label>
            <Textarea placeholder="Describe changes made during review..." value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} rows={3} data-testid="approver-version-notes" />
          </div>
        )}
        {!hasChanges && (
          <div>
            <Label>Approval Comments (optional)</Label>
            <Textarea placeholder="Add optional comments..." value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} rows={2} data-testid="approver-approval-comments" />
          </div>
        )}
        {hasChanges ? (
          <>
            <div className="bg-amber-50 p-3 rounded text-sm border border-amber-200">
              <p className="font-semibold text-amber-800">Choose how to save:</p>
              <ul className="list-disc list-inside text-gray-700 mt-1 space-y-1">
                <li><strong>Keep In Review</strong> — Save changes as v{projectVersion + 1}, keep status "In Review"</li>
                <li><strong>Approve & Save</strong> — Save changes as v{projectVersion + 1} and set status to "Approved"</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => onSave(false)} variant="outline" className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50" data-testid="approver-save-review">
                <Clock className="w-4 h-4 mr-2" /> Keep In Review
              </Button>
              <Button onClick={() => onSave(true)} className="flex-1 bg-[#10B981] hover:bg-[#10B981]/90 text-white" data-testid="approver-save-approve">
                <CheckCircle className="w-4 h-4 mr-2" /> Approve & Save
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={() => onSave(true)} className="w-full bg-[#10B981] hover:bg-[#10B981]/90 text-white" data-testid="approver-approve-direct">
            <CheckCircle className="w-4 h-4 mr-2" /> Approve
          </Button>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export const SummaryDialog = ({ open, onOpenChange, projectNumber, projectVersion, customerId, customers, projectName, projectLocations, technologyIds, technologies, projectTypeIds, projectTypes, salesManagerId, salesManagers, profitMarginPercentage, waves, calculateWaveSummary, overall }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-[#0F172A]">
          Project Estimate Summary
          {projectNumber && <span className="ml-2 text-base font-normal text-gray-500">{projectNumber} v{projectVersion}</span>}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-6 mt-4">
        {/* Project Details */}
        <Card className="bg-[#F8FAFC]">
          <CardHeader className="pb-3"><CardTitle className="text-lg font-bold text-[#0F172A]">Project Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-gray-600">Customer</p><p className="font-semibold">{customers.find(c => c.id === customerId)?.name || "—"}</p></div>
            <div><p className="text-gray-600">Project</p><p className="font-semibold">{projectName || "—"}</p></div>
            <div><p className="text-gray-600">Location(s)</p><p className="font-semibold">{projectLocations.map(code => COUNTRIES.find(c => c.code === code)?.name || code).join(", ") || "—"}</p></div>
            <div><p className="text-gray-600">Technology(s)</p><p className="font-semibold">{technologyIds.map(id => technologies.find(t => t.id === id)?.name).filter(Boolean).join(", ") || "—"}</p></div>
            <div><p className="text-gray-600">Project Type(s)</p><p className="font-semibold">{projectTypeIds.map(id => projectTypes.find(t => t.id === id)?.name).filter(Boolean).join(", ") || "—"}</p></div>
            <div><p className="text-gray-600">Sales Manager</p><p className="font-semibold">{salesManagers.find(m => m.id === salesManagerId)?.name || "—"}</p></div>
            <div><p className="text-gray-600">Profit Margin</p><p className="font-semibold">{profitMarginPercentage}%</p></div>
          </CardContent>
        </Card>

        {/* Wave Summaries */}
        {waves.map(wave => {
          const summary = calculateWaveSummary(wave);
          const onsiteAvgPrice = summary.onsiteMM > 0 ? (summary.onsiteSalaryCost / summary.onsiteMM) * (1 + profitMarginPercentage/100) : 0;
          const offshoreAvgPrice = summary.offshoreMM > 0 ? (summary.offshoreSalaryCost / summary.offshoreMM) * (1 + profitMarginPercentage/100) : 0;
          return (
            <Card key={wave.id} className="border-2 border-[#0EA5E9]">
              <CardHeader className="pb-3 bg-[#E0F2FE]">
                <CardTitle className="text-lg font-bold text-[#0F172A] flex items-center justify-between">
                  <span>{wave.name} - {wave.duration_months} months ({wave.grid_allocations.length} resources)</span>
                  <Badge className="bg-green-100 text-green-700">Profit: {profitMarginPercentage}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded"><p className="text-sm text-gray-600">Total MM</p><p className="text-2xl font-bold font-mono">{summary.totalMM.toFixed(1)}</p></div>
                  <div className="text-center p-3 bg-amber-50 rounded"><p className="text-sm text-gray-600">Onsite MM</p><p className="text-2xl font-bold font-mono text-[#F59E0B]">{summary.onsiteMM.toFixed(1)}</p><p className="text-xs text-gray-500 mt-1">Avg: ${onsiteAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/MM</p></div>
                  <div className="text-center p-3 bg-blue-50 rounded"><p className="text-sm text-gray-600">Offshore MM</p><p className="text-2xl font-bold font-mono text-[#0EA5E9]">{summary.offshoreMM.toFixed(1)}</p><p className="text-xs text-gray-500 mt-1">Avg: ${offshoreAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/MM</p></div>
                  <div className="text-center p-3 bg-purple-50 rounded"><p className="text-sm text-gray-600">Logistics</p><p className="text-2xl font-bold font-mono">${summary.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                  <div className="col-span-2 text-center p-4 bg-gray-100 rounded"><p className="text-sm text-gray-600">Cost to Company</p><p className="text-3xl font-bold font-mono">${summary.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                  <div className="text-center p-4 bg-green-50 rounded"><p className="text-sm text-gray-600">Wave Selling Price</p><p className="text-3xl font-bold font-mono text-[#10B981]">${summary.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                  <div className="text-center p-4 bg-blue-50 rounded border border-blue-200"><p className="text-sm text-gray-600">Nego Buffer ({summary.negoBufferPercentage}%)</p><p className="text-2xl font-bold font-mono text-blue-600">${summary.negoBufferAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                  <div className="col-span-2 text-center p-4 bg-emerald-100 rounded border border-emerald-400"><p className="text-sm text-emerald-700 font-semibold">Final Price (incl. buffer)</p><p className="text-3xl font-bold font-mono text-emerald-700">${summary.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Overall Summary */}
        <Card className="border-4 border-[#10B981]">
          <CardHeader className="pb-3 bg-green-50"><CardTitle className="text-2xl font-bold text-[#0F172A]">Overall Project Summary</CardTitle></CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded"><p className="text-sm text-gray-600 mb-2">Total Man-Months</p><p className="text-3xl font-bold font-mono">{overall.totalMM.toFixed(1)}</p></div>
              <div className="text-center p-4 bg-amber-50 rounded"><p className="text-sm text-gray-600 mb-2">Total Onsite MM</p><p className="text-3xl font-bold font-mono text-[#F59E0B]">{overall.onsiteMM.toFixed(1)}</p><p className="text-xs text-gray-500 mt-1">Avg: ${overall.onsiteMM > 0 ? ((overall.onsiteSalaryCost / overall.onsiteMM) * (1 + profitMarginPercentage/100)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}/MM</p></div>
              <div className="text-center p-4 bg-blue-50 rounded"><p className="text-sm text-gray-600 mb-2">Total Offshore MM</p><p className="text-3xl font-bold font-mono text-[#0EA5E9]">{overall.offshoreMM.toFixed(1)}</p><p className="text-xs text-gray-500 mt-1">Avg: ${overall.offshoreMM > 0 ? ((overall.offshoreSalaryCost / overall.offshoreMM) * (1 + profitMarginPercentage/100)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}/MM</p></div>
              <div className="text-center p-4 bg-purple-50 rounded"><p className="text-sm text-gray-600 mb-2">Avg. Selling Price/MM</p><p className="text-3xl font-bold font-mono text-[#8B5CF6]">${overall.totalMM > 0 ? (overall.sellingPrice / overall.totalMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}</p></div>
              <div className="text-center p-4 bg-purple-50 rounded"><p className="text-sm text-gray-600 mb-2">Total Logistics</p><p className="text-2xl font-bold font-mono text-[#8B5CF6]">${overall.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="text-center p-4 bg-amber-100 rounded"><p className="text-sm text-gray-600 mb-2">Onsite Selling Price</p><p className="text-2xl font-bold font-mono text-[#F59E0B]">${overall.onsiteSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p><p className="text-xs text-gray-500">incl. logistics</p></div>
              <div className="text-center p-4 bg-blue-100 rounded"><p className="text-sm text-gray-600 mb-2">Offshore Selling Price</p><p className="text-2xl font-bold font-mono text-[#0EA5E9]">${overall.offshoreSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="text-center p-4 bg-gray-100 rounded"><p className="text-sm text-gray-600 mb-2">Cost to Company</p><p className="text-2xl font-bold font-mono">${overall.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="text-center p-4 bg-green-100 rounded"><p className="text-sm text-gray-600 mb-2">Profit ({profitMarginPercentage}%)</p><p className="text-2xl font-bold font-mono text-[#10B981]">${((overall.onsiteSellingPrice + overall.offshoreSellingPrice) - overall.totalCostToCompany).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="text-center p-4 bg-blue-50 rounded border border-blue-200"><p className="text-sm text-gray-600 mb-2">Total Nego Buffer</p><p className="text-2xl font-bold font-mono text-blue-600">${overall.negoBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="col-span-2 text-center p-4 bg-green-50 rounded"><p className="text-sm text-gray-600 mb-2">Total Selling Price</p><p className="text-3xl font-bold font-mono text-[#10B981]">${overall.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
              <div className="col-span-2 md:col-span-4 text-center p-6 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg border-2 border-emerald-600">
                <p className="text-lg text-emerald-800 mb-3 font-semibold">GRAND TOTAL (Final Price incl. Nego Buffer)</p>
                <p className="text-5xl font-extrabold font-mono text-emerald-700">${overall.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  </Dialog>
);

export const SmartImportDialog = ({ open, onOpenChange, smartImportData, smartImportLoading, projectId, onConfirm }) => (
  <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <Upload className="w-5 h-5 text-purple-600" /> Smart Import Preview
        </DialogTitle>
        <DialogDescription>Review the parsed data before importing into this project.</DialogDescription>
      </DialogHeader>
      {smartImportData && (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-600">{smartImportData.waves.length}</p><p className="text-xs text-gray-500">Waves Detected</p></div>
            <div className="bg-green-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-green-600">{smartImportData.totalResources}</p><p className="text-xs text-gray-500">Total Resources</p></div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100"><tr><th className="p-2 text-left">Wave</th><th className="p-2 text-center">Months</th><th className="p-2 text-center">Resources</th></tr></thead>
              <tbody>
                {smartImportData.waves.map((w, i) => (<tr key={i} className="border-t"><td className="p-2 font-medium">{w.sheetName}</td><td className="p-2 text-center">{w.phaseNames.length}</td><td className="p-2 text-center">{w.allocations.length}</td></tr>))}
              </tbody>
            </table>
          </div>
          {(smartImportData.missingSkills.length > 0 || smartImportData.missingLocations.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-700 mb-1">New master data will be auto-created:</p>
              {smartImportData.missingSkills.length > 0 && <p className="text-xs text-amber-600">Skills: {smartImportData.missingSkills.join(", ")}</p>}
              {smartImportData.missingLocations.length > 0 && <p className="text-xs text-amber-600 mt-1">Locations: {smartImportData.missingLocations.join(", ")}</p>}
            </div>
          )}
          {smartImportData.waves.some(w => w.logistics) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-purple-700 mb-1">Logistics data detected</p>
              <p className="text-xs text-purple-600">Logistics configuration will be imported from the Excel file.</p>
            </div>
          )}
          <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-500">
            <strong>Replace current:</strong> Overwrites all waves locally (save to persist).<br/>
            {projectId && <><strong>Import as New Version:</strong> Creates a new version and suspends the current one.</>}
          </div>
        </div>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="cancel-import-btn">Cancel</Button>
        {projectId && (
          <Button onClick={() => onConfirm(true)} disabled={smartImportLoading} className="bg-orange-600 hover:bg-orange-700 text-white" data-testid="import-new-version-btn">
            {smartImportLoading ? "Creating..." : "Import as New Version"}
          </Button>
        )}
        <Button onClick={() => onConfirm(false)} disabled={smartImportLoading} className="bg-purple-600 hover:bg-purple-700 text-white" data-testid="confirm-import-btn">
          {smartImportLoading ? "Importing..." : "Replace Current"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const ObsoleteConfirmDialog = ({ open, onOpenChange, onConfirm }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
          <XCircle className="w-5 h-5" /> Mark as Obsolete
        </DialogTitle>
        <DialogDescription>Are you sure you want to mark this version as <strong>Obsolete</strong>? This cannot be undone. The project will become read-only.</DialogDescription>
      </DialogHeader>
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="cancel-obsolete-btn">Cancel</Button>
        <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white" data-testid="confirm-obsolete-btn">Yes, Mark Obsolete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const QuickEstimatorDialog = ({ open, onOpenChange, quickEstimate, setQuickEstimate, quickEstimateResult, negoBufferPercentage }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <Zap className="w-5 h-5 text-amber-500" /> Quick Estimate Calculator
        </DialogTitle>
        <DialogDescription>Get a ballpark estimate in seconds — enter basic parameters below</DialogDescription>
      </DialogHeader>
      <div className="space-y-5 mt-2">
        <div className="space-y-4">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Onsite</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-semibold">Onsite Man-Months</Label><Input type="number" min="0" value={quickEstimate.onsiteMM} onChange={e => setQuickEstimate({ ...quickEstimate, onsiteMM: parseFloat(e.target.value) || 0 })} data-testid="qe-onsite-mm" /></div>
            <div><Label className="text-xs font-semibold">Onsite Avg Salary ($/month)</Label><Input type="number" min="0" value={quickEstimate.onsiteAvgSalary} onChange={e => setQuickEstimate({ ...quickEstimate, onsiteAvgSalary: parseFloat(e.target.value) || 0 })} data-testid="qe-onsite-salary" /></div>
          </div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mt-3">Offshore</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-semibold">Offshore Man-Months</Label><Input type="number" min="0" value={quickEstimate.offshoreMM} onChange={e => setQuickEstimate({ ...quickEstimate, offshoreMM: parseFloat(e.target.value) || 0 })} data-testid="qe-offshore-mm" /></div>
            <div><Label className="text-xs font-semibold">Offshore Avg Salary ($/month)</Label><Input type="number" min="0" value={quickEstimate.offshoreAvgSalary} onChange={e => setQuickEstimate({ ...quickEstimate, offshoreAvgSalary: parseFloat(e.target.value) || 0 })} data-testid="qe-offshore-salary" /></div>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3">Margins</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-xs font-semibold">Overhead %</Label><Input type="number" min="0" max="100" value={quickEstimate.overheadPercentage} onChange={e => setQuickEstimate({ ...quickEstimate, overheadPercentage: parseFloat(e.target.value) || 0 })} data-testid="qe-overhead" /></div>
            <div><Label className="text-xs font-semibold">Profit Margin %</Label><Input type="number" min="0" max="100" value={quickEstimate.profitMargin} onChange={e => setQuickEstimate({ ...quickEstimate, profitMargin: parseFloat(e.target.value) || 0 })} data-testid="qe-profit-margin" /></div>
          </div>
        </div>
        <div className="bg-[#F8FAFC] rounded-lg p-4 border space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Estimate Breakdown</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500">Total Man-Months</span><span className="font-mono font-semibold text-right">{quickEstimateResult.totalMM}</span>
            <span className="text-amber-600">Onsite Cost ({quickEstimateResult.onsiteMM} MM x ${quickEstimate.onsiteAvgSalary.toLocaleString()})</span><span className="font-mono text-right text-amber-600">${quickEstimateResult.onsiteCost.toLocaleString()}</span>
            <span className="text-blue-600">Offshore Cost ({quickEstimateResult.offshoreMM} MM x ${quickEstimate.offshoreAvgSalary.toLocaleString()})</span><span className="font-mono text-right text-blue-600">${quickEstimateResult.offshoreCost.toLocaleString()}</span>
            <span className="text-gray-500">Base Salary Cost</span><span className="font-mono text-right">${quickEstimateResult.baseCost.toLocaleString()}</span>
            <span className="text-gray-500">Overhead ({quickEstimate.overheadPercentage}%)</span><span className="font-mono text-right">${quickEstimateResult.overheadCost.toLocaleString()}</span>
            <span className="text-gray-600 font-medium">Total Cost</span><span className="font-mono font-semibold text-right">${quickEstimateResult.totalCost.toLocaleString()}</span>
          </div>
          <hr className="my-2" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-500">Profit Margin ({quickEstimate.profitMargin}%)</span><span className="font-mono text-right">${(quickEstimateResult.sellingPrice - quickEstimateResult.totalCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="text-gray-600 font-medium">Selling Price</span><span className="font-mono font-bold text-right text-[#10B981]">${quickEstimateResult.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="text-gray-500">SP per Man-Month</span><span className="font-mono text-right text-blue-600">${quickEstimateResult.spPerMM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="text-gray-500">Hourly Rate</span><span className="font-mono text-right text-blue-600">${quickEstimateResult.hourly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            {negoBufferPercentage > 0 && (<><span className="text-gray-500">Nego Buffer ({negoBufferPercentage}%)</span><span className="font-mono text-right">${quickEstimateResult.negoBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></>)}
          </div>
          <div className="bg-emerald-600 text-white rounded-lg p-3 mt-3 text-center">
            <p className="text-xs uppercase tracking-wider opacity-80">Estimated Final Price</p>
            <p className="text-3xl font-extrabold font-mono mt-1">${quickEstimateResult.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);


export const ShareDialog = ({ open, onOpenChange, shareLinks, shareExpiry, setShareExpiry, shareLoading, onCreate, onRevoke }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[#0F172A]">
          <Link className="w-5 h-5 text-indigo-600" /> Client Share Link
        </DialogTitle>
        <DialogDescription>Create a read-only link for clients. No login required. Sensitive data (costs, salary, margins) is hidden.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-2">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs font-semibold">Link Expiry</Label>
            <Select value={String(shareExpiry)} onValueChange={(v) => setShareExpiry(Number(v))}>
              <SelectTrigger className="h-10" data-testid="share-expiry-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={onCreate} disabled={shareLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white h-10" data-testid="create-share-link-btn">
            {shareLoading ? "Creating..." : "Generate & Copy Link"}
          </Button>
        </div>

        {shareLinks.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Links</div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {shareLinks.map((link) => {
                const expires = new Date(link.expires_at);
                const isExpired = expires < new Date();
                const shareUrl = `${window.location.origin}/shared/${link.token}`;
                return (
                  <div key={link.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs truncate text-gray-600">{shareUrl}</span>
                        <button onClick={() => { navigator.clipboard.writeText(shareUrl); }} className="text-indigo-500 hover:text-indigo-700" title="Copy link">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700" title="Open">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <p className={`text-xs mt-0.5 ${isExpired ? "text-red-500" : "text-gray-400"}`}>
                        {isExpired ? "Expired" : `Expires ${expires.toLocaleDateString()}`}
                      </p>
                    </div>
                    <button onClick={() => onRevoke(link.token)} className="text-red-400 hover:text-red-600 ml-2" title="Revoke" data-testid={`revoke-${link.token}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);
