/* Shared ledger rules. No DOM, storage, or network dependencies. */
(function (root) {
  'use strict';
  const cents = value => Math.round(Number(value || 0) * 100);
  const money = value => cents(value) / 100;
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && localDate(new Date(`${value}T12:00:00`)) === value;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  // Date + occurrence remains stable when the snapshot is reordered by date.
  function records(base, local = [], overrides = {}) {
    const occurrences = {};
    const imported = base.map(row => {
      const occurrence = occurrences[row.date] || 0;
      occurrences[row.date] = occurrence + 1;
      const id = `import-${row.date}-${occurrence}`;
      return {...row, ...overrides[id], id, source: 'workbook'};
    });
    return [...imported, ...local.map((row, index) => ({...row, id: row.id || `legacy-${index}`, source:'local'}))].filter(row => !row.deleted);
  }
  function totals(rows) {
    let income = 0, expense = 0;
    const categories = Object.create(null);
    for (const row of rows) {
      income += cents(row.income);
      expense += cents(row.expense);
      if (Number(row.expense) > 0) for (const [name, value] of Object.entries(row.categories || {})) {
        categories[name] = (categories[name] || 0) + Math.abs(cents(value));
      }
    }
    return {income: income / 100, expense: expense / 100, net: (income - expense) / 100,
      categories: Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value / 100]))};
  }
  function months(rows, seeds = [], today = localDate()) {
    return [...new Set([...seeds, today.slice(0,7), ...rows.map(row => row.date.slice(0,7))])].sort();
  }
  function monthly(rows, seeds = []) {
    return months(rows, seeds).map(month => ({month, ...totals(rows.filter(row => row.date.startsWith(month)))}));
  }
  function daily(rows) {
    const groups = new Map();
    rows.forEach(row => groups.set(row.date, [...(groups.get(row.date) || []), row]));
    return [...groups].map(([date, group]) => {
      const sum = totals(group);
      return {date, ...sum, cats: sum.categories, count: group.length};
    }).filter(row => row.income || row.expense).sort((a,b) => b.date.localeCompare(a.date));
  }
  function filter(rows, filters = {}, cards = []) {
    const query = (filters.query || '').trim().toLowerCase();
    return rows.filter(row => (!filters.month || row.date.startsWith(filters.month))
      && (!filters.type || Number(row[filters.type]) > 0)
      && (!filters.category || row.category === filters.category || Math.abs(row.categories?.[filters.category] || 0) > 0)
      && (!filters.card || (filters.card === 'cash' ? !row.card : row.card === filters.card))
      && (!query || [row.date, row.note, row.category, ...Object.keys(row.categories || {}), cards.find(card => card.id === row.card)?.name].join(' ').toLowerCase().includes(query)));
  }
  function validateTransaction(row) {
    if (!row || !validDate(row.date)) throw Error('Choose a valid date.');
    for (const key of ['income','expense']) if (typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0 || row[key] > 1e12) throw Error('Amounts must be between 0 and 1 trillion.');
    if (!row.income && !row.expense) throw Error('Enter an amount greater than zero.');
    if (!row.categories || typeof row.categories !== 'object' || Array.isArray(row.categories)) throw Error('Category amounts are invalid.');
    let allocated = 0;
    for (const [name, amount] of Object.entries(row.categories)) {
      if (!name.trim() || typeof amount !== 'number' || !Number.isFinite(amount) || Math.abs(amount) > 1e12) throw Error('Category amounts are invalid.');
      allocated += Math.abs(cents(amount));
    }
    if (allocated > cents(row.expense)) throw Error('Category amounts cannot exceed total spending.');
    for (const key of ['note','card','category']) if (row[key] != null && typeof row[key] !== 'string') throw Error(`Invalid transaction ${key}.`);
    return row;
  }
  function csv(rows, cards = []) {
    const cell = value => {
      let text = String(value ?? '');
      // Prevent notes and names being interpreted as spreadsheet formulas.
      if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    return '\uFEFF' + [['Date','Income (THB)','Expense (THB)','Categories','Card','Note','Source'],
      ...rows.map(row => [row.date, money(row.income).toFixed(2), money(row.expense).toFixed(2),
        Object.entries(row.categories || {}).map(([name, amount]) => `${name}: ${Math.abs(money(amount)).toFixed(2)}`).join('; ') || row.category || '',
        cards.find(card => card.id === row.card)?.name || row.card || '', row.note || '', row.source || 'local'])]
      .map(row => row.map(cell).join(',')).join('\r\n');
  }
  const api = {money, localDate, validDate, escape, records, totals, months, monthly, daily, filter, validateTransaction, csv};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Finance = api;
})(globalThis);
