/**
 * Music Playlist Component
 * Professional DJ playlist with drag-and-drop, queue management, and track info
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playlistService } from '../services/PlaylistService';
import {
  Box,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import {
  QueueMusic as QueueIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  GetApp as LoadToDeckIcon,
  CloudUpload as UploadIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  bpm?: number;
  key?: string;
  genre?: string;
  filePath?: string;
  fileSize?: number;
  waveform?: number[]; // Waveform data for visualization
  coverArt?: string;
  dateAdded: Date;
  playCount: number;
  rating?: number; // 1-5 stars
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: Date;
  updatedAt: Date;
  isAutoMix?: boolean;
}

export interface PlaylistStats {
  totalTracks: number;
  totalDuration: number;
  genres: { [key: string]: number };
  averageBPM: number;
  keyDistribution: { [key: string]: number };
}

interface MusicPlaylistProps {
  onLoadToDeck: (track: Track, deckId: 'A' | 'B') => void;
  currentDeckA?: Track | null;
  currentDeckB?: Track | null;
  className?: string;
}

const MusicPlaylist: React.FC<MusicPlaylistProps> = ({
  onLoadToDeck,
  currentDeckA,
  currentDeckB,
  className
}) => {
  // State management

  const [tracks, setTracks] = useState<Track[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // UI state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; track: Track } | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const [draggedTrack, setDraggedTrack] = useState<Track | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Storage functions
  const loadTracksFromStorage = useCallback(async () => {
    try {
      // Always load from localStorage first to ensure immediate display
      const stored = localStorage.getItem('onestopradio-tracks');
      if (stored) {
        const parsedTracks = JSON.parse(stored);
        const tracksWithDates = parsedTracks.map((track: any) => ({
          ...track,
          dateAdded: new Date(track.dateAdded)
        }));
        setTracks(tracksWithDates);
        console.log(`Loaded ${tracksWithDates.length} tracks from localStorage`);
      }

      // Then try to sync with database in the background
      try {
        const databaseTracks = await playlistService.getAllTracks();
        if (databaseTracks && databaseTracks.length > 0) {
          setTracks(databaseTracks);
          // Update localStorage with latest from database
          localStorage.setItem('onestopradio-tracks', JSON.stringify(databaseTracks));
          console.log(`Synced ${databaseTracks.length} tracks from database`);
        }
      } catch (dbError) {
        console.warn('Database not available, using localStorage only:', dbError);
      }
    } catch (error) {
      console.error('Failed to load tracks from localStorage:', error);
      setTracks([]);
    }
  }, []);

  const saveTracksToStorage = useCallback((tracksToSave: Track[]) => {
    try {
      localStorage.setItem('onestopradio-tracks', JSON.stringify(tracksToSave));
    } catch (error) {
      console.error('Failed to save tracks to storage:', error);
    }
  }, []);

  // Load tracks from database/storage on mount
  useEffect(() => {
    loadTracksFromStorage();
  }, [loadTracksFromStorage]);

  // Save tracks to localStorage whenever tracks change
  useEffect(() => {
    if (tracks.length > 0) {
      saveTracksToStorage(tracks);
      console.log(`Auto-saved ${tracks.length} tracks to localStorage`);
    }
  }, [tracks, saveTracksToStorage]);

  // Filter tracks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTracks(tracks);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = tracks.filter(track =>
        track.title.toLowerCase().includes(query) ||
        track.artist.toLowerCase().includes(query) ||
        track.album?.toLowerCase().includes(query) ||
        track.genre?.toLowerCase().includes(query)
      );
      setFilteredTracks(filtered);
    }
  }, [searchQuery, tracks]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTrackDoubleClick = (track: Track) => {
    console.log(`🖱️ MusicPlaylist: Double-click detected on track: "${track.title}"`);
    console.log('🔍 MusicPlaylist: Track details:', {
      id: track.id,
      title: track.title,
      artist: track.artist,
      filePath: track.filePath,
      hasFilePath: !!track.filePath,
      filePathType: typeof track.filePath
    });
    console.log('🎚️ Current deck states:', { 
      deckA: currentDeckA?.title || 'empty', 
      deckB: currentDeckB?.title || 'empty' 
    });
    
    // Double-click loads to the first available deck, or deck A by default
    const targetDeck = !currentDeckA ? 'A' : !currentDeckB ? 'B' : 'A';
    console.log(`📀 MusicPlaylist: Loading "${track.title}" to Deck ${targetDeck}`);
    
    if (onLoadToDeck) {
      console.log('🔧 MusicPlaylist: Calling onLoadToDeck callback...');
      try {
        onLoadToDeck(track, targetDeck);
        console.log('✅ MusicPlaylist: onLoadToDeck called successfully');
      } catch (error) {
        console.error('❌ MusicPlaylist: Error in onLoadToDeck:', error);
      }
    } else {
      console.error('❌ MusicPlaylist: onLoadToDeck callback is not available!');
      alert('❌ Track loading system not connected. Please check console for details.');
    }
  };

  const handleContextMenu = (event: React.MouseEvent, track: Track) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      track
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleLoadToDeckA = (track: Track) => {
    console.log(`🎵 MusicPlaylist: Context menu - Loading "${track.title}" to Deck A`);
    onLoadToDeck(track, 'A');
    handleCloseContextMenu();
  };

  const handleLoadToDeckB = (track: Track) => {
    console.log(`🎵 MusicPlaylist: Context menu - Loading "${track.title}" to Deck B`);
    onLoadToDeck(track, 'B');
    handleCloseContextMenu();
  };

  const handleRemoveTrack = useCallback(async (track: Track) => {
    try {
      // Remove from database first
      await playlistService.deleteTrackFromDatabase(track.id);
      
      // Then update local state
      setTracks(prev => {
        const updatedTracks = prev.filter(t => t.id !== track.id);
        localStorage.setItem('onestopradio-tracks', JSON.stringify(updatedTracks));
        return updatedTracks;
      });
      
      console.log(`Track "${track.title}" deleted from database and local storage`);
    } catch (error) {
      console.error('Failed to delete track:', error);
      // Still remove locally even if database delete fails
      setTracks(prev => {
        const updatedTracks = prev.filter(t => t.id !== track.id);
        localStorage.setItem('onestopradio-tracks', JSON.stringify(updatedTracks));
        return updatedTracks;
      });
    }
    handleCloseContextMenu();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const uploadPromises: Promise<Track | null>[] = [];
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('audio/')) {
        // Use the playlist service to upload tracks to database
        uploadPromises.push(playlistService.uploadTrack(file));
      }
    });

    try {
      // Wait for all uploads to complete
      const uploadedTracks = await Promise.all(uploadPromises);
      const successfulTracks = uploadedTracks.filter((track): track is Track => track !== null);

      // Add all new tracks at once
      if (successfulTracks.length > 0) {
        setTracks(prev => {
          const updatedTracks = [...prev, ...successfulTracks];
          // Explicitly save to localStorage
          localStorage.setItem('onestopradio-tracks', JSON.stringify(updatedTracks));
          return updatedTracks;
        });
        console.log(`Successfully uploaded ${successfulTracks.length} tracks to database and localStorage`);
      }
    } catch (error) {
      console.error('Failed to upload tracks:', error);
      // Fallback to local upload if database upload fails
      const newTracks: Track[] = [];
      Array.from(files).forEach((file, index) => {
        if (file.type.startsWith('audio/')) {
          const newTrack: Track = {
            id: `uploaded-${Date.now()}-${index}`,
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Unknown Artist',
            duration: 180,
            genre: 'Unknown',
            dateAdded: new Date(),
            playCount: 0,
            filePath: URL.createObjectURL(file)
          };
          newTracks.push(newTrack);
        }
      });
      
      if (newTracks.length > 0) {
        setTracks(prev => {
          const updatedTracks = [...prev, ...newTracks];
          // Explicitly save to localStorage
          localStorage.setItem('onestopradio-tracks', JSON.stringify(updatedTracks));
          return updatedTracks;
        });
        console.log(`Added ${newTracks.length} tracks to localStorage (database unavailable)`);
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowUploadDialog(false);
  };



  const handleDragStart = (event: React.DragEvent, track: Track) => {
    setDraggedTrack(track);
    
    console.log(`🚀 MusicPlaylist: Starting drag for track: "${track.title}"`);
    console.log('📋 MusicPlaylist: Track details:', {
      id: track.id,
      title: track.title,
      artist: track.artist,
      filePath: track.filePath,
      hasFilePath: !!track.filePath
    });
    
    // Set drag data for external drop targets (jog wheels)
    const trackJson = JSON.stringify(track);
    event.dataTransfer.setData('application/json', trackJson);
    event.dataTransfer.effectAllowed = 'copy';
    
    console.log('📤 MusicPlaylist: Set drag data:', trackJson.substring(0, 100) + '...');
    
    // Create custom drag image for better visual feedback
    const dragElement = event.currentTarget as HTMLElement;
    const dragClone = dragElement.cloneNode(true) as HTMLElement;
    dragClone.style.opacity = '0.8';
    dragClone.style.transform = 'rotate(-5deg)';
    dragClone.style.border = '2px solid #ffeb3b';
    
    console.log('✅ MusicPlaylist: Drag started successfully');
  };

  const handleDragEnd = (event: React.DragEvent) => {
    setDraggedTrack(null);
    console.log('MusicPlaylist: Drag ended');
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (!draggedTrack) return;

    const currentIndex = tracks.findIndex(t => t.id === draggedTrack.id);
    if (currentIndex === targetIndex) return;

    const newTracks = [...tracks];
    newTracks.splice(currentIndex, 1);
    newTracks.splice(targetIndex, 0, draggedTrack);
    
    setTracks(newTracks);
    setDraggedTrack(null);
  };

  const getTrackStatusColor = (track: Track): string => {
    if (currentDeckA?.id === track.id || currentDeckB?.id === track.id) {
      return '#4caf50'; // Green for loaded
    }
    if (selectedTrack?.id === track.id) {
      return '#2196f3'; // Blue for selected
    }
    return 'transparent';
  };

  const getKeyColor = (key?: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!key) return 'default';
    // Color code keys for harmonic mixing
    const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
    const minorKeys = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm'];
    
    if (majorKeys.includes(key)) return 'primary';
    if (minorKeys.includes(key)) return 'secondary';
    return 'default';
  };

  return (
    <Box 
      className={className}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: '#1a1a1a',
        border: '2px solid #ffeb3b',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #333',
        border: '2px solid #ffeb3b',
        bgcolor: '#2a2a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QueueIcon sx={{ color: '#ffeb3b' }} />
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
            Music Playlist
          </Typography>
          <Chip 
            label={`${filteredTracks.length} tracks`} 
            size="small" 
            sx={{ bgcolor: '#ffeb3b', color: '#000' }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Upload Music">
            <IconButton 
              onClick={() => setShowUploadDialog(true)}
              sx={{ color: '#ffeb3b' }}
            >
              <UploadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Generate Working Sample Tracks for Testing">
            <IconButton 
              onClick={async () => {
                console.log('🎵 Generating sample tracks with real audio...');
                
                // Create actual audio blobs for testing
                const generateTestAudio = (frequency: number, duration: number): Promise<string> => {
                  return new Promise((resolve) => {
                    const audioContext = new AudioContext();
                    const sampleRate = audioContext.sampleRate;
                    const numSamples = sampleRate * duration;
                    const audioBuffer = audioContext.createBuffer(2, numSamples, sampleRate);
                    
                    // Generate a simple sine wave
                    for (let channel = 0; channel < 2; channel++) {
                      const channelData = audioBuffer.getChannelData(channel);
                      for (let i = 0; i < numSamples; i++) {
                        // Sine wave with fade in/out
                        const time = i / sampleRate;
                        const fadeTime = 0.1; // 100ms fade
                        let amplitude = 0.3;
                        
                        if (time < fadeTime) {
                          amplitude *= time / fadeTime;
                        } else if (time > duration - fadeTime) {
                          amplitude *= (duration - time) / fadeTime;
                        }
                        
                        channelData[i] = Math.sin(2 * Math.PI * frequency * time) * amplitude;
                      }
                    }
                    
                    // Convert to WAV blob
                    const offlineContext = new OfflineAudioContext(2, numSamples, sampleRate);
                    const bufferSource = offlineContext.createBufferSource();
                    bufferSource.buffer = audioBuffer;
                    bufferSource.connect(offlineContext.destination);
                    bufferSource.start();
                    
                    offlineContext.startRendering().then((renderedBuffer) => {
                      // Convert to WAV format
                      const wavBlob = bufferToWav(renderedBuffer);
                      const url = URL.createObjectURL(wavBlob);
                      resolve(url);
                    });
                  });
                };
                
                // Simple WAV file creation
                const bufferToWav = (buffer: AudioBuffer): Blob => {
                  const numChannels = buffer.numberOfChannels;
                  const sampleRate = buffer.sampleRate;
                  const format = 1; // PCM
                  const bitDepth = 16;
                  
                  const bytesPerSample = bitDepth / 8;
                  const blockAlign = numChannels * bytesPerSample;
                  
                  const samples = buffer.length;
                  const dataSize = samples * blockAlign;
                  const fileSize = 36 + dataSize;
                  
                  const arrayBuffer = new ArrayBuffer(44 + dataSize);
                  const view = new DataView(arrayBuffer);
                  
                  // WAV header
                  const writeString = (offset: number, string: string) => {
                    for (let i = 0; i < string.length; i++) {
                      view.setUint8(offset + i, string.charCodeAt(i));
                    }
                  };
                  
                  writeString(0, 'RIFF');
                  view.setUint32(4, fileSize, true);
                  writeString(8, 'WAVE');
                  writeString(12, 'fmt ');
                  view.setUint32(16, 16, true);
                  view.setUint16(20, format, true);
                  view.setUint16(22, numChannels, true);
                  view.setUint32(24, sampleRate, true);
                  view.setUint32(28, sampleRate * blockAlign, true);
                  view.setUint16(32, blockAlign, true);
                  view.setUint16(34, bitDepth, true);
                  writeString(36, 'data');
                  view.setUint32(40, dataSize, true);
                  
                  // PCM data
                  let offset = 44;
                  for (let i = 0; i < samples; i++) {
                    for (let channel = 0; channel < numChannels; channel++) {
                      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
                      view.setInt16(offset, sample * 0x7FFF, true);
                      offset += 2;
                    }
                  }
                  
                  return new Blob([arrayBuffer], { type: 'audio/wav' });
                };
                
                try {
                  // Generate sample audio blobs
                  const audio1Url = await generateTestAudio(440, 3); // A4 note, 3 seconds
                  const audio2Url = await generateTestAudio(523.25, 2); // C5 note, 2 seconds
                  const audio3Url = await generateTestAudio(329.63, 4); // E4 note, 4 seconds
                  
                  const sampleTracks: Track[] = [
                    {
                      id: 'sample-1',
                      title: 'Test Tone A4 (440Hz)',
                      artist: 'OneStopRadio Generator',
                      duration: 3,
                      bpm: 120,
                      key: 'A',
                      genre: 'Test Audio',
                      filePath: audio1Url,
                      dateAdded: new Date(),
                      playCount: 0,
                      rating: 4
                    },
                    {
                      id: 'sample-2',
                      title: 'Test Tone C5 (523Hz)',
                      artist: 'OneStopRadio Generator',
                      duration: 2,
                      bpm: 130,
                      key: 'C',
                      genre: 'Test Audio',
                      filePath: audio2Url,
                      dateAdded: new Date(),
                      playCount: 0,
                      rating: 4
                    },
                    {
                      id: 'sample-3',
                      title: 'Test Tone E4 (330Hz)',
                      artist: 'OneStopRadio Generator',
                      duration: 4,
                      bpm: 128,
                      key: 'E',
                      genre: 'Test Audio',
                      filePath: audio3Url,
                      dateAdded: new Date(),
                      playCount: 0,
                      rating: 5
                    }
                  ];
                  
                  console.log('🎵 Generated sample tracks with filePaths:', sampleTracks.map(t => ({ 
                    title: t.title, 
                    filePath: t.filePath?.substring(0, 50) + '...' 
                  })));
                  
                  // Remove any existing sample tracks first
                  const filteredTracks = tracks.filter(t => !t.id.startsWith('sample-'));
                  const newTracks = [...filteredTracks, ...sampleTracks];
                  
                  setTracks(newTracks);
                  localStorage.setItem('onestopradio-tracks', JSON.stringify(newTracks));
                  console.log('✅ Generated 3 working sample tracks with real audio blobs');
                } catch (error) {
                  console.error('❌ Error generating sample tracks:', error);
                  alert('Failed to generate sample tracks. Please try again.');
                }
              }}
              sx={{ color: '#4caf50' }}
            >
              🎵
            </IconButton>
          </Tooltip>

          <Tooltip title="Debug Track Info">
            <IconButton 
              onClick={() => {
                console.log('=== TRACK DEBUG INFO ===');
                console.log(`Total tracks: ${tracks.length}`);
                tracks.forEach((track, index) => {
                  console.log(`${index + 1}. "${track.title}" by ${track.artist}`);
                  console.log(`   - ID: ${track.id}`);
                  console.log(`   - File Path: ${track.filePath || 'NO FILE PATH'}`);
                  console.log(`   - Duration: ${track.duration}s`);
                  console.log('   ---');
                });
                console.log('=== END DEBUG INFO ===');
                
                // Also show the "Almighty Wayne Watson" track if it exists
                const problemTrack = tracks.find(t => t.title.includes('Wayne Watson') || t.title.includes('Almighty'));
                if (problemTrack) {
                  console.log('🔍 PROBLEM TRACK FOUND:', problemTrack);
                  alert(`Found track: "${problemTrack.title}"\n\nFile path: ${problemTrack.filePath || 'MISSING'}\n\nCheck console for full details`);
                }
              }}
              sx={{ color: '#ff9800' }}
            >
              🔍
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ p: 2, borderBottom: '1px solid #333', border: '2px solid #ffeb3b' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search tracks, artists, albums..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#ffeb3b' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#ffffff',
              bgcolor: '#333',
              '& fieldset': { borderColor: '#555' },
              '&:hover fieldset': { borderColor: '#ffeb3b' },
              '&.Mui-focused fieldset': { borderColor: '#ffeb3b' }
            }
          }}
        />
      </Box>

      {/* Track List */}
      <Box sx={{ flex: 1, overflow: 'auto', border: '2px solid #ffeb3b' }}>
        {filteredTracks.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '300px',
            color: '#666'
          }}>
            <QueueIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1, opacity: 0.7 }}>
              No tracks in your library
            </Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.6 }}>
              Upload some music files to get started with your DJ set
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ p: 0 }}>
            {filteredTracks.map((track, index) => (
            <ListItem
              key={track.id}
              draggable
              onDragStart={(e) => handleDragStart(e, track)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDoubleClick={() => handleTrackDoubleClick(track)}
              onContextMenu={(e) => handleContextMenu(e, track)}
              onClick={(e) => {
                // Prevent click from interfering with drag events
                if (draggedTrack === track) return;
                
                setSelectedTrack(track);
                console.log(`Selected track: "${track.title}"`);
              }}
              sx={{
                cursor: 'pointer',
                borderLeft: `4px solid ${getTrackStatusColor(track)}`,
                bgcolor: selectedTrack?.id === track.id ? '#333' : 'transparent',
                '&:hover': { bgcolor: '#2a2a2a' },
                borderBottom: '1px solid #333',
                py: 1
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                gap: 1
              }}>
                {/* Drag Handle */}
                <DragIcon sx={{ color: '#666', fontSize: '16px' }} />
                
                {/* Track Number */}
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#999', 
                    minWidth: '30px',
                    textAlign: 'right'
                  }}
                >
                  {index + 1}
                </Typography>

                {/* Track Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#ffffff', 
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {track.title}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#ccc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {track.artist} • {track.album}
                  </Typography>
                </Box>

                {/* Track Metadata */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  flexShrink: 0
                }}>
                  {track.key && (
                    <Chip
                      label={track.key}
                      size="small"
                      color={getKeyColor(track.key)}
                      sx={{ minWidth: '35px', height: '20px', fontSize: '10px' }}
                    />
                  )}
                  
                  {track.bpm && (
                    <Chip
                      label={`${track.bpm}`}
                      size="small"
                      sx={{ 
                        bgcolor: '#666', 
                        color: '#fff',
                        minWidth: '40px', 
                        height: '20px', 
                        fontSize: '10px'
                      }}
                    />
                  )}
                  
                  <Typography variant="caption" sx={{ color: '#999', minWidth: '40px', textAlign: 'right' }}>
                    {formatDuration(track.duration)}
                  </Typography>
                  
                  {/* Temporary debug buttons */}
                  <button 
                    style={{ fontSize: '9px', padding: '1px 3px', marginLeft: '4px', backgroundColor: '#ff6b35', color: 'white', border: 'none', borderRadius: '2px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🧪 TEST: Force loading to Deck A');
                      console.log('🧪 TEST: Track data:', track);
                      console.log('🧪 TEST: onLoadToDeck available:', !!onLoadToDeck);
                      if (onLoadToDeck) {
                        try {
                          onLoadToDeck(track, 'A');
                          console.log('✅ TEST: onLoadToDeck called successfully for Deck A');
                        } catch (error) {
                          console.error('❌ TEST: Error calling onLoadToDeck:', error);
                        }
                      } else {
                        console.error('❌ TEST: onLoadToDeck callback not available');
                        alert('❌ onLoadToDeck callback not available');
                      }
                    }}
                  >
                    →A
                  </button>
                  <button 
                    style={{ fontSize: '9px', padding: '1px 3px', marginLeft: '2px', backgroundColor: '#35a7ff', color: 'white', border: 'none', borderRadius: '2px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🧪 TEST: Force loading to Deck B');
                      console.log('🧪 TEST: Track data:', track);
                      console.log('🧪 TEST: onLoadToDeck available:', !!onLoadToDeck);
                      if (onLoadToDeck) {
                        try {
                          onLoadToDeck(track, 'B');
                          console.log('✅ TEST: onLoadToDeck called successfully for Deck B');
                        } catch (error) {
                          console.error('❌ TEST: Error calling onLoadToDeck:', error);
                        }
                      } else {
                        console.error('❌ TEST: onLoadToDeck callback not available');
                        alert('❌ onLoadToDeck callback not available');
                      }
                    }}
                  >
                    →B
                  </button>
                </Box>

                {/* More Options */}
                <IconButton 
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, track);
                  }}
                  sx={{ color: '#666' }}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>
            </ListItem>
          ))}
          </List>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined
        }
      >
        <MenuItem onClick={() => contextMenu && handleLoadToDeckA(contextMenu.track)}>
          <LoadToDeckIcon sx={{ mr: 1 }} />
          Load to Deck A
        </MenuItem>
        <MenuItem onClick={() => contextMenu && handleLoadToDeckB(contextMenu.track)}>
          <LoadToDeckIcon sx={{ mr: 1 }} />
          Load to Deck B
        </MenuItem>
        <MenuItem onClick={() => contextMenu && handleRemoveTrack(contextMenu.track)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Remove from Playlist
        </MenuItem>
      </Menu>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onClose={() => setShowUploadDialog(false)}>
        <DialogTitle>Upload Music Files</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <UploadIcon sx={{ fontSize: 64, color: '#ffeb3b', mb: 2 }} />
            <Typography gutterBottom>
              Select audio files to add to your playlist
            </Typography>
            <Button
              variant="contained"
              component="label"
              sx={{ bgcolor: '#ffeb3b', color: '#000' }}
            >
              Choose Files
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*"
                hidden
                onChange={handleFileUpload}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUploadDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default MusicPlaylist;