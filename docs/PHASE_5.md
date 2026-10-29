# Phase 5 — Store Management

**Status:** Completed — Phase 6 approved on 29 October 2026

## Phase summary

- Owner-only open/close store controls
- Atomic Store Session open/close operations
- Business Date calculated once from shop timezone and preserved across midnight
- Pending order checks before close
- Store Session history with order counts and collected sales snapshot
- Realtime invalidation for session/order changes

## Clean Architecture

- `store-management/domain`: Session/history models and close eligibility rule
- `store-management/application`: Repository/realtime ports, queries and mutations
- `store-management/infrastructure`: Supabase RPC and Realtime adapters
- `store-management/presentation`: Store control page and history component

## Security

- Only active Owner can mutate Store Sessions
- Frontend cannot insert/update Store Sessions or Store Events directly
- RPC locks the Shop/Session rows to prevent concurrent duplicate open/close
- Expected Session ID prevents stale device from closing a newer session
- Audit Log and Store Event are written in the same transaction

## Performance and cache

- One RPC returns active session, pending count and 20 recent sessions
- Query stale 10 seconds; Realtime only invalidates cache and PostgreSQL stays authoritative
- Subscriptions filter by Shop ID and unsubscribe on shop/page change

## Tests

- Production migration `015` applied successfully
- Hosted pgTAP schema/security tests passed 12/12
- Hosted functional flow passed 8/8: open store, duplicate-open protection, timezone business date, management read, atomic close and Store Event records; all fixture data was rolled back
- Production build and ESLint passed
- Unit tests passed 11/11
- Browser smoke passed on `/store`: current shop/status, open action and empty history rendered correctly
- Console had no warnings or errors
- Responsive smoke passed at Mobile 390px and Tablet 1024px with no horizontal overflow

## Remaining issues / deferred validation

- The Production shop was not opened or closed through the browser, so no real Store Session was changed; the same flow passed against the Production database inside a rolled-back transaction
- MVP intentionally has no force-close path; pending `QUEUED`, `PREPARING` or `READY` orders must be resolved first
- LINE closing reports remain in Phase 7 as specified

## Next phase proposal

Phase 6 — Sales Analytics: revenue/payment dashboard, history, filtering, pagination, aggregate queries and CSV export

