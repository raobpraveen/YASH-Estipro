/**
 * Pure calculation functions for the Project Estimator.
 * These are extracted from ProjectEstimator.js for modularity.
 */

export const getLogisticsConfig = (wave) => {
  const raw = (wave.logistics_config && Object.keys(wave.logistics_config).length > 0)
    ? wave.logistics_config
    : wave.logistics_defaults || {};
  return {
    per_diem_daily: raw.per_diem_daily ?? 50,
    per_diem_days: raw.per_diem_days ?? 30,
    accommodation_daily: raw.accommodation_daily ?? 80,
    accommodation_days: raw.accommodation_days ?? 30,
    local_conveyance_daily: raw.local_conveyance_daily ?? 15,
    local_conveyance_days: raw.local_conveyance_days ?? 21,
    flight_cost_per_trip: raw.flight_cost_per_trip ?? 450,
    visa_medical_per_trip: raw.visa_medical_per_trip ?? raw.visa_insurance_per_trip ?? 400,
    num_trips: raw.num_trips ?? 6,
    contingency_percentage: raw.contingency_percentage ?? 5,
    contingency_absolute: raw.contingency_absolute ?? 0,
  };
};

export const calculateResourceBaseCost = (allocation) => {
  const totalManMonths = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
  const baseSalaryCost = allocation.avg_monthly_salary * totalManMonths;
  return { totalManMonths, baseSalaryCost };
};

export const calculateResourceSellingPrice = (allocation, profitMarginPercentage) => {
  const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(allocation);
  const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
  const totalCost = baseSalaryCost + overheadCost;
  const sellingPrice = totalCost / (1 - profitMarginPercentage / 100);
  return { totalManMonths, baseSalaryCost, overheadCost, totalCost, sellingPrice };
};

export const calculateWaveLogistics = (wave) => {
  const rawConfig = (wave.logistics_config && Object.keys(wave.logistics_config).length > 0)
    ? wave.logistics_config
    : wave.logistics_defaults || {};
  const config = {
    per_diem_daily: rawConfig.per_diem_daily ?? 50,
    per_diem_days: rawConfig.per_diem_days ?? 30,
    accommodation_daily: rawConfig.accommodation_daily ?? 80,
    accommodation_days: rawConfig.accommodation_days ?? 30,
    local_conveyance_daily: rawConfig.local_conveyance_daily ?? 15,
    local_conveyance_days: rawConfig.local_conveyance_days ?? 21,
    flight_cost_per_trip: rawConfig.flight_cost_per_trip ?? 450,
    visa_medical_per_trip: rawConfig.visa_medical_per_trip ?? rawConfig.visa_insurance_per_trip ?? 400,
    num_trips: rawConfig.num_trips ?? 6,
    contingency_percentage: rawConfig.contingency_percentage ?? 5,
    contingency_absolute: rawConfig.contingency_absolute ?? 0,
  };

  let totalTravelingMM = 0;
  let travelingResourceCount = 0;
  let totalOnsiteMM = 0;
  let onsiteResourceCount = 0;

  wave.grid_allocations.forEach(allocation => {
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

  const perDiemCost = totalTravelingMM * config.per_diem_daily * config.per_diem_days;
  const accommodationCost = totalTravelingMM * config.accommodation_daily * config.accommodation_days;
  const conveyanceCost = totalTravelingMM * config.local_conveyance_daily * config.local_conveyance_days;
  const flightCost = travelingResourceCount * config.flight_cost_per_trip * config.num_trips;
  const visaMedicalCost = travelingResourceCount * config.visa_medical_per_trip * config.num_trips;

  const subtotal = perDiemCost + accommodationCost + conveyanceCost + flightCost + visaMedicalCost;
  const contingencyCost = subtotal * (config.contingency_percentage / 100);
  const contingencyAbsolute = config.contingency_absolute || 0;
  const totalLogistics = subtotal + contingencyCost + contingencyAbsolute;

  return {
    totalOnsiteMM, onsiteResourceCount,
    totalTravelingMM, travelingResourceCount,
    perDiemCost, accommodationCost, conveyanceCost,
    flightCost, visaMedicalCost,
    contingencyCost, contingencyAbsolute,
    totalLogistics, config,
  };
};

export const calculateWaveSummary = (wave, profitMarginPercentage, negoBufferPercentage) => {
  let totalMM = 0, onsiteMM = 0, offshoreMM = 0;
  let onsiteSellingPrice = 0, offshoreSellingPrice = 0;
  let onsiteSalaryCost = 0, offshoreSalaryCost = 0;
  let totalRowsSellingPrice = 0, totalBaseSalaryCost = 0, totalOverheadCost = 0;
  let onsiteOverheadCost = 0, offshoreOverheadCost = 0;

  wave.grid_allocations.forEach(allocation => {
    const totalManMonths = Object.values(allocation.phase_allocations || {}).reduce((sum, val) => sum + val, 0);
    const baseSalaryCost = allocation.avg_monthly_salary * totalManMonths;
    const overheadCost = baseSalaryCost * (allocation.overhead_percentage / 100);
    const totalCost = baseSalaryCost + overheadCost;
    const rowSellingPrice = totalCost / (1 - profitMarginPercentage / 100);
    const effectiveSellingPrice = allocation.override_hourly_rate > 0
      ? allocation.override_hourly_rate * 176 * totalManMonths
      : rowSellingPrice;

    totalMM += totalManMonths;
    totalBaseSalaryCost += baseSalaryCost;
    totalOverheadCost += overheadCost;
    totalRowsSellingPrice += effectiveSellingPrice;

    if (allocation.is_onsite) {
      onsiteMM += totalManMonths;
      onsiteSellingPrice += effectiveSellingPrice;
      onsiteSalaryCost += baseSalaryCost;
      onsiteOverheadCost += overheadCost;
    } else {
      offshoreMM += totalManMonths;
      offshoreSellingPrice += effectiveSellingPrice;
      offshoreSalaryCost += baseSalaryCost;
      offshoreOverheadCost += overheadCost;
    }
  });

  const logistics = calculateWaveLogistics(wave);
  const waveSellingPrice = totalRowsSellingPrice + logistics.totalLogistics;

  // AMS Shared Support: billing (revenue) and cost (CTC) aggregates
  const engagementType = wave.engagement_type || "Implementation";
  const isAms = engagementType === "AMS_Shared" || engagementType === "AMS_Mix";
  const contractMonths = parseInt(wave.ams_contract_months) || 12;
  const amsSharedMonthly = isAms
    ? (wave.ams_shared_buckets || []).reduce(
        (sum, b) => sum + (parseFloat(b.hours_per_month) || 0) * (parseFloat(b.hourly_rate) || 0),
        0
      )
    : 0;
  const amsSharedAnnual = amsSharedMonthly * contractMonths;
  // AMS internal cost (hours × cost_rate × contract_months) — flows into CTC
  const amsTotalCost = isAms
    ? (wave.ams_shared_buckets || []).reduce(
        (sum, b) => sum + (parseFloat(b.hours_per_month) || 0) * (parseFloat(b.cost_rate) || 0),
        0
      ) * contractMonths
    : 0;

  const totalCost = totalBaseSalaryCost + totalOverheadCost + logistics.totalLogistics + amsTotalCost;
  // Cost to Company must include logistics (travel/per-diem/accommodation are real costs).
  const costToCompany = totalBaseSalaryCost + totalOverheadCost + logistics.totalLogistics + amsTotalCost;
  // Effective Margin formula (per business definition):
  //   Total Net Cost   = Total CTC − Logistics  (= base + overhead + AMS internal)
  //   Resources Price  = totalRowsSellingPrice  (T&M row SP incl. Ovr $/Hr overrides, ex. logistics)
  //   Effective Margin = 100% − (Net Cost / Resources Price) × 100
  // This equals `profitMarginPercentage` exactly unless one or more rows use Ovr $/Hr to override the
  // formula-derived selling price. Logistics is a cost-pass-through so it does not shift the margin.
  const netCost = costToCompany - logistics.totalLogistics;
  const resourcesPrice = totalRowsSellingPrice;
  const negoBufferPct = negoBufferPercentage || 0;
  const negoBufferAmount = waveSellingPrice * (negoBufferPct / 100);
  const finalPrice = waveSellingPrice + negoBufferAmount;
  const grandTotalFinalPrice = finalPrice + amsSharedAnnual;

  return {
    totalMM, onsiteMM, offshoreMM,
    onsiteSalaryCost, offshoreSalaryCost,
    onsiteSellingPrice, offshoreSellingPrice,
    totalRowsSellingPrice,
    totalLogisticsCost: logistics.totalLogistics,
    totalCost,
    totalCostToCompany: costToCompany,
    effectiveProfitMargin: resourcesPrice > 0
      ? ((resourcesPrice - netCost) / resourcesPrice * 100)
      : profitMarginPercentage,
    onsiteOverheadCost, offshoreOverheadCost,
    onsiteCTC: onsiteSalaryCost + onsiteOverheadCost,
    offshoreCTC: offshoreSalaryCost + offshoreOverheadCost,
    sellingPrice: waveSellingPrice,
    negoBufferPercentage: negoBufferPct,
    negoBufferAmount, finalPrice,
    // AMS Shared Support billing aggregates
    engagementType,
    amsSharedMonthly,
    amsSharedAnnual,
    amsTotalCost,
    amsContractMonths: contractMonths,
    grandTotalFinalPrice,
    onsiteResourceCount: logistics.onsiteResourceCount,
    offshoreResourceCount: (wave.grid_allocations || []).length - logistics.onsiteResourceCount,
    travelingResourceCount: logistics.travelingResourceCount,
    travelingMM: logistics.totalTravelingMM,
    logistics,
  };
};

export const calculateOverallSummary = (waves, profitMarginPercentage, negoBufferPercentage) => {
  let totalMM = 0, onsiteMM = 0, offshoreMM = 0;
  let onsiteSalaryCost = 0, offshoreSalaryCost = 0;
  let totalLogisticsCost = 0, totalCost = 0, totalRowsSellingPrice = 0;
  let totalSellingPrice = 0, totalNegoBuffer = 0, totalFinalPrice = 0;
  let onsiteSellingPrice = 0, offshoreSellingPrice = 0;
  let totalCostToCompany = 0, onsiteOverheadCost = 0, offshoreOverheadCost = 0;
  let totalOnsiteResourceCount = 0, totalOffshoreResourceCount = 0;
  let totalAmsSharedMonthly = 0, totalAmsSharedAnnual = 0, totalAmsCost = 0;

  waves.forEach(wave => {
    if (wave.exclude_from_summary) return; // Skip excluded waves
    const summary = calculateWaveSummary(wave, profitMarginPercentage, negoBufferPercentage);
    totalMM += summary.totalMM;
    onsiteMM += summary.onsiteMM;
    offshoreMM += summary.offshoreMM;
    onsiteSalaryCost += summary.onsiteSalaryCost;
    offshoreSalaryCost += summary.offshoreSalaryCost;
    onsiteOverheadCost += summary.onsiteOverheadCost;
    offshoreOverheadCost += summary.offshoreOverheadCost;
    totalLogisticsCost += summary.totalLogisticsCost;
    totalCost += summary.totalCost;
    totalCostToCompany += summary.totalCostToCompany;
    totalRowsSellingPrice += summary.totalRowsSellingPrice;
    totalSellingPrice += summary.sellingPrice;
    totalNegoBuffer += summary.negoBufferAmount;
    totalFinalPrice += summary.finalPrice;
    onsiteSellingPrice += summary.onsiteSellingPrice;
    offshoreSellingPrice += summary.offshoreSellingPrice;
    totalOnsiteResourceCount += summary.onsiteResourceCount;
    totalOffshoreResourceCount += summary.offshoreResourceCount;
    totalAmsSharedMonthly += summary.amsSharedMonthly || 0;
    totalAmsSharedAnnual += summary.amsSharedAnnual || 0;
    totalAmsCost += summary.amsTotalCost || 0;
  });

  const onsiteAvgPerMM = onsiteMM > 0 ? onsiteSellingPrice / onsiteMM : 0;
  const offshoreAvgPerMM = offshoreMM > 0 ? offshoreSellingPrice / offshoreMM : 0;
  const grandTotalFinalPrice = totalFinalPrice + totalAmsSharedAnnual;
  // Overall effective margin — same formula as per-wave: strip logistics from CTC, divide by T&M row SP.
  const overallNetCost = totalCostToCompany - totalLogisticsCost;
  const overallResourcesPrice = totalRowsSellingPrice;

  return {
    totalMM, onsiteMM, offshoreMM,
    onsiteSalaryCost, offshoreSalaryCost,
    totalLogisticsCost, totalCost, totalCostToCompany,
    effectiveProfitMargin: overallResourcesPrice > 0
      ? ((overallResourcesPrice - overallNetCost) / overallResourcesPrice * 100)
      : profitMarginPercentage,
    onsiteOverheadCost, offshoreOverheadCost,
    onsiteCTC: onsiteSalaryCost + onsiteOverheadCost,
    offshoreCTC: offshoreSalaryCost + offshoreOverheadCost,
    totalOnsiteResourceCount, totalOffshoreResourceCount,
    totalRowsSellingPrice,
    sellingPrice: totalSellingPrice,
    negoBuffer: totalNegoBuffer,
    finalPrice: totalFinalPrice,
    // AMS Shared Support roll-ups
    totalAmsSharedMonthly,
    totalAmsSharedAnnual,
    totalAmsCost,
    grandTotalFinalPrice,
    onsiteSellingPrice, offshoreSellingPrice,
    onsiteAvgPerMM, offshoreAvgPerMM,
  };
};
