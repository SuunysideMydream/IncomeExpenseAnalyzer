import { describe, expect, it } from "vitest";
import { calendarItems, monthRange } from "../src/lib/calendar";
import {
  backupSource,
  createLedgerStore,
  DEFAULTS,
  emptyWorkbook,
  parseBackup,
} from "../src/lib/model";
import {
  addDays,
  calendarDays,
  createRenewalIndex,
  monthlyEquivalent,
  plansInMonth,
} from "../src/lib/recurring";
import { Finance } from "../src/lib/finance";
import type { Card, Plan, Subscription, Transaction } from "../src/types";

const sub = (changes: Partial<Subscription> = {}): Subscription => ({
  id: "sub-test",
  name: "Home internet",
  amount: 299.99,
  cadence: "monthly",
  startDate: "2026-01-31",
  status: "active",
  ...changes,
});
const expense = (changes: Partial<Transaction> = {}): Transaction => ({
  id: "",
  date: "2026-02-27",
  income: 0,
  expense: 302.15,
  categories: {},
  note: "Actual charge",
  ...changes,
});
const link = { subscriptionId: "sub-test", scheduledFor: "2026-02-28" };
function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
function seeded() {
  const storage = memory({
    "mw-workspace": '{"mode":"fresh"}',
    "mw-subscriptions": JSON.stringify([sub()]),
  });
  return { storage, store: createLedgerStore(storage, emptyWorkbook()) };
}

describe("billing dates and estimates", () => {
  it("clamps short months without drifting from the original day", () => {
    const index = createRenewalIndex([sub()], []);
    expect(
      index.between("2026-01-01", "2026-04-30").map((item) => item.date),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(index.next("sub-test", "2026-03-01")?.date).toBe("2026-03-31");
  });
  it("handles quarterly, annual leap-day, and weekly date-only schedules", () => {
    const quarter = createRenewalIndex([sub({ cadence: "quarterly" })], []);
    expect(
      quarter.between("2026-01-01", "2026-12-31").map((item) => item.date),
    ).toEqual(["2026-01-31", "2026-04-30", "2026-07-31", "2026-10-31"]);
    const leap = createRenewalIndex(
      [sub({ cadence: "yearly", startDate: "2024-02-29" })],
      [],
    );
    expect(leap.next("sub-test", "2025-02-01")?.date).toBe("2025-02-28");
    expect(leap.next("sub-test", "2028-02-01")?.date).toBe("2028-02-29");
    const weekly = createRenewalIndex(
      [sub({ cadence: "weekly", startDate: "2026-03-01" })],
      [],
    );
    expect(
      weekly.between("2026-03-04", "2026-03-16").map((item) => item.date),
    ).toEqual(["2026-03-08", "2026-03-15"]);
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
  });
  it("normalizes cost over the billing cycle and counts only the next 30 calendar days", () => {
    expect(monthlyEquivalent(sub({ amount: 12, cadence: "weekly" }))).toBe(52);
    expect(monthlyEquivalent(sub({ amount: 360, cadence: "quarterly" }))).toBe(
      120,
    );
    expect(monthlyEquivalent(sub({ amount: 1200, cadence: "yearly" }))).toBe(
      100,
    );
    const index = createRenewalIndex(
      [sub({ cadence: "weekly", startDate: "2026-03-01" })],
      [],
    );
    expect(index.upcoming("2026-03-01").map((item) => item.date)).toEqual([
      "2026-03-01",
      "2026-03-08",
      "2026-03-15",
      "2026-03-22",
      "2026-03-29",
    ]);
  });
  it("retains recorded and skipped history when a schedule is paused or changed", () => {
    const rows = [expense({ id: "tx-existing", renewal: link })];
    const index = createRenewalIndex(
      [
        sub({
          cadence: "yearly",
          startDate: "2026-09-01",
          status: "paused",
          skippedDates: ["2026-03-31"],
        }),
      ],
      rows,
    );
    expect(index.next("sub-test", "2026-01-01")).toBeUndefined();
    expect(
      index
        .between("2026-02-01", "2026-04-01")
        .map((item) => [item.date, item.status]),
    ).toEqual([
      ["2026-02-28", "recorded"],
      ["2026-03-31", "skipped"],
    ]);
    expect(index.upcoming("2026-03-01")).toEqual([]);
  });
});

describe("renewal recording and persistence", () => {
  it("does not write or seed subscriptions on startup, and adding one does not record money", () => {
    const storage = memory({ "mw-workspace": '{"mode":"fresh"}' });
    const store = createLedgerStore(storage, emptyWorkbook());
    expect(store.model().subscriptions).toEqual([]);
    expect([...storage.values.keys()]).toEqual(["mw-workspace"]);
    expect(() => store.saveSubscription(sub({ amount: -5 }))).toThrow(/charge/);
    const saved = store.saveSubscription(sub());
    expect(saved.id).toMatch(/^sub-/);
    expect([...storage.values.keys()].sort()).toEqual([
      "mw-subscriptions",
      "mw-workspace",
    ]);
    expect(Finance.totals(store.model().transactions).expense).toBe(0);
  });
  it("records one actual charge, guards against duplicates, and preserves the schedule through edits and undo", () => {
    const { store } = seeded();
    const logged = store.saveTransaction(expense({ renewal: link }));
    expect(
      store.model().renewals.get(link.subscriptionId, link.scheduledFor)
        ?.transaction?.date,
    ).toBe("2026-02-27");
    expect(store.model().renewals.next("sub-test", "2026-02-01")?.date).toBe(
      "2026-03-31",
    );
    expect(() => store.saveTransaction(expense({ renewal: link }))).toThrow(
      /already handled/,
    );
    const edited = store.saveTransaction(
      expense({ expense: 300.5 }),
      logged.id,
    );
    expect(edited.renewal).toEqual(link);
    const duplicate = store.saveTransaction(edited, logged.id, true);
    expect(duplicate.renewal).toBeUndefined();
    store.deleteTransaction(logged.id);
    expect(store.model().renewals.get("sub-test", "2026-02-28")?.status).toBe(
      "scheduled",
    );
    store.undoDelete();
    expect(
      store.model().renewals.get("sub-test", "2026-02-28")?.transaction
        ?.expense,
    ).toBe(300.5);
  });
  it("links an existing expense without altering recorded dates or totals", () => {
    const { store } = seeded();
    const existing = store.saveTransaction(expense());
    const linked = store.linkRenewal("sub-test", "2026-02-28", existing.id);
    expect(linked).toMatchObject({
      id: existing.id,
      expense: 302.15,
      date: "2026-02-27",
      renewal: link,
    });
    expect(store.model().transactions).toHaveLength(1);
    expect(Finance.totals(store.model().transactions).expense).toBe(302.15);
    expect(() =>
      store.linkRenewal("sub-test", "2026-03-31", existing.id),
    ).toThrow(/unlinked expense/);
  });
  it("skips and restores only that occurrence without writing a transaction", () => {
    const { store, storage } = seeded();
    store.setRenewalSkipped("sub-test", "2026-02-28", true);
    expect(store.model().renewals.next("sub-test", "2026-02-01")?.date).toBe(
      "2026-03-31",
    );
    expect(store.model().renewals.get("sub-test", "2026-02-28")?.status).toBe(
      "skipped",
    );
    expect(() => store.saveTransaction(expense({ renewal: link }))).toThrow(
      /already handled/,
    );
    store.setRenewalSkipped("sub-test", "2026-02-28", false);
    expect(store.model().renewals.next("sub-test", "2026-02-01")?.date).toBe(
      "2026-02-28",
    );
    expect(storage.getItem("mw-tx")).toBeNull();
  });
  it("round-trips schedules and linked expenses, resets them, and accepts older v2 exports", () => {
    const { store } = seeded();
    store.saveTransaction(expense({ renewal: link }));
    const restored = parseBackup(backupSource(store.getSnapshot()));
    expect(restored.subscriptions).toEqual([sub()]);
    expect(restored.transactions[0].renewal).toEqual(link);
    store.clear("CLEAR");
    expect(store.model().subscriptions).toEqual([]);
    store.restore(restored);
    expect(store.model().renewals.get("sub-test", "2026-02-28")?.status).toBe(
      "recorded",
    );
    const lines = backupSource(DEFAULTS).trim().split("\n"),
      marker = "window.MONEYWISE_BACKUP_JSON = ";
    const payload = JSON.parse(JSON.parse(lines[1].slice(marker.length, -1)));
    delete payload.data["mw-subscriptions"];
    const legacy = `${lines[0]}\n${marker}${JSON.stringify(JSON.stringify(payload))};`;
    expect(parseBackup(legacy).subscriptions).toEqual([]);
  });
  it("rejects invalid schedules and duplicate renewal links in backups", () => {
    expect(() =>
      parseBackup(backupSource({ ...DEFAULTS, subscriptions: [sub(), sub()] })),
    ).toThrow(/Duplicate subscription/);
    expect(() =>
      parseBackup(
        backupSource({
          ...DEFAULTS,
          subscriptions: [sub({ startDate: "2026-02-30" })],
        }),
      ),
    ).toThrow(/renewal date/);
    expect(() =>
      parseBackup(
        backupSource({
          ...DEFAULTS,
          subscriptions: [sub()],
          transactions: [
            expense({ id: "tx-one", renewal: link }),
            expense({ id: "tx-two", renewal: link }),
          ],
        }),
      ),
    ).toThrow(/Duplicate linked renewal/);
  });
});

describe("calendar keeps projected and recorded activity distinct", () => {
  it("deduplicates a same-day logged charge from the all-events view and clamps card reminders", () => {
    const card: Card = {
      id: "card",
      name: "Card",
      last4: "1234",
      color: "#6542A0",
      dueDay: 31,
      status: "Active",
    };
    const rows = [
      expense({
        id: "tx-local",
        card: "card",
        date: "2026-02-28",
        renewal: link,
      }),
      expense({
        id: "tx-salary",
        date: "2026-02-01",
        expense: 0,
        income: 5000,
      }),
    ];
    const renewals = createRenewalIndex([sub()], rows).between(
      ...monthRange("2026-02"),
    );
    expect(
      calendarItems("2026-02", "all", rows, [card], renewals).map(
        (item) => item.kind,
      ),
    ).toEqual(["income", "card-due", "expense"]);
    expect(
      calendarItems("2026-02", "renewals", rows, [card], renewals),
    ).toMatchObject([{ kind: "renewal", date: "2026-02-28", amount: 302.15 }]);
    expect(
      calendarItems("2026-02", "cards", rows, [card], renewals).map(
        (item) => item.date,
      ),
    ).toEqual(["2026-02-28", "2026-02-28"]);
    expect(Finance.totals(rows).expense).toBe(302.15);
  });
  it("lays out real calendar weeks and lists only unpaid plans for a month", () => {
    const days = calendarDays("2026-10");
    expect(days).toHaveLength(35);
    expect(days[0]).toBe("2026-09-27");
    expect(days.at(-1)).toBe("2026-10-31");
    const plan: Plan = {
      id: "plan",
      name: "Camera",
      amount: 300,
      months: 3,
      rate: 0,
      monthly: 100,
      total: 300,
      status: "Ongoing",
      startMonth: "2026-11",
      paidMonths: 1,
    };
    expect(plansInMonth([plan], "2026-11")).toEqual([]);
    expect(plansInMonth([plan], "2027-01")).toEqual([plan]);
    expect(plansInMonth([plan], "2027-02")).toEqual([]);
  });
});
