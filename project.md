# Moneywise — Project Notes

Last updated: 2026-10-21

## Project goal

Moneywise is a personal income and expense application for organizing everyday finances in a clearer and more visual way than the original spreadsheet.

The application is based on the manually maintained workbook:

`D:\Money Income and Expense Personal\My Income Expense.xlsx`

The long-term goal is to make it easy to record transactions, understand spending patterns, track credit-card usage, plan installment purchases, and review monthly financial health from one calm, readable interface.

The app now supports a fresh personal workspace: **Clear data → optionally download a backup → type CLEAR → confirm**. This removes finance records for this site in this browser and keeps the bundled workbook history excluded on subsequent visits. The source Excel file and repository snapshot are unchanged. Clearing or testing the app does not automatically clear data in the user's normal browser profile.

## Core functions

### 1. Monthly overview

- Select a month to review.
- View income, spending, net balance, and tracked card count.
- Compare monthly workbook card-payment totals by card, review the highest payment, and explore total or selected-card trends.
- Browse card-payment months independently from the main overview month; separate workbook payment totals from card-tagged transaction spending.
- Review the largest expense categories.
- Review average daily spending, highest spending day, active installment commitments, and the next card due date.
- Use quick Income / Expense entry, navigate months with arrows, and see the last recorded transaction date.
- Set a monthly spending budget, view remaining room, compare spending against the previous month when records exist, and open recent activity details.
- Review live card-tagged purchases with direct links into filtered transactions. Imported workbook payment history is kept in a separate expandable section.
- Explore grouped bars or bounded smooth areas for monthly/daily cash flow, with pointer inspection, a keyboard range control, exact totals and period drill-through.
- Switch category allocation between a proportional mosaic and segmented ring; use exact amounts to open matching whole records. A local-date spending heatmap opens day details or a new expense for an empty day.
- Select a summary metric to open the relevant transactions or installment plans.

### 2. Transactions

- Add income or expense transactions.
- Choose a date, amount, category, optional card, and note.
- View transactions as a daily summary so a busy day is represented by one readable row.
- View monthly totals.
- Paginate daily activity.
- Open day details to see the individual transactions recorded for that date.
- Edit, duplicate, or delete any local transaction or imported daily record; Undo the most recent deletion until the next transaction change or reload.
- Search by note, category, card name, or date; combine type, category, and payment filters.
- Sort days newest-first, oldest-first, or highest-spending-first.
- Export matching records to CSV, including exact amounts, category breakdowns, and notes.
- Monthly overview, ledger totals, and card spending now derive from the same effective transaction records, including edits and deletions.

### 3. Cards

- Select the wallet month above the card sections. A section with one card shows recorded monthly purchases, daily-volume bars, recent entries and an activity link alongside it. The existing calendar uses the same month.

- Display tracked cards in separate **Credit cards** and **Cash cards** sections, with counts and add actions. Existing cards default to credit; choose the type in the add/edit form. Credit cards use circular patterns, while cash cards use polygon facets.
- Choose gradient start and end colors, each with independent HEX input, presets, and RGB sliders. Three-digit HEX values are accepted and expanded. Both colors and the selected card pattern appear in the live preview and remain saved when the card is edited or restored from backup.
- Store a friendly card name and mock last four digits.
- Store card status and payment due day.
- Preview the card design before saving.
- Use the themed color controls in either light or dark mode; invalid HEX values prevent saving.
- View card spending by month.
- View card spending and payment dates in a calendar layout.
- Open a card's filtered transaction history from its spending chip. Calendar purchases open day details; calendar ＋ buttons start an expense on that date.
- View monthly recorded purchase totals, transaction counts, and the number of cards used. These represent logged purchases, not a reconciled bank statement balance.
- Due days are stored independently and clamp to the last day of shorter months; the overview lists upcoming dates from today.

### 4. Installments

- Add and edit installment plans.
- Select a term from `1, 3, 4, 6, 10, 12, 15, 18, 24, 36 months`.
- Select a monthly interest rate from `0%, 0.59%, 0.65%, 0.69%, 0.74%`.
- Automatically calculate monthly payment without interest.
- Automatically calculate monthly payment with interest.
- Automatically calculate total payment with interest.
- Edit purchase name, original amount, term, interest rate, and status.
- Open a detailed breakdown for each plan.
- Set a first payment month, link a card, and enter payments already made.
- Use **Mark month paid** to advance progress; the plan becomes Completed after the last payment. This updates the plan tracker without automatically creating an expense.

### 5. Categories

- Create new categories.
- Edit category name, type, and color.
- Support `Expense`, `Income`, and `Both` category types.
- Reuse category colors in charts, summaries, and visual indicators.
- Add an optional starter set after a fresh start, or create categories individually.
- Renaming preserves existing transaction category displays through a saved alias map; duplicate category names are rejected.
- See each category's entry count and income/spending amount for the selected overview month. Category color editing now uses the themed HEX/preset/RGB control.

### 6. Visual experience

- Complete shadcnspace-based redesign: a sticky two-row top bar replaces the sidebar, with clear active navigation and a horizontally scrollable mobile nav row.
- A cohesive light/dark palette, violet accents, restrained translucent header, solid readable panels, larger amounts, and stronger supporting-text contrast.
- React/TypeScript adaptation of every supplied component family; see `ASSET-INTEGRATION.md` for the source-to-feature map. Original downloads remain intact; adapted TSX components are compiled by Vite.
- Global search (Ctrl/Cmd K) across pages, transaction notes/dates/categories, cards, and installment plans.
- Liquid-wave welcome that dismisses when data is ready; explicit replay does not alter data.
- Rotating overview copy and circular quick-add text, separate from actual financial amounts.
- Landscape budget card, daily/monthly cash-flow chart with exact totals, category donut, recent activity, and event-style payment reminders.
- 3D wallet flips, purchase visibility controls, gold chip artwork, and circular/polygon patterns; hidden faces are inert for keyboard users.
- Product-style installment cards with saved pins, progress, edit/details, and manual payment actions.
- Numbered daily pagination and keyboard-accessible context menus for day/transaction actions.
- Themed selects with keyboard selection, type-to-find, Escape handling, and focus restoration; segmented controls retain a moving selected marker.
- Color-coded day details and category chips; a centered SVG sun/moon switch.
- Workspace name, reading density, and reduced-motion preferences persist and travel with backups.
- Motion springs and shared-layout indicators with system/per-workspace reduced-motion handling. Pages enter without retaining outgoing interactive routes; calm pages and dialogs switch directly. Previous bubble, GSAP, ASCII and stacked glass layers remain on disk but are not loaded.

## Current implementation

The active application is now **React + TypeScript + Vite**. It still deploys as a static website; there is no API/database/authentication service.

- `index.html` / `src/main.tsx` — React entry, local snapshot loading and startup error handling.
- `src/App.tsx` — responsive topbar, theme, save/load/clear actions, global navigation and lazy-loaded pages.
- `src/pages/` — Overview, Transactions, Cards, Installments and Categories.
- `src/context.tsx` / `src/lib/model.ts` / `src/types.ts` — typed shared store, compatible selectors, storage operations, backup validation and rollback.
- `finance-core.js` — original integer-cent math, stable transaction identities, validation, filters and CSV; shared with the original tests.
- `src/components/Dialogs.tsx` — controlled React forms and detail/search/reminder/settings dialogs.
- `src/components/ui/` — themed Radix selects/menus/dialog support and shared controls.
- `src/components/shadcnspace/` — genuine React adaptations of the supplied card, text, splash and pagination components.
- `space.css` + `src/styles.css` + `src/studio.css` — preserved shadcnspace foundation, React bindings, and current editorial layout/typography/theme refinements.
- `src/components/CashFlowExplorer.tsx`, `SpendingInsights.tsx`, `Reveal.tsx` and `src/lib/charts.ts` — interactive real-data charts, proportional allocations, daily heatmap and motion boundaries.
- `src/components/WelcomePage.tsx` / `Assets/moneywise-welcome.png` — optional photographic welcome with real workspace totals and direct page/entry actions. It is lazy-loaded and never gates startup; open Welcome on desktop or Replay welcome in the footer.
- `data.json` — unchanged published workbook snapshot, bundled as a local build asset.
- `Assets/shadcnspace asset/` — preserved original examples; see `ASSET-INTEGRATION.md`.
- `Start-Preview.ps1` / `Start-Preview.cmd` — hidden loopback-only Vite launcher with identity/runtime checks and concurrent-start protection.
- `.github/workflows/pages.yml` — lockfile installation, data tests, build, production browser tests and Pages deployment for future authorized pushes.
- `tests/model.test.ts` / `tests/charts.test.ts` / `tests/react-pages.cjs` — typed compatibility, financial visualization and production React workflow checks.
- `legacy.html` and the original JS/CSS files — retained reference implementation; not included in the production build.

Downloaded bubble/GSAP/ASCII effects and earlier CSS layers remain on disk. They are not loaded by the active React shell.

User-created changes are stored in browser `localStorage` using these keys:

- `mw-tx` — added transactions.
- `mw-tx-overrides` — edits and deletion markers for imported daily records; the published snapshot is never modified by these actions.
- `mw-cards` — added credit cards.
- `mw-plans` — added installment plans.
- `mw-category-meta` — category names, types, and colors.
- `mw-card-overrides` — edits to imported card records.
- `mw-plan-overrides` — edits to imported installment records.
- `mw-theme` — selected light or dark mode.
- `mw-workspace` — workspace mode (`workbook` or `fresh`), fresh-start timestamp, profile name, reading density, motion preference, and pinned installment IDs; included in backups so restoring a fresh ledger does not revive workbook records.
- `mw-budgets` — spending limit keyed by month.
- `mw-category-aliases` — persistent category rename mappings used when displaying and exporting earlier records.

The application does not currently write changes back to the source Excel workbook.

For local Windows development, double-click `Start-Preview.cmd`. It starts the server from the repository folder and checks `http://localhost:8766/`. Run it again after a restart or if the preview server exits. `Start-Preview.ps1` uses installed Node.js or the bundled Codex Node runtime and starts the local Vite CLI. Run `pnpm install --frozen-lockfile` once before launching. Python cannot serve the uncompiled React source. The launcher does not publish the app to GitHub Pages.

Use the header's **Save data** control to export these user changes as a portable `savedata.js` backup. **Load data** imports that file after confirmation and replaces the browser's current saved changes. The backup is a strict data-only JavaScript wrapper; the app parses it as text and never executes the imported file. When supported, the browser save picker lets the user choose the destination; otherwise it downloads to the browser's configured download folder.

New exports use the v2 data-only JavaScript wrapper and include workspace mode, budgets, category aliases, and transaction overrides. V1 backups still import, defaulting to workbook mode when workspace settings are absent. The format bump prevents older app versions from silently ignoring the fresh-start setting. Import checks the wrapper against the payload version, validates values before writing, and attempts rollback if storage fails. CSV is intended for spreadsheets, not backup restoration. Data & settings explains this distinction and provides backup and clear-data controls.

Imported transaction IDs use the source date plus its occurrence on that date. Local legacy entries receive index-based IDs that are persisted before mutation. Keep the source snapshot stable: changing the ordering of multiple source rows on the same date requires an explicit ID migration.

## Completed issues and solutions

### Issue: Equal visual weight and basic charts made the workspace harder to scan

Solution (2026-10-21 interface refinement):

- Applied `frontend-skill` to flatten routine dashboard containers, strengthen type hierarchy, and separate operating information from the optional welcome. `apple-design` informed immediate press feedback, interruptible springs, section reveals, scroll progress and cursor-responsive wallet lighting.
- Rebuilt cash flow as bar/area exploration. Category mosaic/ring views preserve exact allocations; excess allocations and unallocated residuals are explained rather than silently changing totals. The heatmap derives every date from the selected local month.
- Added exact-value, keyboard and day/category navigation paths alongside the charts. User-selected tile colors choose light/dark text by luminance. Sparse wallets show real activity beside the card.
- Created a local, original welcome photograph with the built-in image generator. The full-bleed welcome has an explicit close action, keyboard focus handling, actual workspace totals and page/entry actions. No artificial loading timer or new persistence key was introduced.
- Preserved all financial workflows, all eleven storage keys, workbook/fresh mode, IDs, backups, and the existing model and finance core. See `UI-DIRECTION.md` for design rationale and the exact image prompt.

### Issue: Migrating the framework must not lose existing finance data or workflows

Solution (2026-10-21 React migration):

- Rebuilt all five pages as controlled React/TypeScript components using Vite, Motion, Lucide and Radix. Supplied shadcnspace examples now inform genuine TSX components rather than only a native-JS adaptation.
- Kept all eleven storage keys, stable imported/local IDs, fresh/workbook mode, aliases, budgets, gradients, pins, preferences and strict v1/v2 backup compatibility. No automatic rewrite or clearing occurs on startup.
- Retained the original calculation core and source snapshot, plus `legacy.html` for reference. Existing unrelated worktree changes were preserved.
- Added a typed transactional external store, rollback checks, lazy page chunks, explicit input validation and portable data-only backup restore.
- Scoped motion so ongoing decoration cannot retain an old route. Full-motion pages spring into place; calm pages/dialogs switch directly. Menus, card flips, charts and active navigation have independent lifecycles.
- Updated the same-origin port-8766 preview launcher from Python to Vite, keeping the existing Codex hook command/trust requirement.
- Added production workflow tests for every page, existing backups and GitHub Pages subpath assets. See `MIGRATION.md` and `MIGRATION-TEST-LOG.md` for safeguards and test evidence.
- Added a Pages build workflow and instructions. No GitHub push, deployment or account setting was changed.


### Issue: Reopening the Codex project still required manually restarting localhost

Solution (2026-10-21):

- Added a project-local `SessionStart` hook for `startup`/`resume` at `D:\Money Income and Expense Personal\.codex\hooks.json`, matching the saved Codex project's parent-folder root.
- The hook runs `IncomeExpenseAnalyzer\Start-Preview.ps1 -Quiet` through Windows PowerShell, with a 45-second timeout. The launcher checks the actual served application and reuses a healthy preview rather than opening another server.
- Added the optional `-Quiet` switch for non-interactive startup; normal manual launcher messages remain unchanged. The server stays loopback-only on port 8766.
- Hook trust is a required one-time user action; no trust bypass, Windows startup entry, recurring automation, or global hook was installed. A session start/resume is the trigger, not every project-name click.
- The hook configuration is outside the Git repository because Codex opens the parent directory. Moving the project requires updating its absolute launcher path.
- Startup testing reproduced a restricted Windows CIM/network-listener query returning Access denied while HTTP 200 and netstat confirmed an existing preview. The previous SilentlyContinue behavior treated that as an absent listener and could start a duplicate. HTTP identity/readiness checks and a per-port mutex replace that query.
- The hidden server now launches with ShellExecute so it does not retain the hook's output pipes after the launcher finishes. Existing servers and unrelated occupied ports are not stopped or replaced.
- `node tests/preview-startup.cjs` passed using the actual hook command and temporary ports: cold start, quiet output/closed pipes, correct source folder, repeated/concurrent reuse, and unrelated-port safety. Only test-owned processes were cleaned up; the normal port-8766 preview remained available.
- Automatic lifecycle dispatch still requires the user to trust the hook and reopen/resume the chat. It has not been claimed as verified before that approval.

### Issue: Supplied shadcnspace assets use a different framework

Solution (2026-10-19 redesign):

- Inspected the TSX imports and adapted each component family into the static application instead of introducing an incomplete React dependency graph.
- Rebuilt all five page surfaces and the shell with one design system while retaining financial calculations, state keys, data-only backup validation, fresh mode, and existing form workflows.
- Recast unrelated place, event, product, and sign-in demos as budget, due-date, installment, and local personalization interfaces.
- Removed the old runtime search-shortcut conflict so the topbar opens one global search dialog. Updated card activity tests to flip before accessing the intentionally hidden back face.
- Updated the preview launcher's page identification so the new document title is accepted without weakening the check to an arbitrary HTTP 200.
- Added a dedicated isolated interaction suite for the redesign; original finance/workflow suites remain active.

### Issue: Old workbook data returned when trying to start a real personal ledger

Solution (2026-10-19):

- Added a Clear data control in the header and Settings, with an optional backup action and typed CLEAR confirmation.
- Reset transactions, both card types, plans, categories, budgets, rename aliases, and overrides together; keep the selected theme and unrelated site storage.
- Store a persistent fresh-workspace mode so imported records, cards, plans, categories, and payment schedules remain excluded after reload.
- Include the mode in v2 backups and support explicit restoration of earlier v1 workbook-based backups.
- Added fresh-workspace empty states and opt-in starter categories; no previous records are fabricated or carried into the fresh ledger.

### Issue: Day-to-day workflows and text were too hard to follow

Solution (2026-10-19):

- Renamed the navigation item to Cards and enlarged the heading, amount, form, and detail typography.
- Added quick income/expense entry, month navigation, monthly budgets, live card activity, recent entries, and upcoming due reminders.
- Added calendar entry/detail actions and short-month due-day handling.
- Added installment start month, card association, manual progress, and remaining-payment detail. Progress changes do not duplicate transaction spending.
- Resolved category renames on existing entries and added category usage totals and duplicate-name checks.
- Kept the imported-history section open across chart-mode changes and limited browser test animation waits to visible running animations.

### Issue: The card wallet needed to distinguish cash cards from credit cards

Solution (2026-10-14):

- Kept the existing cards in a dedicated Credit cards section and added a Cash cards section below it.
- Added a type field in the shared add/edit form; existing cards default to credit cards.
- Kept the circular appearance for credit cards and added angular polygon facets to cash cards.
- Added independent gradient start and end colors with HEX entry, presets, and RGB controls. The preview tracks both colors and the card type. Card records and portable backups retain the new fields.

### Issue: The local preview server stopped between sessions

Solution (2026-10-14):

- Added a double-click Windows launcher that reuses an active Moneywise preview or starts one from the repository folder on port 8766.
- The launcher checks that the page responds and reports if another app is serving on that port.
- Added the local run instructions to the README. Starting this local preview does not publish updates to GitHub Pages.

### Issue: Controls and active views were visually inconsistent

Solution (2026-10-13 UI pass):

- Enhanced every single-choice select with a themed menu while retaining its underlying value and existing form events.
- Added keyboard menu controls and focus restoration, and kept Escape within an open menu from also closing its parent dialog.
- Added a moving selection marker and explicit active styling to daily/monthly and card-chart view selectors.
- Replaced the loaded theme-switch asset with a small SVG-based switch; the downloaded asset remains in Assets as a reference.
- Added colored transaction symbols, category chips, amount badges, and accent borders.
- Made navigation sticky and animated chart bars/lines on entering view, with 35ms staggering capped at 245ms plus a 60ms lead-in. Reduced-motion preferences show the chart immediately.

### Issue: New entries did not update all summaries or appear in month selectors

Solution (2026-10-13):

- Added one effective ledger combining the workbook snapshot, transaction overrides, and local entries.
- Overview income/spending, daily totals, monthly totals, and the activity chart now read that ledger instead of cached workbook monthly summaries.
- Month choices include source months, user-entry months, and the current month. Saving an entry selects its month and clears filters so it can be found immediately.
- Added regression checks that reconcile the unedited ledger to the original workbook month totals.

### Issue: Managing saved transactions required too much manual work

Solution (2026-10-13):

- Added edit, duplicate, confirmed deletion, and Undo in the daily detail workflow.
- Preserved imported multi-category daily records through an aggregate editor.
- Added filters, sorting, exact totals, and CSV export across all matching pages.
- Included workbook edits in portable backups while accepting older backups without the new field.
- Added storage-failure rollback checks and keyboard focus containment in dialogs.

### Issue: Navigation disappeared on small screens

Solution (2026-10-13):

- Retained the existing navigation as a horizontally scrollable row on phones.
- Made new filters and toolbar controls wrap at narrow widths.
- Verified the ledger at 390px width without page-level horizontal overflow.

### Issue: The original spreadsheet is useful for history but not for daily review

Solution:

- Workbook data was converted into `data.json` for fast browser loading.
- The original workbook remains the source reference.
- The interface summarizes records by day and month instead of showing a long raw spreadsheet-style list.

### Issue: Transaction lists become difficult to scan

Solution:

- Added a daily ledger with one row per active day.
- Added daily category bars, income, spending, net value, and entry count.
- Added pagination and a month-total view.
- Added a day-details modal for individual transactions.

### Issue: Credit-card records need a stronger visual identity

Solution:

- Added editable card names, mock last four digits, colors, status, and due day.
- Added a live card preview in the add/edit form.
- Added color-coded calendar events and monthly card summaries.
- Added separate cash-card styling and editable two-color gradients in the 2026-10-14 wallet update.

### Issue: Installment payments need to be recalculated consistently

Solution:

- Centralized the calculation in `calcPlan()`.
- Added fixed term and interest-rate dropdown lists.
- Recalculate payment values while editing the form.
- Show both interest-free and interest-inclusive values in the detail modal.

The current formula is flat monthly interest:

```text
monthly without interest = original amount / term
monthly interest = original amount × interest rate / 100
monthly with interest = monthly without interest + monthly interest
total with interest = monthly with interest × term
```

### Issue: Categories need to be visually meaningful

Solution:

- Added editable category metadata.
- Added type selection for expense, income, or both.
- Added a color picker.
- Reused category colors in summaries and category tiles.

### Issue: Dark mode left some controls and dialogs too bright

Solution:

- Added explicit dark theme variables and overrides.
- Updated modal surfaces, buttons, native select options, calendar days, pagination controls, category tiles, and detail surfaces.
- Added `color-scheme: dark` behavior for native controls.

### Issue: Simple modal transitions did not match the rest of the interface

Solution:

- Added trigger-origin modal motion using CSS variables.
- Added open and closing states instead of removing the modal immediately.
- Added Escape-to-close, backdrop close, focus restoration, and initial focus.
- Added route transitions and card hover tilt using compositor-friendly transforms where possible.

### Issue: Liquid-glass styling can reduce readability

Solution:

- Applied glass treatment mainly to cards, sidebar, dialogs, controls, calendar cells, and category surfaces.
- Kept the data surfaces opaque enough to preserve contrast.
- Added reduced-transparency fallback styles.

### Issue: The downloaded bubble demo changes the whole document background

Solution:

- Loaded only the original `movingbubbles.js` asset.
- Did not load the demo stylesheet, which would change the document stacking model.
- Added `bubble-background.css` to place bubbles behind the app shell.
- Reduced density, speed, saturation, and opacity for financial-data readability.
- Disabled the background when the user prefers reduced motion.
- Set `pointer-events: none` so the layer cannot block application controls.

### Issue: The glass surfaces and page changes could feel more responsive to the pointer

Solution:

- Added a low-intensity cursor spotlight to cards, category tiles, ledger rows, calendar days, and credit cards.
- Added GSAP transitions that briefly move and fade outgoing page content while the next view materializes.
- Added a small, softly lit ambient orb near the header; it moves with a restrained, looping GSAP animation.
- Added a one-pass reflective sweep across the card face, a brief chip glint, and gentle movement in the card’s existing highlight when hovered.
- Added the ASCII Glitch Ripple effect to the brand wordmark only, keeping finance labels and amounts stable.
- Disabled the ASCII effect and ambient motion when reduced motion is requested; the spotlight is disabled on touch-oriented devices.

### Issue: The project needs to be publishable as a repository

Solution:

- The working application is inside the `IncomeExpenseAnalyzer` repository.
- Added a repository README with local run and GitHub Pages instructions.
- Added this project document for future development context.

## Known limitations and open issues

### Workbook rows are daily aggregates, not receipts

Editing now supports imported records, but cannot recover individual receipts that the workbook never recorded. The editor explicitly preserves separate income, total spending, and all category allocations. Filters match whole records rather than splitting their amounts. The details screen explains this behavior.

### Monthly activity chart

The overview uses grouped income/spending bars or bounded smooth areas for up to six available months and a daily view for the selected month. A single available month uses an exact two-bar comparison. Pointer/touch exploration and a keyboard range control update an exact readout; the totals table, period button and month links retain drill-through. New-entry months and the current month are selectable. Historical missing months are not fabricated; the daily chart explicitly shows zero where no spending/income is recorded. Category mosaic/ring and spending heatmap views use the same ledger.

### Card-payment overview comparisons

- Compare cards for one payment month using a ranked bar chart.
- Compare all card payments over 6 months, 12 months, or all available months.
- Compare manually selected cards over time with a configurable display limit, defaulting to four.
- Keep workbook payment totals distinct from purchases tagged to a card in the transaction ledger.

### Data persistence is browser-local only

Data created in the app is stored in `localStorage`. It is not synchronized across browsers, devices, or GitHub Pages deployments.

Fresh mode excludes the snapshot from the current ledger; it does not delete `data.json` from the repository or published site. Browser storage is also specific to the site's origin: localhost and GitHub Pages have separate workspaces. Use Save data / Load data to move the current workspace between them.

Recommended next step:

- Continue using Save data / Load data for restorable backups and CSV for spreadsheet analysis.
- Consider a backend only after the data model and privacy requirements are clear.

### Search and settings scope

Header search and Ctrl/Cmd K open global page/transaction/card/plan/category search. A transaction result opens the selected day in the ledger. Workspace preferences provide a local name, comfortable/compact density, and fluid/calm motion. Data & settings provides data summary and save/load/clear controls; the footer retains this access on mobile. These are local preferences, not account authentication.

### Other workflows still need a dedicated pass

- Category renaming now resolves through a saved alias map; a future Excel re-export would need to apply that map to source cells.
- Card due-day reminders support short months, but full statement cycles, bank statement import, outstanding balances, and repayment reconciliation are still future work.
- There is no reconciliation, bank feed, recurring-entry scheduler, or multi-device sync.
- Installment progress is manual and separate from transaction entries; first-month schedules are planning information rather than proof of payment.
- Transaction, card, plan, category, budget, and reset writes use snapshot/rollback handling, but browser storage remains subject to clearing and available space.

### Static hosting now requires a build

React/TypeScript are compiled by Vite to `dist/`. Run `pnpm build` before static hosting; do not publish raw `src/main.tsx` using the former branch-root Pages setting. The prepared workflow requires GitHub Pages Source = GitHub Actions. No live GitHub setting or deployment was changed during migration.

Runtime dependencies are bundled locally. There is still no database, authentication, bank connection or server API. Multi-device sync remains a separate future architecture decision.

### Bubble asset licensing

The animated bubble source is GPL-2.0. The original source and license are retained under `Assets/JS-Animated-Bubbles-Background-master/`.

Before distributing a future proprietary or differently licensed version, replace the asset with an independently implemented background or confirm the licensing requirements for the whole distribution.

The supplied ASCII Glitch Ripple folder does not contain a separate license or attribution file. Confirm its source and distribution terms before publishing the repository. It is retained as a reference and is not loaded by the current shell.

## Validation completed

### 2026-10-21 editorial UI and interactive visualization refinement

- `pnpm test`: **32 checks passed** (10 original finance-core, 16 typed model, 6 visualization checks). New checks reconcile imported/local daily and monthly values, local leap-month dates, allocation residuals/excess, proportional non-overlapping mosaic areas, and light/dark text choice for custom colors.
- `pnpm build`: strict TypeScript and production Vite build passed. The optional welcome and its original local photograph are lazy-loaded; no new dependency or persistence schema was introduced.
- `pnpm test:pages`: **26 production browser scenarios passed**. All five existing pages, editing/Undo, installments, themed controls, card gradients/flip/calendar, historical comparisons, backups/reset/import validation and storage failure remain covered. New scenarios exercise chart modes and keyboard inspection, category drill-through, heatmap details/date entry, optional welcome, focus return/trapping, empty dark state, arbitrary category colors/names, and rich-data layouts at 320/390/768 px.
- Chart and welcome exploration leave all eleven existing storage values byte-for-byte unchanged. The workbook snapshot, source Excel, finance model and core remain intact. Tests use disposable browser profiles and temporary servers; no personal browser ledger was seeded, edited, restored or cleared.
- Inspected desktop/mobile welcome, rich Overview, light/dark Overview, wallet activity and installment screenshots. Nested Select Escape exposed a timing assumption in the test's accessibility-role count; DOM/CDP evidence confirmed the app dialog stayed open. The regression now waits for popup cleanup. See `UI-DIRECTION.md` for the experiment ledger.
- Localhost remains at **http://localhost:8766/**. No commit, push or live deployment was performed.

### 2026-10-21 React / TypeScript / Vite migration

- `pnpm test`: original 10 finance-core checks plus 16 typed-model checks passed. Covers unchanged startup storage, the complete source ledger, stable IDs, v1/v2 backups, reset safety, rollback/failure warnings, category aliases, card gradients and installment math.
- `pnpm build`: strict TypeScript check and production Vite build passed. Pages are lazy-loaded and assets resolve below `/IncomeExpenseAnalyzer/`; no oversized-chunk warning remains.
- `pnpm test:pages`: **21 production browser scenarios passed** in disposable Edge profiles. All five pages, CRUD/Undo/CSV, imported aggregates, themed keyboard controls, card fronts/backs/calendar, calculator/progress/pins, category rename, budget, search, preferences, dark/light, 390/768px layouts, backup/reset/unsafe import, storage failure and rapid route switching are covered. The suite blocks external requests and checks browser runtime errors.
- Live system reduced-motion toggles now work without reload. The installed Motion hook's one-time state snapshot was replaced by a subscribed media-query signal; both directions pass the regression.
- `node tests/preview-startup.cjs`: actual existing hook command passed cold start, quiet clean exit, repeated/concurrent Vite reuse and unrelated-port safety. Hook trust/automatic session dispatch still depends on the user's Codex approval.
- The retained `legacy.html` reference passed `node tests/space-ui.cjs`; this is separate from React coverage.
- Desktop light/dark Overview, credit/cash wallet, installment cards and mobile screenshots were visually inspected. Focus restoration was checked in fluid and calm modes. `git diff --check` passed.
- The same-origin **http://localhost:8766/** preview is running Vite. The old task-owned Python preview and temporary staging servers were stopped; no ledger data or source assets were deleted.
- No normal user browser profile was used to seed, clear, import or edit data. The workbook snapshot is unchanged. No commit, push, live Pages setting change or deployment was performed.

### 2026-10-19 shadcnspace redesign

- Finance-core: 10 passing calculation/identity/validation tests.
- Existing browser-smoke and real-world suites passed against the redesigned interface, including CRUD, imported records, CSV, reset, backup restore/rollback, gradients, installment progress, keyboard menus, both themes, and mobile navigation.
- New `tests/space-ui.cjs` passed: real-data startup dismissal, local-only assets, monthly/daily chart, global search with escaped notes, day/transaction quick actions, nested Escape, numbered pages, card flip/reveal and inert hidden faces, card activity, saved pins/preferences, backup inclusion, reminders, welcome replay, and 390/768px layouts.
- Disposable browser contexts only; no live personal ledger was cleared, migrated, or seeded.
- Desktop light/dark, card wallet, installment tiles, and mobile screens were visually inspected.
- The preview launcher confirmed `http://localhost:8766/`. No GitHub commit, push, or publication was performed.

### 2026-10-19 fresh-workspace lifecycle

- `node --test tests/finance-core.test.cjs`: 10 checks passed, including reconciliation of the untouched workbook monthly totals.
- `node tests/real-world.cjs`: passed with a disposable Edge profile in Bangkok timezone. The scenario cancels/rejects reset confirmation, clears a workspace, reloads to verify no imported data returns, creates categories and both card types, records salary and expenses, renames a category, sets a budget, and tracks installment payments.
- Test values reconciled to income of ฿25,000, spending of ฿420, and card-tagged spending of ฿170. Installment progress did not change transaction spending.
- The scenario also checked short-month due dates, fresh/legacy backup restore, retained gradients and category aliases, reset rollback on a simulated storage failure, unrelated storage retention, both themes, and all five pages at mobile width.
- The normal browser profile was not used for destructive actions. Screenshots of the fresh empty state, personal overview, installment plans, and mobile categories were inspected.

### 2026-10-14 wallet update

- `node tests/browser-smoke.cjs` passed in an isolated browser: credit/cash sections, polygon cash pattern, two-color HEX and RGB editing, shorthand HEX expansion, preview updates, saved card edits, and backup restoration.
- The same run passed the existing transaction, themed dropdown, installment, theme icon, sidebar, and reduced-motion checks.
- `Start-Preview.ps1` returned HTTP 200 at `http://localhost:8766/`, and the current app script responded successfully.
- Light and dark card-editor states and the wallet sections were visually inspected.

### 2026-10-13 functionality pass

- Additional UI checks passed after the refinement: actual themed-menu selection through the finance workflow, keyboard term selection and Escape handling, installment recalculation, active view state, sun/moon centering, sidebar position while scrolling, and normal/reduced chart motion. Light/dark dropdowns and mobile transaction details were also visually inspected.

- `node --test tests/finance-core.test.cjs`: 10 passing checks, including reconciliation against every source workbook month.
- `node tests/browser-smoke.cjs`: passed in an isolated Edge session with Bangkok timezone; add/edit/reload, search/filter, delete/Undo, duplicate, imported mixed records, backup round-trip, legacy backup compatibility, storage-failure rollback, CSV download, calendar date alignment, all existing views, theme switching, and mobile navigation.
- Browser automation blocked external requests and used a fresh profile; existing personal browser storage was not touched.
- Syntax checks passed for the modified application scripts; `git diff --check` passed.
- Light-mode overview, dark-mode overview, and dark-mode mobile ledger screenshots were inspected after transitions settled.
- Workbook calendar rendering now formats local dates directly rather than converting midnight to UTC.

### Earlier visual passes

- `node --check app-v2.js` passes.
- `git diff --check` passes.
- Light mode was checked in the browser.
- Dark mode was checked in the browser.
- Bubble layering was checked: the app shell stays above the background.
- Bubble interaction was checked: `pointer-events` is disabled on the background.
- Navigation to the credit-card view was checked after the background was enabled.
- Browser console check returned no warnings or errors during the validation pass.
- Cursor spotlight and GSAP/ASCII motion enhancements have been added since the previous validation pass; they have not yet been browser-checked.

## Suggested next milestones

1. Add bank statement import, statement periods, and repayment reconciliation to Cards.
2. Add optional category budgets alongside the existing monthly budget.
3. Add recurring transactions with explicit confirmation before posting.
4. Link actual installment payments to transaction entries without double-counting.
5. Decide whether the project will remain a local/GitHub Pages tool or become a synchronized multi-device application.
