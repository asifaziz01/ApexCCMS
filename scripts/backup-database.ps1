param(
  [Parameter(Mandatory = $true)]
  [string]$OutputFile
)

$ErrorActionPreference = 'Stop'
if (-not $env:DATABASE_URL) { throw 'DATABASE_URL is required' }
$resolved = [System.IO.Path]::GetFullPath($OutputFile)
$parent = [System.IO.Path]::GetDirectoryName($resolved)
if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
& pg_dump --dbname=$env:DATABASE_URL --format=custom --file=$resolved --no-owner --no-privileges
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
Write-Output "Database backup created at $resolved"
