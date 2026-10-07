# Moneywise — Project Notes

Last updated: 2026-10-07

## Project goal

Moneywise is a personal income and expense application for organizing everyday finances in a clearer and more visual way than the original spreadsheet.

The application is based on the manually maintained workbook:

`D:\Money Income and Expense Personal\My Income Expense.xlsx`

The long-term goal is to make it easy to record transactions, understand spending patterns, track credit-card usage, plan installment purchases, and review monthly financial health from one calm, readable interface.

## Core functions

### 1. Monthly overview

- Select a month to review.
- View income, spending, net balance, and tracked card count.
- Review the largest expense categories.
- Review average daily spending, highest spending day, active installment commitments, and the next card due date.

### 2. Transactions

- Add income or expense transactions.
- Choose a date, amount, category, optional card, and note.
- View transactions as a daily summary so a busy day is represented by one readable row.
- View monthly totals.
- Paginate daily activity.
- Open day details to see the individual transactions recorded for that date.

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

- Light and dark mode using a slider control.
- Liquid-glass-inspired surfaces using translucency, blur, borders, highlights, and depth.
- Rounded rectangular buttons with stronger visual affordance.
- Apple-inspired motion for route changes, modals, hover states, card tilt, and button feedback.
- Credit-card internal sheen, chip glint, and softly shifting decorative halo.
- Animated bubble background behind the glass surfaces.
- Reduced-motion and reduced-transparency fallbacks.

## Current implementation

This is currently a dependency-free static web application:

- `index.html` — application shell and asset loading.
- `app-v2.js` — application state, rendering, forms, calculations, local persistence, and event binding.
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
- `mw-cards` — added credit cards.
- `mw-plans` — added installment plans.
- `mw-category-meta` — category names, types, and colors.
- `mw-card-overrides` — edits to imported card records.
- `mw-plan-overrides` — edits to imported installment records.
- `mw-theme` — selected light or dark mode.

The application does not currently write changes back to the source Excel workbook.

## Completed issues and solutions

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

### Transaction editing is not complete

Transactions can currently be added and viewed in detail, but individual existing transactions do not yet have a full edit/delete workflow.

Recommended next step:

- Add stable transaction IDs.
- Add Edit and Delete actions in the day-details modal.
- Persist the updated transaction list in `mw-tx`.
- Add a confirmation step before deletion.

### Monthly infographic trend graph is incomplete

The overview currently shows monthly KPIs and category bars, but a dedicated month-over-month income, spending, and net-balance chart should be added.

Recommended next step:

- Use the monthly values already available in `data.months`.
- Add a responsive SVG chart with accessible labels.
- Keep the chart readable in both themes and respect reduced motion.

### Data persistence is browser-local only

Data created in the app is stored in `localStorage`. It is not synchronized across browsers, devices, or GitHub Pages deployments.

Recommended next step:

- Add import/export of JSON or CSV as a safe first step.
- Consider a backend only after the data model and privacy requirements are clear.

### Imported records are read-only

Imported workbook records are displayed from `data.json`. The current override model supports edits to imported cards and installment plans, but not every imported transaction.

Recommended next step:

- Give every imported record a stable ID.
- Store transaction overrides separately from the generated snapshot.

### Settings and search buttons are visual placeholders

The Settings and search controls are present in the shell but do not yet open functional panels.

Recommended next step:

- Use Settings for data export/import, theme preferences, and motion preferences.
- Use search for transaction, card, plan, and category filtering.

### The app is currently static and dependency-free

There is no build pipeline, test runner, database, authentication, or server API yet.

This is appropriate for the current personal prototype and GitHub Pages deployment, but a larger multi-device product would need an application architecture decision.

### Bubble asset licensing

The animated bubble source is GPL-2.0. The original source and license are retained under `Assets/JS-Animated-Bubbles-Background-master/`.

Before distributing a future proprietary or differently licensed version, replace the asset with an independently implemented background or confirm the licensing requirements for the whole distribution.

The supplied ASCII Glitch Ripple folder does not contain a separate license or attribution file. Confirm its source and distribution terms before publishing the repository. The app currently uses it only for the brand wordmark.

## Validation completed

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

1. Add transaction edit/delete actions.
2. Add the monthly trend infographic.
3. Add JSON/CSV backup and restore.
4. Make search and Settings functional.
5. Add a small automated smoke-test page for calculations, theme switching, and local-storage persistence.
6. Decide whether the project will remain a local/GitHub Pages tool or become a synchronized multi-device application.
