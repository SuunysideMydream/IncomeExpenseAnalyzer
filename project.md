# Moneywise — Project Notes

Last updated: 2026-10-13

## Project goal

Moneywise is a personal income and expense application for organizing everyday finances in a clearer and more visual way than the original spreadsheet.

The application is based on the manually maintained workbook:

`D:\Money Income and Expense Personal\My Income Expense.xlsx`

The long-term goal is to make it easy to record transactions, understand spending patterns, track credit-card usage, plan installment purchases, and review monthly financial health from one calm, readable interface.

## Core functions

### 1. Monthly overview

- Select a month to review.
- View income, spending, net balance, and tracked card count.
- Compare monthly workbook card-payment totals by card, review the highest payment, and explore total or selected-card trends.
- Browse card-payment months independently from the main overview month; separate workbook payment totals from card-tagged transaction spending.
- Review the largest expense categories.
- Review average daily spending, highest spending day, active installment commitments, and the next card due date.

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

### 3. Credit cards

- Display tracked cards as distinctive color cards.
- Store a friendly card name and mock last four digits.
- Store card status and payment due day.
- Preview the card design before saving.
- View card spending by month.
- View card spending and payment dates in a calendar layout.

### 4. Installments

- Add and edit installment plans.
- Select a term from `1, 3, 4, 6, 10, 12, 15, 18, 24, 36 months`.
- Select a monthly interest rate from `0%, 0.59%, 0.65%, 0.69%, 0.74%`.
- Automatically calculate monthly payment without interest.
- Automatically calculate monthly payment with interest.
- Automatically calculate total payment with interest.
- Edit purchase name, original amount, term, interest rate, and status.
- Open a detailed breakdown for each plan.

### 5. Categories

- Create new categories.
- Edit category name, type, and color.
- Support `Expense`, `Income`, and `Both` category types.
- Reuse category colors in charts, summaries, and visual indicators.

### 6. Visual experience

- Light and dark mode using the animated sun/moon switch.
- Liquid-glass-inspired surfaces using translucency, blur, borders, highlights, and depth.
- Rounded rectangular buttons with stronger visual affordance.
- Animated sun/moon theme switch, with the selected mode persisted between visits.
- Apple-inspired motion for route changes, modals, hover states, card tilt, and button feedback.
- Credit-card internal sheen, chip glint, and softly shifting decorative halo.
- Animated bubble background behind the glass surfaces.
- Reduced-motion and reduced-transparency fallbacks.
- Themed dropdown menus across pages and dialogs, with selected indicators, arrow-key navigation, type-to-find, Escape dismissal, and focus restoration after a view updates.
- Segmented view controls with a sliding selection marker, accent label, and active dot.
- Color-coded day details: green income, coral expense, purple mixed records, and category-colored chips.
- A custom SVG sun/moon switch with both icons centered inside the moving thumb.
- Sticky desktop sidebar and mobile navigation; chart bars and lines enter with short, bounded staggers.

## Current implementation

This is currently a dependency-free static web application:

- `index.html` — application shell and asset loading.
- `app-v2.js` — application state, rendering, forms, calculations, local persistence, and event binding.
- `finance-core.js` — shared, testable transaction identity, aggregation, validation, filtering, local-date, and CSV rules.
- `ledger-features.js` — transaction editing, daily filters, monthly activity chart, data settings, backup integration, and Undo.
- `ledger-features.css` — new ledger controls, chart, notifications, focus styles, and mobile navigation.
- `ui-refinements.js` / `ui-refinements.css` — shared themed selects, segmented selection, centered theme icons, sticky navigation, transaction color accents, and chart entrances.
- `tests/` — Node data tests and isolated Playwright browser regression checks.
- `data.json` — browser-readable snapshot of the Excel workbook data.
- `styles.css` — core layout and base visual styles.
- `theme.css` — light/dark theme behavior and dark-mode overrides.
- `modal.css` — floating form and dialog layout.
- `motion.css` — Apple-style transitions, route animation, button feedback, modal morphing, and card tilt.
- `liquid-glass.css` — translucent glass materials, backdrop blur, highlights, and depth.
- `bubble-background.css` — project-specific integration of the animated bubble layer.
- `motion-enhancements.css` — cursor spotlight, ambient orb, and transition-layer styling.
- `ledger.css` — transaction ledger, calendar, and detail layout styles.
- `button-overhaul.css` — rounded button treatment.
- `interaction.css` — interaction and responsive refinements.
- `Assets/JS-Animated-Bubbles-Background-master/` — retained third-party bubble asset and its GPL-2.0 license.
- `Assets/gsap/` — user-provided GSAP distribution; the app loads only `gsap.min.js`.
- `Assets/vengeance_ui/ascii_glitch_ripple/` — user-provided ASCII Glitch Ripple effect, used on the Moneywise wordmark.

User-created changes are stored in browser `localStorage` using these keys:

- `mw-tx` — added transactions.
- `mw-tx-overrides` — edits and deletion markers for imported daily records; the published snapshot is never modified by these actions.
- `mw-cards` — added credit cards.
- `mw-plans` — added installment plans.
- `mw-category-meta` — category names, types, and colors.
- `mw-card-overrides` — edits to imported card records.
- `mw-plan-overrides` — edits to imported installment records.
- `mw-theme` — selected light or dark mode.

The application does not currently write changes back to the source Excel workbook.

Use the header's **Save data** control to export these user changes as a portable `savedata.js` backup. **Load data** imports that file after confirmation and replaces the browser's current saved changes. The backup is a strict data-only JavaScript wrapper; the app parses it as text and never executes the imported file. When supported, the browser save picker lets the user choose the destination; otherwise it downloads to the browser's configured download folder.

Existing v1 backups without transaction overrides still import, defaulting to no workbook edits. New backups include the overrides. Import validates transaction records before writing and attempts rollback if storage fails. A CSV export is intended for spreadsheets, not backup restoration. Data & settings explains this distinction and provides backup shortcuts.

Imported transaction IDs use the source date plus its occurrence on that date. Local legacy entries receive index-based IDs that are persisted before mutation. Keep the source snapshot stable: changing the ordering of multiple source rows on the same date requires an explicit ID migration.

## Completed issues and solutions

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

The overview now includes income/spending bars for the last six available months, signed net balances, exact-value tooltips, a totals table, and drill-through to the daily ledger. New-entry months and the current month are always selectable. Missing historical months are not filled with assumed values.

### Card-payment overview comparisons

- Compare cards for one payment month using a ranked bar chart.
- Compare all card payments over 6 months, 12 months, or all available months.
- Compare manually selected cards over time with a configurable display limit, defaulting to four.
- Keep workbook payment totals distinct from purchases tagged to a card in the transaction ledger.

### Data persistence is browser-local only

Data created in the app is stored in `localStorage`. It is not synchronized across browsers, devices, or GitHub Pages deployments.

Recommended next step:

- Continue using Save data / Load data for restorable backups and CSV for spreadsheet analysis.
- Consider a backend only after the data model and privacy requirements are clear.

### Search and settings scope

The header search opens the transaction filters. Settings now opens a data summary and save/load controls. Global card/plan search and additional preferences remain future enhancements.

### Other workflows still need a dedicated pass

- Category renaming still needs reference migration across existing allocations.
- Card due-date handling still uses the original day/month model and needs a dedicated statement-cycle workflow.
- There is no reconciliation, bank feed, recurring-entry scheduler, or multi-device sync.
- Persistence improvements in this update cover transactions and backup restore; card, plan, and category saves still use their existing storage paths.

### The app is currently static and dependency-free

There is no required build pipeline, database, authentication, or server API. The data layer now has dependency-free Node tests; the optional browser regression script uses Playwright with Edge.

This is appropriate for the current personal prototype and GitHub Pages deployment, but a larger multi-device product would need an application architecture decision.

### Bubble asset licensing

The animated bubble source is GPL-2.0. The original source and license are retained under `Assets/JS-Animated-Bubbles-Background-master/`.

Before distributing a future proprietary or differently licensed version, replace the asset with an independently implemented background or confirm the licensing requirements for the whole distribution.

The supplied ASCII Glitch Ripple folder does not contain a separate license or attribution file. Confirm its source and distribution terms before publishing the repository. The app currently uses it only for the brand wordmark.

## Validation completed

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

1. Add category-rename migration and optional category budgets.
2. Extend card statement cycles and payment reconciliation.
3. Add recurring transactions with explicit confirmation before posting.
4. Expand regression coverage to card, plan, and category editing.
5. Decide whether the project will remain a local/GitHub Pages tool or become a synchronized multi-device application.
