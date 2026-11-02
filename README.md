# DuckPOS

Lightweight POS and QR ordering PWA for takeaway shops. The frontend is React/Vite and the server-authoritative backend is Supabase PostgreSQL, Auth, Realtime, Storage, and Edge Functions.

## Local development

1. Copy `.env.example` to `.env` and set the local Supabase values.
2. Run `npm ci`.
3. Run `npm run dev`.

Google OAuth secrets and all other privileged credentials belong in Supabase configuration, never in `VITE_*` variables.

## Quality gates

- `npm run lint` — static analysis.
- `npm run test` — local unit tests.
- `npm run test:ci` — deterministic low-resource unit-test run.
- `npm run build` — production bundle and PWA generation.
- `npm run verify:production` — release gate used by Cloudflare Pages.
- `npm run db:test` — pgTAP database tests against a configured Supabase environment.

Architecture boundaries are documented in `docs/ARCHITECTURE.md`. Production configuration, release, monitoring, rollback, and go-live checks are in `docs/PRODUCTION_RUNBOOK.md`.

Deployment is never implicit: Cloudflare Pages release and production database changes require explicit approval.
