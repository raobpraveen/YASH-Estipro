import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

export const WaveSummary = ({ summary, travelingMM, travelingResourceCount }) => {
  return (
    <Card className="bg-purple-50/50 border border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-[#0F172A]">Wave Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Man-Months</p>
            <p className="text-xl font-bold font-mono">{summary.totalMM.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-gray-600">Onsite MM ({summary.onsiteResourceCount} resources)</p>
            <p className="text-xl font-bold font-mono text-[#F59E0B]">{summary.onsiteMM.toFixed(2)}</p>
            <p className="text-xs text-gray-500">${summary.onsiteSalaryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-gray-600">Offshore MM</p>
            <p className="text-xl font-bold font-mono text-[#0EA5E9]">{summary.offshoreMM.toFixed(2)}</p>
            <p className="text-xs text-gray-500">${summary.offshoreSalaryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-gray-600">Traveling ({travelingResourceCount} resources)</p>
            <p className="text-xl font-bold font-mono text-[#8B5CF6]">{travelingMM.toFixed(2)} MM</p>
          </div>
          <div>
            <p className="text-gray-600">Total Logistics</p>
            <p className="text-xl font-bold font-mono">${summary.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-purple-200 grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">Wave Selling Price</p>
            <p className="text-2xl font-extrabold font-mono text-[#10B981]">${summary.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-gray-600">Cost to Company</p>
            <p className="text-xl font-bold font-mono">${summary.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WaveSummary;
