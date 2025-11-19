import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  Stop,
  VolumeUp,
  AccessTime,
  MusicNote,
  Star,
  StarBorder,
  GraphicEq,
  Speed
} from '@mui/icons-material';

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

interface TrackCardProps {
  track: Track;
  isPlaying?: boolean;
  currentDeck?: 'A' | 'B' | null;
  onLoadDeck: (trackId: string, deckId: 'A' | 'B') => Promise<void>;
  onPreviewPlay?: (trackId: string) => void;
  onPreviewStop?: () => void;
  isLoadingDeck?: boolean;
  loadingDeckId?: 'A' | 'B' | null;
  showCompatibility?: boolean;
  compatibilityBpm?: number;
}

const TrackCard: React.FC<TrackCardProps> = ({
  track,
  isPlaying = false,
  currentDeck = null,
  onLoadDeck,
  onPreviewPlay,
  onPreviewStop,
  isLoadingDeck = false,
  loadingDeckId = null,
  showCompatibility = false,
  compatibilityBpm
}) => {
  const [rating, setRating] = useState(track.rating || 0);

  // Format duration to MM:SS
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format BPM display
  const formatBpm = (bpm?: number): string => {
    if (!bpm) return 'Unknown';
    return `${bpm.toFixed(1)} BPM`;
  };

  // Calculate BPM compatibility
  const getBpmCompatibility = (): { compatible: boolean; difference?: number; type?: string } => {
    if (!track.bpm || !compatibilityBpm) {
      return { compatible: false };
    }

    const difference = Math.abs(track.bpm - compatibilityBpm);
    
    // Direct compatibility (±5 BPM)
    if (difference <= 5) {
      return { compatible: true, difference, type: 'direct' };
    }
    
    // Harmonic mixing (double/half time)
    const doubleTimeDiff = Math.abs(track.bpm - compatibilityBpm * 2);
    const halfTimeDiff = Math.abs(track.bpm * 2 - compatibilityBpm);
    
    if (doubleTimeDiff <= 5) {
      return { compatible: true, difference: doubleTimeDiff, type: 'half-time' };
    }
    
    if (halfTimeDiff <= 5) {
      return { compatible: true, difference: halfTimeDiff, type: 'double-time' };
    }
    
    return { compatible: false, difference };
  };

  const compatibility = getBpmCompatibility();

  // Handle deck loading
  const handleLoadDeck = async (deckId: 'A' | 'B') => {
    try {
      await onLoadDeck(track.id, deckId);
    } catch (error) {
      console.error(`Failed to load track to deck ${deckId}:`, error);
    }
  };

  // Handle rating change
  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // TODO: Call API to update rating
  };



  return (
    <Card 
      sx={{ 
        mb: 2,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)'
        },
        border: currentDeck ? `2px solid ${currentDeck === 'A' ? '#ff4444' : '#4444ff'}` : 'none',
        opacity: isLoadingDeck ? 0.7 : 1
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        {/* Track Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap sx={{ fontWeight: 'bold' }}>
              {track.title}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" noWrap>
              {track.artist}
            </Typography>
            {track.album && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {track.album}
              </Typography>
            )}
          </Box>
          
          {/* Preview Play Button */}
          <Box sx={{ ml: 2 }}>
            {onPreviewPlay && (
              <IconButton
                onClick={() => isPlaying ? onPreviewStop?.() : onPreviewPlay(track.id)}
                color={isPlaying ? "secondary" : "primary"}
              >
                {isPlaying ? <Pause /> : <PlayArrow />}
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Track Metadata */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {/* Duration */}
          <Chip 
            icon={<AccessTime />} 
            label={formatDuration(track.duration)} 
            size="small" 
            variant="outlined"
          />
          
          {/* BPM */}
          {track.bpm && (
            <Chip 
              icon={<Speed />} 
              label={formatBpm(track.bpm)}
              size="small" 
              variant="outlined"
              color={showCompatibility && compatibility.compatible ? "success" : "default"}
            />
          )}
          
          {/* Genre */}
          {track.genre && (
            <Chip 
              icon={<MusicNote />} 
              label={track.genre} 
              size="small" 
              variant="outlined"
            />
          )}
          
          {/* Key Signature */}
          {track.key && (
            <Chip 
              label={track.key} 
              size="small" 
              variant="outlined"
            />
          )}
          
          {/* Waveform Available */}
          {track.waveform && track.waveform.length > 0 && (
            <Chip 
              icon={<GraphicEq />} 
              label="Analyzed" 
              size="small" 
              color="success"
              variant="outlined"
            />
          )}
        </Box>

        {/* BPM Compatibility Info */}
        {showCompatibility && compatibilityBpm && (
          <Box sx={{ mb: 2 }}>
            {compatibility.compatible ? (
              <Alert severity="success" sx={{ py: 0 }}>
                <Typography variant="caption">
                  Compatible for mixing • {compatibility.type} • ±{compatibility.difference?.toFixed(1)} BPM
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ py: 0 }}>
                <Typography variant="caption">
                  BPM mismatch • {compatibility.difference?.toFixed(1)} BPM difference
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Rating */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            Rating:
          </Typography>
          {[1, 2, 3, 4, 5].map((star) => (
            <IconButton
              key={star}
              size="small"
              onClick={() => handleRatingChange(star)}
              sx={{ p: 0.5 }}
            >
              {star <= rating ? (
                <Star sx={{ fontSize: 16, color: '#ffd700' }} />
              ) : (
                <StarBorder sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          ))}
          <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
            Played {track.play_count} times
          </Typography>
        </Box>

        {/* Loading Progress */}
        {isLoadingDeck && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              Loading to Deck {loadingDeckId}...
            </Typography>
          </Box>
        )}

        {/* Deck Load Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={currentDeck === 'A' ? "contained" : "outlined"}
            color={currentDeck === 'A' ? "error" : "primary"}
            size="small"
            onClick={() => handleLoadDeck('A')}
            disabled={isLoadingDeck}
            startIcon={currentDeck === 'A' ? <Stop /> : <PlayArrow />}
            sx={{ 
              flex: 1,
              backgroundColor: currentDeck === 'A' ? '#ff4444' : undefined,
              '&:hover': {
                backgroundColor: currentDeck === 'A' ? '#ff6666' : undefined,
              }
            }}
          >
            {currentDeck === 'A' ? 'Loaded on Deck A' : 'Load Deck A'}
          </Button>
          
          <Button
            variant={currentDeck === 'B' ? "contained" : "outlined"}
            color={currentDeck === 'B' ? "info" : "primary"}
            size="small"
            onClick={() => handleLoadDeck('B')}
            disabled={isLoadingDeck}
            startIcon={currentDeck === 'B' ? <Stop /> : <PlayArrow />}
            sx={{ 
              flex: 1,
              backgroundColor: currentDeck === 'B' ? '#4444ff' : undefined,
              '&:hover': {
                backgroundColor: currentDeck === 'B' ? '#6666ff' : undefined,
              }
            }}
          >
            {currentDeck === 'B' ? 'Loaded on Deck B' : 'Load Deck B'}
          </Button>
        </Box>
        
        {/* Track Info Footer */}
        <Box sx={{ mt: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            {(track.file_size || 0) > 0 ? `${Math.round((track.file_size || 0) / 1024 / 1024)}MB` : 'Unknown size'}
            • Created: {new Date(track.created_at).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TrackCard;