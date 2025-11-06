
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

interface WaveformProps {
  height?: number;
  progress?: number; // Manual progress override (0-100)
  isPlaying?: boolean;
  trackLoaded?: boolean;
  isLoading?: boolean; // New prop to indicate loading state
  songDuration?: number; // Song duration in seconds
  currentTime?: number; // Current playback time in seconds
  songTitle?: string;
  onSeek?: (percentage: number) => void; // Callback for seeking
}

// Realistic waveform data that represents a typical song structure
const generateWaveformData = (bars: number = 200): number[] => {
  const waveData: number[] = [];
  
  for (let i = 0; i < bars; i++) {
    const position = i / bars;
    
    // Create realistic song structure
    let amplitude = 0.1; // Base silence level
    
    // Intro (0-10%)
    if (position < 0.1) {
      amplitude = 0.3 + (position / 0.1) * 0.4; // Gradual build
    }
    // Verse (10-25%)
    else if (position < 0.25) {
      amplitude = 0.5 + Math.sin(position * 20) * 0.15; // Rhythmic pattern
    }
    // Chorus (25-40%)
    else if (position < 0.4) {
      amplitude = 0.8 + Math.sin(position * 30) * 0.2; // Higher energy
    }
    // Verse 2 (40-55%)
    else if (position < 0.55) {
      amplitude = 0.6 + Math.sin(position * 25) * 0.2;
    }
    // Bridge (55-70%)
    else if (position < 0.7) {
      amplitude = 0.4 + Math.sin(position * 15) * 0.25; // Varied pattern
    }
    // Final Chorus (70-90%)
    else if (position < 0.9) {
      amplitude = 0.9 + Math.sin(position * 35) * 0.1; // Peak energy
    }
    // Outro (90-100%)
    else {
      amplitude = 0.7 * (1 - ((position - 0.9) / 0.1)); // Fade out
    }
    
    // Add some randomness for realism
    amplitude += (Math.random() - 0.5) * 0.1;
    amplitude = Math.max(0.05, Math.min(1.0, amplitude));
    
    waveData.push(amplitude);
  }
  
  return waveData;
};

const Waveform: React.FC<WaveformProps> = ({ 
  height = 80, 
  progress = 0, 
  isPlaying = false, 
  trackLoaded = false,
  isLoading = false,
  songDuration = 180, // Default 3 minutes
  currentTime = 0,
  songTitle = "Current Track",
  onSeek
}) => {
  
  const [waveformData] = useState(() => generateWaveformData(150));
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [animationOffset, setAnimationOffset] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [startTime] = useState(Date.now());

  // Calculate progress based on manual progress override or automatic timing
  const calculateProgress = useCallback(() => {
    if (progress > 0) {
      // Manual progress override
      return progress;
    } else if (isPlaying && trackLoaded) {
      // Calculate based on elapsed time since playing started
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      return Math.min((elapsed / songDuration) * 100, 100);
    } else if (currentTime > 0) {
      // Use provided current time
      return Math.min((currentTime / songDuration) * 100, 100);
    }
    return 0;
  }, [progress, isPlaying, trackLoaded, startTime, songDuration, currentTime]);

  // Update progress and spectrum animation
  useEffect(() => {
    let animationFrame: number;
    
    const updateAnimation = () => {
      const newProgress = calculateProgress();
      setPlaybackProgress(newProgress);
      
      // Animate waveform movement when playing
      if (isPlaying && trackLoaded) {
        setAnimationOffset(prev => (prev + 2) % 100); // Horizontal movement offset
      }
      
      if (isPlaying && trackLoaded) {
        animationFrame = requestAnimationFrame(updateAnimation);
      }
    };
    
    if (isPlaying && trackLoaded) {
      updateAnimation();
    } else {
      setAnimationOffset(0);
      if (!isPlaying && progress === 0) {
        setPlaybackProgress(0);
      }
      // Reset animation when not playing
      if (!isPlaying) {
        // Animation offset will stay at current position when paused
      }
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, trackLoaded, calculateProgress, progress]);

  // Loading animation effect
  useEffect(() => {
    let loadingAnimationFrame: number;
    
    const updateLoadingAnimation = () => {
      if (isLoading) {
        setLoadingProgress(prev => (prev + 1.5) % 100); // Sweep across in about 3 seconds
        loadingAnimationFrame = requestAnimationFrame(updateLoadingAnimation);
      } else {
        setLoadingProgress(0);
      }
    };
    
    if (isLoading) {
      updateLoadingAnimation();
    }

    return () => {
      if (loadingAnimationFrame) {
        cancelAnimationFrame(loadingAnimationFrame);
      }
    };
  }, [isLoading]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle waveform click for seeking
  const handleWaveformClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !trackLoaded) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    
    onSeek(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Track Title and Time Display */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 1,
        px: 1
      }}>
        <Typography variant="caption" sx={{ 
          color: isLoading ? '#ff9800' : trackLoaded ? (isPlaying ? '#ffeb3b' : '#4caf50') : '#666',
          fontWeight: 'bold',
          fontSize: '0.75rem'
        }}>
          {isLoading ? 'Loading Track...' : trackLoaded ? songTitle : 'No Track Loaded'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Typography variant="caption" sx={{ 
            color: '#ffeb3b', 
            fontFamily: 'monospace',
            fontSize: '0.7rem'
          }}>
            {formatTime((playbackProgress / 100) * songDuration)}
          </Typography>
          <Typography variant="caption" sx={{ 
            color: '#666',
            fontSize: '0.7rem'
          }}>
            /
          </Typography>
          <Typography variant="caption" sx={{ 
            color: '#999', 
            fontFamily: 'monospace',
            fontSize: '0.7rem'
          }}>
            {formatTime(songDuration)}
          </Typography>
        </Box>
      </Box>

      {/* Skeuomorphic Waveform Display */}
      <Box 
        onClick={handleWaveformClick}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          height, 
          width: '100%', 
          background: `
            linear-gradient(180deg, 
              #2a2a2a 0%, 
              #1a1a1a 10%, 
              #0d0d0d 40%, 
              #050505 60%, 
              #0d0d0d 85%, 
              #1a1a1a 95%, 
              #2a2a2a 100%
            )
          `,
          borderRadius: '12px', 
          p: '4px',
          position: 'relative',
          overflow: 'hidden',
          cursor: onSeek && trackLoaded ? 'pointer' : 'default',
          border: '3px solid #333',
          boxShadow: `
            inset 0 3px 10px rgba(0,0,0,0.8),
            inset 0 -2px 6px rgba(255,255,255,0.05),
            0 2px 8px rgba(0,0,0,0.6)
          `,
          '&:hover': onSeek && trackLoaded ? {
            background: `
              linear-gradient(180deg, 
                #2d2d2d 0%, 
                #1d1d1d 10%, 
                #101010 40%, 
                #080808 60%, 
                #101010 85%, 
                #1d1d1d 95%, 
                #2d2d2d 100%
              )
            `,
            borderColor: '#444',
            boxShadow: `
              inset 0 3px 12px rgba(0,0,0,0.85),
              inset 0 -2px 8px rgba(255,255,255,0.08),
              0 4px 10px rgba(0,0,0,0.7)
            `
          } : {},
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, transparent, rgba(255,235,59,0.2), transparent)',
            borderRadius: '12px 12px 0 0'
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.8), transparent)',
            borderRadius: '0 0 12px 12px'
          }
        }}
      >
        {/* Skeuomorphic Progress Background */}
        {trackLoaded && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${playbackProgress}%`,
              background: `
                linear-gradient(180deg, 
                  rgba(255, 235, 59, 0.2) 0%, 
                  rgba(255, 193, 7, 0.3) 25%,
                  rgba(255, 143, 0, 0.25) 75%,
                  rgba(230, 81, 0, 0.2) 100%
                )
              `,
              borderRadius: '8px',
              zIndex: 1,
              transition: isPlaying ? 'none' : 'width 0.3s ease',
              boxShadow: `
                inset 0 1px 3px rgba(255,235,59,0.4),
                inset 0 -1px 2px rgba(0,0,0,0.3)
              `,
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '2px',
                height: '100%',
                background: 'linear-gradient(180deg, #ffeb3b, #ff8f00)',
                borderRadius: '0 8px 8px 0',
                boxShadow: '1px 0 3px rgba(255,235,59,0.8)'
              }
            }}
          />
        )}
        
        {/* Waveform Bars with Horizontal Movement */}
        {waveformData.map((amplitude: number, i: number) => {
          // Create moving animation effect when playing
          const animatedAmplitude = isPlaying && trackLoaded 
            ? amplitude + (Math.sin((Date.now() * 0.003) + (i + animationOffset) * 0.1) * 0.05)
            : amplitude;
          
          const finalAmplitude = Math.max(0.05, Math.min(1.0, animatedAmplitude));
          
          // Determine if this bar is in the "played" portion
          const barPosition = (i / waveformData.length) * 100;
          const isPlayed = barPosition <= playbackProgress;
          
          return (
            <Box 
              key={i} 
              sx={{ 
                height: `${finalAmplitude * 80}%`, 
                flex: 1,
                minWidth: '2px',
                maxWidth: '4px',
                background: trackLoaded 
                  ? (isPlayed 
                      ? (isPlaying 
                          ? `linear-gradient(180deg, 
                              #ffeb3b 0%, 
                              #ffc107 25%, 
                              #ff8f00 75%, 
                              #e65100 100%
                            )` 
                          : `linear-gradient(180deg, 
                              #ffc107 0%, 
                              #ff9800 50%, 
                              #f57400 100%
                            )`
                        ) 
                      : `linear-gradient(180deg, 
                          #555 0%, 
                          #333 50%, 
                          #222 100%
                        )`) 
                  : `linear-gradient(180deg, 
                      #666 0%, 
                      #444 50%, 
                      #333 100%
                    )`,
                mx: '0.5px',
                borderRadius: '3px',
                border: trackLoaded && isPlayed 
                  ? '1px solid rgba(255,235,59,0.3)' 
                  : '1px solid rgba(255,255,255,0.1)',
                transition: isPlaying ? 'height 0.1s ease' : 'background 0.3s ease, height 0.2s ease',
                zIndex: 2,
                position: 'relative',
                opacity: trackLoaded ? (isPlayed ? 1 : 0.7) : 0.5,
                transform: isPlaying ? `translateX(${Math.sin((i + animationOffset) * 0.02) * 1}px)` : 'none',
                boxShadow: isPlaying && trackLoaded && isPlayed 
                  ? `
                    0 0 4px rgba(255, 235, 59, 0.6),
                    inset 0 1px 2px rgba(255,255,255,0.3),
                    inset 0 -1px 2px rgba(0,0,0,0.5)
                  ` 
                  : `
                    inset 0 1px 1px rgba(255,255,255,0.15),
                    inset 0 -1px 1px rgba(0,0,0,0.6),
                    0 1px 2px rgba(0,0,0,0.3)
                  `,
                '&::before': trackLoaded && isPlayed && finalAmplitude > 0.3 ? {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                  borderRadius: '3px 3px 0 0'
                } : {}
              }} 
            />
          );
        })}
        
        {/* Professional Grid Lines */}
        {trackLoaded && (
          <>
            {/* Horizontal center line */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '4px',
                right: '4px',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, rgba(255,235,59,0.15), transparent)',
                transform: 'translateY(-50%)',
                zIndex: 1
              }}
            />
            {/* Vertical time markers */}
            {[25, 50, 75].map(position => (
              <Box
                key={position}
                sx={{
                  position: 'absolute',
                  left: `${position}%`,
                  top: '10%',
                  height: '80%',
                  width: '1px',
                  background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.1), transparent)',
                  zIndex: 1
                }}
              />
            ))}
          </>
        )}
        
        {/* Skeuomorphic Playhead Indicator */}
        {trackLoaded && (
          <Box
            sx={{
              position: 'absolute',
              left: `${playbackProgress}%`,
              top: '5%',
              height: '90%',
              width: '4px',
              background: isPlaying 
                ? `linear-gradient(180deg, 
                    #ff5722 0%, 
                    #f4511e 25%, 
                    #e64100 75%, 
                    #bf360c 100%
                  )`
                : `linear-gradient(180deg, 
                    #ffeb3b 0%, 
                    #ffc107 25%, 
                    #ff8f00 75%, 
                    #e65100 100%
                  )`,
              zIndex: 4,
              borderRadius: '4px',
              border: '1px solid rgba(255,255,255,0.3)',
              boxShadow: isPlaying 
                ? `
                  0 0 12px rgba(255, 87, 34, 0.9), 
                  0 0 6px rgba(255, 87, 34, 1),
                  inset 0 1px 2px rgba(255,255,255,0.4),
                  inset 0 -1px 2px rgba(0,0,0,0.6)
                ` 
                : `
                  0 0 8px rgba(255, 235, 59, 0.7),
                  inset 0 1px 2px rgba(255,255,255,0.3),
                  inset 0 -1px 2px rgba(0,0,0,0.5)
                `,
              transition: isPlaying ? 'none' : 'left 0.3s ease',
              transform: 'translateX(-50%)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
                borderRadius: '4px 4px 0 0'
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '2px',
                height: '20%',
                background: 'rgba(255,255,255,0.8)',
                transform: 'translate(-50%, -50%)',
                borderRadius: '1px'
              }
            }}
          />
        )}
        
        {/* Loading Line Animation */}
        {isLoading && (
          <Box
            sx={{
              position: 'absolute',
              left: `${loadingProgress}%`,
              top: 0,
              height: '100%',
              width: '3px',
              background: 'linear-gradient(180deg, #ff9800 0%, #ffc107 50%, #ff9800 100%)',
              zIndex: 5,
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(255, 152, 0, 0.8), 0 0 20px rgba(255, 152, 0, 0.4)',
              transform: 'translateX(-50%)',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: '-15px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '30px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 152, 0, 0.8) 50%, transparent 100%)',
                borderRadius: '1px'
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                left: '-10px',
                top: '30%',
                width: '20px',
                height: '40%',
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 152, 0, 0.3) 50%, transparent 100%)',
                borderRadius: '2px'
              }
            }}
          />
        )}

        {/* Hover Seek Indicator */}
        {onSeek && trackLoaded && !isLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 4,
              '&:hover::after': {
                content: '""',
                position: 'absolute',
                top: '10%',
                height: '80%',
                width: '1px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                pointerEvents: 'none'
              }
            }}
          />
        )}
      </Box>

      {/* Progress Bar (Alternative minimal view) */}
      {trackLoaded && (
        <Box sx={{ 
          width: '100%', 
          height: '2px', 
          backgroundColor: '#333',
          borderRadius: '1px',
          mt: 1,
          overflow: 'hidden'
        }}>
          <Box
            sx={{
              height: '100%',
              width: `${playbackProgress}%`,
              backgroundColor: isPlaying ? '#ffeb3b' : '#ffc107',
              transition: isPlaying ? 'none' : 'width 0.3s ease',
              borderRadius: '1px'
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default Waveform;
