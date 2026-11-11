# shadcnspace → Moneywise React

The supplied files in `Assets/shadcnspace asset/` remain unchanged as source references. Moneywise now uses **real React/TypeScript adaptations**, compiled by Vite with Motion, Lucide, Tailwind and accessible Radix primitives. The former native-JS adaptation remains under `legacy.html`; it is not loaded by the production app.

## Component map

| Supplied component family | Finance-specific React adaptation | Implementation |
| --- | --- | --- |
| Topbar header, desktop navigation, sidebar and assembly | Sticky two-row shell, five finance pages, responsive navigation, animated active indicator | `src/App.tsx` |
| Topbar profile, language and sign-in form | Local workspace name, density and motion settings; no fake authentication or unsupported language settings | `App.tsx`, `Dialogs.tsx` |
| Notification dropdown | Real due-day and budget reminders; actionable card links | `Dialogs.tsx` |
| Animated changing text | Preserved reusable rotating-copy component; current operating Overview prioritizes figures over decorative copy | `shadcnspace/TextEffects.tsx` |
| Moving icon | Preserved reusable circular quick-add component; the current workspace provides direct entry buttons | `shadcnspace/TextEffects.tsx` |
| Liquid splash | SVG liquid wave and wordmark only while data is opening; Welcome / Replay welcome now opens the optional photographic introduction | `TextEffects.tsx`, `src/main.tsx`, `WelcomePage.tsx` |
| Place card | Monthly budget with remaining amount, progress gauge, and edit action in the balance panel | `pages/Overview.tsx`, `src/workbench.css` |
| Event card | Upcoming real card due dates with date badges and links | `pages/Overview.tsx` |
| Credit-card new design | Chip/NFC, recorded-spend visibility, spring 3D flip, inert hidden face, activity and quick entry; credit/cash patterns and editable gradients | `shadcnspace/WalletCard.tsx` |
| Product / price card | Installment purchases, calculated monthly cost, progress, persistent pinning and edit/details/payment actions | `pages/Installments.tsx`, `ui/card.tsx`, `ui/button.tsx` |
| Pagination pills | Numbered ledger pages, active shared-layout spring, bounded ellipses, previous/next and scroll restoration | `shadcnspace/PaginationPills.tsx` |
| Right-click context | Accessible day/transaction menus using actual edit/duplicate/delete workflows | `ui/menus.tsx`, Transactions and Dialogs |

The paths above are relative to `src/components/` unless they begin with `pages/` or `src/`. Original examples importing project-specific `@/components/ui` primitives are adapted to this project's own typed React wrappers. No demo content is presented as real financial information.

## Design and data safeguards

- `space.css` and `src/styles.css` preserve the shadcnspace foundation. `src/studio.css` provides the current flatter editorial layout, larger type scale, themed chart controls, category rows, wallet activity and welcome. No remote image/font/CDN is required at runtime.
- Apple-design guidance informed critically damped spring defaults, responsive navigation, readable type, centered icons, focus restoration, and system/user reduced-motion support. Calm routes/dialogs mount at their final state; full-motion routes animate in without retaining an old interactive page.
- Card flip, shared selected indicators, expandable menus, chart entrances and subtle copy motion have independent lifecycles. Perpetual decoration does not control route teardown.
- Cards store friendly names, last four digits, type, two colors, status and due-day settings. No PAN, CVV, expiry, fabricated balance or implied bank connection.
- Existing `mw-*` data, v1/v2 data-only backups, source IDs and flat installment math remain compatible. Startup performs no migration writes. Explicit changes use transactional storage with rollback attempts.
- The local landscape and brand SVGs are project-created. Hotel/product photos, demo avatars and unrelated promotional content are not loaded.
- The original `Assets/moneywise-welcome.png` desk photograph was generated with the built-in image generator for this project. The exact prompt and design rationale are in `UI-DIRECTION.md`; it is lazy-loaded with the optional welcome.
- Cash-flow bar/area exploration, category mosaic/ring, daily heatmap and wallet activity are original code using the actual ledger. No external chart library, demo financial values or new storage schema was added.
- Retain downloaded notices/licenses. A component download does not grant a blanket license to the whole asset folder. Old bubble/ASCII/GSAP sources remain as references, not active dependencies.

## Verification

`pnpm test` checks the original finance rules and typed model. After `pnpm build`, `pnpm test:pages` tests the compiled React pages in disposable browser profiles, including a GitHub Pages subdirectory path. Legacy browser suites remain historical references rather than evidence of React coverage.
