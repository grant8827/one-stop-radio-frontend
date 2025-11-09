#!/bin/sh

# Railway startup script for React frontend
# Ensures proper port binding and environment variable handling

echo "🚀 Starting OneStopRadio Frontend..."
echo "PORT: ${PORT:-3000}"
echo "NODE_ENV: ${NODE_ENV:-production}"

# Debug: Show some environment variables
echo "🔍 Environment Variables:"
echo "REACT_APP_API_BASE_URL: $REACT_APP_API_BASE_URL"
echo "REACT_APP_SIGNALING_URL: $REACT_APP_SIGNALING_URL"
echo "REACT_APP_AUDIO_URL: $REACT_APP_AUDIO_URL"

# Ensure build directory exists
if [ ! -d "build" ]; then
  echo "❌ Error: build directory not found!"
  ls -la
  exit 1
fi

# Check if serve is available
if ! command -v serve > /dev/null; then
  echo "❌ Error: serve command not found!"
  echo "Installing serve globally..."
  npm install -g serve
fi

echo "✅ Build directory found, starting server..."

# Show serve version for debugging
serve --version

# Start the server with correct flags
# -s: single page app mode (serves index.html for all routes)
# -p: port number
# serve automatically binds to 0.0.0.0 in production
exec serve -s build -p ${PORT:-3000}