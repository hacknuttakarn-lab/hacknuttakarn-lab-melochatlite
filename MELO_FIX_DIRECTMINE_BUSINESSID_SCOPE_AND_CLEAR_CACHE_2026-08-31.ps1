$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "MELO Web Direct Chat businessId Scope Fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

node .\MELO_FIX_DIRECTMINE_BUSINESSID_SCOPE_2026-08-31.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Patch failed. Cache was not changed." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Removing .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host ".next removed." -ForegroundColor Green
} else {
    Write-Host ".next not found; nothing to remove." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Patch complete." -ForegroundColor Green
Write-Host "Run: npm run build"
