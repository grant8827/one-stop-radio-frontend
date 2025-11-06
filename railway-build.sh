#!/bin/bash
# Railway-optimized build script for OneStopRadio Frontend
# Handles Docker cache mount conflicts

set -e

echo "🚀 Starting Railway frontend build process..."
echo "📦 Node version: $(node --version)"
echo "📦 npm version: $(npm --version)"

# Clean any problematic cache directories
echo "🧹 Cleaning cache directories..."
rm -rf node_modules/.cache || true
rm -rf .cache || true

# Set npm cache to a different location to avoid conflicts
export npm_config_cache=/tmp/npm-cache
mkdir -p /tmp/npm-cache

echo "📥 Installing dependencies with clean cache..."
npm ci --prefer-offline --no-audit --progress=false

echo "🔨 Building React application..."
npm run build

echo "✅ Frontend build completed successfully!"
echo "📄 Build directory contents:"
ls -la build/ || echo "No build directory found"

# Verify critical files exist
if [ -f "build/index.html" ]; then
    echo "✅ index.html found"
else
    echo "❌ index.html not found!"
    exit 1
fi

if [ -d "build/static" ]; then
    echo "✅ static assets found"
else
    echo "❌ static assets directory not found!"
    exit 1
fi

echo "🎉 Build verification complete!"