# DuckPOS Backup and Recovery

The current Supabase project uses the Free Plan. Supabase Dashboard reports that this plan does not include scheduled database backups.

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

A full restore rehearsal remains a Phase 9 production-readiness task because it needs an isolated recovery target and explicit approval.
