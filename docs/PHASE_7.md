# Phase 7 — LINE Integration

**Status:** Database verified — awaiting secrets, Edge Function deployment and delivery verification

## Phase summary

- Signed LINE webhook receives Shop ID and creates a pending subscription request
- Owner page manages closing/periodic settings, approvals, revocations and delivery history
- Store close atomically creates a closing report run without calling LINE synchronously
- Store open creates a status notification, and store close always creates a sales report including zero-sales sessions
- Worker enqueues due periodic reports, claims jobs safely and sends LINE push messages
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

- Local build passes
- Unit tests pass 16/16 across 7 test files
- Production migrations `018` and enum-cast repair `019` applied successfully
- Hosted pgTAP schema, RBAC, webhook flow, opening/closing jobs, zero-sales report, worker completion and periodic deduplication passed 29/29
- Event dispatch and pending/retry recovery pgTAP passed 8/8
- Browser smoke remains pending until the Edge Functions and secrets are configured

## Remaining operational steps

1. Configure the three LINE/worker secrets
2. Deploy `line-webhook` and `line-notification-worker`
3. Configure LINE webhook URL and one-minute scheduler
4. Perform a real LINE sandbox delivery test and responsive browser smoke

