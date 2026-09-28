#!/usr/bin/env bash
echo "===================================================="
echo " ☕ Starbucks® Smart Kiosk Server - Linux/macOS Launcher"
echo "===================================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -d "node_modules" ]; then
    echo "[1/2] Installing Node.js dependencies..."
    npm install
fi

echo "[2/2] Starting Starbucks Smart Kiosk HTTPS Server on Port 7001..."
npm start
