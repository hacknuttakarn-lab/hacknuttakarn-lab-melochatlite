param(
  [string]$AndroidRoot = "D:\project\melochat-main"
)
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "MELO Web chat_messages Android parity fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

node .\MELO_FIX_CHAT_MESSAGE_COLUMN_FROM_ANDROID_2026-08-31.cjs "$AndroidRoot"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Patch stopped. .next was NOT touched." -ForegroundColor Red
    exit $LASTEXITCODE
}

if (Test-Path ".next") {
    Write-Host ""
    Write-Host "Removing .next cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next"
    Write-Host ".next removed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Run: npm run build" -ForegroundColor Green
