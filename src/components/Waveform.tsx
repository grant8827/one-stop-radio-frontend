
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// CSS Animation for loading pulse effect
const pulseAnimation = keyframes`
  0% {
    opacity: 0.6;
    transform: scaleX(1);
  }
  100% {
    opacity: 1;
    transform: scaleX(1.05);
  }
`;

// Smooth progress bar animation
const progressGlow = keyframes`
  0% {
    box-shadow: 0 0 8px rgba(255, 235, 59, 0.7);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 235, 59, 0.9), 0 0 25px rgba(255, 193, 7, 0.4);
  }
  100% {
    box-shadow: 0 0 8px rgba(255, 235, 59, 0.7);
  }
`;

interface WaveformProps {
  height?: number;
  progress?: number; // Manual progress override (0-100)
  isPlaying?: boolean;
  trackLoaded?: boolean;
  isLoading?: boolean;
  bufferProgress?: number; // Buffer progress (0-100)
  songDuration?: number; // Song duration in seconds
  currentTime?: number; // Current playback time in seconds
  songTitle?: string;
  realTimeData?: Float32Array | null; // Real-time audio waveform data
  onSeek?: (percentage: number) => void; // Callback for seeking
  onTimeUpdate?: (currentTime: number, duration: number) => void; // Real-time updates
}

// Enhanced realistic waveform generation with more musical patterns
const generateWaveformData = (bars: number = 300): number[] => {
  const waveData: number[] = [];
  const seed = Math.random(); // Consistent randomness for this track
  
  for (let i = 0; i < bars; i++) {
    const position = i / bars;
    
    // Create realistic song structure with multiple layers
    let amplitude = 0.08; // Base noise floor
    
    // Musical structure simulation
    const kickPattern = Math.sin(position * bars * 0.25) * 0.3; // Kick drum pattern
    const snarePattern = Math.sin(position * bars * 0.5 + Math.PI) * 0.2; // Snare pattern
    const hihatPattern = Math.sin(position * bars * 2) * 0.1; // Hi-hat pattern
    const bassline = Math.sin(position * bars * 0.125 + seed * 2 * Math.PI) * 0.25; // Bassline
    
    // Song sections with dynamic energy
    if (position < 0.08) {
      // Intro - gradual build
      amplitude = 0.2 + (position / 0.08) * 0.3;
      amplitude += kickPattern * 0.3;
    } else if (position < 0.22) {
      // Verse 1 - moderate energy
      amplitude = 0.45 + Math.sin(position * 32) * 0.15;
      amplitude += (kickPattern + snarePattern + bassline) * 0.4;
    } else if (position < 0.36) {
      // Pre-Chorus - building energy
      amplitude = 0.6 + Math.sin(position * 48) * 0.2;
      amplitude += (kickPattern + snarePattern + hihatPattern + bassline) * 0.5;
    } else if (position < 0.52) {
      // Chorus - high energy
      amplitude = 0.8 + Math.sin(position * 64) * 0.15;
      amplitude += (kickPattern + snarePattern + hihatPattern + bassline) * 0.6;
    } else if (position < 0.66) {
      // Verse 2 - similar to verse 1 but slightly more intense
      amplitude = 0.5 + Math.sin(position * 40) * 0.18;
      amplitude += (kickPattern + snarePattern + bassline) * 0.45;
    } else if (position < 0.74) {
      // Bridge - breakdown section
      amplitude = 0.35 + Math.sin(position * 16) * 0.25;
      amplitude += bassline * 0.4 + hihatPattern * 0.3;
    } else if (position < 0.92) {
      // Final Chorus - peak energy
      amplitude = 0.9 + Math.sin(position * 72) * 0.1;
      amplitude += (kickPattern + snarePattern + hihatPattern + bassline) * 0.7;
    } else {
      // Outro - fadeout
      const fadeAmount = 1 - ((position - 0.92) / 0.08);
      amplitude = 0.6 * fadeAmount;
      amplitude += (kickPattern + bassline) * 0.3 * fadeAmount;
    }
    
    // Add realistic audio characteristics
    const harmonics = Math.sin(position * bars * 8) * 0.05; // High frequency content
    const subBass = Math.sin(position * bars * 0.0625) * 0.1; // Sub bass
    amplitude += harmonics + subBass;
    
    // Add controlled randomness for natural variation
    const randomFactor = (Math.sin(seed * 1000 + i * 0.1) + 1) / 2; // Pseudo-random based on seed
    amplitude += (randomFactor - 0.5) * 0.08;
    
    // Ensure amplitude stays within bounds
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
  bufferProgress = 0,
  songDuration = 180, // Default 3 minutes
  currentTime = 0,
  songTitle = "Current Track",
  realTimeData = null,
  onSeek,
  onTimeUpdate
}) => {
  
  const [waveformData] = useState(() => generateWaveformData(250));
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [internalCurrentTime, setInternalCurrentTime] = useState(0);
  const [animationOffset, setAnimationOffset] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [songLoadProgress, setSongLoadProgress] = useState(0);
  const [realTimeBuffer, setRealTimeBuffer] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const lastProgressRef = useRef<number>(0);
  
  // Calculate progress based on currentTime prop or manual progress override
  const calculateProgress = useCallback(() => {
    if (progress > 0) {
      // Manual progress override
      return progress;
    } else if (currentTime > 0) {
      // Use provided current time (most accurate)
      return Math.min((currentTime / songDuration) * 100, 100);
    }
    return 0;
  }, [progress, currentTime, songDuration]);

  // Enhanced progress and animation system with real-time buffering
  useEffect(() => {
    const updateAnimation = () => {
      const newProgress = calculateProgress();
      setPlaybackProgress(newProgress);
      
      // Update internal time for smooth transitions
      const newCurrentTime = (newProgress / 100) * songDuration;
      setInternalCurrentTime(newCurrentTime);
      
      // Simulate realistic buffering ahead of playback position
      if (isPlaying && trackLoaded) {
        const bufferAhead = Math.min(newProgress + 15 + Math.random() * 10, 100);
        setRealTimeBuffer(bufferAhead);
      }
      
      // Call time update callback for parent components
      if (onTimeUpdate) {
        onTimeUpdate(newCurrentTime, songDuration);
      }
      
      // Animate waveform movement when playing - more dynamic
      if (isPlaying && trackLoaded) {
        setAnimationOffset(prev => (prev + 1.2) % 360); // Smoother circular movement
      }
      
      // Track progress changes for smooth transitions
      lastProgressRef.current = newProgress;
      
      // Continue animation if playing
      if (isPlaying && trackLoaded) {
        animationFrameRef.current = requestAnimationFrame(updateAnimation);
      }
    };
    
    if (isPlaying && trackLoaded) {
      // Start animation loop
      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now();
      }
      updateAnimation();
    } else {
      // Update progress even when not playing
      const newProgress = calculateProgress();
      setPlaybackProgress(newProgress);
      setInternalCurrentTime((newProgress / 100) * songDuration);
      
      // Cancel animation but don't reset offset (pause behavior)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
      
      // Reset start time when stopped
      if (!isPlaying && progress === 0) {
        startTimeRef.current = 0;
        setAnimationOffset(0);
        setRealTimeBuffer(0);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, [isPlaying, trackLoaded, calculateProgress, progress, songDuration, onTimeUpdate]);

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

  // Song loading progress animation (simulates actual file loading)
  useEffect(() => {
    let songLoadAnimationFrame: number;
    let startTime: number;
    
    const updateSongLoadAnimation = () => {
      if (isLoading && !trackLoaded) {
        if (!startTime) startTime = Date.now();
        
        const elapsed = Date.now() - startTime;
        const loadDuration = 3000; // 3 seconds to simulate loading
        const progress = Math.min((elapsed / loadDuration) * 100, 95); // Don't reach 100% until actually loaded
        
        setSongLoadProgress(progress);
        
        if (progress < 95) {
          songLoadAnimationFrame = requestAnimationFrame(updateSongLoadAnimation);
        }
      } else if (trackLoaded) {
        setSongLoadProgress(100);
      } else {
        setSongLoadProgress(0);
      }
    };
    
    if (isLoading && !trackLoaded) {
      updateSongLoadAnimation();
    } else if (trackLoaded) {
      setSongLoadProgress(100);
    } else if (!isLoading) {
      setSongLoadProgress(0);
    }

    return () => {
      if (songLoadAnimationFrame) {
        cancelAnimationFrame(songLoadAnimationFrame);
      }
    };
  }, [isLoading, trackLoaded]);

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
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{
            background: 'rgba(0, 0, 0, 0.6)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 235, 59, 0.3)'
          }}>
            <Typography variant="caption" sx={{ 
              color: isPlaying ? '#ffeb3b' : '#ffc107', 
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}>
              {formatTime(internalCurrentTime)}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ 
            color: '#888',
            fontSize: '0.7rem',
            fontWeight: 'bold'
          }}>
            /
          </Typography>
          <Box sx={{
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Typography variant="caption" sx={{ 
              color: '#aaa', 
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.8)'
            }}>
              {formatTime(songDuration)}
            </Typography>
          </Box>
          
          {/* Time Remaining (Countdown) */}
          {trackLoaded && songDuration > 0 && (
            <>
              <Typography variant="caption" sx={{ 
                color: '#666',
                fontSize: '0.7rem',
                mx: 0.5
              }}>
                •
              </Typography>
              <Box sx={{
                background: 'rgba(244, 67, 54, 0.15)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(244, 67, 54, 0.3)'
              }}>
                <Typography variant="caption" sx={{ 
                  color: isPlaying ? '#f44336' : '#ff7961', 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)'
                }}>
                  -{formatTime(Math.max(0, songDuration - internalCurrentTime))}
                </Typography>
              </Box>
            </>
          )}
          
          {/* Progress Percentage Display */}
          <Box sx={{
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '1px 4px',
            borderRadius: '3px',
            border: '1px solid rgba(255, 235, 59, 0.2)',
            ml: 1
          }}>
            <Typography variant="caption" sx={{ 
              color: '#ffeb3b', 
              fontFamily: 'monospace',
              fontSize: '0.65rem',
              opacity: 0.8
            }}>
              {playbackProgress.toFixed(1)}%
            </Typography>
          </Box>
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
        {/* Dynamic Buffer Progress Background - Shows real-time buffering */}
        {(trackLoaded || isLoading) && (bufferProgress > 0 || realTimeBuffer > 0) && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${Math.min(Math.max(bufferProgress, realTimeBuffer), 100)}%`,
              background: `
                linear-gradient(180deg, 
                  rgba(96, 125, 139, 0.15) 0%, 
                  rgba(69, 90, 120, 0.2) 25%,
                  rgba(55, 71, 79, 0.25) 75%,
                  rgba(38, 50, 56, 0.2) 100%
                )
              `,
              borderRadius: '8px',
              zIndex: 0.5,
              transition: 'width 0.5s ease',
              boxShadow: `
                inset 0 1px 2px rgba(96,125,139,0.3),
                inset 0 -1px 1px rgba(0,0,0,0.2)
              `,
              '&::after': bufferProgress < 100 ? {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '1px',
                height: '100%',
                background: 'linear-gradient(180deg, rgba(96,125,139,0.6), rgba(55,71,79,0.4))',
                borderRadius: '0 8px 8px 0',
                boxShadow: '0.5px 0 2px rgba(96,125,139,0.5)'
              } : {}
            }}
          />
        )}

        {/* Playback Progress Background - Shows current playback position */}
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
        
        {/* Enhanced Waveform Bars with Dynamic Animation and Real-Time Data */}
        {waveformData.map((amplitude: number, i: number) => {
          // Enhanced animation with multiple layers
          let animatedAmplitude = amplitude;
          
          // Use real-time audio data when available
          if (realTimeData && isPlaying && trackLoaded) {
            // Map waveform bar index to real-time data array
            const dataIndex = Math.floor((i / waveformData.length) * realTimeData.length);
            const realTimeAmplitude = Math.abs(realTimeData[dataIndex] || 0);
            
            // Blend real-time data with base waveform for visual consistency
            const realTimeScale = Math.min(1.0, realTimeAmplitude * 2); // Scale real-time data
            animatedAmplitude = (amplitude * 0.3) + (realTimeScale * 0.7); // 70% real-time, 30% base
            
            // Add subtle animation for visual appeal
            const waveMotion = Math.sin((animationOffset * 0.02) + (i * 0.08)) * 0.02;
            animatedAmplitude += waveMotion;
          } else if (isPlaying && trackLoaded) {
            // Fallback animation when no real-time data
            const waveMotion = Math.sin((animationOffset * 0.02) + (i * 0.08)) * 0.04;
            const freqResponse = Math.sin((animationOffset * 0.05) + (i * 0.12)) * 0.03;
            const beatPulse = Math.sin(animationOffset * 0.1) * 0.02;
            
            animatedAmplitude += waveMotion + freqResponse + beatPulse;
          }
          
          const finalAmplitude = Math.max(0.05, Math.min(1.0, animatedAmplitude));
          
          // Determine bar states based on position with enhanced buffering
          const barPosition = (i / waveformData.length) * 100;
          const isPlayed = barPosition <= playbackProgress;
          const effectiveBuffer = Math.max(bufferProgress, realTimeBuffer);
          const isBuffered = barPosition <= effectiveBuffer;
          const isLoaded = barPosition <= songLoadProgress;
          const isNearPlayhead = Math.abs(barPosition - playbackProgress) < 3;
          const isInBufferZone = barPosition > playbackProgress && barPosition <= effectiveBuffer;
          
          return (
            <Box 
              key={i} 
              sx={{ 
                height: `${finalAmplitude * 85}%`, 
                flex: 1,
                minWidth: '1.5px',
                maxWidth: '3px',
                background: trackLoaded 
                  ? (isPlayed 
                      ? (isPlaying 
                          ? (isNearPlayhead 
                              ? `linear-gradient(180deg, 
                                  #ffffff 0%, 
                                  #00e5ff 8%, 
                                  #1de9b6 15%, 
                                  #ffeb3b 25%, 
                                  #ffc107 45%, 
                                  #ff8f00 70%, 
                                  #e65100 100%
                                )` 
                              : `linear-gradient(180deg, 
                                  #00e5ff 0%, 
                                  #00bcd4 12%, 
                                  #26c6da 22%, 
                                  #ffeb3b 35%, 
                                  #ffc107 55%, 
                                  #ff8f00 78%, 
                                  #e65100 100%
                                )`
                            ) 
                          : `linear-gradient(180deg, 
                              #4dd0e1 0%, 
                              #26c6da 18%, 
                              #00acc1 35%, 
                              #ffc107 50%, 
                              #ff9800 75%, 
                              #f57400 100%
                            )`
                        ) 
                      : (isInBufferZone 
                          ? `linear-gradient(180deg, 
                              #e1f5fe 0%, 
                              #b3e5fc 15%, 
                              #81d4fa 35%, 
                              #4fc3f7 60%, 
                              #29b6f6 85%, 
                              #0288d1 100%
                            )`
                          : (isBuffered 
                              ? `linear-gradient(180deg, 
                                  #c8e6c9 0%, 
                                  #a5d6a7 20%, 
                                  #81c784 40%, 
                                  #66bb6a 65%, 
                                  #4caf50 85%, 
                                  #43a047 100%
                                )`
                              : `linear-gradient(180deg, 
                                  #cfd8dc 0%, 
                                  #b0bec5 20%, 
                                  #90a4ae 40%, 
                                  #78909c 65%, 
                                  #607d8b 85%, 
                                  #546e7a 100%
                                )`
                            )
                        )
                    ) 
                  : (isLoading && isLoaded
                      ? `linear-gradient(180deg, 
                          #dcedc8 0%, 
                          #c5e1a5 18%, 
                          #aed581 35%, 
                          #9ccc65 55%, 
                          #8bc34a 75%, 
                          #7cb342 100%
                        )`
                      : `linear-gradient(180deg, 
                          #e0e0e0 0%, 
                          #bdbdbd 20%, 
                          #9e9e9e 40%, 
                          #757575 65%, 
                          #616161 85%, 
                          #424242 100%
                        )`
                    ),
                mx: '0.3px',
                borderRadius: '2px',
                border: trackLoaded 
                  ? (isPlayed 
                      ? (isNearPlayhead 
                          ? '1px solid rgba(255,255,255,0.8)'
                          : '1px solid rgba(0,229,255,0.5)'
                        )
                      : (isInBufferZone 
                          ? '1px solid rgba(79,195,247,0.4)'
                          : (isBuffered 
                              ? '1px solid rgba(129,199,132,0.4)'
                              : '1px solid rgba(207,216,220,0.2)'
                            )
                        )
                    )
                  : (isLoading && isLoaded 
                      ? '1px solid rgba(156,204,101,0.5)'
                      : '1px solid rgba(224,224,224,0.1)'
                    ),
                transition: isPlaying ? 'height 0.05s ease-out' : 'all 0.3s ease',
                zIndex: isNearPlayhead ? 3 : 2,
                position: 'relative',
                opacity: trackLoaded 
                  ? (isPlayed 
                      ? (isNearPlayhead ? 1 : 0.95) 
                      : (isInBufferZone 
                          ? 0.85 
                          : (isBuffered ? 0.75 : 0.35)
                        )
                    ) 
                  : (isLoading && isLoaded ? 0.85 : 0.25),
                transform: isPlaying && trackLoaded 
                  ? `translateX(${Math.sin((i + animationOffset) * 0.015) * 0.8}px) scaleY(${1 + Math.sin((animationOffset + i) * 0.1) * 0.05})`
                  : 'none',
                boxShadow: isPlaying && trackLoaded && isPlayed 
                  ? (isNearPlayhead 
                      ? `
                        0 0 12px rgba(255, 255, 255, 0.8),
                        0 0 6px rgba(255, 235, 59, 1),
                        inset 0 2px 4px rgba(255,255,255,0.4),
                        inset 0 -2px 4px rgba(0,0,0,0.3)
                      `
                      : `
                        0 0 6px rgba(255, 235, 59, 0.7),
                        inset 0 1px 3px rgba(255,255,255,0.3),
                        inset 0 -1px 3px rgba(0,0,0,0.4)
                      `
                    )
                  : `
                    inset 0 1px 2px rgba(255,255,255,0.1),
                    inset 0 -1px 2px rgba(0,0,0,0.6),
                    0 1px 2px rgba(0,0,0,0.2)
                  `,
                animation: isPlaying && trackLoaded && isPlayed && isNearPlayhead 
                  ? `${progressGlow} 0.8s ease-in-out infinite`
                  : 'none',
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
        
        {/* Enhanced Playhead Indicator with Smooth Animation */}
        {trackLoaded && (
          <>
            {/* Playhead Base Line */}
            <Box
              sx={{
                position: 'absolute',
                left: `${playbackProgress}%`,
                top: '2%',
                height: '96%',
                width: '2px',
                background: `linear-gradient(180deg, 
                  rgba(255, 255, 255, 0.9) 0%, 
                  rgba(255, 235, 59, 1) 10%, 
                  rgba(255, 193, 7, 1) 50%, 
                  rgba(255, 143, 0, 1) 90%,
                  rgba(230, 81, 0, 0.9) 100%
                )`,
                zIndex: 5,
                borderRadius: '2px',
                transform: 'translateX(-50%)',
                transition: isPlaying ? 'none' : 'left 0.2s ease-out',
                boxShadow: isPlaying 
                  ? `
                    0 0 20px rgba(255, 235, 59, 1),
                    0 0 10px rgba(255, 193, 7, 0.8),
                    0 0 5px rgba(255, 143, 0, 0.6)
                  `
                  : `
                    0 0 12px rgba(255, 235, 59, 0.8),
                    0 0 6px rgba(255, 193, 7, 0.6)
                  `
              }}
            />
            
            {/* Playhead Knob/Handle */}
            <Box
              sx={{
                position: 'absolute',
                left: `${playbackProgress}%`,
                top: '-8px',
                width: '16px',
                height: '16px',
                background: `linear-gradient(135deg, 
                  #fff 0%, 
                  #ffeb3b 20%, 
                  #ffc107 40%, 
                  #ff8f00 80%, 
                  #e65100 100%
                )`,
                zIndex: 6,
                borderRadius: '50%',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                transform: 'translateX(-50%)',
                transition: isPlaying ? 'none' : 'left 0.2s ease-out',
                boxShadow: isPlaying 
                  ? `
                    0 0 15px rgba(255, 235, 59, 1),
                    0 0 8px rgba(255, 193, 7, 0.8),
                    0 2px 8px rgba(0, 0, 0, 0.3),
                    inset 0 2px 4px rgba(255, 255, 255, 0.4),
                    inset 0 -2px 4px rgba(0, 0, 0, 0.3)
                  `
                  : `
                    0 0 10px rgba(255, 235, 59, 0.8),
                    0 2px 6px rgba(0, 0, 0, 0.2),
                    inset 0 1px 3px rgba(255, 255, 255, 0.3),
                    inset 0 -1px 3px rgba(0, 0, 0, 0.2)
                  `,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '3px',
                  left: '3px',
                  right: '3px',
                  height: '4px',
                  background: 'linear-gradient(90deg, transparent 20%, rgba(255,255,255,0.8) 50%, transparent 80%)',
                  borderRadius: '50%'
                }
              }}
            />
            
            {/* Bottom Playhead Extension */}
            <Box
              sx={{
                position: 'absolute',
                left: `${playbackProgress}%`,
                bottom: '-8px',
                width: '12px',
                height: '12px',
                background: `linear-gradient(135deg, 
                  #ffeb3b 0%, 
                  #ffc107 30%, 
                  #ff8f00 70%, 
                  #e65100 100%
                )`,
                zIndex: 6,
                borderRadius: '50%',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                transform: 'translateX(-50%)',
                transition: isPlaying ? 'none' : 'left 0.2s ease-out',
                boxShadow: isPlaying 
                  ? `
                    0 0 10px rgba(255, 235, 59, 0.8),
                    0 1px 4px rgba(0, 0, 0, 0.3)
                  `
                  : `
                    0 0 6px rgba(255, 235, 59, 0.6),
                    0 1px 3px rgba(0, 0, 0, 0.2)
                  `
              }}
            />
          </>
        )}
        
        {/* Song Loading Progress Line - Shows actual loading progress */}
        {isLoading && songLoadProgress > 0 && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${songLoadProgress}%`,
              background: `
                linear-gradient(90deg, 
                  transparent 0%,
                  rgba(76, 175, 80, 0.1) 20%,
                  rgba(76, 175, 80, 0.2) 50%,
                  rgba(76, 175, 80, 0.3) 80%,
                  rgba(76, 175, 80, 0.4) 95%,
                  rgba(76, 175, 80, 0.5) 100%
                )
              `,
              zIndex: 0.3,
              borderRadius: '8px',
              transition: 'width 0.3s ease',
              '&::after': songLoadProgress < 100 ? {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '4px',
                height: '100%',
                background: `
                  linear-gradient(180deg, 
                    #4caf50 0%, 
                    #66bb6a 25%, 
                    #81c784 75%, 
                    #a5d6a7 100%
                  )
                `,
                borderRadius: '0 8px 8px 0',
                boxShadow: `
                  0 0 8px rgba(76, 175, 80, 0.8),
                  0 0 4px rgba(76, 175, 80, 1),
                  inset 0 1px 2px rgba(255,255,255,0.3)
                `,
                animation: `${pulseAnimation} 1s ease-in-out infinite alternate`
              } : {}
            }}
          />
        )}

        {/* Loading Line Animation - Scanning indicator */}
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

      {/* Enhanced Progress Bar with Real-time Buffer Indication */}
      {trackLoaded && (
        <Box sx={{ position: 'relative', mt: 1 }}>
          {/* Time markers */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            px: 0.5,
            mb: 0.5
          }}>
            <Typography variant="caption" sx={{ 
              color: '#666', 
              fontFamily: 'monospace',
              fontSize: '0.6rem'
            }}>
              0:00
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#666', 
              fontFamily: 'monospace',
              fontSize: '0.6rem'
            }}>
              {formatTime(songDuration * 0.25)}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#666', 
              fontFamily: 'monospace',
              fontSize: '0.6rem'
            }}>
              {formatTime(songDuration * 0.5)}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#666', 
              fontFamily: 'monospace',
              fontSize: '0.6rem'
            }}>
              {formatTime(songDuration * 0.75)}
            </Typography>
            <Typography variant="caption" sx={{ 
              color: '#666', 
              fontFamily: 'monospace',
              fontSize: '0.6rem'
            }}>
              {formatTime(songDuration)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            width: '100%', 
            height: '3px', 
            backgroundColor: 'rgba(0,0,0,0.6)',
            borderRadius: '2px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)'
          }}>
          {/* Real-time Buffer Progress Bar */}
          {(bufferProgress > 0 || realTimeBuffer > 0) && (
            <Box
              sx={{
                position: 'absolute',
                height: '100%',
                width: `${Math.min(Math.max(bufferProgress, realTimeBuffer), 100)}%`,
                background: isPlaying 
                  ? 'linear-gradient(90deg, #4fc3f7, #29b6f6, #0288d1)'
                  : 'linear-gradient(90deg, #81c784, #66bb6a, #4caf50)',
                transition: isPlaying ? 'width 0.3s ease' : 'width 0.5s ease',
                borderRadius: '2px',
                opacity: 0.7,
                boxShadow: isPlaying ? '0 0 4px rgba(79,195,247,0.6)' : '0 0 3px rgba(129,199,132,0.5)'
              }}
            />
          )}
          
          {/* Playback Progress Bar */}
          <Box
            sx={{
              height: '100%',
              width: `${playbackProgress}%`,
              background: isPlaying 
                ? 'linear-gradient(90deg, #00e5ff, #ffeb3b, #ffc107, #ff8f00)'
                : 'linear-gradient(90deg, #00acc1, #ffc107, #ff9800)',
              transition: isPlaying ? 'none' : 'width 0.3s ease',
              borderRadius: '2px',
              position: 'relative',
              zIndex: 2,
              boxShadow: isPlaying 
                ? '0 0 6px rgba(255,235,59,0.8), 0 0 3px rgba(0,229,255,0.6)'
                : '0 0 4px rgba(255,193,7,0.6)'
            }}
          />
          
          {/* Loading Indicator for Active Streaming */}
          {isPlaying && trackLoaded && (
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '4px',
                height: '4px',
                backgroundColor: '#1de9b6',
                borderRadius: '50%',
                animation: `${progressGlow} 1.2s ease-in-out infinite`,
                boxShadow: '0 0 6px #1de9b6'
              }}
            />
          )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default Waveform;
