param(
  [string]$OutputDirectory = '.local-backups'
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and -not (Get-Command podman -ErrorAction SilentlyContinue)) {
  throw 'Supabase CLI db dump requires Docker Desktop or Podman. Neither is available on PATH.'
}
$backupStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $OutputDirectory $backupStamp
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

Write-Host "Creating DuckPOS database backup in $backupRoot"
npx supabase db dump --linked --role-only --file (Join-Path $backupRoot 'roles.sql')
if ($LASTEXITCODE -ne 0) { throw 'Role backup failed.' }

npx supabase db dump --linked --schema public --file (Join-Path $backupRoot 'schema.sql')
if ($LASTEXITCODE -ne 0) { throw 'Schema backup failed.' }

npx supabase db dump --linked --data-only --use-copy --schema public --file (Join-Path $backupRoot 'data.sql')
if ($LASTEXITCODE -ne 0) { throw 'Data backup failed.' }

$manifest = @(
  "created_at=$((Get-Date).ToString('o'))"
  "project_ref=tvxevvebhtypjojnrmhw"
  "roles_sha256=$((Get-FileHash (Join-Path $backupRoot 'roles.sql') -Algorithm SHA256).Hash)"
  "schema_sha256=$((Get-FileHash (Join-Path $backupRoot 'schema.sql') -Algorithm SHA256).Hash)"
  "data_sha256=$((Get-FileHash (Join-Path $backupRoot 'data.sql') -Algorithm SHA256).Hash)"
)
Set-Content -LiteralPath (Join-Path $backupRoot 'manifest.txt') -Value $manifest -Encoding utf8

Write-Host 'Backup completed. Keep this directory private; it contains production data.'
