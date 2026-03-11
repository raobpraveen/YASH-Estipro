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

    const C_SAL = 5, C_ON = 6, C_TR = 7, C_PH1 = 8;
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

    const headers = ["#", "Skill", "Level", "Location", "$/Month", "Onsite", "Travel",
      ...wave.phase_names, "Total MM", "Salary Cost", "Overhead", "OH%", "Total Cost",
      "Selling Price", "SP/MM", "Hourly", "Ovr $/Hr", "Comments", "Group"];
    const hRow = dws.addRow(headers);
    hRow.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = thinBorder; });
    dws.columns = headers.map((h, i) => ({
      width: i === 0 ? 5 : ["Skill", "Location", "Comments"].includes(h) ? 20 : h === "Group" ? 8 : h === "Ovr $/Hr" ? 10 : h.length > 8 ? 15 : 11
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
      r.getCell(2).value = alloc.skill_name;
      r.getCell(3).value = alloc.proficiency_level;
      r.getCell(4).value = alloc.base_location_name;
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
    const finalCell = addSumRow("WAVE FINAL PRICE", `${waveSPCell}+${negoCell}`, { font: totalsFont, fill: greenFill });

    const onsMMCell = addSumRow("Onsite MM", onsMMF, {});
    const offMMCell = addSumRow("Offshore MM", `${colL(C_TMM)}${TR}-${onsMMCell}`, {});
    const costCell = `${colL(C_TC)}${TR}`;

    waveRefs.push({
      name: wave.name, sheet: sRef,
      totalMM: `${sRef}!${colL(C_TMM)}${TR}`,
      onsiteMM: `${sRef}!${onsMMCell}`,
      offshoreMM: `${sRef}!${offMMCell}`,
      totalLogistics: `${sRef}!${lgTotCell}`,
      totalCost: `${sRef}!${costCell}`,
      resourcesSP: `${sRef}!${resSPCell}`,
      sellingPrice: `${sRef}!${waveSPCell}`,
      negoBuffer: `${sRef}!${negoCell}`,
      finalPrice: `${sRef}!${finalCell}`,
    });
  });

  // ========= SUMMARY SHEET =========
  const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: "FF0F172A" } } });
  wb.views = [{ activeTab: wb.worksheets.length - 1 }];
  wb.removeWorksheet(ws.id);
  const summaryWs = wb.addWorksheet("Summary");

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

  const buffer = await wb.xlsx.writeBuffer();
  const fileName = `${projectNumber || projectName || "Project"}_v${projectVersion}_Estimate.xlsx`;
  return { buffer, fileName };
}
