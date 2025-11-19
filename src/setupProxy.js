const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy FastAPI requests (auth, stations, streams) to FastAPI backend
  app.use(
    '/api/v1',
    createProxyMiddleware({
      target: 'http://localhost:8004',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('FastAPI Backend Proxy Error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          success: false,
          error: 'FastAPI Backend Connection Error: ' + err.message,
          service: 'FastAPI API (port 8004)'
        }));
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[FastAPI API] ${req.method} ${req.url} -> http://localhost:8004`);
      }
    })
  );

  // Proxy Node.js signaling requests to Node.js backend  
  app.use(
    ['/api/audio', '/api/video', '/api/session', '/api/listeners', '/api/chat', '/api/media', '/api/streaming', '/api/health', '/api/endpoints'],
    createProxyMiddleware({
      target: 'http://localhost:5001',
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
          service: 'Node.js Signaling (port 5001)'
        }));
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[Node.js API] ${req.method} ${req.url} -> http://localhost:5001`);
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