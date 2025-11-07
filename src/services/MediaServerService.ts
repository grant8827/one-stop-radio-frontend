/**
 * MediaServerService - WebRTC connection to C++/FFmpeg media server
 * Handles stream ingestion, encoding, and distribution to social platforms
 */

export interface StreamConfig {
  video: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  };
  audio: {
    sampleRate: number;
    channels: number;
    bitrate: number;
  };
}

export interface SocialPlatform {
  id: string;
  name: 'youtube' | 'twitch' | 'facebook' | 'instagram';
  enabled: boolean;
  isActive: boolean;
  rtmpUrl: string;
  streamKey: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface StreamStats {
  viewers: number;
  duration: number;
  uptime: number;
  bitrate: number;
  latency: number;
  cpuUsage: number;
  quality: string;
  droppedFrames: number;
  bandwidth: number;
}

class MediaServerService {
  private peerConnection: RTCPeerConnection | null = null;
  private mediaStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingUrl = `${process.env.REACT_APP_AUDIO_WS_URL || 'ws://localhost:8081'}/webrtc`; // C++/FFmpeg WebRTC endpoint
  private signalingSocket: WebSocket | null = null;
  
  private config: StreamConfig = {
    video: {
      width: 1920,
      height: 1080,
      frameRate: 30,
      bitrate: 2500000 // 2.5 Mbps
    },
    audio: {
      sampleRate: 48000,
      channels: 2,
      bitrate: 128000 // 128 kbps
    }
  };

  private socialPlatforms: Map<string, SocialPlatform> = new Map();
  private streamStats: StreamStats = {
    viewers: 0,
    duration: 0,
    uptime: 0,
    bitrate: 0,
    latency: 0,
    cpuUsage: 0,
    quality: 'HD',
    droppedFrames: 0,
    bandwidth: 0
  };

  private statsInterval: NodeJS.Timeout | null = null;
  private isStreaming = false;

  /**
   * Initialize WebRTC connection to media server
   */
  async initialize(): Promise<boolean> {
    try {
      // Configure WebRTC peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      // Set up event handlers
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage('ice-candidate', event.candidate);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', this.peerConnection?.connectionState);
        
        if (this.peerConnection?.connectionState === 'connected') {
          this.startStatsCollection();
        } else if (this.peerConnection?.connectionState === 'disconnected') {
          this.stopStatsCollection();
        }
      };

      // Create data channel for control messages
      this.dataChannel = this.peerConnection.createDataChannel('control', {
        ordered: true
      });

      this.dataChannel.onopen = () => {
        console.log('Data channel opened');
      };

      this.dataChannel.onmessage = (event) => {
        this.handleControlMessage(JSON.parse(event.data));
      };

      console.log('MediaServerService initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize MediaServerService:', error);
      return false;
    }
  }

  /**
   * Connect to media server signaling
   */
  async connectToMediaServer(): Promise<boolean> {
    try {
      this.signalingSocket = new WebSocket(this.signalingUrl);

      this.signalingSocket.onopen = () => {
        console.log('Connected to media server signaling');
        this.sendSignalingMessage('client-hello', {
          type: 'broadcaster',
          config: this.config
        });
      };

      this.signalingSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleSignalingMessage(message);
      };

      this.signalingSocket.onclose = () => {
        console.log('Disconnected from media server');
      };

      this.signalingSocket.onerror = (error) => {
        console.error('Media server signaling error:', error);
      };

      return true;
    } catch (error) {
      console.error('Failed to connect to media server:', error);
      return false;
    }
  }

  /**
   * Start streaming with audio encoding and optional video
   */
  async startStream(audioStream: MediaStream, videoStream?: MediaStream): Promise<boolean> {
    if (!this.peerConnection) {
      console.error('WebRTC not initialized');
      return false;
    }

    try {
      // Configure audio encoding parameters
      const audioSender = this.peerConnection.addTrack(audioStream.getAudioTracks()[0], audioStream);
      
      // Set up audio encoding parameters for high-quality streaming
      const audioParams = audioSender.getParameters();
      if (audioParams.encodings && audioParams.encodings.length > 0) {
        audioParams.encodings[0].maxBitrate = this.config.audio.bitrate;
        audioParams.encodings[0].priority = 'high';
        await audioSender.setParameters(audioParams);
      }

      // Add video tracks with encoding if available
      if (videoStream && videoStream.getVideoTracks().length > 0) {
        const videoSender = this.peerConnection.addTrack(videoStream.getVideoTracks()[0], videoStream);
        
        // Configure video encoding parameters
        const videoParams = videoSender.getParameters();
        if (videoParams.encodings && videoParams.encodings.length > 0) {
          videoParams.encodings[0].maxBitrate = this.config.video.bitrate;
          videoParams.encodings[0].maxFramerate = this.config.video.frameRate;
          videoParams.encodings[0].scaleResolutionDownBy = 1;
          await videoSender.setParameters(videoParams);
        }
      }

      // Combine streams for local reference
      const tracks: MediaStreamTrack[] = [];
      audioStream.getAudioTracks().forEach(track => tracks.push(track));
      if (videoStream) {
        videoStream.getVideoTracks().forEach(track => tracks.push(track));
      }
      this.mediaStream = new MediaStream(tracks);

      // Create and send offer to media server with codec preferences
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

      // Modify SDP for audio codec preferences (Opus for high quality)
      if (offer.sdp) {
        offer.sdp = this.optimizeAudioSDP(offer.sdp);
      }

      await this.peerConnection.setLocalDescription(offer);
      this.sendSignalingMessage('offer', offer);

      this.isStreaming = true;
      console.log('Stream started with audio encoding:', {
        audioBitrate: this.config.audio.bitrate,
        audioSampleRate: this.config.audio.sampleRate,
        hasVideo: !!videoStream
      });
      return true;
    } catch (error) {
      console.error('Failed to start stream:', error);
      return false;
    }
  }

  /**
   * Optimize SDP for high-quality audio encoding
   */
  private optimizeAudioSDP(sdp: string): string {
    // Prefer Opus codec for high-quality audio
    let optimizedSdp = sdp;

    // Set Opus parameters for radio-quality audio
    const opusParams = [
      'maxaveragebitrate=128000', // 128kbps
      'stereo=1',                 // Stereo audio
      'sprop-stereo=1',          // Signal stereo capability
      'cbr=1',                   // Constant bitrate for consistency
      'useinbandfec=1',          // Forward error correction
      'maxplaybackrate=48000'    // 48kHz sample rate
    ].join(';');

    // Add Opus configuration to SDP
    optimizedSdp = optimizedSdp.replace(
      /a=fmtp:111 /g,
      `a=fmtp:111 ${opusParams};`
    );

    // Prioritize Opus codec
    optimizedSdp = optimizedSdp.replace(
      /m=audio \d+ UDP\/TLS\/RTP\/SAVPF (.+)/,
      (match, codecs) => {
        const codecList = codecs.split(' ');
        const opusCodec = codecList.find((codec: string) => codec === '111'); // Opus typically uses payload type 111
        if (opusCodec) {
          const otherCodecs = codecList.filter((codec: string) => codec !== '111');
          const reorderedCodecs = [opusCodec, ...otherCodecs].join(' ');
          return match.replace(codecs, reorderedCodecs);
        }
        return match;
      }
    );

    return optimizedSdp;
  }

  /**
   * Start recording with encoding for file output
   */
  async startRecording(stream: MediaStream, options?: {
    mimeType?: string;
    audioBitsPerSecond?: number;
    filename?: string;
  }): Promise<boolean> {
    try {
      const recordingOptions: MediaRecorderOptions = {
        mimeType: options?.mimeType || 'audio/webm;codecs=opus',
        audioBitsPerSecond: options?.audioBitsPerSecond || this.config.audio.bitrate
      };

      const recorder = new MediaRecorder(stream, recordingOptions);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(chunks, { type: recordingOptions.mimeType });
        this.saveRecording(recordedBlob, options?.filename);
      };

      recorder.start(1000); // Record in 1-second chunks
      
      console.log('Recording started with encoding:', recordingOptions);
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Save recorded audio file
   */
  private saveRecording(blob: Blob, filename?: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `radio_recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Recording saved:', a.download);
  }

  /**
   * Stop streaming
   */
  async stopStream(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.stopStatsCollection();
    this.isStreaming = false;
    console.log('Stream stopped');
  }

  /**
   * Configure social media platforms
   */
  configureSocialPlatform(
    platform: 'youtube' | 'twitch' | 'facebook' | 'instagram',
    config: { rtmpUrl: string; streamKey: string; enabled: boolean }
  ): void {
    this.socialPlatforms.set(platform, {
      id: platform,
      name: platform,
      enabled: config.enabled,
      isActive: false,
      rtmpUrl: config.rtmpUrl,
      streamKey: config.streamKey,
      status: 'disconnected'
    });

    // Send configuration to media server
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'configure-platform',
        platform,
        config
      }));
    }
  }

  /**
   * Enable/disable social platform streaming
   */
  toggleSocialPlatform(platform: string, enabled: boolean): void {
    const platformConfig = this.socialPlatforms.get(platform);
    if (platformConfig) {
      platformConfig.enabled = enabled;
      
      if (this.dataChannel?.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({
          type: 'toggle-platform',
          platform,
          enabled
        }));
      }
    }
  }

  /**
   * Update stream quality settings
   */
  updateStreamConfig(config: Partial<StreamConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({
        type: 'update-config',
        config: this.config
      }));
    }
  }

  /**
   * Get current stream statistics
   */
  getStreamStats(): StreamStats {
    return { ...this.streamStats };
  }

  /**
   * Get social platform statuses
   */
  getSocialPlatforms(): SocialPlatform[] {
    return Array.from(this.socialPlatforms.values());
  }

  // ===== Private Methods =====

  /**
   * Send signaling message to media server
   */
  private sendSignalingMessage(type: string, data: any): void {
    if (this.signalingSocket?.readyState === WebSocket.OPEN) {
      this.signalingSocket.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * Handle signaling messages from media server
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'answer':
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(message.data);
        }
        break;

      case 'ice-candidate':
        if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(message.data);
        }
        break;

      case 'platform-status':
        this.updatePlatformStatus(message.data.platform, message.data.status);
        break;

      case 'stream-stats':
        this.updateStreamStats(message.data);
        break;

      default:
        console.log('Unknown signaling message:', message);
    }
  }

  /**
   * Handle control messages from media server
   */
  private handleControlMessage(message: any): void {
    switch (message.type) {
      case 'platform-connected':
        this.updatePlatformStatus(message.platform, 'connected');
        break;

      case 'platform-disconnected':
        this.updatePlatformStatus(message.platform, 'disconnected');
        break;

      case 'platform-error':
        this.updatePlatformStatus(message.platform, 'error');
        console.error(`Platform ${message.platform} error:`, message.error);
        break;

      case 'encoding-stats':
        this.updateStreamStats(message.stats);
        break;

      default:
        console.log('Unknown control message:', message);
    }
  }

  /**
   * Update social platform status
   */
  private updatePlatformStatus(platform: string, status: 'connected' | 'disconnected' | 'error'): void {
    const platformConfig = this.socialPlatforms.get(platform);
    if (platformConfig) {
      platformConfig.status = status;
      console.log(`Platform ${platform} status: ${status}`);
    }
  }

  /**
   * Update stream statistics
   */
  private updateStreamStats(stats: Partial<StreamStats>): void {
    this.streamStats = { ...this.streamStats, ...stats };
  }

  /**
   * Start collecting WebRTC statistics
   */
  private startStatsCollection(): void {
    this.statsInterval = setInterval(async () => {
      if (this.peerConnection) {
        const stats = await this.peerConnection.getStats();
        
        stats.forEach((report) => {
          if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
            this.streamStats.bitrate = report.bytesSent || 0;
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            this.streamStats.bandwidth = report.availableOutgoingBitrate || 0;
          }
        });
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Stop collecting statistics
   */
  private stopStatsCollection(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  // ===== Getters =====

  /**
   * Missing methods for DJInterface integration
   */
  async connect(): Promise<void> {
    if (!this.peerConnection) {
      await this.initialize();
    }
  }

  disconnect(): void {
    this.stopStream();
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  onStreamStats(callback: (stats: StreamStats) => void): void {
    // Set up periodic stats updates
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
    
    this.statsInterval = setInterval(() => {
      callback(this.streamStats);
    }, 1000);
  }

  async connectSocialPlatform(platformId: string): Promise<void> {
    const platform = this.socialPlatforms.get(platformId as any);
    if (platform) {
      platform.isActive = true;
      platform.status = 'connected';
    }
  }

  async disconnectSocialPlatform(platformId: string): Promise<void> {
    const platform = this.socialPlatforms.get(platformId as any);
    if (platform) {
      platform.isActive = false;
      platform.status = 'disconnected';
    }
  }

  get isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
  }

  get isStreamingActive(): boolean {
    return this.isStreaming;
  }

  get streamingConfig(): StreamConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const mediaServerService = new MediaServerService();
export default MediaServerService;