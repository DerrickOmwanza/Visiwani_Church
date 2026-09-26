const express = require('express');
const db = require('../db');

const router = express.Router();

function serialize(t) {
  const dept = db.state.departments.find((d) => d.id === t.departmentId);
  return { ...t, departmentName: dept ? dept.name : 'Unknown' };
}

// Every date computation in this app (running balances, week-of-month,
// quarter/month boundaries) relies on "YYYY-MM-DD" strings sorting and
// parsing correctly. The browser's <input type="date"> always produces
// that shape, but a direct API call could send anything - checking it
// here keeps one bad date from silently corrupting that one entry's
// place in every report it appears in.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(dateStr) {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

// A transaction can optionally be built from line items (description,
// quantity, unit price) instead of one lump amount - e.g. a building
// expense that was really "3 bags cement @ 800" plus "2 fundis, 1 day @
// 1,500" paid together. When items are given, the total is always
// computed from them here, never trusted from the client, so the amount
// can never drift from what the items actually add up to. Any item
// missing a description, a positive quantity, or a valid price is
// dropped rather than rejecting the whole request, so one bad row
// doesn't block the rest.
function normalizeItems(items) {
  if (!Array.isArray(items)) return null;
  const cleaned = [];
  for (const raw of items) {
    const description = String((raw && raw.description) ?? '').trim();
    const quantity = Number(raw && raw.quantity);
    const unitPrice = Number(raw && raw.unitPrice);
    if (!description) continue;
    if (!quantity || quantity <= 0) continue;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    cleaned.push({ description, quantity, unitPrice, lineTotal: round2(quantity * unitPrice) });
  }
  return cleaned;
}

function itemsTotal(items) {
  return round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// GET /api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD&departmentId=1&direction=in
router.get('/', (req, res) => {
  const { from, to, departmentId, direction } = req.query;
  let list = [...db.state.transactions];

  if (from) list = list.filter((t) => t.date >= from);
  if (to) list = list.filter((t) => t.date <= to);
  if (departmentId) list = list.filter((t) => t.departmentId === Number(departmentId));
  if (direction) list = list.filter((t) => t.direction === direction);

  list.sort((a, b) => (a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1));
  res.json(list.map(serialize));
});

router.post('/', (req, res) => {
  const { date, departmentId, direction, category, amount, particulars, recordedBy, items } = req.body || {};

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!isValidDate(date)) return res.status(400).json({ error: 'Date must be a valid date in YYYY-MM-DD format' });
  if (!departmentId) return res.status(400).json({ error: 'Department is required' });
  if (direction !== 'in' && direction !== 'out') return res.status(400).json({ error: "Direction must be 'in' or 'out'" });

  const cleanedItems = normalizeItems(items);
  const itemized = cleanedItems && cleanedItems.length > 0;
  let numAmount;
  if (itemized) {
    numAmount = itemsTotal(cleanedItems);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'The itemized amounts must add up to more than zero' });
  } else {
    numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  const dept = db.state.departments.find((d) => d.id === Number(departmentId));
  if (!dept) return res.status(400).json({ error: 'Unknown department' });

  const txn = {
    id: db.nextId('transactions'),
    date,
    departmentId: Number(departmentId),
    direction,
    category: (category || '').trim() || (direction === 'in' ? 'Other Income' : 'Other Expense'),
    amount: numAmount,
    particulars: (particulars || '').trim(),
    recordedBy: recordedBy || (req.session && req.session.username) || 'treasurer',
    createdAt: new Date().toISOString(),
  };
  if (itemized) txn.items = cleanedItems;
  db.state.transactions.push(txn);
  db.save();
  res.status(201).json(serialize(txn));
});

router.put('/:id', (req, res) => {
  const txn = db.state.transactions.find((t) => t.id === Number(req.params.id));
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  const { date, departmentId, direction, category, amount, particulars, items } = req.body || {};
  if (date) {
    if (!isValidDate(date)) return res.status(400).json({ error: 'Date must be a valid date in YYYY-MM-DD format' });
    txn.date = date;
  }
  if (departmentId) {
    const dept = db.state.departments.find((d) => d.id === Number(departmentId));
    if (!dept) return res.status(400).json({ error: 'Unknown department' });
    txn.departmentId = Number(departmentId);
  }
  if (direction === 'in' || direction === 'out') txn.direction = direction;
  if (category !== undefined) txn.category = category.trim() || (txn.direction === 'in' ? 'Other Income' : 'Other Expense');

  let itemsHandled = false;
  if (items !== undefined) {
    const cleanedItems = normalizeItems(items);
    if (cleanedItems && cleanedItems.length > 0) {
      txn.items = cleanedItems;
      txn.amount = itemsTotal(cleanedItems);
      itemsHandled = true;
    } else {
      delete txn.items; // switched back to a plain lump amount
    }
  }
  if (!itemsHandled && amount !== undefined) {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });
    txn.amount = numAmount;
  }
  if (particulars !== undefined) txn.particulars = particulars.trim();
  txn.updatedAt = new Date().toISOString();

  db.save();
  res.json(serialize(txn));
});

router.delete('/:id', (req, res) => {
  const idx = db.state.transactions.findIndex((t) => t.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Transaction not found' });
  db.state.transactions.splice(idx, 1);
  db.save();
  res.json({ ok: true });
});

module.exports = router;
