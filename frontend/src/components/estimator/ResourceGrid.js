import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Trash2, Info } from "lucide-react";

export const ResourceGrid = ({
  wave,
  skills,
  baseLocations,
  proficiencyLevels,
  profitMarginPercentage,
  isReadOnly,
  onGridFieldChange,
  onSalaryChange,
  onToggleOnsite,
  onToggleTravelRequired,
  onPhaseAllocationChange,
  onDeleteAllocation,
  calculateResourceBaseCost,
}) => {
  const TRAVEL_FORMULA_TOOLTIP = `
Logistics calculated for resources with "Travel Required = YES":
• Per-diem: Traveling MM × Daily Rate × Days
• Accommodation: Traveling MM × Daily Rate × Days
• Conveyance: Traveling MM × Daily Rate × Days
• Air Fare: # Traveling Resources × Cost/Trip × Trips
• Visa & Medical: # Traveling Resources × Cost/Trip × Trips
`;

  return (
    <div className="overflow-x-auto relative">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#F8FAFC] border-b-2 border-[#E2E8F0]">
            <th className="text-left p-3 font-semibold text-sm min-w-[120px] sticky left-0 z-20 bg-[#F8FAFC]">Skill</th>
            <th className="text-left p-3 font-semibold text-sm min-w-[100px] sticky left-[120px] z-20 bg-[#F8FAFC]">Level</th>
            <th className="text-left p-3 font-semibold text-sm min-w-[100px] sticky left-[220px] z-20 bg-[#F8FAFC]">Location</th>
            <th className="text-right p-3 font-semibold text-sm sticky left-[320px] z-20 bg-[#F8FAFC]">$/Month</th>
            <th className="text-center p-3 font-semibold text-sm sticky left-[400px] z-20 bg-[#F8FAFC]">Onsite</th>
            <th className="text-center p-3 font-semibold text-sm sticky left-[460px] z-20 bg-[#F8FAFC]" style={{ boxShadow: '4px 0 8px -4px rgba(0,0,0,0.1)' }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 justify-center cursor-help">
                    Travel <Info className="w-3 h-3 text-gray-400" />
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs whitespace-pre-line text-xs">
                  {TRAVEL_FORMULA_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </th>
            {wave.phase_names.map((phase, idx) => (
              <th key={idx} className="text-center p-3 font-semibold text-sm bg-[#E0F2FE] min-w-[80px]">
                {phase}
              </th>
            ))}
            <th className="text-right p-3 font-semibold text-sm">Total MM</th>
            <th className="text-right p-3 font-semibold text-sm">Salary Cost</th>
            <th className="text-right p-3 font-semibold text-sm">Overhead</th>
            <th className="text-right p-3 font-semibold text-sm bg-green-50">Selling Price</th>
            <th className="text-center p-3 font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {wave.grid_allocations.map((allocation) => {
            const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(allocation);
            const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
            const resourceSellingPrice = (baseSalaryCost + overheadCost) / (1 - profitMarginPercentage / 100);
            
            return (
              <tr key={allocation.id} className="border-b hover:bg-gray-50">
                <td className="p-3 sticky left-0 z-10 bg-white">
                  <Select
                    value={allocation.skill_id || ""}
                    onValueChange={(value) => onGridFieldChange(wave.id, allocation.id, "skill_id", value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-full" data-testid={`skill-select-${allocation.id}`}>
                      <SelectValue placeholder="Select skill">{allocation.skill_name || "Select"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {skills.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 sticky left-[120px] z-10 bg-white">
                  <Select
                    value={allocation.proficiency_level || ""}
                    onValueChange={(value) => onGridFieldChange(wave.id, allocation.id, "proficiency_level", value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-full" data-testid={`level-select-${allocation.id}`}>
                      <SelectValue placeholder="Level">{allocation.proficiency_level || "Select"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {proficiencyLevels.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 sticky left-[220px] z-10 bg-white">
                  <Select
                    value={allocation.base_location_id || ""}
                    onValueChange={(value) => onGridFieldChange(wave.id, allocation.id, "base_location_id", value)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger className="w-full" data-testid={`location-select-${allocation.id}`}>
                      <SelectValue placeholder="Location">{allocation.base_location_name || "Select"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {baseLocations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-3 text-right sticky left-[320px] z-10 bg-white">
                  <Input
                    type="number"
                    className="w-24 text-right font-mono text-sm"
                    value={allocation.avg_monthly_salary}
                    onChange={(e) => onSalaryChange(wave.id, allocation.id, e.target.value)}
                    data-testid={`salary-${allocation.id}`}
                    disabled={isReadOnly}
                  />
                </td>
                <td className="p-3 text-center sticky left-[400px] z-10 bg-white">
                  <button
                    onClick={() => !isReadOnly && onToggleOnsite(wave.id, allocation.id)}
                    disabled={isReadOnly}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      allocation.is_onsite 
                        ? "bg-amber-500 text-white" 
                        : "bg-gray-200 text-gray-600"
                    } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                    data-testid={`onsite-toggle-${allocation.id}`}
                  >
                    {allocation.is_onsite ? "ON" : "OFF"}
                  </button>
                </td>
                <td className="p-3 text-center sticky left-[460px] z-10 bg-white" style={{ boxShadow: '4px 0 8px -4px rgba(0,0,0,0.1)' }}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !isReadOnly && onToggleTravelRequired(wave.id, allocation.id)}
                        disabled={isReadOnly}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          allocation.travel_required 
                            ? "bg-purple-500 text-white" 
                            : "bg-gray-200 text-gray-600"
                        } ${isReadOnly ? "opacity-50 cursor-not-allowed" : ""}`}
                        data-testid={`travel-toggle-${allocation.id}`}
                      >
                        {allocation.travel_required ? "YES" : "NO"}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle to include in logistics calculation</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
                {wave.phase_names.map((_, phaseIndex) => (
                  <td key={phaseIndex} className="p-3 bg-[#E0F2FE]/30">
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      className="w-20 text-center font-mono text-sm"
                      value={allocation.phase_allocations[phaseIndex] || ""}
                      onChange={(e) => onPhaseAllocationChange(wave.id, allocation.id, phaseIndex, e.target.value)}
                      data-testid={`phase-${phaseIndex}-${allocation.id}`}
                      disabled={isReadOnly}
                    />
                  </td>
                ))}
                <td className="p-3 text-right font-mono tabular-nums font-semibold text-sm">
                  {totalManMonths.toFixed(2)}
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-600">
                  ${baseSalaryCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-sm text-gray-500">
                  ${overheadCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  <span className="text-xs ml-1">({allocation.overhead_percentage}%)</span>
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-sm font-semibold text-[#10B981] bg-green-50/50">
                  ${resourceSellingPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="p-3 text-center">
                  {!isReadOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAllocation(wave.id, allocation.id)}
                      className="text-[#EF4444] hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                      data-testid={`delete-allocation-${allocation.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {wave.grid_allocations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No resources added yet. Click "Add Resource" to start.
        </div>
      )}
    </div>
  );
};

export default ResourceGrid;
