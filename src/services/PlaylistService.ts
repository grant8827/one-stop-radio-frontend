/**
 * Playlist Service
 * Handles playlist management, track operations, and backend integration
 */

import { Track, Playlist } from '../components/MusicPlaylist';
import { getServiceUrl, isServiceAvailable } from './BackendConfig';

export interface PlaylistStats {
  totalTracks: number;
  totalDuration: number;
  genres: { [key: string]: number };
  averageBPM: number;
  keyDistribution: { [key: string]: number };
}

export interface TrackAnalysis {
  bpm?: number;
  key?: string;
  energy?: number; // 0-1
  danceability?: number; // 0-1
  waveform?: number[];
  loudness?: number;
}

class PlaylistService {
  private playlists: Map<string, Playlist> = new Map();
  private currentPlaylist: string | null = null;
  private trackCache: Map<string, Track> = new Map();
  private baseUrl: string = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/api/music`;

  constructor() {
    this.loadPlaylistsFromStorage();
    this.loadFromDatabase();
  }

  // Database Integration Methods
  private async loadFromDatabase(): Promise<void> {
    try {
      if (await isServiceAvailable('API')) {
        // Load playlists from database
        const playlistsResponse = await fetch(`${this.baseUrl}/playlists/`);
        if (playlistsResponse.ok) {
          const playlists: Playlist[] = await playlistsResponse.json();
          playlists.forEach(playlist => {
            playlist.createdAt = new Date(playlist.createdAt);
            playlist.updatedAt = new Date(playlist.updatedAt);
            playlist.tracks.forEach(track => {
              track.dateAdded = new Date(track.dateAdded);
            });
            this.playlists.set(playlist.id, playlist);
          });
        }

        // Load individual tracks
        const tracksResponse = await fetch(`${this.baseUrl}/tracks/`);
        if (tracksResponse.ok) {
          const tracks: Track[] = await tracksResponse.json();
          tracks.forEach(track => {
            track.dateAdded = new Date(track.dateAdded);
            this.trackCache.set(track.id, track);
          });
        }
      }
    } catch (error) {
      console.warn('Failed to load from database, using local storage:', error);
    }
  }

  private async saveTrackToDatabase(track: Track): Promise<void> {
    try {
      if (await isServiceAvailable('API')) {
        const response = await fetch(`${this.baseUrl}/tracks/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
            bpm: track.bpm,
            key: track.key,
            genre: track.genre,
            file_path: track.filePath,
            file_size: track.fileSize,
            cover_art: track.coverArt,
            rating: track.rating
          })
        });
        
        if (response.ok) {
          const savedTrack = await response.json();
          // Update local track with database ID
          track.id = savedTrack.id;
        }
      }
    } catch (error) {
      console.warn('Failed to save track to database:', error);
    }
  }

  private async savePlaylistToDatabase(playlist: Playlist): Promise<void> {
    try {
      if (await isServiceAvailable('API')) {
        const response = await fetch(`${this.baseUrl}/playlists/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: playlist.name,
            is_auto_mix: playlist.isAutoMix || false,
            track_ids: playlist.tracks.map(t => t.id)
          })
        });
        
        if (response.ok) {
          const savedPlaylist = await response.json();
          playlist.id = savedPlaylist.id;
        }
      }
    } catch (error) {
      console.warn('Failed to save playlist to database:', error);
    }
  }

  async deleteTrackFromDatabase(trackId: string): Promise<void> {
    try {
      if (await isServiceAvailable('API')) {
        await fetch(`${this.baseUrl}/tracks/${trackId}/`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('Failed to delete track from database:', error);
    }
  }

  private async deletePlaylistFromDatabase(playlistId: string): Promise<void> {
    try {
      if (await isServiceAvailable('API')) {
        await fetch(`${this.baseUrl}/playlists/${playlistId}/`, {
          method: 'DELETE'
        });
      }
    } catch (error) {
      console.warn('Failed to delete playlist from database:', error);
    }
  }

  // Playlist Management
  async createPlaylist(name: string, tracks: Track[] = []): Promise<Playlist> {
    const playlist: Playlist = {
      id: `playlist-${Date.now()}`,
      name,
      tracks: [...tracks],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.playlists.set(playlist.id, playlist);
    await this.savePlaylistsToStorage();

    // Sync with backend if available
    if (await isServiceAvailable('API')) {
      try {
        await this.syncPlaylistToBackend(playlist);
      } catch (error) {
        console.warn('Failed to sync playlist to backend:', error);
      }
    }

    return playlist;
  }

  async deletePlaylist(playlistId: string): Promise<boolean> {
    const deleted = this.playlists.delete(playlistId);
    if (deleted) {
      await this.savePlaylistsToStorage();
      
      // Sync with backend
      if (await isServiceAvailable('API')) {
        try {
          await this.deletePlaylistFromBackend(playlistId);
        } catch (error) {
          console.warn('Failed to delete playlist from backend:', error);
        }
      }
    }
    return deleted;
  }

  async updatePlaylist(playlistId: string, updates: Partial<Playlist>): Promise<Playlist | null> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return null;

    const updatedPlaylist = {
      ...playlist,
      ...updates,
      updatedAt: new Date()
    };

    this.playlists.set(playlistId, updatedPlaylist);
    await this.savePlaylistsToStorage();

    // Sync with backend
    if (await isServiceAvailable('API')) {
      try {
        await this.syncPlaylistToBackend(updatedPlaylist);
      } catch (error) {
        console.warn('Failed to update playlist on backend:', error);
      }
    }

    return updatedPlaylist;
  }

  // Track Management
  async addTrackToPlaylist(playlistId: string, track: Track): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;

    // Avoid duplicates
    if (playlist.tracks.some(t => t.id === track.id)) {
      return false;
    }

    playlist.tracks.push(track);
    playlist.updatedAt = new Date();

    this.playlists.set(playlistId, playlist);
    this.trackCache.set(track.id, track);
    
    await this.savePlaylistsToStorage();
    return true;
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist) return false;

    const initialLength = playlist.tracks.length;
    playlist.tracks = playlist.tracks.filter(track => track.id !== trackId);
    
    if (playlist.tracks.length < initialLength) {
      playlist.updatedAt = new Date();
      this.playlists.set(playlistId, playlist);
      await this.savePlaylistsToStorage();

      // Sync with database
      try {
        if (await isServiceAvailable('API')) {
          await fetch(`${this.baseUrl}/playlists/${playlistId}/tracks/${trackId}/`, {
            method: 'DELETE'
          });
        }
      } catch (error) {
        console.warn('Failed to remove track from playlist in database:', error);
      }

      return true;
    }

    return false;
  }

  async reorderTracks(playlistId: string, fromIndex: number, toIndex: number): Promise<boolean> {
    const playlist = this.playlists.get(playlistId);
    if (!playlist || fromIndex < 0 || toIndex < 0 || fromIndex >= playlist.tracks.length || toIndex >= playlist.tracks.length) {
      return false;
    }

    const tracks = [...playlist.tracks];
    const [movedTrack] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, movedTrack);

    playlist.tracks = tracks;
    playlist.updatedAt = new Date();
    
    this.playlists.set(playlistId, playlist);
    await this.savePlaylistsToStorage();
    return true;
  }

  // File Upload and Processing
  async uploadTrack(file: File): Promise<Track | null> {
    try {
      // Basic file validation
      if (!file.type.startsWith('audio/')) {
        throw new Error('Invalid file type. Please upload an audio file.');
      }

      // Create track object with basic info
      const track: Track = {
        id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: this.extractTitleFromFilename(file.name),
        artist: 'Unknown Artist',
        duration: 0, // Will be analyzed
        dateAdded: new Date(),
        playCount: 0,
        fileSize: file.size
      };

      // Try to extract metadata from file
      const metadata = await this.extractAudioMetadata(file);
      if (metadata) {
        Object.assign(track, metadata);
      }

      // Upload to backend if available
      if (await isServiceAvailable('API')) {
        try {
          const uploadedTrack = await this.uploadTrackToBackend(file, track);
          return uploadedTrack;
        } catch (error) {
          console.warn('Backend upload failed, using local file:', error);
        }
      }

      // Create local URL for playback
      track.filePath = URL.createObjectURL(file);
      this.trackCache.set(track.id, track);

      return track;
    } catch (error) {
      console.error('Failed to upload track:', error);
      return null;
    }
  }

  // Audio Analysis
  async analyzeTrack(track: Track): Promise<TrackAnalysis | null> {
    try {
      // Use C++ Media Server for analysis if available
      if (await isServiceAvailable('MEDIA')) {
        const analysis = await this.analyzeTrackWithBackend(track);
        if (analysis) return analysis;
      }

      // Fallback to Web Audio API analysis
      return await this.analyzeTrackWithWebAudio(track);
    } catch (error) {
      console.error('Failed to analyze track:', error);
      return null;
    }
  }

  // Search and Filtering
  searchTracks(query: string, playlistId?: string): Track[] {
    const tracks = playlistId 
      ? this.getPlaylist(playlistId)?.tracks || []
      : Array.from(this.trackCache.values());

    if (!query.trim()) return tracks;

    const searchTerms = query.toLowerCase().split(' ');
    
    return tracks.filter(track => {
      const searchText = [
        track.title,
        track.artist,
        track.album || '',
        track.genre || '',
        track.key || '',
        track.bpm?.toString() || ''
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchText.includes(term));
    });
  }

  filterTracksByBPM(minBPM: number, maxBPM: number, playlistId?: string): Track[] {
    const tracks = playlistId 
      ? this.getPlaylist(playlistId)?.tracks || []
      : Array.from(this.trackCache.values());

    return tracks.filter(track => 
      track.bpm && track.bpm >= minBPM && track.bpm <= maxBPM
    );
  }

  filterTracksByKey(key: string, playlistId?: string): Track[] {
    const tracks = playlistId 
      ? this.getPlaylist(playlistId)?.tracks || []
      : Array.from(this.trackCache.values());

    return tracks.filter(track => track.key === key);
  }

  // Statistics and Analytics
  getPlaylistStats(playlistId: string): PlaylistStats | null {
    const playlist = this.getPlaylist(playlistId);
    if (!playlist) return null;

    const stats: PlaylistStats = {
      totalTracks: playlist.tracks.length,
      totalDuration: playlist.tracks.reduce((sum, track) => sum + track.duration, 0),
      genres: {},
      averageBPM: 0,
      keyDistribution: {}
    };

    let bpmSum = 0;
    let bpmCount = 0;

    playlist.tracks.forEach(track => {
      // Genre distribution
      if (track.genre) {
        stats.genres[track.genre] = (stats.genres[track.genre] || 0) + 1;
      }

      // BPM average
      if (track.bpm) {
        bpmSum += track.bpm;
        bpmCount++;
      }

      // Key distribution
      if (track.key) {
        stats.keyDistribution[track.key] = (stats.keyDistribution[track.key] || 0) + 1;
      }
    });

    stats.averageBPM = bpmCount > 0 ? Math.round(bpmSum / bpmCount) : 0;

    return stats;
  }

  // Getters
  getAllPlaylists(): Playlist[] {
    return Array.from(this.playlists.values());
  }

  async getAllTracks(): Promise<Track[]> {
    try {
      if (await isServiceAvailable('API')) {
        const response = await fetch(`${this.baseUrl}/tracks/`);
        if (response.ok) {
          const tracks: Track[] = await response.json();
          return tracks.map(track => ({
            ...track,
            dateAdded: new Date(track.dateAdded)
          }));
        }
      }
      // Fallback to local cache
      return Array.from(this.trackCache.values());
    } catch (error) {
      console.warn('Failed to fetch tracks from database:', error);
      return Array.from(this.trackCache.values());
    }
  }

  getPlaylist(playlistId: string): Playlist | null {
    return this.playlists.get(playlistId) || null;
  }

  getCurrentPlaylist(): Playlist | null {
    return this.currentPlaylist ? this.getPlaylist(this.currentPlaylist) : null;
  }

  setCurrentPlaylist(playlistId: string): boolean {
    if (this.playlists.has(playlistId)) {
      this.currentPlaylist = playlistId;
      return true;
    }
    return false;
  }

  getTrack(trackId: string): Track | null {
    return this.trackCache.get(trackId) || null;
  }

  // Private Methods
  private async savePlaylistsToStorage(): Promise<void> {
    try {
      const playlistsData = Array.from(this.playlists.entries());
      localStorage.setItem('onestopradio-playlists', JSON.stringify(playlistsData));
    } catch (error) {
      console.error('Failed to save playlists to storage:', error);
    }
  }

  private loadPlaylistsFromStorage(): void {
    try {
      const stored = localStorage.getItem('onestopradio-playlists');
      if (stored) {
        const playlistsData = JSON.parse(stored) as [string, Playlist][];
        this.playlists = new Map(playlistsData);
        
        // Rebuild track cache
        this.playlists.forEach(playlist => {
          playlist.tracks.forEach(track => {
            this.trackCache.set(track.id, track);
          });
        });
      }
    } catch (error) {
      console.error('Failed to load playlists from storage:', error);
    }
  }

  private extractTitleFromFilename(filename: string): string {
    // Remove extension and clean up common patterns
    let title = filename.replace(/\.[^/.]+$/, ''); // Remove extension
    title = title.replace(/^\d+[\s\-.]*/, ''); // Remove track numbers
    title = title.replace(/[-_]/g, ' '); // Replace dashes and underscores
    title = title.replace(/\s+/g, ' ').trim(); // Clean up spaces
    
    return title || 'Unknown Track';
  }

  private async extractAudioMetadata(file: File): Promise<Partial<Track> | null> {
    // In a real implementation, you'd use a library like music-metadata
    // For now, we'll return basic info based on file properties
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        resolve({
          duration: Math.round(audio.duration) || 180
        });
        URL.revokeObjectURL(audio.src);
      };
      
      audio.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(audio.src);
      };
      
      audio.src = URL.createObjectURL(file);
    });
  }

  private async syncPlaylistToBackend(playlist: Playlist): Promise<void> {
    if (!await isServiceAvailable('API')) return;

    const response = await fetch(`${getServiceUrl('API')}/api/v1/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      },
      body: JSON.stringify({
        id: playlist.id,
        name: playlist.name,
        tracks: playlist.tracks.map(t => ({ id: t.id, title: t.title, artist: t.artist })),
        created_at: playlist.createdAt.toISOString(),
        updated_at: playlist.updatedAt.toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to sync playlist: ${response.statusText}`);
    }
  }

  private async deletePlaylistFromBackend(playlistId: string): Promise<void> {
    if (!await isServiceAvailable('API')) return;

    const response = await fetch(`${getServiceUrl('API')}/api/v1/playlists/${playlistId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete playlist: ${response.statusText}`);
    }
  }

  private async uploadTrackToBackend(file: File, track: Track): Promise<Track> {
    if (!await isServiceAvailable('API')) {
      throw new Error('FastAPI service not available');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', track.title);
    formData.append('artist', track.artist);
    if (track.album) formData.append('album', track.album);
    if (track.genre) formData.append('genre', track.genre);

    const response = await fetch(`${this.baseUrl}/tracks/upload/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    const uploadedTrack: Track = {
      id: result.track.id,
      title: result.track.title,
      artist: result.track.artist,
      album: result.track.album,
      duration: result.track.duration,
      bpm: result.track.bpm,
      key: result.track.key,
      genre: result.track.genre,
      filePath: result.file_url,
      fileSize: result.track.file_size,
      coverArt: result.track.cover_art,
      dateAdded: new Date(result.track.created_at),
      playCount: result.track.play_count,
      rating: result.track.rating
    };

    return uploadedTrack;
  }

  private async analyzeTrackWithBackend(track: Track): Promise<TrackAnalysis | null> {
    if (!await isServiceAvailable('MEDIA')) return null;

    try {
      const response = await fetch(`${getServiceUrl('MEDIA')}/audio/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: track.id, file_path: track.filePath })
      });

      if (!response.ok) return null;

      const analysis = await response.json();
      return {
        bpm: analysis.bpm,
        key: analysis.key,
        energy: analysis.energy,
        danceability: analysis.danceability,
        waveform: analysis.waveform,
        loudness: analysis.loudness
      };
    } catch (error) {
      console.error('Backend analysis failed:', error);
      return null;
    }
  }

  private async analyzeTrackWithWebAudio(track: Track): Promise<TrackAnalysis | null> {
    // Basic Web Audio API analysis - simplified for demo
    try {
      if (!track.filePath) return null;

      const audioContext = new AudioContext();
      const response = await fetch(track.filePath);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Simple waveform extraction
      const channelData = audioBuffer.getChannelData(0);
      const samples = Math.min(1000, channelData.length);
      const waveform: number[] = [];

      for (let i = 0; i < samples; i++) {
        const index = Math.floor((i / samples) * channelData.length);
        waveform.push(channelData[index]);
      }

      return {
        waveform,
        loudness: this.calculateRMS(channelData)
      };
    } catch (error) {
      console.error('Web Audio analysis failed:', error);
      return null;
    }
  }

  private calculateRMS(channelData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    return Math.sqrt(sum / channelData.length);
  }
}

// Export singleton instance
export const playlistService = new PlaylistService();