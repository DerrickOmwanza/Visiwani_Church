const ExcelJS = require('exceljs');
const { quarterMonths, weekOfMonth, monthLabel, movement, balanceAsOf } = require('../helpers');

const CHURCH_NAME = 'VISIWANI SDA CHURCH';
const CURRENCY_FMT = '#,##0.00;[Red](#,##0.00)';

const TITLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
const SECTION_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
const THIN_BORDER = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

// Excel worksheet names can't contain * ? : \ / [ ] and are capped at 31
// chars - department/report names (which may contain "/") need cleaning
// before being used as a sheet title.
function sheetName(name) {
  return name.replace(/[*?:\\/[\]]/g, '-').slice(0, 31);
}

function titleBlock(ws, lines, lastCol) {
  ws.mergeCells(1, 1, 1, lastCol);
  const title = ws.getCell(1, 1);
  title.value = lines[0];
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  title.fill = TITLE_FILL;
  ws.getRow(1).height = 24;

  lines.slice(1).forEach((line, i) => {
    const r = i + 2;
    ws.mergeCells(r, 1, r, lastCol);
    const cell = ws.getCell(r, 1);
    cell.value = line;
    cell.font = { bold: true, size: 11 };
    cell.alignment = { horizontal: 'center' };
  });
  return lines.length + 1; // next free row
}

function sectionHeaderRow(ws, row, values) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1);
    cell.value = v;
    cell.font = { bold: true };
    cell.fill = SECTION_FILL;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: i === 0 ? 'left' : 'center', vertical: 'middle', wrapText: true };
  });
  return row + 1;
}

function dataRow(ws, row, values, { moneyCols = [], bold = false } = {}) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1);
    cell.value = v;
    cell.border = THIN_BORDER;
    if (bold) cell.font = { bold: true };
    if (moneyCols.includes(i)) {
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right' };
    }
  });
  return row + 1;
}

function totalRow(ws, row, values, moneyCols = []) {
  const r = ws.getRow(row);
  values.forEach((v, i) => {
    const cell = r.getCell(i + 1);
    cell.value = v;
    cell.border = THIN_BORDER;
    cell.font = { bold: true };
    cell.fill = TOTAL_FILL;
    if (moneyCols.includes(i)) {
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right' };
    }
  });
  return row + 1;
}

function autoWidth(ws, widths) {
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

/**
 * Monthly Statement of Activity for a single department, broken down by
 * week within the month - mirrors the church's existing paper format
 * (Income section, Expenses section, Total collection/expenditure, and
 * Surplus/Deficit), plus balance brought forward and carried down.
 */
function buildMonthlyStatement({ department, transactions, year, month }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName(`${monthLabel(month)} ${year}`));

  const monthStr = String(month).padStart(2, '0');
  const from = `${year}-${monthStr}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const weekCount = weekOfMonth(to);
  const weekCols = Array.from({ length: weekCount }, (_, i) => `Week ${i + 1} (Ksh)`);
  const lastCol = 1 + weekCount + 1; // label + weeks + total

  let row = titleBlock(ws, [CHURCH_NAME, 'STATEMENT OF ACTIVITY', `${department.name} - ${monthLabel(month).toUpperCase()} ${year}`], lastCol);
  row += 1;

  const openingBalance = balanceAsOf(department, transactions, dayBefore(from));
  row = dataRow(ws, row, ['Balance Brought Forward', ...Array(weekCount).fill(''), openingBalance], { moneyCols: [lastCol - 1], bold: true });
  row += 1;

  const monthTxns = transactions.filter((t) => t.departmentId === department.id && t.date >= from && t.date <= to);

  function weeklyBreakdown(direction, items) {
    const rows = [];
    const totalsPerWeek = Array(weekCount).fill(0);
    const usedCategories = new Set(items.map((i) => i.toLowerCase()));

    for (const item of items) {
      const weekAmounts = Array(weekCount).fill(0);
      let any = false;
      for (const t of monthTxns) {
        if (t.direction !== direction) continue;
        if (t.category.toLowerCase() !== item.toLowerCase()) continue;
        const w = weekOfMonth(t.date) - 1;
        weekAmounts[w] += t.amount;
        totalsPerWeek[w] += t.amount;
        any = true;
      }
      if (any || true) rows.push([item, ...weekAmounts, weekAmounts.reduce((a, b) => a + b, 0)]);
    }

    // Anything recorded under a category not in the standard list still
    // needs to show up - group those under "Other".
    const otherWeekAmounts = Array(weekCount).fill(0);
    let otherAny = false;
    for (const t of monthTxns) {
      if (t.direction !== direction) continue;
      if (usedCategories.has(t.category.toLowerCase())) continue;
      const w = weekOfMonth(t.date) - 1;
      otherWeekAmounts[w] += t.amount;
      totalsPerWeek[w] += t.amount;
      otherAny = true;
    }
    if (otherAny) rows.push(['Other', ...otherWeekAmounts, otherWeekAmounts.reduce((a, b) => a + b, 0)]);

    return { rows, totalsPerWeek, grandTotal: totalsPerWeek.reduce((a, b) => a + b, 0) };
  }

  row = sectionHeaderRow(ws, row, ['Income', ...weekCols, 'Total']);
  const income = weeklyBreakdown('in', department.incomeItems);
  for (const r of income.rows) row = dataRow(ws, row, r, { moneyCols: r.map((_, i) => i).slice(1) });
  row = totalRow(ws, row, ['TOTAL COLLECTION', ...income.totalsPerWeek, income.grandTotal], Array.from({ length: weekCount + 1 }, (_, i) => i + 1));
  row += 1;

  row = sectionHeaderRow(ws, row, ['Expenses', ...weekCols, 'Total']);
  const expense = weeklyBreakdown('out', department.expenseItems);
  for (const r of expense.rows) row = dataRow(ws, row, r, { moneyCols: r.map((_, i) => i).slice(1) });
  row = totalRow(ws, row, ['TOTAL EXPENDITURE', ...expense.totalsPerWeek, expense.grandTotal], Array.from({ length: weekCount + 1 }, (_, i) => i + 1));
  row += 1;

  const surplusPerWeek = income.totalsPerWeek.map((v, i) => v - expense.totalsPerWeek[i]);
  const surplusTotal = income.grandTotal - expense.grandTotal;
  row = totalRow(ws, row, [`SURPLUS/DEFICIT FOR ${monthLabel(month).toUpperCase()} ${year}`, ...surplusPerWeek, surplusTotal], Array.from({ length: weekCount + 1 }, (_, i) => i + 1));
  row += 1;

  const closingBalance = openingBalance + surplusTotal;
  row = totalRow(ws, row, ['BALANCE CARRIED DOWN', ...Array(weekCount).fill(''), closingBalance], [lastCol - 1]);

  autoWidth(ws, [32, ...Array(weekCount).fill(14), 14]);
  return wb;
}

function dayBefore(isoDate) {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Quarterly summary across every department for a given year: income,
 * expense and net movement per quarter, plus running closing balance -
 * the digital equivalent of the "departments accounts" sheet the church
 * already keeps, but with clearer income/expense/net columns per quarter.
 */
function buildQuarterlySummary({ departments, transactions, year }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Quarterly Summary ${year}`);

  const quarters = [1, 2, 3, 4];
  const header = ['Department'];
  quarters.forEach((q) => header.push(`Q${q} Income`, `Q${q} Expense`, `Q${q} Net`));
  header.push('Year Income', 'Year Expense', 'Year Net', `Balance as at 31 Dec ${year}`);
  const lastCol = header.length;

  let row = titleBlock(ws, [CHURCH_NAME, 'STATEMENT OF ACTIVITY', `DEPARTMENTAL SUMMARY - ${year}`], lastCol);
  row += 1;
  row = sectionHeaderRow(ws, row, header);

  const moneyCols = Array.from({ length: lastCol - 1 }, (_, i) => i + 1);
  let yearInTotal = 0;
  let yearOutTotal = 0;

  // Every department is included here, active or not - a deactivated
  // department's historical money still moved through the church's
  // accounts and must stay traceable, otherwise the "TOTAL - ALL
  // DEPARTMENTS" row below would include amounts no row above it shows.
  for (const dept of departments) {
    const cells = [dept.name + (dept.active === false ? ' (Inactive)' : '')];
    let deptYearIn = 0;
    let deptYearOut = 0;
    for (const q of quarters) {
      const [m1] = quarterMonths(q);
      const from = `${year}-${String(m1).padStart(2, '0')}-01`;
      const [, , m3] = quarterMonths(q);
      const lastDay = new Date(Date.UTC(year, m3, 0)).getUTCDate();
      const to = `${year}-${String(m3).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const mv = movement(transactions, { departmentId: dept.id, from, to });
      cells.push(mv.in, mv.out, mv.net);
      deptYearIn += mv.in;
      deptYearOut += mv.out;
    }
    const closing = balanceAsOf(dept, transactions, `${year}-12-31`);
    cells.push(deptYearIn, deptYearOut, deptYearIn - deptYearOut, closing);
    row = dataRow(ws, row, cells, { moneyCols });
    yearInTotal += deptYearIn;
    yearOutTotal += deptYearOut;
  }

  const totalCells = ['TOTAL - ALL DEPARTMENTS'];
  for (const q of quarters) {
    const [m1] = quarterMonths(q);
    const from = `${year}-${String(m1).padStart(2, '0')}-01`;
    const [, , m3] = quarterMonths(q);
    const lastDay = new Date(Date.UTC(year, m3, 0)).getUTCDate();
    const to = `${year}-${String(m3).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const mv = movement(transactions, { departmentId: null, from, to });
    totalCells.push(mv.in, mv.out, mv.net);
  }
  totalCells.push(yearInTotal, yearOutTotal, yearInTotal - yearOutTotal, '');
  row = totalRow(ws, row, totalCells, moneyCols);

  autoWidth(ws, [28, ...Array(lastCol - 1).fill(13)]);
  return wb;
}

/**
 * Annual collection summary for one department: each income/expense line
 * item as a row, months (Jan-Dec) as columns, with a Total column -
 * mirrors the church's existing "summary" sheet.
 */
function buildAnnualSummary({ department, transactions, year }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName(`Annual Summary ${year}`));

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const header = ['Category', ...months.map((m) => monthLabel(m).slice(0, 3).toUpperCase()), 'Total'];
  const lastCol = header.length;

  let row = titleBlock(ws, [CHURCH_NAME, 'ANNUAL COLLECTION SUMMARY', `${department.name.toUpperCase()} - ${year}`], lastCol);
  row += 1;

  function monthRange(m) {
    const from = `${year}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const to = `${year}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }

  function section(title, direction, items) {
    row = sectionHeaderRow(ws, row, [title, ...Array(12).fill(''), '']);
    const monthlyTotals = Array(12).fill(0);
    const seen = new Set(items.map((i) => i.toLowerCase()));

    for (const item of items) {
      const values = months.map((m) => {
        const { from, to } = monthRange(m);
        let sum = 0;
        for (const t of transactions) {
          if (t.departmentId !== department.id || t.direction !== direction) continue;
          if (t.category.toLowerCase() !== item.toLowerCase()) continue;
          if (t.date < from || t.date > to) continue;
          sum += t.amount;
        }
        monthlyTotals[months.indexOf(m)] += sum;
        return sum;
      });
      const lineTotal = values.reduce((a, b) => a + b, 0);
      if (lineTotal !== 0) row = dataRow(ws, row, [item, ...values, lineTotal], { moneyCols: Array.from({ length: 13 }, (_, i) => i + 1) });
    }

    // Other/custom categories not in the standard list.
    const otherValues = months.map((m) => {
      const { from, to } = monthRange(m);
      let sum = 0;
      for (const t of transactions) {
        if (t.departmentId !== department.id || t.direction !== direction) continue;
        if (seen.has(t.category.toLowerCase())) continue;
        if (t.date < from || t.date > to) continue;
        sum += t.amount;
      }
      monthlyTotals[months.indexOf(m)] += sum;
      return sum;
    });
    const otherTotal = otherValues.reduce((a, b) => a + b, 0);
    if (otherTotal !== 0) row = dataRow(ws, row, ['Other', ...otherValues, otherTotal], { moneyCols: Array.from({ length: 13 }, (_, i) => i + 1) });

    const grand = monthlyTotals.reduce((a, b) => a + b, 0);
    row = totalRow(ws, row, [`TOTAL ${title.toUpperCase()}`, ...monthlyTotals, grand], Array.from({ length: 13 }, (_, i) => i + 1));
    row += 1;
    return monthlyTotals;
  }

  const incomeMonthly = section('Income', 'in', department.incomeItems);
  const expenseMonthly = section('Expenses', 'out', department.expenseItems);

  const netMonthly = incomeMonthly.map((v, i) => v - expenseMonthly[i]);
  row = totalRow(ws, row, ['SURPLUS/DEFICIT', ...netMonthly, netMonthly.reduce((a, b) => a + b, 0)], Array.from({ length: 13 }, (_, i) => i + 1));

  autoWidth(ws, [30, ...Array(12).fill(11), 13]);
  return wb;
}

/**
 * Bank-statement-style ledger for any date range, optionally scoped to a
 * single department. Chronological, with a running balance - lets the
 * treasurer request "from - to" the same way a bank customer would.
 */
function buildRangeStatement({ department, departments, transactions, from, to }) {
  const wb = new ExcelJS.Workbook();
  const single = !!department;
  const ws = wb.addWorksheet('Statement');

  const header = single ? ['Date', 'Particulars', 'Category', 'Cash In', 'Cash Out', 'Balance'] : ['Date', 'Department', 'Particulars', 'Category', 'Cash In', 'Cash Out'];
  const lastCol = header.length;

  const subtitle = single ? `${department.name.toUpperCase()} - STATEMENT FOR ${from} TO ${to}` : `ALL DEPARTMENTS - STATEMENT FOR ${from} TO ${to}`;
  let row = titleBlock(ws, [CHURCH_NAME, 'ACCOUNT STATEMENT', subtitle], lastCol);
  row += 1;

  let openingBalance = 0;
  if (single) {
    openingBalance = balanceAsOf(department, transactions, dayBefore(from));
    row = dataRow(ws, row, ['', 'Balance Brought Forward', '', '', '', openingBalance], { moneyCols: [5], bold: true });
  }

  row = sectionHeaderRow(ws, row, header);

  const filtered = transactions
    .filter((t) => (single ? t.departmentId === department.id : true))
    .filter((t) => t.date >= from && t.date <= to)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));

  let running = openingBalance;
  let totalIn = 0;
  let totalOut = 0;
  const deptName = (id) => (departments.find((d) => d.id === id) || {}).name || 'Unknown';

  for (const t of filtered) {
    const cashIn = t.direction === 'in' ? t.amount : '';
    const cashOut = t.direction === 'out' ? t.amount : '';
    running += t.direction === 'in' ? t.amount : -t.amount;
    if (t.direction === 'in') totalIn += t.amount;
    else totalOut += t.amount;

    const rowValues = single
      ? [t.date, t.particulars || t.category, t.category, cashIn, cashOut, running]
      : [t.date, deptName(t.departmentId), t.particulars || t.category, t.category, cashIn, cashOut];
    const moneyCols = single ? [3, 4, 5] : [4, 5];
    row = dataRow(ws, row, rowValues, { moneyCols });
  }

  row += 1;
  if (single) {
    row = totalRow(ws, row, ['', 'TOTALS', '', totalIn, totalOut, running], [3, 4, 5]);
  } else {
    row = totalRow(ws, row, ['', '', '', 'TOTALS', totalIn, totalOut], [4, 5]);
  }

  autoWidth(ws, single ? [12, 34, 22, 14, 14, 14] : [12, 24, 30, 20, 14, 14]);
  return wb;
}

/**
 * Single-department ledger in the exact "cash book" style already used on
 * paper for funds like Building: Date, Particulars, Cash In, Cash Out,
 * running Balance.
 */
function buildDepartmentLedger({ department, transactions, from, to }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName(department.name));

  const header = ['Date', 'Particulars', 'Cash In', 'Cash Out', 'Balance'];
  const lastCol = header.length;

  let row = titleBlock(ws, [CHURCH_NAME, `${department.name.toUpperCase()} ACCOUNT`, `${from} TO ${to}`], lastCol);
  row += 1;

  const openingBalance = balanceAsOf(department, transactions, dayBefore(from));
  row = sectionHeaderRow(ws, row, header);
  row = dataRow(ws, row, ['', 'Balance b/d', '', '', openingBalance], { moneyCols: [4], bold: true });

  const filtered = transactions
    .filter((t) => t.departmentId === department.id && t.date >= from && t.date <= to)
    .sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));

  let running = openingBalance;
  let totalIn = 0;
  let totalOut = 0;
  for (const t of filtered) {
    const cashIn = t.direction === 'in' ? t.amount : '';
    const cashOut = t.direction === 'out' ? t.amount : '';
    running += t.direction === 'in' ? t.amount : -t.amount;
    if (t.direction === 'in') totalIn += t.amount;
    else totalOut += t.amount;
    row = dataRow(ws, row, [t.date, t.particulars || t.category, cashIn, cashOut, running], { moneyCols: [2, 3, 4] });
  }

  row = totalRow(ws, row, ['', 'TOTALS / BALANCE C/D', totalIn, totalOut, running], [2, 3, 4]);

  autoWidth(ws, [12, 40, 14, 14, 14]);
  return wb;
}

module.exports = {
  buildMonthlyStatement,
  buildQuarterlySummary,
  buildAnnualSummary,
  buildRangeStatement,
  buildDepartmentLedger,
};
