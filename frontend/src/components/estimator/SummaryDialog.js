import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

export const SummaryDialog = ({
  open,
  onOpenChange,
  projectName,
  projectNumber,
  projectVersion,
  customerName,
  profitMarginPercentage,
  waves,
  overall,
  calculateWaveSummary,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {projectName || "Project"} Summary
            {projectNumber && <span className="text-base text-gray-500 ml-2">({projectNumber} v{projectVersion})</span>}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Customer</p>
                  <p className="font-semibold">{customerName || "—"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Profit Margin</p>
                  <p className="font-semibold">{profitMarginPercentage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wave Summaries */}
          {waves.map(wave => {
            const summary = calculateWaveSummary(wave);
            const onsiteAvgPrice = summary.onsiteMM > 0 
              ? (summary.onsiteSalaryCost / summary.onsiteMM) * (1 + profitMarginPercentage/100) 
              : 0;
            const offshoreAvgPrice = summary.offshoreMM > 0 
              ? (summary.offshoreSalaryCost / summary.offshoreMM) * (1 + profitMarginPercentage/100) 
              : 0;
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
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Total MM</p>
                      <p className="text-2xl font-bold font-mono">{summary.totalMM.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded">
                      <p className="text-sm text-gray-600">Onsite MM</p>
                      <p className="text-2xl font-bold font-mono text-[#F59E0B]">{summary.onsiteMM.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">Avg: ${onsiteAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/MM</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-sm text-gray-600">Offshore MM</p>
                      <p className="text-2xl font-bold font-mono text-[#0EA5E9]">{summary.offshoreMM.toFixed(2)}</p>
                      <p className="text-xs text-gray-500 mt-1">Avg: ${offshoreAvgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}/MM</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-sm text-gray-600">Logistics</p>
                      <p className="text-2xl font-bold font-mono">${summary.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="col-span-2 text-center p-4 bg-gray-100 rounded">
                      <p className="text-sm text-gray-600">Cost to Company</p>
                      <p className="text-3xl font-bold font-mono">${summary.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="col-span-2 text-center p-4 bg-green-50 rounded">
                      <p className="text-sm text-gray-600">Wave Selling Price</p>
                      <p className="text-3xl font-bold font-mono text-[#10B981]">${summary.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Overall Summary */}
          <Card className="border-4 border-[#10B981]">
            <CardHeader className="pb-3 bg-green-50">
              <CardTitle className="text-2xl font-bold text-[#0F172A]">Overall Project Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">Total Man-Months</p>
                  <p className="text-3xl font-bold font-mono">{overall.totalMM.toFixed(2)}</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">Total Onsite MM</p>
                  <p className="text-3xl font-bold font-mono text-[#F59E0B]">{overall.onsiteMM.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: ${overall.onsiteMM > 0 
                      ? (overall.onsiteSellingPrice / overall.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : 0}/MM
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">Total Offshore MM</p>
                  <p className="text-3xl font-bold font-mono text-[#0EA5E9]">{overall.offshoreMM.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Avg: ${overall.offshoreMM > 0 
                      ? (overall.offshoreSellingPrice / overall.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : 0}/MM
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">Avg. Selling Price/MM</p>
                  <p className="text-3xl font-bold font-mono text-[#8B5CF6]">
                    ${overall.totalMM > 0 
                      ? (overall.sellingPrice / overall.totalMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) 
                      : 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded">
                  <p className="text-sm text-gray-600 mb-2">Total Logistics</p>
                  <p className="text-2xl font-bold font-mono text-[#8B5CF6]">${overall.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-center p-4 bg-amber-100 rounded">
                  <p className="text-sm text-gray-600 mb-2">Onsite Selling Price</p>
                  <p className="text-2xl font-bold font-mono text-[#F59E0B]">${overall.onsiteSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-gray-500">incl. logistics</p>
                </div>
                <div className="text-center p-4 bg-blue-100 rounded">
                  <p className="text-sm text-gray-600 mb-2">Offshore Selling Price</p>
                  <p className="text-2xl font-bold font-mono text-[#0EA5E9]">${overall.offshoreSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-center p-4 bg-gray-100 rounded">
                  <p className="text-sm text-gray-600 mb-2">Cost to Company</p>
                  <p className="text-2xl font-bold font-mono">${overall.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="text-center p-4 bg-green-100 rounded">
                  <p className="text-sm text-gray-600 mb-2">Profit ({profitMarginPercentage}%)</p>
                  <p className="text-2xl font-bold font-mono text-[#10B981]">
                    ${(overall.sellingPrice - overall.totalCostToCompany).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="col-span-2 md:col-span-3 text-center p-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-[#10B981]">
                  <p className="text-lg text-gray-700 mb-3 font-semibold">GRAND TOTAL (Selling Price)</p>
                  <p className="text-5xl font-extrabold font-mono text-[#10B981]">
                    ${overall.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SummaryDialog;
