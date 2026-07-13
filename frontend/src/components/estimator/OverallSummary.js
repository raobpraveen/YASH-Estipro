import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
            <p className="text-2xl font-extrabold font-mono text-[#0F172A]" data-testid="total-mm">{overall.totalMM.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Onsite MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#F59E0B]" data-testid="onsite-mm">{overall.onsiteMM.toFixed(2)}</p>
            {overall.onsiteMM > 0 && (
              <p className="text-xs text-gray-500 mt-1">Avg: ${(overall.onsiteSellingPrice / overall.onsiteMM).toFixed(0).toLocaleString()}/MM</p>
            )}
          </CardContent>
        </Card>
        <Card className="border border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">Offshore MM</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-[#0EA5E9]" data-testid="offshore-mm">{overall.offshoreMM.toFixed(2)}</p>
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
            <p className="text-xs text-gray-500 mt-1">
              all resources{(overall.totalAmsCost || 0) > 0 ? ` + AMS cost ($${overall.totalAmsCost.toLocaleString(undefined, { maximumFractionDigits: 0 })})` : ""}
            </p>
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
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-700">Final Price (Implementation)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold font-mono text-emerald-700" data-testid="final-price">
              ${overall.finalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-600 mt-1">selling price + nego buffer</p>
          </CardContent>
        </Card>
      </div>

      {/* AMS Shared Support roll-up (only if any AMS Shared / Mix wave has billing) */}
      {(overall.totalAmsSharedAnnual || 0) > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="ams-shared-summary-row">
          <Card className="border border-[#8B5CF6] shadow-sm bg-purple-50/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">AMS Shared Support — Monthly Billing</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold font-mono text-[#8B5CF6]" data-testid="ams-shared-monthly">
                ${overall.totalAmsSharedMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">sum across AMS waves</p>
            </CardContent>
          </Card>
          <Card className="border border-[#8B5CF6] shadow-sm bg-purple-50/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">AMS Shared Support — Annual Billing</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold font-mono text-[#8B5CF6]" data-testid="ams-shared-annual">
                ${overall.totalAmsSharedAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">monthly × contract length per wave</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#0F172A] shadow-lg bg-gradient-to-br from-emerald-50 to-purple-50">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-[#0F172A]">Grand Total (Impl + AMS Y1)</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold font-mono text-[#0F172A]" data-testid="grand-total-final">
                ${overall.grandTotalFinalPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-600 mt-1">Final Price + Annual AMS Billing</p>
            </CardContent>
          </Card>
        </div>
      )}

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
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`font-mono font-bold text-xl inline-flex items-center gap-1 cursor-help ${overall.effectiveProfitMargin >= profitMarginPercentage ? 'text-green-600' : 'text-red-600'}`}
                    data-testid="effective-margin-value"
                  >
                    {overall.effectiveProfitMargin.toFixed(1)}%
                    <Info className="w-3.5 h-3.5 opacity-70" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="max-w-lg p-3 bg-white text-slate-800 border border-slate-200 shadow-lg">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-700 mb-2">
                      Margin Breakdown — items shifting the blended margin away from {profitMarginPercentage.toFixed(1)}%:
                    </p>
                    {(!overall.marginDeviations || overall.marginDeviations.length === 0) ? (
                      <p className="text-slate-500 italic">No T&amp;M Ovr $/Hr overrides and no AMS mispricing detected. Margin drift may come from data-only edits (e.g. logistics config, negotiated buffer).</p>
                    ) : (
                      <div className="space-y-2">
                        {overall.marginDeviations.map((d, i) => (
                          <div key={i} className="border-l-2 pl-2" style={{ borderColor: d.deviation >= 0 ? '#10B981' : '#EF4444' }}>
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium">
                                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mr-1 ${d.type === 'ams' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {d.type === 'ams' ? 'AMS' : 'T&M'}
                                </span>
                                {d.label}
                              </span>
                              <span className={`font-mono font-semibold ${d.deviation >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {d.deviation >= 0 ? '+' : ''}${Math.round(d.deviation).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Wave: {d.waveName} · Expected ${Math.round(d.expected).toLocaleString()} → Actual ${Math.round(d.actual).toLocaleString()}
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-1.5 mt-2 text-[10px] text-slate-500">
                          Positive amounts push margin higher, negative amounts drag it lower.
                        </div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </CardContent>
    )}
  </Card>
);
