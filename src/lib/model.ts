import type {
  Card,
  CategoryMeta,
  LedgerState,
  Plan,
  Subscription,
  StorageAdapter,
  Transaction,
  Workbook,
} from "../types";
import {
  calcPlan,
  COLORS,
  dueDateForMonth,
  Finance,
  nextMonth,
  normalizeColor,
  RATES,
  TERMS,
} from "./finance";
import {
  createRenewalIndex,
  isRenewalLink,
  renewalKey,
  validateSubscription,
  validateSubscriptions,
} from "./recurring";
import {
  isCardNetwork,
  isCoverFrame,
  isPlanCover,
  isPlanEmoji,
  isPlanGlyph,
} from "./appearance";
import { isSiteIcon } from "./site-icon";

export const KEYS = {
  transactions: "mw-tx",
  localCards: "mw-cards",
  localPlans: "mw-plans",
  subscriptions: "mw-subscriptions",
  categoryMeta: "mw-category-meta",
  planOverrides: "mw-plan-overrides",
  cardOverrides: "mw-card-overrides",
  theme: "mw-theme",
  txOverrides: "mw-tx-overrides",
  workspace: "mw-workspace",
  budgets: "mw-budgets",
  aliases: "mw-category-aliases",
} as const;
export const DEFAULTS: LedgerState = {
  transactions: [],
  localCards: [],
  localPlans: [],
  subscriptions: [],
  categoryMeta: {},
  planOverrides: {},
  cardOverrides: {},
  theme: "light",
  txOverrides: {},
  workspace: { mode: "workbook" },
  budgets: {},
  aliases: {},
  undo: null,
};
export const emptyWorkbook = (): Workbook => ({
  source: "Personal ledger",
  categories: [],
  records: [],
  months: [],
  installments: [],
  cardCycles: [],
  cardPayments: [],
});
export function readState(storage: StorageAdapter): LedgerState {
  const result = structuredClone(DEFAULTS);
  for (const [property, key] of Object.entries(KEYS)) {
    try {
      const raw = storage.getItem(key);
      if (raw !== null) {
        const parsed: unknown = JSON.parse(raw);
        if (property === "subscriptions") validateSubscriptions(parsed);
        (result as unknown as Record<string, unknown>)[property] = parsed;
      }
    } catch {
      /* Do not overwrite unreadable storage; the next write remains explicit. */
    }
  }
  return result;
}
export function resolveCategory(name: string, aliases: Record<string, string>) {
  let current = name;
  const seen = new Set<string>();
  while (
    Object.hasOwn(aliases, current) &&
    aliases[current] &&
    !seen.has(current)
  ) {
    seen.add(current);
    current = aliases[current];
  }
  return current;
}
export function selectLedger(state: LedgerState, workbook: Workbook) {
  const data = state.workspace.mode === "fresh" ? emptyWorkbook() : workbook;
  const transactions = Finance.records(
    data.records,
    state.transactions,
    state.txOverrides,
  ).map((row) => {
    const allocations: Record<string, number> = Object.create(null);
    for (const [name, amount] of Object.entries(row.categories || {})) {
      const resolved = resolveCategory(name, state.aliases);
      allocations[resolved] = (allocations[resolved] || 0) + amount;
    }
    return {
      ...row,
      categories: allocations,
      category: row.category
        ? resolveCategory(row.category, state.aliases)
        : "",
    };
  });
  const categories = [
    ...new Set(
      [
        ...data.categories.map((name) => resolveCategory(name, state.aliases)),
        ...Object.keys(state.categoryMeta),
        ...state.subscriptions.map((item) =>
          item.category ? resolveCategory(item.category, state.aliases) : "",
        ),
        ...transactions.flatMap((row) => [
          row.category,
          ...Object.keys(row.categories || {}),
        ]),
      ].filter((name): name is string => Boolean(name)),
    ),
  ];
  const meta = (name: string): CategoryMeta => {
    const item = Object.hasOwn(state.categoryMeta, name)
      ? state.categoryMeta[name]
      : undefined;
    return {
      type:
        item && ["Expense", "Income", "Both"].includes(item.type)
          ? item.type
          : "Expense",
      color:
        normalizeColor(item?.color || "") ||
        COLORS[Math.max(0, categories.indexOf(name)) % COLORS.length],
    };
  };
  const cards: Card[] = [
    ...data.cardCycles.map((row, index) => ({
      id: `base-${index}`,
      name: row.card,
      last4: String(3110 + index * 137).slice(-4),
      color: COLORS[(index + 2) % COLORS.length],
      status: row.status || "Active",
      paymentDue: row.paymentDue,
      cycleDue: row.cycleDue,
      ...state.cardOverrides[`base-${index}`],
    })),
    ...state.localCards,
  ].map((card) => ({
    ...card,
    kind: card.kind === "cash" ? "cash" : "credit",
    color2: normalizeColor(card.color2 || "") || "#17211F",
  }));
  const plans: Plan[] = [
    ...data.installments.map((plan, index) => ({
      ...plan,
      id: `base-${index}`,
      ...state.planOverrides[`base-${index}`],
    })),
    ...state.localPlans,
  ].map((plan) => {
    const amount = Number(plan.amount || plan.total || 0),
      months = Number(plan.months || 1),
      rate = Number(plan.interestRate ?? plan.rate ?? 0),
      calc = calcPlan(amount, months, rate);
    return {
      ...plan,
      amount,
      months,
      rate,
      interestRate: rate,
      monthly: calc.monthly,
      total: calc.total,
      paidMonths:
        plan.status === "Completed" ? months : Number(plan.paidMonths) || 0,
    };
  });
  const months = Finance.months(
    transactions,
    data.months.map((row) => row.month),
  );
  const subscriptions = state.subscriptions.map((item) => ({
    ...item,
    category: item.category
      ? resolveCategory(item.category, state.aliases)
      : "",
  }));
  const renewals = createRenewalIndex(subscriptions, transactions);
  const upcoming = (today = Finance.localDate()) =>
    cards
      .filter((card) => card.status !== "Completed")
      .flatMap((card) => {
        const month = today.slice(0, 7);
        let date = dueDateForMonth(card, month);
        if (date && date < today)
          date = dueDateForMonth(card, nextMonth(month));
        return date ? [{ ...card, date }] : [];
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  return {
    data,
    transactions,
    cards,
    plans,
    subscriptions,
    renewals,
    categories,
    meta,
    months,
    upcoming,
  };
}
function assertRecord(
  value: unknown,
  message: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error(message);
}
export function validateState(state: LedgerState) {
  validateSubscriptions(state.subscriptions);
  for (const key of ["transactions", "localCards", "localPlans"] as const)
    if (!Array.isArray(state[key]))
      throw Error(`Invalid backup: ${KEYS[key]}.`);
  for (const key of [
    "categoryMeta",
    "planOverrides",
    "cardOverrides",
    "txOverrides",
    "workspace",
    "budgets",
    "aliases",
  ] as const)
    assertRecord(state[key], `Invalid backup: ${KEYS[key]}.`);
  if (!["light", "dark"].includes(state.theme))
    throw Error("Backup theme is invalid.");
  if (!["workbook", "fresh"].includes(state.workspace.mode))
    throw Error("The backup workspace mode is invalid.");
  const validateCard = (item: unknown, partial = false) => {
    assertRecord(item, "Invalid card in backup.");
    for (const field of ["id", "name", "status"]) {
      if (
        (!partial || item[field] !== undefined) &&
        typeof item[field] !== "string"
      )
        throw Error("Invalid card details in backup.");
    }
    if (
      item.last4 !== undefined &&
      (typeof item.last4 !== "string" || !/^\d{4}$/.test(item.last4))
    )
      throw Error("Invalid card last four digits in backup.");
    for (const field of ["color", "color2"]) {
      if (
        item[field] !== undefined &&
        (typeof item[field] !== "string" || !normalizeColor(item[field]))
      )
        throw Error("Invalid card color in backup.");
    }
    if (
      item.kind !== undefined &&
      !["credit", "cash"].includes(item.kind as string)
    )
      throw Error("Invalid card type in backup.");
    if (item.network !== undefined && !isCardNetwork(item.network))
      throw Error("Invalid card network in backup.");
    if (
      item.dueDay != null &&
      (!Number.isInteger(item.dueDay) ||
        Number(item.dueDay) < 1 ||
        Number(item.dueDay) > 31)
    )
      throw Error("Invalid card due day in backup.");
    for (const field of ["paymentDue", "cycleDue", "cycleStart"]) {
      if (item[field] != null && typeof item[field] !== "string")
        throw Error("Invalid card date in backup.");
    }
  };
  const validatePlan = (item: unknown, partial = false) => {
    assertRecord(item, "Invalid installment plan in backup.");
    for (const field of ["id", "name", "status"]) {
      if (
        (!partial || item[field] !== undefined) &&
        typeof item[field] !== "string"
      )
        throw Error("Invalid installment details in backup.");
    }
    for (const field of [
      "amount",
      "months",
      "rate",
      "interestRate",
      "monthly",
      "total",
      "paidMonths",
    ]) {
      if (
        item[field] !== undefined &&
        (!Number.isFinite(item[field]) ||
          Number(item[field]) < 0 ||
          Number(item[field]) > 1e12)
      )
        throw Error("Invalid installment amounts in backup.");
    }
    if (
      item.months !== undefined &&
      (!Number.isInteger(item.months) || Number(item.months) < 1)
    )
      throw Error("Invalid installment term in backup.");
    for (const field of ["startMonth", "card"]) {
      if (item[field] !== undefined && typeof item[field] !== "string")
        throw Error("Invalid installment schedule in backup.");
    }
    if (item.emoji !== undefined && !isPlanEmoji(item.emoji))
      throw Error("Invalid installment icon in backup.");
    if (item.glyph !== undefined && !isPlanGlyph(item.glyph))
      throw Error("Invalid installment glyph in backup.");
    if (item.coverPhoto !== undefined && !isPlanCover(item.coverPhoto))
      throw Error("Invalid installment cover photo in backup.");
    if (item.coverFrame !== undefined && !isCoverFrame(item.coverFrame))
      throw Error("Invalid installment cover framing in backup.");
    if (item.siteIcon !== undefined && !isSiteIcon(item.siteIcon))
      throw Error("Invalid installment website icon in backup.");
  };
  for (const [items, validate] of [
    [state.localCards, validateCard],
    [state.localPlans, validatePlan],
  ] as const) {
    const seen = new Set<string>();
    for (const item of items) {
      validate(item);
      if (!item.id || seen.has(item.id))
        throw Error("Duplicate or missing card/plan ID in backup.");
      seen.add(item.id);
    }
  }
  Object.values(state.cardOverrides).forEach((item) =>
    validateCard(item, true),
  );
  Object.values(state.planOverrides).forEach((item) =>
    validatePlan(item, true),
  );
  for (const info of Object.values(state.categoryMeta)) {
    assertRecord(info, "Invalid category in backup.");
    if (
      info.type !== undefined &&
      !["Expense", "Income", "Both"].includes(info.type)
    )
      throw Error("Invalid category type in backup.");
    if (
      info.color !== undefined &&
      (typeof info.color !== "string" || !normalizeColor(info.color))
    )
      throw Error("Invalid category color in backup.");
  }
  const prefs = state.workspace;
  if (
    prefs.profile !== undefined &&
    (!prefs.profile ||
      typeof prefs.profile.name !== "string" ||
      prefs.profile.name.length > 50)
  )
    throw Error("Invalid workspace name.");
  if (
    prefs.density !== undefined &&
    !["comfortable", "compact"].includes(prefs.density)
  )
    throw Error("Invalid reading comfort.");
  if (prefs.motion !== undefined && !["full", "reduced"].includes(prefs.motion))
    throw Error("Invalid motion preference.");
  if (
    prefs.pinnedPlans !== undefined &&
    (!Array.isArray(prefs.pinnedPlans) ||
      prefs.pinnedPlans.some((id) => typeof id !== "string"))
  )
    throw Error("Invalid pinned plans.");
  const ids = new Set<string>();
  const renewalIds = new Set<string>();
  state.transactions.forEach((row, index) => {
    Finance.validateTransaction(row);
    if (row.renewal !== undefined) {
      if (!isRenewalLink(row.renewal) || row.income !== 0 || row.expense <= 0)
        throw Error("Invalid linked renewal expense in backup.");
      const key = renewalKey(row.renewal);
      if (renewalIds.has(key))
        throw Error("Duplicate linked renewal in backup.");
      renewalIds.add(key);
    }
    const id = row.id || `legacy-${index}`;
    if (
      typeof id !== "string" ||
      !/^(tx-|legacy-)[a-zA-Z0-9-]+$/.test(id) ||
      ids.has(id)
    )
      throw Error("Transaction IDs in this backup are invalid or duplicated.");
    ids.add(id);
  });
  for (const [id, row] of Object.entries(state.txOverrides)) {
    assertRecord(row, "Invalid workbook transaction edit.");
    if (!/^import-\d{4}-\d{2}-\d{2}-\d+$/.test(id))
      throw Error("Invalid workbook transaction edit.");
    if (row.renewal !== undefined)
      throw Error(
        "Workbook aggregates cannot be linked to individual renewals.",
      );
    if (row.deleted !== true)
      Finance.validateTransaction(row as unknown as Transaction);
  }
  for (const [month, amount] of Object.entries(state.budgets))
    if (
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > 1e12
    )
      throw Error("Invalid monthly budget.");
  for (const value of Object.values(state.aliases))
    if (typeof value !== "string" || !value.trim())
      throw Error("Invalid category rename history.");
  return state;
}
export function backupSource(state: LedgerState) {
  const payload = {
    format: "moneywise-backup",
    version: 2,
    createdAt: new Date().toISOString(),
    data: Object.fromEntries(
      Object.entries(KEYS).map(([property, key]) => [
        key,
        state[property as keyof typeof KEYS],
      ]),
    ),
  };
  return `/* Moneywise backup v2. Import through Moneywise; do not execute. */\nwindow.MONEYWISE_BACKUP_JSON = ${JSON.stringify(JSON.stringify(payload))};\n`;
}
export function parseBackup(text: string): LedgerState {
  if (new TextEncoder().encode(text).length > 10 * 1024 * 1024)
    throw Error("Backup file is too large (maximum 10 MB).");
  const lines = text.trim().split(/\r?\n/),
    marker = "window.MONEYWISE_BACKUP_JSON = ";
  if (
    lines.length !== 2 ||
    !/^\/\* Moneywise backup v[12]\. Import through Moneywise; do not execute\. \*\/$/.test(
      lines[0],
    ) ||
    !lines[1].startsWith(marker)
  )
    throw Error("This file does not use the Moneywise backup format.");
  const serialized = lines[1].slice(marker.length).replace(/;$/, "");
  const payload = JSON.parse(JSON.parse(serialized));
  if (
    payload?.format !== "moneywise-backup" ||
    ![1, 2].includes(payload.version) ||
    !payload.data ||
    lines[0] !==
      `/* Moneywise backup v${payload.version}. Import through Moneywise; do not execute. */`
  )
    throw Error("This is not a supported Moneywise backup.");
  const values = payload.data;
  for (const key of [
    "mw-tx",
    "mw-cards",
    "mw-plans",
    "mw-category-meta",
    "mw-plan-overrides",
    "mw-card-overrides",
    "mw-theme",
  ])
    if (values[key] === undefined)
      throw Error(`Backup data is missing: ${key}.`);
  if (payload.version === 2 && !values["mw-workspace"])
    throw Error("Backup workspace settings are missing.");
  const state = structuredClone(DEFAULTS);
  for (const [property, key] of Object.entries(KEYS))
    if (values[key] !== undefined)
      (state as unknown as Record<string, unknown>)[property] = values[key];
  return validateState(state);
}
export function createLedgerStore(storage: StorageAdapter, workbook: Workbook) {
  let state = readState(storage);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  function commit(patch: Partial<LedgerState>) {
    const previous: Record<string, string | null> = {};
    for (const property of Object.keys(patch))
      if (property in KEYS) {
        const key = KEYS[property as keyof typeof KEYS];
        previous[key] = storage.getItem(key);
      }
    try {
      for (const property of Object.keys(patch))
        if (property in KEYS)
          storage.setItem(
            KEYS[property as keyof typeof KEYS],
            JSON.stringify(patch[property as keyof LedgerState]),
          );
    } catch {
      let rollbackFailed = false;
      for (const [key, value] of Object.entries(previous))
        try {
          if (value === null) storage.removeItem(key);
          else storage.setItem(key, value);
        } catch {
          rollbackFailed = true;
        }
      throw Error(
        rollbackFailed
          ? "Could not save or fully restore browser storage. The open ledger is unchanged; Save data before reloading or retrying."
          : "Could not save changes in this browser. Your previous data was retained.",
      );
    }
    state = { ...state, ...patch };
    emit();
  }
  const model = () => selectLedger(state, workbook);
  function saveTransaction(
    input: Transaction,
    editId?: string,
    duplicate = false,
  ) {
    const ledger = editId || input.renewal ? model() : undefined;
    const previous = editId
      ? ledger?.transactions.find((row) => row.id === editId)
      : undefined;
    if (editId && !previous) throw Error("This entry no longer exists.");
    const row = {
      ...previous,
      ...input,
      id: duplicate || !editId ? `tx-${crypto.randomUUID()}` : editId,
      income: Finance.money(input.income),
      expense: Finance.money(input.expense),
      categories: Object.fromEntries(
        Object.entries(input.categories).map(([key, value]) => [
          key,
          Finance.money(value),
        ]),
      ),
    };
    Finance.validateTransaction(row);
    const link = duplicate ? undefined : previous?.renewal || input.renewal;
    if (link) {
      if (
        !isRenewalLink(link) ||
        row.income !== 0 ||
        row.expense <= 0 ||
        previous?.source === "workbook"
      )
        throw Error("A renewal must be linked to a single local expense.");
      if (
        !previous?.renewal &&
        ledger?.renewals.get(link.subscriptionId, link.scheduledFor)?.status !==
          "scheduled"
      )
        throw Error(
          "This renewal was already handled or is no longer scheduled.",
        );
      row.renewal = link;
    } else delete row.renewal;
    const local = state.transactions.map((entry, index) => ({
      ...entry,
      id: entry.id || `legacy-${index}`,
    }));
    if (previous?.source === "workbook" && !duplicate)
      commit({
        transactions: local,
        txOverrides: { ...state.txOverrides, [row.id]: row },
        undo: null,
      });
    else {
      const index = local.findIndex((entry) => entry.id === row.id);
      if (index >= 0) local[index] = row;
      else local.push({ ...row, source: "local" });
      commit({ transactions: local, undo: null });
    }
    return row;
  }
  function saveSubscription(input: Omit<Subscription, "id">, editId?: string) {
    const previous = state.subscriptions.find((item) => item.id === editId);
    if (editId && !previous) throw Error("This subscription no longer exists.");
    const subscription: Subscription = {
      ...input,
      id: editId || `sub-${crypto.randomUUID()}`,
      name: input.name.trim(),
      amount: Finance.money(input.amount),
      note: input.note?.trim(),
      skippedDates: previous?.skippedDates || [],
    };
    validateSubscription(subscription);
    commit({
      subscriptions: [
        ...state.subscriptions.filter((item) => item.id !== subscription.id),
        subscription,
      ],
    });
    return subscription;
  }
  function linkRenewal(
    subscriptionId: string,
    date: string,
    transactionId: string,
  ) {
    const row = model().transactions.find((item) => item.id === transactionId);
    if (
      !row ||
      row.source !== "local" ||
      row.renewal ||
      row.income ||
      row.expense <= 0
    )
      throw Error("Choose an unlinked expense you recorded in Moneywise.");
    return saveTransaction(
      { ...row, renewal: { subscriptionId, scheduledFor: date } },
      row.id,
    );
  }
  function setRenewalSkipped(id: string, date: string, skip: boolean) {
    const renewal = model().renewals.get(id, date);
    if (!renewal || renewal.status !== (skip ? "scheduled" : "skipped"))
      throw Error("This renewal changed. Open it again to review.");
    const subscription = state.subscriptions.find((item) => item.id === id)!;
    const skippedDates = (subscription.skippedDates || []).filter(
      (item) => item !== date,
    );
    if (skip) skippedDates.push(date);
    commit({
      subscriptions: state.subscriptions.map((item) =>
        item.id === id ? { ...item, skippedDates } : item,
      ),
    });
  }
  function deleteTransaction(id: string) {
    const row = model().transactions.find((row) => row.id === id);
    if (!row) return;
    const undo = {
      transactions: structuredClone(state.transactions),
      txOverrides: structuredClone(state.txOverrides),
    };
    if (row.source === "workbook")
      commit({
        txOverrides: { ...state.txOverrides, [id]: { deleted: true } },
        undo,
      });
    else
      commit({
        transactions: state.transactions
          .map((entry, index) => ({
            ...entry,
            id: entry.id || `legacy-${index}`,
          }))
          .filter((entry) => entry.id !== id),
        undo,
      });
  }
  function saveCard(input: Card) {
    const card = {
      ...input,
      color: normalizeColor(input.color),
      color2: normalizeColor(input.color2 || "#17211F"),
    };
    if (!card.name.trim() || !/^\d{4}$/.test(card.last4))
      throw Error("Enter a card name and exactly four digits.");
    if (!card.color || !card.color2)
      throw Error("Enter a valid HEX color, for example #2C9B72.");
    if (card.network !== undefined && !isCardNetwork(card.network))
      throw Error("Choose a supported card network.");
    if (
      card.dueDay != null &&
      (!Number.isInteger(card.dueDay) || card.dueDay < 1 || card.dueDay > 31)
    )
      throw Error("Payment due day must be from 1 to 31.");
    const value = {
      ...card,
      id: card.id || `user-${crypto.randomUUID()}`,
      name: card.name.trim(),
    } as Card;
    if (value.id.startsWith("base-"))
      commit({ cardOverrides: { ...state.cardOverrides, [value.id]: value } });
    else
      commit({
        localCards: state.localCards
          .filter((row) => row.id !== value.id)
          .concat(value),
      });
  }
  function savePlan(input: Plan) {
    if (
      !input.name.trim() ||
      !Number.isFinite(input.amount) ||
      input.amount <= 0 ||
      input.amount > 1e12
    )
      throw Error("Enter a purchase name and a positive amount.");
    if (!TERMS.includes(input.months) || !RATES.includes(input.rate))
      throw Error("Choose a supported term and interest rate.");
    if (input.emoji !== undefined && !isPlanEmoji(input.emoji))
      throw Error("Choose an icon from the emoji sets.");
    if (input.glyph !== undefined && !isPlanGlyph(input.glyph))
      throw Error("Choose an installment glyph.");
    if (input.coverPhoto !== undefined && !isPlanCover(input.coverPhoto))
      throw Error("Choose a supported cover photo.");
    if (input.coverFrame !== undefined && !isCoverFrame(input.coverFrame))
      throw Error("Choose valid cover framing.");
    if (input.siteIcon !== undefined && !isSiteIcon(input.siteIcon))
      throw Error("Choose a valid website icon.");
    const paid = Number(input.paidMonths) || 0;
    if (!Number.isInteger(paid) || paid < 0 || paid > input.months)
      throw Error("Payments made must be between 0 and the term.");
    if (!Finance.validDate(`${input.startMonth || ""}-01`))
      throw Error("Choose the first payment month.");
    if (input.card && !model().cards.some((card) => card.id === input.card))
      throw Error("Choose an existing card.");
    const value = {
      ...input,
      id: input.id || `plan-${crypto.randomUUID()}`,
      name: input.name.trim(),
      ...calcPlan(input.amount, input.months, input.rate),
      interestRate: input.rate,
      paidMonths: input.status === "Completed" ? input.months : paid,
      status: paid === input.months ? "Completed" : input.status,
    };
    if (value.id.startsWith("base-"))
      commit({ planOverrides: { ...state.planOverrides, [value.id]: value } });
    else
      commit({
        localPlans: state.localPlans
          .filter((row) => row.id !== value.id)
          .concat(value),
      });
  }
  function saveCategory(name: string, info: CategoryMeta, original?: string) {
    name = name.trim();
    if (!name || name.length > 80)
      throw Error("Enter a category name (maximum 80 characters).");
    if (["__proto__", "prototype", "constructor"].includes(name))
      throw Error("Choose another category name.");
    if (
      model().categories.some(
        (existing) =>
          existing !== original &&
          existing.toLowerCase() === name.toLowerCase(),
      )
    )
      throw Error("A category with that name already exists.");
    const color = normalizeColor(info.color);
    if (!color) throw Error("Enter a valid HEX color.");
    const categoryMeta = { ...state.categoryMeta, [name]: { ...info, color } },
      aliases = { ...state.aliases };
    if (original && original !== name) {
      delete categoryMeta[original];
      for (const key of Object.keys(aliases))
        if (resolveCategory(key, state.aliases) === original)
          aliases[key] = name;
      delete aliases[name];
      aliases[original] = name;
    }
    commit({ categoryMeta, aliases });
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reload: () => {
      state = readState(storage);
      emit();
    },
    commit,
    model,
    saveTransaction,
    saveSubscription,
    linkRenewal,
    setRenewalSkipped,
    deleteTransaction,
    saveCard,
    savePlan,
    saveCategory,
    undoDelete: () => {
      if (state.undo) commit({ ...state.undo, undo: null });
    },
    markPlanPaid: (id: string) => {
      const plan = model().plans.find((plan) => plan.id === id);
      if (plan?.status === "Ongoing")
        savePlan({
          ...plan,
          startMonth: plan.startMonth || Finance.localDate().slice(0, 7),
          paidMonths: Math.min(plan.months, (plan.paidMonths || 0) + 1),
        });
    },
    starters: () => {
      const categoryMeta = { ...state.categoryMeta };
      [
        ["Salary", "Income"],
        ["Other income", "Income"],
        ["Food", "Expense"],
        ["Transport", "Expense"],
        ["Home & bills", "Expense"],
        ["Shopping", "Expense"],
        ["Health", "Expense"],
        ["Leisure", "Expense"],
      ].forEach(([name, type], index) => {
        if (!model().categories.includes(name))
          categoryMeta[name] = {
            type: type as CategoryMeta["type"],
            color: COLORS[index % COLORS.length],
          };
      });
      commit({ categoryMeta });
    },
    setBudget: (month: string, amount: number) => {
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e12)
        throw Error("Enter a valid budget.");
      commit({ budgets: { ...state.budgets, [month]: Finance.money(amount) } });
    },
    togglePin: (id: string) => {
      const pinned = new Set(state.workspace.pinnedPlans || []);
      if (pinned.has(id)) pinned.delete(id);
      else pinned.add(id);
      commit({ workspace: { ...state.workspace, pinnedPlans: [...pinned] } });
    },
    restore: (next: LedgerState) => {
      validateState(next);
      commit({ ...next, undo: null });
    },
    clear: (confirmation: string) => {
      if (confirmation !== "CLEAR")
        throw Error("Type CLEAR to confirm the fresh start.");
      commit({
        ...structuredClone(DEFAULTS),
        theme: state.theme,
        workspace: { mode: "fresh", startedAt: new Date().toISOString() },
      });
    },
  };
}
export type LedgerStore = ReturnType<typeof createLedgerStore>;
export type LedgerModel = ReturnType<typeof selectLedger>;
