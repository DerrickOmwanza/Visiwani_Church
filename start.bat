@echo off
setlocal enabledelayedexpansion

REM Visiwani SDA Church Books - Windows launcher
REM Double-click this file to start the church books system.
REM This window is meant to stay open. If it ever closes on its own,
REM check start-log.txt in this same folder for what happened.

cd /d "%~dp0"
echo Working folder: %cd%
echo.

echo %cd% | findstr /r "[&%%^!]" >nul
if not errorlevel 1 (
    echo WARNING: This folder's path contains a special character such as
    echo   & or %% or ^ or !
    echo Windows and npm can sometimes fail silently in folders like this.
    echo If anything below fails, the safest fix is to move this whole
    echo folder somewhere with a plain path, for example:
    echo   C:\VisiwaniChurchBooks
    echo and run start.bat again from there.
    echo.
)

where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js was not found on this computer.
    echo Please install it from https://nodejs.org ^(choose the LTS version^),
    echo then run this file again.
    echo.
    pause
    exit /b 1
)

echo Node.js found:
call node -v
echo.

if not exist "node_modules" (
    echo Installing required components. This only happens once and can take
    echo a few minutes - please wait...
    echo.
    call npm install > start-log.txt 2>&1
    if errorlevel 1 (
        echo ERROR: npm install failed. Last part of the error log:
        echo ----------------------------------------------------
        powershell -NoProfile -Command "Get-Content start-log.txt -Tail 40" 2>nul || more start-log.txt
        echo ----------------------------------------------------
        echo Full details were saved to start-log.txt in this folder.
        echo.
        pause
        exit /b 1
    )
    echo Installation complete.
    echo.
)

echo Starting Visiwani SDA Church Books...
echo Once you see "running at http://localhost:3000" below, open that
echo address in your web browser.
echo Keep this window open while you use the system. Close it to stop it.
echo.

start "" http://localhost:3000
node server/index.js
set NODE_EXIT_CODE=%errorlevel%

if not "%NODE_EXIT_CODE%"=="0" (
    echo.
    echo ERROR: The server stopped unexpectedly ^(exit code %NODE_EXIT_CODE%^).
    echo See any messages above for details.
)

echo.
echo Press any key to close this window...
pause >nul
