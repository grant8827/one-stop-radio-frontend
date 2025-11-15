/**
 * AudioService - Integrated Multi-Backend Audio Processing
 * Uses C++ Media Server, Node.js Signaling, and Web Audio API fallback
 */

import { backendService } from './BackendIntegrationService';

export interface AudioChannel {
  id: string;
  source: MediaStreamAudioSourceNode | null;
  gainNode: GainNode | null;
  bassFilter: BiquadFilterNode | null;
  midFilter: BiquadFilterNode | null;
  trebleFilter: BiquadFilterNode | null;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  audioBuffer: AudioBuffer | null;
  bufferSource: AudioBufferSourceNode | null;
  startTime: number; // When playback started (audioContext.currentTime)
  pausedAt: number; // Position when paused (in seconds)
  isLooping: boolean; // Whether track should loop
}

export interface StreamingConfig {
  sampleRate: number;
  bitRate: number;
  channels: number;
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private microphoneSource: MediaStreamAudioSourceNode | null = null;
  private microphoneGain: GainNode | null = null;
  private crossfaderGain: { a: GainNode | null; b: GainNode | null } = { a: null, b: null };
  
  // Channel management
  private channels: Map<string, AudioChannel> = new Map();
  
  // Streaming and encoding
  private mediaRecorder: MediaRecorder | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;
  private encodedChunks: Blob[] = [];
  private isRecording: boolean = false;
  
  // Backend integration - C++ Media Server
  private useBackendAudio: boolean = true; // Prefer C++ backend when available
  private backendAvailable: boolean = false;
  private backendLevels: { master?: any; microphone?: any } = {};
  private cppMediaServerUrl: string = process.env.REACT_APP_AUDIO_URL || 'http://localhost:8080'; // C++ media server endpoint
  private backendWebSocket: WebSocket | null = null;
  
  // Audio encoding configuration
  private encodingConfig = {
    mimeType: 'audio/webm;codecs=opus', // High-quality audio codec
    audioBitsPerSecond: 128000, // 128kbps - good quality for streaming
    sampleRate: 48000,
    channels: 2
  };
  
  /**
   * Initialize the audio context and check backend availability
   */
  async initialize(): Promise<boolean> {
    console.log('🎵 AudioService: Starting initialization...');
    
    // Check if already initialized
    if (this.audioContext && this.audioContext.state !== 'closed') {
      console.log('✅ AudioService already initialized');
      return true;
    }
    
    // First check if C++ backend is available (with timeout)
    try {
      await Promise.race([
        this.checkBackendAvailability(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Backend check timeout')), 1000))
      ]);
    } catch (error) {
      console.warn('⚠️ Backend availability check timed out, using Web Audio API');
      this.backendAvailable = false;
    }
    
    if (this.backendAvailable && this.useBackendAudio) {
      console.log('✅ Using C++ Media Server for professional audio processing');
      // Initialize real-time communication with C++ backend (non-blocking)
      setTimeout(() => this.initializeBackendConnection(), 100);
      return true;
    }
    
    // Fallback to Web Audio API
    console.log('⚠️ C++ Media Server not available, using Web Audio API fallback');
    return await this.initializeWebAudio();
  }

  /**
   * Check if C++ Media Server is available
   */
  private async checkBackendAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.cppMediaServerUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(800)
      });
      
      this.backendAvailable = response.ok;
      
      if (this.backendAvailable) {
        console.log('✅ C++ Media Server detected and online');
        // Get initial mixer status
        const mixerStatus = await backendService.getMixerStatus();
        if (mixerStatus) {
          console.log('✅ Mixer controls connected');
        }
      } else {
        console.log('ℹ️ C++ Media Server not available, will use Web Audio API');
      }
    } catch (error) {
      console.log('ℹ️ Error checking C++ Media Server availability:', error);
      this.backendAvailable = false;
    }
  }

  /**
   * Initialize real-time connection to C++ Media Server
   */
  private async initializeBackendConnection(): Promise<void> {
    try {
      // Connect to WebSocket for real-time audio level updates
      const wsUrl = `${(process.env.REACT_APP_AUDIO_WS_URL || 'ws://localhost:8081').replace('wss://', 'ws://').replace('ws://', 'ws://')}/ws/audio`;
      this.backendWebSocket = new WebSocket(wsUrl);
      
      this.backendWebSocket.onopen = () => {
        console.log('🔌 Connected to C++ Media Server WebSocket');
      };
      
      this.backendWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleBackendMessage(data);
        } catch (error) {
          console.error('Error parsing backend message:', error);
        }
      };
      
      this.backendWebSocket.onclose = () => {
        console.log('🔌 Disconnected from C++ Media Server WebSocket');
      };
      
      this.backendWebSocket.onerror = (error) => {
        console.error('C++ Media Server WebSocket error:', error);
      };
      
    } catch (error) {
      console.error('Failed to initialize backend connection:', error);
    }
  }

  /**
   * Handle messages from C++ Media Server
   */
  private handleBackendMessage(data: any): void {
    const { type, payload } = data;
    
    switch (type) {
      case 'audio_levels':
        this.backendLevels = payload;
        break;
        
      case 'mixer_state':
        // Update UI with mixer state changes
        window.dispatchEvent(new CustomEvent('mixerStateUpdate', { detail: payload }));
        break;
        
      case 'channel_loaded':
        // Notify that a channel has loaded audio
        window.dispatchEvent(new CustomEvent('channelLoaded', { detail: payload }));
        break;
        
      default:
        console.log('Unknown backend message type:', type);
    }
  }

  /**
   * Initialize Web Audio API (fallback)
   */
  private async initializeWebAudio(): Promise<boolean> {
    try {
      // Don't create a new context if one already exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log(`🎵 Created new AudioContext, state: ${this.audioContext.state}, sampleRate: ${this.audioContext.sampleRate}`);
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log(`🎵 AudioContext resumed, new state: ${this.audioContext.state}`);
      }

      // Create master gain and analyser
      this.masterGainNode = this.audioContext.createGain();
      this.masterAnalyser = this.audioContext.createAnalyser();
      this.streamDestination = this.audioContext.createMediaStreamDestination();

      // Create crossfader gains
      this.crossfaderGain.a = this.audioContext.createGain();
      this.crossfaderGain.b = this.audioContext.createGain();

      // Connect master chain
      this.crossfaderGain.a.connect(this.masterGainNode);
      this.crossfaderGain.b.connect(this.masterGainNode);
      this.masterGainNode.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.audioContext.destination);
      this.masterAnalyser.connect(this.streamDestination);

      // Set default master volume
      this.masterGainNode.gain.setValueAtTime(0.8, this.audioContext.currentTime); // 80% master volume
      
      // Set default crossfader values (center)
      this.crossfaderGain.a.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      this.crossfaderGain.b.gain.setValueAtTime(0.5, this.audioContext.currentTime);

      console.log('✅ Web Audio API initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web Audio API:', error);
      return false;
    }
  }

  /**
   * Ensure AudioService is initialized
   */
  private async ensureInitialized(): Promise<boolean> {
    if (!this.audioContext) {
      console.log('🎵 AudioService not initialized, initializing now...');
      return await this.initialize();
    }
    return true;
  }

  /**
   * Create a new audio channel
   */
  createChannel(channelId: string): AudioChannel | null {
    if (!this.audioContext) {
      console.error('❌ Cannot create channel: AudioContext not initialized');
      return null;
    }

    // Remove existing channel if it exists
    const existingChannel = this.channels.get(channelId);
    if (existingChannel) {
      console.log(`🔄 Removing existing channel ${channelId}`);
      try {
        existingChannel.gainNode?.disconnect();
        existingChannel.bassFilter?.disconnect();
        existingChannel.midFilter?.disconnect();
        existingChannel.trebleFilter?.disconnect();
        existingChannel.analyser?.disconnect();
      } catch (error) {
        console.warn(`Warning disconnecting existing channel ${channelId}:`, error);
      }
    }

    try {
      const gainNode = this.audioContext.createGain();
      const bassFilter = this.audioContext.createBiquadFilter();
      const midFilter = this.audioContext.createBiquadFilter();
      const trebleFilter = this.audioContext.createBiquadFilter();
      const analyser = this.audioContext.createAnalyser();

      // Configure filters
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.setValueAtTime(200, this.audioContext.currentTime);
      
      midFilter.type = 'peaking';
      midFilter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
      midFilter.Q.setValueAtTime(1, this.audioContext.currentTime);
      
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.setValueAtTime(3000, this.audioContext.currentTime);

      // Connect channel chain
      gainNode.connect(bassFilter);
      bassFilter.connect(midFilter);
      midFilter.connect(trebleFilter);
      trebleFilter.connect(analyser);

      // Connect to appropriate crossfader
      if (channelId === 'A') {
        analyser.connect(this.crossfaderGain.a!);
      } else {
        analyser.connect(this.crossfaderGain.b!);
      }

      const channel: AudioChannel = {
        id: channelId,
        source: null,
        gainNode,
        bassFilter,
        midFilter,
        trebleFilter,
        analyser,
        isPlaying: false,
        audioBuffer: null,
        bufferSource: null,
        startTime: 0,
        pausedAt: 0,
        isLooping: false
      };

      this.channels.set(channelId, channel);
      return channel;
    } catch (error) {
      console.error(`Failed to create channel ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Load audio file into channel - C++ Backend Integration
   */
  async loadAudioFile(channelId: string, file: File, trackInfo?: { 
    id?: string; 
    title?: string; 
    artist?: string; 
    duration?: number; 
    loadMethod?: 'double_click' | 'drag_drop' | 'button' | 'unknown' 
  }): Promise<{ success: boolean; duration?: number }> {
    const trackTitle = trackInfo?.title || file.name;
    const loadMethod = trackInfo?.loadMethod || 'unknown';
    
    console.log(`🎵 Loading audio file "${trackTitle}" into channel ${channelId} via ${loadMethod}`);

    // Try C++ backend first
    if (this.useBackendAudio) {
      try {
        // Create enhanced payload with track metadata for C++ backend
        const payload = {
          channel: channelId,
          filePath: `blob://${file.name}`, // Indicate this is a browser blob
          trackTitle: trackTitle,
          trackId: trackInfo?.id || `track-${Date.now()}`,
          artist: trackInfo?.artist || 'Unknown Artist',
          duration: trackInfo?.duration || 180,
          loadMethod: loadMethod,
          fileSize: file.size,
          fileType: file.type
        };
        
        const response = await fetch(`${this.cppMediaServerUrl}/api/radio/audio/load`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Audio file loaded into C++ backend channel ${channelId}`);
          this.backendAvailable = true;
          return { success: true, duration: result.duration || trackInfo?.duration };
        } else {
          console.warn(`⚠️ C++ backend failed: ${result.message}`);
          console.log('📱 Falling back to Web Audio API...');
        }
      } catch (error) {
        console.warn('⚠️ C++ backend not available:', error);
        console.log('📱 Falling back to Web Audio API...');
        this.backendAvailable = false;
      }
    }

    // Fallback to Web Audio API
    const initialized = await this.ensureInitialized();
    if (!initialized) {
      console.error('❌ Failed to initialize Web Audio API');
      return { success: false };
    }

    let channel = this.channels.get(channelId);
    if (!channel) {
      console.log(`📢 Channel ${channelId} not found, creating it...`);
      const newChannel = this.createChannel(channelId);
      if (!newChannel) {
        console.error(`❌ Failed to create channel ${channelId}`);
        return { success: false };
      }
      channel = newChannel;
    }

    if (!this.audioContext) {
      console.error('❌ AudioContext not available');
      return { success: false };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      channel.audioBuffer = audioBuffer;
      
      const actualDuration = audioBuffer.duration;
      console.log(`✅ Audio loaded into Web Audio channel ${channelId}: ${file.name} (Duration: ${actualDuration.toFixed(2)}s)`);
      return { success: true, duration: actualDuration };
    } catch (error) {
      console.error(`❌ Failed to load audio into channel ${channelId}:`, error);
      return { success: false };
    }
  }

  /**
   * Control channel playback via C++ backend
   */
  async setChannelPlayback(channelId: string, play: boolean): Promise<boolean> {
    if (this.backendAvailable) {
      try {
        const response = await fetch(`${this.cppMediaServerUrl}/api/radio/channel/play`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: channelId,
            play: play
          })
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`✅ Channel ${channelId} playback ${play ? 'started' : 'stopped'} via C++ backend`);
          return true;
        } else {
          console.warn(`⚠️ C++ backend playback control failed: ${result.message}`);
        }
      } catch (error) {
        console.warn('⚠️ C++ backend playback control error:', error);
      }
    }
    
    // Fallback to Web Audio API
    return this.toggleChannelPlayback(channelId);
  }

  /**
   * Set channel volume via C++ backend
   */
  async setChannelVolume(channelId: string, volume: number): Promise<boolean> {
    if (this.backendAvailable) {
      const success = await backendService.setChannelVolume(channelId, volume);
      if (success) return true;
    }
    
    // Fallback to Web Audio API
    const channel = this.channels.get(channelId);
    if (channel && channel.gainNode) {
      channel.gainNode.gain.value = volume / 100;
      return true;
    }
    
    return false;
  }

  /**
   * Stop channel playback completely
   */
  stopChannelPlayback(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.error(`❌ Channel ${channelId} not found`);
      return false;
    }
    
    if (!this.audioContext) {
      console.error('❌ Audio context not initialized');
      return false;
    }

    // Stop playback if currently playing
    if (channel.isPlaying && channel.bufferSource) {
      try {
        channel.bufferSource.stop();
      } catch (error) {
        console.warn(`⚠️ Error stopping buffer source for channel ${channelId}:`, error);
      }
      channel.bufferSource = null;
      channel.isPlaying = false;
      console.log(`⏹️ Stopped channel ${channelId}`);
    }

    return !channel.isPlaying;
  }

  /**
   * Play/pause channel (original Web Audio API method)
   */
  toggleChannelPlayback(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) {
      console.error(`❌ Channel ${channelId} not found`);
      return false;
    }
    
    if (!this.audioContext) {
      console.error('❌ Audio context not initialized');
      return false;
    }

    // Verify the gain node belongs to our audio context
    if (channel.gainNode && (channel.gainNode as any).context !== this.audioContext) {
      console.error(`❌ Channel ${channelId} gain node belongs to different audio context`);
      // Recreate the channel with the correct context
      this.recreateChannel(channelId);
      return false;
    }

    console.log(`🎵 Toggling playback for channel ${channelId}, currently: ${channel.isPlaying ? 'playing' : 'stopped'}`);

    if (channel.isPlaying) {
      // Pause playback and save position
      if (channel.bufferSource) {
        // Calculate current position
        const currentTime = this.audioContext.currentTime;
        const elapsed = currentTime - channel.startTime;
        channel.pausedAt = elapsed;
        
        // Ensure position doesn't exceed track duration
        if (channel.audioBuffer) {
          channel.pausedAt = Math.min(channel.pausedAt, channel.audioBuffer.duration);
        }
        
        try {
          channel.bufferSource.stop();
        } catch (error) {
          console.warn(`⚠️ Error stopping buffer source for channel ${channelId}:`, error);
        }
        channel.bufferSource = null;
      }
      channel.isPlaying = false;
      console.log(`⏸️ Paused channel ${channelId} at ${channel.pausedAt.toFixed(2)}s`);
    } else {
      // Start playback
      if (channel.audioBuffer) {
        console.log(`▶️ Starting playback for channel ${channelId}, buffer length: ${channel.audioBuffer.length} samples`);
        
        try {
          // Ensure we create buffer source from the same context
          channel.bufferSource = this.audioContext.createBufferSource();
          channel.bufferSource.buffer = channel.audioBuffer;
          
          // Determine start position and loop behavior
          let startOffset = channel.pausedAt;
          const trackDuration = channel.audioBuffer.duration;
          
          // Handle track completion for non-looping tracks
          if (startOffset >= trackDuration && !channel.isLooping) {
            // Track finished and not looping - reset to beginning
            startOffset = 0;
            channel.pausedAt = 0;
          } else if (startOffset >= trackDuration && channel.isLooping) {
            // Loop back to beginning
            startOffset = 0;
            channel.pausedAt = 0;
          }
          
          // Set loop property
          channel.bufferSource.loop = channel.isLooping;
          
          // Handle track ending (only for non-looped playback)
          if (!channel.isLooping) {
            channel.bufferSource.onended = () => {
              console.log(`🔚 Channel ${channelId} playback ended`);
              channel.isPlaying = false;
              channel.bufferSource = null;
              channel.pausedAt = 0; // Reset position for next play
              channel.startTime = 0;
            };
          }
          
          // Verify connection before attempting
          if (!channel.gainNode) {
            console.error(`❌ No gain node for channel ${channelId}`);
            return false;
          }
          
          channel.bufferSource.connect(channel.gainNode);
          
          // Start playback
          if (channel.isLooping) {
            // For looping tracks, start normally with loop enabled
            channel.bufferSource.start(0, startOffset);
          } else {
            // For non-looping tracks, limit duration to prevent overlap
            const remainingDuration = trackDuration - startOffset;
            channel.bufferSource.start(0, startOffset, remainingDuration);
          }
          
          channel.startTime = this.audioContext.currentTime - startOffset;
          channel.isPlaying = true;
          
          const action = startOffset > 0 ? 'Resumed' : 'Started';
          const loopStatus = channel.isLooping ? ' (looping)' : '';
          console.log(`✅ ${action} channel ${channelId} at ${startOffset.toFixed(2)}s${loopStatus}, context: ${this.audioContext.state}`);
        } catch (error) {
          console.error(`❌ Error starting playback for channel ${channelId}:`, error);
          channel.bufferSource = null;
          return false;
        }
      } else {
        console.error(`❌ No audio buffer loaded for channel ${channelId}`);
      }
    }

    return channel.isPlaying;
  }

  /**
   * Get current playback position in seconds
   */
  getCurrentPosition(channelId: string): number {
    const channel = this.channels.get(channelId);
    if (!channel || !this.audioContext) return 0;

    if (channel.isPlaying && channel.startTime > 0) {
      // Calculate current position based on audio context time
      const currentTime = this.audioContext.currentTime;
      const elapsed = currentTime - channel.startTime;
      
      // For looping tracks, calculate position within the track duration
      if (channel.isLooping && channel.audioBuffer) {
        return elapsed % channel.audioBuffer.duration;
      }
      
      // For non-looping tracks, return total elapsed time
      return elapsed;
    } else {
      // Return paused position
      return channel.pausedAt;
    }
  }

  /**
   * Set loop state for a channel
   */
  async setChannelLoop(channelId: string, isLooping: boolean): Promise<void> {
    if (this.backendAvailable) {
      const success = await backendService.setTrackLoop(channelId, isLooping);
      if (success) return;
    }

    // Fallback to Web Audio API
    const channel = this.channels.get(channelId);
    if (!channel) return;

    const wasLooping = channel.isLooping;
    channel.isLooping = isLooping;
    
    // If currently playing and loop state changed, update the buffer source
    if (channel.isPlaying && channel.bufferSource && wasLooping !== isLooping) {
      channel.bufferSource.loop = isLooping;
    }
    
    console.log(`🔄 Channel ${channelId} loop ${isLooping ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get track duration for a channel
   */
  getTrackDuration(channelId: string): number {
    const channel = this.channels.get(channelId);
    return channel?.audioBuffer?.duration || 0;
  }

  /**
   * Check if channel is looping
   */
  isChannelLooping(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    return channel?.isLooping || false;
  }

  /**
   * Seek to specific position in track
   */
  async seekToPosition(channelId: string, position: number): Promise<void> {
    if (this.backendAvailable) {
      const success = await backendService.seekTrack(channelId, position);
      if (success) return;
    }

    // Fallback to Web Audio API
    const channel = this.channels.get(channelId);
    if (!channel || !channel.audioBuffer) return;

    const duration = channel.audioBuffer.duration;
    const clampedPosition = Math.max(0, Math.min(position, duration));
    
    if (channel.isPlaying) {
      // Stop current playback
      if (channel.bufferSource) {
        try {
          channel.bufferSource.stop();
        } catch (error) {
          console.warn(`Error stopping buffer source during seek:`, error);
        }
      }
      
      // Set new position and restart
      channel.pausedAt = clampedPosition;
      this.toggleChannelPlayback(channelId); // This will start from the new position
    } else {
      // Just update the paused position
      channel.pausedAt = clampedPosition;
    }
    
    console.log(`⏭️ Channel ${channelId} seeked to ${clampedPosition.toFixed(2)}s`);
  }

  /**
   * Recreate channel with current audio context
   */
  private recreateChannel(channelId: string): void {
    console.log(`🔄 Recreating channel ${channelId} with current audio context`);
    const oldChannel = this.channels.get(channelId);
    
    // Disconnect old nodes
    if (oldChannel?.gainNode) {
      try {
        oldChannel.gainNode.disconnect();
      } catch (error) {
        console.warn('Error disconnecting old gain node:', error);
      }
    }
    
    // Create new channel
    const newChannel = this.createChannel(channelId);
    
    // Restore audio buffer if it existed
    if (oldChannel?.audioBuffer && newChannel) {
      newChannel.audioBuffer = oldChannel.audioBuffer;
    }
  }



  /**
   * Set channel EQ
   */
  async setChannelEQ(channelId: string, eq: { bass: number; mid: number; treble: number }): Promise<void> {
    if (this.backendAvailable) {
      const success = await backendService.setChannelEQ(channelId, eq);
      if (success) return;
    }

    // Fallback to Web Audio API
    const channel = this.channels.get(channelId);
    if (!channel || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    
    // Convert percentage to dB gain (-20dB to +20dB)
    const bassGain = (eq.bass - 50) * 0.8;
    const midGain = (eq.mid - 50) * 0.8;
    const trebleGain = (eq.treble - 50) * 0.8;

    channel.bassFilter!.gain.setValueAtTime(bassGain, currentTime);
    channel.midFilter!.gain.setValueAtTime(midGain, currentTime);
    channel.trebleFilter!.gain.setValueAtTime(trebleGain, currentTime);
  }

  /**
   * Set crossfader position
   */
  async setCrossfader(position: number): Promise<void> {
    if (this.backendAvailable) {
      const success = await backendService.setCrossfader(position);
      if (success) return;
    }

    // Fallback to Web Audio API
    if (!this.crossfaderGain.a || !this.crossfaderGain.b || !this.audioContext) return;

    const currentTime = this.audioContext.currentTime;
    
    // Convert position (-100 to 100) to gain values
    const normalizedPosition = position / 100;
    
    let gainA, gainB;
    if (normalizedPosition <= 0) {
      // Fading towards A
      gainA = 1;
      gainB = 1 + normalizedPosition; // normalizedPosition is negative
    } else {
      // Fading towards B
      gainA = 1 - normalizedPosition;
      gainB = 1;
    }

    this.crossfaderGain.a.gain.setValueAtTime(gainA, currentTime);
    this.crossfaderGain.b.gain.setValueAtTime(gainB, currentTime);
  }

  /**
   * Enable/disable microphone with C++ backend or Web Audio fallback
   */
  async toggleMicrophone(enabled: boolean, deviceId?: string): Promise<boolean> {
    // Use C++ backend if available
    if (this.backendAvailable && this.useBackendAudio) {
      return this.toggleMicrophoneBackend(enabled, deviceId);
    }
    
    // Fallback to Web Audio API
    return this.toggleMicrophoneWebAudio(enabled, deviceId);
  }

  /**
   * Enable/disable microphone using C++ backend
   */
  private async toggleMicrophoneBackend(enabled: boolean, deviceId?: string): Promise<boolean> {
    try {
      if (enabled) {
        const success = await backendService.startMicrophone();
        if (success) {
          console.log('✅ Microphone started via C++ Media Server');
        }
        return success;
      } else {
        const success = await backendService.stopMicrophone();
        if (success) {
          console.log('✅ Microphone stopped via C++ Media Server');
        }
        return success;
      }
    } catch (error) {
      console.error('❌ Failed to toggle microphone via C++ backend:', error);
      return false;
    }
  }

  /**
   * Enable/disable microphone using Web Audio API (fallback)
   */
  private async toggleMicrophoneWebAudio(enabled: boolean, deviceId?: string): Promise<boolean> {
    if (!this.audioContext) return false;

    try {
      if (enabled && !this.microphoneSource) {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 1,
            ...(deviceId && { deviceId: { exact: deviceId } })
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        this.microphoneSource = this.audioContext.createMediaStreamSource(stream);
        this.microphoneGain = this.audioContext.createGain();
        
        // Set initial microphone gain to 100%
        this.microphoneGain.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        
        // Create a dedicated analyser for microphone
        const micAnalyser = this.audioContext.createAnalyser();
        micAnalyser.fftSize = 1024; // Increased for better resolution
        micAnalyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive meters
        micAnalyser.minDecibels = -90;
        micAnalyser.maxDecibels = -10;
        
        // Connect microphone through gain to both master and analyser
        this.microphoneSource.connect(this.microphoneGain);
        this.microphoneGain.connect(micAnalyser);
        this.microphoneGain.connect(this.masterGainNode!);
        
        // Store the analyser and stream for level monitoring and cleanup
        (this.microphoneSource as any).analyser = micAnalyser;
        (this.microphoneSource as any).mediaStream = stream;
        
        console.log('🎙️ Web Audio microphone enabled:', {
          fftSize: micAnalyser.fftSize,
          sampleRate: this.audioContext.sampleRate,
          frequencyBinCount: micAnalyser.frequencyBinCount
        });
        
        return true;
      } else if (!enabled && this.microphoneSource) {
        // Stop all tracks to fully disable microphone
        const stream = (this.microphoneSource as any).mediaStream;
        if (stream) {
          stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
        
        this.microphoneSource.disconnect();
        this.microphoneGain?.disconnect();
        this.microphoneSource = null;
        this.microphoneGain = null;
        
        console.log('🎙️ Web Audio microphone disabled');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to toggle Web Audio microphone:', error);
      return false;
    }
  }

  /**
   * Switch microphone to a different device
   */
  async switchMicrophoneDevice(deviceId: string): Promise<boolean> {
    if (!this.audioContext) return false;

    try {
      // If microphone is currently active, stop it first
      const wasActive = !!this.microphoneSource;
      if (wasActive) {
        await this.toggleMicrophone(false);
      }

      // Start with new device
      if (wasActive) {
        return await this.toggleMicrophone(true, deviceId);
      }

      return true;
    } catch (error) {
      console.error('Failed to switch microphone device:', error);
      return false;
    }
  }

  /**
   * Check if microphone is currently enabled
   */
  isMicrophoneEnabled(): boolean {
    return this.microphoneSource !== null;
  }

  /**
   * Set microphone gain level
   */
  setMicrophoneGain(gain: number): void {
    if (this.microphoneGain && this.audioContext) {
      const clampedGain = Math.max(0, Math.min(gain / 100, 2)); // 0-200% gain
      this.microphoneGain.gain.setValueAtTime(clampedGain, this.audioContext.currentTime);
      console.log(`🎤 Microphone gain set to ${gain}% (${clampedGain.toFixed(2)})`);
    }
  }

  /**
   * Get current microphone gain level (0-100)
   */
  getMicrophoneGain(): number {
    if (this.microphoneGain) {
      return Math.round(this.microphoneGain.gain.value * 100);
    }
    return 70; // Default value
  }

  /**
   * Start audio encoding and streaming
   */
  startStreaming(config: StreamingConfig = { sampleRate: 48000, bitRate: 128000, channels: 2 }): MediaStream | null {
    if (!this.streamDestination) return null;

    try {
      const stream = this.streamDestination.stream;
      
      // Update encoding configuration
      this.encodingConfig.audioBitsPerSecond = config.bitRate;
      this.encodingConfig.sampleRate = config.sampleRate;
      this.encodingConfig.channels = config.channels;
      
      // Start MediaRecorder for audio encoding
      this.startAudioEncoding(stream);
      
      console.log('Stream started with encoding:', {
        tracks: stream.getTracks().length,
        config: this.encodingConfig
      });
      
      return stream;
    } catch (error) {
      console.error('Failed to start streaming:', error);
      return null;
    }
  }

  /**
   * Start audio encoding using MediaRecorder
   */
  private startAudioEncoding(stream: MediaStream): void {
    try {
      // Check codec support
      const supportedMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4'
      ];

      let selectedMimeType = this.encodingConfig.mimeType;
      
      for (const mimeType of supportedMimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      // Configure MediaRecorder options
      const options: MediaRecorderOptions = {
        mimeType: selectedMimeType,
        audioBitsPerSecond: this.encodingConfig.audioBitsPerSecond
      };

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.encodedChunks = [];

      // Handle encoded data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.encodedChunks.push(event.data);
          
          // Send chunk to media server (implement WebSocket or WebRTC)
          this.sendEncodedChunk(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        console.log('Audio encoding started:', selectedMimeType);
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        console.log('Audio encoding stopped');
        
        // Create final encoded file
        if (this.encodedChunks.length > 0) {
          const finalBlob = new Blob(this.encodedChunks, { type: selectedMimeType });
          this.handleEncodedAudio(finalBlob);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      // Start recording in chunks (for real-time streaming)
      this.mediaRecorder.start(1000); // 1 second chunks

    } catch (error) {
      console.error('Failed to start audio encoding:', error);
    }
  }

  /**
   * Send encoded audio chunk to media server
   */
  private sendEncodedChunk(chunk: Blob): void {
    // TODO: Implement WebSocket connection to C++/Media Server
    // For now, log chunk info
    console.log('Encoded chunk ready:', {
      size: chunk.size,
      type: chunk.type,
      timestamp: Date.now()
    });

    // Example WebSocket implementation:
    /*
    if (this.websocketConnection && this.websocketConnection.readyState === WebSocket.OPEN) {
      chunk.arrayBuffer().then(buffer => {
        this.websocketConnection.send(buffer);
      });
    }
    */
  }

  /**
   * Handle complete encoded audio file
   */
  private handleEncodedAudio(blob: Blob): void {
    console.log('Final encoded audio:', {
      size: blob.size,
      type: blob.type,
      duration: 'unknown' // Could calculate from chunks
    });

    // Optional: Create download link for testing
    if (process.env.NODE_ENV === 'development') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `radio_stream_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Stop audio encoding and streaming
   */
  stopStreaming(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    this.mediaRecorder = null;
    this.encodedChunks = [];
    this.isRecording = false;
    
    console.log('Streaming stopped and encoding finished');
  }

  /**
   * Get encoding status and stats
   */
  getEncodingStatus(): {
    isEncoding: boolean;
    codecSupport: { [key: string]: boolean };
    chunkCount: number;
    estimatedBitrate: number;
  } {
    const codecSupport = {
      'audio/webm;codecs=opus': MediaRecorder.isTypeSupported('audio/webm;codecs=opus'),
      'audio/webm': MediaRecorder.isTypeSupported('audio/webm'),
      'audio/mp4;codecs=mp4a.40.2': MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a.40.2'),
      'audio/mp4': MediaRecorder.isTypeSupported('audio/mp4')
    };

    return {
      isEncoding: this.isRecording,
      codecSupport,
      chunkCount: this.encodedChunks.length,
      estimatedBitrate: this.encodingConfig.audioBitsPerSecond
    };
  }

  /**
   * Get audio level data for meters
   */
  getAudioLevels(channelId?: string): Float32Array | null {
    let analyser: AnalyserNode | null = null;
    
    if (channelId === 'microphone') {
      // Return microphone levels from dedicated analyser
      if (this.microphoneSource && (this.microphoneSource as any).analyser) {
        const micAnalyser = (this.microphoneSource as any).analyser;
        const dataArray = new Float32Array(micAnalyser.frequencyBinCount);
        micAnalyser.getFloatFrequencyData(dataArray);
        return dataArray;
      }
      return null;
    } else if (channelId) {
      const channel = this.channels.get(channelId);
      analyser = channel?.analyser || null;
    } else {
      analyser = this.masterAnalyser;
    }

    if (!analyser) return null;

    const dataArray = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Get RMS audio level as percentage - C++ backend or Web Audio fallback
   */
  getAudioLevelPercentage(channelId?: string): number {
    // Use C++ backend levels if available
    if (this.backendAvailable && this.useBackendAudio) {
      return this.getBackendLevelPercentage(channelId);
    }
    
    // Fallback to Web Audio API
    return this.getWebAudioLevelPercentage(channelId);
  }

  /**
   * Get audio levels from C++ backend
   */
  private getBackendLevelPercentage(channelId?: string): number {
    if (channelId === 'microphone') {
      const levels = this.backendLevels.microphone;
      if (levels) {
        // Convert dB to percentage: -60dB = 0%, 0dB = 100%
        const dbLevel = Math.max(levels.left_db, levels.right_db);
        const percentage = Math.max(0, Math.min(100, (dbLevel + 60) / 60 * 100));
        return percentage;
      }
    } else {
      const levels = this.backendLevels.master;
      if (levels) {
        // Convert dB to percentage: -60dB = 0%, 0dB = 100%
        const dbLevel = Math.max(levels.left_db, levels.right_db);
        const percentage = Math.max(0, Math.min(100, (dbLevel + 60) / 60 * 100));
        return percentage;
      }
    }
    
    return 0;
  }

  /**
   * Get audio levels from Web Audio API (fallback)
   */
  private getWebAudioLevelPercentage(channelId?: string): number {
    let analyser: AnalyserNode | null = null;
    
    if (channelId === 'microphone') {
      // Get microphone analyser
      if (this.microphoneSource && (this.microphoneSource as any).analyser) {
        analyser = (this.microphoneSource as any).analyser;
      } else {
        return 0;
      }
    } else if (channelId) {
      const channel = this.channels.get(channelId);
      analyser = channel?.analyser || null;
    } else {
      analyser = this.masterAnalyser;
    }

    if (!analyser) return 0;

    // Use time domain data for real-time level monitoring
    const dataArray = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(dataArray);
    
    // Calculate RMS level from time domain data
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const sample = (dataArray[i] - 128) / 128; // Convert to -1 to 1 range
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    
    // Convert to percentage (0-100) with better scaling for music
    const percentage = Math.min(100, rms * 400); // Enhanced amplification for better VU response
    return percentage;
  }

  /**
   * Get real-time master levels for left and right channels
   */
  getMasterLevels(): { left: number; right: number } {
    if (!this.masterAnalyser) {
      return { left: 0, right: 0 };
    }

    // Get stereo time domain data
    const dataArray = new Uint8Array(this.masterAnalyser.fftSize);
    this.masterAnalyser.getByteTimeDomainData(dataArray);
    
    // Split into left and right channels (assume stereo interleaved)
    const halfLength = Math.floor(dataArray.length / 2);
    let leftSum = 0, rightSum = 0;
    
    for (let i = 0; i < halfLength; i++) {
      // Left channel (even indices)
      const leftSample = (dataArray[i * 2] - 128) / 128;
      leftSum += leftSample * leftSample;
      
      // Right channel (odd indices)  
      const rightSample = (dataArray[i * 2 + 1] - 128) / 128;
      rightSum += rightSample * rightSample;
    }
    
    const leftRms = Math.sqrt(leftSum / halfLength);
    const rightRms = Math.sqrt(rightSum / halfLength);
    
    return {
      left: Math.min(100, leftRms * 400),
      right: Math.min(100, rightRms * 400)
    };
  }

  /**
   * Get real-time channel levels for individual decks
   */
  getChannelLevels(channelId: string): { left: number; right: number } {
    const channel = this.channels.get(channelId);
    if (!channel?.analyser || !channel.isPlaying) {
      return { left: 0, right: 0 };
    }

    const dataArray = new Uint8Array(channel.analyser.fftSize);
    channel.analyser.getByteTimeDomainData(dataArray);
    
    // Calculate stereo levels
    const halfLength = Math.floor(dataArray.length / 2);
    let leftSum = 0, rightSum = 0;
    
    for (let i = 0; i < halfLength; i++) {
      const leftSample = (dataArray[i * 2] - 128) / 128;
      leftSum += leftSample * leftSample;
      
      const rightSample = (dataArray[i * 2 + 1] - 128) / 128;
      rightSum += rightSample * rightSample;
    }
    
    const leftRms = Math.sqrt(leftSum / halfLength);
    const rightRms = Math.sqrt(rightSum / halfLength);
    
    return {
      left: Math.min(100, leftRms * 400),
      right: Math.min(100, rightRms * 400)
    };
  }

  /**
   * Get microphone activity status
   */
  isMicrophoneActive(): boolean {
    if (!this.microphoneSource) return false;
    
    const level = this.getAudioLevelPercentage('microphone');
    return level > 5; // Consider active if level > 5%
  }

  /**
   * Set master volume - delegates to C++ Media Server when available
   */
  async setMasterVolume(volume: number): Promise<boolean> {
    console.log(`🎚️ Setting master volume to ${volume}%`);
    
    if (this.backendAvailable && this.useBackendAudio) {
      // Use C++ Media Server for precise volume control
      try {
        const success = await backendService.setMasterVolume(volume);
        if (success) {
          console.log(`✅ Master volume set to ${volume}% via C++ Media Server`);
          return true;
        }
        console.warn('⚠️ Backend volume control failed, using Web Audio fallback');
      } catch (error) {
        console.error('❌ Error setting master volume via backend:', error);
      }
    }
    
    // Web Audio fallback
    if (this.masterGainNode && this.audioContext) {
      const normalizedVolume = volume / 100;
      this.masterGainNode.gain.setValueAtTime(normalizedVolume, this.audioContext.currentTime);
      console.log(`✅ Master volume set to ${volume}% via Web Audio API`);
      return true;
    }
    
    console.error('❌ No audio system available for master volume control');
    return false;
  }



  /**
   * Set crossfader position - delegates to C++ backend when available
   */
  async setCrossfaderPosition(position: number): Promise<boolean> {
    if (this.backendAvailable && this.useBackendAudio) {
      // Use C++ Media Server for precise crossfader control
      return await backendService.setCrossfader(position);
    }
    
    // Web Audio fallback
    this.setCrossfader(position);
    return true;
  }

  /**
   * Set microphone gain - delegates to C++ backend when available
   */
  async setMicGain(gain: number): Promise<boolean> {
    if (this.backendAvailable && this.useBackendAudio) {
      return await backendService.setMicrophoneGain(gain);
    }
    
    // Web Audio fallback
    this.setMicrophoneGain(gain);
    return true;
  }

  /**
   * Load track to specific deck (used by MixerChannel components)
   */
  async loadTrack(file: File, deckNumber: number, trackInfo?: { 
    id?: string; 
    title?: string; 
    artist?: string; 
    duration?: number; 
    loadMethod?: 'double_click' | 'drag_drop' | 'button' | 'unknown' 
  }): Promise<{ success: boolean; duration?: number }> {
    const trackTitle = trackInfo?.title || file.name;
    const loadMethod = trackInfo?.loadMethod || 'unknown';
    
    console.log(`🎵 Loading track "${trackTitle}" to deck ${deckNumber} via ${loadMethod}`);
    
    // Map deck numbers to channel IDs
    const channelId = deckNumber === 1 ? 'channelA' : 'channelB';
    
    // Use the enhanced loadAudioFile method with track info
    return await this.loadAudioFile(channelId, file, trackInfo);
  }

  /**
   * Play/pause track on specific deck
   */
  async playPauseTrack(deckNumber: number): Promise<boolean> {
    const channelId = deckNumber === 1 ? 'channelA' : 'channelB';
    console.log(`🎮 Toggle playback for deck ${deckNumber} (${channelId})`);
    
    // Use C++ backend if available
    if (this.backendAvailable && this.useBackendAudio) {
      try {
        const channel = this.channels.get(channelId);
        const shouldPlay = !channel?.isPlaying;
        
        const success = await backendService.setChannelPlayback(channelId, shouldPlay);
        if (success && channel) {
          channel.isPlaying = shouldPlay;
          console.log(`✅ Deck ${deckNumber} playback ${shouldPlay ? 'started' : 'stopped'} via C++ Media Server`);
          return true;
        }
        console.warn('⚠️ Backend playback control failed, using Web Audio fallback');
      } catch (error) {
        console.error('❌ Error controlling playback via backend:', error);
      }
    }
    
    // Web Audio fallback
    return this.toggleChannelPlayback(channelId);
  }

  /**
   * Stop track on specific deck
   */
  async stopTrack(deckNumber: number): Promise<boolean> {
    const channelId = deckNumber === 1 ? 'channelA' : 'channelB';
    console.log(`⏹️ Stopping deck ${deckNumber} (${channelId})`);
    
    // Use C++ backend if available
    if (this.backendAvailable && this.useBackendAudio) {
      try {
        const success = await backendService.setChannelPlayback(channelId, false);
        if (success) {
          const channel = this.channels.get(channelId);
          if (channel) {
            channel.isPlaying = false;
          }
          console.log(`✅ Deck ${deckNumber} stopped via C++ Media Server`);
          return true;
        }
        console.warn('⚠️ Backend stop failed, using Web Audio fallback');
      } catch (error) {
        console.error('❌ Error stopping via backend:', error);
      }
    }
    
    // Web Audio fallback - stop the channel
    const channel = this.channels.get(channelId);
    if (channel?.bufferSource) {
      try {
        channel.bufferSource.stop();
        channel.bufferSource = null;
        channel.isPlaying = false;
        console.log(`✅ Deck ${deckNumber} stopped via Web Audio API`);
        return true;
      } catch (error) {
        console.error(`❌ Error stopping Web Audio playback:`, error);
        return false;
      }
    }
    
    return true; // Already stopped
  }

  /**
   * Get audio devices - uses C++ backend when available
   */
  async getAudioDevices(): Promise<{ input: any[], output: any[] }> {
    if (this.backendAvailable && this.useBackendAudio) {
      const devices = await backendService.getAudioDevices();
      return {
        input: devices,
        output: []
      };
    }
    
    // Web Audio fallback
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');
      
      return {
        input: inputDevices,
        output: outputDevices
      };
    } catch (error) {
      console.error('Failed to get audio devices:', error);
      return { input: [], output: [] };
    }
  }

  /**
   * Get system status including backend availability
   */
  getSystemStatus(): {
    backendAvailable: boolean;
    audioMode: 'backend' | 'webaudio';
    webAudioSupported: boolean;
    sampleRate?: number;
  } {
    return {
      backendAvailable: this.backendAvailable,
      audioMode: this.backendAvailable && this.useBackendAudio ? 'backend' : 'webaudio',
      webAudioSupported: !!this.audioContext,
      sampleRate: this.audioContext?.sampleRate
    };
  }

  /**
   * Force switch to Web Audio API mode
   */
  async switchToWebAudio(): Promise<boolean> {
    this.useBackendAudio = false;
    if (!this.audioContext) {
      return await this.initializeWebAudio();
    }
    return true;
  }

  /**
   * Try to switch back to backend mode
   */
  async switchToBackend(): Promise<boolean> {
    await this.checkBackendAvailability();
    if (this.backendAvailable) {
      this.useBackendAudio = true;
      return true;
    }
    return false;
  }

  /**
   * Resume audio context (required after user gesture)
   */
  async resumeContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('✅ Audio context resumed');
      } catch (error) {
        console.error('❌ Failed to resume audio context:', error);
        throw error;
      }
    }
  }

  /**
   * Get real-time frequency data for waveform visualization
   */
  getChannelFrequencyData(channelId: string): Float32Array | null {
    const channel = this.channels.get(channelId);
    if (!channel?.analyser || !channel.isPlaying) {
      return null;
    }
    
    const bufferLength = channel.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    channel.analyser.getFloatFrequencyData(dataArray);
    
    return dataArray;
  }

  /**
   * Get real-time time domain data for waveform visualization
   */
  getChannelWaveformData(channelId: string): Float32Array | null {
    const channel = this.channels.get(channelId);
    if (!channel?.analyser || !channel.isPlaying) {
      return null;
    }
    
    const bufferLength = channel.analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    channel.analyser.getFloatTimeDomainData(dataArray);
    
    return dataArray;
  }

  /**
   * Get channel playback position and duration for progress tracking
   */
  getChannelProgress(channelId: string): { currentTime: number; duration: number } | null {
    const channel = this.channels.get(channelId);
    if (!channel?.audioBuffer) {
      return null;
    }
    
    return {
      currentTime: 0, // This would need to be tracked during playback
      duration: channel.audioBuffer.duration
    };
  }

  /**
   * Set channel gain
   */
  async setChannelGain(channelId: string, gain: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setChannelGain(channelId, gain);
    }
    
    // Web Audio fallback - gain is handled by volume control
    return this.setChannelVolume(channelId, gain);
  }

  /**
   * Set channel cue (headphone monitoring)
   */
  async setChannelCue(channelId: string, enabled: boolean): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setChannelCue(channelId, enabled);
    }
    
    console.log(`🎧 Channel ${channelId} cue ${enabled ? 'enabled' : 'disabled'} (Web Audio fallback)`);
    return true;
  }

  /**
   * Set track pitch/tempo
   */
  async setTrackPitch(channelId: string, pitch: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setTrackPitch(channelId, pitch);
    }
    
    console.log(`🎵 Channel ${channelId} pitch set to ${pitch}% (Web Audio fallback - not implemented)`);
    return false; // Web Audio API doesn't easily support pitch shifting
  }

  /**
   * Get track progress (position and duration)
   */
  async getTrackProgress(channelId: string): Promise<{ position: number; duration: number } | null> {
    if (this.backendAvailable) {
      return await backendService.getTrackProgress(channelId);
    }
    
    // Web Audio fallback
    const channel = this.channels.get(channelId);
    if (!channel?.audioBuffer) return null;
    
    return {
      position: this.getCurrentPosition(channelId),
      duration: channel.audioBuffer.duration
    };
  }

  /**
   * Set headphone volume
   */
  async setHeadphoneVolume(volume: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setHeadphoneVolume(volume);
    }
    
    console.log(`🎧 Headphone volume set to ${volume}% (Web Audio fallback - not implemented)`);
    return false;
  }

  /**
   * Set headphone cue mix
   */
  async setHeadphoneCueMix(mix: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setHeadphoneCueMix(mix);
    }
    
    console.log(`🎧 Headphone cue mix set to ${mix}% (Web Audio fallback - not implemented)`);
    return false;
  }

  /**
   * Get track waveform data
   */
  async getTrackWaveform(channelId: string): Promise<Float32Array | null> {
    if (this.backendAvailable) {
      return await backendService.getTrackWaveform(channelId);
    }
    
    // Web Audio fallback - return current frequency data
    return this.getChannelFrequencyData(channelId);
  }

  /**
   * Set BPM sync
   */
  async setBPMSync(channelId: string, enabled: boolean, targetBPM?: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setBPMSync(channelId, enabled, targetBPM);
    }
    
    console.log(`🎵 Channel ${channelId} BPM sync ${enabled ? 'enabled' : 'disabled'} (Web Audio fallback - not implemented)`);
    return false;
  }

  /**
   * Trigger hot cue
   */
  async triggerHotCue(channelId: string, cueNumber: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.triggerHotCue(channelId, cueNumber);
    }
    
    console.log(`🔥 Channel ${channelId} hot cue ${cueNumber} triggered (Web Audio fallback - not implemented)`);
    return false;
  }

  /**
   * Set hot cue point
   */
  async setHotCue(channelId: string, cueNumber: number, position: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.setHotCue(channelId, cueNumber, position);
    }
    
    console.log(`🔥 Channel ${channelId} hot cue ${cueNumber} set at ${position}s (Web Audio fallback - not implemented)`);
    return false;
  }

  /**
   * Clear hot cue point
   */
  async clearHotCue(channelId: string, cueNumber: number): Promise<boolean> {
    if (this.backendAvailable) {
      return await backendService.clearHotCue(channelId, cueNumber);
    }
    
    console.log(`🔥 Channel ${channelId} hot cue ${cueNumber} cleared (Web Audio fallback - not implemented)`);
    return false;
  }

  /**
   * Get comprehensive audio levels from C++ backend
   */
  async getComprehensiveAudioLevels(): Promise<any> {
    if (this.backendAvailable) {
      return await backendService.getAudioLevels();
    }
    
    // Web Audio fallback
    return {
      master: this.getMasterLevels(),
      channelA: this.getChannelLevels('A'),
      channelB: this.getChannelLevels('B'),
      microphone: { left: this.getAudioLevelPercentage('microphone'), right: this.getAudioLevelPercentage('microphone') }
    };
  }

  /**
   * Get audio context for streaming
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Get master gain node for streaming
   */
  getMasterGain(): GainNode | null {
    return this.masterGainNode;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Clean up backend resources
    if (this.backendAvailable) {
      backendService.cleanup();
    }
    
    // Clean up Web Audio
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.channels.clear();
    this.microphoneSource = null;
    this.microphoneGain = null;
    
    console.log('AudioService disposed');
  }
}

// Singleton instance
export const audioService = new AudioService();

// Make audioService globally available for real-time monitoring
(window as any).audioService = audioService;

export default AudioService;