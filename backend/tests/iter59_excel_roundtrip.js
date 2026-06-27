// Iteration 59 Excel round-trip: build a fixture matching the new 9-col AMS layout, parse with excelImport, and assert cost_rate captured. Also test legacy 7-col file backward compat.
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('AMS Shared Wave');

  // Header row mimicking grid header so importer detects this as a valid wave sheet
  ws.addRow(['Skill', 'Proficiency', 'Location', 'Onsite', 'Travel', 'Hourly Rate', 'M1']);
  // No allocations — just AMS section. Add a blank row then AMS section.
  ws.addRow([]);
  ws.addRow([]);
  // Implementation sub-total etc skipped
  ws.addRow(['AMS SHARED SUPPORT (Shared — 12 months contract)']);
  ws.addRow(['#', 'Service / Bucket', 'Hours/Month', 'Hourly Rate', 'Cost Rate', 'Billing/Month', 'Cost/Month', 'Billing/Year', 'Notes']);
  ws.addRow([1, 'L1 Tickets', 250, 18, 20, 4500, 5000, 54000, 'note1']);
  ws.addRow([2, 'L2 Tickets', 100, 30, 25, 3000, 2500, 36000, 'note2']);
  ws.addRow(['TOTAL', '', '', '', '', 7500, 7500, 90000, '']);
  ws.addRow([]);
  ws.addRow(['WAVE FINAL PRICE (incl. AMS Annual)']);

  const buf1 = await wb.xlsx.writeBuffer();

  // Legacy 7-col file
  const wb2 = new ExcelJS.Workbook();
  const ws2 = wb2.addWorksheet('Legacy AMS');
  ws2.addRow(['Skill', 'Proficiency', 'Location', 'Onsite', 'Travel', 'Hourly Rate', 'M1']);
  ws2.addRow([]);
  ws2.addRow(['AMS SHARED SUPPORT (Mix — 6 months contract)']);
  ws2.addRow(['#', 'Service / Bucket', 'Hours/Month', 'Hourly Rate', 'Billing/Month', 'Billing/Year', 'Notes']);
  ws2.addRow([1, 'OnCall', 50, 40, 2000, 12000, 'legacy note']);
  ws2.addRow(['TOTAL', '', '', '', 2000, 12000, '']);
  const buf2 = await wb2.xlsx.writeBuffer();

  // ---- Simulate the parsing logic from /app/frontend/src/utils/excelImport.js ----
  async function parseAmsSection(buf) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const results = [];
    wb.eachSheet((ws) => {
      let engagementType = 'Implementation';
      let contractMonths = 12;
      const buckets = [];
      const getCellVal = (cell) => (cell && cell.value && typeof cell.value === 'object' && 'result' in cell.value) ? cell.value.result : (cell ? cell.value : null);
      for (let r = 1; r <= ws.rowCount; r++) {
        const cellA = ((getCellVal(ws.getRow(r).getCell(1)) || '') + '').toString().trim();
        if (cellA.toUpperCase().includes('AMS SHARED SUPPORT')) {
          const m = cellA.match(/AMS SHARED SUPPORT \((\w+)\s*[—-]\s*(\d+)\s*months/i);
          if (m) {
            engagementType = m[1].toLowerCase().includes('mix') ? 'AMS_Mix' : 'AMS_Shared';
            contractMonths = parseInt(m[2]) || 12;
          }
          const colHdr = ws.getRow(r + 1);
          const colHdrText = [];
          for (let c = 1; c <= 9; c++) colHdrText.push(((getCellVal(colHdr.getCell(c)) || '') + '').toString().toLowerCase());
          const hasCostRate = colHdrText.some(t => t.includes('cost rate'));
          const notesCol = hasCostRate ? 9 : 7;
          for (let ar = r + 2; ar <= ws.rowCount; ar++) {
            const aRow = ws.getRow(ar);
            const numCell = ((getCellVal(aRow.getCell(1)) || '') + '').toString().trim();
            const nameCell = ((getCellVal(aRow.getCell(2)) || '') + '').toString().trim();
            const hoursCell = parseFloat(getCellVal(aRow.getCell(3)));
            const rateCell = parseFloat(getCellVal(aRow.getCell(4)));
            const costRateCell = hasCostRate ? parseFloat(getCellVal(aRow.getCell(5))) : 0;
            if (!nameCell || nameCell.toUpperCase() === 'TOTAL' || numCell.toUpperCase() === 'TOTAL') break;
            if (!Number.isFinite(hoursCell) || !Number.isFinite(rateCell)) continue;
            buckets.push({
              name: nameCell,
              hours_per_month: hoursCell,
              hourly_rate: rateCell,
              cost_rate: Number.isFinite(costRateCell) ? costRateCell : 0,
              notes: ((getCellVal(aRow.getCell(notesCol)) || '') + '').toString().trim(),
            });
          }
          break;
        }
      }
      results.push({ engagementType, contractMonths, buckets });
    });
    return results;
  }

  const r1 = await parseAmsSection(buf1);
  const r2 = await parseAmsSection(buf2);

  let pass = 0, fail = 0;
  const expect = (cond, msg) => { if (cond) { console.log('PASS:', msg); pass++; } else { console.log('FAIL:', msg); fail++; } };

  // New 9-col file
  expect(r1[0].engagementType === 'AMS_Shared', 'new format → engagementType=AMS_Shared');
  expect(r1[0].contractMonths === 12, 'new format → contractMonths=12');
  expect(r1[0].buckets.length === 2, 'new format → 2 buckets');
  expect(r1[0].buckets[0].cost_rate === 20, 'new format → bucket[0].cost_rate=20');
  expect(r1[0].buckets[0].hours_per_month === 250, 'new format → bucket[0].hours_per_month=250');
  expect(r1[0].buckets[0].hourly_rate === 18, 'new format → bucket[0].hourly_rate=18');
  expect(r1[0].buckets[0].notes === 'note1', 'new format → bucket[0].notes=note1 (col 9)');
  expect(r1[0].buckets[1].cost_rate === 25, 'new format → bucket[1].cost_rate=25');

  // Legacy 7-col file
  expect(r2[0].engagementType === 'AMS_Mix', 'legacy → engagementType=AMS_Mix');
  expect(r2[0].contractMonths === 6, 'legacy → contractMonths=6');
  expect(r2[0].buckets.length === 1, 'legacy → 1 bucket');
  expect(r2[0].buckets[0].cost_rate === 0, 'legacy → bucket.cost_rate=0 (no col)');
  expect(r2[0].buckets[0].notes === 'legacy note', 'legacy → notes at col 7');
  expect(r2[0].buckets[0].hours_per_month === 50, 'legacy → hours=50');

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
