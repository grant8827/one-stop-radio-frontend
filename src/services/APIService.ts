/**
 * APIService - RESTful communication with Python backend
 * Handles user authentication, station management, and asset storage
 */

import { BACKEND_CONFIG, getServiceUrl } from './BackendConfig';

// API Base URLs from environment variables
const getApiUrls = () => ({
  fastapi: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002',
  nodejs: process.env.REACT_APP_SIGNALING_URL || 'http://localhost:5001', 
  audio: process.env.REACT_APP_AUDIO_URL || 'http://localhost:5001',
  cpp: process.env.REACT_APP_CPP_API_URL || 'http://localhost:8080',
  websocket: process.env.REACT_APP_WS_URL || 'ws://localhost:5001'
});

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface Station {
  id: string;
  userId: string;
  name: string;
  description?: string;
  genre: string;
  logo?: string;
  coverImage?: string;
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
    lastStream?: Date;
  };
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  station?: Station;
  expiresAt: Date;
}

export interface StreamSession {
  id: string;
  stationId: string;
  startTime: Date;
  endTime?: Date;
  peakListeners: number;
  avgListeners: number;
  duration: number;
  recordingUrl?: string;
  metadata: {
    title?: string;
    genre?: string;
    tracks?: string[];
  };
}

class APIService {
  private baseURL = getApiUrls().fastapi; // Python FastAPI backend
  private signalingURL = getApiUrls().nodejs; // Node.js signaling service
  private authToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load stored tokens
    this.authToken = localStorage.getItem('authToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Set authentication tokens
   */
  setTokens(token: string, refresh: string): void {
    this.authToken = token;
    this.refreshToken = refresh;
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refresh);
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.authToken = null;
    this.refreshToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; success: boolean; error?: string }> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const responseData = await response.json();

      if (response.status === 401 && this.refreshToken) {
        // Try to refresh token
        const refreshed = await this.refreshAuthToken();
        if (refreshed) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${this.authToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          const retryData = await retryResponse.json();
          
          return {
            data: retryData,
            success: retryResponse.ok,
            error: retryResponse.ok ? undefined : retryData.message
          };
        }
      }

      return {
        data: responseData,
        success: response.ok,
        error: response.ok ? undefined : responseData.message
      };

    } catch (error) {
      console.error('API request failed:', error);
      return {
        data: null as T,
        success: false,
        error: 'Network error'
      };
    }
  }

  // ===== Authentication =====

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse | null> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success && response.data) {
      this.setTokens(response.data.token, response.data.refreshToken);
      return response.data;
    }

    return null;
  }

  /**
   * Register new user
   */
  async register(userData: {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
  }): Promise<AuthResponse | null> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });

    if (response.success && response.data) {
      this.setTokens(response.data.token, response.data.refreshToken);
      return response.data;
    }

    return null;
  }

  /**
   * Refresh authentication token
   */
  async refreshAuthToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    const response = await this.request<{ token: string; expiresAt: Date }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    if (response.success && response.data) {
      this.authToken = response.data.token;
      localStorage.setItem('authToken', response.data.token);
      return true;
    }

    this.clearTokens();
    return false;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (this.authToken) {
      await this.request('/auth/logout', { method: 'POST' });
    }
    this.clearTokens();
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User | null> {
    const response = await this.request<User>('/auth/me');
    return response.success ? response.data : null;
  }

  // ===== Station Management =====

  /**
   * Get user's station
   * Currently using Node.js backend until Python API is ready
   */
  async getStation(): Promise<Station | null> {
    try {
      // Temporarily use Node.js backend for station data
      const response = await fetch(`${this.signalingURL}${BACKEND_CONFIG.SIGNALING.ENDPOINTS.STATION_INFO}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Failed to get station from Node.js backend:', error);
    }
    
    // Fallback to Python API
    const response = await this.request<Station>('/stations/me');
    return response.success ? response.data : null;
  }

  /**
   * Create new station
   */
  async createStation(stationData: {
    name: string;
    description?: string;
    genre: string;
  }): Promise<Station | null> {
    const response = await this.request<Station>('/stations', {
      method: 'POST',
      body: JSON.stringify(stationData)
    });
    return response.success ? response.data : null;
  }

  /**
   * Update station information
   */
  async updateStation(updates: Partial<Omit<Station, 'id' | 'userId' | 'stats'>>): Promise<Station | null> {
    const response = await this.request<Station>('/stations/me', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return response.success ? response.data : null;
  }

  /**
   * Upload station logo
   */
  async uploadLogo(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch(`${this.baseURL}/stations/me/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const data = await response.json();
      return response.ok ? data.logoUrl : null;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      return null;
    }
  }

  /**
   * Upload cover image
   */
  async uploadCoverImage(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('cover', file);

    try {
      const response = await fetch(`${this.baseURL}/stations/me/cover`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        },
        body: formData
      });

      const data = await response.json();
      return response.ok ? data.coverUrl : null;
    } catch (error) {
      console.error('Failed to upload cover image:', error);
      return null;
    }
  }

  // ===== Streaming Sessions =====

  /**
   * Start new streaming session
   */
  async startStreamSession(metadata?: {
    title?: string;
    genre?: string;
  }): Promise<StreamSession | null> {
    const response = await this.request<StreamSession>('/streams/start', {
      method: 'POST',
      body: JSON.stringify(metadata || {})
    });
    return response.success ? response.data : null;
  }

  /**
   * End streaming session
   */
  async endStreamSession(sessionId: string, stats: {
    duration: number;
    peakListeners: number;
    avgListeners: number;
  }): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/streams/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify(stats)
    });
    return response.success;
  }

  /**
   * Update stream metadata during session
   */
  async updateStreamMetadata(sessionId: string, metadata: {
    title?: string;
    nowPlaying?: string;
    genre?: string;
  }): Promise<boolean> {
    const response = await this.request<{ success: boolean }>(`/streams/${sessionId}/metadata`, {
      method: 'PUT',
      body: JSON.stringify(metadata)
    });
    return response.success;
  }

  /**
   * Get stream history
   * Currently using Node.js backend until Python API is ready
   */
  async getStreamHistory(limit = 20, offset = 0): Promise<StreamSession[]> {
    try {
      // Temporarily use Node.js backend for stream history
      const response = await fetch(`${this.signalingURL}${BACKEND_CONFIG.SIGNALING.ENDPOINTS.STREAM_HISTORY}`);
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Failed to get stream history from Node.js backend:', error);
    }
    
    // Fallback to Python API
    const response = await this.request<StreamSession[]>(`/streams/history?limit=${limit}&offset=${offset}`);
    return response.success ? response.data : [];
  }

  // ===== Analytics =====

  /**
   * Get station statistics
   */
  async getStationStats(period: 'day' | 'week' | 'month' | 'year' = 'week'): Promise<any> {
    const response = await this.request(`/analytics/station?period=${period}`);
    return response.success ? response.data : null;
  }

  /**
   * Get listener demographics
   */
  async getListenerDemographics(): Promise<any> {
    const response = await this.request('/analytics/demographics');
    return response.success ? response.data : null;
  }

  // ===== Social Media Integration =====

  /**
   * Connect social media account
   */
  async connectSocialAccount(platform: string, authCode: string): Promise<boolean> {
    const response = await this.request<{ success: boolean }>('/social/connect', {
      method: 'POST',
      body: JSON.stringify({ platform, authCode })
    });
    return response.success;
  }

  /**
   * Get social media streaming keys
   */
  async getSocialStreamingKeys(): Promise<Record<string, string>> {
    const response = await this.request<Record<string, string>>('/social/keys');
    return response.success ? response.data : {};
  }

  // ===== Getters =====

  get isAuthenticated(): boolean {
    return !!this.authToken;
  }

  get currentToken(): string | null {
    return this.authToken;
  }
}

// Singleton instance
export const apiService = new APIService();
export default APIService;