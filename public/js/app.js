const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmtMoney = (n) => 'Ksh ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const todayStr = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let departments = [];

const ICONS = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5m-1.5-9.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 2v10m6.36-7.36a9 9 0 11-12.72 0"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M7 8l-4 8a4 4 0 008 0l-4-8zm10 0l-4 8a4 4 0 008 0l-4-8zM5 8h4m6 0h4M9 3h6"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
};

/* ---------------- Toasts ---------------- */
function showToast(message, type = 'success') {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.innerHTML = (type === 'error' ? ICONS.warn : ICONS.check) + `<span>${esc(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s ease';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);
  }, 3800);
}

/* ---------------- Modal ---------------- */
const modalOverlay = () => document.getElementById('modalOverlay');

function closeModal() {
  modalOverlay().setAttribute('hidden', '');
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modalFooter').innerHTML = '';
}

function openModal({ title, subtitle, bodyHtml, footerHtml, wide = false, onOpen }) {
  document.getElementById('modalTitle').textContent = title;
  const sub = document.getElementById('modalSubtitle');
  if (subtitle) { sub.textContent = subtitle; sub.hidden = false; } else { sub.hidden = true; }
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  document.getElementById('modalBox').classList.toggle('wide', wide);
  modalOverlay().removeAttribute('hidden');
  if (onOpen) onOpen();
}

function confirmAction({ title, message, confirmLabel = 'Confirm', danger = true }) {
  return new Promise((resolve) => {
    openModal({
      title,
      bodyHtml: `
        <div class="modal-icon-row">
          <div class="icon-wrap" style="${danger ? '' : 'background:var(--primary-50);color:var(--primary-600);'}">${danger ? ICONS.warn : ICONS.check}</div>
          <p style="margin:6px 0 0; font-size:14px; color:var(--text-700); line-height:1.5;">${message}</p>
        </div>`,
      footerHtml: `
        <button class="btn secondary" id="confirmCancel">Cancel</button>
        <button class="btn ${danger ? 'danger' : ''}" id="confirmOk">${esc(confirmLabel)}</button>`,
    });
    document.getElementById('confirmCancel').addEventListener('click', () => { closeModal(); resolve(false); });
    document.getElementById('confirmOk').addEventListener('click', () => { closeModal(); resolve(true); });
  });
}

function setupModalChrome() {
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  modalOverlay().addEventListener('click', (e) => { if (e.target === modalOverlay()) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modalOverlay().hasAttribute('hidden')) closeModal(); });
}

/* ---------------- Button loading state ---------------- */
function setBtnLoading(btn, loading) {
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

/* ---------------- API ---------------- */
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

// Downloads a report as a real file save (not a new tab) and surfaces any
// server-side error as a toast instead of downloading a broken file.
async function downloadReport(url, btn) {
  setBtnLoading(btn, true);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;
      throw new Error((data && data.error) || 'Could not generate that report.');
    }
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : 'report.xlsx';
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    showToast(`Downloaded ${filename}`);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setBtnLoading(btn, false);
  }
}

/* ---------------- Chip input (department category editor) ---------------- */
function renderChipInputHtml(id, items) {
  const chips = (items || []).map((v) => chipHtml(v)).join('');
  return `
    <div class="chip-input" id="${id}" data-items='${esc(JSON.stringify(items || []))}'>
      ${chips}
      <input type="text" placeholder="Type and press Enter to add" data-chip-entry />
    </div>`;
}

function chipHtml(value) {
  return `<span class="chip" data-value="${esc(value)}">${esc(value)}<button type="button" data-remove-chip>${ICONS.x}</button></span>`;
}

function wireChipInput(id) {
  const wrap = document.getElementById(id);
  const input = wrap.querySelector('[data-chip-entry]');

  wrap.addEventListener('click', (e) => {
    if (e.target.closest('[data-remove-chip]')) {
      e.target.closest('.chip').remove();
    } else {
      input.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = input.value.trim();
      if (value) {
        input.insertAdjacentHTML('beforebegin', chipHtml(value));
        input.value = '';
      }
    } else if (e.key === 'Backspace' && !input.value) {
      const chips = wrap.querySelectorAll('.chip');
      if (chips.length) chips[chips.length - 1].remove();
    }
  });
}

function getChipValues(id) {
  return Array.from(document.getElementById(id).querySelectorAll('.chip')).map((c) => c.dataset.value);
}

/* ---------------- Navigation ---------------- */
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
    const ok = await confirmAction({ title: 'Log out?', message: 'You will need your username and password to sign back in.', confirmLabel: 'Log Out', danger: false });
    if (!ok) return;
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

/* ---------------- Departments (shared) ---------------- */
async function loadDepartmentOptions() {
  departments = await api('/api/departments');
  const active = departments.filter((d) => d.active !== false);

  // New entries (transactions, catch-up) can only be recorded against an
  // active department. But reports, filters and statements must still
  // reach a deactivated department's history - deactivating a fund never
  // deletes its past records, so those pickers list every department.
  const entryOnlySelects = ['txnDept', 'catchupDept'];
  const reportingSelects = ['filterDept', 'monthlyDept', 'annualDept', 'rangeDept'];

  function fillSelect(id, list, keepFirst) {
    const el = document.getElementById(id);
    if (!el) return;
    const currentFirst = keepFirst ? el.firstElementChild : null;
    const prevValue = el.value;
    el.innerHTML = '';
    if (currentFirst) el.appendChild(currentFirst);
    list.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name + (d.active === false ? ' (Inactive)' : '');
      el.appendChild(opt);
    });
    if (prevValue && list.some((d) => String(d.id) === prevValue)) el.value = prevValue;
  }

  entryOnlySelects.forEach((id) => fillSelect(id, active, false));
  reportingSelects.forEach((id) => fillSelect(id, departments, id === 'filterDept' || id === 'rangeDept'));

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

function emptyState(message) {
  return `<div class="empty-state">${ICONS.inbox}<p>${esc(message)}</p></div>`;
}

/* ---------------- Dashboard ---------------- */
async function loadDashboard() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  document.getElementById('dashDate').textContent = `Overview for ${MONTH_NAMES[month - 1]} ${year}`;

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
      <div class="top-row"><span class="label">${MONTH_NAMES[month - 1]} Income</span><span class="icon-wrap">${ICONS.check}</span></div>
      <div class="value">${fmtMoney(monthIn)}</div>
    </div>
    <div class="stat-card expense">
      <div class="top-row"><span class="label">${MONTH_NAMES[month - 1]} Expenses</span><span class="icon-wrap">${ICONS.warn}</span></div>
      <div class="value">${fmtMoney(monthOut)}</div>
    </div>
    <div class="stat-card">
      <div class="top-row"><span class="label">${MONTH_NAMES[month - 1]} Net</span><span class="icon-wrap">${ICONS.scale}</span></div>
      <div class="value">${fmtMoney(monthIn - monthOut)}</div>
    </div>
    <div class="stat-card">
      <div class="top-row"><span class="label">Total Transactions</span><span class="icon-wrap">${ICONS.list}</span></div>
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
      return `<tr><td>${esc(d.name)}</td><td class="${bal < 0 ? 'amount-out' : 'amount-in'}">${fmtMoney(bal)}</td></tr>`;
    })
    .join('');
  document.getElementById('deptBalances').innerHTML = balanceRows
    ? `<table><thead><tr><th>Department</th><th>Balance Today</th></tr></thead><tbody>${balanceRows}</tbody></table>`
    : emptyState('No departments yet.');
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
  if (!list.length) return emptyState('No transactions found.');
  const rows = list
    .map(
      (t) => `
    <tr>
      <td>${t.date}</td>
      <td>${esc(t.departmentName)}</td>
      <td>${esc(t.category)}</td>
      <td class="wrap">${esc(t.particulars || '')}</td>
      <td class="${t.direction === 'in' ? 'amount-in' : ''}">${t.direction === 'in' ? fmtMoney(t.amount) : ''}</td>
      <td class="${t.direction === 'out' ? 'amount-out' : ''}">${t.direction === 'out' ? fmtMoney(t.amount) : ''}</td>
      ${showActions ? `<td><div class="row-actions"><button class="icon-btn danger" title="Delete" data-del="${t.id}">${ICONS.trash}</button></div></td>` : ''}
    </tr>`
    )
    .join('');
  return `
    <table>
      <thead><tr><th>Date</th><th>Department</th><th>Category</th><th>Particulars</th><th>Cash In</th><th>Cash Out</th>${showActions ? '<th></th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* ---------------- Transactions ---------------- */
async function loadTransactions() {
  await loadDepartmentOptions();
  if (!document.getElementById('txnDate').value) document.getElementById('txnDate').value = todayStr();
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
      const ok = await confirmAction({ title: 'Delete transaction?', message: 'This entry will be permanently removed and cannot be undone.', confirmLabel: 'Delete' });
      if (!ok) return;
      await api('/api/transactions/' + btn.dataset.del, { method: 'DELETE' });
      showToast('Transaction deleted.');
      refreshTxnTable();
    });
  });
}

function setupTransactionForm() {
  document.getElementById('txnDept').addEventListener('change', updateCategoryList);
  document.getElementById('txnDirection').addEventListener('change', updateCategoryList);
  document.getElementById('filterBtn').addEventListener('click', refreshTxnTable);

  document.getElementById('txnForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('txnSubmitBtn');
    const payload = {
      date: document.getElementById('txnDate').value,
      departmentId: Number(document.getElementById('txnDept').value),
      direction: document.getElementById('txnDirection').value,
      category: document.getElementById('txnCategory').value,
      amount: Number(document.getElementById('txnAmount').value),
      particulars: document.getElementById('txnParticulars').value,
    };
    setBtnLoading(btn, true);
    try {
      await api('/api/transactions', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Transaction saved.');
      document.getElementById('txnCategory').value = '';
      document.getElementById('txnAmount').value = '';
      document.getElementById('txnParticulars').value = '';
      document.getElementById('txnCategory').focus();
      refreshTxnTable();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

/* ---------------- Departments ---------------- */
async function loadDepartments() {
  departments = await api('/api/departments');
  if (!document.getElementById('catchupDate').value) document.getElementById('catchupDate').value = todayStr();
  await loadDepartmentOptions();

  const rows = departments
    .map(
      (d) => `
    <tr>
      <td>${esc(d.name)}</td>
      <td>${fmtMoney(d.openingBalance)}</td>
      <td>${d.openingDate || '—'}</td>
      <td><span class="badge ${d.active === false ? 'inactive' : 'active'}">${d.active === false ? 'Inactive' : 'Active'}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="Edit" data-edit="${d.id}">${ICONS.edit}</button>
          <button class="icon-btn ${d.active === false ? '' : 'danger'}" title="${d.active === false ? 'Reactivate' : 'Deactivate'}" data-toggle="${d.id}">${ICONS.power}</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
  document.getElementById('deptTable').innerHTML = rows
    ? `<table><thead><tr><th>Name</th><th>Opening Balance</th><th>Opening Date</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
    : emptyState('No departments yet.');

  document.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openEditDepartmentModal(Number(btn.dataset.edit)));
  });
  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const dept = departments.find((d) => d.id === Number(btn.dataset.toggle));
      const activating = dept.active === false;
      const ok = await confirmAction({
        title: activating ? 'Reactivate department?' : 'Deactivate department?',
        message: activating
          ? `${esc(dept.name)} will reappear in the department lists for new transactions.`
          : `${esc(dept.name)} will stop appearing for new entries. Its past records and reports are kept exactly as they are.`,
        confirmLabel: activating ? 'Reactivate' : 'Deactivate',
        danger: !activating,
      });
      if (!ok) return;
      if (activating) {
        await api('/api/departments/' + dept.id, { method: 'PUT', body: JSON.stringify({ active: true }) });
      } else {
        await api('/api/departments/' + dept.id, { method: 'DELETE' });
      }
      showToast(`${dept.name} ${activating ? 'reactivated' : 'deactivated'}.`);
      loadDepartments();
    });
  });
}

function openEditDepartmentModal(id) {
  const dept = departments.find((d) => d.id === id);
  if (!dept) return;

  openModal({
    title: `Edit ${dept.name}`,
    subtitle: 'Update the opening balance, date, or category lists for this department.',
    wide: true,
    bodyHtml: `
      <form id="editDeptForm">
        <div class="form-grid" style="margin-bottom:18px;">
          <div class="form-field" style="grid-column: span 2;">
            <label>Name</label>
            <input type="text" id="editDeptName" value="${esc(dept.name)}" required />
          </div>
          <div class="form-field">
            <label>Opening Balance (Ksh)</label>
            <input type="number" id="editDeptBalance" step="0.01" value="${dept.openingBalance || 0}" />
          </div>
          <div class="form-field">
            <label>Opening Date</label>
            <input type="date" id="editDeptDate" value="${dept.openingDate || ''}" />
            <div class="hint">The balance as of this date — transactions before it aren't counted</div>
          </div>
        </div>
        <div class="section-title">Income Categories</div>
        <div class="form-field" style="margin-bottom:16px;">${renderChipInputHtml('editIncomeItems', dept.incomeItems)}</div>
        <div class="section-title">Expense Categories</div>
        <div class="form-field">${renderChipInputHtml('editExpenseItems', dept.expenseItems)}</div>
      </form>`,
    footerHtml: `
      <button class="btn secondary" id="editDeptCancel">Cancel</button>
      <button class="btn" id="editDeptSave">
        <span class="spinner"></span><span class="btn-label">Save Changes</span>
      </button>`,
    onOpen: () => {
      wireChipInput('editIncomeItems');
      wireChipInput('editExpenseItems');
      document.getElementById('editDeptCancel').addEventListener('click', closeModal);
      document.getElementById('editDeptSave').addEventListener('click', async () => {
        const btn = document.getElementById('editDeptSave');
        const payload = {
          name: document.getElementById('editDeptName').value.trim(),
          openingBalance: Number(document.getElementById('editDeptBalance').value) || 0,
          openingDate: document.getElementById('editDeptDate').value || null,
          incomeItems: getChipValues('editIncomeItems'),
          expenseItems: getChipValues('editExpenseItems'),
        };
        if (!payload.name) return showToast('Department name cannot be empty.', 'error');
        setBtnLoading(btn, true);
        try {
          await api('/api/departments/' + dept.id, { method: 'PUT', body: JSON.stringify(payload) });
          showToast('Department updated.');
          closeModal();
          loadDepartments();
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          setBtnLoading(btn, false);
        }
      });
    },
  });
}

function setupDepartmentForm() {
  document.getElementById('deptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const payload = {
      name: document.getElementById('deptName').value,
      kind: 'ledger',
      incomeItems: ['Contribution'],
      expenseItems: ['General Expenses'],
      openingBalance: Number(document.getElementById('deptOpeningBalance').value) || 0,
      openingDate: document.getElementById('deptOpeningDate').value || null,
    };
    setBtnLoading(btn, true);
    try {
      await api('/api/departments', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Department added.');
      document.getElementById('deptForm').reset();
      loadDepartments();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });

  document.getElementById('catchupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('catchupBtn');
    const departmentId = Number(document.getElementById('catchupDept').value);
    const label = document.getElementById('catchupLabel').value.trim();
    const date = document.getElementById('catchupDate').value;
    const income = Number(document.getElementById('catchupIncome').value) || 0;
    const expense = Number(document.getElementById('catchupExpense').value) || 0;

    if (!departmentId) return showToast('Add a department first.', 'error');
    if (!date) return showToast('Choose an entry date.', 'error');
    if (income <= 0 && expense <= 0) return showToast('Enter a total income and/or expense amount greater than zero.', 'error');

    setBtnLoading(btn, true);
    try {
      const category = `Prior Records Catch-Up${label ? ' (' + label + ')' : ''}`;
      if (income > 0) {
        await api('/api/transactions', { method: 'POST', body: JSON.stringify({ date, departmentId, direction: 'in', category, amount: income, particulars: label }) });
      }
      if (expense > 0) {
        await api('/api/transactions', { method: 'POST', body: JSON.stringify({ date, departmentId, direction: 'out', category, amount: expense, particulars: label }) });
      }
      showToast(`Recorded ${label || 'period'} totals for ${departments.find((d) => d.id === departmentId)?.name || 'department'}.`);
      document.getElementById('catchupForm').reset();
      document.getElementById('catchupDate').value = todayStr();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

/* ---------------- Reports ---------------- */
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
  document.getElementById('monthlyBtn').addEventListener('click', (e) => {
    const dept = document.getElementById('monthlyDept').value;
    const month = document.getElementById('monthlyMonth').value;
    const year = document.getElementById('monthlyYear').value;
    if (!dept) return showToast('Add a department first.', 'error');
    downloadReport(`/api/reports/monthly?year=${year}&month=${month}&departmentId=${dept}`, e.currentTarget);
  });

  document.getElementById('quarterlyBtn').addEventListener('click', (e) => {
    const year = document.getElementById('quarterlyYear').value;
    downloadReport(`/api/reports/quarterly?year=${year}`, e.currentTarget);
  });

  document.getElementById('annualBtn').addEventListener('click', (e) => {
    const dept = document.getElementById('annualDept').value;
    const year = document.getElementById('annualYear').value;
    if (!dept) return showToast('Add a department first.', 'error');
    downloadReport(`/api/reports/annual?year=${year}&departmentId=${dept}`, e.currentTarget);
  });

  document.getElementById('rangeBtn').addEventListener('click', (e) => {
    const from = document.getElementById('rangeFrom').value;
    const to = document.getElementById('rangeTo').value;
    const dept = document.getElementById('rangeDept').value;
    if (!from || !to) return showToast('Choose both a "from" and "to" date.', 'error');
    const params = new URLSearchParams({ from, to });
    if (dept) params.set('departmentId', dept);
    downloadReport('/api/reports/range?' + params.toString(), e.currentTarget);
  });

  document.getElementById('genBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const year = Number(document.getElementById('genYear').value);
    const quarter = Number(document.getElementById('genQuarter').value);
    setBtnLoading(btn, true);
    try {
      await api('/api/reports/generate-quarter', { method: 'POST', body: JSON.stringify({ year, quarter }) });
      showToast(`Q${quarter} ${year} report generated.`);
      loadGeneratedReports();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

async function loadGeneratedReports() {
  await loadDepartmentOptions();
  const files = await api('/api/reports/generated');
  if (!files.length) {
    document.getElementById('generatedTable').innerHTML = emptyState('No reports generated yet.');
    return;
  }
  const rows = files
    .map(
      (f) => `
    <tr>
      <td>${esc(f.filename)}</td>
      <td>${new Date(f.generatedAt).toLocaleString()}</td>
      <td><button class="btn small secondary" data-dl="${encodeURIComponent(f.filename)}">Download</button></td>
    </tr>`
    )
    .join('');
  document.getElementById('generatedTable').innerHTML = `
    <table><thead><tr><th>File</th><th>Generated</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  document.querySelectorAll('[data-dl]').forEach((btn) => {
    btn.addEventListener('click', (e) => downloadReport('/api/reports/generated/' + btn.dataset.dl, e.currentTarget));
  });
}

/* ---------------- Settings ---------------- */
function setupSettings() {
  document.getElementById('pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pwSubmitBtn');
    const currentPassword = document.getElementById('curPw').value;
    const newPassword = document.getElementById('newPw').value;
    setBtnLoading(btn, true);
    try {
      await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      showToast('Password updated.');
      document.getElementById('pwForm').reset();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  });
}

/* ---------------- Init ---------------- */
async function init() {
  try {
    const me = await api('/api/auth/me');
    document.getElementById('whoName').textContent = me.username;
    document.getElementById('avatarInitial').textContent = me.username.charAt(0).toUpperCase();
  } catch {
    return;
  }

  setupModalChrome();
  setupNav();
  setupTransactionForm();
  setupDepartmentForm();
  setupReportButtons();
  setupSettings();
  populateReportDefaults();

  await loadDashboard();
}

init();
