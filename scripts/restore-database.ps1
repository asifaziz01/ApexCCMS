param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [Parameter(Mandatory = $true)]
  [string]$TargetDatabase,
  [switch]$ConfirmRestore
)

$ErrorActionPreference = 'Stop'
if (-not $ConfirmRestore) { throw 'Restore is destructive. Re-run with -ConfirmRestore after validating the target database.' }
$resolved = [System.IO.Path]::GetFullPath($BackupFile)
if (-not (Test-Path -LiteralPath $resolved -PathType Leaf)) { throw "Backup file not found: $resolved" }
if (-not $TargetDatabase) { throw 'TargetDatabase is required' }
& pg_restore --dbname=$TargetDatabase --clean --if-exists --no-owner --no-privileges $resolved
if ($LASTEXITCODE -ne 0) { throw "pg_restore failed with exit code $LASTEXITCODE" }
Write-Output "Database restore completed for the explicitly supplied target"
