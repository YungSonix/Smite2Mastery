Set-Location (Split-Path $PSScriptRoot -Parent)
"Add tier badge and currency icons for skin showcase" | Out-File -Encoding utf8 .git/amend-msg.txt
git commit --amend -F .git/amend-msg.txt
Remove-Item .git/amend-msg.txt -Force
