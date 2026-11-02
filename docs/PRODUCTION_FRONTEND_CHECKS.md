# Production frontend hardening

## Implemented

- Removed Phase/MVP labels from runtime UI (source scan returned no matches).
- Shared accessible loading status for route loading, public menu, POS, queue, catalog and topping library.
- Global background-fetch indicator and offline status with automatic recovery on reconnect.
- Error boundary for render/lazy-route failures with a user-triggered reload action.
- Authentication session lookup rejection ends the loading state instead of leaving the app stuck.

## Refresh policy

| Data | Visible-page interval | Other refresh triggers |
| --- | --- | --- |
| Public menu / staff catalog | 60 seconds | Focus, reconnect, local mutation invalidation |
| Staff orders | 30 seconds | Queue Realtime, focus, reconnect, mutations |
| Store sessions | 60 seconds | Realtime, reconnect, mutations |
| Sales dashboard/history | 60 seconds | Focus, reconnect, manual refresh |
| LINE management | 60 seconds | Focus, reconnect, mutations |
| Customer tracking | Existing 7 seconds while active | Stops for terminal status, pauses when hidden |

Intervals do not run in the background. Query keys retain shop isolation and TanStack Query deduplicates identical requests. Refresh does not reload the document or reset forms/carts. The server remains authoritative at checkout and payment.

## Validation and boundaries

- Unit suite: 11 files / 24 tests passed during this work.
- Release remains subject to the production domain, OAuth/CORS, backup/recovery and post-deployment smoke checks in PRODUCTION_RUNBOOK.md.
- This change does not certify untested production transactions or deploy the frontend.
