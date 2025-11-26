import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
  Menu,
  Tooltip,
  Button
} from '@mui/material';
import {
  LibraryMusic,
  Add,
  Delete,
  PlayArrow,
  Lock,
  Pause
} from '@mui/icons-material';
import { useSubscription } from '../contexts/SubscriptionContext';


// Mock tracks data for testing instant play cards
const MOCK_TRACKS = [
  {
    id: "track_001",
    title: "Summer Vibes",
    artist: "DJ Alex",
    album: "Beach House Mix",
    genre: "House",
    duration: 245,
    bpm: 128,
    key: "1",
    file_path: "/music/summer_vibes.mp3",
    file_size: 5242880,
    rating: 4,
    play_count: 12,
    created_at: "2023-06-15T10:30:00Z",
    updated_at: "2023-06-15T10:30:00Z"
  },
  {
    id: "track_002", 
    title: "Midnight Drive",
    artist: "Luna Beats",
    album: "City Nights",
    genre: "Synthwave",
    duration: 198,
    bpm: 110,
    key: "2",
    file_path: "/music/midnight_drive.mp3",
    file_size: 4194304,
    rating: 5,
    play_count: 8,
    created_at: "2023-05-20T14:15:00Z",
    updated_at: "2023-05-20T14:15:00Z"
  },
  {
    id: "track_003",
    title: "Electric Storm", 
    artist: "Bass Commander",
    album: "Thunder EP",
    genre: "Drum & Bass",
    duration: 312,
    bpm: 174,
    key: "3",
    file_path: "/music/electric_storm.mp3",
    file_size: 7340032,
    rating: 4,
    play_count: 25,
    created_at: "2023-07-10T09:45:00Z",
    updated_at: "2023-07-10T09:45:00Z"
  },
  {
    id: "track_004",
    title: "Sunset Boulevard",
    artist: "Chill Masters", 
    album: "Lofi Dreams",
    genre: "Lofi Hip Hop",
    duration: 156,
    bpm: 85,
    key: "4",
    file_path: "/music/sunset_blvd.mp3",
    file_size: 3145728,
    rating: 3,
    play_count: 15,
    created_at: "2023-04-05T16:20:00Z",
    updated_at: "2023-04-05T16:20:00Z"
  },
  {
    id: "track_005",
    title: "Acid Techno Madness",
    artist: "303 Factory",
    album: "Warehouse Sessions", 
    genre: "Acid Techno",
    duration: 428,
    bpm: 145,
    key: "5",
    file_path: "/music/acid_madness.mp3",
    file_size: 8912896,
    rating: 5,
    play_count: 33,
    created_at: "2023-08-12T11:10:00Z",
    updated_at: "2023-08-12T11:10:00Z"
  },
  {
    id: "track_006",
    title: "Deep Space Journey",
    artist: "Cosmic Voyager",
    album: "Stellar Sounds",
    genre: "Ambient Techno",
    duration: 387,
    bpm: 120,
    key: "6",
    file_path: "/music/deep_space.mp3",
    file_size: 7892344,
    rating: 4,
    play_count: 18,
    created_at: "2023-09-05T13:25:00Z",
    updated_at: "2023-09-05T13:25:00Z"
  },
  {
    id: "track_007",
    title: "Neon Nights",
    artist: "Retro Wave",
    album: "80s Revival",
    genre: "Electro Pop",
    duration: 256,
    bpm: 115,
    key: "7",
    file_path: "/music/neon_nights.mp3",
    file_size: 5832176,
    rating: 4,
    play_count: 22,
    created_at: "2023-10-12T15:40:00Z",
    updated_at: "2023-10-12T15:40:00Z"
  },
  {
    id: "track_008",
    title: "Bass Drop Revolution",
    artist: "Sub Heavy",
    album: "Underground EP",
    genre: "Dubstep",
    duration: 298,
    bpm: 140,
    key: "8",
    file_path: "/music/bass_drop.mp3",
    file_size: 6984512,
    rating: 5,
    play_count: 45,
    created_at: "2023-11-01T12:20:00Z",
    updated_at: "2023-11-01T12:20:00Z"
  },
  {
    id: "track_009",
    title: "Jazz Fusion Flow",
    artist: "Smooth Collective",
    album: "Late Night Sessions",
    genre: "Nu Jazz",
    duration: 342,
    bpm: 95,
    key: "9",
    file_path: "/music/jazz_fusion.mp3",
    file_size: 7245632,
    rating: 4,
    play_count: 31,
    created_at: "2023-08-28T19:15:00Z",
    updated_at: "2023-08-28T19:15:00Z"
  },
  {
    id: "track_010",
    title: "Tropical House Sunset",
    artist: "Island Vibes",
    album: "Paradise Collection",
    genre: "Tropical House",
    duration: 234,
    bpm: 124,
    key: "10",
    file_path: "/music/tropical_sunset.mp3",
    file_size: 5123456,
    rating: 3,
    play_count: 19,
    created_at: "2023-07-22T14:30:00Z",
    updated_at: "2023-07-22T14:30:00Z"
  }
];

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  bpm?: number;
  key?: string;
  genre?: string;
  file_path?: string;
  file_size?: number;
  waveform?: number[];
  cover_art?: string;
  rating?: number;
  play_count: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}



interface MusicLibraryProps {
  onLoadDeck: (track: Track) => void;
  currentDeckA?: string | null;
  currentDeckB?: string | null;
  loadingDeck?: 'A' | 'B' | null;
  showCompatibility?: boolean;
  compatibilityBpm?: number;
  onWebSocketMessage?: (message: any) => void;
}

const MusicLibrary: React.FC<MusicLibraryProps> = ({
  onLoadDeck,
  currentDeckA = null,
  currentDeckB = null,
  loadingDeck = null,
  showCompatibility = false,
  compatibilityBpm,
  onWebSocketMessage
}) => {
  const { tier, hasFeatureAccess, setShowPricingModal } = useSubscription();
  
  // Component state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Right-click menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    trackId: string;
  } | null>(null);

  // Audio playback state
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [progress, setProgress] = useState<{ [key: string]: number }>({});

  // Load all tracks (simplified without filters)
  const fetchTracks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load tracks from localStorage immediately - NO DELAY for instant response
      const savedTracks = localStorage.getItem('onestopradio-instant-play-tracks');
      if (savedTracks) {
        setTracks(JSON.parse(savedTracks));
      } else {
        // Load mock tracks without audio generation - deck will handle audio
        console.log('🎵 Loading instant play cards...');
        setTracks([...MOCK_TRACKS]);
        localStorage.setItem('onestopradio-instant-play-tracks', JSON.stringify(MOCK_TRACKS));
      }
      
    } catch (err) {
      console.error('Failed to fetch tracks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle right-click context menu
  const handleContextMenu = (event: React.MouseEvent, trackId: string) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      trackId
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleRemoveTrack = () => {
    if (contextMenu) {
      setTracks(prev => prev.filter(track => track.id !== contextMenu.trackId));
      // Clear currently playing indicator if removed track was loaded
      if (currentlyPlaying === contextMenu.trackId) {
        setCurrentlyPlaying(null);
      }
    }
    handleContextMenuClose();
  };

  // State to track which card slot is being uploaded to
  const [uploadingToSlot, setUploadingToSlot] = useState<number | null>(null);

  // Play/pause audio directly from the card
  const handlePlayPause = (track: Track) => {
    // Stop currently playing track if different
    if (currentlyPlaying && currentlyPlaying !== track.id) {
      const currentAudio = audioElements[currentlyPlaying];
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      setProgress(prev => ({ ...prev, [currentlyPlaying]: 0 }));
    }

    // Toggle play/pause for clicked track
    if (currentlyPlaying === track.id) {
      // Pause current track
      const audio = audioElements[track.id];
      if (audio) {
        audio.pause();
      }
      setCurrentlyPlaying(null);
    } else {
      // Play new track
      let audio = audioElements[track.id];
      
      if (!audio) {
        // Create new audio element
        audio = new Audio(track.file_path);
        audio.preload = 'auto';
        
        // Update progress as track plays
        audio.addEventListener('timeupdate', () => {
          if (audio.duration) {
            const progressPercent = (audio.currentTime / audio.duration) * 100;
            setProgress(prev => ({ ...prev, [track.id]: progressPercent }));
          }
        });
        
        audio.addEventListener('ended', () => {
          setCurrentlyPlaying(null);
          setProgress(prev => ({ ...prev, [track.id]: 0 }));
        });
        
        setAudioElements(prev => ({ ...prev, [track.id]: audio }));
      }
      
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        setCurrentlyPlaying(null);
      });
      
      setCurrentlyPlaying(track.id);
    }
  };

  // File upload handling with real metadata extraction

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Check if user has access to upload tracks
    if (!hasFeatureAccess('instant_play')) {
      setShowPricingModal(true);
      event.target.value = ''; // Reset input
      return;
    }
    
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const fileUrl = URL.createObjectURL(file);
      
      // Extract real metadata from audio file
      const audio = new Audio(fileUrl);
      
      audio.addEventListener('loadedmetadata', () => {
        // Clean up track title from filename
        let title = file.name.replace(/\.[^/.]+$/, "");
        
        // Try to parse artist - title format
        let artist = "Unknown Artist";
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        } else if (title.includes('_')) {
          // Handle underscore format
          const parts = title.split('_');
          if (parts.length >= 2) {
            artist = parts[0].replace(/([A-Z])/g, ' $1').trim();
            title = parts.slice(1).join(' ').replace(/([A-Z])/g, ' $1').trim();
          }
        }
        
        setTracks(prev => {
          // Use the clicked card slot if available, otherwise find first empty
          let targetIndex = uploadingToSlot !== null ? uploadingToSlot : 
                           prev.findIndex(track => track.file_path && !track.file_path.startsWith('blob:'));
          
          // If no empty slots, use first slot
          if (targetIndex === -1) targetIndex = 0;
          
          // Preserve the original track's genre/color for visual consistency
          const originalGenre = prev[targetIndex]?.genre || 'Uploaded';
          
          const newTrack: Track = {
            id: `track_${String(targetIndex + 1).padStart(3, '0')}`,
            title: title || file.name.replace(/\.[^/.]+$/, ""),
            artist: artist,
            album: "My Uploads",
            genre: originalGenre, // Keep original card color
            duration: Math.floor(audio.duration) || 180,
            bpm: 120,
            key: String(targetIndex + 1), // Use slot number as key
            file_path: fileUrl,
            file_size: file.size,
            rating: 0,
            play_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const updatedTracks = [...prev];
          updatedTracks[targetIndex] = newTrack; // Replace track at this specific slot
          
          // Save to localStorage
          localStorage.setItem('onestopradio-instant-play-tracks', JSON.stringify(updatedTracks));
          
          return updatedTracks;
        });
        setUploadingToSlot(null);
      });
      
      audio.addEventListener('error', () => {
        console.error('Failed to load audio metadata');
        
        setTracks(prev => {
          // Use the clicked card slot if available, otherwise find first empty
          let targetIndex = uploadingToSlot !== null ? uploadingToSlot : 
                           prev.findIndex(track => track.file_path && !track.file_path.startsWith('blob:'));
          
          if (targetIndex === -1) targetIndex = 0;
          
          // Preserve the original track's genre/color for visual consistency
          const originalGenre = prev[targetIndex]?.genre || 'Uploaded';
          
          const newTrack: Track = {
            id: `track_${String(targetIndex + 1).padStart(3, '0')}`,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Unknown Artist",
            album: "My Uploads",
            genre: originalGenre, // Keep original card color
            duration: 180,
            bpm: 120,
            key: String(targetIndex + 1), // Use slot number as key
            file_path: fileUrl,
            file_size: file.size,
            rating: 0,
            play_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          const updatedTracks = [...prev];
          updatedTracks[targetIndex] = newTrack; // Replace track at this specific slot
          
          // Save to localStorage
          localStorage.setItem('onestopradio-instant-play-tracks', JSON.stringify(updatedTracks));
          
          return updatedTracks;
        });
        setUploadingToSlot(null);
      });
    }
  };

  // Initial load
  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);



  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <LibraryMusic sx={{ color: '#ffffff' }} />
        <Typography variant="h6" fontWeight="bold" sx={{ color: '#ffffff' }}>
          Instant Play
        </Typography>
        {tier === 'basic' && (
          <Tooltip title="Basic plan: 10 instant play tracks. Upgrade to Pro for unlimited tracks.">
            <Lock sx={{ fontSize: 16, color: '#999', ml: 1 }} />
          </Tooltip>
        )}
      </Box>

      {/* Tier Info Banner */}
      {tier === 'free' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Instant Play requires Basic plan or higher. <Button size="small" onClick={() => setShowPricingModal(true)}>Upgrade Now</Button>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Track Cards Grid */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : tracks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <LibraryMusic sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No tracks found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add some music to your library to get started.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)',
              lg: 'repeat(5, 1fr)'
            },
            gap: 1,
            maxHeight: 'calc(2 * 160px + 8px)', // 2 rows max with taller cards
            overflow: 'hidden'
          }}>
            {tracks.map((track, index) => (
              <Box key={track.id}>
                <Paper 
                  sx={{ 
                    p: 1.5, 
                    height: 160, // Fixed height for all cards
                    width: '100%', // Full width
                    minHeight: 160, // Ensure minimum height
                    maxHeight: 160, // Prevent cards from growing
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    boxSizing: 'border-box', // Include padding in dimensions
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 2,
                    },
                    // Color coding by genre
                    backgroundColor: 
                      track.genre === 'House' ? '#ff9999' :
                      track.genre === 'Synthwave' ? '#ffcc99' :
                      track.genre === 'Drum & Bass' ? '#99ccff' :
                      track.genre === 'Lofi Hip Hop' ? '#ccffcc' :
                      track.genre === 'Acid Techno' ? '#ff99ff' :
                      track.genre === 'Ambient Techno' ? '#ccccff' :
                      track.genre === 'Electro Pop' ? '#ffb3e6' :
                      track.genre === 'Dubstep' ? '#ffaaaa' :
                      track.genre === 'Nu Jazz' ? '#ffffaa' :
                      track.genre === 'Tropical House' ? '#aaffaa' :
                      track.genre === 'Uploaded' ? '#e1bee7' :
                      '#f5f5f5',
                    color: '#000',
                    border: currentlyPlaying === track.id ? '3px solid #4caf50' : 'none'
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    
                    // Play audio directly from the card
                    console.log(`🎵 InstantPlay Card: Playing "${track.title}"`);
                    handlePlayPause(track);
                  }}
                >
                  {/* Play/Pause Icon */}
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    {currentlyPlaying === track.id ? 
                      <Pause sx={{ fontSize: 20, color: '#4caf50' }} /> :
                      <PlayArrow sx={{ fontSize: 20 }} />
                    }
                  </Box>

                  {/* Track Info */}
                  <Box sx={{ 
                    flex: 1, 
                    minHeight: 0, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <Typography 
                      variant="subtitle2" 
                      fontWeight="bold" 
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.2,
                        height: '2.4em', // Fixed height for title (2 lines)
                        mb: 0.5
                      }}
                    >
                      {track.title}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                        height: '1.2em' // Fixed height for artist (1 line)
                      }}
                    >
                      {track.artist}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        height: '1em', // Fixed height for metadata
                        lineHeight: 1,
                        mt: 'auto' // Push to bottom
                      }}
                    >
                      {track.genre} • {track.bpm} BPM
                    </Typography>
                  </Box>
                  
                  {/* Progress bar */}
                  <Box sx={{ width: '100%', mb: 1, height: '16px', display: 'flex', alignItems: 'center' }}>
                    {currentlyPlaying === track.id && progress[track.id] !== undefined ? (
                      <Box sx={{ width: '100%' }}>
                        <Box 
                          sx={{ 
                            width: '100%', 
                            height: 4, 
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: `${progress[track.id]}%`, 
                              height: '100%', 
                              backgroundColor: '#4caf50',
                              transition: 'width 0.1s linear'
                            }} 
                          />
                        </Box>
                      </Box>
                    ) : null}
                  </Box>
                  
                  {/* Duration and Key */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" fontWeight="bold">
                      {`${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`}
                    </Typography>
                    <Typography variant="caption" fontWeight="bold" 
                      sx={{ 
                        backgroundColor: 'rgba(0,0,0,0.1)', 
                        px: 0.5, 
                        borderRadius: 0.5 
                      }}
                    >
                      {track.key}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => {
          if (contextMenu) {
            const track = tracks.find(t => t.id === contextMenu.trackId);
            if (track) {
              onLoadDeck(track);
            }
          }
          handleContextMenuClose();
        }}>
          <LibraryMusic sx={{ mr: 1 }} />
          Load to Deck
        </MenuItem>
        <MenuItem onClick={() => {
          if (contextMenu) {
            const trackIndex = tracks.findIndex(t => t.id === contextMenu.trackId);
            setUploadingToSlot(trackIndex);
            // Trigger file input directly
            const fileInput = document.getElementById('upload-file-context') as HTMLInputElement;
            if (fileInput) {
              fileInput.click();
            }
          }
          handleContextMenuClose();
        }}>
          <Add sx={{ mr: 1 }} />
          Upload Track from PC
        </MenuItem>
        <MenuItem onClick={handleRemoveTrack}>
          <Delete sx={{ mr: 1 }} />
          Remove Track
        </MenuItem>
      </Menu>

      {/* Hidden file input for context menu upload */}
      <input
        accept="audio/*"
        style={{ display: 'none' }}
        id="upload-file-context"
        type="file"
        onChange={handleFileUpload}
      />
    </Box>
  );
};

export default MusicLibrary;