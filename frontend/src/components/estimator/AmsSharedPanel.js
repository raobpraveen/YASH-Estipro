import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const updateBuckets = (newBuckets) => {
    setWaves(waves.map(w => w.id === wave.id ? { ...w, ams_shared_buckets: newBuckets } : w));
  };

  const addBucket = () => {
    const newBucket = {
      id: Math.random().toString(36).substr(2, 9),
      name: `Service ${buckets.length + 1}`,
      hours_per_month: 0,
      hourly_rate: 0,
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
    const monthly = hrs * rate;
    acc.hours += hrs;
    acc.monthly += monthly;
    return acc;
  }, { hours: 0, monthly: 0 });
  const totalYearly = totals.monthly * contractMonths;

  return (
    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/30" data-testid={`ams-shared-panel-${wave.id}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#8B5CF6]" />
          <h4 className="font-semibold text-[#8B5CF6]">AMS Shared Support</h4>
          <span className="text-[10px] uppercase tracking-wide bg-[#8B5CF6]/10 text-[#8B5CF6] px-2 py-0.5 rounded-full">No margin / No buffer</span>
        </div>
        {!isReadOnly && (
          <Button size="sm" variant="outline" onClick={addBucket} className="text-[#8B5CF6] border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/10" data-testid={`ams-add-bucket-${wave.id}`}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
          </Button>
        )}
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
              <TableHead className="min-w-[160px]">Service / Bucket</TableHead>
              <TableHead className="w-32 text-right">Hours / Month</TableHead>
              <TableHead className="w-32 text-right">Hourly Rate (USD)</TableHead>
              <TableHead className="w-36 text-right">Billing / Month</TableHead>
              <TableHead className="w-36 text-right">Billing / Year</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buckets.map((b, idx) => {
              const hrs = parseFloat(b.hours_per_month) || 0;
              const rate = parseFloat(b.hourly_rate) || 0;
              const monthly = hrs * rate;
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
                      title="Supports formulas like 20+5, 20*10%"
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-[#8B5CF6] font-semibold">{fmt(monthly)}</TableCell>
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
              <TableCell className="text-right font-mono text-[#8B5CF6]">{fmt(totals.monthly)}</TableCell>
              <TableCell className="text-right font-mono text-[#8B5CF6]" data-testid={`ams-shared-total-yearly-${wave.id}`}>{fmt(totalYearly)}</TableCell>
              <TableCell colSpan={2} className="text-right text-xs text-gray-500">{contractMonths} months contract</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      <p className="text-[11px] text-gray-500 mt-2">
        <strong>Formula:</strong> Hours/Month × Hourly Rate = Billing/Month. Yearly = Monthly × {contractMonths}.{" "}
        No internal cost is computed for shared support — these are the billed prices to the customer.
      </p>
    </div>
  );
};

export default AmsSharedPanel;
