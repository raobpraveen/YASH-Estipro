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
  const parsedMilestones = []; // { wave_name, milestones: [], payment_terms_days }

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

  // Pre-scan for milestone sheets and parse them
  const milestoneSheetNames = new Set();
  wb.eachSheet((ws) => {
    const name = ws.name;
    if (name.toLowerCase().includes("milestones")) {
      milestoneSheetNames.add(name);
      // Parse milestone sheet
      const msData = parseMilestoneSheet(ws, getCellVal);
      if (msData) parsedMilestones.push(msData);
    }
  });

  // Pre-scan for activities sheets (skip them from wave parsing)
  const activitySheetNames = new Set();
  wb.eachSheet((ws) => {
    if (ws.name.toLowerCase().includes("activities")) activitySheetNames.add(ws.name);
  });

  wb.eachSheet((ws) => {
    const name = ws.name;
    if (name.toLowerCase() === "summary") return;
    if (name.toLowerCase() === "gantt chart") return;
    if (name.toLowerCase() === "cashflow") return;
    if (milestoneSheetNames.has(name)) return;
    if (activitySheetNames.has(name)) return;

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
    const colTech = findCol("technology");

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
    // Section terminators that must end the resource-grid parse. Match against the *first 3*
    // columns (any of: #/Technology/Skill) — section headers can land in different columns
    // depending on whether the Technology column is present in the export.
    const isSectionTerminator = (row) => {
      for (let c = 1; c <= 3; c++) {
        const v = (getCellVal(row.getCell(c)) || "").toString().trim().toLowerCase();
        if (!v) continue;
        if (
          v === "totals" || v === "total" ||
          v.includes("logistics breakdown") || v === "total logistics" ||
          v.includes("phase ranges") || v.includes("phase dependencies") ||
          v.includes("ams shared support") || v.includes("wave summary") ||
          v.includes("resources selling price") || v.includes("wave selling price") ||
          v.includes("wave final price") || v.includes("implementation sub-total") ||
          v.startsWith("nego buffer") || v === "onsite mm" || v === "offshore mm"
        ) return true;
      }
      return false;
    };
    for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      if (isSectionTerminator(row)) break;
      // The # column must be a positive integer for a real allocation row.
      const numRaw = getCellVal(row.getCell(1));
      const numVal = typeof numRaw === "number" ? numRaw : parseInt(numRaw);
      if (!Number.isFinite(numVal) || numVal <= 0) continue;
      const skillRaw = safeCell(row, colSkill);
      const skillName = (skillRaw ?? "").toString().trim();
      // Reject rows where the skill cell is a number (sub-total/formula leakage)
      if (!skillName || /^\$?\s*[\d,.]+(\.\d+)?$/.test(skillName)) continue;
      if (skillName.toLowerCase().includes("sub-total") || skillName.toLowerCase().includes("logistics") || skillName.toLowerCase() === "total" || skillName.toLowerCase() === "totals") break;

      const level = safeCell(row, colLevel)?.toString().trim() || "Mid";
      const location = safeCell(row, colLocation)?.toString().trim() || "";
      const salary = parseFloat(safeCell(row, colSalary)) || 0;
      const onsite = (safeCell(row, colOnsite) || "").toString().toUpperCase();
      const travel = (safeCell(row, colTravel) || "").toString().toUpperCase();
      const grp = safeCell(row, colGrp)?.toString() || "";
      const ovr = parseFloat(safeCell(row, colOvr)) || null;
      const comments = safeCell(row, colComments)?.toString() || "";
      const techName = colTech ? safeCell(row, colTech)?.toString().trim() || "" : "";

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
        technology_name: techName,
      });
    }

    // Detect whether this sheet has an AMS SHARED SUPPORT section even when there
    // are no implementation resource rows (pure AMS_Shared waves).
    let hasAmsSection = false;
    for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
      const a = (getCellVal(ws.getRow(r).getCell(1)) || "").toString().trim().toUpperCase();
      if (a.includes("AMS SHARED SUPPORT")) { hasAmsSection = true; break; }
    }

    if (allocations.length > 0 || hasAmsSection) {
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

      // Parse phase ranges section
      let phaseRanges = [];
      let phaseDependencies = [];
      let amsBuckets = [];
      let amsContractMonths = 12;
      let amsBillingFrequency = "Monthly";
      let amsBillingAdvance = false;
      let engagementType = "Implementation";
      for (let r = headerRowNum + allocations.length + 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const cellA = (getCellVal(row.getCell(1)) || "").toString().trim();
        if (cellA.toUpperCase().includes("PHASE RANGES")) {
          for (let pr = r + 2; pr <= ws.rowCount; pr++) {
            const prRow = ws.getRow(pr);
            const phaseName = (getCellVal(prRow.getCell(1)) || "").toString().trim();
            const startMonth = parseFloat(getCellVal(prRow.getCell(2))) || 0;
            const endMonth = parseFloat(getCellVal(prRow.getCell(3))) || 0;
            if (!phaseName || !startMonth) break;
            phaseRanges.push({ name: phaseName, start_month: startMonth, end_month: endMonth || startMonth });
          }
        }
        if (cellA.toUpperCase().includes("PHASE DEPENDENCIES")) {
          for (let dr = r + 2; dr <= ws.rowCount; dr++) {
            const depRow = ws.getRow(dr);
            const fromPhase = (getCellVal(depRow.getCell(1)) || "").toString().trim();
            const toPhase = (getCellVal(depRow.getCell(2)) || "").toString().trim();
            const depType = (getCellVal(depRow.getCell(3)) || "FS").toString().trim();
            if (!fromPhase || !toPhase) break;
            phaseDependencies.push({ from_phase: fromPhase, to_phase: toPhase, type: depType });
          }
        }
        // Parse "AMS SHARED SUPPORT (<Type> — <N> months contract[ — Billing: <Freq>[ · Advance]])"
        if (cellA.toUpperCase().includes("AMS SHARED SUPPORT")) {
          const headerMatch = cellA.match(/AMS SHARED SUPPORT \((\w+)\s*[—-]\s*(\d+)\s*months/i);
          if (headerMatch) {
            engagementType = headerMatch[1].toLowerCase().includes("mix") ? "AMS_Mix" : "AMS_Shared";
            amsContractMonths = parseInt(headerMatch[2]) || 12;
          }
          const freqMatch = cellA.match(/Billing:\s*(Monthly|Quarterly)/i);
          if (freqMatch) {
            amsBillingFrequency = freqMatch[1].toLowerCase().startsWith("quarter") ? "Quarterly" : "Monthly";
          }
          amsBillingAdvance = /Advance/i.test(cellA);
          // Read the header row (r+1) to detect column layout (legacy 7-col vs new 9-col with Cost Rate)
          const colHdr = ws.getRow(r + 1);
          const colHdrText = [];
          for (let c = 1; c <= 9; c++) {
            colHdrText.push(((getCellVal(colHdr.getCell(c)) || "") + "").toString().toLowerCase());
          }
          const hasCostRate = colHdrText.some(t => t.includes("cost rate"));
          // Resolve column indices
          const notesCol = hasCostRate ? 9 : 7;
          for (let ar = r + 2; ar <= ws.rowCount; ar++) {
            const aRow = ws.getRow(ar);
            const numCell = (getCellVal(aRow.getCell(1)) || "").toString().trim();
            const nameCell = (getCellVal(aRow.getCell(2)) || "").toString().trim();
            const hoursCell = parseFloat(getCellVal(aRow.getCell(3)));
            const rateCell = parseFloat(getCellVal(aRow.getCell(4)));
            const costRateCell = hasCostRate ? parseFloat(getCellVal(aRow.getCell(5))) : 0;
            // Stop on Total row or blank
            if (!nameCell || nameCell.toUpperCase() === "TOTAL" || numCell.toUpperCase() === "TOTAL") break;
            if (!Number.isFinite(hoursCell) || !Number.isFinite(rateCell)) continue;
            amsBuckets.push({
              name: nameCell,
              hours_per_month: hoursCell,
              hourly_rate: rateCell,
              cost_rate: Number.isFinite(costRateCell) ? costRateCell : 0,
              notes: (getCellVal(aRow.getCell(notesCol)) || "").toString().trim(),
            });
          }
        }
      }

      parsedWaves.push({
        sheetName: name,
        phaseNames,
        allocations,
        phaseRanges,
        phaseDependencies,
        logistics: Object.keys(parsedLogistics).length > 0 ? parsedLogistics : null,
        engagementType: amsBuckets.length > 0 ? engagementType : "Implementation",
        amsBuckets,
        amsContractMonths,
        amsBillingFrequency,
        amsBillingAdvance,
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
    milestones: parsedMilestones,
  };
}

/**
 * Parse a Milestones sheet from the Excel export.
 * @returns {{ wave_name: string, milestones: Array, payment_terms_days: number } | null}
 */
function parseMilestoneSheet(ws, getCellVal) {
  // Row 2 has metadata: "", "Wave:", waveName, ..., "Type:payment"
  let waveName = "";
  let paymentTermsDays = 0;
  const milestones = [];

  // Try to extract wave name from row 2
  const row2 = ws.getRow(2);
  const cellB2 = (getCellVal(row2.getCell(2)) || "").toString().trim();
  const cellC2 = (getCellVal(row2.getCell(3)) || "").toString().trim();
  if (cellB2.toLowerCase().includes("wave")) {
    waveName = cellC2;
  }
  // Fallback: derive wave name from sheet title (row 1)
  if (!waveName) {
    const title = (getCellVal(ws.getRow(1).getCell(1)) || "").toString().trim();
    const match = title.match(/^(.+?)\s*[—-]\s*Milestones/i);
    if (match) waveName = match[1].trim();
  }
  if (!waveName) return null;

  // Check for payment terms
  for (let r = 3; r <= 6; r++) {
    const label = (getCellVal(ws.getRow(r).getCell(2)) || "").toString().trim().toLowerCase();
    if (label.includes("payment terms")) {
      const val = getCellVal(ws.getRow(r).getCell(3));
      paymentTermsDays = parseInt(val) || 0;
    }
  }

  // Scan for data rows — look for header rows with "Milestone Name"
  let inPayment = false;
  let inMarker = false;

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const cellB = (getCellVal(row.getCell(2)) || "").toString().trim();
    const cellBLower = cellB.toLowerCase();

    // Detect section headers
    if (cellBLower === "payment milestones") { inPayment = true; inMarker = false; continue; }
    if (cellBLower === "marker milestones") { inMarker = true; inPayment = false; continue; }
    if (cellBLower === "summary" || cellBLower === "total") { inPayment = false; inMarker = false; continue; }

    // Skip header rows
    if (cellBLower === "milestone name") continue;

    // Check if this is a data row (col A has a number)
    const cellA = getCellVal(row.getCell(1));
    const rowNum = parseInt(cellA);
    if (!rowNum || rowNum <= 0) continue;

    const milestoneName = cellB;
    if (!milestoneName) continue;

    const phaseName = (getCellVal(row.getCell(3)) || "").toString().trim();
    const position = (getCellVal(row.getCell(4)) || "").toString().trim().replace("%", "");
    const targetMonth = (getCellVal(row.getCell(5)) || "").toString().trim();
    const description = (getCellVal(row.getCell(8)) || "").toString().trim();
    // Check milestone type from column I
    const typeCell = (getCellVal(row.getCell(9)) || "").toString().trim().toLowerCase();
    let msType = inPayment ? "payment" : (inMarker ? "marker" : "payment");
    if (typeCell === "marker" || typeCell === "payment") msType = typeCell;

    const generateId = () => `imp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (msType === "payment") {
      const pctRaw = getCellVal(row.getCell(6));
      let pct = 0;
      if (typeof pctRaw === "number") pct = pctRaw < 1 ? pctRaw * 100 : pctRaw;
      else pct = parseFloat(pctRaw) || 0;

      const amtRaw = getCellVal(row.getCell(7));
      const amt = parseFloat(amtRaw) || 0;

      milestones.push({
        id: generateId(),
        wave_name: waveName,
        milestone_name: milestoneName,
        milestone_type: "payment",
        phase_name: phaseName,
        position: position || "mid",
        target_month: targetMonth,
        payment_percentage: Math.round(pct * 10) / 10,
        payment_amount: amt,
        description,
      });
    } else {
      milestones.push({
        id: generateId(),
        wave_name: waveName,
        milestone_name: milestoneName,
        milestone_type: "marker",
        phase_name: phaseName,
        position: position || "50",
        target_month: targetMonth,
        payment_percentage: 0,
        payment_amount: 0,
        description,
      });
    }
  }

  return { wave_name: waveName, milestones, payment_terms_days: paymentTermsDays };
}
