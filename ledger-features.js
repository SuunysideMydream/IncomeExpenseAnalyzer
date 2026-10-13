/* Daily-use ledger UI; app-v2.js owns the shared state and existing views. */
const esc = Finance.escape;
let txFilters = {query:'', type:'', category:'', card:''};
let txSort = 'newest';
let txOverrides = {};
let undoTransaction = null;
let ledgerEventsBound = false;

function monthOptions(selected) {
  return Finance.months(txs(), data.months.map(row => row.month)).reverse()
    .map(month => `<option value="${month}" ${month === selected ? 'selected' : ''}>${monthText(month)}</option>`).join('');
}
function liveMonths() { return Finance.monthly(txs(), data.months.map(row => row.month)); }
function matchingTransactions(month = txMonth) { return Finance.filter(txs(), {...txFilters, month}, cards()); }
function signedMoney(value) { return `${value < 0 ? '−' : ''}${baht2(value)}`; }
function ledgerDays() {
  const days = Finance.daily(matchingTransactions());
  if (txSort === 'oldest') days.reverse();
  if (txSort === 'highest') days.sort((a,b) => b.expense - a.expense || b.date.localeCompare(a.date));
  return days;
}
function ledgerView() {
  const rows = matchingTransactions(), days = ledgerDays(), per = 10, totals = Finance.totals(rows);
  page = Math.min(page, Math.max(0, Math.ceil(days.length / per) - 1));
  const option = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
  return `<div class="toolbar"><div><h2>Transactions</h2><div class="period">Your daily ledger, with every entry editable</div></div><button class="primary" data-action="add-tx">＋ Add transaction</button></div>
    <div class="card ledger-workspace"><div class="ledger-controls">
      <div class="view-switch"><button class="${txMode === 'day' ? 'active' : ''}" data-action="mode-day">Daily summary</button><button class="${txMode === 'month' ? 'active' : ''}" data-action="mode-month">Month totals</button></div>
      <label>Month <select data-action="tx-month">${monthOptions(txMonth)}</select></label>
      <button class="secondary" data-ledger="export">Export CSV</button>
    </div>
    ${txMode === 'day' ? `<form id="ledger-filters" class="ledger-filters">
      <label class="ledger-search">Search entries<input name="query" id="ledger-search" type="search" placeholder="Note, category, card or date" value="${esc(txFilters.query)}"></label>
      <label>Type<select name="type">${option('', 'All types', txFilters.type)}${option('expense','Expense',txFilters.type)}${option('income','Income',txFilters.type)}</select></label>
      <label>Category<select name="category">${option('','All categories',txFilters.category)}${categories().map(name => option(name,name,txFilters.category)).join('')}</select></label>
      <label>Payment<select name="card">${option('','All payment methods',txFilters.card)}${option('cash','Cash / bank / unspecified',txFilters.card)}${cards().map(card => option(card.id,card.name,txFilters.card)).join('')}</select></label>
      <label>Sort days<select name="sort">${option('newest','Newest first',txSort)}${option('oldest','Oldest first',txSort)}${option('highest','Highest spending',txSort)}</select></label>
      <button class="primary" type="submit">Search</button><button class="secondary" type="button" data-ledger="clear">Clear filters</button>
    </form>
    <div class="ledger-totals" aria-live="polite"><span>${rows.length} matching records · ${days.length} days</span><span>Income <b class="positive">${baht2(totals.income)}</b></span><span>Spending <b class="negative">${baht2(totals.expense)}</b></span><span>Net <b>${signedMoney(totals.net)}</b></span></div>
    <p class="ledger-hint">Filters match whole records. Workbook records can contain several categories and both income and spending; their totals stay intact.</p>
    ${dailyLedger(days.slice(page * per, page * per + per), days.length, per)}` : `<p class="ledger-hint">All records in the latest 12 available months up to ${monthText(txMonth)}. Daily filters do not apply here.</p>${monthlyLedger()}`}
    </div>`;
}
function monthTotalsView() {
  return `<div class="table-wrap"><table><thead><tr><th>Month</th><th class="amount">Income</th><th class="amount">Spending</th><th class="amount">Net</th><th></th></tr></thead><tbody>${liveMonths().filter(row => row.month <= txMonth).slice(-12).reverse().map(row => `<tr><td>${monthText(row.month)}</td><td class="amount positive">${baht2(row.income)}</td><td class="amount negative">${baht2(row.expense)}</td><td class="amount ${row.net < 0 ? 'negative' : 'positive'}">${signedMoney(row.net)}</td><td><button class="edit-row" data-open-month="${row.month}">Open days</button></td></tr>`).join('')}</tbody></table></div>`;
}
function transactionDetails(date) {
  const rows = (active === 'transactions' ? matchingTransactions() : txs()).filter(row => row.date === date), sum = Finance.totals(rows);
  return `<div class="detail-summary"><div><span>Date</span><b>${esc(date)}</b></div><div><span>Income</span><b>${baht2(sum.income)}</b></div><div><span>Spending</span><b>${baht2(sum.expense)}</b></div></div>
    <p class="ledger-hint">Workbook entries represent a day’s totals, not individual receipts. Editing preserves their separate income and category amounts.</p>
    <div class="entry-list">${rows.map(row => `<article class="entry-item" style="--entry-accent:${row.income && row.expense ? '#8f79ca' : row.income ? '#2c9b72' : '#df725f'}"><div><div class="entry-heading"><span class="entry-symbol" aria-hidden="true">${row.income && row.expense ? '↕' : row.income ? '↗' : '↘'}</span><strong>${row.source === 'workbook' ? 'Workbook daily record' : row.income ? 'Income' : 'Expense'}</strong></div>
      <div class="entry-category-chips">${Object.entries(row.categories || {}).filter(([,amount]) => amount).map(([name,amount]) => `<span class="entry-category-chip" style="--category-color:${/^#[0-9a-f]{6}$/i.test(meta(name).color)?meta(name).color:'#718096'}">${esc(name)} <b>${baht2(amount)}</b></span>`).join('') || `<span class="entry-category-chip" style="--category-color:#2c9b72">${esc(row.category || 'Uncategorized')}</span>`}</div>
      <p>${esc(row.note || 'No note')}${row.card ? ` · ${esc(cards().find(card => card.id === row.card)?.name || 'Card')}` : ''}</p>
      <div class="entry-amounts">${row.income ? `<span class="positive">Income +${baht2(row.income)}</span> ` : ''}${row.expense ? `<span class="negative">Spending −${baht2(row.expense)}</span>` : ''}</div></div>
      <div class="entry-actions"><button class="edit-row" data-tx-edit="${esc(row.id)}">Edit</button><button class="secondary" data-tx-duplicate="${esc(row.id)}">Duplicate</button><button class="secondary danger" data-tx-delete="${esc(row.id)}">Delete</button></div></article>`).join('') || '<p>No matching entries.</p>'}</div>`;
}
function transactionFields(row = {}) {
  const aggregate = row.source === 'workbook' || Object.keys(row.categories || {}).length > 1 || (row.income > 0 && row.expense > 0);
  const type = row.income > 0 && !row.expense ? 'income' : 'expense';
  const cat = row.category || Object.keys(row.categories || {}).find(key => row.categories[key]) || '';
  return `<div class="form-section" data-transaction-form data-aggregate="${aggregate}"><div class="form-grid">
    <div class="field"><label for="date">Date</label><input id="date" type="date" required value="${esc(row.date || Finance.localDate())}"></div>
    ${aggregate ? `<div class="field"><label for="income">Income (THB)</label><input id="income" type="number" min="0" step=".01" value="${row.income || 0}"></div>
      <div class="field"><label for="expense">Total spending (THB)</label><input id="expense" type="number" min="0" step=".01" value="${row.expense || 0}"></div>
      <div class="field full"><p class="ledger-hint">Keep the total and category breakdown consistent. Any unallocated spending stays uncategorized.</p></div>
      ${[...new Set([...Object.keys(row.categories || {}), ...categories().filter(name => meta(name).type !== 'Income')])].map((name,index) => `<div class="field"><label for="allocation-${index}">${esc(name)}</label><input id="allocation-${index}" data-allocation="${esc(name)}" type="number" min="0" step=".01" value="${Math.abs(row.categories?.[name] || 0)}"></div>`).join('')}` : `<div class="field"><label for="type">Type</label><select id="type"><option value="expense" ${type === 'expense' ? 'selected' : ''}>Expense</option><option value="income" ${type === 'income' ? 'selected' : ''}>Income</option></select></div>
      <div class="field"><label for="amount">Amount (THB)</label><input id="amount" type="number" min=".01" max="1000000000000" step=".01" required value="${row.income || row.expense || ''}"></div>
      <div class="field"><label for="category">Category</label><select id="category" data-initial-category="${esc(cat)}">${categoryOptions(type, cat)}</select></div>`}
    <div class="field full"><label for="card">Payment method</label><select id="card"><option value="">Cash / bank / unspecified</option>${cards().map(card => `<option value="${esc(card.id)}" ${row.card === card.id ? 'selected' : ''}>${esc(card.name)} · •••• ${esc(card.last4)}</option>`).join('')}</select></div>
    <div class="field full"><label for="note">Note</label><textarea id="note" maxlength="2000" placeholder="What was this for?">${esc(row.note || '')}</textarea></div>
    </div><div class="preview-box">Saved on this browser. Use Save data for a portable backup.</div></div>`;
}
function categoryOptions(type, selected = '') {
  const names = categories().filter(name => meta(name).type === 'Both' || meta(name).type.toLowerCase() === type || name === selected);
  return `<option value="">Uncategorized</option>${names.map(name => `<option value="${esc(name)}" ${name === selected ? 'selected' : ''}>${esc(name)}</option>`).join('')}`;
}
function normalizeLocalIds() { return localTx.map((row,index) => ({...row, id:row.id || `legacy-${index}`})); }
function persistTransactions(nextLocal, nextOverrides) {
  const previousLocal = localStorage.getItem('mw-tx'), previousOverrides = localStorage.getItem('mw-tx-overrides');
  try {
    write('mw-tx', nextLocal);
    write('mw-tx-overrides', nextOverrides);
  } catch (error) {
    // Restore the original snapshot if a quota/access error interrupts the pair.
    for (const [key,value] of [['mw-tx',previousLocal],['mw-tx-overrides',previousOverrides]]) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); } catch {}
    }
    throw Error('Could not save to this browser. Free some browser storage or export a backup, then try again.');
  }
  localTx = nextLocal;
  txOverrides = nextOverrides;
}
function saveTransactionForm(root, id) {
  try {
    const previous = id ? txs().find(row => row.id === id) : null;
    if (id && !previous) throw Error('This entry no longer exists.');
    const value = selector => root.querySelector(selector)?.value || '';
    const aggregate = root.querySelector('[data-transaction-form]').dataset.aggregate === 'true';
    let income = 0, expense = 0, allocations = {}, category = '';
    if (aggregate) {
      income = Number(value('#income')); expense = Number(value('#expense'));
      root.querySelectorAll('[data-allocation]').forEach(input => {
        const amount = Number(input.value);
        if (!Number.isFinite(amount) || amount < 0) throw Error('Category amounts must be zero or positive.');
        if (amount) allocations[input.dataset.allocation] = amount;
      });
    } else {
      const amount = Number(value('#amount')), type = value('#type');
      category = value('#category');
      if (type === 'income') income = amount; else { expense = amount; if (category) allocations[category] = amount; }
    }
    const row = {...previous, id:id || `tx-${crypto.randomUUID()}`, date:value('#date'), income:Finance.money(income), expense:Finance.money(expense),
      categories:Object.fromEntries(Object.entries(allocations).map(([name,amount]) => [name,Finance.money(amount)])), category,
      card:value('#card'), note:value('#note').trim()};
    Finance.validateTransaction(row);
    const next = normalizeLocalIds();
    if (previous?.source === 'workbook') persistTransactions(next, {...txOverrides,[id]:row});
    else {
      const index = next.findIndex(entry => entry.id === id);
      if (index >= 0) next[index] = row; else next.push(row);
      persistTransactions(next, txOverrides);
    }
    txMonth = row.date.slice(0,7); cardMonth = txMonth; page = 0;
    txFilters = {query:'',type:'',category:'',card:''};
    undoTransaction = null;
    render(); notifyLedger('Transaction saved.');
    return '';
  } catch (error) { return error.message; }
}
function openTransaction(id, duplicate = false) {
  const row = txs().find(entry => entry.id === id);
  if (!row) return;
  modal(duplicate ? 'Duplicate transaction' : 'Edit transaction', duplicate ? 'Review the date and amounts before saving a new entry.' : 'Changes update your ledger, overview, and card spending.', transactionFields(duplicate ? {...row,date:Finance.localDate()} : row), root => saveTransactionForm(root, duplicate ? undefined : id));
}
function deleteTransaction(id) {
  const row = txs().find(entry => entry.id === id);
  if (!row || !confirm(`Delete this ${row.source === 'workbook' ? 'whole workbook daily record' : 'transaction'} from ${row.date}? You can undo until your next change.`)) return;
  const snapshot = {local:normalizeLocalIds(), overrides:structuredClone(txOverrides)};
  try {
    if (row.source === 'workbook') persistTransactions(normalizeLocalIds(), {...txOverrides,[id]:{deleted:true}});
    else persistTransactions(normalizeLocalIds().filter(entry => entry.id !== id), txOverrides);
    undoTransaction = snapshot;
    document.querySelector('.modal-backdrop .close-modal')?.click();
    render(); notifyLedger('Entry deleted.', true);
  } catch (error) { notifyLedger(error.message); }
}
function notifyLedger(message, undo = false) {
  let node = document.querySelector('#ledger-notice');
  if (!node) { node = document.createElement('div'); node.id='ledger-notice'; node.setAttribute('role','status'); document.body.append(node); }
  node.innerHTML = `<span>${esc(message)}</span>${undo ? '<button class="secondary" data-ledger="undo">Undo delete</button>' : ''}<button class="notice-close" aria-label="Dismiss notification" data-ledger="dismiss">×</button>`;
}
function exportTransactions() {
  const visibleMonths = new Set(liveMonths().filter(month => month.month <= txMonth).slice(-12).map(month => month.month));
  const rows = txMode === 'month' ? txs().filter(row => visibleMonths.has(row.date.slice(0,7))) : matchingTransactions();
  const url = URL.createObjectURL(new Blob([Finance.csv(rows,cards())],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href=url; link.download=`moneywise-${txMonth}-${txMode}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notifyLedger(`Exported ${rows.length} records. CSV is for spreadsheets; Save data creates a restorable backup.`);
}
function bindLedgerFeatures() {
  if (ledgerEventsBound) return;
  ledgerEventsBound = true;
  document.addEventListener('submit', event => {
    if (event.target.id !== 'ledger-filters') return;
    event.preventDefault(); const form = new FormData(event.target);
    txFilters = Object.fromEntries(['query','type','category','card'].map(key => [key,form.get(key)])); txSort = form.get('sort'); page=0; render();
  });
  document.addEventListener('change', event => {
    if (event.target.closest('#ledger-filters') && event.target.tagName === 'SELECT') event.target.form.requestSubmit();
    if (event.target.id === 'type' && event.target.closest('[data-transaction-form]')) {
      event.target.closest('.modal').querySelector('#category').innerHTML=categoryOptions(event.target.value);
    }
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.txEdit) openTransaction(button.dataset.txEdit);
    if (button.dataset.txDuplicate) openTransaction(button.dataset.txDuplicate,true);
    if (button.dataset.txDelete) deleteTransaction(button.dataset.txDelete);
    if (button.dataset.openMonth) { txMonth=button.dataset.openMonth; active='transactions'; txMode='day'; page=0; render(); }
    if (button.dataset.ledger === 'clear') { txFilters={query:'',type:'',category:'',card:''};txSort='newest';page=0;render(); }
    if (button.dataset.ledger === 'export') exportTransactions();
    if (button.dataset.ledger === 'dismiss') document.querySelector('#ledger-notice')?.remove();
    if (button.dataset.ledger === 'undo' && undoTransaction) {
      try { persistTransactions(undoTransaction.local,undoTransaction.overrides);undoTransaction=null;render();notifyLedger('Entry restored.'); } catch(error) { notifyLedger(error.message); }
    }
  });
  document.querySelector('.icon-button').setAttribute('aria-label','Search transactions');
  document.querySelector('.icon-button').onclick = () => {
    active='transactions';txMode='day';render();
    // View transitions defer the DOM update until their snapshot completes.
    requestAnimationFrame(() => requestAnimationFrame(() => document.querySelector('#ledger-search')?.focus()));
  };
  document.querySelector('.settings').onclick = () => modal('Data & settings','Your personal ledger stays in this browser.',
    `<div class="detail-summary"><div><span>Added records</span><b>${localTx.length}</b></div><div><span>Edited / hidden workbook records</span><b>${Object.keys(txOverrides).length}</b></div></div>
    <p class="ledger-hint">Save data downloads savedata.js with your entries, workbook edits, cards, installment plans, categories and theme. Load data restores a backup on this device. GitHub Pages does not synchronize browser changes between devices. The published workbook snapshot is loaded separately.</p>
    <div class="entry-actions"><button class="primary" id="settings-save">Save data</button><button class="secondary" id="settings-load">Load data</button></div>`,()=>'',true);
  document.addEventListener('click',event=>{
    if(event.target.closest('#settings-save')) document.querySelector('#save-backup-button').click();
    if(event.target.closest('#settings-load')) document.querySelector('#load-backup-button').click();
  });
}

function validateLedgerBackup(values) {
  values['mw-tx-overrides'] ??= {};
  const overrides = values['mw-tx-overrides'];
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) throw Error('Invalid transaction edits in backup.');
  const ids = new Set();
  values['mw-tx'].forEach((row,index) => {
    Finance.validateTransaction(row);
    const id = row.id || `legacy-${index}`;
    if (typeof id !== 'string' || !/^(tx-|legacy-)[a-zA-Z0-9-]+$/.test(id) || ids.has(id)) throw Error('Transaction IDs in this backup are invalid or duplicated.');
    ids.add(id);
  });
  for (const [id,row] of Object.entries(overrides)) {
    if (!/^import-\d{4}-\d{2}-\d{2}-\d+$/.test(id) || !row || typeof row !== 'object' || Array.isArray(row)) throw Error('Invalid workbook transaction edit.');
    if (row.deleted !== true) Finance.validateTransaction(row);
  }
}
function restoreBackupValues(values) {
  const previous = Object.fromEntries(BACKUP_KEYS.map(key => [key,localStorage.getItem(key)]));
  try { BACKUP_KEYS.forEach(key => write(key,values[key])); }
  catch (error) {
    for (const [key,value] of Object.entries(previous)) {
      try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key,value); } catch {}
    }
    throw Error('Unable to store this backup. Existing data was retained; check available browser storage.');
  }
}

function monthlyActivityChart() {
  const rows = liveMonths().filter(row => row.month <= txMonth).slice(-6), max = Math.max(1,...rows.flatMap(row => [row.income,row.expense]));
  return `<section class="card activity-chart"><div class="chart-head"><div><h3>Income & spending</h3><p>Last 6 available months · select a month to explore its daily ledger</p></div><div class="legend"><span>Income</span><span class="expense">Spending</span></div></div>
    <div class="activity-bars">${rows.map(row => `<button data-open-month="${row.month}" class="activity-month" aria-label="${monthText(row.month)}: income ${baht2(row.income)}, spending ${baht2(row.expense)}, net ${signedMoney(row.net)}" title="Income ${baht2(row.income)} · Spending ${baht2(row.expense)} · Net ${signedMoney(row.net)}"><span class="activity-pair"><i style="height:${Math.max(1,row.income/max*100)}%" class="activity-income"></i><i style="height:${Math.max(1,row.expense/max*100)}%" class="activity-expense"></i></span><span>${new Date(`${row.month}-01T12:00:00`).toLocaleDateString('en-US',{month:'short',year:'2-digit'})}</span><small>${signedMoney(row.net)} net</small></button>`).join('')}</div>
    <details><summary>View exact monthly totals</summary><div class="table-wrap"><table><thead><tr><th>Month</th><th>Income</th><th>Spending</th><th>Net</th></tr></thead><tbody>${rows.map(row => `<tr><td>${monthText(row.month)}</td><td>${baht2(row.income)}</td><td>${baht2(row.expense)}</td><td>${signedMoney(row.net)}</td></tr>`).join('')}</tbody></table></div></details></section>`;
}
