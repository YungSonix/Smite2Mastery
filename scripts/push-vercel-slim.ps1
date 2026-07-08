# Push slim `master` for Vercel (run once after `git filter-repo` shrink)
#
# 1. Preserves the old fat tree on branch `assets` (voice audio, etc.)
# 2. Force-pushes rewritten `master` (~1GB instead of ~19GB)
#
# Requires: git remote `origin` -> github.com/YungSonix/Smite2Mastery

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (git remote get-url origin 2>$null)) {
  git remote add origin https://github.com/YungSonix/Smite2Mastery.git
}

Write-Host 'Fetching origin...'
git fetch origin

$oldMaster = git rev-parse origin/master 2>$null
if ($LASTEXITCODE -eq 0 -and $oldMaster) {
  Write-Host "Publishing assets branch from former origin/master ($oldMaster)..."
  git push origin "${oldMaster}:refs/heads/assets"
}

Write-Host 'Force-pushing slim master...'
git push origin master --force

Write-Host 'Done. In Vercel: Production Branch = master, then Redeploy.'
