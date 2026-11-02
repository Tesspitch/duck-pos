# Phase 9 — Production Readiness

**Status:** Readiness package completed; deployment not performed; go-live blockers documented

## Phase summary

- Defined the Cloudflare Pages build, environment separation, domain, SPA routing, cache, and security-header configuration.
- Defined Supabase production hardening, OAuth callback, Edge Function origin, secrets, monitoring, backup, release, rollback, and incident procedures.
- Added a production verification command and a release smoke-test matrix.
- Preserved the selected Cloudflare Pages + Supabase modular-monolith architecture.

## Architecture and implementation changes

- Added a committed production environment template containing public browser configuration names only.
- Added a Pages SPA fallback for direct React Router routes.
- Hardened static responses with CSP and HSTS in addition to the existing cache/security headers.
- Added a resource-bounded `npm run verify:production` as the repeatable frontend release gate.
- No runtime business logic, database schema, RLS policy, or Edge Function behavior changed.

## Files created or modified

- `.env.production.example` — Cloudflare Pages public environment contract.
- `public/_redirects` — Pages SPA route fallback.
- `public/_headers` — production CSP/HSTS and existing cache/security rules.
- `package.json` — production verification command with a single Vitest worker for deterministic low-resource CI.
- `docs/PRODUCTION_RUNBOOK.md` — configuration, secrets, monitoring, release, rollback, incident, and go-live checklist.
- `docs/BACKUP_RECOVERY.md` — recovery objectives, backup gate, and isolated rehearsal procedure.
- `docs/PHASE_9.md` — phase handoff.

## Business rules covered

- Production release keeps PostgreSQL authoritative and applies migrations before dependent clients.
- Checkout, authorization, payment, availability, and reporting remain uncached server-authoritative operations.
- LINE failure remains isolated from POS and store-close success.
- Production smoke coverage includes QR, POS, queue, payment, store sessions, reports, settings, and LINE.

## Security considerations

- Only the Supabase URL and publishable key may enter `VITE_*` variables.
- OAuth uses exact production URLs; broad production preview allow-lists are prohibited.
- CSP permits only the app, the exact Supabase project, and Google profile images required by current UI.
- Secret rotation and log-redaction rules are documented.
- Production advisor/MFA/network settings remain operator dashboard checks because they cannot be safely inferred from source code.

## Performance and cache considerations

- Hashed assets remain immutable; HTML/service worker remain revalidated.
- Pages CDN and PWA cache only static/public image resources; sensitive data is excluded.
- Cloudflare Web Analytics and post-deployment field Core Web Vitals are included in the monitoring plan.
- The Phase 8 local production baseline remains the pre-deployment comparison point.

## Test results

Recorded after implementation in this phase:

- `npm run verify:production`: passed.
- ESLint: passed.
- Vitest CI mode: 11 files, 24 tests passed.
- Production build: passed; PWA precached 38 entries (794.43 KiB).
- Pages artifact inspection: `_headers`, `_redirects`, `sw.js`, and `manifest.webmanifest` are present in `dist`.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Full `npm audit`: 4 low-severity development-only findings in `deepmerge` through Workbox/`vite-plugin-pwa`; the offered fix is a breaking forced downgrade and was not applied.
- Supabase Edge Functions: `customer-checkout`, `line-webhook`, and `line-notification-worker` are `ACTIVE`; JWT settings match their reviewed configuration.
- Supabase migration history: migrations `001–026`, previously executed through SQL Editor, were recorded as applied without re-running their SQL. A second CLI listing confirmed every local and remote timestamp matches.
- Hosted pgTAP re-run through the CLI was attempted before ledger repair, but the current CLI requires Docker/Podman even with `--linked`. The Phase 8 hosted regression result remains the schema verification evidence; no schema SQL changed during ledger repair.
- `git diff --check`: passed; line-ending conversion warnings only.
- Deployment smoke tests: intentionally not run because deployment is not approved.

## Remaining issues

- The final production domain is not yet supplied, so `<production-domain>` must be replaced during the approved release.
- Cloudflare Pages project creation and frontend deployment require separate explicit approval.
- Supabase dashboard Security/Performance Advisor, SSL/network settings, organization MFA, and exact production URLs require operator confirmation.
- Free Plan projects may pause when inactive and do not provide downloadable managed backups.
- A real backup and isolated restore rehearsal still require Docker/Podman, an approved recovery target, and explicit authorization to copy production data.

## Next action

Review the go-live checklist with the final domain and decide whether to accept the Free Plan recovery limitations. Deployment must be requested explicitly and is not part of this phase execution.
