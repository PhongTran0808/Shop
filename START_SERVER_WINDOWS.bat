@echo off
title Starbucks Smart Kiosk Server (HTTPS Port 7001)
color 0A
echo ====================================================
echo  Starbucks(R) Smart Kiosk Server - Windows Launcher
echo ====================================================
echo.

cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

if not exist "node_modules\" (
    echo [1/2] Installing Node.js dependencies...
    call npm install
    echo.
)

echo [2/2] Starting Starbucks Smart Kiosk HTTPS Server on Port 7001...
echo.
call npm start

pause
