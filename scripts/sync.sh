#!/usr/bin/env bash
# Copy the current www/ into the native iOS + Android projects and update plugins.
# The game is a single static file (www/index.html) — there is no build step.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "Installing dependencies first..."
  npm install
fi

npx cap sync
echo
echo "Synced www/ -> ios/ and android/."
echo "  Open Xcode:          npm run open:ios"
echo "  Open Android Studio: npm run open:android"
