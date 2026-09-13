const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMoney = (n) => 'Ksh ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().slice(0, 10);

let departments = [];

function showToast(message, isError = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login.html';
    throw new Error('Not logged in');
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error((data && data.error) || 'Request failed');
  return data;
}

function downloadUrl(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---------------- Navigation ----------------
function setupNav() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('view-' + item.dataset.view).classList.add('active');
      onViewShown(item.dataset.view);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });
}

function onViewShown(view) {
  if (view === 'dashboard') loadDashboard();
  if (view === 'transactions') loadTransactions();
  if (view === 'departments') loadDepartments();
  if (view === 'reports') loadGeneratedReports();
}

// ---------------- Departments (shared) ----------------
async function loadDepartmentOptions() {
  departments = await api('/api/departments');
  const active = departments.filter((d) => d.active !== false);

  const selects = ['txnDept', 'filterDept', 'monthlyDept', 'annualDept', 'rangeDept'];
  selects.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const keepFirst = id === 'filterDept' || id === 'rangeDept';
    const currentFirst = keepFirst ? el.firstElementChild : null;
    el.innerHTML = '';
    if (currentFirst) el.appendChild(currentFirst);
    active.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      el.appendChild(opt);
    });
  });

  updateCategoryList();
}

function updateCategoryList() {
  const deptId = Number(document.getElementById('txnDept').value);
  const direction = document.getElementById('txnDirection').value;
  const dept = departments.find((d) => d.id === deptId);
  const list = document.getElementById('categoryList');
  list.innerHTML = '';
  if (!dept) return;
  const items = direction === 'in' ? dept.incomeItems : dept.expenseItems;
  (items || []).forEach((item) => {
    const opt = document.createElement('option');
    opt.value = item;
    list.appendChild(opt);
  });
}

// ---------------- Dashboard ----------------
async function loadDashboard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStr = String(month).padStart(2, '0');
  const from = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const [monthTxns, allTxns] = await Promise.all([
    api(`/api/transactions?from=${from}&to=${to}`),
    api('/api/transactions'),
  ]);

  const monthIn = monthTxns.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
  const monthOut = monthTxns.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0);

  document.getElementById('dashCards').innerHTML = `
    <div class="stat-card income">
      <div class="label">${MONTH_NAMES[month - 1]} Income</div>
      <div class="value">${fmtMoney(monthIn)}</div>
    </div>
    <div class="stat-card expense">
      <div class="label">${MONTH_NAMES[month - 1]} Expenses</div>
      <div class="value">${fmtMoney(monthOut)}</div>
    </div>
    <div class="stat-card">
      <div class="label">${MONTH_NAMES[month - 1]} Net</div>
      <div class="value">${fmtMoney(monthIn - monthOut)}</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Transactions Recorded</div>
      <div class="value">${allTxns.length}</div>
    </div>
  `;

  const recent = [...allTxns].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1)).slice(0, 10);
  document.getElementById('recentTxns').innerHTML = renderTxnTable(recent, false);

  await loadDepartmentOptions();
  const balanceRows = departments
    .filter((d) => d.active !== false)
    .map((d) => {
      const bal = computeBalance(d, allTxns, todayStr());
      return `<tr><td>${d.name}</td><td>${fmtMoney(bal)}</td></tr>`;
    })
    .join('');
  document.getElementById('deptBalances').innerHTML = `
    <table><thead><tr><th>Department</th><th>Balance Today</th></tr></thead><tbody>${balanceRows || '<tr><td colspan="2">No departments yet.</td></tr>'}</tbody></table>
  `;
}

function computeBalance(dept, allTxns, asOfDate) {
  let bal = dept.openingBalance || 0;
  const from = dept.openingDate || null;
  for (const t of allTxns) {
    if (t.departmentId !== dept.id) continue;
    if (from && t.date < from) continue;
    if (t.date > asOfDate) continue;
    bal += t.direction === 'in' ? t.amount : -t.amount;
  }
  return bal;
}

function renderTxnTable(list, showActions = true) {
  if (!list.length) return '<p class="muted">No transactions found.</p>';
  const rows = list
    .map(
      (t) => `
    <tr>
      <td>${t.date}</td>
      <td>${t.departmentName}</td>
      <td>${t.category}</td>
      <td>${t.particulars || ''}</td>
      <td class="${t.direction === 'in' ? 'amount-in' : ''}">${t.direction === 'in' ? fmtMoney(t.amount) : ''}</td>
      <td class="${t.direction === 'out' ? 'amount-out' : ''}">${t.direction === 'out' ? fmtMoney(t.amount) : ''}</td>
      ${showActions ? `<td><button class="btn small danger" data-del="${t.id}">Delete</button></td>` : ''}
    </tr>`
    )
    .join('');
  return `
    <table>
      <thead><tr><th>Date</th><th>Department</th><th>Category</th><th>Particulars</th><th>Cash In</th><th>Cash Out</th>${showActions ? '<th></th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ---------------- Transactions ----------------
async function loadTransactions() {
  await loadDepartmentOptions();
  document.getElementById('txnDate').value = todayStr();
  await refreshTxnTable();
}

async function refreshTxnTable() {
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;
  const deptId = document.getElementById('filterDept').value;
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (deptId) params.set('departmentId', deptId);

  const list = await api('/api/transactions?' + params.toString());
  list.sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
  const container = document.getElementById('txnTable');
  container.innerHTML = renderTxnTable(list, true);
  container.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this transaction? This cannot be undone.')) return;
      await api('/api/transactions/' + btn.dataset.del, { method: 'DELETE' });
      showToast('Transaction deleted.');
      refreshTxnTable();
      loadDashboard();
    });
  });
}

function setupTransactionForm() {
  document.getElementById('txnDept').addEventListener('change', updateCategoryList);
  document.getElementById('txnDirection').addEventListener('change', updateCategoryList);
  document.getElementById('filterBtn').addEventListener('click', refreshTxnTable);

  document.getElementById('txnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      date: document.getElementById('txnDate').value,
      departmentId: Number(document.getElementById('txnDept').value),
      direction: document.getElementById('txnDirection').value,
      category: document.getElementById('txnCategory').value,
      amount: Number(document.getElementById('txnAmount').value),
      particulars: document.getElementById('txnParticulars').value,
    };
    try {
      await api('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Transaction saved.');
      document.getElementById('txnCategory').value = '';
      document.getElementById('txnAmount').value = '';
      document.getElementById('txnParticulars').value = '';
      refreshTxnTable();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ---------------- Departments ----------------
async function loadDepartments() {
  departments = await api('/api/departments');
  const rows = departments
    .map(
      (d) => `
    <tr>
      <td>${d.name} ${d.active === false ? '<span class="muted">(inactive)</span>' : ''}</td>
      <td>${fmtMoney(d.openingBalance)}</td>
      <td>${d.openingDate || '-'}</td>
      <td>${d.active === false ? '' : `<button class="btn small danger" data-deact="${d.id}">Deactivate</button>`}</td>
    </tr>`
    )
    .join('');
  document.getElementById('deptTable').innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Opening Balance</th><th>Opening Date</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.querySelectorAll('[data-deact]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Deactivate this department? It will stop showing up for new entries, but past records are kept.')) return;
      await api('/api/departments/' + btn.dataset.deact, { method: 'DELETE' });
      showToast('Department updated.');
      loadDepartments();
    });
  });
}

function setupDepartmentForm() {
  document.getElementById('deptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('deptName').value,
      kind: 'ledger',
      incomeItems: ['Contribution'],
      expenseItems: ['General Expenses'],
      openingBalance: Number(document.getElementById('deptOpeningBalance').value) || 0,
      openingDate: document.getElementById('deptOpeningDate').value || null,
    };
    try {
      await api('/api/departments', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Department added.');
      document.getElementById('deptForm').reset();
      loadDepartments();
      loadDepartmentOptions();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ---------------- Reports ----------------
function populateReportDefaults() {
  const now = new Date();
  const monthSelect = document.getElementById('monthlyMonth');
  monthSelect.innerHTML = MONTH_NAMES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
  monthSelect.value = now.getMonth() + 1;

  ['monthlyYear', 'quarterlyYear', 'annualYear', 'genYear'].forEach((id) => {
    document.getElementById(id).value = now.getFullYear();
  });

  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  document.getElementById('genQuarter').value = quarter;

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  document.getElementById('rangeFrom').value = firstOfMonth;
  document.getElementById('rangeTo').value = todayStr();
}

function setupReportButtons() {
  document.getElementById('monthlyBtn').addEventListener('click', () => {
    const dept = document.getElementById('monthlyDept').value;
    const month = document.getElementById('monthlyMonth').value;
    const year = document.getElementById('monthlyYear').value;
    if (!dept) return showToast('Add a department first.', true);
    downloadUrl(`/api/reports/monthly?year=${year}&month=${month}&departmentId=${dept}`);
  });

  document.getElementById('quarterlyBtn').addEventListener('click', () => {
    const year = document.getElementById('quarterlyYear').value;
    downloadUrl(`/api/reports/quarterly?year=${year}`);
  });

  document.getElementById('annualBtn').addEventListener('click', () => {
    const dept = document.getElementById('annualDept').value;
    const year = document.getElementById('annualYear').value;
    if (!dept) return showToast('Add a department first.', true);
    downloadUrl(`/api/reports/annual?year=${year}&departmentId=${dept}`);
  });

  document.getElementById('rangeBtn').addEventListener('click', () => {
    const from = document.getElementById('rangeFrom').value;
    const to = document.getElementById('rangeTo').value;
    const dept = document.getElementById('rangeDept').value;
    if (!from || !to) return showToast('Choose both a "from" and "to" date.', true);
    const params = new URLSearchParams({ from, to });
    if (dept) params.set('departmentId', dept);
    downloadUrl('/api/reports/range?' + params.toString());
  });

  document.getElementById('genBtn').addEventListener('click', async () => {
    const year = Number(document.getElementById('genYear').value);
    const quarter = Number(document.getElementById('genQuarter').value);
    try {
      await api('/api/reports/generate-quarter', { method: 'POST', body: JSON.stringify({ year, quarter }) });
      showToast(`Q${quarter} ${year} report generated.`);
      loadGeneratedReports();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

async function loadGeneratedReports() {
  await loadDepartmentOptions();
  const files = await api('/api/reports/generated');
  if (!files.length) {
    document.getElementById('generatedTable').innerHTML = '<p class="muted">No reports generated yet.</p>';
    return;
  }
  const rows = files
    .map(
      (f) => `
    <tr>
      <td>${f.filename}</td>
      <td>${new Date(f.generatedAt).toLocaleString()}</td>
      <td><button class="btn small" data-dl="${encodeURIComponent(f.filename)}">Download</button></td>
    </tr>`
    )
    .join('');
  document.getElementById('generatedTable').innerHTML = `
    <table><thead><tr><th>File</th><th>Generated</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  document.querySelectorAll('[data-dl]').forEach((btn) => {
    btn.addEventListener('click', () => downloadUrl('/api/reports/generated/' + btn.dataset.dl));
  });
}

// ---------------- Settings ----------------
function setupSettings() {
  document.getElementById('pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('curPw').value;
    const newPassword = document.getElementById('newPw').value;
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      showToast('Password updated.');
      document.getElementById('pwForm').reset();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ---------------- Init ----------------
async function init() {
  try {
    const me = await api('/api/auth/me');
    document.getElementById('whoami').textContent = 'Logged in as ' + me.username;
  } catch {
    return;
  }

  setupNav();
  setupTransactionForm();
  setupDepartmentForm();
  setupReportButtons();
  setupSettings();
  populateReportDefaults();

  await loadDashboard();
}

init();
