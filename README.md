# Moneywise — Personal Income & Expense

A personal-finance workspace built with **React + TypeScript + Vite**, using the supplied shadcnspace designs as real React components. It includes Overview, daily transactions, credit/cash Cards, an editable installment calculator, and color-coded categories.

## What stays compatible

The migration keeps all eleven existing `mw-*` localStorage keys, workbook/fresh mode, imported-record identities, category aliases, budgets, card gradients, pinned plans and workspace preferences. Startup reads existing storage without rewriting it. The source `data.json` workbook snapshot and Excel file are unchanged.

**Stay on http://localhost:8766/** to continue using this browser's localhost ledger. Local storage is origin-specific: `127.0.0.1`, another port, another browser and your GitHub Pages site have separate data. Use **Save data / Load data** to move a ledger deliberately. Both existing v1 and v2 `savedata.js` backups import as data only; the app never executes them. There is no backend, bank sync, account login or cloud storage.

## Run locally

Use Node.js **22.12+** (the tested environment uses Node 24) and pnpm **11.25.0**:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://localhost:8766/**. Vite compiles TSX and refreshes the page as source files change. Do not open `index.html` directly or serve the source folder using Python; browsers cannot run the uncompiled TSX entry.

On this Windows computer, double-click **Start-Preview.cmd** to start or reuse a hidden, loopback-only Vite server on port 8766. The launcher checks both the Moneywise document and Vite runtime; it will not replace an unrelated occupied port. It uses installed Node or the bundled Codex Node runtime. Install dependencies once before using it.

### Automatic preview in Codex

The parent Codex project (`D:\Money Income and Expense Personal`) has a local `.codex/hooks.json` SessionStart hook for startup/resume, calling `Start-Preview.ps1 -Quiet`. The existing command is unchanged; the launcher now starts Vite instead of Python.

Review/trust the hook once in Codex. Untrusted hooks are skipped. This runs when a Codex session starts/resumes, not every File Explorer folder click. It is not a Windows startup service. The hook is outside this Git repository; update its absolute path if moving the project. See the [official hook/trust documentation](https://learn.chatgpt.com/docs/hooks).

## Build and publish on GitHub Pages

```powershell
pnpm build
pnpm preview
```

The deployable website is **dist/**, not the TypeScript source tree. Vite uses relative asset URLs so the same build works beneath `/IncomeExpenseAnalyzer/`. There is no server requirement for the built website.

A build/test/deploy workflow is provided in [.github/workflows/pages.yml](.github/workflows/pages.yml). Before your next publication, set **GitHub repository → Settings → Pages → Source → GitHub Actions**, then push your changes to `main` when ready. The workflow installs the lockfile, runs data checks, builds, tests the built pages, and publishes only `dist/`. Do not keep the old “Deploy from branch / root” setting for the new TSX source. See [Vite deployment guidance](https://vite.dev/guide/static-deploy.html#github-pages).

No GitHub settings, commits, pushes or live deployments are performed by the migration itself. Keeping your existing GitHub Pages origin preserves the browser data for that site.

## Daily workflow

- Overview: choose a month, explore bar/area cash flow with a keyboard scrubber, category mosaic/ring and daily spending heatmap; review exact totals, set a budget, open recent activity or card spending, and inspect separate historical workbook payment comparisons.
- Transactions: daily summaries or monthly totals, combined filters, day sorting, ten-day pages, colored details, add/edit/duplicate/delete with Undo, and CSV export across all matching pages.
- Cards: separate credit/cash sections, circular/polygon patterns, two-color gradients with HEX/presets/RGB controls, live creation preview, optional spending reveal, 3D flip, calendar, due dates and direct activity filters.
- Installments: terms 1/3/4/6/10/12/15/18/24/36 months; rates 0/0.59/0.65/0.69/0.74%; live flat-interest math, linked card, first month, paid progress, pinning, edit and detailed breakdown.
- Categories: editable names, income/expense/both types and arbitrary colors. Renames follow historical entries without changing source amounts.
- Search: **Ctrl/Cmd K** searches pages, transactions, cards, plans and categories. Right-click days/entries for quick actions. Dropdowns and dialogs support keyboard use.
- Workspace preferences: local name, comfortable/compact density and fluid/calm motion. System reduced-motion preferences are respected. Financial amounts never animate as fake rolling numbers.
- Save data creates a portable backup. Load data validates and confirms before replacing the current ledger. CSV is for spreadsheets, not restore.
- Clear data is explicit and requires typing **CLEAR**. It excludes the old workbook history on subsequent visits, keeps the theme, and leaves the Excel file unchanged. Save a backup first.
- On phones, the workspace menu and footer Data & settings retain backup/reset access.
- Welcome / Replay welcome opens an optional photographic introduction with direct page and entry actions. The daily workspace opens immediately; the welcome never replaces or seeds your data.

Workbook rows are daily aggregates, not individual receipts. Card due dates are reminders, not confirmed balances. Installment progress is manual and does not automatically create transaction expenses. Do not double-count purchases and repayments.

## Source map

- `src/main.tsx`, `src/App.tsx` — bootstrap, responsive shell and lazy-loaded pages.
- `src/pages/` — the five React pages.
- `src/context.tsx`, `src/lib/model.ts`, `src/types.ts` — typed shared state, compatible storage/backup operations and selectors.
- `finance-core.js` — retained original integer-cent calculations, transaction IDs, validation, filters and CSV.
- `src/components/` — controlled forms, Radix dialogs/selects/menus, theme-aware color picker and shadcnspace adaptations.
- `space.css` + `src/styles.css` + `src/studio.css` — shadcnspace base, React bindings and the current editorial design, readable type scale and motion.
- `src/components/CashFlowExplorer.tsx`, `SpendingInsights.tsx`, `src/lib/charts.ts` — exact real-data chart exploration, category allocation and spending calendar.
- `src/components/WelcomePage.tsx`, `Assets/moneywise-welcome.png` — lazy-loaded welcome and original local photograph; see [UI-DIRECTION.md](UI-DIRECTION.md) for design rationale and generation prompt.
- `Assets/shadcnspace asset/` — preserved downloaded examples; see [ASSET-INTEGRATION.md](ASSET-INTEGRATION.md).
- `legacy.html` and the original JS/CSS files — retained reference implementation, not part of the production build.
- [project.md](project.md), [MIGRATION.md](MIGRATION.md) — project history, migration safeguards and validation.

## Verification

Latest interface pass: **32 data/calculation checks** and **26 production-browser scenarios** pass, including new chart/welcome interactions and rich-data layouts down to 320px. Details and the debugging ledger are in [UI-DIRECTION.md](UI-DIRECTION.md) and [project.md](project.md).

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:pages
```

The original finance-core suite and new typed-model tests verify compatibility. The React browser suite tests **the production build**, all five pages, old/new ledgers, backups, mobile layouts, keyboard controls, themes and GitHub Pages subdirectory paths. It starts a temporary server and uses a disposable browser profile, never your normal browser storage. It requires Microsoft Edge by default; set `PLAYWRIGHT_CHANNEL=chromium` after `pnpm exec playwright install chromium` for another machine. Set `MW_SCREENSHOT_DIR` to an existing directory to save screenshots.

Windows-only `node tests/preview-startup.cjs` checks the actual parent-project hook command, cold startup, reuse/concurrency and occupied-port safety on temporary ports. It never stops the normal preview.

Earlier browser-smoke/real-world/space-ui suites are historical tests for `legacy.html`, not React coverage. The active React suite is `tests/react-pages.cjs`.

## Asset attribution

Keep notices and licenses with the supplied examples. Recasting a downloaded component does not grant a new blanket license. The local brand and landscape SVGs are project-created. Retained bubble/GSAP/ASCII effects are not loaded by the React app; the bubble source retains its GPL-2.0 license. Verify redistribution terms for any retained asset without a license before republishing it.
