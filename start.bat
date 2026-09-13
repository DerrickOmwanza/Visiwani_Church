@echo off
REM Visiwani SDA Church Books - Windows launcher
REM Double-click this file to start the church books system.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Node.js was not found on this computer.
    echo Please install it from https://nodejs.org (choose the LTS version), then run this file again.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing required components. This only happens once and may take a few minutes...
    call npm install
)

echo.
echo Starting Visiwani SDA Church Books...
echo Once you see "running at http://localhost:3000", open that address in your browser.
echo Keep this window open while you use the system. Close it to stop the system.
echo.

start "" http://localhost:3000
node server/index.js

pause
