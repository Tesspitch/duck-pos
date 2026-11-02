# Phase 10 — Mobile and Tablet UX Redesign

Status: In progress. User approved the redesign scope. Frontend deployment remains with the user; linked database migrations are applied through 032.

## Unfinished queue requires both preparation and payment — 2026-11-03

- Updated the default “ยังไม่สำเร็จ” filter and its counter to include active preparation states plus COMPLETED + UNPAID. Food completion and payment remain independent actions: an order leaves this category only when food is completed and collection is settled; cancelled orders remain excluded. Status-specific filters and pending-collection filter retain their meanings.
- The existing bounded staff RPC already returns completed-unpaid orders, so no backend migration or extra request is necessary. Tests cover completion before payment, payment before completion, both category counts and removal after collection.

## Store action contrast and touch quantity controls — 2026-11-03

- Home store control now uses explicit green/open and red/close slider intents, with contrasting white arrow handles and solid, labelled store-state badges. Drag threshold, keyboard confirmation, duplicate-action lock and server-side store rules are unchanged.
- Added shared QuantityStepper to staff/customer product selection and both carts: 48×48px minus/plus buttons, numeric entry, bounds 1–20, contextual accessible labels and disabled state during submission. Footer actions wrap on narrow phones; amount calculation and checkout rules remain unchanged.
- Validation: lint, 32 frontend files / 98 tests, TypeScript and production/PWA build passed. New checks cover bounds, pending quantity locks and distinct slider intents; existing drag, keyboard-confirmation, cart and pricing tests passed.
- Browser fixture QA at 320×844, 390×844 and 768×1024: actual drag open and close against a fake store repository, quantity increase/decrease with recalculated totals, measured 48px button dimensions, and no horizontal control overflow. No live shop was opened/closed. Physical devices were not used.
- Screenshots: store-control-contrast-phone-fixture.jpg and quantity-touch-phone-fixture.jpg under artifacts/qa/screenshots. Temporary fixtures removed and test dev server stopped. Frontend-only change; no migration/deployment performed.

## Kitchen-first queue tickets — 2026-11-03

- Queue ticket header emphasizes queue number, labelled preparation state, source and order time. Each food item has a large quantity, larger menu name, separate readable option chips and a secondary line total. Item notes and order-wide notes have distinct labelled warning panels; no truncation of preparation instructions.
- Preparation action sits immediately after food details. Unpaid active orders expose payment through a separate expandable footer; completed-unpaid orders open collection automatically. Transfer default, cash/change validation, completion before collection, cancellation safeguards and server transitions are unchanged. No kitchen status changes are coupled to payment.
- Queue grid uses bounded columns so one ticket does not stretch across an entire desktop and portrait tablets can show adjacent tickets. No new network requests, polling, dependencies or database migration.
- Files: QueueOrderCard, new QueueOrderItems, QueuePage grid, ticket CSS and QueueOrderCard tests. Full suite passed: 31 files / 95 tests; related queue/payment tests passed again after edits. Final lint, TypeScript and production/PWA build passed.
- Browser QA with isolated fake orders: 320×844, 390×844 and 768×1024. Checked details/notes, start → completion before collection, later transfer recording, collapsed/expanded payment and horizontal overflow. Final secondary line-price layout rechecked at all three sizes. No offscreen horizontal controls/option rows found. Physical devices and live orders were not used.
- Screenshot: artifacts/qa/screenshots/queue-kitchen-details-phone-fixture.jpg. Temporary fixtures removed; test servers stopped. Frontend deployment remains with the user.

## Portrait POS, topping actions and mutation feedback — 2026-11-03

- Portrait POS uses readable image-and-text rows with menu descriptions, price and option-group count. Larger screens use two/three columns. The product editor shows the image and full description, touch-sized option rows, selected state, required-option feedback and the calculated total before adding. Existing cart/pricing rules remain unchanged; checkout stays server-authoritative.
- Reused ItemActions for topping group/item edit and delete. Availability stays directly accessible; pending operations lock all topping actions. Existing page-level delete confirmations remain in place.
- Added shared MutationFeedback for TanStack mutations, including in native full-screen form dialogs. Pending feedback lasts through awaited cache refresh; success/error feedback is dismissible. Form dialogs show pending feedback only to preserve their specific error messages. Product/category/topping forms disable inputs while saving. Fire-and-forget deletes/toggles use mutate rather than uncaught mutateAsync promises.
- Catalog and topping writes invalidate the affected shop's catalog, topping library and public menu. Active queries refresh; inactive queries become stale for their next visit. No additional polling, dependencies, schema migration or deployment.
- Validation: production gate passed: lint, 30 test files / 91 tests, TypeScript and production/PWA build. New tests cover POS required options/quantity/price, owner/staff topping controls, pending feedback through delayed refresh, failure reporting and insert/update/delete cache invalidation.
- Browser QA: real components/hooks with isolated fake repositories at 320×844, 390×844 and 768×1024. Verified POS customization/add-to-cart; topping insert/update/delete and availability with pending and automatically refreshed results; group/item overflow actions; full-screen editors/back navigation. Measured no horizontal overflow or offscreen form controls in the inspected views. This is viewport emulation, not physical-device certification. No live shop data changed.
- Screenshots: artifacts/qa/screenshots/pos-readable-menu-phone-fixture.jpg and topping-overflow-menu-phone-fixture.jpg. Temporary fixtures removed and test dev server stopped. User still deploys frontend to Cloudflare Pages.

## Preparation, customer cancellation and platform shop deletion — 2026-11-03

- Staff queue now uses QUEUED → “เริ่มทำ” → PREPARING → “เสร็จแล้ว” → COMPLETED. Existing completion-before-collection behavior and transfer default remain intact.
- Added a separate customer cancellation component and repository method. Only QUEUED + UNPAID QR orders show cancellation, with explicit confirmation; paid customers contact the shop for the existing manual refund safeguard. PREPARING and terminal states have no customer cancellation action.
- Migration 032 applied to linked Supabase. Token-scoped cancellation locks the order row, revalidates status/payment/source, is idempotent, and records an event/audit without logging the secret token. Staff start and payment use the same row lock; tests verify rejection for either ordering of start/cancel actions. These are deterministic state-conflict tests, not a concurrent-load benchmark.
- Platform Admin can search/paginate shops and delete using exact-name confirmation. Deletion archives the shop; requires a closed selling session and no pending orders/collection, preserves historical records, removes shop authorization and public menu, and audits the administrator. Insert guards share-lock the shop against concurrent archival. Branch membership queries use an inner join so archived shops disappear under RLS. No real shop was deleted during verification.
- Files: customer cancellation UI/tests, platform shop management UI/tests, repository interfaces/adapters, tracking/payment-status DTO, queue action, migration 032 and SQL suite 0022. UI/business rules/data access remain separated; no dependency added.
- Validation: lint, 26 frontend test files / 81 tests, TypeScript and production/PWA build passed. Database rollback suites: 36 new cancellation/archival assertions, 17 completion/collection assertions and 15 checkout/geofence/idempotency assertions passed (68 total).
- Browser QA used real components with fake repositories at 390×844 and 768×1024: cancellation/confirmation, preparing state, cancellation removal, completion before collection, and admin name confirmation/deletion. No horizontal overflow observed. Physical iOS/Android devices were not tested in this run.
- Frontend still requires the user's Cloudflare Pages deployment. Migration 032 is already applied; no Edge Function redeployment is required for these RPC changes.

## Staff UX fixes and completion before collection — 2026-11-02

- POS defaults to “ทุกหมวดหมู่” and can return to it after selecting a category; cross-category search is retained.
- Fixed intrinsic sizing in full-screen forms: constrained form/control widths, zero minimum widths for grid children/fieldsets, and contained native file inputs. Browser measurements for product, topping and topping-group forms at 320/390/768/1024px found no dialog overflow or controls outside the viewport.
- Sidebar closes after a pointer press/release on its backdrop; inside interactions and nested dialogs do not dismiss the drawer. Verified with unit tests and a browser backdrop tap.
- Completion is now independent from payment. Migration 031 applied: active orders may become COMPLETED while still UNPAID; no payment is fabricated. Added the “รอรับชำระ” queue filter and included completed-unpaid orders in the bounded staff RPC result, with a supporting partial index. Explicit payment recording remains required and cash/transfer rules are unchanged. This supersedes the earlier payment-before-completion gate.
- Queue connection status uses an accessible green pulsing dot when connected, yellow while connecting/reconnecting, and red on channel failure/offline; reduced-motion preference disables pulsing.
- Added a button on LINE settings to `https://line.me/R/ti/p/%40597vzcpl`, using the [official LINE URL scheme](https://developers.line.biz/en/docs/messaging-api/sharing-bot/). No LINE message was sent.
- Validation: full frontend gate passed (24 files / 71 tests, lint, TypeScript and production/PWA build). After migration, 17 completion/collection assertions, 13 legacy POS assertions and 13 sales-report assertions passed with rollback fixtures.
- Browser fixtures verified all-category selection, three connection colors/green animation, customer completed state before payment, removal from unfinished queue, later payment through pending collection, LINE link destination and form sizing. These are viewport/fixture tests, not physical iOS certification. Screenshots include `product-form-fit-phone-fixture.jpg` and `completed-unpaid-collection-phone-fixture.jpg` under `artifacts/qa/screenshots/`.
- Redeploy the frontend to use the changes in production; no frontend deployment was performed here.

## Device-persistent customer history — 2026-11-02

- Replaced tab-only tracking persistence with private localStorage records, one per order. Same-origin tabs can add orders without replacing each other's history, and reopening the browser/tab retains links per shop.
- Automatically migrates both earlier sessionStorage formats, removing legacy data only after saving it successfully. Storage failure keeps checkout usable and retains the legacy source for a later retry.
- Added one app-level storage/focus/visibility listener with cleanup to refresh history across tabs. No additional server subscriptions or polling; order details remain token-scoped API reads.
- Validation: 21 files / 65 tests passed, with migration, reopened-tab restoration, stale-tab writes, shop isolation, storage denial and sync/listener cleanup coverage. Browser fixtures at phone/tablet sizes verified closing the first tab, opening a fresh tab with the saved order, and adding a second order in another tab while both histories update.
- Same browser profile and origin are required. Clearing site data/private browsing and switching browsers do not preserve local history; already-lost legacy tokens cannot be reconstructed. No database migration is needed; redeploy the frontend.
- Screenshot evidence: `artifacts/qa/screenshots/device-orders-*-fixture.jpg` (simulated orders).

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
