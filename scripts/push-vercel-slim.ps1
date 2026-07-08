# Push slim `master` + preserve blobs on `assets` branch
#
# master = app code + JSON data (Vercel deploys this)
# assets = voice, NewGodSkins, wallpapers, legacy icons (runtime CDN)
#
# First run (before slim master is on GitHub):
#   1. Push old fat origin/master -> assets
#   2. Force-push slim local master -> master
#
# Re-runs: skips assets if it already exists (safe to run again for master only).

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (git remote get-url origin 2>$null)) {
  git remote add origin https://github.com/YungSonix/Smite2Mastery.git
}

$assetsSha = (git ls-remote --heads origin refs/heads/assets 2>$null) -split '\s+' | Select-Object -First 1
$masterSha = (git ls-remote --heads origin refs/heads/master 2>$null) -split '\s+' | Select-Object -First 1

if ($assetsSha) {
  Write-Host "assets branch already on origin ($assetsSha) — skipping (do not overwrite with slim master)."
} elseif ($masterSha) {
  Write-Host "Creating assets from origin/master ($masterSha)..."
  git push origin "${masterSha}:refs/heads/assets"
} else {
  Write-Host 'WARN: no origin/master — create assets branch on GitHub manually before slim push.'
}

Write-Host 'Force-pushing slim master...'
git push origin master --force

Write-Host 'Done. master = slim app | assets = blobs. Redeploy Vercel (Production branch: master).'
