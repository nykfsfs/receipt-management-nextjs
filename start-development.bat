@echo off
setlocal EnableExtensions

rem ASCII-only: works with CMD default CP932 even if saved as UTF-8.
rem Dev server: npm run dev. Override port: SET PORT=3001 before running.
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js and ensure npm is on PATH.
  exit /b 1
)

echo npm run dev ... Default PORT=3000.
echo     If EADDRINUSE: SET PORT=3001 ^& call this bat again, or TaskMgr end Node on 3000.
call npm run dev
exit /b %ERRORLEVEL%
