const express = require('express');
const db = require('../db');

const router = express.Router();

// Category names are matched case-insensitively everywhere reports sum
// them up - a duplicate entry (even differing only in case) would make a
// single transaction get counted twice in the Monthly Statement and
// Annual Summary, since each report walks the item list once per entry.
// Deduping here, at the only place items get saved, keeps that
// impossible regardless of how the list was built.
function dedupeItems(items) {
  const seen = new Set();
  const out = [];
  for (const raw of items) {
    const trimmed = String(raw).trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

router.get('/', (req, res) => {
  const list = [...db.state.departments].sort((a, b) => a.name.localeCompare(b.name));
  res.json(list);
});

router.post('/', (req, res) => {
  const { name, kind, incomeItems, expenseItems, openingBalance, openingDate } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Department name is required' });

  const exists = db.state.departments.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());
  if (exists) return res.status(409).json({ error: 'A department with this name already exists' });

  const dept = {
    id: db.nextId('departments'),
    name: name.trim(),
    kind: kind === 'general' ? 'general' : 'ledger',
    incomeItems: Array.isArray(incomeItems) ? dedupeItems(incomeItems) : [],
    expenseItems: Array.isArray(expenseItems) ? dedupeItems(expenseItems) : [],
    openingBalance: Number(openingBalance) || 0,
    openingDate: openingDate || null,
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.state.departments.push(dept);
  db.save();
  res.status(201).json(dept);
});

router.put('/:id', (req, res) => {
  const dept = db.state.departments.find((d) => d.id === Number(req.params.id));
  if (!dept) return res.status(404).json({ error: 'Department not found' });

  const { name, incomeItems, expenseItems, openingBalance, openingDate, active } = req.body || {};
  if (name && name.trim()) {
    const trimmed = name.trim();
    const collision = db.state.departments.find((d) => d.id !== dept.id && d.name.toLowerCase() === trimmed.toLowerCase());
    if (collision) return res.status(409).json({ error: 'A department with this name already exists' });
    dept.name = trimmed;
  }
  if (Array.isArray(incomeItems)) dept.incomeItems = dedupeItems(incomeItems);
  if (Array.isArray(expenseItems)) dept.expenseItems = dedupeItems(expenseItems);
  if (openingBalance !== undefined) dept.openingBalance = Number(openingBalance) || 0;
  if (openingDate !== undefined) dept.openingDate = openingDate || null;
  if (active !== undefined) dept.active = !!active;

  db.save();
  res.json(dept);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const used = db.state.transactions.some((t) => t.departmentId === id);
  if (used) {
    // Never delete a fund that already has recorded history - deactivate it instead
    // so past reports stay accurate.
    const dept = db.state.departments.find((d) => d.id === id);
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    dept.active = false;
    db.save();
    return res.json({ ok: true, deactivated: true });
  }
  const idx = db.state.departments.findIndex((d) => d.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Department not found' });
  db.state.departments.splice(idx, 1);
  db.save();
  res.json({ ok: true, deleted: true });
});

module.exports = router;
