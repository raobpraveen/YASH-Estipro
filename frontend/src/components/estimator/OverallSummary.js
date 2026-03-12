import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight } from "lucide-react";

export const OverallSummary = ({ overall, profitMarginPercentage, collapsedSections, toggleSection }) => (
  <Card className="border border-[#E2E8F0] shadow-sm">
    <CardHeader className="flex flex-row items-center gap-2 cursor-pointer select-none py-3" onClick={() => toggleSection("summary")}>
      {collapsedSections.summary ? <ChevronRight className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      <CardTitle className="text-xl font-bold text-[#0F172A]">Overall Summary</CardTitle>
    </CardHeader>
    {!collapsedSections.summary && (
    <CardContent className="space-y-4 pt-0">
      {/* Top Row: MM, Resources, Logistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Man-Months</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0F172A]" data-testid="total-mm">{overall.totalMM.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Onsite MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-mm">{overall.onsiteMM.toFixed(1)}</p>
            {overall.onsiteMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">Avg: ${(overall.onsiteSellingPrice / overall.onsiteMM).toFixed(0).toLocaleString()}/MM</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Offshore MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-mm">{overall.offshoreMM.toFixed(1)}</p>
            {overall.offshoreMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">Avg: ${(overall.offshoreSellingPrice / overall.offshoreMM).toFixed(0).toLocaleString()}/MM</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-slate-400 shadow-sm bg-slate-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Resources Price</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-slate-600" data-testid="total-resources-price">
              ${overall.totalRowsSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">sum of all rows</p>
          </CardContent>
        </Card>
        <Card className="border border-[#8B5CF6] shadow-sm bg-purple-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Logistics</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#8B5CF6]" data-testid="total-logistics">
              ${overall.totalLogisticsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Onsite/Offshore Price Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-[#F59E0B] shadow-sm bg-amber-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Onsite Avg. $/MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-avg-price">
              ${overall.onsiteMM > 0 ? (overall.onsiteSellingPrice / overall.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#F59E0B] shadow-sm bg-amber-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Onsite Selling Price</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-selling-price">
              ${overall.onsiteSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">sum of ON rows</p>
          </CardContent>
        </Card>
        <Card className="border border-[#0EA5E9] shadow-sm bg-blue-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Offshore Avg. $/MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-avg-price">
              ${overall.offshoreMM > 0 ? (overall.offshoreSellingPrice / overall.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-[#0EA5E9] shadow-sm bg-blue-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Offshore Selling Price</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-selling-price">
              ${overall.offshoreSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">sum of OFF rows</p>
          </CardContent>
        </Card>
      </div>

      {/* CTC Analytics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="ctc-analytics-section">
        <Card className="border border-orange-400 shadow-sm bg-orange-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Onsite CTC</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-orange-600" data-testid="onsite-ctc">
              ${overall.onsiteCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">salary + overhead</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-400 shadow-sm bg-orange-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Onsite Avg CTC/MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-orange-600" data-testid="onsite-avg-ctc">
              ${overall.onsiteMM > 0 ? (overall.onsiteCTC / overall.onsiteMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-teal-400 shadow-sm bg-teal-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Offshore CTC</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-teal-600" data-testid="offshore-ctc">
              ${overall.offshoreCTC.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">salary + overhead</p>
          </CardContent>
        </Card>
        <Card className="border border-teal-400 shadow-sm bg-teal-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Offshore Avg CTC/MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-teal-600" data-testid="offshore-avg-ctc">
              ${overall.offshoreMM > 0 ? (overall.offshoreCTC / overall.offshoreMM).toLocaleString(undefined, { maximumFractionDigits: 0 }) : 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-gray-400 shadow-sm bg-gray-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total CTC</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-gray-700" data-testid="total-ctc">
              ${overall.totalCostToCompany.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">all resources</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Selling Price & Final Price */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-[#10B981] shadow-sm bg-green-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Total Selling Price</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#10B981]" data-testid="selling-price">
              ${overall.sellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-gray-500 mt-1">resources + logistics</p>
          </CardContent>
        </Card>
        <Card className="border border-blue-500 shadow-sm bg-blue-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Nego Buffer</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-blue-600" data-testid="total-nego-buffer">
              ${overall.negoBuffer.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-emerald-600 shadow-md bg-emerald-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-700">Final Price</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-emerald-700" data-testid="final-price">
              ${overall.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-600 mt-1">selling price + nego buffer</p>
          </CardContent>
        </Card>
      </div>

      {/* Effective Profit Margin */}
      {Math.abs(overall.effectiveProfitMargin - profitMarginPercentage) > 0.01 && (
        <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-lg px-5 py-3" data-testid="effective-margin-overall">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-indigo-700">Set Margin:</span>
            <span className="font-mono font-bold text-lg text-indigo-600">{profitMarginPercentage.toFixed(1)}%</span>
          </div>
          <span className="text-indigo-300 text-lg">&rarr;</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-indigo-700">Effective Margin (with overrides):</span>
            <span className={`font-mono font-bold text-xl ${overall.effectiveProfitMargin >= profitMarginPercentage ? 'text-green-600' : 'text-red-600'}`} data-testid="effective-margin-value">
              {overall.effectiveProfitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </CardContent>
    )}
  </Card>
);
