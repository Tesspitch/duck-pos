# DuckPOS Backup and Recovery

The current Supabase project uses the Free Plan. Supabase Dashboard reports that this plan does not include downloadable managed database backups. DuckPOS therefore needs an operator-created backup before each production database change.

## Recovery objectives

- MVP target RPO: the most recent verified manual backup taken before a production database change.
- MVP target RTO: best effort; no guaranteed recovery time is possible on the Free Plan.
- A lower RPO/RTO requires an approved paid Supabase plan with managed backup/PITR capability.

## Manual backup

Run from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-supabase.ps1
```

Supabase CLI currently requires Docker Desktop or Podman to run `db dump`. The Phase 8 environment has neither available, so the dump procedure is prepared but could not be executed.

The command creates an ignored `.local-backups/<timestamp>/` directory containing:

- `roles.sql`
- `schema.sql`
- `data.sql`
- `manifest.txt` with SHA-256 checksums

The data dump contains production information. Never commit, upload, or share this directory.

Supabase Storage object files are not contained in `db dump`. Product images and shop logos need a separate object export before a disaster-recovery exercise.

## Recovery rehearsal

Never restore directly over production. Create an isolated local Supabase instance or a separately approved recovery project, then restore roles, schema, and data in that order. Validate row counts, RLS policies, RPC permissions, authentication membership, order totals, and storage paths before considering recovery successful.

A full restore rehearsal needs an isolated recovery target and explicit approval. It must not run against project `tvxevvebhtypjojnrmhw`.

## Change-time backup gate

Before applying a future production migration:

1. Confirm the migration and rollback/forward-fix plan have been reviewed.
2. Create and checksum the roles, schema, and data dumps.
3. Export the `product-images` and `shop-assets` Storage objects separately.
4. Record the backup timestamp and migration name in the release log.
5. Stop the release if any dump or checksum step fails.

## Isolated restore rehearsal

1. Create a local Supabase stack or a separately approved recovery project.
2. Restore `roles.sql`, then `schema.sql`, then `data.sql`.
3. Restore Storage objects to the matching bucket paths.
4. Run all pgTAP tests against the isolated target.
5. Compare table row counts, RLS status, RPC execute grants, order totals, memberships, and Storage object counts.
6. Destroy or restrict the recovery target after verification because it contains production data.

The Phase 9 readiness review documents this as an operational limitation: no restore was executed because Docker/Podman and an approved isolated recovery target are not currently available.
