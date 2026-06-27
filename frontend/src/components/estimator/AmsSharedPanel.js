import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Zap } from "lucide-react";
import { evaluateSalaryExpression } from "@/utils/salaryExpression";

/**
 * AMS Shared Support service-bucket editor.
 * Pure billed rates: hours_per_month × hourly_rate. No internal cost; no margin/buffer applied.
 */
export const AmsSharedPanel = ({ wave, waves, setWaves, isReadOnly }) => {
  const buckets = wave.ams_shared_buckets || [];
  const contractMonths = parseInt(wave.ams_contract_months) || 12;
  const billingFrequency = wave.ams_billing_frequency || "Monthly";
  const billingAdvance = !!wave.ams_billing_advance;

  const updateWaveField = (field, value) => {
    setWaves(waves.map(w => w.id === wave.id ? { ...w, [field]: value } : w));
  };

  const updateBuckets = (newBuckets) => {
    setWaves(waves.map(w => w.id === wave.id ? { ...w, ams_shared_buckets: newBuckets } : w));
  };

  const addBucket = () => {
    const newBucket = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Service ${buckets.length + 1}`,
      hours_per_month: 0,
      hourly_rate: 0,
      cost_rate: 0,
      notes: "",
    };
    updateBuckets([...buckets, newBucket]);
  };

  const removeBucket = (id) => updateBuckets(buckets.filter(b => b.id !== id));
  const updateBucket = (id, field, value) => updateBuckets(buckets.map(b => b.id === id ? { ...b, [field]: value } : b));

  const fmt = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const totals = buckets.reduce((acc, b) => {
    const hrs = parseFloat(b.hours_per_month) || 0;
    const rate = parseFloat(b.hourly_rate) || 0;
    const cost = parseFloat(b.cost_rate) || 0;
    acc.hours += hrs;
    acc.monthly += hrs * rate;
    acc.monthlyCost += hrs * cost;
    return acc;
  }, { hours: 0, monthly: 0, monthlyCost: 0 });
  const totalYearly = totals.monthly * contractMonths;
  const totalYearlyCost = totals.monthlyCost * contractMonths;

  return (
    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/30" data-testid={`ams-shared-panel-${wave.id}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#8B5CF6]" />
          <h4 className="font-semibold text-[#8B5CF6]">AMS Shared Support</h4>
        </div>
        {!isReadOnly && (
          <Button size="sm" variant="outline" onClick={addBucket} className="text-[#8B5CF6] border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/10" data-testid={`ams-add-bucket-${wave.id}`}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
          </Button>
        )}
      </div>

      {/* AMS contract & billing controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-3 bg-white border border-purple-100 rounded-md">
        <div>
          <Label className="text-xs text-gray-600">Contract Length (Months)</Label>
          <Input
            type="number"
            min="1"
            max="60"
            value={wave.ams_contract_months ?? 12}
            disabled={isReadOnly}
            onChange={(e) => updateWaveField("ams_contract_months", parseInt(e.target.value) || 12)}
            className="h-8 text-sm"
            data-testid={`ams-contract-months-${wave.id}`}
          />
        </div>
        <div>
          <Label className="text-xs text-gray-600">Billing Frequency</Label>
          <Select
            value={billingFrequency}
            onValueChange={(v) => updateWaveField("ams_billing_frequency", v)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-8 text-sm" data-testid={`ams-billing-frequency-${wave.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Monthly">Monthly</SelectItem>
              <SelectItem value="Quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col">
          <Label className="text-xs text-gray-600">Bill in Advance</Label>
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={billingAdvance}
              disabled={isReadOnly}
              onChange={(e) => updateWaveField("ams_billing_advance", e.target.checked)}
              className="h-4 w-4 accent-[#8B5CF6] cursor-pointer"
              data-testid={`ams-billing-advance-${wave.id}`}
            />
            <span className="text-xs text-gray-700">{billingAdvance ? "Paid immediately (ignores payment terms)" : "Follow payment terms (+N days)"}</span>
          </label>
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-purple-200 rounded text-sm text-gray-500">
          No service buckets yet. Click <strong>Add Service</strong> to create L1/L2/On-call/etc. buckets.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead className="min-w-[150px]">Service / Bucket</TableHead>
              <TableHead className="w-24 text-right">Hours / Month</TableHead>
              <TableHead className="w-24 text-right">Hourly Price</TableHead>
              <TableHead className="w-24 text-right">Cost Rate</TableHead>
              <TableHead className="w-28 text-right">Billing / Month</TableHead>
              <TableHead className="w-28 text-right">Cost / Month</TableHead>
              <TableHead className="w-28 text-right">Billing / Year</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((b, idx) => {
              const hrs = parseFloat(b.hours_per_month) || 0;
              const rate = parseFloat(b.hourly_rate) || 0;
              const cost = parseFloat(b.cost_rate) || 0;
              const monthly = hrs * rate;
              const monthlyCost = hrs * cost;
              return (
                <TableRow key={b.id} data-testid={`ams-bucket-row-${b.id}`}>
                  <TableCell className="text-gray-400 font-mono text-xs">{idx + 1}</TableCell>
                  <TableCell>
                    <Input value={b.name} onChange={(e) => updateBucket(b.id, "name", e.target.value)} disabled={isReadOnly} data-testid={`ams-bucket-name-${b.id}`} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" step="0.5" className="text-right" value={b.hours_per_month} onChange={(e) => updateBucket(b.id, "hours_per_month", parseFloat(e.target.value) || 0)} disabled={isReadOnly} data-testid={`ams-bucket-hours-${b.id}`} />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      className="text-right font-mono"
                      defaultValue={b.hourly_rate}
                      onBlur={(e) => {
                        const evald = evaluateSalaryExpression(e.target.value);
                        if (evald !== null) updateBucket(b.id, "hourly_rate", evald);
                        else e.target.value = b.hourly_rate;
                      }}
                      disabled={isReadOnly}
                      data-testid={`ams-bucket-rate-${b.id}`}
                      title="Billing price to customer. Supports formulas like 20+5, 20*10%"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      className="text-right font-mono"
                      defaultValue={b.cost_rate}
                      onBlur={(e) => {
                        const evald = evaluateSalaryExpression(e.target.value);
                        if (evald !== null) updateBucket(b.id, "cost_rate", evald);
                        else e.target.value = b.cost_rate;
                      }}
                      disabled={isReadOnly}
                      data-testid={`ams-bucket-cost-rate-${b.id}`}
                      title="Internal cost rate (USD/hour). Drives cash-out in Cashflow."
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-[#8B5CF6] font-semibold">{fmt(monthly)}</TableCell>
                  <TableCell className="text-right font-mono text-red-600">{fmt(monthlyCost)}</TableCell>
                  <TableCell className="text-right font-mono text-[#8B5CF6]">{fmt(monthly * contractMonths)}</TableCell>
                  <TableCell>
                    <Input value={b.notes || ""} placeholder="Optional…" onChange={(e) => updateBucket(b.id, "notes", e.target.value)} disabled={isReadOnly} className="text-xs" />
                  </TableCell>
                  <TableCell>
                    {!isReadOnly && (
                      <Button size="icon" variant="ghost" onClick={() => removeBucket(b.id)} className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" data-testid={`ams-bucket-delete-${b.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="bg-purple-100/50 font-semibold">
              <TableCell colSpan={2} className="text-right">Total</TableCell>
              <TableCell className="text-right font-mono">{totals.hours.toLocaleString()}</TableCell>
              <TableCell className="text-right text-xs text-gray-500">—</TableCell>
              <TableCell className="text-right text-xs text-gray-500">—</TableCell>
              <TableCell className="text-right font-mono text-[#8B5CF6]">{fmt(totals.monthly)}</TableCell>
              <TableCell className="text-right font-mono text-red-600">{fmt(totals.monthlyCost)}</TableCell>
              <TableCell className="text-right font-mono text-[#8B5CF6]" data-testid={`ams-shared-total-yearly-${wave.id}`}>{fmt(totalYearly)}</TableCell>
              <TableCell colSpan={2} className="text-right text-xs text-gray-500">{contractMonths} mo contract · Cost/Yr: {fmt(totalYearlyCost)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      <p className="text-[11px] text-gray-500 mt-2">
        <strong>Billing:</strong> Hours/Month × Hourly Price. <strong>Cost:</strong> Hours/Month × Cost Rate (flows to Cashflow cash-out). Yearly = Monthly × {contractMonths}.
      </p>
    </div>
  );
};

export default AmsSharedPanel;
