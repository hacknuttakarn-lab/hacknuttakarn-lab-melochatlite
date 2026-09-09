@echo off
setlocal
echo.
echo MELO WEB - Chat role separation + Web/Android data parity audit
echo ==============================================================
echo.

node MELO_APPLY_WEB_CHAT_ROLE_SEPARATION_2026-08-31.cjs
set PATCH_RC=%ERRORLEVEL%

echo.
if "%~1"=="" (
  echo Android project path was not supplied.
  echo Run the audit separately, for example:
  echo node MELO_AUDIT_WEB_ANDROID_DATA_PARITY_2026-08-31.cjs "D:\project\melochat-main"
) else (
  node MELO_AUDIT_WEB_ANDROID_DATA_PARITY_2026-08-31.cjs "%~1"
)

echo.
echo Patch exit code: %PATCH_RC%
echo Next recommended command: npm run build
echo.
endlocal
