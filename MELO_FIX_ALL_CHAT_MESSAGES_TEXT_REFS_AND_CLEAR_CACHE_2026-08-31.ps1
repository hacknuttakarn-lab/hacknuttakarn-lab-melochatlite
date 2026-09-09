param(
  [string]$AndroidRoot = "D:\project\melochat-main",
  [string]$BodyColumn = ""
)
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "MELO Web FULL chat_messages schema parity fix" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

node .\MELO_FIX_ALL_CHAT_MESSAGES_TEXT_REFS_2026-08-31.cjs "$AndroidRoot" "$BodyColumn"
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Patch/verification stopped. Read the messages above." -ForegroundColor Red
    exit $LASTEXITCODE
}

if (Test-Path ".next") {
  Write-Host ""
  Write-Host "Removing .next..." -ForegroundColor Yellow
  Remove-Item -Recurse -Force ".next"
  Write-Host ".next removed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Completed. Next command: npm run build" -ForegroundColor Green
