/**
 * StreamService - Dynamic Stream Provisioning Management
 * Handles stream creation, configuration, activation, and monitoring
 * Integrates with FastAPI Stream Management and C++ Stream Controller
 */

import { getServiceUrl } from './BackendConfig';

export enum StreamStatus {
  PENDING = 'PENDING',
  READY = 'READY', 
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED'
}

export enum StreamQuality {
  LOW = 64,       // Talk radio, podcasts
  STANDARD = 128, // General music streaming  
  HIGH = 192,     // Professional DJ streams
  PREMIUM = 320   // Audiophile quality
}

export interface StreamTemplate {
  id: string;
  name: string;
  description: string;
  quality: StreamQuality;
  max_listeners: number;
  format: string;
  use_case: string;
  config: StreamConfig;
}

export interface StreamConfig {
  stream_id?: string;
  user_id?: string;
  station_name: string;
  description?: string;
  genre: string;
  mount_point?: string;
  source_password?: string;
  quality: StreamQuality;
  max_listeners: number;
  server_host?: string;
  server_port?: number;
  protocol?: 'icecast' | 'shoutcast';
  format?: 'MP3' | 'OGG' | 'AAC';
  public_stream?: boolean;
  cost_per_hour?: number;
  bandwidth_limit?: number;
}

export interface StreamInfo {
  id: string;
  user_id: string;
  config: StreamConfig;
  status: StreamStatus;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  deactivated_at?: string;
  mount_point: string;
  source_password: string;
  connection_info: {
    server_host: string;
    server_port: number;
    mount_point: string;
    username: string;
    password: string;
    stream_url: string;
  };
  stats?: StreamStats;
  error_message?: string;
}

export interface StreamStats {
  current_listeners: number;
  peak_listeners: number;
  total_listeners: number;
  bytes_sent: number;
  uptime_seconds: number;
  start_time: string;
  last_update: string;
  bandwidth_usage: number;
  cost_current_session: number;
  listener_locations: Array<{
    country: string;
    count: number;
  }>;
}

export interface CreateStreamRequest {
  station_name: string;
  description?: string;
  genre: string;
  quality: StreamQuality;
  max_listeners: number;
  template_id?: string;
  custom_mount_point?: string;
}

export interface StreamOperation {
  success: boolean;
  message: string;
  stream_id?: string;
  error_code?: string;
  details?: any;
}

class StreamService {
  private baseURL = getServiceUrl('FASTAPI'); // FastAPI Stream Management API
  private authToken: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.authToken = localStorage.getItem('authToken');
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Make authenticated request to Stream API
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<{ data: T; success: boolean; error?: string }> {
    const url = `${this.baseURL}/api/v1/streams${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const responseData = await response.json();

      return {
        data: responseData,
        success: response.ok,
        error: response.ok ? undefined : responseData.message || responseData.detail
      };

    } catch (error) {
      console.error('Stream API request failed:', error);
      return {
        data: null as T,
        success: false,
        error: 'Network error'
      };
    }
  }

  // ===== Stream Management =====

  /**
   * Get available stream templates
   */
  async getStreamTemplates(): Promise<StreamTemplate[]> {
    const response = await this.request<StreamTemplate[]>('/templates');
    return response.success ? response.data : [];
  }

  /**
   * Create new stream
   */
  async createStream(request: CreateStreamRequest): Promise<StreamOperation> {
    try {
      const response = await this.request<StreamInfo>('', {
        method: 'POST',
        body: JSON.stringify(request)
      });

      if (response.success) {
        this.emit('streamCreated', response.data);
        return {
          success: true,
          message: 'Stream created successfully',
          stream_id: response.data.id,
          details: response.data
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to create stream',
          error_code: 'CREATE_FAILED'
        };
      }
    } catch (error) {
      console.error('Failed to create stream:', error);
      return {
        success: false,
        message: 'Network error occurred',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Get user's streams
   */
  async getUserStreams(): Promise<StreamInfo[]> {
    const response = await this.request<StreamInfo[]>('');
    return response.success ? response.data : [];
  }

  /**
   * Get specific stream info
   */
  async getStream(streamId: string): Promise<StreamInfo | null> {
    const response = await this.request<StreamInfo>(`/${streamId}`);
    return response.success ? response.data : null;
  }

  /**
   * Update stream configuration
   */
  async updateStream(streamId: string, updates: Partial<StreamConfig>): Promise<StreamOperation> {
    try {
      const response = await this.request<StreamInfo>(`/${streamId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      if (response.success) {
        this.emit('streamUpdated', response.data);
        return {
          success: true,
          message: 'Stream updated successfully',
          stream_id: streamId,
          details: response.data
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to update stream',
          error_code: 'UPDATE_FAILED'
        };
      }
    } catch (error) {
      console.error('Failed to update stream:', error);
      return {
        success: false,
        message: 'Network error occurred',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Delete stream
   */
  async deleteStream(streamId: string): Promise<StreamOperation> {
    try {
      const response = await this.request<{ message: string }>(`/${streamId}`, {
        method: 'DELETE'
      });

      if (response.success) {
        this.emit('streamDeleted', streamId);
        return {
          success: true,
          message: 'Stream deleted successfully',
          stream_id: streamId
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to delete stream',
          error_code: 'DELETE_FAILED'
        };
      }
    } catch (error) {
      console.error('Failed to delete stream:', error);
      return {
        success: false,
        message: 'Network error occurred', 
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  // ===== Stream Operations =====

  /**
   * Activate stream for broadcasting
   */
  async activateStream(streamId: string): Promise<StreamOperation> {
    try {
      const response = await this.request<{ message: string; stream_info: StreamInfo }>(`/${streamId}/activate`, {
        method: 'POST'
      });

      if (response.success) {
        this.emit('streamActivated', response.data.stream_info);
        return {
          success: true,
          message: 'Stream activated successfully',
          stream_id: streamId,
          details: response.data.stream_info
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to activate stream',
          error_code: 'ACTIVATION_FAILED'
        };
      }
    } catch (error) {
      console.error('Failed to activate stream:', error);
      return {
        success: false,
        message: 'Network error occurred',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Deactivate stream
   */
  async deactivateStream(streamId: string): Promise<StreamOperation> {
    try {
      const response = await this.request<{ message: string }>(`/${streamId}/deactivate`, {
        method: 'POST'
      });

      if (response.success) {
        this.emit('streamDeactivated', streamId);
        return {
          success: true,
          message: 'Stream deactivated successfully',
          stream_id: streamId
        };
      } else {
        return {
          success: false,
          message: response.error || 'Failed to deactivate stream',
          error_code: 'DEACTIVATION_FAILED'
        };
      }
    } catch (error) {
      console.error('Failed to deactivate stream:', error);
      return {
        success: false,
        message: 'Network error occurred',
        error_code: 'NETWORK_ERROR'
      };
    }
  }

  // ===== Stream Status & Analytics =====

  /**
   * Get real-time stream status
   */
  async getStreamStatus(streamId: string): Promise<StreamStats | null> {
    const response = await this.request<StreamStats>(`/${streamId}/status`);
    
    if (response.success) {
      this.emit('streamStatusUpdated', { streamId, stats: response.data });
      return response.data;
    }
    
    return null;
  }

  /**
   * Get stream analytics
   */
  async getStreamAnalytics(streamId: string, period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<any> {
    const response = await this.request(`/${streamId}/analytics?period=${period}`);
    return response.success ? response.data : null;
  }

  /**
   * Get suggested mount points
   */
  async getSuggestedMountPoints(baseName?: string): Promise<string[]> {
    const endpoint = baseName ? `/available-mounts?base=${encodeURIComponent(baseName)}` : '/available-mounts';
    const response = await this.request<string[]>(endpoint);
    return response.success ? response.data : [];
  }

  // ===== Real-time Updates =====

  /**
   * Start monitoring stream status (polling)
   */
  startStatusMonitoring(streamId: string, intervalMs: number = 5000): () => void {
    const interval = setInterval(async () => {
      await this.getStreamStatus(streamId);
    }, intervalMs);

    return () => clearInterval(interval);
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in stream event listener for ${event}:`, error);
        }
      });
    }
  }

  // ===== Utility Methods =====

  /**
   * Format stream URL for DJ software
   */
  getStreamUrl(streamInfo: StreamInfo): string {
    const { connection_info } = streamInfo;
    return `http://${connection_info.server_host}:${connection_info.server_port}${connection_info.mount_point}`;
  }

  /**
   * Get DJ setup instructions
   */
  getDJSetupInstructions(streamInfo: StreamInfo): {
    server: string;
    port: number;
    mount: string;
    username: string;
    password: string;
    format: string;
    bitrate: number;
  } {
    return {
      server: streamInfo.connection_info.server_host,
      port: streamInfo.connection_info.server_port,
      mount: streamInfo.connection_info.mount_point,
      username: streamInfo.connection_info.username,
      password: streamInfo.connection_info.password,
      format: streamInfo.config.format || 'MP3',
      bitrate: streamInfo.config.quality
    };
  }

  /**
   * Calculate estimated costs
   */
  calculateEstimatedCost(quality: StreamQuality, maxListeners: number, hoursPerDay: number): {
    hourly: number;
    daily: number;
    monthly: number;
  } {
    // Base cost calculation (placeholder - should be configurable)
    const baseCostPerListener = 0.01; // $0.01 per listener per hour
    const qualityMultiplier = quality / 128; // Quality factor
    
    const hourly = maxListeners * baseCostPerListener * qualityMultiplier;
    const daily = hourly * hoursPerDay;
    const monthly = daily * 30;

    return { hourly, daily, monthly };
  }

  /**
   * Validate stream configuration
   */
  validateStreamConfig(config: Partial<StreamConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.station_name || config.station_name.trim().length < 3) {
      errors.push('Station name must be at least 3 characters long');
    }

    if (!config.genre || config.genre.trim().length === 0) {
      errors.push('Genre is required');
    }

    if (!config.quality || ![64, 128, 192, 320].includes(config.quality)) {
      errors.push('Invalid quality setting');
    }

    if (!config.max_listeners || config.max_listeners < 1 || config.max_listeners > 10000) {
      errors.push('Max listeners must be between 1 and 10,000');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get stream status color for UI
   */
  getStatusColor(status: StreamStatus): string {
    switch (status) {
      case StreamStatus.ACTIVE:
        return '#28a745'; // Green
      case StreamStatus.READY:
        return '#17a2b8'; // Blue
      case StreamStatus.PENDING:
        return '#ffc107'; // Yellow
      case StreamStatus.INACTIVE:
        return '#6c757d'; // Gray
      case StreamStatus.ERROR:
        return '#dc3545'; // Red
      case StreamStatus.SUSPENDED:
        return '#fd7e14'; // Orange
      case StreamStatus.DELETED:
        return '#343a40'; // Dark gray
      default:
        return '#6c757d';
    }
  }
}

// Singleton instance
export const streamService = new StreamService();
export default StreamService;