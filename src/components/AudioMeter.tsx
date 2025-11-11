
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const MeterSegment: React.FC<{ active?: boolean; color: string; intensity?: number }> = ({ 
  active, 
  color, 
  intensity = 1 
}) => (
  <Box
    sx={{
      height: 2.5,
      width: '100%',
      backgroundColor: active ? color : '#333',
      mb: '1px',
      borderRadius: '1px',
      transition: 'background-color 0.05s ease, box-shadow 0.05s ease',
      opacity: active ? Math.max(0.6, intensity) : 0.4,
      boxShadow: active && intensity > 0.8 
        ? `0 0 3px ${color}, inset 0 1px 1px rgba(255,255,255,0.2)` 
        : active 
          ? `inset 0 1px 1px rgba(255,255,255,0.1)`
          : 'none',
      transform: active && intensity > 0.9 ? 'scaleX(1.05)' : 'scaleX(1)'
    }}
  />
);

interface AudioMeterProps {
  label: string;
  height?: number;
  isPlaying?: boolean;
  level?: number;
}

const AudioMeter: React.FC<AudioMeterProps> = ({ 
  label, 
  height = 60, 
  isPlaying = false, 
  level = 0 
}) => {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [peakHoldTime, setPeakHoldTime] = useState(0);

  // Update meter levels with smooth animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let animationFrame: number;
    
    if (level !== undefined && level >= 0) {
      // Use real level data when available - animate smoothly to target
      const animateToLevel = () => {
        setCurrentLevel(prevLevel => {
          const diff = level - prevLevel;
          const step = Math.sign(diff) * Math.min(Math.abs(diff), Math.max(1, Math.abs(diff) * 0.3));
          const newLevel = prevLevel + step;
          
          // Continue animation if not close enough
          if (Math.abs(level - newLevel) > 0.5) {
            animationFrame = requestAnimationFrame(animateToLevel);
          }
          
          return Math.max(0, Math.min(100, newLevel));
        });
      };
      
      animateToLevel();
      
      // Update peak hold
      if (level > peakLevel || peakHoldTime <= 0) {
        setPeakLevel(level);
        setPeakHoldTime(60); // Hold for ~1 second at 60fps
      } else {
        setPeakHoldTime(prev => prev - 1);
        if (peakHoldTime <= 0) {
          setPeakLevel(prev => Math.max(0, prev - 2)); // Slowly decay peak
        }
      }
    } else if (isPlaying && level === undefined) {
      // Simulate realistic audio meter behavior when no real data
      interval = setInterval(() => {
        const baseLevel = 70;
        const variation = (Math.random() - 0.5) * 30;
        const newLevel = Math.max(0, Math.min(100, baseLevel + variation));
        setCurrentLevel(newLevel);
      }, 80); // Update every 80ms for realistic meter movement
    } else if (!isPlaying && level === undefined) {
      // Animate down to zero when not playing
      const animateToZero = () => {
        setCurrentLevel(prevLevel => {
          if (prevLevel > 0.5) {
            const newLevel = prevLevel * 0.85; // Exponential decay
            animationFrame = requestAnimationFrame(animateToZero);
            return newLevel;
          }
          return 0;
        });
      };
      animateToZero();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, level, peakLevel, peakHoldTime]);

  // Calculate which segments should be active based on current level
  // Arranged from top to bottom: Red (top) → Yellow (middle) → Green (bottom)
  const segments = [
    { color: '#ff0000', threshold: 90 }, // Red - Peak/Clip (TOP)
    { color: '#ff7f00', threshold: 75 },
    { color: '#ffff00', threshold: 60 }, // Yellow (MIDDLE)
    { color: '#bfff00', threshold: 45 },
    { color: '#7fff00', threshold: 30 },
    { color: '#00ff00', threshold: 15 }, // Green (BOTTOM)
    { color: '#00ff00', threshold: 5 },
    { color: '#00ff00', threshold: 0 }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="caption" sx={{ color: isPlaying ? '#ffeb3b' : '#cccccc', fontWeight: 'bold' }}>
        {label}
      </Typography>
      <Box sx={{ 
        border: '1px solid #444', 
        borderRadius: '2px', 
        p: '1px', 
        width: 16, 
        height,
        display: 'flex', 
        flexDirection: 'column', // Top to bottom: red → yellow → green
        backgroundColor: '#1a1a1a'
      }}>
        {segments.map((segment, index) => {
          // Calculate segment position from bottom (0 = bottom segment, 7 = top segment)
          const segmentPosition = segments.length - 1 - index;
          const segmentLevel = (segmentPosition / (segments.length - 1)) * 100;
          const isActive = currentLevel >= segmentLevel;
          const isPeak = Math.abs(peakLevel - segmentLevel) <= 12.5; // Peak indicator within range
          
          // Calculate intensity for visual effects (how much above threshold)
          const intensity = isActive ? Math.min(1, (currentLevel - segmentLevel) / 10 + 0.5) : 0;
          
          return (
            <MeterSegment 
              key={index}
              active={isActive || (isPeak && peakHoldTime > 0)}
              color={isPeak && peakHoldTime > 0 && !isActive ? '#ffffff' : segment.color}
              intensity={isPeak && peakHoldTime > 0 ? 1 : intensity}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default AudioMeter;
