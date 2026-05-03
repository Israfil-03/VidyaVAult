#!/bin/bash
# VidyaVault Azure App Service startup script
# This script ensures proper startup with debugging information

set -e

echo "================================"
echo "VidyaVault Backend Starting..."
echo "================================"
echo ""
echo "Environment:"
echo "  NODE_ENV: ${NODE_ENV:-not set}"
echo "  PORT: ${PORT:-not set}"
echo "  NODE_VERSION: $(node --version)"
echo "  NPM_VERSION: $(npm --version)"
echo ""

echo "Checking runtime dependencies..."
echo "  Database URL: ${DATABASE_URL:0:20}... ($([ -n "$DATABASE_URL" ] && echo "set" || echo "NOT SET"))"
echo "  JWT Secret: $([ -n "$JWT_SECRET" ] && echo "set" || echo "NOT SET")"
echo ""

echo "Checking application files..."
if [ -f "dist/server.js" ]; then
  echo "  ✓ dist/server.js found"
else
  echo "  ✗ ERROR: dist/server.js not found!"
  ls -la dist/ || echo "dist/ directory does not exist"
  exit 1
fi

echo ""
echo "Starting Node.js application..."
echo "  Command: node dist/server.js"
echo "================================"
echo ""

# Run the app
exec node dist/server.js
