const express = require('express');
const db = require('../db');

const router = express.Router();

function serialize(t) {
  const dept = db.state.departments.find((d) => d.id === t.departmentId);
  return { ...t, departmentName: dept ? dept.name : 'Unknown' };
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
  const { date, departmentId, direction, category, amount, particulars, recordedBy } = req.body || {};

  if (!date) return res.status(400).json({ error: 'Date is required' });
  if (!departmentId) return res.status(400).json({ error: 'Department is required' });
  if (direction !== 'in' && direction !== 'out') return res.status(400).json({ error: "Direction must be 'in' or 'out'" });
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Amount must be a positive number' });

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
  db.state.transactions.push(txn);
  db.save();
  res.status(201).json(serialize(txn));
});

router.put('/:id', (req, res) => {
  const txn = db.state.transactions.find((t) => t.id === Number(req.params.id));
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  const { date, departmentId, direction, category, amount, particulars } = req.body || {};
  if (date) txn.date = date;
  if (departmentId) {
    const dept = db.state.departments.find((d) => d.id === Number(departmentId));
    if (!dept) return res.status(400).json({ error: 'Unknown department' });
    txn.departmentId = Number(departmentId);
  }
  if (direction === 'in' || direction === 'out') txn.direction = direction;
  if (category !== undefined) txn.category = category.trim();
  if (amount !== undefined) {
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
