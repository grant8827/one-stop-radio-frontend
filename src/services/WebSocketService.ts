/**
 * WebSocketService - Real-time communication with Node.js signaling server
 * Handles listener counts, chat, streaming status, and live events
 */

export interface ListenerStats {
  current: number;
  peak: number;
  locations: string[];
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'user' | 'system' | 'moderator';
}

export interface StreamStatus {
  isLive: boolean;
  startTime?: Date;
  viewerCount: number;
  quality: 'low' | 'medium' | 'high';
  bitrate: number;
}

export interface SignalingMessage {
  type: 'listener_count' | 'chat_message' | 'stream_status' | 'go_live' | 'stop_stream' | 'user_joined' | 'user_left';
  payload: any;
  timestamp: Date;
  stationId?: string;
}

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private eventHandlers: Map<string, EventCallback[]> = new Map();
  private config = {
    url: 'ws://localhost:8080', // Node.js signaling server
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
  };

  // Connection state
  private reconnectAttempts = 0;
  private lastHeartbeat = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Connect to WebSocket server
   */
  async connect(stationId: string, authToken: string): Promise<boolean> {
    if (this.isConnecting || (this.socket && this.socket.readyState === WebSocket.OPEN)) {
      return true;
    }

    this.isConnecting = true;

    try {
      const wsUrl = `${this.config.url}/signaling?stationId=${stationId}&token=${authToken}`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected to signaling server');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected', { stationId });
      };

      this.socket.onmessage = (event) => {
        try {
          const message: SignalingMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        if (event.code !== 1000) { // Not a normal closure
          this.scheduleReconnect(stationId, authToken);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

      return true;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.reconnectAttempts = 0;
  }

  /**
   * Send message to server
   */
  send(type: string, payload: any, stationId?: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    const message: SignalingMessage = {
      type: type as any,
      payload,
      timestamp: new Date(),
      stationId
    };

    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  /**
   * Register event handler
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * Unregister event handler
   */
  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: SignalingMessage): void {
    switch (message.type) {
      case 'listener_count':
        this.emit('listenerUpdate', message.payload as ListenerStats);
        break;
      
      case 'chat_message':
        this.emit('chatMessage', message.payload as ChatMessage);
        break;
      
      case 'stream_status':
        this.emit('streamStatus', message.payload as StreamStatus);
        break;
      
      case 'user_joined':
        this.emit('userJoined', message.payload);
        break;
      
      case 'user_left':
        this.emit('userLeft', message.payload);
        break;
      
      default:
        console.log('Unknown message type:', message.type, message.payload);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(stationId: string, authToken: string): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${this.config.reconnectInterval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect(stationId, authToken);
    }, this.config.reconnectInterval);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send('heartbeat', { timestamp: Date.now() });
        this.lastHeartbeat = Date.now();
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ===== DJ-Specific Methods =====

  /**
   * Notify server that DJ is going live
   */
  goLive(streamConfig: { quality: string; bitrate: number }): boolean {
    return this.send('go_live', streamConfig);
  }

  /**
   * Notify server that DJ is stopping stream
   */
  stopStream(): boolean {
    return this.send('stop_stream', {});
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string): boolean {
    return this.send('chat_message', {
      message,
      timestamp: new Date()
    });
  }

  /**
   * Update stream metadata
   */
  updateStreamMetadata(metadata: { title?: string; genre?: string; nowPlaying?: string }): boolean {
    return this.send('stream_metadata', metadata);
  }

  /**
   * Request current listener stats
   */
  requestListenerStats(): boolean {
    return this.send('get_listener_stats', {});
  }

  /**
   * Update DJ status (playing, paused, mixing)
   */
  updateDJStatus(status: 'playing' | 'paused' | 'mixing' | 'offline'): boolean {
    return this.send('dj_status', { status });
  }

  /**
   * Event listener methods for DJInterface integration
   */
  onListenerStats(callback: (stats: ListenerStats) => void): void {
    this.on('listener_stats', callback);
  }

  onStreamStatus(callback: (status: StreamStatus) => void): void {
    this.on('stream_status', callback);
  }

  goOffline(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.send('go_offline', {})) {
        resolve();
      } else {
        reject(new Error('Failed to send go offline message'));
      }
    });
  }

  // ===== Getters =====

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }

  get connectionState(): string {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

// Singleton instance
export const webSocketService = new WebSocketService();
export default WebSocketService;