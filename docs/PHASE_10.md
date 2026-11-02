# Phase 10 — Mobile and Tablet UX Redesign

Status: In progress. User approved the redesign scope. No deployment performed.

## Multiple customer orders — 2026-11-02

- Fixed per-shop tracking storage overwriting the previous link. Private sessionStorage now retains a deduplicated history and preserves the legacy single saved token when the next order is added.
- Tracking shows an order selector with queue number/reference. Switching preserves tab order and allows viewing both active and completed orders. Only the selected order polls; other known tokens use cached reads without polling. No public order-list endpoint or additional credentials were introduced.
- Frontend regression: 20 files / 60 tests passed. Browser fixtures at 390×844 and 768×1024 verified two orders, earlier-order selection, completed/queued details and refresh; screenshots are `artifacts/qa/screenshots/multiple-orders-*-fixture.jpg`.
- History is scoped to the current browser tab and shop. Earlier tokens already overwritten by old builds cannot be recovered from the new UI; reopening the original tracking link adds the order back. This change does not imply order deletion in PostgreSQL.
- Requires frontend redeployment; no database migration.

## One-step completion and transfer default — 2026-11-02

- Staff status control is now a single “เสร็จแล้ว” action from QUEUED/PREPARING/READY; existing cancellation and manual payment recording are retained. Payment defaults to BANK_TRANSFER, with cash still selectable.
- Completion requires PAID on both UI and server. Migration 030 applied: atomic direct completion retains row locking, active-shop membership checks, expected-status conflict detection and one status event. Legacy intermediate transitions remain valid for older deployed clients.
- Customer tracking displays “เสร็จแล้ว”, supports direct QUEUED → COMPLETED updates, and stops polling at the terminal status. The existing active-queue query omits completed orders after invalidation/Realtime refresh.
- Validation: full frontend gate passed (19 files / 57 tests, lint, TypeScript, production/PWA build); hosted rollback regressions passed 14 new completion assertions and 13 legacy POS assertions after migration.
- Browser fixture checks at 390×844 and 768×1024: default transfer, payment before completion, one-click removal from queue, and customer completed state. No live sales/payment records were created. Screenshots: `artifacts/qa/screenshots/one-step-completion-*-fixture.jpg` and `completed-customer-*-fixture.jpg`.
- Frontend must be redeployed by the owner for the new button/default/copy to appear in production.

## Customer bottom navigation — cart and tracking

- Shared SVG navigation is rendered inside the full-screen cart dialog and on the tracking page at mobile/tablet widths, with reserved space and the active destination highlighted.
- Successful checkout or opening a valid tracking link remembers the latest token per shop in private sessionStorage. Returning to the shop menu exposes a status link back to the same order, including after refresh.
- Migration 029 applied: token-scoped tracking includes the public shop ID for correct menu navigation; invalid-token isolation remains unchanged.
- Targeted cart/tracking tests: 11 passed. Database checkout/tracking regression: 15 assertions passed after migration. Lint and production build passed.
- Browser fixture checks at 390×844 and 768×1024 verified status → menu → same status, refresh recovery and no horizontal overflow. These used simulated orders, without submitting live sales. Screenshots are under `artifacts/qa/screenshots/tracking-bottom-nav-*-fixture.jpg`.

## Latest flow regression — 2026-11-02

- See [the detailed QA report](FLOW_QA_2026-11-02.md) for browser, component and database evidence and remaining production-device checks.
- 13 staff routes passed direct-link/layout checks at 390×844, 768×1024 and 1024×768 after fixing the active-shop hydration redirect race.
- Frontend gate: lint, 48 tests and production/PWA build passed. Database: 20 suites / 268 assertions passed with rollback fixtures.
- Migration 028 applied: checkout coordinates now reject missing, out-of-range and NaN values. Valid QR/POS pricing regression passed again afterward.
- Live UI order/payment submission, real-device GPS/OAuth, actual QR downloads and production-domain checks remain outside this certification.

## Full-screen cart and staff store opening

- Customer cart now opens a full-viewport FormWorkspace with back navigation. Visually inspected at 390px and 768px; measured dialog width/height equal viewport and no horizontal overflow.
- Browser tested required-size selection, local-cart addition, back/reopen and removal. No checkout was submitted.
- Higher contrast cart actions use dark orange/white; disabled checkout uses neutral gray instead of a faded orange that resembles an active action.
- Migration 027 applied to hosted Supabase: active STAFF/OWNER may open their own shop; closing remains Owner-only.
- Live database regression transaction passed: STAFF opening, close denial, cross-shop denial, revoked-member denial, duplicate session guard and audit creation. All test fixtures were rolled back.
- Frontend quality gate passed 28 tests and production build; subsequent POS copy/link adjustment requires only final compilation verification.

## SVG visual-system revision

- Latest direction supersedes earlier emoji guidance: UI decoration uses a shared, local SVG Icon component with consistent 24px viewBox and stroke styling.
- Removed emoji characters from runtime TSX; string-valued labels retain plain text. The supplied raster brand logo is retained.
- Revised shared navigation, toolbar, dashboard actions, surface colors, typography, borders, form widths and product-sheet controls.
- Browser checks at 390px/768px across 13 staff routes found no horizontal overflow or emoji text. LINE was separately rechecked after waiting for its exact heading to eliminate an intermediate-route observation.
- Visually inspected tablet home/LINE and mobile topping form/customer customization; verified back/close controls without creating orders or changing store state.
- Quality gate: 28 tests passed; lint, production build and final TypeScript check passed. This UI revision does not replace production transaction or deployment checks.

## 2026-11-02 — Shared visual language rollout

- Short icon-led headings applied to catalog, topping library, queue, POS, sessions, sales, QR, LINE, staff, shop settings, administration and onboarding.
- Reduced repeated instructions; retained authorization, price, geofence, confirmation and error guidance.
- Sales filters can be collapsed; LINE schedule and onboarding copy shortened; profile labels localized.
- Browser layout checks on 13 authenticated routes at 390×844 and 768×1024: headings rendered, no horizontal overflow or visible alert at inspection time.
- Visually inspected mobile catalog/editor/report and tablet shop settings. Exercised catalog editor open/close and nested branch confirmation cancellation in the mobile drawer; current shop remained TSC.
- Administration, pending-access and completed-order tracking were source-reviewed rather than fully exercised with alternate-role or live-order fixtures. Layout smoke checks are not transaction certification.

## 2026-11-02 — Image overflow regression verification

- Header cover uses absolute positioning inside an overflow-hidden, fixed-height container; oversized source images cannot establish intrinsic grid height.
- Browser measurements against the live public menu passed at 390, 768, 1024 and 1920px: no horizontal overflow; cover image bounds match the 210px/280px cover bounds; product cards stay inside the grid.
- Product dialog stayed within viewport at 390, 768 and 1920px.
- Product selection, local-cart addition/removal and closed-shop submit-disabled state verified at phone, tablet and desktop widths. No order was submitted.
- The first automated cart loop stopped because it expected a collapsed cart while the UI retained its expanded state. Remaining checks used the observed state and passed; this was not a checkout failure.
- Broader Phase 10 release certification is still pending; these checks certify the reported image-overflow fix and the tested local-cart interactions only.

## Revised visual direction

- Reduced shared Tailwind corner tokens to 2–4px; custom sidebar, role badges and product cards now use 4px corners.
- Added a reusable FlowGuide, POS cross-category search, empty-search state, and explicit links to open the store and manage the resulting queue.
- Customer product addition now collapses customization and announces the next action.
- Browser inspection confirmed authenticated home-to-POS navigation and the squared POS layout. Full viewport/device regression remains outstanding.

- Replaced the first sidebar iteration with grouped navigation in a separate StoreNavigation component.
- Bright logo-inspired orange (#ff6500), charcoal text, neutral canvas, white surfaces; darker orange (#b84300) for readable white-label actions and text.
- Persistent shop toolbar, explicit role badge, native mobile navigation dialog.
- Redesigned login and home entry points, product tiles with images, progressive product customization, collapsible fixed customer cart, and on-demand catalog forms.
- Source logo remains unoptimized; visual device verification remains outstanding. This iteration is not yet a fully verified release.

## Implemented

- Home priorities: owner store-state control, POS, queue, then catalog. Removed redundant shop/role tiles.
- Owner can open/close from home through SlideConfirm: deliberate handle drag and release beyond 90%, short-drag cancellation, keyboard-accessible two-step alternative, in-flight duplicate guard.
- Fresh store-state check before mutation; existing atomic RPC authorization and pending-order close rules remain authoritative. Pending orders link to queue instead of offering close.
- No live store state was changed to test this UI; slider interactions were tested against mocked callbacks.

- Reference-driven ordering layout: restaurant cover from the first product image, overlapping shop identity, two-column phone menu and three-column tablet menu.
- Shared ProductSheet uses native dialog: bottom sheet on phone, centered modal on tablet, Escape close, body scroll lock and focus restoration.
- Staff and customer product cards share the same image-led visual language.
- Verified on live UI: phone product selection, add to local cart, cart total, closed-shop submit disabled, removal of test cart line; tablet POS sheet and unavailable-option controls.
- Latest verification before the focus-restoration adjustment: lint, 24 unit tests and production build passed. No real order/payment or store state was changed during these UI checks.
- Readiness remains in progress: complete transaction regression, asset optimization, and remaining management flows are not yet certified.

- Shared sidebar with current-route highlighting, shop switching, profile and sign-out.
- Native modal navigation drawer on narrow screens; fixed sidebar on wide screens.
- Supplied DuckPOS logo used in navigation.
- Home screen shortcuts to POS, queue, catalog and owner store sessions.
- Mobile POS cart jump link with quantity; clearer store status and handled submission rejection.
- Queue status filters with counts and a visible query-error state.
- Sticky public-menu category navigation with section anchors.
- Visible keyboard focus and mobile input typography.

## Release checks still required

- Visual and interaction testing at phone and tablet sizes, including keyboard/drawer focus.
- Optimize the supplied 1.1 MB logo for navigation use.
- Review customization/cart overlays, management forms, reports and empty states.
- Confirm responsive grids with the sidebar at tablet landscape widths.
- Re-run production verification after final layout edits.
- Measure production performance after deployment by the owner.

Existing pricing, checkout, permissions and database contracts are retained. Phase 10 must not be described as release-complete until these checks are recorded.
