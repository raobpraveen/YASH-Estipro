/**
 * Shared financial calculation utilities for ProjectEstimator and ProjectSummary.
 * All cost formulas are centralized here to ensure consistency.
 */

const LOGISTICS_DEFAULTS = {
  per_diem_daily: 50,
  per_diem_days: 30,
  accommodation_daily: 80,
  accommodation_days: 30,
  local_conveyance_daily: 15,
  local_conveyance_days: 21,
  flight_cost_per_trip: 450,
  visa_medical_per_trip: 400,
  num_trips: 6,
  contingency_percentage: 5,
};

/**
 * Calculate resource base cost (salary only)
 */
export const calculateResourceBaseCost = (allocation) => {
  const totalManMonths = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
  const baseSalaryCost = (allocation.avg_monthly_salary || 0) * totalManMonths;
  return { totalManMonths, baseSalaryCost };
};

/**
 * Calculate individual resource selling price
 * Selling Price per row = (Salary Cost + Overhead) / (1 - profit margin)
 */
export const calculateResourceSellingPrice = (allocation, profitMarginPercentage) => {
  const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(allocation);
  const overheadCost = baseSalaryCost * ((allocation.overhead_percentage || 0) / 100);
  const totalCost = baseSalaryCost + overheadCost;
  const sellingPrice = profitMarginPercentage < 100 ? totalCost / (1 - profitMarginPercentage / 100) : totalCost;
  return { totalManMonths, baseSalaryCost, overheadCost, totalCost, sellingPrice };
};

/**
 * Calculate wave-level logistics based on travel_required flag
 * Per-diem/Accommodation/Conveyance: Total Traveling MM x Rate x Days
 * Flights/Visa: Num Traveling Resources x Rate x Trips
 */
export const calculateWaveLogistics = (wave) => {
  const config = wave.logistics_config || LOGISTICS_DEFAULTS;

  let totalTravelingMM = 0;
  let travelingResourceCount = 0;
  let totalOnsiteMM = 0;
  let onsiteResourceCount = 0;

  (wave.grid_allocations || []).forEach(allocation => {
    const mm = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
    if (allocation.is_onsite) {
      totalOnsiteMM += mm;
      onsiteResourceCount++;
    }
    if (allocation.travel_required) {
      totalTravelingMM += mm;
      travelingResourceCount++;
    }
  });

  const perDiemCost = totalTravelingMM * (config.per_diem_daily || 50) * (config.per_diem_days || 30);
  const accommodationCost = totalTravelingMM * (config.accommodation_daily || 80) * (config.accommodation_days || 30);
  const conveyanceCost = totalTravelingMM * (config.local_conveyance_daily || 15) * (config.local_conveyance_days || 21);
  const flightCost = travelingResourceCount * (config.flight_cost_per_trip || 450) * (config.num_trips || 6);
  const visaMedicalCost = travelingResourceCount * (config.visa_medical_per_trip || 400) * (config.num_trips || 6);

  const subtotal = perDiemCost + accommodationCost + conveyanceCost + flightCost + visaMedicalCost;
  const contingencyCost = subtotal * ((config.contingency_percentage || 5) / 100);
  const totalLogistics = subtotal + contingencyCost;

  return {
    totalOnsiteMM, onsiteResourceCount,
    totalTravelingMM, travelingResourceCount,
    perDiemCost, accommodationCost, conveyanceCost,
    flightCost, visaMedicalCost, contingencyCost, totalLogistics,
    config,
  };
};

/**
 * Calculate wave summary
 * Row Selling Price = (Salary + Overhead) / (1 - profit margin%)
 * Resources Price = Sum of all rows selling price
 * Wave Selling Price = Resources Price + Logistics
 */
export const calculateWaveSummary = (wave, profitMarginPercentage) => {
  let totalMM = 0, onsiteMM = 0, offshoreMM = 0;
  let onsiteSellingPrice = 0, offshoreSellingPrice = 0;
  let onsiteSalaryCost = 0, offshoreSalaryCost = 0;
  let totalRowsSellingPrice = 0, totalBaseSalaryCost = 0, totalOverheadCost = 0;

  (wave.grid_allocations || []).forEach(allocation => {
    const { totalManMonths, baseSalaryCost, overheadCost, sellingPrice } = calculateResourceSellingPrice(allocation, profitMarginPercentage);
    totalMM += totalManMonths;
    totalBaseSalaryCost += baseSalaryCost;
    totalOverheadCost += overheadCost;
    totalRowsSellingPrice += sellingPrice;

    if (allocation.is_onsite) {
      onsiteMM += totalManMonths;
      onsiteSellingPrice += sellingPrice;
      onsiteSalaryCost += baseSalaryCost;
    } else {
      offshoreMM += totalManMonths;
      offshoreSellingPrice += sellingPrice;
      offshoreSalaryCost += baseSalaryCost;
    }
  });

  const logistics = calculateWaveLogistics(wave);
  const waveSellingPrice = totalRowsSellingPrice + logistics.totalLogistics;
  // AMS Shared Support cost: hours_per_month × cost_rate × contract_months (added to CTC)
  const isAmsWave = wave.engagement_type === "AMS_Shared" || wave.engagement_type === "AMS_Mix";
  let amsTotalCost = 0;
  if (isAmsWave) {
    const contractMonths = parseInt(wave.ams_contract_months) || 12;
    (wave.ams_shared_buckets || []).forEach(b => {
      amsTotalCost += (parseFloat(b.hours_per_month) || 0) * (parseFloat(b.cost_rate) || 0) * contractMonths;
    });
  }
  const totalCost = totalBaseSalaryCost + totalOverheadCost + logistics.totalLogistics + amsTotalCost;
  const costToCompany = totalBaseSalaryCost + totalOverheadCost + amsTotalCost;
  const negoBufferPercentage = wave.nego_buffer_percentage || 0;
  const negoBufferAmount = waveSellingPrice * (negoBufferPercentage / 100);
  const finalPrice = waveSellingPrice + negoBufferAmount;

  return {
    totalMM, onsiteMM, offshoreMM,
    onsiteSalaryCost, offshoreSalaryCost,
    onsiteSellingPrice, offshoreSellingPrice,
    totalRowsSellingPrice,
    totalLogisticsCost: logistics.totalLogistics,
    totalCost,
    totalCostToCompany: costToCompany,
    amsTotalCost,
    sellingPrice: waveSellingPrice,
    negoBufferPercentage, negoBufferAmount, finalPrice,
    onsiteResourceCount: logistics.onsiteResourceCount,
    travelingResourceCount: logistics.travelingResourceCount,
    travelingMM: logistics.totalTravelingMM,
    logistics,
  };
};

/**
 * Calculate overall summary across all waves
 */
export const calculateOverallSummary = (waves, profitMarginPercentage) => {
  let totalMM = 0, onsiteMM = 0, offshoreMM = 0;
  let onsiteSalaryCost = 0, offshoreSalaryCost = 0;
  let totalLogisticsCost = 0, totalCost = 0, totalRowsSellingPrice = 0;
  let totalSellingPrice = 0, totalNegoBuffer = 0, totalFinalPrice = 0;
  let onsiteSellingPrice = 0, offshoreSellingPrice = 0;
  let totalCostToCompany = 0;
  let totalAmsCost = 0;

  (waves || []).forEach(wave => {
    const summary = calculateWaveSummary(wave, profitMarginPercentage);
    totalMM += summary.totalMM;
    onsiteMM += summary.onsiteMM;
    offshoreMM += summary.offshoreMM;
    onsiteSalaryCost += summary.onsiteSalaryCost;
    offshoreSalaryCost += summary.offshoreSalaryCost;
    totalLogisticsCost += summary.totalLogisticsCost;
    totalCost += summary.totalCost;
    totalCostToCompany += summary.totalCostToCompany;
    totalAmsCost += summary.amsTotalCost || 0;
    totalRowsSellingPrice += summary.totalRowsSellingPrice;
    totalSellingPrice += summary.sellingPrice;
    totalNegoBuffer += summary.negoBufferAmount;
    totalFinalPrice += summary.finalPrice;
    onsiteSellingPrice += summary.onsiteSellingPrice;
    offshoreSellingPrice += summary.offshoreSellingPrice;
  });

  const onsiteAvgPerMM = onsiteMM > 0 ? onsiteSellingPrice / onsiteMM : 0;
  const offshoreAvgPerMM = offshoreMM > 0 ? offshoreSellingPrice / offshoreMM : 0;

  return {
    totalMM, onsiteMM, offshoreMM,
    onsiteSalaryCost, offshoreSalaryCost,
    totalLogisticsCost, totalCost, totalCostToCompany, totalAmsCost,
    totalRowsSellingPrice,
    sellingPrice: totalSellingPrice,
    negoBuffer: totalNegoBuffer,
    finalPrice: totalFinalPrice,
    onsiteSellingPrice, offshoreSellingPrice,
    onsiteAvgPerMM, offshoreAvgPerMM,
  };
};
