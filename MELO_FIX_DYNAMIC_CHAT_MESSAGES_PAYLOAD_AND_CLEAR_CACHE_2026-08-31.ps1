$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "MELO Web dynamic chat_messages payload fix" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

node .\MELO_FIX_DYNAMIC_CHAT_MESSAGES_PAYLOAD_2026-08-31.cjs
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Patch stopped. .next was NOT touched." -ForegroundColor Red
  exit $LASTEXITCODE
}

if (Test-Path ".next") {
  Write-Host ""
  Write-Host "Removing .next..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force ".next"
  Write-Host ".next removed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host "Because /passport currently has an unrelated production-build error,"
Write-Host "test Chat first with:"
Write-Host "npm run dev"
