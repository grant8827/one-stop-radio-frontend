/**
 * Playlist Management Context
 * Provides playlist state and operations throughout the DJ interface
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { playlistService } from '../services/PlaylistService';
import type { Track, Playlist, PlaylistStats } from '../components/MusicPlaylist';

interface PlaylistContextState {
  // Current state
  currentPlaylist: Playlist | null;
  allPlaylists: Playlist[];
  selectedTrack: Track | null;
  isLoading: boolean;
  error: string | null;

  // Player state
  isPlaying: boolean;
  currentTrackIndex: number;
  playMode: 'normal' | 'shuffle' | 'repeat' | 'repeat-one';
  
  // Deck state
  deckA: Track | null;
  deckB: Track | null;
}

interface PlaylistContextActions {
  // Playlist management
  createPlaylist: (name: string, tracks?: Track[]) => Promise<Playlist | null>;
  deletePlaylist: (playlistId: string) => Promise<boolean>;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => Promise<Playlist | null>;
  selectPlaylist: (playlistId: string) => boolean;
  getPlaylistStats: (playlistId: string) => PlaylistStats | null;

  // Track management
  addTrackToPlaylist: (playlistId: string, track: Track) => Promise<boolean>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<boolean>;
  reorderTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<boolean>;
  uploadTrack: (file: File) => Promise<Track | null>;
  analyzeTrack: (track: Track) => Promise<void>;

  // Search and filter
  searchTracks: (query: string, playlistId?: string) => Track[];
  filterByBPM: (minBPM: number, maxBPM: number, playlistId?: string) => Track[];
  filterByKey: (key: string, playlistId?: string) => Track[];

  // Player controls
  loadToDeck: (track: Track, deckId: 'A' | 'B') => void;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setPlayMode: (mode: 'normal' | 'shuffle' | 'repeat' | 'repeat-one') => void;
  selectTrack: (track: Track | null) => void;

  // Utility
  refreshPlaylists: () => Promise<void>;
}

type PlaylistContextType = PlaylistContextState & PlaylistContextActions;

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylist = (): PlaylistContextType => {
  const context = useContext(PlaylistContext);
  if (!context) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};

interface PlaylistProviderProps {
  children: ReactNode;
}

export const PlaylistProvider: React.FC<PlaylistProviderProps> = ({ children }) => {
  // State
  const [state, setState] = useState<PlaylistContextState>({
    currentPlaylist: null,
    allPlaylists: [],
    selectedTrack: null,
    isLoading: false,
    error: null,
    isPlaying: false,
    currentTrackIndex: -1,
    playMode: 'normal',
    deckA: null,
    deckB: null
  });

  // Initialize playlists on mount
  useEffect(() => {
    refreshPlaylists();
  }, []);

  // Actions
  const refreshPlaylists = async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const playlists = playlistService.getAllPlaylists();
      const currentPlaylist = playlistService.getCurrentPlaylist();
      
      setState(prev => ({
        ...prev,
        allPlaylists: playlists,
        currentPlaylist: currentPlaylist,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load playlists',
        isLoading: false
      }));
    }
  };

  const createPlaylist = async (name: string, tracks: Track[] = []): Promise<Playlist | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const newPlaylist = await playlistService.createPlaylist(name, tracks);
      await refreshPlaylists();
      return newPlaylist;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create playlist',
        isLoading: false
      }));
      return null;
    }
  };

  const deletePlaylist = async (playlistId: string): Promise<boolean> => {
    try {
      const success = await playlistService.deletePlaylist(playlistId);
      if (success) {
        await refreshPlaylists();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete playlist'
      }));
      return false;
    }
  };

  const updatePlaylist = async (playlistId: string, updates: Partial<Playlist>): Promise<Playlist | null> => {
    try {
      const updatedPlaylist = await playlistService.updatePlaylist(playlistId, updates);
      if (updatedPlaylist) {
        await refreshPlaylists();
      }
      return updatedPlaylist;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update playlist'
      }));
      return null;
    }
  };

  const selectPlaylist = (playlistId: string): boolean => {
    const success = playlistService.setCurrentPlaylist(playlistId);
    if (success) {
      const playlist = playlistService.getPlaylist(playlistId);
      setState(prev => ({ ...prev, currentPlaylist: playlist }));
    }
    return success;
  };

  const addTrackToPlaylist = async (playlistId: string, track: Track): Promise<boolean> => {
    try {
      const success = await playlistService.addTrackToPlaylist(playlistId, track);
      if (success) {
        await refreshPlaylists();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add track to playlist'
      }));
      return false;
    }
  };

  const removeTrackFromPlaylist = async (playlistId: string, trackId: string): Promise<boolean> => {
    try {
      const success = await playlistService.removeTrackFromPlaylist(playlistId, trackId);
      if (success) {
        await refreshPlaylists();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove track from playlist'
      }));
      return false;
    }
  };

  const reorderTracks = async (playlistId: string, fromIndex: number, toIndex: number): Promise<boolean> => {
    try {
      const success = await playlistService.reorderTracks(playlistId, fromIndex, toIndex);
      if (success) {
        await refreshPlaylists();
      }
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reorder tracks'
      }));
      return false;
    }
  };

  const uploadTrack = async (file: File): Promise<Track | null> => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const track = await playlistService.uploadTrack(file);
      setState(prev => ({ ...prev, isLoading: false }));
      return track;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to upload track',
        isLoading: false
      }));
      return null;
    }
  };

  const analyzeTrack = async (track: Track): Promise<void> => {
    try {
      await playlistService.analyzeTrack(track);
      // Refresh playlists to get updated track info
      await refreshPlaylists();
    } catch (error) {
      console.warn('Track analysis failed:', error);
    }
  };

  const searchTracks = (query: string, playlistId?: string): Track[] => {
    return playlistService.searchTracks(query, playlistId);
  };

  const filterByBPM = (minBPM: number, maxBPM: number, playlistId?: string): Track[] => {
    return playlistService.filterTracksByBPM(minBPM, maxBPM, playlistId);
  };

  const filterByKey = (key: string, playlistId?: string): Track[] => {
    return playlistService.filterTracksByKey(key, playlistId);
  };

  const getPlaylistStats = (playlistId: string): PlaylistStats | null => {
    return playlistService.getPlaylistStats(playlistId);
  };

  const loadToDeck = (track: Track, deckId: 'A' | 'B'): void => {
    setState(prev => ({
      ...prev,
      deckA: deckId === 'A' ? track : prev.deckA,
      deckB: deckId === 'B' ? track : prev.deckB
    }));
    
    console.log(`Loaded "${track.title}" by ${track.artist} to Deck ${deckId}`);
  };

  const playTrack = (track: Track): void => {
    if (!state.currentPlaylist) return;
    
    const trackIndex = state.currentPlaylist.tracks.findIndex(t => t.id === track.id);
    setState(prev => ({
      ...prev,
      selectedTrack: track,
      currentTrackIndex: trackIndex,
      isPlaying: true
    }));
  };

  const pauseTrack = (): void => {
    setState(prev => ({ ...prev, isPlaying: false }));
  };

  const nextTrack = (): void => {
    if (!state.currentPlaylist || state.currentPlaylist.tracks.length === 0) return;

    let nextIndex: number;
    
    switch (state.playMode) {
      case 'shuffle':
        nextIndex = Math.floor(Math.random() * state.currentPlaylist.tracks.length);
        break;
      case 'repeat-one':
        nextIndex = state.currentTrackIndex;
        break;
      case 'repeat':
        nextIndex = (state.currentTrackIndex + 1) % state.currentPlaylist.tracks.length;
        break;
      case 'normal':
      default:
        nextIndex = state.currentTrackIndex + 1;
        if (nextIndex >= state.currentPlaylist.tracks.length) {
          setState(prev => ({ ...prev, isPlaying: false }));
          return;
        }
        break;
    }

    const nextTrack = state.currentPlaylist.tracks[nextIndex];
    setState(prev => ({
      ...prev,
      selectedTrack: nextTrack,
      currentTrackIndex: nextIndex,
      isPlaying: true
    }));
  };

  const previousTrack = (): void => {
    if (!state.currentPlaylist || state.currentPlaylist.tracks.length === 0) return;

    let prevIndex: number;
    
    if (state.playMode === 'shuffle') {
      prevIndex = Math.floor(Math.random() * state.currentPlaylist.tracks.length);
    } else {
      prevIndex = state.currentTrackIndex - 1;
      if (prevIndex < 0) {
        prevIndex = state.playMode === 'repeat' ? state.currentPlaylist.tracks.length - 1 : 0;
      }
    }

    const prevTrack = state.currentPlaylist.tracks[prevIndex];
    setState(prev => ({
      ...prev,
      selectedTrack: prevTrack,
      currentTrackIndex: prevIndex,
      isPlaying: true
    }));
  };

  const setPlayMode = (mode: 'normal' | 'shuffle' | 'repeat' | 'repeat-one'): void => {
    setState(prev => ({ ...prev, playMode: mode }));
  };

  const selectTrack = (track: Track | null): void => {
    setState(prev => ({ ...prev, selectedTrack: track }));
  };

  // Context value
  const contextValue: PlaylistContextType = {
    // State
    ...state,

    // Actions
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    selectPlaylist,
    getPlaylistStats,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderTracks,
    uploadTrack,
    analyzeTrack,
    searchTracks,
    filterByBPM,
    filterByKey,
    loadToDeck,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack,
    setPlayMode,
    selectTrack,
    refreshPlaylists
  };

  return (
    <PlaylistContext.Provider value={contextValue}>
      {children}
    </PlaylistContext.Provider>
  );
};

export default PlaylistProvider;