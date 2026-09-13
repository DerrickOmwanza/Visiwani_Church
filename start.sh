#!/usr/bin/env bash
# Visiwani SDA Church Books - macOS/Linux launcher
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install it from https://nodejs.org (LTS version), then run this script again."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing required components. This only happens once..."
  npm install
fi

echo ""
echo "Starting Visiwani SDA Church Books..."
echo "Open http://localhost:3000 in your browser."
echo ""

node server/index.js
