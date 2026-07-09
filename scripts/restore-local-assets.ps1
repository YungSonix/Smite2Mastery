# Restore large asset folders from the `assets` branch for local dev.
# Files stay gitignored on `master` — not committed.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts/restore-local-assets.ps1

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

$folders = @(
  'app/data/VoiceAudio',
  'app/data/Icons/Item Icons',
  'app/data/God Renders'
)

Write-Host 'Fetching origin/assets...'
git fetch origin assets

foreach ($folder in $folders) {
  Write-Host "Restoring $folder from origin/assets ..."
  git checkout origin/assets -- $folder
}

Write-Host 'Done. Files are on disk (gitignored on master). Runtime CDN: assets branch via networkConfig.'
