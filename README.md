# Moneywise — Personal Income & Expense

A personal-finance workspace built with **React + TypeScript + Vite**, with a monthly Overview, daily Transactions, a full-page Calendar, credit and cash Cards, Subscriptions, an installment calculator, and color-coded Categories.

## What stays compatible

The app reads the eleven original `mw-*` localStorage keys in place. A separate optional `mw-subscriptions` key holds recurring plans. Backups include plans and links to recorded renewals. Existing v1 and v2 backups still restore, with an empty tracker when the subscription key is absent.

**Stay on http://localhost:8766/** to continue using this browser's localhost ledger. Local storage is origin-specific: `127.0.0.1`, another port, another browser and your GitHub Pages site have separate data. Use **Save data / Load data** to move a ledger deliberately. Both existing v1 and v2 `savedata.js` backups import as data only; the app never executes them. There is no backend, bank sync, account login or cloud storage.

## Run locally

Use Node.js **22.12+** (the tested environment uses Node 24) and pnpm **11.25.0**:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open **http://localhost:8766/**. Vite compiles TSX and refreshes the page as source files change. Do not open `index.html` directly or serve the source folder using Python; browsers cannot run the uncompiled TSX entry.

On Windows, double-click **Start-Preview.cmd** to start or reuse a hidden, loopback-only Vite server on port 8766. The launcher verifies both the Moneywise document and Vite runtime and retries transient startup delays. It uses installed Node or the bundled Codex Node runtime. Install dependencies once before using it.

### Start at Windows sign-in

`Set-PreviewStartup.ps1` adds **Moneywise Local Preview** to the current user's Windows Startup folder. It runs the quiet launcher when you sign in, independently of Codex. Both startup paths reuse the same server on port 8766.

Run the installer from this repository in PowerShell. Use `-Remove` to remove the shortcut. Run the installer again after moving the repository so the shortcut points to its new location. [Windows Startup documentation](https://support.microsoft.com/en-us/windows/experience/startup-boot/configure-startup-applications-in-windows)

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

- **Overview** puts the month controls, net balance, budget, and installments above Cash flow. Choose **Spending pace** to compare cumulative spending through the same day of this month and the previous one. Hover, tap, or use the day slider, then select **View day** for the entries. Monthly and daily bars and area charts, category allocation, the heatmap, and historical card payments are also available.
- Transactions: daily summaries or monthly totals, combined filters, day sorting, ten-day pages, colored details, add/edit/duplicate/delete with Undo, and CSV export across all matching pages.
- **Calendar** has a full-width month grid and an agenda. Click a date or press Enter on a focused date to open the day drawer. It shows recorded income, gross expenses, net cash flow, per-card purchases and reminders, and subscription renewals. Use the arrow keys to move between dates, Page Up or Page Down to change months, and Escape to close the drawer.
- **Cards** keeps separate credit and cash sections, editable gradients, live previews, and direct activity filters. Hover over a card to see the back, tap on a touchscreen, or Tab to the card and press Enter. In the card editor, choose a Mastercard, Visa, UnionPay, or JCB mark, or leave the corner blank. Both gradient colors have a HEX field, preset swatches, and RGB sliders. **Open card calendar** takes you to the standalone calendar with your wallet month and the Cards filter selected.
- **Subscriptions** supports weekly, monthly, quarterly, and yearly schedules. Inspect the 30-day forecast, then select a renewal to record it, link an existing expense, or skip it. A **Website icon** can identify the subscription in the list, forecasts, and Calendar.
- **Installments** calculates flat monthly interest and tracks the first month, linked card, and paid progress. In **Edit → Plan appearance**, choose a glyph or website icon and optionally import a JPEG, PNG, or WebP cover. Zoom and drag the live preview to frame the photo. The cover and framing are included in backups.
- Categories: editable names, income/expense/both types and arbitrary colors. Renames follow historical entries without changing source amounts.
- **Ctrl/Cmd K** opens search and quick actions from any page. Add income or an expense, open today in Calendar, or find pages and records by name, note, date, card digits, or a saved website. Use arrow keys and Enter or select a result. Right-click transaction days or entries for additional actions.
- Workspace preferences store your name, reading density, and motion preference. The light and dark themes have a localized animated background and a short reveal on browsers that support View Transitions. Choose **Calm** to pause decorative motion. The app also follows the system reduced-motion setting.
- Save data creates a portable backup. Load data validates and confirms before replacing the current ledger. CSV is for spreadsheets, not restore.
- Clear data is explicit and requires typing **CLEAR**. It excludes the old workbook history on subsequent visits, keeps the theme, and leaves the Excel file unchanged. Save a backup first.
- On phones, the workspace menu and footer Data & settings retain backup/reset access.
- Welcome / Replay welcome opens an optional photographic introduction with direct page and entry actions. The daily workspace opens immediately; the welcome never replaces or seeds your data.

Workbook rows are daily aggregates, not individual receipts. Card due dates are reminders, not confirmed balances. Installment progress is manual and does not automatically create transaction expenses. Do not double-count purchases and repayments.

Entering a website in either editor looks up the icon using its public hostname. The app stores a small PNG with the record for reuse in Calendar, search, and backups. [Icon Horse](https://icon.horse/)

## Source map

- `src/main.tsx`, `src/App.tsx` — bootstrap, responsive shell and lazy-loaded pages.
- `src/pages/` — the seven React pages.
- `src/context.tsx`, `src/lib/model.ts`, `src/types.ts` — typed shared state, compatible storage/backup operations and selectors.
- `finance-core.js` — retained original integer-cent calculations, transaction IDs, validation, filters and CSV.
- `src/components/` — controlled forms, Radix dialogs/selects/menus, theme-aware color picker and shadcnspace adaptations.
- `space.css`, `src/styles.css`, `src/studio.css`, and `src/workbench.css` — shadcnspace base, React bindings, and the current type, layout, theme, and motion rules.
- `src/components/CashFlowExplorer.tsx`, `SpendingInsights.tsx`, `src/lib/charts.ts` — exact real-data chart exploration, category allocation and spending calendar.
- `src/lib/recurring.ts`, `src/lib/calendar.ts`, and `src/lib/routes.ts` — recurring dates and statuses, calendar projections, and bookmarkable workspace routes.
- `src/components/CalendarDetails.tsx`, `Atmosphere.tsx`, and `ThemeSwitch.tsx` — day drawer, ambient background, and theme reveal.
- `src/components/ui/date-picker.tsx` and `src/controls.css` — themed form controls, date and month popups, and responsive artwork.
- `src/components/WelcomePage.tsx`, `Assets/moneywise-welcome.png` — lazy-loaded welcome and original local photograph; see [UI-DIRECTION.md](UI-DIRECTION.md) for design rationale and generation prompt.
- `Assets/shadcnspace asset/` — preserved downloaded examples; see [ASSET-INTEGRATION.md](ASSET-INTEGRATION.md).
- `legacy.html` and the original JS/CSS files — retained reference implementation, not part of the production build.
- [project.md](project.md), [MIGRATION.md](MIGRATION.md) — project history, migration safeguards and validation.

## Verification

The latest build passed **48 data and calculation checks** and **35 production-browser scenarios**, including spending comparisons, command-palette navigation, card interactions, cover framing, and backup compatibility. See [project.md](project.md#validation-completed).

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:pages
```

The original finance-core suite and typed model tests verify compatibility. The React browser suite exercises **the production build** across all seven pages, with old and new ledgers, backups, mobile layouts, keyboard controls, themes, and GitHub Pages subdirectory paths. It uses a temporary server and disposable browser profile. The default browser is Microsoft Edge. To use Chromium, run `pnpm exec playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`. Set `MW_SCREENSHOT_DIR` to an existing directory to save screenshots.

Windows-only `node tests/preview-startup.cjs` checks the parent-project hook command, cold startup, slow runtime readiness, reuse, concurrent launches, and occupied-port safety on temporary ports.

Earlier browser-smoke/real-world/space-ui suites are historical tests for `legacy.html`, not React coverage. The active React suite is `tests/react-pages.cjs`.

## Asset attribution

The self-hosted Inter variable font uses the SIL Open Font License. See [font provenance and license](Assets/fonts/README.md).

Keep notices and licenses with the supplied examples. Recasting a downloaded component does not grant a new blanket license. The local brand and landscape SVGs are project-created. Retained bubble/GSAP/ASCII effects are not loaded by the React app; the bubble source retains its GPL-2.0 license. Verify redistribution terms for any retained asset without a license before republishing it.
