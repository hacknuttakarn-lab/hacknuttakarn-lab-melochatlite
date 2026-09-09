$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "MELO Web directMine FORCE FIX" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

node .\MELO_FORCE_FIX_DIRECTMINE_2026-08-31.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Patch failed. .next will NOT be touched." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Removing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host ".next removed." -ForegroundColor Green
} else {
    Write-Host ".next does not exist - nothing to remove." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Now run:" -ForegroundColor Cyan
Write-Host "npm run build"
Write-Host "npm run dev"
