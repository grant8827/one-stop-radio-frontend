const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy Django API requests (auth, stations, streams) to Django backend
  app.use(
    '/api/v1',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Django Backend Proxy Error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Django Backend Connection Error: ' + err.message,
          service: 'Django API (port 8001)'
        }));
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Django API] ${req.method} ${req.url} -> http://localhost:8001`);
      }
    })
  );

  // Proxy Node.js signaling requests to Node.js backend  
  app.use(
    ['/api/audio', '/api/video', '/api/session', '/api/listeners', '/api/chat', '/api/media', '/api/streaming', '/api/health', '/api/endpoints'],
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('Node.js Backend Proxy Error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          success: false,
          error: 'Node.js Backend Connection Error: ' + err.message,
          service: 'Node.js Signaling (port 5000)'
        }));
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Node.js API] ${req.method} ${req.url} -> http://localhost:5000`);
      }
    })
  );

  // Proxy C++ Media Server requests (WebRTC, encoding) to C++ backend
  app.use(
    ['/api/webrtc', '/api/mixer', '/api/rtmp', '/api/hls', '/api/dash', '/api/stats'],
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('C++ Backend Proxy Error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          success: false,
          error: 'C++ Backend Connection Error: ' + err.message,
          service: 'C++ Media Server (port 8080)'
        }));
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[C++ Media] ${req.method} ${req.url} -> http://localhost:8080`);
      }
    })
  );
  
  // Proxy WebSocket connections for WebRTC
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'ws://localhost:8081',
      ws: true,
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('WebSocket Proxy Error:', err.message);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[WebSocket] ${req.url} -> ws://localhost:8081`);
      }
    })
  );
};