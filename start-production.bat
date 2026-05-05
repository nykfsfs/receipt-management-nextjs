@echo off
setlocal EnableExtensions

rem ASCII-only: works with CMD default code page CP932 even if saved as UTF-8.
rem Prod: npm run build, then npm start. Override port: SET PORT=8080 before running.
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js and ensure npm is on PATH.
  exit /b 1
)

echo [1/2] npm run build ...
call npm run build
if errorlevel 1 (
  echo [ERROR] npm run build failed.
  exit /b 1
)

echo [2/2] npm start. Default PORT=3000.
echo     If EADDRINUSE: SET PORT=8080 ^& call this bat again, or TaskMgr end Node on 3000.
call npm start
exit /b %ERRORLEVEL%
