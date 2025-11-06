import React, { useState, useRef } from 'react';
import { Card } from 'react-bootstrap';
import { 
  Typography, 
  Box
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RepeatIcon from '@mui/icons-material/Repeat';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

import JogWheel from './JogWheel';
import Knob from './Knob';
import Fader from './Fader';
import Waveform from './Waveform';
import type { Track } from './MusicPlaylist';
import { usePlaylist } from '../contexts/PlaylistContext';

interface MixerChannelProps {
  channelId: string;
  label: string;
  track?: Track | null; // Add track prop for automatic loading
  onVolumeChange?: (volume: number) => void;
  onEQChange?: (band: string, value: number) => void;
  onCueToggle?: (enabled: boolean) => void;
  onPlayPause?: (playing: boolean) => void;
  onStop?: () => void;
  onLoop?: (enabled: boolean) => void;
  onLoad?: (file: File) => void;
  onStateChange?: (state: ChannelState) => void;
}

interface ChannelState {
  isPlaying: boolean;
  isLoading: boolean;
  isLooping: boolean;
  isCueEnabled: boolean;
  volume: number;
  eqHigh: number;
  eqMid: number;
  eqLow: number;
  gain: number;
  bpm: number;
  position: number;
  duration: number;
  loadedFile: string | null;
}

const MixerChannel: React.FC<MixerChannelProps> = ({
  channelId,
  label,
  track,
  onVolumeChange,
  onEQChange,
  onCueToggle,
  onPlayPause,
  onStop,
  onLoop,
  onLoad,
  onStateChange
}) => {
  // Get playlist context for deck management
  const { loadToDeck } = usePlaylist();

  const [state, setState] = useState<ChannelState>({
    isPlaying: false,
    isLoading: false,
    isLooping: false,
    isCueEnabled: false,
    volume: 75,
    eqHigh: 50,
    eqMid: 50,
    eqLow: 50,
    gain: 50,
    bpm: 128,
    position: 0,
    duration: 0,
    loadedFile: null
  });

  // Timer for updating playback position
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load audio file into channel
  const handleLoadFile = React.useCallback(async (file: File, trackName?: string) => {
    try {
      console.log(`🎵 Loading file "${file.name}" into channel ${channelId}`);
      console.log(`📊 File details:`, {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      });
      
      // Set loading state
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Check file size (limit to 50MB for web performance)
      if (file.size > 50 * 1024 * 1024) {
        throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please use files smaller than 50MB.`);
      }
      
      // Check if it's a supported audio format
      const supportedTypes = [
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 
        'audio/m4a', 'audio/aac', 'audio/webm', 'audio/flac'
      ];
      
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const supportedExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm', 'flac'];
      
      if (!supportedTypes.includes(file.type) && !supportedExtensions.includes(fileExtension || '')) {
        console.warn(`⚠️ Unsupported file type: ${file.type || 'unknown'} (${fileExtension})`);
        console.log(`ℹ️ Supported formats: ${supportedExtensions.join(', ')}`);
        // Continue anyway - browser might still support it
      }
      
      // Import AudioService for loading
      const { audioService } = await import('../services/AudioService');
      
      // Ensure audio context is initialized and channel is ready
      const initialized = await audioService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize audio system - please try clicking on the page first');
      }
      
      // Map channel ID to deck number for new API
      const deckNumber = channelId === 'channelA' ? 1 : 2;
      console.log(`📀 Loading to deck ${deckNumber} (${channelId})`);
      
      // Use the enhanced loadTrack method with C++ Media Server integration
      const success = await audioService.loadTrack(file, deckNumber);
      
      if (success) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          loadedFile: trackName || file.name,
          duration: 0 // Will be updated when file loads
        }));
        console.log(`✅ Successfully loaded "${file.name}" into channel ${channelId}`);
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        throw new Error('AudioService.loadTrack returned false - check console for details');
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error loading file "${file.name}" into channel ${channelId}:`, error);
      
      // Provide helpful error messages based on common issues
      let userMessage = `Failed to load "${trackName || file.name}"\n\n`;
      
      if (errorMessage.includes('decode')) {
        userMessage += `🎵 Audio Format Issue:\n• File format may not be supported by your browser\n• Try converting to MP3 or WAV format\n• Ensure file is not corrupted\n\n`;
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage += `🌐 Network Issue:\n• Check internet connection\n• File may be hosted on unreachable server\n• Try uploading file directly instead\n\n`;
      } else if (errorMessage.includes('too large')) {
        userMessage += `📁 File Size Issue:\n• File is too large for web playback\n• Try compressing the audio file\n• Maximum size: 50MB\n\n`;
      } else if (errorMessage.includes('initialize')) {
        userMessage += `🔊 Audio System Issue:\n• Click somewhere on the page first\n• Browser requires user interaction for audio\n• Check browser audio permissions\n\n`;
      } else {
        userMessage += `🔧 Technical Issue:\n• ${errorMessage}\n\n`;
      }
      
      userMessage += `💡 Suggestions:\n• Try the generated test tracks first (🎵 button)\n• Use MP3 or WAV format\n• Check browser console (F12) for details\n• Ensure file is a valid audio file`;
      
      alert(userMessage);
    }
  }, [channelId]);

  // Start/stop position timer
  React.useEffect(() => {
    if (state.isPlaying && state.duration > 0) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const newPosition = prev.position + 0.1;
          if (newPosition >= prev.duration) {
            if (prev.isLooping) {
              return { ...prev, position: 0 };
            } else {
              onStop?.();
              return { ...prev, isPlaying: false, position: 0 };
            }
          }
          return { ...prev, position: newPosition };
        });
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isPlaying, state.duration, state.isLooping, onStop]);

  // Auto-load track when assigned to channel
  React.useEffect(() => {
    if (track && track.filePath && track.id !== state.loadedFile) {
      console.log(`MixerChannel: Auto-loading track "${track.title}" into channel ${channelId}`);
      
      // Check if it's a URL or local file path
      const isUrl = track.filePath.startsWith('http://') || track.filePath.startsWith('https://');
      const isBlob = track.filePath.startsWith('blob:');
      
      if (isUrl || isBlob) {
        // Create a File object from the filePath for URLs/blobs
        fetch(track.filePath)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
          })
          .then(blob => {
            if (blob.size === 0) {
              throw new Error('File is empty or corrupted');
            }
            const file = new File([blob], track.title, { type: 'audio/mpeg' });
            handleLoadFile(file, track.title);
          })
          .catch(error => {
            console.error(`Failed to auto-load track "${track.title}":`, error);
            // Don't show alert for auto-load failures, just log
          });
      } else {
        console.warn(`Cannot auto-load track "${track.title}": Local file paths not supported in browser`);
        // For local paths, just update the UI to show the track name without loading
        setState(prev => ({ 
          ...prev, 
          loadedFile: track.title 
        }));
      }
    }
  }, [track, handleLoadFile, state.loadedFile, channelId]);

  // Notify parent of state changes
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);



  // Control handlers

  const handlePlayPause = async () => {
    if (!state.loadedFile) {
      console.warn(`No file loaded in channel ${channelId}`);
      alert('Please load an audio file first before playing.');
      return;
    }

    try {
      // Import AudioService for playback control
      const { audioService } = await import('../services/AudioService');
      
      // Ensure AudioService is properly initialized
      const initialized = await audioService.initialize();
      if (!initialized) {
        throw new Error('Failed to initialize audio system');
      }
      
      // Check audio context state first
      const contextState = (audioService as any).audioContext?.state;
      console.log(`Audio context state: ${contextState}`);
      
      // Ensure audio context is resumed (required after user gesture)
      await audioService.resumeContext();
      
      // Map channel ID to deck number
      const deckNumber = channelId === 'channelA' ? 1 : 2;
      console.log(`🎮 Toggling playback for deck ${deckNumber} (${channelId})`);
      
      // Ensure audio service is initialized before attempting playback
      try {
        await audioService.initialize();
        console.log('🎵 Audio service re-initialized for playback');
      } catch (error) {
        console.warn('⚠️ Could not initialize audio service:', error);
        alert('Audio initialization failed.\n\nPlease refresh the page and try again.\nTip: Make sure to click in the browser to activate audio.');
        return;
      }

      // Use enhanced deck-based playback control with C++ Media Server integration
      const success = await audioService.playPauseTrack(deckNumber);
      
      if (success) {
        const newPlaying = !state.isPlaying;
        setState(prev => ({ ...prev, isPlaying: newPlaying }));
        onPlayPause?.(newPlaying);
        
        console.log(`✅ Deck ${deckNumber} ${newPlaying ? 'playing' : 'paused'}`);
      } else {
        console.warn(`⚠️ Failed to toggle playback for deck ${deckNumber}`);
        
        // Enhanced debugging information
        console.log('🔍 Channel debug info:', {
          channelId,
          deckNumber,
          hasLoadedFile: !!state.loadedFile,
          loadedFile: state.loadedFile || 'none',
          isPlaying: state.isPlaying,
          volume: state.volume,
          isLoading: state.isLoading
        });
        
        alert(`Playbook control failed for channel ${channelId}.\n\nLoaded file: ${state.loadedFile || 'none'}\nCheck console for details.\nTip: Try clicking in browser first to activate audio context.`);
      }
      
    } catch (error) {
      const deckNumber = channelId === 'channelA' ? 1 : 2;
      console.error(`❌ Error toggling playback for deck ${deckNumber}:`, error);
      alert(`Playback error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleStop = async () => {
    try {
      // Import AudioService for stop control
      const { audioService } = await import('../services/AudioService');
      
      // Map channel ID to deck number
      const deckNumber = channelId === 'channelA' ? 1 : 2;
      console.log(`⏹️ Stopping deck ${deckNumber} (${channelId})`);
      
      // Use enhanced deck-based stop control with C++ Media Server integration
      const success = await audioService.stopTrack(deckNumber);
      
      if (success) {
        console.log(`✅ Deck ${deckNumber} stopped successfully`);
      } else {
        console.warn(`⚠️ Stop command may have failed for deck ${deckNumber}`);
      }
      
      // Update state regardless of success (UI should reflect stopped state)
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        position: 0 
      }));
      
      onStop?.();
      
    } catch (error) {
      const deckNumber = channelId === 'channelA' ? 1 : 2;
      console.error(`❌ Error stopping deck ${deckNumber}:`, error);
      // Still update state even if stop fails
      setState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        position: 0 
      }));
      onStop?.();
    }
  };

  const handleLoop = () => {
    const newLooping = !state.isLooping;
    setState(prev => ({ ...prev, isLooping: newLooping }));
    onLoop?.(newLooping);
  };

  const handleCue = () => {
    const newCue = !state.isCueEnabled;
    setState(prev => ({ ...prev, isCueEnabled: newCue }));
    onCueToggle?.(newCue);
  };

  // Volume and EQ handlers
  const handleVolumeChange = async (_: Event, value: number | number[]) => {
    const volume = Array.isArray(value) ? value[0] : value;
    setState(prev => ({ ...prev, volume }));
    
    try {
      const { audioService } = await import('../services/AudioService');
      audioService.setChannelVolume(channelId, volume);
    } catch (error) {
      console.error(`Error setting volume for channel ${channelId}:`, error);
    }
    
    onVolumeChange?.(volume);
  };



  const handleEQChange = (band: 'high' | 'mid' | 'low') => async (value: number) => {
    setState(prev => ({ ...prev, [`eq${band.charAt(0).toUpperCase() + band.slice(1)}`]: value }));
    
    try {
      const { audioService } = await import('../services/AudioService');
      const currentState = { ...state, [`eq${band.charAt(0).toUpperCase() + band.slice(1)}`]: value };
      audioService.setChannelEQ(channelId, {
        bass: currentState.eqLow,
        mid: currentState.eqMid,
        treble: currentState.eqHigh
      });
    } catch (error) {
      console.error(`Error setting EQ for channel ${channelId}:`, error);
    }
    
    onEQChange?.(band, value);
  };

  // Handle waveform seeking
  const handleWaveformSeek = (percentage: number) => {
    if (state.duration > 0) {
      // Convert percentage (0-100) to time position
      const newPosition = (percentage / 100) * state.duration;
      setState(prev => ({ ...prev, position: newPosition }));
    }
  };

  // Handle track loading from drag-drop
  const handleJogWheelTrackLoad = (track: Track) => {
    console.log(`🎵 MixerChannel: Loading track "${track.title}" from drag-drop into channel ${channelId}`);
    console.log('🔍 MixerChannel: Track data:', track);
    console.log('🔍 MixerChannel: Available track properties:', Object.keys(track));
    console.log('🔍 MixerChannel: FilePath value:', track.filePath);
    console.log('🔍 MixerChannel: FilePath type:', typeof track.filePath);
    
    // Check if track has a valid file path
    if (!track.filePath) {
      console.error('❌ MixerChannel: Track has no file path:', track);
      alert(`❌ Cannot load "${track.title}"\n\nThis track doesn't have a file path. Debug info:\n• Available properties: ${Object.keys(track).join(', ')}\n• FilePath: ${track.filePath}\n• Type: ${typeof track.filePath}`);
      return;
    }

    console.log(`✅ MixerChannel: Track has file path: ${track.filePath}`);
    
    // ✅ NEW: Use PlaylistContext to update deck state
    const deckId = channelId.toUpperCase() as 'A' | 'B';
    console.log(`🎯 MixerChannel: Loading track to Deck ${deckId} via PlaylistContext`);
    
    try {
      loadToDeck(track, deckId);
      console.log(`✅ MixerChannel: Successfully loaded "${track.title}" to Deck ${deckId}`);
      
      // Also handle the audio loading for playback
      const isUrl = track.filePath.startsWith('http://') || track.filePath.startsWith('https://');
      const isBlob = track.filePath.startsWith('blob:');
      
      if (isUrl || isBlob) {
        // Handle HTTP URLs or blob URLs for audio playback
        fetch(track.filePath)
          .then(response => {
            console.log('MixerChannel: Fetch response status:', response.status);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
          })
          .then(blob => {
            console.log('MixerChannel: Blob created, size:', blob.size);
            if (blob.size === 0) {
              throw new Error('File is empty or corrupted');
            }
            const file = new File([blob], track.title, { type: 'audio/mpeg' });
            handleLoadFile(file, track.title);
            console.log(`🎧 MixerChannel: Audio file loaded for playback on Deck ${deckId}`);
          })
          .catch(error => {
            console.error('MixerChannel: Failed to load audio for playback:', error);
            // Don't show error - deck state is already updated, just audio playback failed
            console.log(`⚠️ MixerChannel: Deck ${deckId} updated but audio playback unavailable`);
          });
      } else {
        console.log(`ℹ️ MixerChannel: Local file paths not supported for audio playback, but deck state updated`);
      }
      
    } catch (error) {
      console.error('❌ MixerChannel: Failed to load track to context:', error);
      alert(`❌ Failed to load "${track.title}" to Deck ${deckId}\n\nError: ${error}`);
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card 
      className="mixer-channel h-100"
      style={{ 
        backgroundColor: '#2a2a2a', 
        border: '1px solid #404040',
        borderRadius: '8px'
      }}
    >
      <Card.Body className="p-3">
        {/* Channel Header */}
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#ffffff', 
              textAlign: 'center', 
              mb: 1,
              fontWeight: 'bold'
            }}
          >
            {label}
          </Typography>
          
          {/* Track Info */}
          {state.loadedFile && (
            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#cccccc', display: 'block' }}>
                BPM: {state.bpm}
              </Typography>
              <Typography variant="caption" sx={{ color: '#cccccc' }}>
                {formatTime(state.position)} / {formatTime(state.duration)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Waveform Display */}
        <Box sx={{ mb: 2 }}>
          <Waveform 
            height={40}
            progress={state.duration > 0 ? (state.position / state.duration) * 100 : 0}
            songDuration={state.duration}
            currentTime={state.position}
            isPlaying={state.isPlaying}
            isLoading={state.isLoading}
            trackLoaded={!!state.loadedFile}
            songTitle={state.loadedFile || "No Track Loaded"}
            onSeek={handleWaveformSeek}
          />
        </Box>

        {/* Jog Wheel */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <JogWheel 
            size={120} 
            isPlaying={state.isPlaying} 
            channelName={channelId}
            onTrackLoad={handleJogWheelTrackLoad} 
          />
        </Box>

        {/* Transport Controls */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 2, 
          mb: 3 
        }}>
          {/* CUE Button */}
          <Box
            onClick={handleCue}
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: state.isCueEnabled ? 
                'linear-gradient(145deg, #4285f4, #1a73e8)' : 
                'linear-gradient(145deg, #666, #444)',
              border: '3px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: state.isCueEnabled ?
                '0 4px 15px rgba(66, 133, 244, 0.4), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)' :
                '0 2px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: state.isCueEnabled ?
                  '0 6px 20px rgba(66, 133, 244, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)' :
                  '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              <VolumeUpIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontSize: '9px', mt: 0.5 }}>CUE</Typography>
            </Box>
          </Box>

          {/* PLAY/PAUSE Button */}
          <Box
            onClick={handlePlayPause}
            sx={{
              width: 70,
              height: 70,
              borderRadius: '50%',
              background: state.isPlaying ? 
                'linear-gradient(145deg, #4caf50, #388e3c)' : 
                'linear-gradient(145deg, #2e7d32, #1b5e20)',
              border: '3px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: state.isPlaying ?
                '0 4px 15px rgba(76, 175, 80, 0.4), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)' :
                '0 2px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 20px rgba(76, 175, 80, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              {state.isPlaying ? <PauseIcon fontSize="medium" /> : <PlayArrowIcon fontSize="medium" />}
              <Typography variant="caption" sx={{ fontSize: '8px', mt: 0.5 }}>
                {state.isPlaying ? 'PAUSE' : 'PLAY'}
              </Typography>
            </Box>
          </Box>

          {/* STOP Button */}
          <Box
            onClick={handleStop}
            sx={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #666, #444)',
              border: '3px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                background: 'linear-gradient(145deg, #777, #555)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              <StopIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontSize: '8px', mt: 0.5 }}>STOP</Typography>
            </Box>
          </Box>

          {/* LOOP Button */}
          <Box
            onClick={handleLoop}
            sx={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: state.isLooping ? 
                'linear-gradient(145deg, #2196f3, #1976d2)' : 
                'linear-gradient(145deg, #666, #444)',
              border: '3px solid #333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: state.isLooping ?
                '0 4px 15px rgba(33, 150, 243, 0.4), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3)' :
                '0 2px 8px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.15s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: state.isLooping ?
                  '0 6px 20px rgba(33, 150, 243, 0.5), inset 0 2px 4px rgba(255,255,255,0.3)' :
                  '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              color: '#fff',
              fontWeight: 'bold'
            }}>
              <RepeatIcon fontSize="small" />
              <Typography variant="caption" sx={{ fontSize: '8px', mt: 0.5 }}>LOOP</Typography>
            </Box>
          </Box>
        </Box>



        {/* EQ Section */}
        <Box sx={{ mb: 3 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: '#ffffff', 
              display: 'block', 
              textAlign: 'center', 
              mb: 2,
              fontWeight: 'bold'
            }}
          >
            EQ
          </Typography>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-around',
            alignItems: 'center',
            mb: 2
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Knob
                size={45}
                value={state.eqHigh}
                onChange={handleEQChange('high')}
                label="HIGH"
                color="blue"
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Knob
                size={45}
                value={state.eqMid}
                onChange={handleEQChange('mid')}
                label="MID"
                color="orange"
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Knob
                size={45}
                value={state.eqLow}
                onChange={handleEQChange('low')}
                label="LOW"
                color="red"
              />
            </Box>
          </Box>
        </Box>



        {/* Volume Fader */}
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Fader
            label="VOLUME"
            value={state.volume}
            onChange={(value) => handleVolumeChange({} as Event, value)}
            min={0}
            max={100}
            height={120}
            width={35}
            color="green"
            orientation="vertical"
          />
        </Box>


      </Card.Body>
    </Card>
  );
};

export default MixerChannel;