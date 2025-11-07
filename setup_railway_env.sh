#!/bin/bash

# Railway Environment Variables Setup for OneStopRadio Frontend
# Run this script to set all production environment variables in Railway

echo "🚂 Setting up Railway environment variables for OneStopRadio Frontend..."

# Core environment
railway variables set NODE_ENV=production
railway variables set REACT_APP_ENVIRONMENT=production
railway variables set REACT_APP_DEBUG=false
railway variables set REACT_APP_VERSION=1.0.0

# Backend Service URLs
railway variables set REACT_APP_API_BASE_URL=https://backend-fast-py-production.up.railway.app
railway variables set REACT_APP_SIGNALING_URL=https://one-stop-radio-backend-nd-production.up.railway.app
railway variables set REACT_APP_AUDIO_URL=https://one-stop-radio-backen-c-production.up.railway.app

# WebSocket URLs
railway variables set REACT_APP_WS_URL=wss://one-stop-radio-backend-nd-production.up.railway.app
railway variables set REACT_APP_AUDIO_WS_URL=wss://one-stop-radio-backen-c-production.up.railway.app

# Backend Connection Configuration
railway variables set REACT_APP_BACKEND_TIMEOUT=10000
railway variables set REACT_APP_RETRY_ATTEMPTS=3

# Feature Flags
railway variables set REACT_APP_ENABLE_VIDEO_STREAMING=true
railway variables set REACT_APP_ENABLE_WEBRTC=true
railway variables set REACT_APP_ENABLE_SOCIAL_MEDIA=true

# Audio/Streaming Configuration
railway variables set REACT_APP_MAX_UPLOAD_SIZE=52428800
railway variables set REACT_APP_SUPPORTED_FORMATS=mp3,wav,ogg,m4a,flac

# Logging Configuration
railway variables set REACT_APP_LOG_LEVEL=warn

# Build Optimization
railway variables set GENERATE_SOURCEMAP=false

echo "✅ Railway environment variables setup complete!"
echo "🔄 Railway will automatically redeploy your frontend with these variables."
echo ""
echo "📋 To verify the variables were set, run:"
echo "   railway variables"
echo ""
echo "🌐 Your frontend will be available at:"
echo "   https://one-stop-radio-frontend-production.up.railway.app"