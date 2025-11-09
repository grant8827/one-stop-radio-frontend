#!/bin/sh

# Build script with error handling and debugging
set -e

echo "🔨 Starting React build process..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Check available memory (important for React builds)
echo "System info:"
free -h 2>/dev/null || echo "Memory info not available"

# Clear any previous build
echo "🧹 Cleaning previous build..."
rm -rf build/ || true

# Set environment variables for optimal build
export NODE_ENV=production
export GENERATE_SOURCEMAP=false
export CI=true
export NODE_OPTIONS="--max_old_space_size=4096"

# Verify source files
echo "📁 Verifying source files..."
if [ ! -f "src/index.tsx" ]; then
  echo "❌ src/index.tsx not found"
  exit 1
fi

if [ ! -f "public/index.html" ]; then
  echo "❌ public/index.html not found"
  exit 1
fi

echo "✅ Source files verified"

# Run the build with enhanced error reporting
echo "🚀 Building React application..."
npm run build 2>&1 | tee build.log

# Verify build output
if [ ! -d "build" ]; then
  echo "❌ Build directory not created"
  echo "Build log:"
  cat build.log || echo "No build log available"
  exit 1
fi

if [ ! -f "build/index.html" ]; then
  echo "❌ build/index.html not found"
  ls -la build/ || echo "Build directory is empty"
  exit 1
fi

# Show build stats
echo "📊 Build completed successfully!"
echo "Build directory contents:"
ls -lah build/
echo "Build size:"
du -sh build/

echo "✅ Build process completed successfully"