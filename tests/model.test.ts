import { describe, expect, it } from "vitest";
import workbookJSON from "../data.json";
import {
  backupSource,
  createLedgerStore,
  DEFAULTS,
  emptyWorkbook,
  parseBackup,
  readState,
  selectLedger,
} from "../src/lib/model";
import { calcPlan, dueDateForMonth, Finance } from "../src/lib/finance";
import { glyphForPlan } from "../src/lib/appearance";
import { normalizeSiteHost } from "../src/lib/site-icon";
import type {
  Card,
  LedgerState,
  Plan,
  StorageAdapter,
  Transaction,
  Workbook,
} from "../src/types";
const workbook = workbookJSON as unknown as Workbook;
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
const expense = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "tx-test",
  date: "2026-10-21",
  income: 0,
  expense: 120.5,
  categories: { Food: 120.5 },
  category: "Food",
  note: "Lunch",
  ...overrides,
});
const fresh = (): LedgerState => ({
  ...structuredClone(DEFAULTS),
  workspace: { mode: "fresh" },
});
const card: Card = {
  id: "user-card",
  name: "Cash card",
  kind: "cash",
  last4: "9876",
  color: "#334455",
  color2: "#FF00AA",
  status: "Active",
  dueDay: 31,
};
describe("React data compatibility", () => {
  it("preserves card networks and plan artwork through progress and backup restore", () => {
    const storage = memory({ "mw-workspace": '{"mode":"fresh"}' });
    const store = createLedgerStore(storage, workbook);
    const artwork = {
      emoji: "📷",
      coverPhoto: "data:image/jpeg;base64,/9j/2Q==",
      coverFrame: { zoom: 1.8, x: 0.2, y: 0.8 },
      siteIcon: {
        host: "youtube.com",
        image: "data:image/png;base64,iVBORw0KGgoAAA==",
      },
    };
    const plan: Plan = {
      id: "plan-camera",
      name: "Camera",
      amount: 6000,
      months: 6,
      rate: 0,
      monthly: 1000,
      total: 6000,
      status: "Ongoing",
      startMonth: "2026-11",
      card: card.id,
      ...artwork,
    };
    store.saveCard({ ...card, network: "unionpay" });
    store.savePlan(plan);
    store.markPlanPaid(plan.id);
    const sub = store.saveSubscription({
      name: "Video",
      amount: 129,
      startDate: "2026-11-10",
      cadence: "monthly",
      status: "active",
      siteIcon: artwork.siteIcon,
    });
    const restored = parseBackup(backupSource(store.getSnapshot()));
    expect(restored.localCards[0].network).toBe("unionpay");
    expect(restored.localPlans[0]).toMatchObject({
      ...artwork,
      paidMonths: 1,
      monthly: 1000,
    });
    expect(glyphForPlan(restored.localPlans[0])).toBe("camera");
    expect(
      restored.subscriptions.find((item) => item.id === sub.id)?.siteIcon,
    ).toEqual(artwork.siteIcon);
    expect(() =>
      store.savePlan({ ...plan, coverFrame: { zoom: 4, x: 0, y: 0 } }),
    ).toThrow(/framing/);
    expect(restored.transactions).toEqual([]);
    expect(() =>
      store.savePlan({
        ...plan,
        coverPhoto: "https://example.test/remote.jpg",
      }),
    ).toThrow(/supported cover photo/);
    expect(() =>
      parseBackup(
        backupSource({
          ...restored,
          localPlans: [
            { ...plan, coverPhoto: "data:image/svg+xml;base64,AA==" },
          ],
        }),
      ),
    ).toThrow(/cover photo/);
  });
  it("uses only public hostnames for site-icon lookups and refuses remote backup images", () => {
    expect(
      normalizeSiteHost("  https://YouTube.com/watch?v=keep-local#t  "),
    ).toBe("youtube.com");
    expect(normalizeSiteHost("youtube.com")).toBe("youtube.com");
    for (const url of [
      "file:///D:/private",
      "localhost:8766",
      "127.0.0.1",
      "[::1]",
      "demo.internal",
      "https://user:token@youtube.com",
    ])
      expect(normalizeSiteHost(url)).toBeUndefined();
    const store = createLedgerStore(memory(), workbook);
    expect(() =>
      store.saveSubscription({
        name: "Streaming",
        amount: 129,
        startDate: "2026-11-10",
        cadence: "monthly",
        status: "active",
        siteIcon: {
          host: "youtube.com",
          image: "https://example.org/icon.png",
        },
      }),
    ).toThrow(/website icon/);
  });
  it("warns if even rollback is blocked, retaining the in-memory ledger for backup", () => {
    const storage = memory({ "mw-tx": JSON.stringify([expense()]) });
    const store = createLedgerStore(
      {
        ...storage,
        setItem: () => {
          throw Error("Denied");
        },
      },
      workbook,
    );
    expect(() => store.commit({ transactions: [] })).toThrow(
      /Save data before reloading/,
    );
    expect(store.getSnapshot().transactions).toHaveLength(1);
  });
  it("rejects malformed backup cards and plans before persisting them", () => {
    expect(() =>
      parseBackup(
        backupSource({
          ...fresh(),
          localCards: [{ ...card, name: {} as string }],
        }),
      ),
    ).toThrow(/card/);
    expect(() =>
      parseBackup(
        backupSource({
          ...fresh(),
          localPlans: [
            {
              id: "plan-invalid",
              name: "Bad plan",
              months: 0,
              amount: 10,
              rate: 0,
              status: "Ongoing",
              monthly: 0,
              total: 0,
            },
          ],
        }),
      ),
    ).toThrow(/term/);
    expect(() =>
      parseBackup(backupSource({ ...fresh(), localCards: [card, card] })),
    ).toThrow(/Duplicate/);
  });
  it("reads existing keys without writing or changing raw saved bytes", () => {
    const storage = memory({
        "mw-tx": JSON.stringify([expense()]),
        "mw-workspace": '{"mode":"fresh","profile":{"name":"Mine"}}',
        unrelated: "keep",
      }),
      before = [...storage.values];
    const store = createLedgerStore(storage, workbook);
    expect(store.model().transactions).toHaveLength(1);
    expect([...storage.values]).toEqual(before);
    expect(store.getSnapshot().workspace.profile?.name).toBe("Mine");
  });
  it("retains all workbook records, stable IDs and original monthly totals", () => {
    const model = selectLedger(structuredClone(DEFAULTS), workbook);
    expect(model.transactions).toHaveLength(workbook.records.length);
    expect(model.cards).toHaveLength(9);
    expect(model.plans).toHaveLength(17);
    for (const month of Finance.months(model.transactions)) {
      expect(
        Finance.totals(
          model.transactions.filter((row) => row.date.startsWith(month)),
        ),
      ).toEqual(
        Finance.totals(
          Finance.records(workbook.records).filter((row) =>
            row.date.startsWith(month),
          ),
        ),
      );
    }
  });
  it("keeps a fresh ledger fresh with workbook records excluded", () => {
    const storage = memory({ "mw-workspace": '{"mode":"fresh"}' });
    expect(
      createLedgerStore(storage, workbook).model().transactions,
    ).toHaveLength(0);
    expect(createLedgerStore(storage, workbook).model().cards).toHaveLength(0);
  });
  it("saves, edits, duplicates, deletes, and undoes legacy local IDs", () => {
    const storage = memory({
        "mw-workspace": '{"mode":"fresh"}',
        "mw-tx": JSON.stringify([{ ...expense(), id: undefined }]),
      }),
      store = createLedgerStore(storage, workbook);
    store.saveTransaction(
      expense({ expense: 150, categories: { Food: 150 } }),
      "legacy-0",
    );
    expect(store.model().transactions[0].id).toBe("legacy-0");
    store.saveTransaction(expense(), "legacy-0", true);
    expect(new Set(store.model().transactions.map((row) => row.id)).size).toBe(
      2,
    );
    store.deleteTransaction("legacy-0");
    expect(store.model().transactions).toHaveLength(1);
    store.undoDelete();
    expect(store.model().transactions).toHaveLength(2);
  });
  it("preserves all allocations and mixed amounts on imported edits", () => {
    const store = createLedgerStore(memory(), workbook),
      row = store
        .model()
        .transactions.find((row) => row.income && row.expense)!;
    store.saveTransaction({ ...row, note: "Edited" }, row.id);
    expect(
      store.model().transactions.find((item) => item.id === row.id)?.categories,
    ).toEqual(row.categories);
    expect(workbook.records[0].note).toBeUndefined();
    store.deleteTransaction(row.id);
    expect(
      store.model().transactions.find((item) => item.id === row.id),
    ).toBeUndefined();
    store.undoDelete();
    expect(
      store.model().transactions.find((item) => item.id === row.id)?.note,
    ).toBe("Edited");
  });
  it("renames categories throughout history without changing amounts", () => {
    const storage = memory({
        "mw-workspace": '{"mode":"fresh"}',
        "mw-tx": JSON.stringify([expense()]),
      }),
      store = createLedgerStore(storage, workbook);
    store.saveCategory("Meals", { type: "Expense", color: "#abc" }, "Food");
    expect(store.model().transactions[0].categories).toEqual({ Meals: 120.5 });
    expect(store.model().meta("Meals").color).toBe("#AABBCC");
    expect(() =>
      store.saveCategory("meals", { type: "Expense", color: "#fff" }),
    ).toThrow(/already exists/);
  });
  it("restores v2 backup with every existing key, gradients, preferences and pins", () => {
    const state = {
      ...fresh(),
      transactions: [expense()],
      localCards: [card],
      budgets: { "2026-10": 5000 },
      workspace: {
        mode: "fresh" as const,
        profile: { name: "My money" },
        density: "compact" as const,
        motion: "reduced" as const,
        pinnedPlans: ["plan-a"],
      },
    };
    expect(parseBackup(backupSource(state))).toEqual(state);
  });
  it("accepts original v1 data-only backups and missing newer optional keys", () => {
    const text = backupSource(fresh()),
      payload = JSON.parse(
        JSON.parse(
          text
            .split("\n")[1]
            .slice("window.MONEYWISE_BACKUP_JSON = ".length, -1),
        ),
      );
    payload.version = 1;
    delete payload.data["mw-workspace"];
    delete payload.data["mw-budgets"];
    delete payload.data["mw-category-aliases"];
    delete payload.data["mw-tx-overrides"];
    const legacy = `/* Moneywise backup v1. Import through Moneywise; do not execute. */\nwindow.MONEYWISE_BACKUP_JSON = ${JSON.stringify(JSON.stringify(payload))};\n`;
    expect(parseBackup(legacy).workspace.mode).toBe("workbook");
  });
  it("rejects executable wrappers, invalid values and duplicate IDs without execution", () => {
    expect(() => parseBackup('window.alert("bad")')).toThrow();
    expect(() =>
      parseBackup(
        backupSource({ ...fresh(), transactions: [expense(), expense()] }),
      ),
    ).toThrow(/duplicated/);
    expect(() =>
      parseBackup(
        backupSource({ ...fresh(), transactions: [expense({ expense: -1 })] }),
      ),
    ).toThrow();
  });
  it("rolls back storage and in-memory state if a write fails", () => {
    const storage = memory({ "mw-tx": JSON.stringify([expense()]) }),
      before = [...storage.values];
    let fail = true;
    const adapter: StorageAdapter = {
      ...storage,
      setItem: (key, value) => {
        if (key === "mw-tx-overrides" && fail) {
          fail = false;
          throw Error("Quota");
        }
        storage.setItem(key, value);
      },
    };
    const store = createLedgerStore(adapter, workbook);
    expect(() => store.commit({ transactions: [], txOverrides: {} })).toThrow(
      /retained/,
    );
    expect([...storage.values]).toEqual(before);
    expect(store.getSnapshot().transactions).toHaveLength(1);
  });
  it("requires CLEAR, resets all finance keys, and retains theme and unrelated data", () => {
    const storage = memory({
        "mw-tx": JSON.stringify([expense()]),
        "mw-theme": '"dark"',
        unrelated: "keep",
      }),
      store = createLedgerStore(storage, workbook);
    expect(() => store.clear("no")).toThrow(/CLEAR/);
    store.clear("CLEAR");
    expect(store.model().transactions).toHaveLength(0);
    expect(store.model().cards).toHaveLength(0);
    expect(store.getSnapshot().theme).toBe("dark");
    expect(storage.getItem("unrelated")).toBe("keep");
    expect(readState(storage).workspace.mode).toBe("fresh");
  });
  it("keeps flat installment math, paid progress, and spending independent", () => {
    const store = createLedgerStore(
      memory({
        "mw-workspace": '{"mode":"fresh"}',
        "mw-tx": JSON.stringify([expense()]),
      }),
      emptyWorkbook(),
    );
    store.savePlan({
      id: "plan-test",
      name: "Laptop",
      amount: 6000,
      months: 3,
      rate: 0.59,
      status: "Ongoing",
      monthly: 0,
      total: 0,
      startMonth: "2026-10",
      paidMonths: 0,
    });
    expect(store.model().plans[0].monthly.toFixed(2)).toBe("2035.40");
    for (let i = 0; i < 3; i++) store.markPlanPaid("plan-test");
    expect(store.model().plans[0].status).toBe("Completed");
    expect(Finance.totals(store.model().transactions).expense).toBe(120.5);
    expect(calcPlan(3600, 36, 0.59).monthly.toFixed(2)).toBe("121.24");
  });
  it("keeps both card colors, cash type, and due-day clamping", () => {
    const store = createLedgerStore(
      memory({ "mw-workspace": '{"mode":"fresh"}' }),
      workbook,
    );
    store.saveCard(card);
    expect(store.model().cards[0].color2).toBe("#FF00AA");
    expect(dueDateForMonth(store.model().cards[0], "2027-02")).toBe(
      "2027-02-28",
    );
  });
  it("filters and exports whole records with CSV formula protection", () => {
    const row = expense({ note: "=unsafe" });
    expect(
      Finance.filter([row], { query: "Food", month: "2026-10" }),
    ).toHaveLength(1);
    expect(Finance.csv([row])).toContain("'=unsafe");
    expect(
      Finance.totals([
        expense({ expense: 0.1, categories: { Food: 0.1 } }),
        expense({ id: "tx-two", expense: 0.2, categories: { Food: 0.2 } }),
      ]).expense,
    ).toBe(0.3);
  });
});
