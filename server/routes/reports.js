const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const builder = require('../reports/excelBuilder');

const router = express.Router();
const GENERATED_DIR = path.join(__dirname, '..', '..', 'data', 'reports', 'generated');

function ensureDir() {
  if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

function findDepartment(id) {
  return db.state.departments.find((d) => d.id === Number(id));
}

// Express 4 does not catch rejected promises thrown inside an async route
// handler - an uncaught rejection crashes the whole Node process instead
// of just failing the one request. Every async handler below is wrapped
// with this so a bad report request can never take the server down.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

// GET /api/reports/monthly?year=2026&month=1&departmentId=1
router.get('/monthly', asyncHandler(async (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!year || !month || month < 1 || month > 12) return res.status(400).json({ error: 'Valid year and month (1-12) are required' });

  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : (db.state.departments.find((d) => d.kind === 'general') || db.state.departments[0] || {}).id;
  const department = findDepartment(departmentId);
  if (!department) return res.status(400).json({ error: 'Department not found' });

  const wb = builder.buildMonthlyStatement({ department, transactions: db.state.transactions, year, month });
  await sendWorkbook(res, wb, `Visiwani_${department.name.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.xlsx`);
}));

// GET /api/reports/quarterly?year=2026
router.get('/quarterly', asyncHandler(async (req, res) => {
  const year = Number(req.query.year);
  if (!year) return res.status(400).json({ error: 'Year is required' });

  const wb = builder.buildQuarterlySummary({ departments: db.state.departments, transactions: db.state.transactions, year });
  await sendWorkbook(res, wb, `Visiwani_Departmental_Summary_${year}.xlsx`);
}));

// GET /api/reports/annual?year=2026&departmentId=1
router.get('/annual', asyncHandler(async (req, res) => {
  const year = Number(req.query.year);
  if (!year) return res.status(400).json({ error: 'Year is required' });

  const departmentId = req.query.departmentId ? Number(req.query.departmentId) : (db.state.departments.find((d) => d.kind === 'general') || db.state.departments[0] || {}).id;
  const department = findDepartment(departmentId);
  if (!department) return res.status(400).json({ error: 'Department not found' });

  const wb = builder.buildAnnualSummary({ department, transactions: db.state.transactions, year });
  await sendWorkbook(res, wb, `Visiwani_${department.name.replace(/\s+/g, '_')}_Annual_${year}.xlsx`);
}));

// GET /api/reports/range?from=2026-01-01&to=2026-03-31&departmentId=optional
router.get('/range', asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });
  if (from > to) return res.status(400).json({ error: '"from" date must be before "to" date' });

  const department = req.query.departmentId ? findDepartment(req.query.departmentId) : null;
  if (req.query.departmentId && !department) return res.status(400).json({ error: 'Department not found' });

  const wb = builder.buildRangeStatement({ department, departments: db.state.departments, transactions: db.state.transactions, from, to });
  const label = department ? department.name.replace(/\s+/g, '_') : 'All_Departments';
  await sendWorkbook(res, wb, `Visiwani_Statement_${label}_${from}_to_${to}.xlsx`);
}));

// GET /api/reports/ledger/:departmentId?from=&to=
router.get('/ledger/:departmentId', asyncHandler(async (req, res) => {
  const department = findDepartment(req.params.departmentId);
  if (!department) return res.status(404).json({ error: 'Department not found' });
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' });

  const wb = builder.buildDepartmentLedger({ department, transactions: db.state.transactions, from, to });
  await sendWorkbook(res, wb, `Visiwani_${department.name.replace(/\s+/g, '_')}_Ledger_${from}_to_${to}.xlsx`);
}));

// Generate & save the given quarter's report set to disk (used by the
// scheduled cron job, and available on demand from Settings).
async function generateQuarterToDisk(year, quarter) {
  ensureDir();
  const wb = builder.buildQuarterlySummary({ departments: db.state.departments, transactions: db.state.transactions, year });
  const filename = `Visiwani_Departmental_Summary_${year}_Q${quarter}.xlsx`;
  const filePath = path.join(GENERATED_DIR, filename);
  await wb.xlsx.writeFile(filePath);
  return { filename, generatedAt: new Date().toISOString(), year, quarter };
}

router.post('/generate-quarter', async (req, res) => {
  const year = Number(req.body.year);
  const quarter = Number(req.body.quarter);
  if (!year || !quarter || quarter < 1 || quarter > 4) return res.status(400).json({ error: 'Valid year and quarter (1-4) are required' });
  try {
    const info = await generateQuarterToDisk(year, quarter);
    res.status(201).json(info);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', detail: err.message });
  }
});

router.get('/generated', (req, res) => {
  ensureDir();
  const files = fs
    .readdirSync(GENERATED_DIR)
    .filter((f) => f.endsWith('.xlsx'))
    .map((f) => {
      const stat = fs.statSync(path.join(GENERATED_DIR, f));
      return { filename: f, generatedAt: stat.mtime.toISOString(), size: stat.size };
    })
    .sort((a, b) => (a.generatedAt < b.generatedAt ? 1 : -1));
  res.json(files);
});

router.get('/generated/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(GENERATED_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Report not found' });
  res.download(filePath, filename);
});

module.exports = { router, generateQuarterToDisk };
