/**
 * OneStopRadio Backend Integration Service
 * Centralized service for managing connections to all backend services
 */

import { BACKEND_CONFIG, getServiceUrl, isServiceAvailable, type ServiceType, type ApiResponse, type StreamStatus, type VideoStatus, type ServiceStatus } from './BackendConfig';

/**
 * Microphone control interface for C++ Media Server
 */
export interface MicrophoneControls {
  isEnabled: boolean;
  isActive: boolean;
  isMuted: boolean;
  gain: number;
}

/**
 * Audio device interface
 */
export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
  isDefault: boolean;
}

/**
 * Mixer state interface  
 */
export interface MixerState {
  masterVolume: number;
  crossfader: number;
  channelA: {
    volume: number;
    bass: number;
    mid: number;
    treble: number;
  };
  channelB: {
    volume: number;
    bass: number;
    mid: number;
    treble: number;
  };
  microphone: MicrophoneControls;
  levels: {
    left: number;
    right: number;
  };
}

/**
 * Station data interface
 */
export interface StationData {
  id: string;
  userId: string;
  name: string;
  description: string;
  genre: string;
  logo: string | null;
  coverImage: string | null;
  socialLinks: {
    youtube?: string;
    twitch?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  settings: {
    isPublic: boolean;
    allowChat: boolean;
    autoRecord: boolean;
    maxBitrate: number;
  };
  stats: {
    totalListeners: number;
    peakListeners: number;
    totalHours: number;
    createdAt: Date;
    lastStream: Date | null;
  };
}

/**
 * Main Backend Integration Service Class
 */
class BackendIntegrationService {
  private webSocket: WebSocket | null = null;
  private serviceStatuses: Map<ServiceType, ServiceStatus> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor() {
    this.initializeServices();
  }

  /**
   * Initialize all backend services
   */
  private async initializeServices(): Promise<void> {
    console.log('🔄 Initializing OneStopRadio backend services...');
    
    // Check service availability
    await this.checkAllServices();
    
    // Initialize WebSocket connection
    this.initializeWebSocket();
    
    // Start service health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Check availability of all backend services
   */
  private async checkAllServices(): Promise<void> {
    const services: ServiceType[] = ['SIGNALING', 'API', 'MEDIA'];
    
    for (const service of services) {
      try {
        const available = await isServiceAvailable(service);
        this.serviceStatuses.set(service, {
          service,
          status: available ? 'online' : 'offline',
          lastCheck: new Date()
        });
        
        console.log(`${available ? '✅' : '❌'} ${BACKEND_CONFIG[service].BASE_URL}`);
      } catch (error) {
        console.error(`❌ Error checking ${service}:`, error);
        this.serviceStatuses.set(service, {
          service,
          status: 'error',
          lastCheck: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  private initializeWebSocket(): void {
    try {
      const wsUrl = BACKEND_CONFIG.SIGNALING.WS_URL;
      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log('🔌 WebSocket connected to Node.js signaling service');
        this.reconnectAttempts = 0;
      };

      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.webSocket.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.webSocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    const { type, payload } = data;
    
    switch (type) {
      case 'listener_count':
        // Update listener count in UI
        window.dispatchEvent(new CustomEvent('listenerCountUpdate', { detail: payload }));
        break;
        
      case 'stream_status':
        // Update stream status in UI
        window.dispatchEvent(new CustomEvent('streamStatusUpdate', { detail: payload }));
        break;
        
      case 'audio_levels':
        // Update audio levels in real-time
        window.dispatchEvent(new CustomEvent('audioLevelsUpdate', { detail: payload }));
        break;
        
      case 'chat_message':
        // Handle chat messages
        window.dispatchEvent(new CustomEvent('chatMessage', { detail: payload }));
        break;
        
      default:
        console.log('📡 Unknown WebSocket message type:', type);
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`🔄 Reconnecting WebSocket in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.initializeWebSocket();
      }, delay);
    } else {
      console.error('❌ Max WebSocket reconnection attempts reached');
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.checkAllServices();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get service status
   */
  public getServiceStatus(service: ServiceType): ServiceStatus | undefined {
    return this.serviceStatuses.get(service);
  }

  /**
   * Get all service statuses
   */
  public getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  // ===========================================
  // NODE.JS SIGNALING SERVICE METHODS
  // ===========================================

  /**
   * Get audio stream status from Node.js service
   */
  public async getAudioStreamStatus(): Promise<StreamStatus | null> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.AUDIO_STATUS);
      const response = await fetch(url);
      const data: ApiResponse<{ stats: StreamStatus }> = await response.json();
      
      return data.success ? data.data?.stats || null : null;
    } catch (error) {
      console.error('❌ Error getting audio stream status:', error);
      return null;
    }
  }

  /**
   * Connect to audio stream server
   */
  public async connectAudioStream(config: {
    serverHost: string;
    serverPort: number;
    password: string;
    mountPoint?: string;
    codec?: string;
    bitrate?: number;
  }): Promise<boolean> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.AUDIO_CONNECT);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Error connecting audio stream:', error);
      return false;
    }
  }

  /**
   * Start audio streaming
   */
  public async startAudioStreaming(): Promise<boolean> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.AUDIO_START);
      const response = await fetch(url, { method: 'POST' });
      const data: ApiResponse = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('❌ Error starting audio stream:', error);
      return false;
    }
  }

  /**
   * Stop audio streaming
   */
  public async stopAudioStreaming(): Promise<boolean> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.AUDIO_STOP);
      const response = await fetch(url, { method: 'POST' });
      const data: ApiResponse = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('❌ Error stopping audio stream:', error);
      return false;
    }
  }

  /**
   * Get video streaming status
   */
  public async getVideoStatus(): Promise<VideoStatus | null> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.VIDEO_STATUS);
      const response = await fetch(url);
      const data = await response.json();
      
      return data.success ? data : null;
    } catch (error) {
      console.error('❌ Error getting video status:', error);
      return null;
    }
  }

  /**
   * Enable camera for video streaming
   */
  public async enableCamera(): Promise<boolean> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.VIDEO_CAMERA_ON);
      const response = await fetch(url, { method: 'POST' });
      const data: ApiResponse = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('❌ Error enabling camera:', error);
      return false;
    }
  }

  /**
   * Get station information (temporary from Node.js until Python API ready)
   */
  public async getStationInfo(): Promise<StationData | null> {
    try {
      const url = getServiceUrl('SIGNALING', BACKEND_CONFIG.SIGNALING.ENDPOINTS.STATION_INFO);
      const response = await fetch(url);
      const data = await response.json();
      
      return data || null;
    } catch (error) {
      console.error('❌ Error getting station info:', error);
      return null;
    }
  }

  // ===========================================
  // PYTHON FASTAPI SERVICE METHODS
  // ===========================================

  /**
   * Login user
   */
  public async login(email: string, password: string): Promise<{ token: string; user: any } | null> {
    try {
      const url = getServiceUrl('API', BACKEND_CONFIG.API.ENDPOINTS.LOGIN);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('❌ Error logging in:', error);
      return null;
    }
  }

  /**
   * Get user profile
   */
  public async getUserProfile(token: string): Promise<any | null> {
    try {
      const url = getServiceUrl('API', BACKEND_CONFIG.API.ENDPOINTS.PROFILE);
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('❌ Error getting user profile:', error);
      return null;
    }
  }

  // ===========================================
  // C++ MEDIA SERVER METHODS
  // ===========================================

  /**
   * Get mixer status from C++ media server
   */
  public async getMixerStatus(): Promise<MixerState | null> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIXER_STATUS);
      const response = await fetch(url);
      const data: ApiResponse<MixerState> = await response.json();
      
      return data.success ? data.data || null : null;
    } catch (error) {
      console.error('❌ Error getting mixer status:', error);
      return null;
    }
  }

  /**
   * Toggle microphone on/off
   */
  public async toggleMicrophone(enabled: boolean): Promise<boolean> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIC_TOGGLE);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      return false;
    }
  }

  /**
   * Start microphone with updated Node.js signaling server integration
   */
  public async startMicrophone(gain: number = 70.0, deviceId?: string): Promise<boolean> {
    try {
      // Try Node.js signaling server first (updated)
      if (await isServiceAvailable('SIGNALING')) {
        const url = getServiceUrl('SIGNALING', '/api/audio/microphone/start');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gain, device_id: deviceId })
        });
        
        if (response.ok) {
          const data: ApiResponse = await response.json();
          console.log('🎤 Microphone started via Node.js signaling server');
          return data.success;
        }
      }
      
      // Fallback to C++ Media Server
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIC_START);
      const response = await fetch(url, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gain, device_id: deviceId })
      });
      const data: ApiResponse = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('❌ Error starting microphone:', error);
      return false;
    }
  }

  /**
   * Stop microphone with updated Node.js signaling server integration
   */
  public async stopMicrophone(): Promise<boolean> {
    try {
      // Try Node.js signaling server first (updated)
      if (await isServiceAvailable('SIGNALING')) {
        const url = getServiceUrl('SIGNALING', '/api/audio/microphone/stop');
        const response = await fetch(url, { method: 'POST' });
        
        if (response.ok) {
          const data: ApiResponse = await response.json();
          console.log('🎤 Microphone stopped via Node.js signaling server');
          return data.success;
        }
      }
      
      // Fallback to C++ Media Server
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIC_STOP);
      const response = await fetch(url, { method: 'POST' });
      const data: ApiResponse = await response.json();
      
      return data.success;
    } catch (error) {
      console.error('❌ Error stopping microphone:', error);
      return false;
    }
  }

  /**
   * Mute/unmute microphone
   */
  public async muteMicrophone(muted: boolean): Promise<boolean> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIC_MUTE);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted })
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Error muting microphone:', error);
      return false;
    }
  }

  /**
   * Set microphone gain with updated Node.js signaling server integration
   */
  public async setMicrophoneGain(gain: number): Promise<boolean> {
    try {
      // Try Node.js signaling server first (updated)
      if (await isServiceAvailable('SIGNALING')) {
        const url = getServiceUrl('SIGNALING', '/api/audio/microphone/gain');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gain })
        });
        
        if (response.ok) {
          const data: ApiResponse = await response.json();
          console.log(`🎤 Microphone gain set to ${gain}% via Node.js signaling server`);
          return data.success;
        }
      }
      
      // Fallback to C++ Media Server
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIC_SET_GAIN);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gain })
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Error setting microphone gain:', error);
      return false;
    }
  }

  /**
   * Enable talkover mode
   */
  public async enableTalkover(duckLevel: number = 25.0, fadeTime: number = 0.1): Promise<boolean> {
    try {
      // Try Node.js signaling server first
      if (await isServiceAvailable('SIGNALING')) {
        const url = getServiceUrl('SIGNALING', '/api/audio/talkover/enable');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duck_level: duckLevel, fade_time: fadeTime })
        });
        
        if (response.ok) {
          const data: ApiResponse = await response.json();
          console.log(`🎤 Talkover enabled via Node.js signaling server (duck to ${duckLevel}%)`);
          return data.success;
        }
      }
      
      console.warn('⚠️ Talkover not supported by C++ Media Server - using Node.js fallback only');
      return false;
    } catch (error) {
      console.error('❌ Error enabling talkover:', error);
      return false;
    }
  }

  /**
   * Disable talkover mode
   */
  public async disableTalkover(): Promise<boolean> {
    try {
      // Try Node.js signaling server first
      if (await isServiceAvailable('SIGNALING')) {
        const url = getServiceUrl('SIGNALING', '/api/audio/talkover/disable');
        const response = await fetch(url, { method: 'POST' });
        
        if (response.ok) {
          const data: ApiResponse = await response.json();
          console.log('🎤 Talkover disabled via Node.js signaling server');
          return data.success;
        }
      }
      
      console.warn('⚠️ Talkover not supported by C++ Media Server - using Node.js fallback only');
      return false;
    } catch (error) {
      console.error('❌ Error disabling talkover:', error);
      return false;
    }
  }

  /**
   * Get audio system status including microphone and talkover
   */
  public async getAudioSystemStatus(): Promise<any> {
    try {
      // Try Node.js signaling server first
      if (await isServiceAvailable('SIGNALING')) {
        const url = getServiceUrl('SIGNALING', '/api/audio/system/status');
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🎛️ Audio system status retrieved from Node.js signaling server');
          return data.audio_system || null;
        }
      }
      
      console.warn('⚠️ Audio system status not available from backends');
      return null;
    } catch (error) {
      console.error('❌ Error getting audio system status:', error);
      return null;
    }
  }

  /**
   * Control channel playback (play/pause) with Node.js signaling server integration
   */
  public async setChannelPlayback(channelId: string, play: boolean): Promise<boolean> {
    try {
      // Try Node.js signaling server first (updated)
      if (await isServiceAvailable('SIGNALING')) {
        const action = play ? 'play' : 'stop';
        const url = getServiceUrl('SIGNALING', `/api/audio/channel/${channelId}/${action}`);
        const response = await fetch(url, { method: 'POST' });
        
        if (response.ok) {
          const data: ApiResponse = await response.json();
          console.log(`▶️ Channel ${channelId} ${play ? 'started' : 'stopped'} via Node.js signaling server`);
          return data.success;
        }
      }
      
      // Fallback to C++ Media Server
      const url = getServiceUrl('MEDIA', `/api/mixer/channel/${channelId}/playback`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ play })
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error(`❌ Error ${play ? 'starting' : 'stopping'} channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Load audio file to specific channel
   */
  public async loadChannelAudio(channelId: string, file: File): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('audio', file);
      
      const url = getServiceUrl('MEDIA', `/api/mixer/channel/${channelId}/load`);
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error(`❌ Error loading audio to channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Set master volume
   */
  public async setMasterVolume(volume: number): Promise<boolean> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIXER_MASTER_VOLUME);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume })
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Error setting master volume:', error);
      return false;
    }
  }

  /**
   * Set crossfader position
   */
  public async setCrossfader(position: number): Promise<boolean> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.MIXER_CROSSFADER);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position })
      });
      
      const data: ApiResponse = await response.json();
      return data.success;
    } catch (error) {
      console.error('❌ Error setting crossfader:', error);
      return false;
    }
  }

  /**
   * Get available audio devices
   */
  public async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.AUDIO_DEVICES);
      const response = await fetch(url);
      const data: ApiResponse<AudioDevice[]> = await response.json();
      
      return data.success ? data.data || [] : [];
    } catch (error) {
      console.error('❌ Error getting audio devices:', error);
      return [];
    }
  }

  /**
   * Start WebRTC capture
   */
  public async startWebRTCCapture(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit | null> {
    try {
      const url = getServiceUrl('MEDIA', BACKEND_CONFIG.MEDIA.ENDPOINTS.WEBRTC_OFFER);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer })
      });
      
      const data: ApiResponse<{ answer: RTCSessionDescriptionInit }> = await response.json();
      return data.success ? data.data?.answer || null : null;
    } catch (error) {
      console.error('❌ Error starting WebRTC capture:', error);
      return null;
    }
  }

  /**
   * Cleanup resources on component unmount
   */
  public cleanup(): void {
    if (this.webSocket) {
      this.webSocket.close();
      this.webSocket = null;
    }
  }
}

// Create singleton instance
export const backendService = new BackendIntegrationService();
export default backendService;