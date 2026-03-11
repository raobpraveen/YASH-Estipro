/**
 * Smart Import parser for the Project Estimator.
 * Parses an EstiPro-exported Excel file and returns structured data.
 */
import ExcelJS from "exceljs";

/**
 * Parse an EstiPro Excel file and return structured import data.
 * @param {ArrayBuffer} buffer - The Excel file buffer
 * @param {Array} skills - Master data skills
 * @param {Array} locations - Master data locations
 * @param {Array} rates - Master data proficiency rates
 * @returns {Promise<Object>} Parsed import data
 */
export async function parseSmartImportExcel(buffer, skills, locations, rates) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const getCellVal = (cell) => {
    if (!cell || !cell.value) return "";
    if (typeof cell.value === "object" && cell.value.result !== undefined) return cell.value.result;
    if (typeof cell.value === "object" && cell.value.text) return cell.value.text;
    return cell.value;
  };

  const parsedWaves = [];
  const missingSkills = new Set();
  const missingLocations = new Set();

  // Parse Summary sheet for Profit Margin and Nego Buffer
  let importedPM = null;
  let importedNB = null;
  const summaryWs = wb.getWorksheet("Summary");
  if (summaryWs) {
    const pmCell = summaryWs.getRow(5).getCell(2);
    const nbCell = summaryWs.getRow(6).getCell(2);
    const pmVal = getCellVal(pmCell);
    const nbVal = getCellVal(nbCell);
    if (pmVal !== "" && pmVal !== null && pmVal !== undefined) {
      importedPM = typeof pmVal === "number" ? (pmVal < 1 ? pmVal * 100 : pmVal) : parseFloat(pmVal) || null;
    }
    if (nbVal !== "" && nbVal !== null && nbVal !== undefined) {
      importedNB = typeof nbVal === "number" ? (nbVal < 1 ? nbVal * 100 : nbVal) : parseFloat(nbVal) || null;
    }
  }

  wb.eachSheet((ws) => {
    const name = ws.name;
    if (name.toLowerCase() === "summary") return;

    // Find the header row
    let headerRowNum = 1;
    for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
      const row = ws.getRow(r);
      let hasSkill = false;
      row.eachCell((cell) => {
        const v = (cell.value || "").toString().toLowerCase();
        if (v === "skill" || v === "#") hasSkill = true;
      });
      if (hasSkill) { headerRowNum = r; break; }
    }

    const headerRow = ws.getRow(headerRowNum);
    const headers = {};
    headerRow.eachCell((cell, colNum) => {
      const val = (cell.value || "").toString().toLowerCase().replace(/[^a-z0-9$/]/g, "");
      headers[colNum] = val;
    });

    const findCol = (...keywords) => {
      for (const [col, h] of Object.entries(headers)) {
        if (keywords.some(k => h.includes(k))) return parseInt(col);
      }
      return 0;
    };
    const safeCell = (row, col) => col > 0 ? getCellVal(row.getCell(col)) : "";

    const colSkill = findCol("skill");
    const colLevel = findCol("level");
    const colLocation = findCol("location");
    const colSalary = findCol("$/month", "$month");
    const colOnsite = findCol("onsite");
    const colTravel = findCol("travel");
    const colGrp = findCol("grp");
    const colOvr = findCol("ovr$/hr", "ovr$hr", "ovr");
    const colComments = findCol("comment");

    if (!colSkill || !colLevel) return;

    const colTMM = findCol("totalmm");
    const phaseStart = (colTravel || colOnsite || colSalary || 0) + 1;
    const phaseEnd = colTMM > 0 ? colTMM : phaseStart;

    const phaseNames = [];
    for (let c = phaseStart; c < phaseEnd; c++) {
      const val = getCellVal(headerRow.getCell(c));
      if (val && !val.toString().toLowerCase().includes("total")) phaseNames.push(val.toString());
    }

    const allocations = [];
    for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const skillName = safeCell(row, colSkill)?.toString().trim();
      if (!skillName) continue;
      if (skillName.toLowerCase().includes("sub-total") || skillName.toLowerCase().includes("logistics") || skillName.toLowerCase().includes("total")) break;

      const level = safeCell(row, colLevel)?.toString().trim() || "Mid";
      const location = safeCell(row, colLocation)?.toString().trim() || "";
      const salary = parseFloat(safeCell(row, colSalary)) || 0;
      const onsite = (safeCell(row, colOnsite) || "").toString().toUpperCase();
      const travel = (safeCell(row, colTravel) || "").toString().toUpperCase();
      const grp = safeCell(row, colGrp)?.toString() || "";
      const ovr = parseFloat(safeCell(row, colOvr)) || null;
      const comments = safeCell(row, colComments)?.toString() || "";

      const phases = {};
      for (let c = phaseStart; c < phaseStart + phaseNames.length; c++) {
        const val = parseFloat(getCellVal(row.getCell(c))) || 0;
        phases[c - phaseStart] = val;
      }

      const matchedSkill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
      const matchedLocation = locations.find(l => l.name.toLowerCase() === location.toLowerCase());

      if (!matchedSkill && skillName) missingSkills.add(skillName);
      if (!matchedLocation && location) missingLocations.add(location);

      const matchedRate = rates.find(rt =>
        rt.skill_name?.toLowerCase() === skillName.toLowerCase() &&
        rt.proficiency_level?.toLowerCase() === level.toLowerCase() &&
        rt.location_name?.toLowerCase() === location.toLowerCase()
      );
      const ohPct = matchedLocation?.overhead_percentage ?? matchedRate?.overhead_percentage ?? 0;

      allocations.push({
        id: `imp_${Date.now()}_${r}`,
        skill_id: matchedSkill?.id || "",
        skill_name: skillName,
        proficiency_level: level,
        base_location_id: matchedLocation?.id || "",
        base_location_name: location,
        avg_monthly_salary: salary,
        overhead_percentage: ohPct,
        is_onsite: onsite === "ON" || onsite === "YES",
        travel_required: travel === "YES",
        resource_group_id: grp,
        override_hourly_rate: ovr,
        phase_allocations: phases,
        comments,
      });
    }

    if (allocations.length > 0) {
      // Parse logistics section
      const parsedLogistics = {};
      for (let r = headerRowNum + allocations.length + 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const cellB = (getCellVal(row.getCell(2)) || "").toString().trim().toLowerCase();
        const cellC = (getCellVal(row.getCell(3)) || "").toString().trim();
        if (!cellB) continue;

        const cellD = row.getCell(4);
        const formulaText = cellD?.value?.formula || "";
        const formulaMatch = formulaText.match(/\)\s*\*\s*(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*$/);
        const dailyMatch = cellC.match(/\$(\d+(?:\.\d+)?)\s*x\s*(\d+)\s*d/i);
        const tripsMatch = cellC.match(/\$(\d+(?:\.\d+)?)\s*x\s*(\d+)\s*trip/i);
        const pctMatch = cellC.match(/^(\d+(?:\.\d+)?)%/);
        const pctFormulaMatch = formulaText.match(/\*\s*(\d+(?:\.\d+)?)\s*\/\s*100/);

        if (cellB.includes("per-diem")) {
          const m = formulaMatch || dailyMatch;
          if (m) { parsedLogistics.per_diem_daily = parseFloat(m[1]); parsedLogistics.per_diem_days = parseInt(m[2]); }
        } else if (cellB.includes("accommodation")) {
          const m = formulaMatch || dailyMatch;
          if (m) { parsedLogistics.accommodation_daily = parseFloat(m[1]); parsedLogistics.accommodation_days = parseInt(m[2]); }
        } else if (cellB.includes("conveyance")) {
          const m = formulaMatch || dailyMatch;
          if (m) { parsedLogistics.local_conveyance_daily = parseFloat(m[1]); parsedLogistics.local_conveyance_days = parseInt(m[2]); }
        } else if (cellB.includes("air fare")) {
          const m = formulaMatch || tripsMatch;
          if (m) { parsedLogistics.flight_cost_per_trip = parseFloat(m[1]); parsedLogistics.num_trips = parseInt(m[2]); }
        } else if (cellB.includes("visa") || cellB.includes("medical")) {
          const m = formulaMatch || tripsMatch;
          if (m) { parsedLogistics.visa_medical_per_trip = parseFloat(m[1]); }
        } else if (cellB.includes("contingency") && cellB.includes("absolute")) {
          const absVal = parseFloat(getCellVal(cellD)) || 0;
          if (absVal > 0) parsedLogistics.contingency_absolute = absVal;
        } else if (cellB.includes("contingency")) {
          const m = pctFormulaMatch || pctMatch;
          if (m) { parsedLogistics.contingency_percentage = parseFloat(m[1]); }
        }
      }

      parsedWaves.push({
        sheetName: name,
        phaseNames,
        allocations,
        logistics: Object.keys(parsedLogistics).length > 0 ? parsedLogistics : null,
      });
    }
  });

  return {
    waves: parsedWaves,
    missingSkills: [...missingSkills],
    missingLocations: [...missingLocations],
    totalResources: parsedWaves.reduce((s, w) => s + w.allocations.length, 0),
    profitMargin: importedPM,
    negoBuffer: importedNB,
  };
}
