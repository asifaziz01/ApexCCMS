import { readFile } from 'node:fs/promises';

const backup = await readFile(new URL('./backup-database.ps1', import.meta.url), 'utf8');
const restore = await readFile(new URL('./restore-database.ps1', import.meta.url), 'utf8');
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(backup.includes('[Parameter(Mandatory = $true)]') && backup.includes('$OutputFile'), 'backup must require an explicit output file');
assert(backup.includes('--format=custom') && backup.includes('--no-owner --no-privileges'), 'backup must use portable restricted custom format');
assert(restore.includes('[switch]$ConfirmRestore') && restore.includes('if (-not $ConfirmRestore)'), 'restore must require explicit destructive confirmation');
assert(restore.includes('[Parameter(Mandatory = $true)]') && restore.includes('$TargetDatabase'), 'restore must require an explicit target database');
assert(restore.includes('--clean --if-exists --no-owner --no-privileges'), 'restore must use guarded cleanup and ownership flags');
console.log(JSON.stringify({ ok: true, checks: 5, backup: 'guarded', restore: 'explicit-target' }));
