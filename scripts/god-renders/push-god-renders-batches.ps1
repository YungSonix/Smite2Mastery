# Batch-commit and push God Renders folders (run from repo root).
param([int]$BatchSize = 3)

Set-Location (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)

$gods = Get-ChildItem "app/data/God Renders" -Directory | Sort-Object Name | Where-Object {
  -not (git ls-files -- $_.FullName 2>$null)
}

$total = $gods.Count
Write-Host "Remaining gods: $total"

if ($total -eq 0) {
  Write-Host "Nothing to push."
  exit 0
}

$batchNum = 0
for ($i = 0; $i -lt $total; $i += $BatchSize) {
  $end = [Math]::Min($i + $BatchSize - 1, $total - 1)
  $chunk = $gods[$i..$end]
  $names = ($chunk | ForEach-Object { $_.Name }) -join ", "
  $batchNum++
  Write-Host ""
  Write-Host "=== Batch $batchNum : $names ==="

  foreach ($g in $chunk) {
    git add -- "$($g.FullName)"
  }

  $msg = "God renders: $names"
  $msgPath = Join-Path (git rev-parse --git-dir) "batch-commit-msg.txt"
  [System.IO.File]::WriteAllText($msgPath, $msg, (New-Object System.Text.UTF8Encoding $false))
  git commit -F $msgPath
  Remove-Item $msgPath -Force
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Commit failed for batch $batchNum"
    exit 1
  }

  git push origin master
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Push failed for batch $batchNum ($names)"
    exit 1
  }

  Write-Host "Pushed batch $batchNum"
}

Write-Host ""
Write-Host "All god render batches done."
