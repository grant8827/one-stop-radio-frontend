import { BACKEND_CONFIG } from './services/BackendConfig';

console.log('=== OneStopRadio Environment Variables Debug ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
console.log('REACT_APP_SIGNALING_URL:', process.env.REACT_APP_SIGNALING_URL);
console.log('REACT_APP_AUDIO_URL:', process.env.REACT_APP_AUDIO_URL);
console.log('REACT_APP_WS_URL:', process.env.REACT_APP_WS_URL);
console.log('REACT_APP_AUDIO_WS_URL:', process.env.REACT_APP_AUDIO_WS_URL);
console.log('=== Backend URLs that will be used ===');

console.log('API Base URL:', BACKEND_CONFIG.API.BASE_URL);
console.log('Signaling URL:', BACKEND_CONFIG.SIGNALING.BASE_URL);
console.log('Audio URL:', BACKEND_CONFIG.MEDIA.BASE_URL);
console.log('WebSocket URL:', BACKEND_CONFIG.SIGNALING.WS_URL);
console.log('Audio WebSocket URL:', BACKEND_CONFIG.MEDIA.WEBRTC_URL);

// Test if we can reach the backends
async function testBackends() {
  console.log('=== Testing Backend Connectivity ===');
  
  const backends = [
    { name: 'API', url: BACKEND_CONFIG.API.BASE_URL + '/api/health' },
    { name: 'Signaling', url: BACKEND_CONFIG.SIGNALING.BASE_URL + '/api/health' },
    { name: 'Audio', url: BACKEND_CONFIG.MEDIA.BASE_URL + '/api/health' }
  ];

  for (const backend of backends) {
    try {
      const response = await fetch(backend.url, { 
        method: 'GET',
        mode: 'cors',
        signal: AbortSignal.timeout(5000)
      });
      console.log(`✅ ${backend.name}: ${response.status} - ${backend.url}`);
    } catch (error) {
      console.log(`❌ ${backend.name}: ${error.message} - ${backend.url}`);
    }
  }
}

// Run the test when the app loads
setTimeout(testBackends, 1000);