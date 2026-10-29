# Phase 8 — Optimization & QA

Status: In progress. Application, production database, security, and responsive checks pass. Full backup/recovery verification is blocked by Free Plan limitations and the absence of Docker/Podman for `supabase db dump`.

## Implemented

- Added `vite-plugin-pwa` with automatic service-worker updates.
- Precached hashed application assets and the app shell.
- Added runtime caching only for public, versioned Supabase Storage images.
- Explicitly excluded API, authentication, orders, payments, permissions, and reports from runtime caching.
- Added Cloudflare Pages cache and baseline security headers.
- Added a lightweight SVG PWA icon and install manifest.
- Added global TanStack Query defaults for reconnect refetch, bounded retries, stale time, and garbage collection.
- Added store-management refetch on browser reconnect.
- Kept Realtime subscriptions filtered by shop and removed channels on unmount.
- Preserved adaptive customer tracking: pause while hidden and stop on terminal order status.
- Added server-authoritative shared option-pricing tests for first-free topping pricing.
- Increased navigation touch targets to at least 44 × 44 CSS pixels.
- Applied Migration 026 to the linked production project.
- Added an ignored manual backup script and recovery procedure for Free Plan operation.

## Verification completed

- ESLint: passed.
- Vitest: 24/24 passed.
- TypeScript and production build: passed.
- PWA build: generated service worker and manifest; 38 precache entries, 793.67 KiB uncompressed.
- Production dependency audit: 0 vulnerabilities.
- Full dependency audit: 4 low-severity findings in PWA build tooling only; the suggested automatic fix is a breaking downgrade and was not applied.
- Responsive smoke test at 390×844, 768×1024, and 1366×768:
  - `/`, `/toppings`, `/pos`, `/queue`, `/settings/shop`
  - no horizontal overflow
  - no unwrapped interactive target smaller than 44×44 after the navigation fix
- Image uploads already compress before upload:
  - product image target: WebP, about 200 KiB maximum target
  - shop logo target: WebP, about 100 KiB maximum target
- Query review found explicit column selection in browser-facing table reads and RPC aggregation for reporting/order queues.
- Index review found shop/status/date indexes for orders, payments, sessions, reporting, catalog, reusable toppings, and notification jobs.
- Database regression: all 18 pgTAP files passed against the linked project, including 22 reusable-topping assertions and 21 first-free-pricing assertions.
- First-free integration: real POS and QR order functions were executed inside rollback transactions with three sauces; both produced a 12,000-satang total and option snapshots of `0,1000,1000` satang.
- Hosted integration smoke: topping management, public menu, and POS loaded production data without alerts, console errors, or horizontal overflow.
- Supabase Dashboard verification: the current Free Plan does not include scheduled backups.
- Schema dump attempt: blocked because Supabase CLI requires Docker Desktop or Podman and neither is installed.

## Pending verification

- Create an actual manual database dump after Docker/Podman is available and explicit approval is given to copy production rows locally.
- Run production-hosted Lighthouse/Core Web Vitals measurements. Chrome performance trace APIs are unavailable in the current tool session; local build sizes are recorded instead.
- Verify Supabase backup availability and perform a documented recovery rehearsal in Phase 9. No destructive restore will be run against production.

## Bundle baseline

- Main application entry: 119.63 KiB, 34.11 KiB gzip.
- React vendor: 210.53 KiB, 65.70 KiB gzip.
- Supabase vendor: 214.38 KiB, 55.16 KiB gzip.
- TanStack Query vendor: 43.08 KiB, 13.04 KiB gzip.
- Route pages remain lazy-loaded; the largest route chunk is the topping library at 17.34 KiB, 4.49 KiB gzip.
