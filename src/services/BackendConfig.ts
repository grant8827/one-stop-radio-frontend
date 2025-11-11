/**
 * OneStopRadio Backend Configuration
 * Centralized configuration for all backend services (Node.js, Python FastAPI, C++)
 */

// Backend service configuration
export interface BackendServiceConfig {
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'ws' | 'wss';
  basePath: string;
}

// Environment-based configuration
// const isDevelopment = process.env.NODE_ENV === 'development';

export const BACKEND_CONFIG = {
  // Node.js Signaling Service (Real-time coordination & streaming management)
  SIGNALING: {
    NAME: 'Node.js Signaling Service',
    HTTP_PORT: 5001,
    WS_PORT: 5001,
    BASE_URL: process.env.REACT_APP_SIGNALING_URL || 'http://localhost:5001',
    WS_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:5001',
    ENDPOINTS: {
      // Health check
      HEALTH: '/api/health',
      
      // Audio streaming coordination
      AUDIO_STATUS: '/api/audio/stream/status',
      AUDIO_CONNECT: '/api/audio/stream/connect',
      AUDIO_DISCONNECT: '/api/audio/stream/disconnect', 
      AUDIO_START: '/api/audio/stream/start',
      AUDIO_STOP: '/api/audio/stream/stop',
      AUDIO_METADATA: '/api/audio/stream/metadata',
      
      // Video streaming coordination
      VIDEO_STATUS: '/api/video/status',
      VIDEO_STATS: '/api/video/stats',
      VIDEO_CAMERA_ON: '/api/video/camera/on',
      VIDEO_CAMERA_OFF: '/api/video/camera/off',
      VIDEO_CAMERA_SETTINGS: '/api/video/camera/settings',
      VIDEO_IMAGE: '/api/video/image',
      VIDEO_SLIDESHOW_START: '/api/video/slideshow/start',
      VIDEO_SLIDESHOW_STOP: '/api/video/slideshow/stop',
      VIDEO_STREAM_START: '/api/video/stream/start',
      VIDEO_STREAM_STOP: '/api/video/stream/stop',
      VIDEO_OVERLAY_TEXT: '/api/video/overlay/text',
      VIDEO_OVERLAY_CLEAR: '/api/video/overlay/clear',
      
      // Social media streaming
      VIDEO_STREAM_PLATFORM: '/api/video/stream',
      VIDEO_RTMP_ADD: '/api/video/rtmp/add',
      VIDEO_RTMP_REMOVE: '/api/video/rtmp',
      
      // Station data (temporary until Python API ready)
      STATION_INFO: '/api/v1/stations/me',
      STREAM_HISTORY: '/api/v1/streams/history',
      
      // WebSocket events
      WS_LISTENER_UPDATE: 'listener_count',
      WS_CHAT_MESSAGE: 'chat_message', 
      WS_STREAM_STATUS: 'stream_status',
      WS_MEDIA_STATS: 'media_stats'
    }
  },

  // Python FastAPI Service (Authentication & Data Management)
  FASTAPI: {
    NAME: 'Python FastAPI Server',
    PORT: 8002,
    BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002',
    ENDPOINTS: {
      // Health check
      HEALTH: '/api/health',
      
      // Authentication
      LOGIN: '/api/v1/auth/login',
      PROFILE: '/api/v1/user/profile',
      
      // Station management
      STATIONS_ME: '/api/v1/stations/me',
      STATIONS_UPDATE: '/api/v1/stations/me',
      
      // Stream history
      STREAMS_HISTORY: '/api/v1/streams/history'
    }
  },

  // C++ Media Server (Audio/Video Processing & Streaming Engine)
  MEDIA: {
    NAME: 'C++ Media Server',
    PORT: 8082,
    BASE_URL: process.env.REACT_APP_MEDIA_SERVER_URL || 'http://localhost:8082',
    WEBRTC_URL: process.env.REACT_APP_CPP_WEBRTC_URL || 'ws://localhost:8081',
    ENDPOINTS: {
      // Health check
      HEALTH: '/api/health',
      STATS: '/api/stats',
      
      // DJ Mixer controls
      MIXER_STATUS: '/api/mixer/status',
      MIXER_CROSSFADER: '/api/mixer/crossfader',
      MIXER_CHANNEL_VOLUME: '/api/mixer/channel/{id}/volume',
      MIXER_CHANNEL_EQ: '/api/mixer/channel/{id}/eq',
      MIXER_CHANNEL_PLAYBACK: '/api/mixer/channel/{id}/playback',
      MIXER_CHANNEL_LOAD: '/api/mixer/channel/{id}/load',
      MIXER_MASTER_VOLUME: '/api/mixer/master/volume',
      MIXER_CUE: '/api/mixer/cue',
      
      // Microphone controls (Enhanced Master & Mic Controls)
      MIC_TOGGLE: '/api/mixer/microphone/toggle',
      MIC_START: '/api/mixer/microphone/start',
      MIC_STOP: '/api/mixer/microphone/stop',
      MIC_MUTE: '/api/mixer/microphone/mute',
      MIC_SET_GAIN: '/api/mixer/microphone/gain',
      MIC_STATUS: '/api/mixer/microphone/status',
      
      // Audio device management
      AUDIO_DEVICES: '/api/audio/devices',
      AUDIO_DEVICE_SET: '/api/audio/devices/set',
      AUDIO_LEVELS: '/api/audio/levels',
      
      // WebRTC capture & signaling
      WEBRTC_OFFER: '/webrtc/offer',
      WEBRTC_ANSWER: '/webrtc/answer',
      WEBRTC_CANDIDATE: '/webrtc/candidate',
      WEBRTC_START_CAPTURE: '/webrtc/capture/start',
      WEBRTC_STOP_CAPTURE: '/webrtc/capture/stop',
      
      // Audio encoding & output
      ENCODER_STATUS: '/api/encoder/status',
      ENCODER_START: '/api/encoder/start',
      ENCODER_STOP: '/api/encoder/stop',
      ENCODER_SETTINGS: '/api/encoder/settings',
      
      // Video processing & encoding  
      VIDEO_START_STREAM: '/api/video/stream/start',
      VIDEO_STOP_STREAM: '/api/video/stream/stop',
      VIDEO_SET_SOURCE: '/api/video/source',
      VIDEO_ADD_OVERLAY: '/api/video/overlay/add',
      VIDEO_REMOVE_OVERLAY: '/api/video/overlay/remove',
      
      // RTMP distribution to social platforms
      RTMP_ADD_TARGET: '/api/rtmp/targets',
      RTMP_REMOVE_TARGET: '/api/rtmp/targets/{id}',
      RTMP_LIST_TARGETS: '/api/rtmp/targets',
      RTMP_START_STREAM: '/api/rtmp/stream/start',
      RTMP_STOP_STREAM: '/api/rtmp/stream/stop',
      RTMP_STATS: '/api/rtmp/stats'
    }
  }
} as const;

/**
 * Service type definitions
 */
export type ServiceType = keyof typeof BACKEND_CONFIG;

/**
 * Get the full URL for a backend service endpoint
 */
export const getServiceUrl = (service: ServiceType, endpoint?: string): string => {
  const config = BACKEND_CONFIG[service];
  const baseUrl = config.BASE_URL;
  
  if (!endpoint) return baseUrl;
  
  // Handle prefixed endpoints for API service
  if (service === 'FASTAPI' && !endpoint.startsWith('/api/')) {
    return `${baseUrl}/api${endpoint}`;
  }
  
  return `${baseUrl}${endpoint}`;
};

/**
 * Get WebSocket URL for real-time connections
 */
export const getWebSocketUrl = (path: string = ''): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_CONFIG.SIGNALING.WS_URL}${cleanPath}`;
};

/**
 * Check if a backend service is available
 */
export const isServiceAvailable = async (service: ServiceType): Promise<boolean> => {
  try {
    const config = BACKEND_CONFIG[service];
    const healthEndpoint = config.ENDPOINTS.HEALTH;
    const response = await fetch(`${config.BASE_URL}${healthEndpoint}`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    
    return response.ok;
  } catch (error) {
    // Only log once per service to reduce spam
    if (!(window as any).serviceErrorLogged) (window as any).serviceErrorLogged = {};
    if (!(window as any).serviceErrorLogged[service]) {
      console.log(`⚠️ Service ${service} offline - using fallback mode`);
      (window as any).serviceErrorLogged[service] = true;
    }
    
    return false;
  }
};

/**
 * Service status interface
 */
export interface ServiceStatus {
  service: ServiceType;
  status: 'online' | 'offline' | 'error';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
  version?: string;
}

/**
 * API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * Stream status interface 
 */
export interface StreamStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error';
  statusMessage: string;
  connectedTime: number;
  bytesSent: number;
  currentBitrate: number;
  peakLevelLeft: number;
  peakLevelRight: number;
  currentListeners: number;
  reconnectCount: number;
  startTime?: number;
}

/**
 * Video status interface
 */
export interface VideoStatus {
  video_source: 'off' | 'camera' | 'image' | 'slideshow';
  camera: {
    enabled: boolean;
    device_id: string | null;
    resolution: { width: number; height: number };
    fps: number;
    status: 'idle' | 'active';
  };
  streaming: {
    is_live: boolean;
    platforms: string[];
    custom_rtmp: string[];
    uptime: number;
  };
}

/**
 * Development configuration
 */
export const DEV_CONFIG = {
  // Health check timeout (ms)
  HEALTH_CHECK_TIMEOUT: 3000,
  
  // Retry configuration
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Service priorities (fallback order)
  SERVICE_FALLBACKS: {
    // If Python API is down, use Node.js for auth temporarily
    AUTH: ['API', 'SIGNALING'] as ServiceType[],
    
    // If C++ media server is down, use basic controls
    AUDIO_PROCESSING: ['MEDIA', 'SIGNALING'] as ServiceType[],
    
    // If WebRTC server is down, disable advanced features
    MEDIA_CAPTURE: ['MEDIA'] as ServiceType[]
  }
} as const;

/**
 * WebSocket event types for real-time communication
 */
export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Audio events
  AUDIO_LEVEL_UPDATE: 'audio_level_update',
  MIXER_STATE_CHANGE: 'mixer_state_change',
  MICROPHONE_STATE_CHANGE: 'microphone_state_change',
  
  // Streaming events
  STREAM_STATUS_CHANGE: 'stream_status_change',
  LISTENER_COUNT_UPDATE: 'listener_count_update',
  METADATA_UPDATE: 'metadata_update',
  
  // Video events
  VIDEO_SOURCE_CHANGE: 'video_source_change',
  VIDEO_STREAM_STATUS: 'video_stream_status',
  
  // Chat and social events
  CHAT_MESSAGE: 'chat_message',
  USER_JOIN: 'user_join',
  USER_LEAVE: 'user_leave'
} as const;

export default BACKEND_CONFIG;