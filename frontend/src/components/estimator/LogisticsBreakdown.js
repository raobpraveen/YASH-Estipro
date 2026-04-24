import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Plane } from "lucide-react";

export const LogisticsBreakdown = ({ logistics, travelingResourceCount, travelingMM }) => {
  if (travelingResourceCount === 0) return null;

  return (
    <Card className="border border-purple-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-[#0F172A] flex items-center gap-2">
          <Plane className="w-4 h-4 text-purple-600" />
          Logistics Cost Breakdown
          <Badge className="bg-purple-100 text-purple-700">
            {travelingResourceCount} traveling resource(s), {travelingMM.toFixed(2)} MM
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">Description</th>
              <th className="pb-2 text-right">Traveling MM/Res</th>
              <th className="pb-2 text-right">Rate (USD)</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2">Per-diems</td>
              <td className="py-2 text-right font-mono">{travelingMM.toFixed(2)}</td>
              <td className="py-2 text-right font-mono">${logistics.config.per_diem_daily}</td>
              <td className="py-2 text-right font-mono">{logistics.config.per_diem_days}</td>
              <td className="py-2 text-right font-mono font-semibold">${logistics.perDiemCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Accommodation</td>
              <td className="py-2 text-right font-mono">{travelingMM.toFixed(2)}</td>
              <td className="py-2 text-right font-mono">${logistics.config.accommodation_daily}</td>
              <td className="py-2 text-right font-mono">{logistics.config.accommodation_days}</td>
              <td className="py-2 text-right font-mono font-semibold">${logistics.accommodationCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Local Conveyance</td>
              <td className="py-2 text-right font-mono">{travelingMM.toFixed(2)}</td>
              <td className="py-2 text-right font-mono">${logistics.config.local_conveyance_daily}</td>
              <td className="py-2 text-right font-mono">{logistics.config.local_conveyance_days}</td>
              <td className="py-2 text-right font-mono font-semibold">${logistics.conveyanceCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Travel - Air Fare</td>
              <td className="py-2 text-right font-mono">{travelingResourceCount}</td>
              <td className="py-2 text-right font-mono">${logistics.config.flight_cost_per_trip}</td>
              <td className="py-2 text-right font-mono">{logistics.config.num_trips}</td>
              <td className="py-2 text-right font-mono font-semibold">${logistics.flightCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Visa & Medical</td>
              <td className="py-2 text-right font-mono">{travelingResourceCount}</td>
              <td className="py-2 text-right font-mono">${logistics.config.visa_medical_per_trip}</td>
              <td className="py-2 text-right font-mono">{logistics.config.num_trips}</td>
              <td className="py-2 text-right font-mono font-semibold">${logistics.visaMedicalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
            <tr className="border-b bg-gray-50">
              <td className="py-2 font-semibold" colSpan={3}>Other Contingency</td>
              <td className="py-2 text-right font-mono">{logistics.config.contingency_percentage}%</td>
              <td className="py-2 text-right font-mono font-semibold">${logistics.contingencyCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
            <tr className="bg-purple-50">
              <td className="py-3 font-bold text-purple-700" colSpan={4}>Total Logistics Cost</td>
              <td className="py-3 text-right font-mono font-bold text-purple-700 text-lg">${logistics.totalLogistics.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default LogisticsBreakdown;
