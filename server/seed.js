// Seeds the books with the church's standard departments/funds and the
// income & expense line items already in use on paper, plus a default
// treasurer login. Safe to run multiple times - it only adds what's missing.
const bcrypt = require('bcryptjs');
const db = require('./db');

const GENERAL_FUND_INCOME_ITEMS = [
  'Tithes',
  'Combined Offering 50% Conference',
  'Camp Meeting Offering',
  "Children's Ministry",
  'Youth',
  'Evangelism',
  'Missions/Thanks Offerings',
  'Building Fund/Other Collections',
  'Local Outreach/Ministry/Welfare',
  'Combined Offering 50% Local Church',
  'Offerings (Sabbath School)',
  'Other Promotions',
];

const GENERAL_FUND_EXPENSE_ITEMS = [
  'Pastoral Support / Remittance',
  'Evangelism & Outreach',
  'Church Utilities (Water, Electricity, WiFi)',
  'Maintenance & Repairs',
  'Office & Administrative Expenses',
  "Children's Ministries",
  'Water & Sanitation',
  'KPLC',
  'Women / Dorcas',
  'SS / Lessons Purchases',
  'Youth',
  'Pathfinder',
  'Holy Communion',
  'Donations (Funerals & Sick)',
  'Transportation',
  'Account Signatories',
  'Merry-Go-Round',
  'Tithes to SKC',
  'To Visiwani Church Account',
  'Board Lunch',
  'Choir',
  'Adventurer',
];

const DEPARTMENTS = [
  { name: 'General Fund', kind: 'general', incomeItems: GENERAL_FUND_INCOME_ITEMS, expenseItems: GENERAL_FUND_EXPENSE_ITEMS },
  { name: 'Building / Development', kind: 'ledger', incomeItems: ['Pledge', 'Contribution', 'Donation'], expenseItems: ['Materials', 'Labour', 'Transport', 'Bank/Transaction Charges'] },
  { name: 'Choir', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Uniforms', 'Travel', 'Equipment'] },
  { name: 'Youth Ministry', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Activities', 'Materials'] },
  { name: 'Pathfinder', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Uniforms', 'Camp/Activities'] },
  { name: 'Adventurer', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Uniforms', 'Activities'] },
  { name: "Women's Ministry (Dorcas)", kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Welfare', 'Activities'] },
  { name: "Men's Ministry", kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Activities'] },
  { name: 'Church Budget', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['General Expenses'] },
  { name: 'Holy Communion', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Supplies'] },
  { name: 'Evangelism', kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Crusade Expenses', 'Materials'] },
  { name: "Children's Ministry", kind: 'ledger', incomeItems: ['Contribution'], expenseItems: ['Materials', 'Activities'] },
  { name: 'Sabbath School', kind: 'ledger', incomeItems: ['Contribution', 'Offering'], expenseItems: ['Lesson Quarterlies', 'Materials'] },
];

function seedDepartments() {
  const { state, save, nextId } = db;
  let added = 0;
  for (const dept of DEPARTMENTS) {
    const exists = state.departments.find((d) => d.name.toLowerCase() === dept.name.toLowerCase());
    if (exists) continue;
    state.departments.push({
      id: nextId('departments'),
      name: dept.name,
      kind: dept.kind,
      incomeItems: dept.incomeItems,
      expenseItems: dept.expenseItems,
      openingBalance: 0,
      openingDate: null,
      active: true,
      createdAt: new Date().toISOString(),
    });
    added += 1;
  }
  if (added) save();
  return added;
}

function seedAdmin(username, password) {
  const { state, save, nextId } = db;
  if (state.users.length > 0) return false;
  const passwordHash = bcrypt.hashSync(password, 10);
  state.users.push({
    id: nextId('users'),
    username,
    passwordHash,
    role: 'treasurer',
    createdAt: new Date().toISOString(),
  });
  save();
  return true;
}

if (require.main === module) {
  const added = seedDepartments();
  const createdAdmin = seedAdmin('treasurer', 'visiwani2026');
  console.log(`Seeded ${added} department(s).`);
  if (createdAdmin) {
    console.log('Created default login -> username: treasurer / password: visiwani2026');
    console.log('IMPORTANT: change this password after first login (Settings page).');
  } else {
    console.log('Users already exist - login unchanged.');
  }
}

module.exports = { seedDepartments, seedAdmin };
