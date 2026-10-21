# React migration checklist

The five-page application is now built from real React/TypeScript components using Vite, Motion, Radix and the supplied shadcnspace designs.
Saved `mw-*` keys, imported-record identities, backup v1/v2, and decimal calculations remain the compatibility boundary. No browser data is cleared or rewritten on startup.

- [x] React / TypeScript / Vite build and typed data store
- [x] Backup compatibility, transactional writes, reset, and calculation checks
- [x] Shared shadcnspace shell, themed controls, dialogs, menus, and motion
- [x] Overview page and imported-payment comparisons
- [x] Transactions page, aggregate editing, filters, pagination, CSV, and Undo
- [x] Cards page, gradients, previews, calendar, and activity
- [x] Installments page, calculator, progress, details, and pins
- [x] Categories page, types, colors, renames, and usage
- [x] Global search, settings, preferences, themes, and reduced motion
- [x] Production/mobile/storage regression tests and same-origin localhost cutover

React now opens through `index.html`. The temporary `react.html` was removed after validation; the exact previous entry is preserved as `legacy.html`. The old scripts are not loaded by React or shipped in `dist/`.

## Safeguards and handoff

- Same localhost origin: **http://localhost:8766/**. The Windows launcher and existing trusted Codex startup hook now start/reuse Vite rather than Python. Wrong/occupied ports are left alone.
- Existing browser data is read as-is: no startup rewrite, reset or seeding. All automated data changes happen in disposable test profiles.
- Original integer-cent calculation rules and unchanged workbook snapshot are retained. An imported edit keeps the legacy editor's positive-cost convention; totals and source identity remain unchanged.
- New saves use the same v2 data-only backup wrapper; v1 imports remain supported. Loading validates before writing and requires confirmation. Cancellation is not reported as a successful save.
- Routes are lazy-loaded. Route motion does not wait on every descendant's perpetual decorative animation; calm routes/dialogs render at final opacity. Focus returns to the opening control.
- Production assets work below `/IncomeExpenseAnalyzer/`, verified by a temporary subpath server with external network requests blocked.
- GitHub Pages must use **Source: GitHub Actions**, deploying `dist/` through the provided workflow. The former branch-root setting cannot compile TSX. No live GitHub setting, push or deployment was performed.
- `README.md`, `project.md`, and `ASSET-INTEGRATION.md` now describe the React implementation. See `MIGRATION-TEST-LOG.md` for the debugging/verification ledger.

## Verify again

Validated on 2026-10-21: 26 data/calculation tests, 21 production browser scenarios, TypeScript/build checks, Windows launcher regression, and the retained legacy interaction suite. Screenshots were reviewed at desktop and mobile widths. Normal browser storage was not modified by testing.

```powershell
pnpm typecheck
pnpm test
pnpm build
pnpm test:pages
node tests/preview-startup.cjs
```

The last command is Windows/local-hook specific. Legacy browser suites point their temporary server at `legacy.html`; they are not counted as React coverage.
