import { backendService } from './BackendIntegrationService';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  djName?: string;
  genre?: string;
  streamTitle?: string;
  createdAt: string;
  trialExpiresAt?: string;
  isPremium?: boolean;
}

export interface StreamCredentials {
  host: string;
  port: number;
  sourcePassword: string;
  adminPassword: string;
  streamUrl: string;
  streamId: string;
  streamTitle: string;
  maxListeners: number;
  bitrate: number;
  genre?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private authToken: string | null = null;

  constructor() {
    // Load saved auth data on initialization
    this.loadSavedAuth();
  }

  private loadSavedAuth(): void {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        this.authToken = token;
        this.currentUser = JSON.parse(userData);
      } catch (error) {
        console.error('Failed to load saved auth data:', error);
        this.clearAuth();
      }
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string; message?: string } | null> {
    try {
      // Try backend login first
      const result = await backendService.login(email, password);
      
      if (result) {
        // Check if trial has expired
        if (result.user.trialExpiresAt && !result.user.isPremium) {
          const trialExpiry = new Date(result.user.trialExpiresAt);
          const now = new Date();
          
          if (now > trialExpiry) {
            return {
              user: result.user,
              token: result.token,
              message: 'Your free trial has expired. Please upgrade to premium to continue using OneStopRadio.'
            };
          }
        }
        
        this.authToken = result.token;
        this.currentUser = result.user;
        
        // Generate streaming credentials
        await this.generateStreamingCredentials(result.user);
        
        return result;
      }
      
      // Fallback to demo login for development
      if (email === 'demo@onestopradio.com' && password === 'demo123') {
        const demoUser: User = {
          id: 'demo_user_123',
          email: 'demo@onestopradio.com',
          firstName: 'Demo',
          lastName: 'User',
          djName: 'DJ Demo',
          genre: 'Electronic',
          streamTitle: 'Demo Stream',
          createdAt: new Date().toISOString(),
          trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          isPremium: false
        };
        
        const demoToken = 'demo_token_123';
        
        this.authToken = demoToken;
        this.currentUser = demoUser;
        
        // Store auth data
        localStorage.setItem('authToken', demoToken);
        localStorage.setItem('userData', JSON.stringify(demoUser));
        
        // Generate streaming credentials
        await this.generateStreamingCredentials(demoUser);
        
        return { user: demoUser, token: demoToken };
      }
      
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  }

  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    djName?: string;
    genre?: string;
    streamTitle?: string;
  }): Promise<{ user: User; token: string } | null> {
    try {
      // Create trial expiry date (1 month from now)
      const trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // For now, create a demo user (replace with actual API call)
      const newUser: User = {
        id: Math.random().toString(36).substring(2, 15),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        djName: userData.djName,
        genre: userData.genre,
        streamTitle: userData.streamTitle,
        createdAt: new Date().toISOString(),
        trialExpiresAt: trialExpiresAt,
        isPremium: false
      };
      
      const token = 'token_' + newUser.id;
      
      this.authToken = token;
      this.currentUser = newUser;
      
      // Store auth data
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(newUser));
      
      // Generate streaming credentials
      await this.generateStreamingCredentials(newUser);
      
      return { user: newUser, token };
    } catch (error) {
      console.error('Registration error:', error);
      return null;
    }
  }

  private async generateStreamingCredentials(user: User): Promise<void> {
    const port = 8100 + Math.floor(Math.random() * 100);
    
    const streamCredentials: StreamCredentials = {
      host: 'stream.onestopradio.com',
      port: port,
      sourcePassword: Math.random().toString(36).substring(2, 15),
      adminPassword: Math.random().toString(36).substring(2, 15),
      streamUrl: `http://stream.onestopradio.com:${port}/live`,
      streamId: `stream_${user.id}`,
      streamTitle: user.streamTitle || `${user.djName || user.firstName}'s Stream`,
      maxListeners: 100,
      bitrate: 128,
      genre: user.genre
    };
    
    // Store streaming credentials
    localStorage.setItem('streamInfo', JSON.stringify(streamCredentials));
    
    console.log('🎵 Generated streaming credentials for user:', user.email);
    console.log('📡 Stream URL:', streamCredentials.streamUrl);
  }

  logout(): void {
    this.clearAuth();
  }

  private clearAuth(): void {
    this.currentUser = null;
    this.authToken = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('streamInfo');
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  isAuthenticated(): boolean {
    return this.authToken !== null && this.currentUser !== null;
  }

  isTrialExpired(): boolean {
    if (!this.currentUser || this.currentUser.isPremium) {
      return false;
    }
    
    if (this.currentUser.trialExpiresAt) {
      const trialExpiry = new Date(this.currentUser.trialExpiresAt);
      const now = new Date();
      return now > trialExpiry;
    }
    
    return false;
  }

  getTrialDaysRemaining(): number {
    if (!this.currentUser || this.currentUser.isPremium || !this.currentUser.trialExpiresAt) {
      return 0;
    }
    
    const trialExpiry = new Date(this.currentUser.trialExpiresAt);
    const now = new Date();
    const diffTime = trialExpiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  getStreamCredentials(): StreamCredentials | null {
    const streamInfo = localStorage.getItem('streamInfo');
    if (streamInfo) {
      try {
        return JSON.parse(streamInfo);
      } catch (error) {
        console.error('Failed to parse stream credentials:', error);
        return null;
      }
    }
    return null;
  }
}

export const authService = new AuthService();
export default authService;