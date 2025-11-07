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

echo "✅ Build directory found, starting server..."

# Start the server with proper port binding
# Railway requires binding to 0.0.0.0 and using the PORT env var
exec serve -s build -l ${PORT:-3000} -H 0.0.0.0