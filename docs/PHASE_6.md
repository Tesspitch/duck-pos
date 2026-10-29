# Phase 6 — Sales Analytics

**Status:** Completed — awaiting Phase 7 approval

## Phase summary

- Owner-only sales dashboard with gross order value and net collected sales
- Paid, unpaid, cancelled, products sold and average order metrics
- Cash/transfer and QR/POS breakdowns
- Best-selling product and daily/monthly trend reports
- Server-side sales history search, filter, sort and pagination
- Filtered CSV export with a 5,000-row safety limit

## Clean Architecture

- `sales-analytics/domain`: Report models, date-range rule and CSV serialization
- `sales-analytics/application`: Repository/export ports and TanStack Query hooks
- `sales-analytics/infrastructure`: Supabase aggregate RPC adapter and browser download adapter
- `sales-analytics/presentation`: Filters, metrics, breakdown and history components

## Security

- Every report RPC validates active Owner membership server-side
- Anonymous execution is revoked
- Frontend does not aggregate raw order/payment tables and does not contain privileged credentials
- Shop ID, date range, filter, sort and pagination are validated on the server

## Performance and cache

- Dashboard uses database aggregate queries and a 60-second stale time
- History uses server-side pagination and a 2-minute stale time
- Store Session options use a 5-minute stale time and return at most 100 sessions
- Indexed shop/date, shop/session and payment status/method query paths
- CSV reuses paginated RPC batches instead of loading unbounded history

## Tests

- Production migration `016` applied successfully
- Hosted pgTAP schema/security tests passed 12/12
- Hosted functional aggregate flow passed 13/13 and rolled back all fixture data
- Production build and ESLint passed
- Unit tests passed 14/14 across 6 test files, including date-range and CSV serialization rules
- Browser smoke passed on `/reports`: Owner route, filters, zero-state metrics, breakdown and paginated history rendered correctly
- 30-day and monthly filters reloaded successfully against the Production database
- Responsive smoke passed at Mobile 390px and Tablet 1024px; no page-level horizontal overflow and touch buttons are at least 44px
- Browser console had no warnings or errors after a clean reload

## Remaining issues / deferred validation

- The current Production shop has no sales in the selected range, so the browser CSV button remained disabled; CSV content was verified by unit test and the report dataset was verified with rolled-back Production fixtures
- CSV export intentionally stops at 5,000 filtered rows per download to protect browser memory and Free Tier query usage
- Refund mutation UI remains deferred; reports already handle existing `REFUNDED` records by excluding them from net collected sales
- LINE delivery and report run history remain in Phase 7

## Next phase proposal

Phase 7 — LINE Integration: webhook signature validation, Shop ID subscription, Owner approval, closing/periodic sales reports, retry, deduplication and notification logs
