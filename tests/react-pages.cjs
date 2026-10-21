/* Production-build end-to-end regression. All financial fixtures live in
   disposable Edge profiles. Never connects to the user's localhost/profile. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path"),
  os = require("node:os");
const Finance = require("../finance-core.js"),
  snapshot = require("../data.json");
const root = path.resolve(__dirname, "../dist"),
  entry = fs.existsSync(path.join(root, "index.html"))
    ? "index.html"
    : "react.html";
const prefix = "/IncomeExpenseAnalyzer/"; // Also verify GitHub Pages subdirectory asset paths.
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
const server = http.createServer((req, res) => {
  const uri = new URL(req.url, "http://localhost").pathname;
  if (!uri.startsWith(prefix)) {
    res.writeHead(404);
    return res.end();
  }
  const relative = decodeURIComponent(uri.slice(prefix.length)) || entry,
    file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(file, (error, body) => {
    res.writeHead(error ? 404 : 200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    res.end(error ? "Not found" : body);
  });
});
const keys = [
  "mw-tx",
  "mw-cards",
  "mw-plans",
  "mw-category-meta",
  "mw-plan-overrides",
  "mw-card-overrides",
  "mw-theme",
  "mw-tx-overrides",
  "mw-workspace",
  "mw-budgets",
  "mw-category-aliases",
];
function fixture() {
  const rows = Array.from({ length: 24 }, (_, i) => ({
    id: "tx-sample-" + i,
    date: "2026-10-" + String(i + 1).padStart(2, "0"),
    income: 0,
    expense: 100 + i,
    categories: { Food: 100 + i },
    category: "Food",
    card: "test-card",
    note: i === 18 ? "Café <b>literal</b> lunch" : "Everyday meal " + (i + 1),
  }));
  rows.push({
    id: "tx-salary",
    date: "2026-10-01",
    income: 30000,
    expense: 0,
    categories: {},
    category: "Salary",
    note: "Monthly salary",
  });
  return {
    "mw-tx": rows,
    "mw-cards": [
      {
        id: "test-card",
        name: "Everyday Violet",
        last4: "4812",
        kind: "credit",
        color: "#8562CB",
        color2: "#272445",
        status: "Active",
        dueDay: 25,
      },
    ],
    "mw-plans": [
      {
        id: "plan-test",
        name: "Studio laptop",
        amount: 12000,
        months: 12,
        rate: 0.59,
        monthly: 1070.8,
        total: 12849.6,
        status: "Ongoing",
        paidMonths: 2,
        startMonth: "2026-08",
        card: "test-card",
      },
    ],
    "mw-category-meta": {
      Food: { type: "Expense", color: "#9476CF" },
      Salary: { type: "Income", color: "#329A7B" },
    },
    "mw-plan-overrides": {},
    "mw-card-overrides": {},
    "mw-theme": "light",
    "mw-tx-overrides": {},
    "mw-workspace": { mode: "fresh" },
    "mw-budgets": { "2026-10": 10000 },
    "mw-category-aliases": {},
  };
}
const pack = (data) =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, JSON.stringify(value)]),
  );
const backup = (data, version = 2) =>
  `/* Moneywise backup v${version}. Import through Moneywise; do not execute. */\nwindow.MONEYWISE_BACKUP_JSON = ${JSON.stringify(JSON.stringify({ format: "moneywise-backup", version, data }))};\n`;
let browser,
  base,
  checks = 0;
const errors = [],
  external = [];
async function run(name, fn) {
  await fn();
  checks++;
  console.log(`PASS ${checks}: ${name}`);
}
async function setup(data) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1050 },
    timezoneId: "Asia/Bangkok",
    reducedMotion: "no-preference",
  });
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await context.addInitScript((values) => {
    if (!sessionStorage.getItem("migration-test-seeded")) {
      for (const [key, value] of Object.entries(values))
        localStorage.setItem(key, value);
      sessionStorage.setItem("migration-test-seeded", "yes");
    }
    window.showSaveFilePicker = undefined;
  }, pack(data));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.clock.setFixedTime(new Date("2026-10-21T05:00:00Z"));
  await page.goto(base);
  await page.locator("[data-page=overview]").waitFor();
  return { page, context };
}
async function nav(page, view) {
  await page.locator(`.nav-item[data-view=${view}]`).click();
  await page.locator(`[data-page=${view}]`).waitFor();
  try {
    await page.waitForFunction(
      (view) =>
        [...document.querySelectorAll("[data-page]")].every(
          (node) => node.getAttribute("data-page") === view,
        ),
      view,
    );
  } catch (error) {
    console.error(
      "Navigation diagnostic",
      view,
      await page.locator("[data-page]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          page: node.getAttribute("data-page"),
          style: node.getAttribute("style"),
          animations: node.getAnimations().map((animation) => ({
            state: animation.playState,
            time: animation.currentTime,
            start: animation.startTime,
          })),
        })),
      ),
    );
    await page.screenshot({
      path: path.join(os.tmpdir(), "moneywise-react-nav-failure.png"),
      fullPage: true,
    });
    throw error;
  }
}
async function choose(page, label, text) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: text, exact: true }).click();
}
async function close(page) {
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator(".modal-backdrop").waitFor({ state: "detached" });
}
async function save(page) {
  await page.locator(".save-modal").click();
  await page.locator(".modal-backdrop").waitFor({ state: "detached" });
}
async function stored(page, key) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
}
async function raw(page) {
  return page.evaluate(
    (keys) =>
      Object.fromEntries(
        keys
          .filter((key) => localStorage.getItem(key) !== null)
          .map((key) => [key, localStorage.getItem(key)]),
      ),
    keys,
  );
}
async function load(page, source) {
  await page.locator("#backup-file").setInputFiles({
    name: "savedata.js",
    mimeType: "text/javascript",
    buffer: Buffer.from(source),
  });
}
async function screenshot(page, name) {
  if (!process.env.MW_SCREENSHOT_DIR) return;
  // Full-page captures must visit sections before recording scroll reveals.
  for (const section of await page
    .locator("[data-page=overview] [data-studio-reveal]")
    .all()) {
    await section.scrollIntoViewIfNeeded();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
  }
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(() => scrollY === 0);
  await page.screenshot({
    path: path.join(
      process.env.MW_SCREENSHOT_DIR,
      `moneywise-react-${name}.png`,
    ),
    fullPage: true,
    animations: "disabled",
  });
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}${prefix}`;
  try {
    browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
      headless: true,
    });
    const initial = fixture(),
      { page, context } = await setup(initial);
    await run(
      "same legacy storage keys are byte-for-byte unchanged on React startup",
      async () => {
        assert.deepEqual(await raw(page), pack(initial));
        assert.equal(await page.locator("[data-moneywise-react]").count(), 1);
        assert.equal(
          await page
            .locator(".space-place-image")
            .evaluate((img) => img.complete && img.naturalWidth > 0),
          true,
        );
        assert.match(await page.locator(".kpis").innerText(), /2,676\.00/);
      },
    );
    await run(
      "Chart presentation, keyboard scrubbing and day drill-through preserve all storage",
      async () => {
        const before = await raw(page);
        assert.match(
          await page.locator(".flow-readout").innerText(),
          /2,676\.00/,
        );
        await page
          .getByRole("button", { name: "Area chart", exact: true })
          .click();
        assert.equal(
          await page.locator(".flow-canvas").getAttribute("data-chart-style"),
          "area",
        );
        await page.getByRole("button", { name: "Daily", exact: true }).click();
        const scrubber = page.getByRole("slider", {
          name: "Explore cash flow periods",
        });
        await scrubber.focus();
        await scrubber.press("Home");
        assert.match(
          await page.locator(".flow-readout").innerText(),
          /30,000\.00/,
        );
        assert.match(
          await page.locator(".flow-readout").innerText(),
          /100\.00/,
        );
        await page
          .getByRole("button", { name: "View period", exact: true })
          .click();
        assert.match(
          await page.getByRole("dialog").innerText(),
          /Monthly salary/,
        );
        await close(page);
        await scrubber.focus();
        await scrubber.press("End");
        assert.match(
          await scrubber.getAttribute("aria-valuetext"),
          /2026-10-31/,
        );
        await page
          .getByRole("button", { name: "Monthly", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Bar chart", exact: true })
          .click();
        assert.deepEqual(await raw(page), before);
        await screenshot(page, "studio-overview");
      },
    );
    await run(
      "Category mosaic/ring and daily heatmap open actual existing workflows",
      async () => {
        const before = await raw(page);
        assert.equal(await page.locator(".heatmap-day").count(), 31);
        assert.match(
          await page.locator(".allocation-readout").innerText(),
          /2,676\.00/,
        );
        await page
          .getByRole("button", { name: "Category ring", exact: true })
          .click();
        assert.match(
          await page.locator(".category-ring-center").innerText(),
          /2,676\.00/,
        );
        await page
          .getByRole("button", { name: "Category mosaic", exact: true })
          .click();
        await page.locator('.heatmap-day[data-date="2026-10-19"]').click();
        assert.match(
          await page.getByRole("dialog").innerText(),
          /Café <b>literal<\/b>/,
        );
        await close(page);
        await page.locator('.heatmap-day[data-date="2026-10-31"]').click();
        assert.equal(await page.locator("#date").inputValue(), "2026-10-31");
        await close(page);
        await page
          .getByRole("button", { name: "View Food transactions", exact: true })
          .click();
        await page.locator("[data-page=transactions]").waitFor();
        assert.match(
          await page.locator(".ledger-totals").innerText(),
          /24 matching records/,
        );
        await nav(page, "overview");
        assert.deepEqual(await raw(page), before);
      },
    );
    await run(
      "Optional photographic welcome is accessible, responsive and never replaces ledger data",
      async () => {
        const before = await raw(page);
        await page
          .getByRole("button", { name: "Welcome", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Welcome to Moneywise", exact: true })
          .waitFor();
        await page.locator(".welcome-photo").evaluate((img) => img.decode());
        assert.match(
          await page.locator(".welcome-month").innerText(),
          /30,000\.00/,
        );
        if (process.env.MW_SCREENSHOT_DIR)
          await page.screenshot({
            path: path.join(
              process.env.MW_SCREENSHOT_DIR,
              "moneywise-studio-welcome.png",
            ),
            animations: "disabled",
          });
        await page.keyboard.press("Escape");
        await page.locator(".welcome-page").waitFor({ state: "detached" });
        assert.equal(
          await page.evaluate(() => document.activeElement?.textContent.trim()),
          "Welcome",
        );
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: "Replay welcome", exact: true })
          .click();
        assert.equal(
          await page
            .locator(".welcome-page")
            .evaluate((node) => node.scrollWidth > innerWidth + 1),
          false,
        );
        if (process.env.MW_SCREENSHOT_DIR)
          await page.screenshot({
            path: path.join(
              process.env.MW_SCREENSHOT_DIR,
              "moneywise-studio-welcome-mobile.png",
            ),
            animations: "disabled",
          });
        await page
          .getByRole("button", { name: "Continue to workspace", exact: true })
          .click();
        await page.locator(".welcome-page").waitFor({ state: "detached" });
        await page.setViewportSize({ width: 1440, height: 1050 });
        assert.deepEqual(await raw(page), before);
      },
    );
    await run(
      "Overview daily/monthly chart, exact values, budget editing and drill-through",
      async () => {
        await page.getByRole("button", { name: "Daily", exact: true }).click();
        await page.locator(".space-chart-data summary").click();
        assert.equal(
          await page.locator(".space-chart-data tbody tr").count(),
          31,
        );
        await page
          .getByRole("button", { name: "Monthly", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Edit budget", exact: false })
          .click();
        await page.locator("#monthly-budget").fill("12000");
        await save(page);
        assert.equal((await stored(page, "mw-budgets"))["2026-10"], 12000);
        await screenshot(page, "overview-light");
        await page.locator(".activity-month").last().click();
        await page.locator("[data-page=transactions]").waitFor();
      },
    );
    await run(
      "Transactions pagination, day sorting, filters and CSV across all pages",
      async () => {
        await nav(page, "transactions");
        assert.equal(await page.locator(".day-ledger").count(), 10);
        await page.getByRole("button", { name: "Page 2", exact: true }).click();
        assert.equal(
          await page
            .getByRole("button", { name: "Page 2", exact: true })
            .getAttribute("aria-current"),
          "page",
        );
        await choose(page, "Sort days", "Oldest first");
        assert.match(
          await page.locator(".space-day-date").first().innerText(),
          /^1\n/,
        );
        await choose(page, "Filter type", "Income");
        assert.equal(await page.locator(".day-ledger").count(), 1);
        await page
          .getByRole("button", { name: "Clear filters", exact: true })
          .click();
        const download = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Export CSV", exact: true })
          .click();
        const file = await download;
        const csv = fs.readFileSync(await file.path(), "utf8");
        assert.equal(csv.trim().split(/\r?\n/).length, 26);
        assert.match(csv, /Everyday Violet/);
        await page
          .getByRole("button", { name: "Month totals", exact: true })
          .click();
        assert.equal(await page.locator(".table-wrap tbody tr").count(), 1);
        await page
          .getByRole("button", { name: "Open days", exact: true })
          .click();
      },
    );
    await run(
      "Search, colored detail records, safe text, nested-menu Escape, editing and duplicate/delete/Undo",
      async () => {
        const find = async (text) => {
          await page.locator("#ledger-search").fill(text);
          await page
            .getByRole("button", { name: "Search", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Details", exact: true })
            .click();
        };
        await find("Café");
        assert.equal(await page.locator(".entry-item b b").count(), 0);
        assert.match(
          await page.locator(".entry-item").innerText(),
          /<b>literal<\/b>/,
        );
        await page.locator(".entry-item").click({ button: "right" });
        await page.getByRole("menu").waitFor();
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("menu").count(), 0);
        assert.equal(await page.getByRole("dialog").count(), 1);
        await page
          .locator(".entry-item")
          .getByRole("button", { name: "Edit", exact: true })
          .click();
        await page.locator("#amount").fill("125");
        await save(page);
        assert.equal(
          (await stored(page, "mw-tx")).find((row) => row.id === "tx-sample-18")
            .expense,
          125,
        );
        await find("Café");
        await page
          .getByRole("button", { name: "Duplicate", exact: true })
          .click();
        await page.locator("#note").fill("Duplicated meal");
        await save(page);
        assert.equal((await stored(page, "mw-tx")).length, 26);
        await find("Duplicated meal");
        await page.getByRole("button", { name: "Delete", exact: true }).click();
        await page.locator(".modal-backdrop").waitFor({ state: "detached" });
        assert.equal((await stored(page, "mw-tx")).length, 25);
        await page
          .getByRole("button", { name: "Undo delete", exact: true })
          .click();
        assert.equal((await stored(page, "mw-tx")).length, 26);
        await page
          .getByRole("button", { name: "Clear filters", exact: true })
          .click();
      },
    );
    await run(
      "Transaction validation, themed keyboard dropdown and category type filtering",
      async () => {
        await page
          .getByRole("button", { name: "Add transaction", exact: true })
          .click();
        await page.locator(".save-modal").click();
        await page.getByRole("alert").waitFor();
        await page.locator("#amount").fill("42.50");
        await choose(page, "Type", "Income");
        await page
          .getByRole("combobox", { name: "Category", exact: true })
          .click();
        await page.getByRole("listbox").waitFor({ state: "visible" });
        assert.equal(
          await page.getByRole("option", { name: "Food", exact: true }).count(),
          0,
        );
        await page.keyboard.press("Escape");
        await page.getByRole("listbox").waitFor({ state: "detached" });
        await page.getByRole("dialog").waitFor({ state: "visible" });
        assert.equal(await page.getByRole("dialog").count(), 1);
        await choose(page, "Category", "Salary");
        await page.locator("#note").fill("Side income");
        await save(page);
        assert.equal((await stored(page, "mw-tx")).at(-1).income, 42.5);
      },
    );
    await run(
      "Cards reveal, 3D flip, inert hidden face and filtered activity",
      async () => {
        await nav(page, "cards");
        const card = page.locator("[data-space-card=test-card]");
        assert.equal(
          await card.locator(".space-card-back").evaluate((node) => node.inert),
          true,
        );
        await card
          .getByRole("button", { name: "Show recorded purchases" })
          .click();
        assert.match(
          await card.locator("[data-card-purchase-value]").innerText(),
          /2,808\.00/,
        );
        await card
          .getByRole("button", { name: "Hide recorded purchases" })
          .click();
        assert.equal(
          await card.locator("[data-card-purchase-value]").innerText(),
          "••••••",
        );
        await card
          .getByRole("button", { name: "Show details for Everyday Violet" })
          .click();
        assert.equal(
          await card.locator(".react-card-face").evaluate((node) => node.inert),
          true,
        );
        assert.equal(
          await card.locator(".space-card-back").evaluate((node) => node.inert),
          false,
        );
        await card
          .getByRole("button", { name: "View activity", exact: false })
          .click();
        await page.locator("[data-page=transactions]").waitFor();
        assert.match(
          await page
            .getByRole("combobox", { name: "Filter payment" })
            .innerText(),
          /Everyday Violet/,
        );
      },
    );
    await run(
      "Cash-card creation, HEX/gradient live preview, editing and two wallet sections",
      async () => {
        await nav(page, "cards");
        await page
          .getByRole("button", { name: "Add cash card", exact: true })
          .click();
        await page.locator("#name").fill("Everyday Cash");
        await page.locator("#last4").fill("9876");
        await page.locator("#due").fill("31");
        await page.locator("#card-color-hex").fill("#abc");
        await page.locator("#card-color-hex").blur();
        await page.locator("#card-color-hex-end").fill("#123456");
        await page.locator("#card-color-hex-end").blur();
        assert.match(
          await page.locator("#card-preview").getAttribute("style"),
          /170, 187, 204/,
        );
        await save(page);
        const cash = (await stored(page, "mw-cards")).find(
          (card) => card.name === "Everyday Cash",
        );
        assert.equal(cash.kind, "cash");
        assert.equal(cash.color, "#AABBCC");
        assert.equal(cash.color2, "#123456");
        assert.equal(
          await page.locator("#wallet-cash-title").innerText(),
          "Cash cards 1",
        );
        await page
          .getByRole("button", { name: "Edit Everyday Cash", exact: true })
          .click();
        await page.locator("#name").fill("Cash Polygon");
        await save(page);
        await screenshot(page, "cards-light");
      },
    );
    await run(
      "Card calendar purchase details, date-specific quick add and short-month due dates",
      async () => {
        await page.locator(".calendar-event:not(.due)").first().click();
        await page.locator(".entry-item").first().waitFor();
        await close(page);
        await page
          .getByRole("button", {
            name: "Add expense on 2026-10-21",
            exact: true,
          })
          .click();
        assert.equal(await page.locator("#date").inputValue(), "2026-10-21");
        await page.locator("#amount").fill("50");
        await choose(page, "Category", "Food");
        await choose(page, "Payment method", "Cash Polygon · •••• 9876");
        await page.locator("#note").fill("Cash calendar purchase");
        await save(page);
        await page.getByRole("combobox", { name: "Card month" }).click();
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Edit Cash Polygon", exact: true })
          .click();
        await page.locator("#due").fill("28");
        await save(page);
        assert.equal(
          (await stored(page, "mw-cards")).find(
            (card) => card.name === "Cash Polygon",
          ).dueDay,
          28,
        );
      },
    );
    await run(
      "Installment calculator terms/rates, live totals, edit/details, manual progress and pin",
      async () => {
        await nav(page, "installments");
        await page
          .getByRole("button", { name: "Add plan", exact: true })
          .click();
        await page.locator("#name").fill("New headphones");
        await page.locator("#plan-amount").fill("6000");
        await page.getByRole("combobox", { name: "Term", exact: true }).click();
        assert.deepEqual(await page.getByRole("option").allTextContents(), [
          "1 mo",
          "3 mo",
          "4 mo",
          "6 mo",
          "10 mo",
          "12 mo",
          "15 mo",
          "18 mo",
          "24 mo",
          "36 mo",
        ]);
        await page.getByRole("option", { name: "3 mo", exact: true }).click();
        await choose(page, "Interest rate / month", "0.59%");
        assert.equal(await page.locator("#monthly").inputValue(), "2035.40");
        await save(page);
        const target = page.locator(".plan-card").filter({
          has: page.getByRole("heading", { name: "New headphones" }),
        });
        await target.getByRole("button", { name: "Edit", exact: true }).click();
        await page.locator("#name").fill("Travel headphones");
        await save(page);
        const plan = page.locator(".plan-card").filter({
          has: page.getByRole("heading", { name: "Travel headphones" }),
        });
        await plan
          .getByRole("button", { name: "Details", exact: true })
          .click();
        assert.match(
          await page.locator(".detail-metrics").innerText(),
          /2,035\.40/,
        );
        await close(page);
        const count = (await stored(page, "mw-tx")).length;
        await plan
          .getByRole("button", { name: "Mark month paid", exact: true })
          .click();
        assert.equal(
          (await stored(page, "mw-plans")).find(
            (plan) => plan.name === "Travel headphones",
          ).paidMonths,
          1,
        );
        assert.equal((await stored(page, "mw-tx")).length, count);
        await page
          .getByRole("button", { name: "Pin Travel headphones", exact: true })
          .click();
        assert.equal(
          (await stored(page, "mw-workspace")).pinnedPlans.length,
          1,
        );
        await screenshot(page, "installments");
      },
    );
    await run(
      "Category rename/color/type follows historical purchases without changing amounts",
      async () => {
        await nav(page, "categories");
        await page
          .getByRole("button", { name: "Edit Food", exact: true })
          .click();
        await page.locator("#name").fill("Meals");
        await page.locator("#card-color-hex").fill("#FF8855");
        await save(page);
        assert.equal((await stored(page, "mw-category-aliases")).Food, "Meals");
        assert.equal(
          (await stored(page, "mw-category-meta")).Meals.color,
          "#FF8855",
        );
        await nav(page, "transactions");
        await page
          .getByRole("button", { name: "Clear filters", exact: true })
          .click();
        await choose(page, "Filter category", "Meals");
        assert.ok((await page.locator(".day-ledger").count()) > 0);
        await page
          .getByRole("button", { name: "Details", exact: true })
          .first()
          .click();
        assert.match(
          await page.locator(".entry-category-chip").first().innerText(),
          /Meals/,
        );
        await close(page);
      },
    );
    await run(
      "Global search, workspace preferences, reduced motion and persistent theme",
      async () => {
        await page.keyboard.press("Control+k");
        await page.locator("#space-command-query").fill("Café");
        await page.locator("#space-command-query").press("ArrowDown");
        await page.keyboard.press("Enter");
        await page.locator(".modal-backdrop").waitFor({ state: "detached" });
        assert.equal(
          await page.locator("#ledger-search").inputValue(),
          "2026-10-19",
        );
        await page
          .getByRole("button", { name: "Workspace menu", exact: true })
          .click();
        await page
          .getByRole("menuitem", { name: "Workspace preferences", exact: true })
          .click();
        await page.locator("#space-profile-name").fill("My money studio");
        await choose(page, "Reading comfort", "Compact · more on screen");
        await choose(page, "Motion preference", "Calm · reduced motion");
        await save(page);
        await page.getByLabel("Dark mode", { exact: true }).check();
        await page.reload();
        await page.locator("[data-page=overview]").waitFor();
        assert.equal(
          await page.locator("body").getAttribute("data-motion"),
          "reduced",
        );
        assert.equal(
          await page.locator("body").getAttribute("data-density"),
          "compact",
        );
        assert.match(
          await page.locator(".space-breadcrumb").innerText(),
          /My money studio/,
        );
        assert.equal(
          await page
            .locator("body")
            .evaluate((node) => node.classList.contains("dark")),
          true,
        );
        await screenshot(page, "overview-dark");
      },
    );
    await run(
      "All five pages work at 390/768 px, themed dialogs, centered icons and sticky topbar",
      async () => {
        for (const width of [390, 768]) {
          await page.setViewportSize({ width, height: 844 });
          for (const view of [
            "overview",
            "transactions",
            "cards",
            "installments",
            "categories",
          ]) {
            await nav(page, view);
            assert.equal(
              await page.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
              ),
              false,
              `${view} overflows ${width}px`,
            );
          }
          await nav(page, "overview");
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page
          .getByRole("button", { name: "Data & settings", exact: true })
          .last()
          .click();
        const bg = await page
          .getByRole("dialog")
          .evaluate((node) => getComputedStyle(node).backgroundColor);
        assert.notEqual(bg, "rgb(255, 255, 255)");
        await close(page);
        const centered = await page.locator(".mode-thumb").evaluate((node) => {
          const a = node.getBoundingClientRect(),
            b = node.querySelector(".mode-moon").getBoundingClientRect();
          return (
            Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 1 &&
            Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 1
          );
        });
        assert.equal(centered, true);
        await screenshot(page, "mobile");
        await page.evaluate(() => scrollTo(0, 500));
        assert.equal(
          await page
            .locator(".space-header")
            .evaluate((node) => getComputedStyle(node).position),
          "sticky",
        );
        await page.setViewportSize({ width: 1440, height: 1050 });
      },
    );
    let savedSource, savedData;
    await run(
      "Backup download contains all eleven legacy keys and restores after confirmed fresh reset",
      async () => {
        const download = page.waitForEvent("download");
        await page.locator("#save-backup-button").click();
        savedSource = fs.readFileSync(await (await download).path(), "utf8");
        savedData = JSON.parse(
          JSON.parse(
            savedSource
              .trim()
              .split("\n")[1]
              .slice("window.MONEYWISE_BACKUP_JSON = ".length, -1),
          ),
        ).data;
        assert.deepEqual(Object.keys(savedData).sort(), keys.slice().sort());
        assert.equal(savedData["mw-workspace"].profile.name, "My money studio");
        await page.locator("#clear-data-button").click();
        await page.locator(".save-modal").click();
        assert.match(await page.getByRole("alert").innerText(), /CLEAR/);
        await page.locator("#clear-confirmation").fill("CLEAR");
        await save(page);
        await page.reload();
        await page.locator("[data-page=overview]").waitFor();
        assert.deepEqual(await stored(page, "mw-tx"), []);
        assert.deepEqual(await stored(page, "mw-cards"), []);
        assert.equal((await stored(page, "mw-workspace")).mode, "fresh");
        await nav(page, "cards");
        assert.equal(await page.locator("[data-space-card]").count(), 0);
        await nav(page, "overview");
        await load(page, savedSource);
        await page.waitForFunction(
          () => JSON.parse(localStorage.getItem("mw-tx")).length > 0,
        );
        assert.deepEqual(await raw(page), pack(savedData));
      },
    );
    await run(
      "Unsafe backup is rejected without execution or storage changes",
      async () => {
        const before = await raw(page);
        await load(page, 'window.MONEYWISE_BACKUP_JSON = alert("bad")');
        await page.waitForFunction(() =>
          document
            .querySelector("#ledger-notice")
            ?.textContent.includes("Could not load backup"),
        );
        assert.deepEqual(await raw(page), before);
      },
    );
    await run(
      "Storage failure leaves the form open and preserves the existing ledger",
      async () => {
        await nav(page, "transactions");
        const before = await raw(page);
        await page
          .getByRole("button", { name: "Add transaction", exact: true })
          .click();
        await page.locator("#amount").fill("12");
        await page.evaluate(() => {
          window.__originalStorageWrite = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (key === "mw-tx")
              throw new DOMException(
                "Synthetic quota failure",
                "QuotaExceededError",
              );
            return window.__originalStorageWrite.call(this, key, value);
          };
        });
        await page.locator(".save-modal").click();
        await page.getByRole("alert").waitFor();
        assert.equal(await page.getByRole("dialog").count(), 1);
        assert.deepEqual(await raw(page), before);
        await page.evaluate(() => {
          Storage.prototype.setItem = window.__originalStorageWrite;
          delete window.__originalStorageWrite;
        });
        await close(page);
      },
    );
    await run(
      "Reminders, keyboard menu, replay welcome and user reduced-motion choice",
      async () => {
        await page
          .getByRole("button", { name: "View payment reminders", exact: true })
          .click();
        await page.locator(".space-notification").first().waitFor();
        await close(page);
        await page
          .getByRole("button", { name: "Replay welcome", exact: true })
          .click();
        await page.locator(".react-intro").waitFor();
        await page
          .getByRole("button", { name: "Continue to workspace", exact: true })
          .click();
        await page.locator(".react-intro").waitFor({ state: "detached" });
      },
    );
    await context.close();
    const v1 = fixture();
    delete v1["mw-workspace"];
    delete v1["mw-budgets"];
    delete v1["mw-category-aliases"];
    delete v1["mw-tx-overrides"];
    const legacy = await setup({});
    await run(
      "Published workbook snapshot loads all legacy records/cards/plans without writing storage",
      async () => {
        assert.deepEqual(await raw(legacy.page), {});
        await nav(legacy.page, "cards");
        assert.equal(await legacy.page.locator("[data-space-card]").count(), 9);
        await nav(legacy.page, "installments");
        assert.equal(await legacy.page.locator(".plan-card").count(), 17);
      },
    );
    await run(
      "Workbook payment comparison retains all three modes and configurable card maximum",
      async () => {
        const p = legacy.page;
        await nav(p, "overview");
        await p.locator(".workbook-history>summary").click();
        await p
          .getByRole("button", { name: "Payment trend", exact: true })
          .click();
        await p
          .getByRole("img", {
            name: "Monthly credit card payment comparison",
            exact: true,
          })
          .waitFor();
        await p
          .getByRole("button", { name: "Selected cards", exact: true })
          .click();
        await p.locator(".card-comparison-picker>summary").click();
        await choose(p, "Maximum comparison cards", "6 cards");
        assert.match(
          await p.locator(".card-comparison-picker>summary").innerText(),
          /6\/6/,
        );
        await choose(p, "History range", "6 months");
        await p.locator(".react-history-data summary").click();
        assert.equal(
          await p.locator(".react-history-data tbody tr").count(),
          6,
        );
        await p.getByRole("button", { name: "By card", exact: true }).click();
        assert.ok((await p.locator(".card-payment-row").count()) > 0);
      },
    );
    await run(
      "Imported mixed daily aggregates preserve income, expenses, categories and stable ID on edit",
      async () => {
        const p = legacy.page,
          row = Finance.records(snapshot.records).find(
            (row) => row.income > 0 && row.expense > 0,
          );
        await nav(p, "transactions");
        await choose(
          p,
          "Transaction month",
          new Date(row.date.slice(0, 7) + "-01T12:00:00").toLocaleDateString(
            "en-US",
            { month: "long", year: "numeric" },
          ),
        );
        await p.locator("#ledger-search").fill(row.date);
        await p.getByRole("button", { name: "Search", exact: true }).click();
        await p.getByRole("button", { name: "Details", exact: true }).click();
        await p.getByRole("button", { name: "Edit", exact: true }).click();
        assert.equal(await p.locator("[data-aggregate=true]").count(), 1);
        await p.locator("#note").fill("React imported edit");
        await save(p);
        const edited = (await stored(p, "mw-tx-overrides"))[row.id];
        assert.equal(edited.income, row.income);
        assert.equal(edited.expense, row.expense);
        assert.deepEqual(
          edited.categories,
          Object.fromEntries(
            Object.entries(row.categories)
              .filter(([, value]) => value)
              .map(([name, value]) => [name, Math.abs(value)]),
          ),
        );
        await p.reload();
        await p.locator("[data-page=overview]").waitFor();
        assert.equal(
          (await stored(p, "mw-tx-overrides"))[row.id].note,
          "React imported edit",
        );
      },
    );
    await run(
      "Original v1 backup restores with workbook defaults and local records intact",
      async () => {
        await load(legacy.page, backup(v1, 1));
        await legacy.page.waitForFunction(
          () => JSON.parse(localStorage.getItem("mw-tx")).length === 25,
        );
        assert.equal(
          (await stored(legacy.page, "mw-workspace")).mode,
          "workbook",
        );
        assert.equal(
          (await stored(legacy.page, "mw-cards"))[0].name,
          "Everyday Violet",
        );
      },
    );
    await run(
      "System reduced motion and rapid fluid navigation leave exactly one active page",
      async () => {
        const p = legacy.page,
          before = await raw(p);
        await p.emulateMedia({ reducedMotion: "reduce" });
        await p.waitForFunction(
          () => document.body.dataset.motion === "reduced",
        );
        for (const view of [
          "cards",
          "installments",
          "categories",
          "transactions",
          "overview",
        ])
          await nav(p, view);
        assert.deepEqual(await raw(p), before);
        await p.emulateMedia({ reducedMotion: "no-preference" });
        await p.waitForFunction(() => document.body.dataset.motion === "full");
        await p.setViewportSize({ width: 390, height: 844 });
        for (const view of [
          "transactions",
          "cards",
          "installments",
          "categories",
          "overview",
          "cards",
        ])
          await p.locator(`.nav-item[data-view=${view}]`).click();
        await p.locator("[data-page=cards]").waitFor();
        assert.equal(await p.locator("[data-page]").count(), 1);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          ),
          false,
        );
      },
    );
    await legacy.context.close();
    await run(
      "Rich multi-month charts, reserved-name categories and narrow layouts keep exact ledger amounts",
      async () => {
        const rich = fixture(),
          names = [
            "Home",
            "Food",
            "Travel",
            "Health",
            "Shopping",
            "Other categories",
            "Phone",
            "Gifts",
          ],
          values = [9000, 5000, 3500, 1800, 900, 600, 250, 50];
        rich["mw-tx"] = [];
        rich["mw-category-meta"] = Object.fromEntries(
          names.map((name, i) => [
            name,
            {
              type: "Expense",
              color: [
                "#FFFFFF",
                "#000000",
                "#FFFF00",
                "#8D6BB4",
                "#6E97B5",
                "#AF7A57",
                "#99AB7C",
                "#D3A195",
              ][i],
            },
          ]),
        );
        for (const month of [
          "2026-05",
          "2026-06",
          "2026-07",
          "2026-08",
          "2026-09",
          "2026-10",
        ]) {
          rich["mw-tx"].push({
            id: `${month}-income`,
            date: `${month}-01`,
            income: 45000,
            expense: 0,
            categories: {},
            note: "Income",
          });
          names.forEach((name, i) =>
            rich["mw-tx"].push({
              id: `${month}-${name}`,
              date: `${month}-${String(i + 2).padStart(2, "0")}`,
              income: 0,
              expense: values[i],
              category: name,
              categories: { [name]: values[i] },
              card: "test-card",
              note: name,
            }),
          );
        }
        rich["mw-tx"].push({
          id: "unallocated",
          date: "2026-10-15",
          income: 0,
          expense: 123,
          categories: {},
          note: "Historical daily remainder",
        });
        const isolated = await setup(rich),
          p = isolated.page,
          before = await raw(p);
        assert.equal(
          await p
            .getByRole("slider", { name: "Explore cash flow periods" })
            .getAttribute("max"),
          "5",
        );
        assert.equal(await p.locator(".mosaic-tile").count(), 6);
        const white = p.locator(".mosaic-tile").filter({ hasText: "Home" });
        assert.equal(
          await white.evaluate((node) => getComputedStyle(node).color),
          "rgb(17, 17, 17)",
        );
        assert.equal(
          await p
            .getByRole("button", { name: /Other categories \(remaining\)/ })
            .count(),
          1,
        );
        await p
          .getByRole("button", { name: "Area chart", exact: true })
          .click();
        await p
          .getByRole("button", { name: "Category ring", exact: true })
          .click();
        await p
          .locator(".allocation-select")
          .filter({ hasText: "Other categories" })
          .focus();
        assert.match(
          await p.locator(".category-ring-center").innerText(),
          /600\.00/,
        );
        await p
          .getByRole("button", { name: "Category mosaic", exact: true })
          .click();
        await screenshot(p, "studio-rich-overview");
        await p
          .getByRole("button", { name: "View Home transactions", exact: true })
          .click();
        assert.match(
          await p.locator(".ledger-totals").innerText(),
          /1 matching records/,
        );
        assert.match(
          await p.locator(".ledger-totals").innerText(),
          /9,000\.00/,
        );
        for (const width of [320, 390, 768]) {
          await p.setViewportSize({ width, height: 844 });
          for (const view of [
            "overview",
            "transactions",
            "cards",
            "installments",
            "categories",
          ]) {
            await nav(p, view);
            assert.equal(
              await p.evaluate(
                () => document.documentElement.scrollWidth > innerWidth + 1,
              ),
              false,
              `Rich ${view} overflows ${width}px`,
            );
          }
        }
        assert.deepEqual(await raw(p), before);
        await isolated.context.close();
      },
    );
    await run(
      "Empty dark workspace and welcome keep zero values, focus trapping and reduced motion",
      async () => {
        const isolated = await setup({
            "mw-workspace": { mode: "fresh", motion: "reduced" },
            "mw-theme": "dark",
          }),
          p = isolated.page,
          before = await raw(p);
        assert.equal(
          await p.locator(".heatmap-day.heatmap-level-0").count(),
          31,
        );
        assert.match(
          await p.locator(".studio-empty-chart").innerText(),
          /No spending to plot/,
        );
        assert.equal(
          await p.locator("body").getAttribute("data-motion"),
          "reduced",
        );
        await p.getByRole("button", { name: "Welcome", exact: true }).click();
        await p.locator(".welcome-photo").evaluate((img) => img.decode());
        assert.match(await p.locator(".welcome-month").innerText(), /฿0\.00/);
        if (process.env.MW_SCREENSHOT_DIR)
          await p.screenshot({
            path: path.join(
              process.env.MW_SCREENSHOT_DIR,
              "moneywise-studio-welcome-dark.png",
            ),
            animations: "disabled",
          });
        await p
          .getByRole("button", { name: "Continue to workspace", exact: true })
          .focus();
        await p.keyboard.press("Tab");
        assert.equal(
          await p.evaluate(
            () => !!document.activeElement?.closest(".welcome-page"),
          ),
          true,
        );
        await p
          .locator(".welcome-final")
          .getByRole("button", { name: "Add a transaction", exact: true })
          .click();
        await p.locator("#amount").waitFor();
        assert.equal(await p.locator(".welcome-page").count(), 0);
        await close(p);
        assert.deepEqual(await raw(p), before);
        await screenshot(p, "studio-empty-dark");
        await isolated.context.close();
      },
    );
    assert.deepEqual(errors, [], "Browser runtime errors");
    assert.deepEqual(external, [], "All assets must be bundled locally");
    console.log(
      `\n${checks} production React checks passed. All five pages, old/new data, backups and GitHub Pages subpath verified.`,
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
