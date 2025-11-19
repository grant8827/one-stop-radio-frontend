import React from 'react';

class DJWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(private url: string = 'ws://localhost:5001/ws/dj') {
    this.connect();
  }

  /**
   * Establish WebSocket connection to Node.js signaling server
   */
  private connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection open
   */
  private handleOpen(): void {
    console.log('DJ WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Send queued messages
    this.processMessageQueue();
    
    // Notify listeners
    this.emit('connected', { timestamp: Date.now() });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      console.log('DJ WebSocket message received:', message);
      
      // Handle different message types
      switch (message.type) {
        case 'deck_loaded':
          this.emit('deckLoaded', message);
          break;
        case 'deck_load_error':
          this.emit('deckLoadError', message);
          break;
        case 'deck_status':
          this.emit('deckStatus', message);
          break;
        case 'playback_status':
          this.emit('playbackStatus', message);
          break;
        case 'mixer_update':
          this.emit('mixerUpdate', message);
          break;
        case 'heartbeat_response':
          // Heartbeat acknowledged
          break;
        default:
          this.emit('message', message);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    console.log('DJ WebSocket disconnected:', event.code, event.reason);
    
    this.stopHeartbeat();
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    // Attempt to reconnect if not intentionally closed
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket errors
   */
  private handleError(error: Event): void {
    console.error('DJ WebSocket error:', error);
    this.emit('error', { error });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached', {});
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
          timestamp: Date.now()
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Process queued messages when connection is restored
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Check if WebSocket is connected and ready
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send message via WebSocket
   */
  public send(message: any): void {
    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        // Queue message for retry
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
      console.warn('WebSocket not connected, message queued:', message);
    }
  }

  /**
   * Load track to specified deck
   */
  public loadTrackToDeck(trackId: number, deckId: 'A' | 'B', options: {
    autoPlay?: boolean;
    cuePoint?: number;
    fadeIn?: boolean;
  } = {}): void {
    const message = {
      type: 'load_deck',
      command: 'load_track',
      track_id: trackId,
      deck_id: deckId,
      auto_play: options.autoPlay || false,
      cue_point: options.cuePoint || 0,
      fade_in: options.fadeIn || false,
      timestamp: Date.now(),
      source: 'music_library'
    };

    this.send(message);
    console.log(`Loading track ${trackId} to deck ${deckId}:`, message);
  }

  /**
   * Control deck playback
   */
  public controlDeck(deckId: 'A' | 'B', command: 'play' | 'pause' | 'stop' | 'cue'): void {
    const message = {
      type: 'deck_control',
      command,
      deck_id: deckId,
      timestamp: Date.now()
    };

    this.send(message);
  }

  /**
   * Set mixer parameters
   */
  public setMixerParam(param: string, value: number, deckId?: 'A' | 'B'): void {
    const message = {
      type: 'mixer_control',
      command: 'set_param',
      parameter: param,
      value,
      deck_id: deckId,
      timestamp: Date.now()
    };

    this.send(message);
  }

  /**
   * Request current deck status
   */
  public requestDeckStatus(deckId?: 'A' | 'B'): void {
    const message = {
      type: 'status_request',
      command: 'get_deck_status',
      deck_id: deckId,
      timestamp: Date.now()
    };

    this.send(message);
  }

  /**
   * Add event listener
   */
  public on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remove event listener
   */
  public off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit event to all listeners
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
   * Close WebSocket connection
   */
  public disconnect(): void {
    if (this.ws) {
      this.stopHeartbeat();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
    url: string;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      url: this.url
    };
  }
}

// Singleton instance for the DJ WebSocket service
export const djWebSocket = new DJWebSocketService();

// Hook for React components to use the WebSocket service
export const useDJWebSocket = () => {
  const [connected, setConnected] = React.useState(djWebSocket.isConnected());
  const [deckStatus, setDeckStatus] = React.useState<{
    A: { trackId: number | null; playing: boolean; position: number };
    B: { trackId: number | null; playing: boolean; position: number };
  }>({
    A: { trackId: null, playing: false, position: 0 },
    B: { trackId: null, playing: false, position: 0 }
  });

  React.useEffect(() => {
    const handleConnected = () => setConnected(true);
    const handleDisconnected = () => setConnected(false);
    
    const handleDeckLoaded = (data: any) => {
      setDeckStatus(prev => ({
        ...prev,
        [data.deck_id]: {
          ...prev[data.deck_id as 'A' | 'B'],
          trackId: data.track_id
        }
      }));
    };

    const handleDeckStatus = (data: any) => {
      if (data.deck_id && data.status) {
        setDeckStatus(prev => ({
          ...prev,
          [data.deck_id]: data.status
        }));
      }
    };

    // Register event listeners
    djWebSocket.on('connected', handleConnected);
    djWebSocket.on('disconnected', handleDisconnected);
    djWebSocket.on('deckLoaded', handleDeckLoaded);
    djWebSocket.on('deckStatus', handleDeckStatus);

    // Request initial status
    djWebSocket.requestDeckStatus();

    return () => {
      djWebSocket.off('connected', handleConnected);
      djWebSocket.off('disconnected', handleDisconnected);
      djWebSocket.off('deckLoaded', handleDeckLoaded);
      djWebSocket.off('deckStatus', handleDeckStatus);
    };
  }, []);

  return {
    connected,
    deckStatus,
    loadTrackToDeck: djWebSocket.loadTrackToDeck.bind(djWebSocket),
    controlDeck: djWebSocket.controlDeck.bind(djWebSocket),
    setMixerParam: djWebSocket.setMixerParam.bind(djWebSocket),
    requestDeckStatus: djWebSocket.requestDeckStatus.bind(djWebSocket),
    getStatus: djWebSocket.getStatus.bind(djWebSocket)
  };
};

export default DJWebSocketService;