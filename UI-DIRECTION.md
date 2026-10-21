# Moneywise — October 2026 interface refinement

## Direction before implementation

- **Visual thesis:** a calm, editorial personal-finance workspace, with warm paper surfaces, dark readable type, one violet action accent, and large visualizations built from the actual ledger.
- **Content plan:** an optional full-bleed welcome with an original desk photograph and direct workspace actions; the operating Overview starts with month controls and a flat metrics band, followed by cash flow, spending composition, a daily heatmap, recent entries, cards, and the existing historical payment comparison. The remaining four pages use the same typography and materials.
- **Interaction thesis:** immediate press feedback and a shared navigation indicator; a short, interruptible page entrance plus restrained section reveals; charts that respond to pointer, touch, focus, and keyboard exploration. System and workspace reduced-motion preferences keep a static, readable equivalent.

## Boundaries

Retain all financial calculations, imported record identities, all eleven existing storage keys, backups, CRUD, Undo, calendar, payment comparisons, and editing dialogs. Visual exploration does not write storage. Welcome is optional and never delays entry to the ledger. No fictitious financial values or financial advice are shown.

## New visualizations

Cash flow has grouped bars and smooth bounded area curves, monthly/daily modes, a keyboard range explorer, exact totals, and period drill-through. Category allocation has an area-proportional mosaic and a segmented ring with exact amounts and category drill-through. The daily heatmap aligns local calendar dates and distinguishes income days from spending intensity. Zero values remain zero, and empty states explain how to add entries.

## Welcome image

Generated with the built-in image generator. Final project asset: `Assets/moneywise-welcome.png`.

Prompt: “Use case: photorealistic-natural. Asset type: wide full-bleed welcome background for Moneywise, a personal income and expense application. Create a premium editorial photograph of a quiet sunlit home desk, matte ivory surface, a small open blank notebook and fine silver pen on the RIGHT side, subtle translucent lilac glass tumbler, soft olive plant shadows. Slightly overhead cinematic photography, tactile paper and natural daylight, warm ivory and soft gray with one restrained lavender accent. Left 55 percent remains a beautifully calm almost empty warm off-white wall/desk tonal field for dark website typography. Subject on far right, no laptop, no phone, no visible financial amounts, no text, no lettering, no logos, no watermark, no UI, no baked-in borders or graphic overlays. Wide landscape 16:9 composition, elegant real photographic detail, intentionally spare and grounded.”

## Verification ledger

- First implementation: strict production build and all 32 core/model/chart checks passed; 24 production-browser scenarios passed, including byte-for-byte storage preservation during chart/welcome exploration.
- Visual review: inspected desktop/mobile welcome, light/dark overview and cards. Aligned summary labels, narrowed the single-month crosshair, and added real activity alongside a single-card section. Screenshot captures now visit scroll-reveal sections before taking a full-page image.
- Next browser pass exposed an immediate accessibility-role count after Escape in a nested Select. The isolated reproduction kept a DOM dialog with `data-state="open"` while the parent was briefly `aria-hidden`; waiting for backdrop detachment timed out, disproving actual dialog closure.
- CDP keydown breakpoints captured 30 listener stops over six isolated dropdown/Escape cycles. All six retained one open dialog after Select cleanup. The regression now waits for the listbox to detach and the dialog to be visible before asserting; the app's Escape handling was preserved.
- Final production browser run: **26 scenarios passed**, including the original financial workflows, all new charts, optional welcome, empty dark/reduced state, preserved raw storage, source snapshots, backups, exact category drill-through and rich-data layouts down to 320px. Strict build and all 32 core/model/chart checks passed. All tests ran in disposable profiles; no normal browser data was touched.
