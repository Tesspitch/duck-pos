# DuckPOS Production Runbook

This runbook prepares DuckPOS for production without authorizing a deployment. Replace every `<...>` placeholder before release.

## 1. Release topology

- Frontend: Cloudflare Pages, static Vite output from `dist`.
- Backend: Supabase project `tvxevvebhtypjojnrmhw`.
- Database: PostgreSQL is the source of truth; schema changes use ordered migrations only.
- Authentication: Supabase Auth with Google OAuth.
- Public checkout and LINE delivery: Supabase Edge Functions.
- Images: public Supabase Storage buckets with client-side compression and versioned URLs.

No Cloudflare Pages Function, privileged credential, or separate cache service is required.

## 2. Cloudflare Pages configuration

Create the Pages project only after deployment approval.

| Setting | Production value |
| --- | --- |
| Framework preset | React (Vite) |
| Production branch | `main` (confirm the repository's release branch first) |
| Build command | `npm run verify:production` |
| Build output directory | `dist` |
| Root directory | repository root |
| Node.js | 22 LTS |

Set these build-time variables in the **Production** environment:

- `VITE_SUPABASE_URL=https://tvxevvebhtypjojnrmhw.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>`

These two values are intentionally public. Never put a Google client secret, Supabase secret/service-role key, LINE secret/token, `RATE_LIMIT_SALT`, or `LINE_WORKER_SECRET` in Cloudflare Pages or any `VITE_*` variable.

Until a separate staging Supabase project exists, do not connect Pages preview deployments to the production Supabase project. Preview builds may compile, but must not be used for authenticated or mutating production tests.

`public/_redirects` provides the React Router fallback. `public/_headers` applies cache policy, browser permissions, HSTS, and a restrictive CSP to static responses.

## 3. Production domain and OAuth

After the final HTTPS domain is known:

1. Cloudflare Pages: attach `<production-domain>` and wait for TLS to become active.
2. Supabase Auth > URL Configuration:
   - Site URL: `https://<production-domain>`
   - Redirect URL: `https://<production-domain>/auth/callback`
   - Keep `http://localhost:5173/auth/callback` only for controlled local development.
3. Google Cloud OAuth client:
   - Authorized JavaScript origin: `https://<production-domain>`
   - Authorized redirect URI remains `https://tvxevvebhtypjojnrmhw.supabase.co/auth/v1/callback`.
4. Supabase Edge Function secret `ALLOWED_ORIGINS`:
   - `https://<production-domain>`
   - Add localhost only when a deliberate production-backend smoke test is required, then remove it.
5. Test sign-in, sign-out, callback refresh, and a directly opened protected route.

Do not use a broad `*.pages.dev` OAuth allow-list against the production backend.

## 4. Supabase production configuration

Review these dashboard settings before release:

- Security Advisor: no unexplained critical/high findings.
- Performance Advisor: review missing-index and slow-query findings.
- Database SSL enforcement: enabled.
- Network restrictions: document whether they are available and compatible with operational access before enabling.
- Organization owners: at least two trusted owners where practical, both protected with MFA.
- Auth provider: Google enabled; no unused providers or test credentials.
- Auth URL configuration: production Site URL and exact callback are present.
- Realtime: only required tables are published; RLS remains enabled.
- Storage: `product-images` and `shop-assets` policies remain shop-scoped for writes.
- Edge Functions: `customer-checkout`, `line-webhook`, and `line-notification-worker` are deployed at the reviewed version.
- Database migrations: the remote migration ledger was reconciled with the repository through migration `026` on 2026-10-30. Future schema changes must use ordered migration files and must not be applied only through SQL Editor.

The current Free Plan may pause an inactive project and does not provide downloadable managed backups. Treat both as accepted operational risks or approve a plan upgrade before launch.

## 5. Secret inventory and rotation

| Location | Name | Exposure rule |
| --- | --- | --- |
| Cloudflare Pages | `VITE_SUPABASE_URL` | Public |
| Cloudflare Pages | `VITE_SUPABASE_PUBLISHABLE_KEY` | Public, RLS still mandatory |
| Supabase Auth provider | Google client ID | Provider configuration |
| Supabase Auth provider | Google client secret | Secret; never in frontend/repository |
| Supabase Edge Function secrets | `ALLOWED_ORIGINS` | Configuration, exact origins only |
| Supabase Edge Function secrets | `RATE_LIMIT_SALT` | Secret, random and rotatable |
| Supabase Edge Function secrets | `LINE_CHANNEL_SECRET` | Secret |
| Supabase Edge Function secrets | `LINE_CHANNEL_ACCESS_TOKEN` | Secret |
| Supabase Edge Function secrets | `LINE_WORKER_SECRET` | Secret, random and rotatable |
| Supabase managed runtime | `SUPABASE_URL`, service-role/secret key | Never copy to frontend |

Rotate a suspected secret immediately, redeploy/reconfigure the affected integration if required, then test the narrow affected flow. Record only the secret name, rotation time, operator, and test result—never the value.

## 6. Monitoring and alert routine

Daily during launch week, then weekly:

- Cloudflare Pages: deployment status, Web Analytics, 4xx/5xx trend, and field Core Web Vitals.
- Supabase: API/Auth/Database/Realtime/Storage usage and quota trend.
- Edge Functions: invocation failures, duration spikes, and logs for checkout/LINE functions.
- Database: Security Advisor, Performance Advisor, slow queries, connection and disk usage.
- DuckPOS: failed LINE runs, stuck `PROCESSING` jobs, repeated checkout rate limits, and audit-log anomalies.
- External status: Cloudflare and Supabase status pages during incidents.

Suggested initial triggers are operational review thresholds, not guaranteed platform alerts:

- any checkout or authentication 5xx burst;
- any failed store-close report after retries;
- LCP P75 above 2.5 seconds for a sustained period;
- database/storage/egress usage above 70% of the applicable quota;
- repeated authorization/RLS errors after a release.

Never log tokens, authorization headers, tracking tokens, raw LINE signatures, full customer locations, or service-role credentials.

## 7. Release procedure

1. Freeze the intended commit and record its SHA.
2. Run `npm ci`, then `npm run verify:production` (the CI test command intentionally uses one worker to bound memory/process usage).
3. Run all pgTAP files against an isolated/staging database where available.
4. Review `git diff`, dependency audit, generated bundle sizes, migration order, and the remote migration ledger.
5. Complete the manual backup gate in `docs/BACKUP_RECOVERY.md` before any production migration.
6. Apply reviewed migrations before releasing frontend code that depends on them.
7. Deploy Edge Functions whose contract changed and run their narrow smoke tests.
8. Deploy the frozen frontend commit to Cloudflare Pages only after explicit approval.
9. Run the smoke matrix below and record timestamp/operator/result.
10. Monitor errors and core flows closely for at least 30 minutes.

Smoke matrix:

- public menu, image loading, cart, geolocation failure/success, checkout idempotency, tracking;
- Google login/callback/logout, active-shop switching, profile;
- POS order, shared queue, status transitions, payment recording;
- store open/close including zero-sales LINE report;
- catalog/topping availability and shop settings;
- sales dashboard/history/CSV;
- direct route refresh, PWA install/update, offline static shell (no checkout while offline).

## 8. Rollback and incidents

Frontend rollback: use Cloudflare Pages deployment history to promote the last verified build. A frontend rollback does not roll back database state.

Database rollback: prefer a reviewed forward-fix migration. Do not run destructive down migrations or restore over production during an incident without explicit approval and a verified backup.

Edge Function rollback: redeploy the last reviewed function version, then validate its database contract. If LINE is failing, disable its dispatch path without blocking POS/store-close operations.

For a suspected credential leak: revoke/rotate first, inspect audit and function logs, then restore service with the new secret. For a platform incident: preserve evidence, check vendor status, communicate the affected flows, and avoid repeated writes that could defeat idempotency assumptions.

## 9. Go-live decision checklist

- [ ] Final production domain is known and TLS is active.
- [ ] Explicit deployment approval has been recorded.
- [ ] Production and preview environments are separated.
- [ ] Cloudflare production variables contain only the two public Vite values.
- [ ] Supabase and Google OAuth URLs use the final domain.
- [ ] `ALLOWED_ORIGINS` contains the final exact origin.
- [ ] Supabase Security and Performance Advisor findings are reviewed.
- [ ] Organization access/MFA and owner recovery are reviewed.
- [ ] Edge Function secret names are present and a rotation owner is assigned.
- [ ] Remote migrations match the repository.
- [ ] A current database and Storage backup exists and checksums are recorded.
- [ ] The Free Plan backup/pause limitations are explicitly accepted or mitigated.
- [ ] `npm run verify:production` and database regression pass on the release commit.
- [ ] Rollback operator and smoke-test operator are assigned.
- [ ] Post-deployment monitoring window is scheduled.

No unchecked security, backup, domain, or deployment-approval item may be silently waived.
