# Push VoiceAudio commits in chunks to avoid HTTP 500.
# Run from repo root:   cd c:\Users\carri\smite2app
#
# Option A - Four larger chunks (fewer merges on GitHub):
#   .\scripts\push-voice-chunks.ps1 -Part 1
#   .\scripts\push-voice-chunks.ps1 -Part 2
#   .\scripts\push-voice-chunks.ps1 -Part 3
#   .\scripts\push-voice-chunks.ps1 -Part 4
# Then on GitHub: merge voice-part1 into master, then voice-part2, voice-part3, voice-part4.
#
# Option B - One commit at a time (smallest pushes; run 1..13):
#   .\scripts\push-voice-chunks.ps1 -Chunk 1
#   ... then merge voice-1 into master on GitHub, pull, then Chunk 2, etc.

param(
    [int]$Chunk = 0,   # 1-13 = push single commit as voice-N
    [int]$Part = 0     # 1-4 = push 4-commit chunk as voice-partN
)

$commits = @(
    "591e85b", "09e337b", "29382a1", "4d735f2", "34dbbce", "fb154ec", "ef3587e",
    "4fbac47", "8ecf86e", "9a4c9b8", "f6dbe09", "62f883f", "310b303"
)

# Part 1-4: push 4 branches (4+4+3+2 commits)
$partTips = @("4d735f2", "4fbac47", "f6dbe09", "310b303")  # HEAD~9, HEAD~5, HEAD~2, HEAD

if ($Part -ge 1 -and $Part -le 4) {
    $ref = "refs/heads/voice-part$Part"
    $rev = $partTips[$Part - 1]
    Write-Host "Pushing voice-part$Part (up to $rev)..."
    & git push origin "${rev}:$ref"
    if ($LASTEXITCODE -eq 0) { Write-Host "Done. On GitHub: merge voice-part$Part into master." } else { exit 1 }
} elseif ($Chunk -ge 1 -and $Chunk -le 13) {
    $rev = $commits[$Chunk - 1]
    Write-Host "Pushing voice-$Chunk..."
    & git push origin "${rev}:refs/heads/voice-$Chunk"
    if ($LASTEXITCODE -eq 0) { Write-Host "Done: voice-$Chunk" } else { exit 1 }
} else {
    Write-Host "Usage: -Chunk 1..13 (one commit) or -Part 1..4 (4 chunks). Example: .\scripts\push-voice-chunks.ps1 -Part 1"
}
