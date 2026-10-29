# Phase 7 — LINE Integration

**Status:** Completed — awaiting Phase 8 approval

## Phase summary

- Signed LINE webhook receives Shop ID and creates a pending subscription request
- Owner page manages closing/periodic settings, approvals, revocations and delivery history
- Store close atomically creates a closing report run without calling LINE synchronously
- Store open creates a status notification, and store close always creates a sales report including zero-sales sessions
- Lightweight database cron enqueues only due periodic/retry work; event-driven dispatch invokes the worker only when jobs exist
- Worker claims jobs safely and sends LINE push messages
- Retry, stale-job recovery, idempotency and notification logs are persisted in PostgreSQL

## Clean Architecture

- `line-notifications/domain`: subscription, settings and report-run models plus schedule normalization
- `line-notifications/application`: management repository port, provider and TanStack Query use cases
- `line-notifications/infrastructure`: Supabase RPC adapter
- `line-notifications/presentation`: focused settings, subscriber and history components
- Edge Functions keep LINE signature/API concerns outside React and database business rules

## Security

- Webhook validates the raw request body with HMAC-SHA256 before processing
- Webhook/worker RPCs are service-role only; owner RPCs enforce active Owner membership
- LINE secrets remain in Edge Function secrets and never enter Vite environment variables
- Full LINE User ID is never returned to the browser
- All mutation tables have RLS enabled and no direct authenticated write grants

## Performance and reliability

- Closing only inserts a report/job; LINE latency cannot block store close
- Worker claims up to 20 jobs using `FOR UPDATE SKIP LOCKED`
- Periodic reports are deduplicated per shop/local date/scheduled minute
- Retry stops after 5 attempts and records the final error
- Owner management query returns only the latest 50 report runs

## Tests

- Local lint and production build pass
- Unit tests pass 20/20 across 9 test files
- Production migrations `018`–`024` applied successfully
- Hosted pgTAP schema, RBAC, webhook flow, opening/closing jobs, zero-sales report, worker completion and periodic deduplication passed 29/29
- Event dispatch and pending/retry recovery pgTAP passed 8/8
- Real LINE opening and closing delivery passed with status `SENT` and recipient count 1/1
- Real cron-driven periodic delivery passed at 17:21 Asia/Bangkok with status `SENT` and recipient count 1/1; the temporary periodic schedule was disabled again after verification
- Responsive browser smoke passed at 390×844 and 768×1024 without page-level horizontal overflow

## Remaining issues

- No remaining Phase 7 blocker
- Production monitoring, load/performance tuning and broader security regression belong to Phase 8

## Next phase proposal

Phase 8 — Optimization & QA: image/query/cache/PWA/realtime optimization, bundle analysis, security and integration regression, multi-device testing, performance benchmarks, and backup/recovery verification.

