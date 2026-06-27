/**
 * Excel Export utility for the Project Estimator.
 * Builds an ExcelJS workbook from project data.
 */
import ExcelJS from "exceljs";
import { calculateResourceBaseCost, getLogisticsConfig, calculateOverallSummary } from "./estimatorCalcs";

/**
 * Build and return the Excel buffer for export.
 * @param {Object} params - All data needed for export
 * @returns {Promise<{buffer: ArrayBuffer, fileName: string}>}
 */
export async function buildExportWorkbook({
  waves, profitMarginPercentage, negoBufferPercentage,
  projectName, projectDescription, projectNumber, projectVersion, projectStatus,
  versionNotes, customerId, customers, projectLocations, technologyIds, technologies,
  subTechnologyIds, subTechnologies, projectTypeIds, projectTypes,
  salesManagerId, salesManagers, crmId, COUNTRIES,
  milestones = [], paymentTermsDays = 0,
  projectActivities = [],
  skills = [],
  cashflowData = null,
}) {
  const selectedCustomer = customers.find(c => c.id === customerId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "YASH EstiPro";

  const colL = (n) => { let s = ''; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };

  // Styles
  const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const subHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
  const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  const finalFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  const finalFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 14 };
  const thinBorder = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
  const onsiteTravelFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCA5A5" } };
  const onsiteNoTravelFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
  const offshoreFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
  const logisticsFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8FF" } };
  const logisticsHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } };
  const logisticsHeaderFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const totalsFont = { bold: true };
  const moneyFmt = '#,##0.00';

  const waveRefs = [];

  // ========= DETAIL SHEETS (per wave) =========
  const usedNames = new Set(["Summary"]);
  waves.forEach((wave) => {
    let sheetName = wave.name.replace(/[\\/*?\[\]:]/g, "").substring(0, 28) || "Wave";
    let finalName = sheetName;
    let counter = 2;
    while (usedNames.has(finalName)) { finalName = `${sheetName.substring(0, 26)}_${counter++}`; }
    usedNames.add(finalName);

    const dws = wb.addWorksheet(finalName);
    const sRef = `'${finalName.replace(/'/g, "''")}'`;
    const N = wave.phase_names.length;
    const A = wave.grid_allocations.length;

    const C_TECH = 2, C_SAL = 6, C_ON = 7, C_TR = 8, C_PH1 = 9;
    const C_TMM = C_PH1 + N;
    const C_SC = C_TMM + 1, C_OH = C_SC + 1, C_OHP = C_OH + 1;
    const C_TC = C_OHP + 1, C_SP = C_TC + 1, C_SPMM = C_SP + 1;
    const C_HR = C_SPMM + 1, C_OVR = C_HR + 1, C_CMT = C_OVR + 1, C_GRP = C_CMT + 1;

    const titleR = dws.addRow([`${wave.name} — ${wave.duration_months} months${wave.description ? ` — ${wave.description}` : ""}`]);
    titleR.font = { bold: true, size: 13 };

    const pRow = dws.addRow(["", "Profit Margin:", { formula: "Summary!$B$5", result: profitMarginPercentage / 100 }, "", "Nego Buffer:", { formula: "Summary!$B$6", result: negoBufferPercentage / 100 }]);
    pRow.getCell(2).font = { bold: true }; pRow.getCell(3).numFmt = '0.00%';
    pRow.getCell(5).font = { bold: true }; pRow.getCell(6).numFmt = '0.00%';
    const MRG = "C2";
    const NGO = "F2";

    dws.addRow([]);

    const headers = ["#", "Technology", "Skill", "Level", "Location", "$/Month", "Onsite", "Travel",
      ...wave.phase_names, "Total MM", "Salary Cost", "Overhead", "OH%", "Total Cost",
      "Selling Price", "SP/MM", "Hourly", "Ovr $/Hr", "Comments", "Group"];
    const hRow = dws.addRow(headers);
    hRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
    dws.columns = headers.map((h, i) => ({
      width: i === 0 ? 5 : ["Skill", "Location", "Comments", "Technology"].includes(h) ? 20 : h === "Group" ? 8 : h === "Ovr $/Hr" ? 10 : h.length > 8 ? 15 : 11
    }));

    const DR1 = 5;
    const DRN = DR1 + A - 1;

    wave.grid_allocations.forEach((alloc, idx) => {
      const rn = DR1 + idx;
      const { totalManMonths, baseSalaryCost } = calculateResourceBaseCost(alloc);
      const ohCost = baseSalaryCost * (alloc.overhead_percentage / 100);
      const tc = baseSalaryCost + ohCost;
      const sp = tc / (1 - profitMarginPercentage / 100);
      const spmm = totalManMonths > 0 ? sp / totalManMonths : 0;

      const r = dws.addRow([]);
      r.getCell(1).value = idx + 1;
      // Resolve technology name from the allocation or from the skill's tech
      const techName = alloc.technology_name || (() => {
        const skill = skills.find(s => s.id === alloc.skill_id);
        return skill?.technology_name || "";
      })();
      r.getCell(C_TECH).value = techName;
      r.getCell(3).value = alloc.skill_name;
      r.getCell(4).value = alloc.proficiency_level;
      r.getCell(5).value = alloc.base_location_name;
      r.getCell(C_SAL).value = alloc.avg_monthly_salary;
      r.getCell(C_ON).value = alloc.is_onsite ? "ON" : "OFF";
      r.getCell(C_TR).value = alloc.travel_required ? "YES" : "NO";
      wave.phase_names.forEach((_, i) => { r.getCell(C_PH1 + i).value = alloc.phase_allocations[i] || 0; });

      r.getCell(C_OHP).value = alloc.overhead_percentage / 100;
      r.getCell(C_OHP).numFmt = '0%';

      const phR = `${colL(C_PH1)}${rn}:${colL(C_PH1 + N - 1)}${rn}`;
      r.getCell(C_TMM).value  = { formula: `SUM(${phR})`, result: totalManMonths };
      r.getCell(C_SC).value   = { formula: `${colL(C_TMM)}${rn}*${colL(C_SAL)}${rn}`, result: baseSalaryCost };
      r.getCell(C_OH).value   = { formula: `${colL(C_SC)}${rn}*${colL(C_OHP)}${rn}`, result: ohCost };
      r.getCell(C_TC).value   = { formula: `${colL(C_SC)}${rn}+${colL(C_OH)}${rn}`, result: tc };
      const ovrCol = colL(C_OVR);
      const hasOvr = alloc.override_hourly_rate > 0;
      const effectiveSP = hasOvr ? alloc.override_hourly_rate * 176 * totalManMonths : sp;
      const effectiveSPMM = hasOvr ? alloc.override_hourly_rate * 176 : spmm;
      const effectiveHR = hasOvr ? alloc.override_hourly_rate : spmm / 176;
      r.getCell(C_SP).value   = { formula: `IF(AND(ISNUMBER(${ovrCol}${rn}),${ovrCol}${rn}>0),${ovrCol}${rn}*176*${colL(C_TMM)}${rn},${colL(C_TC)}${rn}/(1-${MRG}))`, result: effectiveSP };
      r.getCell(C_SPMM).value = { formula: `IFERROR(${colL(C_SP)}${rn}/${colL(C_TMM)}${rn},0)`, result: effectiveSPMM };
      r.getCell(C_HR).value   = { formula: `IF(AND(ISNUMBER(${ovrCol}${rn}),${ovrCol}${rn}>0),${ovrCol}${rn},${colL(C_SPMM)}${rn}/176)`, result: effectiveHR };
      r.getCell(C_CMT).value  = alloc.comments || "";
      r.getCell(C_GRP).value  = alloc.resource_group_id || "";
      r.getCell(C_OVR).value  = alloc.override_hourly_rate > 0 ? alloc.override_hourly_rate : null;

      [C_SAL, C_SC, C_OH, C_TC, C_SP, C_SPMM, C_HR, C_OVR].forEach(c => { r.getCell(c).numFmt = moneyFmt; });
      r.getCell(C_TMM).numFmt = '0.00';

      r.eachCell(c => { c.border = thinBorder; });
      if (alloc.is_onsite && alloc.travel_required) r.eachCell(c => { c.fill = onsiteTravelFill; });
      else if (alloc.is_onsite) r.eachCell(c => { c.fill = onsiteNoTravelFill; });
      else r.eachCell(c => { c.fill = offshoreFill; });
    });

    // TOTALS ROW
    dws.addRow([]);
    const TR = dws.rowCount + 1;
    const totR = dws.addRow([]);
    totR.getCell(2).value = "TOTALS";
    if (A > 0) {
      wave.phase_names.forEach((_, i) => {
        const c = colL(C_PH1 + i);
        totR.getCell(C_PH1 + i).value = { formula: `SUM(${c}${DR1}:${c}${DRN})`, result: 0 };
      });
      [C_TMM, C_SC, C_OH, C_TC, C_SP].forEach(col => {
        const c = colL(col);
        totR.getCell(col).value = { formula: `SUM(${c}${DR1}:${c}${DRN})`, result: 0 };
        totR.getCell(col).numFmt = moneyFmt;
      });
      totR.getCell(C_TMM).numFmt = '0.00';
    }
    totR.eachCell(c => { c.border = thinBorder; c.fill = subHeaderFill; });
    totR.font = totalsFont;

    // LOGISTICS SECTION
    dws.addRow([]);
    const lgHdrR = dws.addRow([]);
    lgHdrR.getCell(2).value = "LOGISTICS BREAKDOWN";
    lgHdrR.eachCell(c => { c.fill = logisticsHeaderFill; c.font = logisticsHeaderFont; c.border = thinBorder; });

    const lgSubR = dws.addRow([]);
    lgSubR.getCell(2).value = "Item"; lgSubR.getCell(3).value = "Description"; lgSubR.getCell(4).value = "Amount";
    lgSubR.eachCell(c => { c.fill = logisticsFill; c.font = { bold: true }; c.border = thinBorder; });

    const lc = getLogisticsConfig(wave);
    const onCol = colL(C_ON);
    const trCol = colL(C_TR);
    const mmCol = colL(C_TMM);
    const travelMMF = A > 0 ? `SUMPRODUCT((${trCol}${DR1}:${trCol}${DRN}="YES")*(${mmCol}${DR1}:${mmCol}${DRN}))` : "0";
    const travelCntF = A > 0 ? `COUNTIF(${trCol}${DR1}:${trCol}${DRN},"YES")` : "0";
    const onsMMF = A > 0 ? `SUMPRODUCT((${onCol}${DR1}:${onCol}${DRN}="ON")*(${mmCol}${DR1}:${mmCol}${DRN}))` : "0";

    const lgAmtCells = [];
    [
      ["Per-diem", `Travel MM x $${lc.per_diem_daily} x ${lc.per_diem_days}d`, `(${travelMMF})*${lc.per_diem_daily}*${lc.per_diem_days}`],
      ["Accommodation", `Travel MM x $${lc.accommodation_daily} x ${lc.accommodation_days}d`, `(${travelMMF})*${lc.accommodation_daily}*${lc.accommodation_days}`],
      ["Conveyance", `Travel MM x $${lc.local_conveyance_daily} x ${lc.local_conveyance_days}d`, `(${travelMMF})*${lc.local_conveyance_daily}*${lc.local_conveyance_days}`],
      ["Air Fare", `Travel Res x $${lc.flight_cost_per_trip} x ${lc.num_trips} trips`, `(${travelCntF})*${lc.flight_cost_per_trip}*${lc.num_trips}`],
      ["Visa & Medical", `Travel Res x $${lc.visa_medical_per_trip} x ${lc.num_trips} trips`, `(${travelCntF})*${lc.visa_medical_per_trip}*${lc.num_trips}`],
    ].forEach(([item, desc, formula]) => {
      const r = dws.addRow([]);
      r.getCell(2).value = item; r.getCell(3).value = desc;
      r.getCell(4).value = { formula, result: 0 }; r.getCell(4).numFmt = moneyFmt;
      r.eachCell(c => { c.fill = logisticsFill; c.border = thinBorder; });
      lgAmtCells.push(`D${dws.rowCount}`);
    });

    const contR = dws.addRow([]);
    contR.getCell(2).value = "Contingency"; contR.getCell(3).value = `${lc.contingency_percentage}% of subtotal`;
    contR.getCell(4).value = { formula: `(${lgAmtCells.join("+")})*${lc.contingency_percentage}/100`, result: 0 };
    contR.getCell(4).numFmt = moneyFmt;
    contR.eachCell(c => { c.fill = logisticsFill; c.border = thinBorder; });
    lgAmtCells.push(`D${dws.rowCount}`);

    if (lc.contingency_absolute > 0) {
      const contAbsR = dws.addRow([]);
      contAbsR.getCell(2).value = "Contingency (Absolute)"; contAbsR.getCell(3).value = "Fixed contingency amount";
      contAbsR.getCell(4).value = lc.contingency_absolute;
      contAbsR.getCell(4).numFmt = moneyFmt;
      contAbsR.eachCell(c => { c.fill = logisticsFill; c.border = thinBorder; });
      lgAmtCells.push(`D${dws.rowCount}`);
    }

    const lgTotR = dws.addRow([]);
    lgTotR.getCell(2).value = "TOTAL LOGISTICS";
    lgTotR.getCell(4).value = { formula: lgAmtCells.join("+"), result: 0 }; lgTotR.getCell(4).numFmt = moneyFmt;
    lgTotR.eachCell(c => { c.fill = logisticsFill; c.font = totalsFont; c.border = thinBorder; });
    const lgTotCell = `D${dws.rowCount}`;

    // WAVE SUMMARY
    dws.addRow([]);
    const addSumRow = (label, formula, style) => {
      const r = dws.addRow([]);
      r.getCell(2).value = label;
      r.getCell(3).value = { formula, result: 0 }; r.getCell(3).numFmt = moneyFmt;
      if (style) { r.font = style.font || {}; r.eachCell(c => { if (style.fill) c.fill = style.fill; }); }
      return `C${dws.rowCount}`;
    };

    const resSPCell = addSumRow("Resources Selling Price", `${colL(C_SP)}${TR}`, {});
    const waveSPCell = addSumRow("Wave Selling Price (Resources + Logistics)", `${resSPCell}+${lgTotCell}`, { font: totalsFont });
    const negoCell = addSumRow(`Nego Buffer (${negoBufferPercentage}%)`, `${waveSPCell}*${NGO}`, {});
    // Determine engagement type first — for AMS waves, the WAVE FINAL PRICE row is deferred until after the AMS section
    const engagementType = wave.engagement_type || "Implementation";
    const isAmsWave = engagementType === "AMS_Shared" || engagementType === "AMS_Mix";
    const amsBuckets = isAmsWave ? (wave.ams_shared_buckets || []) : [];
    const hasAmsRows = isAmsWave && amsBuckets.length > 0;
    // Implementation sub-total row (always rendered). For non-AMS waves, this IS the Wave Final Price.
    const implFinalLabel = hasAmsRows ? "Implementation Sub-Total (Resources + Logistics + Buffer)" : "WAVE FINAL PRICE";
    const implFinalCell = addSumRow(implFinalLabel, `${waveSPCell}+${negoCell}`, { font: totalsFont, fill: greenFill });
    // For non-AMS waves, the wave final price IS the implementation sub-total cell.
    // For AMS waves, we'll create a new Final Price row AFTER the AMS section below.
    let finalCell = implFinalCell;

    const onsMMCell = addSumRow("Onsite MM", onsMMF, {});
    const offMMCell = addSumRow("Offshore MM", `${colL(C_TMM)}${TR}-${onsMMCell}`, {});
    const costCell = `${colL(C_TC)}${TR}`;

    // ---- Phase Ranges Section ----
    const phaseRanges = wave.phase_ranges || [];
    if (phaseRanges.length > 0) {
      dws.addRow([]);
      const prHdr = dws.addRow(["PHASE RANGES (for Gantt Chart)"]);
      prHdr.font = { bold: true, size: 11 };
      prHdr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
      const prColHdr = dws.addRow(["Phase Name", "Start", "End"]);
      prColHdr.eachCell(c => { c.fill = subHeaderFill; c.font = { bold: true }; c.border = thinBorder; });
      phaseRanges.forEach(pr => {
        const prRow = dws.addRow([pr.name, pr.start_month, pr.end_month]);
        prRow.eachCell(c => { c.border = thinBorder; });
      });
    }

    // Phase dependencies section removed — milestones are now linked to phases directly

    // ---- AMS Shared Support Section ----
    let amsMonthlyCell = null;
    let amsAnnualCell = null;
    if (hasAmsRows) {
      const contractMonths = parseInt(wave.ams_contract_months) || 12;
      const billingFreq = wave.ams_billing_frequency || "Monthly";
      const billingAdv = !!wave.ams_billing_advance;
      dws.addRow([]);
      const amsHdr = dws.addRow([`AMS SHARED SUPPORT (${engagementType.replace("AMS_", "")} — ${contractMonths} months contract — Billing: ${billingFreq}${billingAdv ? " · Advance" : ""})`]);
      amsHdr.font = { bold: true, size: 11, color: { argb: "FF8B5CF6" } };
      amsHdr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
      const amsCol = dws.addRow(["#", "Service / Bucket", "Hours/Month", "Hourly Price", "Cost Rate", "Billing/Month", "Cost/Month", "Billing/Year", "Notes"]);
      amsCol.eachCell(c => { c.fill = subHeaderFill; c.font = { bold: true }; c.border = thinBorder; });
      const amsStartRow = dws.lastRow.number + 1;
      amsBuckets.forEach((b, idx) => {
        const hrs = b.hours_per_month || 0;
        const rate = b.hourly_rate || 0;
        const cost = b.cost_rate || 0;
        const r = dws.addRow([idx + 1, b.name || "", hrs, rate, cost, "", "", "", b.notes || ""]);
        const rn = r.number;
        // Billing/Month = C*D
        r.getCell(6).value = { formula: `C${rn}*D${rn}`, result: hrs * rate };
        r.getCell(6).numFmt = moneyFmt;
        // Cost/Month = C*E
        r.getCell(7).value = { formula: `C${rn}*E${rn}`, result: hrs * cost };
        r.getCell(7).numFmt = moneyFmt;
        // Billing/Year = F*N
        r.getCell(8).value = { formula: `F${rn}*${contractMonths}`, result: hrs * rate * contractMonths };
        r.getCell(8).numFmt = moneyFmt;
        r.getCell(4).numFmt = moneyFmt;
        r.getCell(5).numFmt = moneyFmt;
        r.eachCell(c => { c.border = thinBorder; });
      });
      const amsEndRow = dws.lastRow.number;
      const amsTot = dws.addRow(["", "Total", "", "", "", "", "", "", ""]);
      amsTot.font = totalsFont;
      amsTot.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } }; c.border = thinBorder; });
      amsTot.getCell(6).value = { formula: `SUM(F${amsStartRow}:F${amsEndRow})`, result: amsBuckets.reduce((s, b) => s + (b.hours_per_month || 0) * (b.hourly_rate || 0), 0) };
      amsTot.getCell(6).numFmt = moneyFmt;
      amsTot.getCell(7).value = { formula: `SUM(G${amsStartRow}:G${amsEndRow})`, result: amsBuckets.reduce((s, b) => s + (b.hours_per_month || 0) * (b.cost_rate || 0), 0) };
      amsTot.getCell(7).numFmt = moneyFmt;
      amsTot.getCell(8).value = { formula: `SUM(H${amsStartRow}:H${amsEndRow})`, result: amsBuckets.reduce((s, b) => s + (b.hours_per_month || 0) * (b.hourly_rate || 0) * contractMonths, 0) };
      amsTot.getCell(8).numFmt = moneyFmt;
      amsMonthlyCell = `F${amsTot.number}`;
      amsAnnualCell = `H${amsTot.number}`;

      // Add Wave Final Price (incl. AMS) row AFTER the AMS section
      dws.addRow([]);
      const finalRow = dws.addRow(["WAVE FINAL PRICE (incl. AMS Annual)", "", { formula: `${implFinalCell}+${amsAnnualCell}`, result: 0 }]);
      finalRow.getCell(3).numFmt = moneyFmt;
      finalRow.font = totalsFont;
      finalRow.eachCell(c => { c.fill = greenFill; c.border = thinBorder; });
      finalCell = `C${finalRow.number}`;
    }

    waveRefs.push({
      name: wave.name, sheet: sRef,
      engagementType,
      totalMM: `${sRef}!${colL(C_TMM)}${TR}`,
      onsiteMM: `${sRef}!${onsMMCell}`,
      offshoreMM: `${sRef}!${offMMCell}`,
      totalLogistics: `${sRef}!${lgTotCell}`,
      totalCost: `${sRef}!${costCell}`,
      resourcesSP: `${sRef}!${resSPCell}`,
      sellingPrice: `${sRef}!${waveSPCell}`,
      negoBuffer: `${sRef}!${negoCell}`,
      finalPrice: `${sRef}!${finalCell}`,
      amsMonthly: amsMonthlyCell ? `${sRef}!${amsMonthlyCell}` : null,
      amsAnnual: amsAnnualCell ? `${sRef}!${amsAnnualCell}` : null,
      contractMonths: isAmsWave ? (parseInt(wave.ams_contract_months) || 12) : null,
    });
  });

  // ========= SUMMARY SHEET =========
  const summaryWs = wb.addWorksheet("Summary", { properties: { tabColor: { argb: "FF0F172A" } } });

  summaryWs.columns = [{ width: 30 }, { width: 50 }, { width: 22 }];
  summaryWs.addRow(["YASH Technologies - EstiPro"]).font = { bold: true, size: 16, color: { argb: "FF0F172A" } };
  summaryWs.addRow(["PROJECT ESTIMATE SUMMARY"]).font = { bold: true, size: 12, color: { argb: "FF6B7280" } };
  summaryWs.addRow([]);

  const paramRow = summaryWs.addRow(["PARAMETERS (Edit these to update all wave calculations)"]);
  paramRow.font = { bold: true, italic: true, color: { argb: "FF059669" } };
  const pmRow = summaryWs.addRow(["Profit Margin %", profitMarginPercentage / 100]);
  pmRow.getCell(1).font = { bold: true };
  pmRow.getCell(2).numFmt = '0.00%';
  pmRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  const nbRow = summaryWs.addRow(["Nego Buffer %", negoBufferPercentage / 100]);
  nbRow.getCell(1).font = { bold: true };
  nbRow.getCell(2).numFmt = '0.00%';
  nbRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
  summaryWs.addRow([]);

  const infoFields = [
    ["Project Number", projectNumber || "Not Saved"],
    ["Version", `v${projectVersion}`],
    ["Status", projectStatus || "Draft"],
    ["Customer Name", selectedCustomer?.name || ""],
    ["Project Name", projectName],
    ["Project Location(s)", projectLocations.map(code => COUNTRIES.find(c => c.code === code)?.name || code).join(", ") || "\u2014"],
    ["Technology", technologyIds.map(id => technologies.find(t => t.id === id)?.name).filter(Boolean).join(", ") || ""],
    ["Sub Technology", subTechnologyIds.map(id => subTechnologies.find(t => t.id === id)?.name).filter(Boolean).join(", ") || ""],
    ["Project Type", projectTypeIds.map(id => projectTypes.find(t => t.id === id)?.name).filter(Boolean).join(", ") || ""],
    ["Sales Manager", salesManagers.find(m => m.id === salesManagerId)?.name || "\u2014"],
    ["CRM ID", crmId || "\u2014"],
    ["Description", projectDescription],
  ];
  if (versionNotes) infoFields.push(["Version Notes", versionNotes]);
  infoFields.forEach(([label, val]) => {
    const r = summaryWs.addRow([label, val]);
    r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
  });
  summaryWs.addRow([]);

  waveRefs.forEach((ref) => {
    const wHdr = summaryWs.addRow([`WAVE: ${ref.name}`]);
    wHdr.font = { bold: true, size: 12 }; wHdr.eachCell(c => { c.fill = subHeaderFill; });

    const addRefRow = (label, formulaRef, fmt) => {
      const r = summaryWs.addRow([label]);
      r.getCell(2).value = { formula: formulaRef, result: 0 };
      if (fmt) r.getCell(2).numFmt = fmt;
    };

    addRefRow("Total Man-Months", ref.totalMM, '0.00');
    addRefRow("Onsite Man-Months", ref.onsiteMM, '0.00');
    addRefRow("Offshore Man-Months", ref.offshoreMM, '0.00');
    addRefRow("Total Cost to Company", ref.totalCost, moneyFmt);
    addRefRow("Total Logistics", ref.totalLogistics, moneyFmt);
    addRefRow("Resources Selling Price", ref.resourcesSP, moneyFmt);
    addRefRow("Wave Selling Price", ref.sellingPrice, moneyFmt);
    addRefRow("Nego Buffer", ref.negoBuffer, moneyFmt);
    const fpRow = summaryWs.addRow(["Wave Final Price"]);
    fpRow.getCell(2).value = { formula: ref.finalPrice, result: 0 };
    fpRow.getCell(2).numFmt = moneyFmt;
    fpRow.font = { bold: true }; fpRow.eachCell(c => { c.fill = greenFill; });
    summaryWs.addRow([]);
  });

  const oHdr = summaryWs.addRow(["OVERALL PROJECT"]);
  oHdr.font = { bold: true, size: 13 }; oHdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; });

  const addOverallRow = (label, refs, fmt, style) => {
    const r = summaryWs.addRow([label]);
    r.getCell(2).value = { formula: refs.join("+"), result: 0 };
    if (fmt) r.getCell(2).numFmt = fmt;
    if (style) { if (style.font) r.font = style.font; r.eachCell(c => { if (style.fill) c.fill = style.fill; c.border = thinBorder; }); }
  };

  addOverallRow("Total Man-Months", waveRefs.map(r => r.totalMM), '0.00');
  addOverallRow("Total Onsite MM", waveRefs.map(r => r.onsiteMM), '0.00');
  addOverallRow("Total Offshore MM", waveRefs.map(r => r.offshoreMM), '0.00');
  addOverallRow("Total Logistics", waveRefs.map(r => r.totalLogistics), moneyFmt);
  addOverallRow("Total Cost to Company", waveRefs.map(r => r.totalCost), moneyFmt);
  addOverallRow("Total Resources Price", waveRefs.map(r => r.resourcesSP), moneyFmt);
  addOverallRow("Total Selling Price", waveRefs.map(r => r.sellingPrice), moneyFmt);
  addOverallRow("Total Nego Buffer", waveRefs.map(r => r.negoBuffer), moneyFmt);

  const grandRow = summaryWs.addRow(["GRAND TOTAL (Final Price)"]);
  grandRow.getCell(2).value = { formula: waveRefs.map(r => r.finalPrice).join("+"), result: 0 };
  grandRow.getCell(2).numFmt = moneyFmt;
  grandRow.eachCell(c => { c.fill = finalFill; c.font = finalFont; c.border = thinBorder; });

  // AMS roll-up across waves (only if any AMS wave exists)
  const amsRefs = waveRefs.filter(r => r.amsAnnual);
  if (amsRefs.length > 0) {
    summaryWs.addRow([]);
    const amsHdr = summaryWs.addRow(["AMS SHARED SUPPORT ROLL-UP"]);
    amsHdr.font = { bold: true, size: 12, color: { argb: "FF8B5CF6" } };
    amsHdr.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } }; c.border = thinBorder; });
    const amsMon = summaryWs.addRow(["AMS Monthly Billing (sum)"]);
    amsMon.getCell(2).value = { formula: amsRefs.map(r => r.amsMonthly).join("+"), result: 0 };
    amsMon.getCell(2).numFmt = moneyFmt;
    const amsAnn = summaryWs.addRow(["AMS Annual Billing (sum)"]);
    amsAnn.getCell(2).value = { formula: amsRefs.map(r => r.amsAnnual).join("+"), result: 0 };
    amsAnn.getCell(2).numFmt = moneyFmt;
    amsAnn.font = { bold: true };
    amsAnn.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } }; c.border = thinBorder; });

    const gtRow = summaryWs.addRow(["GRAND TOTAL (Impl + AMS Y1)"]);
    gtRow.getCell(2).value = { formula: `(${waveRefs.map(r => r.finalPrice).join("+")})+(${amsRefs.map(r => r.amsAnnual).join("+")})`, result: 0 };
    gtRow.getCell(2).numFmt = moneyFmt;
    gtRow.eachCell(c => { c.fill = finalFill; c.font = finalFont; c.border = thinBorder; });
  }

  const overallSummary = calculateOverallSummary(waves, profitMarginPercentage, negoBufferPercentage);
  if (Math.abs(overallSummary.effectiveProfitMargin - profitMarginPercentage) > 0.01) {
    summaryWs.addRow([]);
    const mrgRow = summaryWs.addRow([
      "EFFECTIVE PROFIT MARGIN",
      `${overallSummary.effectiveProfitMargin.toFixed(1)}%  (Set: ${profitMarginPercentage.toFixed(1)}%)`
    ]);
    mrgRow.getCell(1).font = { bold: true, color: { argb: "FF4F46E5" } };
    mrgRow.getCell(2).font = { bold: true, color: { argb: overallSummary.effectiveProfitMargin >= profitMarginPercentage ? "FF059669" : "FFDC2626" } };
    mrgRow.getCell(1).border = thinBorder;
    mrgRow.getCell(2).border = thinBorder;
  }

  // COLOR LEGEND
  summaryWs.addRow([]);
  summaryWs.addRow([]);
  const legendHdr = summaryWs.addRow(["COLOR LEGEND"]);
  legendHdr.font = { bold: true, size: 12 };
  legendHdr.getCell(1).fill = headerFill;
  legendHdr.getCell(1).font = headerFont;

  const legendItems = [
    { label: "Landed", fill: onsiteTravelFill, desc: "Offshore resource travel to onsite with logistics applied" },
    { label: "Onsite (No Travel)", fill: onsiteNoTravelFill, desc: "Resource is onsite without travel logistics" },
    { label: "Offshore", fill: offshoreFill, desc: "Offshore resource (no travel logistics)" },
    { label: "Logistics Section", fill: logisticsFill, desc: "Logistics cost breakdown area" },
  ];
  legendItems.forEach(({ label, fill, desc }) => {
    const r = summaryWs.addRow([label, desc]);
    r.getCell(1).fill = fill;
    r.getCell(1).font = { bold: true };
    r.getCell(1).border = thinBorder;
    r.getCell(2).border = thinBorder;
  });

  // ========= GANTT CHART SHEET =========
  const ganttWs = wb.addWorksheet("Gantt Chart", { properties: { tabColor: { argb: "FF10B981" } } });
  ganttWs.addRow(["YASH Technologies - EstiPro | Gantt Chart"]).font = { bold: true, size: 14, color: { argb: "FF0F172A" } };
  ganttWs.addRow([]);

  // Calculate max months across all waves
  let ganttMaxMonth = 0;
  waves.forEach(w => {
    const offset = (w.wave_start_month || 1) - 1;
    (w.phase_ranges || []).forEach(pr => {
      const absEnd = offset + (pr.end_month || 1);
      if (absEnd > ganttMaxMonth) ganttMaxMonth = absEnd;
    });
    // Fallback to wave duration
    const wavEnd = offset + w.duration_months;
    if (wavEnd > ganttMaxMonth) ganttMaxMonth = wavEnd;
  });
  ganttMaxMonth = Math.ceil(ganttMaxMonth);
  if (ganttMaxMonth === 0) ganttMaxMonth = 12;

  // Build month headers
  const ganttHeaders = ["Wave", "Phase"];
  for (let m = 1; m <= ganttMaxMonth; m++) ganttHeaders.push(`M${m}`);
  const gHdr = ganttWs.addRow(ganttHeaders);
  gHdr.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
  ganttWs.getColumn(1).width = 18;
  ganttWs.getColumn(2).width = 16;
  for (let m = 3; m <= ganttMaxMonth + 2; m++) ganttWs.getColumn(m).width = 6;

  const ganttPhaseColors = {
    Prepare: "FFDBEAFE", Explore: "FFE0E7FF", Realize: "FFFEF3C7",
    Deploy: "FFD1FAE5", "Go-live": "FFCCFBF1", Hypercare: "FFFCE7F3",
    Design: "FFEDE9FE", Build: "FFFFF7ED", Test: "FFFEE2E2",
    UAT: "FFFEF9C3", Support: "FFF0FDFA",
  };
  const defaultGanttColor = "FFF1F5F9";

  waves.forEach(w => {
    const ranges = w.phase_ranges || [];
    if (ranges.length === 0) return;
    const offset = (w.wave_start_month || 1) - 1;

    ranges.forEach((pr, i) => {
      const rowData = [i === 0 ? w.name : "", pr.name];
      for (let m = 1; m <= ganttMaxMonth; m++) rowData.push("");
      const gRow = ganttWs.addRow(rowData);
      gRow.eachCell(c => { c.border = thinBorder; });
      if (i === 0) gRow.getCell(1).font = { bold: true };

      // Fill the phase bar cells - use integer boundaries for cell coloring
      const fillArgb = ganttPhaseColors[pr.name] || defaultGanttColor;
      const absStartRaw = offset + (pr.start_month || 1);
      const absEndRaw = offset + (pr.end_month || pr.start_month || 1);
      const cellStart = Math.ceil(absStartRaw);
      const cellEnd = Math.floor(absEndRaw);
      for (let m = cellStart; m <= cellEnd && m <= ganttMaxMonth; m++) {
        const cell = gRow.getCell(m + 2); // +2 because col 1=Wave, col 2=Phase
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillArgb } };
        cell.value = pr.name;
        cell.font = { size: 8, color: { argb: "FF374151" } };
        cell.alignment = { horizontal: "center" };
      }
    });
    // Add separator row
    ganttWs.addRow([]);
  });

  // Legend
  ganttWs.addRow([]);
  const ganttLegend = ganttWs.addRow(["LEGEND"]);
  ganttLegend.font = { bold: true, size: 11 };
  ganttLegend.getCell(1).fill = headerFill;
  ganttLegend.getCell(1).font = headerFont;
  Object.entries(ganttPhaseColors).forEach(([phase, color]) => {
    const lr = ganttWs.addRow([phase]);
    lr.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    lr.getCell(1).border = thinBorder;
  });

  // ========= MILESTONES SHEETS (per wave) =========
  if (milestones && milestones.length > 0) {
    const msThinBorder = thinBorder;
    const msHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    const msHeaderFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const paymentFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
    const markerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    const summaryFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };

    for (const wave of waves) {
      const waveName = wave.name;
      const waveMs = milestones.filter(m => m.wave_name === waveName);
      if (waveMs.length === 0) continue;

      const payMs = waveMs.filter(m => (m.milestone_type || "payment") === "payment");
      const markMs = waveMs.filter(m => (m.milestone_type || "payment") === "marker");

      let msSheetName = `${waveName} Milestones`.replace(/[\\/*?\[\]:]/g, "").substring(0, 31);
      let msCounter = 2;
      while (usedNames.has(msSheetName)) { msSheetName = `${waveName} MS`.substring(0, 28) + `_${msCounter++}`; }
      usedNames.add(msSheetName);

      const msWs = wb.addWorksheet(msSheetName, { properties: { tabColor: { argb: "FFF59E0B" } } });
      msWs.columns = [{ width: 5 }, { width: 28 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 32 }, { width: 14 }];

      // Title row (row 1)
      msWs.addRow([`${waveName} — Milestones`]).font = { bold: true, size: 14 };
      // Metadata row (row 2) — wave name for import reference
      const metaR = msWs.addRow(["", "Wave:", waveName, "", "", "", "", "", "Type:payment"]);
      metaR.getCell(2).font = { bold: true };
      metaR.getCell(9).font = { color: { argb: "FF94A3B8" }, size: 9 };

      // Wave reference info (row 3)
      const waveRef = waveRefs.find(r => r.name === waveName);
      let priceCell = "$C$3"; // reference for formulas
      if (waveRef) {
        const infoR = msWs.addRow(["", "Wave Final Price:", { formula: waveRef.finalPrice, result: 0 }]);
        infoR.getCell(2).font = { bold: true };
        infoR.getCell(3).numFmt = moneyFmt;
        infoR.getCell(3).font = { bold: true, color: { argb: "FF059669" } };
        priceCell = `C${msWs.rowCount}`;
      }
      if (paymentTermsDays > 0) {
        const ptR = msWs.addRow(["", "Payment Terms:", paymentTermsDays]);
        ptR.getCell(2).font = { bold: true };
        ptR.getCell(3).font = { color: { argb: "FF6366F1" } };
      }
      msWs.addRow([]);

      // Payment Milestones section
      if (payMs.length > 0) {
        const secR = msWs.addRow(["", "PAYMENT MILESTONES"]);
        secR.getCell(2).font = { bold: true, size: 12, color: { argb: "FF92400E" } };
        secR.getCell(2).fill = paymentFill;

        const hdr = msWs.addRow(["#", "Milestone Name", "Phase", "Position", "Target Month", "Payment %", "Amount (Formula)", "Description", "Milestone Type"]);
        hdr.eachCell(c => { c.fill = msHeaderFill; c.font = msHeaderFont; c.border = msThinBorder; });
        const hdrRow = msWs.rowCount;

        payMs.forEach((ms, idx) => {
          const rowNum = hdrRow + idx + 1;
          const pctDecimal = (ms.payment_percentage || 0) / 100;
          const r = msWs.addRow([
            idx + 1, ms.milestone_name, ms.phase_name || "", ms.position || "",
            ms.target_month || "", pctDecimal,
            { formula: `${priceCell}*F${rowNum}`, result: (ms.payment_amount || 0) },
            ms.description || "", "payment",
          ]);
          r.getCell(6).numFmt = "0.0%";
          r.getCell(7).numFmt = moneyFmt;
          r.getCell(9).font = { color: { argb: "FF94A3B8" }, size: 9 };
          r.eachCell(c => { c.border = msThinBorder; });
        });

        // Totals row
        const startR = hdrRow + 1;
        const endR = msWs.rowCount;
        const totR = msWs.addRow(["", "TOTAL", "", "", "", { formula: `SUM(F${startR}:F${endR})`, result: 0 }, { formula: `SUM(G${startR}:G${endR})`, result: 0 }, "", ""]);
        totR.getCell(6).numFmt = "0.0%";
        totR.getCell(7).numFmt = moneyFmt;
        totR.eachCell(c => { c.fill = summaryFill; c.font = { bold: true }; c.border = msThinBorder; });
        msWs.addRow([]);
      }

      // Marker Milestones section
      if (markMs.length > 0) {
        const secR = msWs.addRow(["", "MARKER MILESTONES"]);
        secR.getCell(2).font = { bold: true, size: 12, color: { argb: "FF1E40AF" } };
        secR.getCell(2).fill = markerFill;

        const hdr = msWs.addRow(["#", "Milestone Name", "Phase", "Position (%)", "Target Month", "", "", "Description", "Milestone Type"]);
        hdr.eachCell(c => { c.fill = msHeaderFill; c.font = msHeaderFont; c.border = msThinBorder; });

        markMs.forEach((ms, idx) => {
          const posStr = !isNaN(parseFloat(ms.position)) ? ms.position : (ms.position || "50");
          const r = msWs.addRow([
            idx + 1, ms.milestone_name, ms.phase_name || "",
            posStr, ms.target_month || "", "", "", ms.description || "", "marker",
          ]);
          r.getCell(9).font = { color: { argb: "FF94A3B8" }, size: 9 };
          r.eachCell(c => { c.border = msThinBorder; });
        });
        msWs.addRow([]);
      }
    }
  }

  // ========= ACTIVITIES SHEETS (per wave) =========
  if (projectActivities && projectActivities.length > 0) {
    const actHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    const actHeaderFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const actFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } };
    const delFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };
    const waveFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };

    // Group by wave
    const actByWave = {};
    projectActivities.forEach(d => {
      if (!actByWave[d.wave_name]) actByWave[d.wave_name] = [];
      actByWave[d.wave_name].push(d);
    });

    for (const wave of waves) {
      const waveData = actByWave[wave.name];
      if (!waveData || waveData.length === 0) continue;

      let actSheetName = `${wave.name} Activities`.replace(/[\\/*?\[\]:]/g, "").substring(0, 31);
      let actCounter = 2;
      while (usedNames.has(actSheetName)) { actSheetName = `${wave.name} Act`.substring(0, 28) + `_${actCounter++}`; }
      usedNames.add(actSheetName);

      const actWs = wb.addWorksheet(actSheetName, { properties: { tabColor: { argb: "FF6366F1" } } });
      actWs.columns = [{ width: 5 }, { width: 5 }, { width: 30 }, { width: 40 }, { width: 16 }, { width: 12 }];

      actWs.addRow([`${wave.name} — Activities & Deliverables`]).font = { bold: true, size: 14 };
      actWs.addRow([]);

      // Sort phases by wave's phase_ranges order
      const sortedData = waveData.sort((a, b) => {
        const ai = (wave.phase_ranges || []).findIndex(p => p.name === a.phase_name);
        const bi = (wave.phase_ranges || []).findIndex(p => p.name === b.phase_name);
        return ai - bi;
      });

      for (const pd of sortedData) {
        const tplActs = (pd.activities || []).filter(a => !a.is_deliverable);
        const tplDels = (pd.activities || []).filter(a => a.is_deliverable);
        const waveItems = pd.wave_activities || [];
        if (tplActs.length + tplDels.length + waveItems.length === 0) continue;

        // Phase header
        const phR = actWs.addRow(["", pd.phase_name]);
        phR.getCell(2).font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
        phR.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

        if (tplActs.length > 0) {
          const hdr = actWs.addRow(["", "#", "Activity", "Description", "Owner", "Source"]);
          hdr.eachCell(c => { c.fill = actHeaderFill; c.font = actHeaderFont; c.border = thinBorder; });
          tplActs.forEach((a, i) => {
            const r = actWs.addRow(["", i + 1, a.name, a.description || "", a.owner || "", "Template"]);
            r.eachCell(c => { c.fill = actFill; c.border = thinBorder; });
          });
        }
        if (tplDels.length > 0) {
          const hdr = actWs.addRow(["", "#", "Deliverable", "Description", "Owner", "Source"]);
          hdr.eachCell(c => { c.fill = actHeaderFill; c.font = actHeaderFont; c.border = thinBorder; });
          tplDels.forEach((d, i) => {
            const r = actWs.addRow(["", i + 1, d.name, d.description || "", d.owner || "", "Template"]);
            r.eachCell(c => { c.fill = delFill; c.border = thinBorder; });
          });
        }
        if (waveItems.length > 0) {
          const hdr = actWs.addRow(["", "#", "Wave-Specific", "Description", "Owner", "Source"]);
          hdr.eachCell(c => { c.fill = actHeaderFill; c.font = actHeaderFont; c.border = thinBorder; });
          waveItems.forEach((w, i) => {
            const r = actWs.addRow(["", i + 1, w.name, w.description || "", w.owner || "", "Wave"]);
            r.eachCell(c => { c.fill = waveFill; c.border = thinBorder; });
          });
        }
        actWs.addRow([]);
      }
    }
  }

  // ========= CASHFLOW SHEET =========
  if (cashflowData && cashflowData.combined_data && cashflowData.combined_data.length > 0) {
    const cfWs = wb.addWorksheet("Cashflow", { properties: { tabColor: { argb: "FF0EA5E9" } } });
    cfWs.columns = [{ width: 8 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }];
    const cfHeaderFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    const cfHeaderFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const costFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
    const revFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } };

    cfWs.addRow(["Cashflow Statement"]).font = { bold: true, size: 14 };
    const projRow = cfWs.addRow(["", `${projectNumber || ""} ${projectName || ""}`]);
    projRow.getCell(2).font = { italic: true, color: { argb: "FF64748B" } };
    if (cashflowData.payment_terms_days > 0) {
      cfWs.addRow(["", `Payment Terms: ${cashflowData.payment_terms_days} days (+${cashflowData.payment_offset_months} month${cashflowData.payment_offset_months > 1 ? "s" : ""} offset)`]).getCell(2).font = { color: { argb: "FF6366F1" } };
    }
    cfWs.addRow([]);

    // Combined Monthly Data
    const hdr = cfWs.addRow(["Month", "Phase", "Cash-Out", "Cash-In", "Net", "Cumulative"]);
    hdr.eachCell(c => { c.fill = cfHeaderFill; c.font = cfHeaderFont; c.border = thinBorder; });

    cashflowData.combined_data.forEach(m => {
      const r = cfWs.addRow([`M${m.month}`, m.phase || "", m.cost, m.revenue, m.net, m.cumulative]);
      r.getCell(3).numFmt = moneyFmt;
      r.getCell(3).fill = costFill;
      r.getCell(4).numFmt = moneyFmt;
      r.getCell(4).fill = revFill;
      r.getCell(5).numFmt = moneyFmt;
      r.getCell(5).font = { color: { argb: m.net >= 0 ? "FF059669" : "FFDC2626" } };
      r.getCell(6).numFmt = moneyFmt;
      r.getCell(6).font = { bold: true, color: { argb: m.cumulative >= 0 ? "FF059669" : "FFDC2626" } };
      r.eachCell(c => { c.border = thinBorder; });
    });

    cfWs.addRow([]);
    // Summary
    const summary = cashflowData.summary;
    const sumRow = cfWs.addRow(["", "TOTAL", summary.total_cost, summary.total_revenue, summary.net_cashflow, ""]);
    sumRow.eachCell(c => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } }; c.font = { bold: true }; c.border = thinBorder; });
    sumRow.getCell(3).numFmt = moneyFmt;
    sumRow.getCell(4).numFmt = moneyFmt;
    sumRow.getCell(5).numFmt = moneyFmt;

    // Wave breakdown
    if (cashflowData.wave_data && cashflowData.wave_data.length > 1) {
      cfWs.addRow([]);
      cfWs.addRow(["", "WAVE BREAKDOWN"]).getCell(2).font = { bold: true, size: 11 };
      const wHdr = cfWs.addRow(["", "Wave", "Total Cost", "Total Revenue", "Net"]);
      wHdr.eachCell(c => { c.fill = cfHeaderFill; c.font = cfHeaderFont; c.border = thinBorder; });
      cashflowData.wave_data.forEach(wd => {
        const wr = cfWs.addRow(["", wd.wave_name, wd.total_cost, wd.total_revenue, wd.net]);
        wr.getCell(3).numFmt = moneyFmt;
        wr.getCell(4).numFmt = moneyFmt;
        wr.getCell(5).numFmt = moneyFmt;
        wr.getCell(5).font = { color: { argb: wd.net >= 0 ? "FF059669" : "FFDC2626" } };
        wr.eachCell(c => { c.border = thinBorder; });
      });
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `${projectNumber || projectName || "Project"}_v${projectVersion}_Estimate.xlsx`;
  return { buffer, fileName };
}
