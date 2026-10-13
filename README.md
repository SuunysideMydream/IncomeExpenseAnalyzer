# Moneywise — Personal Income & Expense

A static personal-finance dashboard built from the accompanying Excel tracker. It includes a daily transaction ledger, credit-card wallet and calendar, editable installment plans, and color-coded categories.

## Run locally

Open `index.html` with a local static server. For example:

```powershell
python -m http.server 8765
```

Then visit `http://localhost:8765`.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. In the GitHub repository, open **Settings → Pages**.
3. Select **Deploy from a branch**, then choose `main` and `/ (root)`.
4. Save. GitHub will provide the public site URL after deployment.

## Data

`data.json` is the published, browser-readable snapshot of the workbook data. Changes made through the UI are saved only in the browser’s local storage for now; they do not change the source Excel workbook.

## Daily workflow

- Add a transaction, then open its day’s **Details** to edit, duplicate, or delete it. Delete offers Undo until the next transaction change or reload.
- Use search, type/category/payment filters, and day sorting to find entries. Totals reflect matching whole records; workbook rows may contain several categories and both income and expense.
- Overview and month totals use the current ledger, including saved edits. Select an income/spending chart month to open its daily ledger.
- **Export CSV** exports the filtered daily view (all pages), or all records in the 12 months shown in Month totals.
- **Save data** creates a restorable `savedata.js` backup. **Load data** restores it after confirmation. Existing backups remain supported. CSV is not a restorable backup.
- **Settings** explains local data storage and provides backup shortcuts. Browser data does not sync across devices.

## Tests

No build step or runtime packages are required by the app. Run the data tests with Node:

```powershell
node --test tests/finance-core.test.cjs
```

For the optional end-to-end regression suite, make Playwright available to Node and install Microsoft Edge, then run:

```powershell
npm install --no-save playwright
node tests/browser-smoke.cjs
```

The browser test starts its own local static server and uses a separate, disposable browser context; it never uses your normal browser profile. `PLAYWRIGHT_CHANNEL` can select another installed Chromium-based browser. `MW_SCREENSHOT_DIR` optionally saves preview screenshots to an existing directory.

## Animated background attribution

The ambient bubble layer uses the downloaded `JS-Animated-Bubbles-Background` asset. Its original JavaScript and GPL-2.0 license are retained in `Assets/JS-Animated-Bubbles-Background-master/`; `bubble-background.css` contains the Moneywise-specific glass-layer integration and readability tuning.
