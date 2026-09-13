// Shared date/money helpers used by both the dashboard stats and the
// Excel report builders, so "balance as of date X" is computed the same
// way everywhere.

function parseDate(dateStr) {
  // dateStr is always "YYYY-MM-DD" from <input type="date">
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function quarterOfMonth(month1to12) {
  return Math.ceil(month1to12 / 3);
}

function quarterMonths(quarter) {
  const start = (quarter - 1) * 3 + 1;
  return [start, start + 1, start + 2];
}

function weekOfMonth(dateStr) {
  const day = parseDate(dateStr).getUTCDate();
  return Math.min(5, Math.ceil(day / 7));
}

function monthLabel(month1to12) {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][month1to12 - 1];
}

// Net movement (in - out) for a department between two ISO dates (inclusive).
// Pass departmentId = null to total across all departments.
function movement(transactions, { departmentId = null, from = null, to = null } = {}) {
  let inTotal = 0;
  let outTotal = 0;
  for (const t of transactions) {
    if (departmentId !== null && t.departmentId !== departmentId) continue;
    if (from && t.date < from) continue;
    if (to && t.date > to) continue;
    if (t.direction === 'in') inTotal += t.amount;
    else outTotal += t.amount;
  }
  return { in: inTotal, out: outTotal, net: inTotal - outTotal };
}

// Running balance for a department as of a given date (inclusive), starting
// from its recorded opening balance.
function balanceAsOf(department, transactions, asOfDate) {
  const { net } = movement(transactions, {
    departmentId: department.id,
    from: department.openingDate || null,
    to: asOfDate,
  });
  return (department.openingBalance || 0) + net;
}

module.exports = { parseDate, quarterOfMonth, quarterMonths, weekOfMonth, monthLabel, movement, balanceAsOf };
