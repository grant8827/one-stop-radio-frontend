
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const MeterSegment: React.FC<{ active?: boolean; color: string }> = ({ active, color }) => (
  <Box
    sx={{
      height: 4,
      width: '100%',
      backgroundColor: active ? color : '#333',
      mb: '2px',
      borderRadius: '1px',
      transition: 'background-color 0.1s ease'
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
  height = 80, 
  isPlaying = false, 
  level = 0 
}) => {
  const [currentLevel, setCurrentLevel] = useState(0);

  // Update meter levels from props or simulate when playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying) {
      if (level !== undefined) {
        // Use real level data when available (including 0)
        setCurrentLevel(level);
      } else {
        // Simulate realistic audio meter behavior when no real data
        interval = setInterval(() => {
          const baseLevel = 70;
          const variation = (Math.random() - 0.5) * 30;
          const newLevel = Math.max(0, Math.min(100, baseLevel + variation));
          setCurrentLevel(newLevel);
        }, 80); // Update every 80ms for realistic meter movement
      }
    } else {
      setCurrentLevel(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, level]);

  // Calculate which segments should be active based on current level
  // Arranged from top to bottom: Red (top) → Yellow (middle) → Green (bottom)
  const segments = [
    { color: '#ff0000', threshold: 95 }, // Red - Peak/Clip (TOP)
    { color: '#ff4500', threshold: 88 },
    { color: '#ff7f00', threshold: 80 },
    { color: '#ffbf00', threshold: 70 },
    { color: '#ffff00', threshold: 60 }, // Yellow (MIDDLE)
    { color: '#bfff00', threshold: 50 },
    { color: '#7fff00', threshold: 40 },
    { color: '#3fff00', threshold: 30 },
    { color: '#00ff00', threshold: 20 }, // Green (BOTTOM)
    { color: '#00ff00', threshold: 10 },
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
        p: '2px', 
        width: 20, 
        height,
        display: 'flex', 
        flexDirection: 'column', // Top to bottom: red → yellow → green
        backgroundColor: '#1a1a1a'
      }}>
        {segments.map((segment, index) => {
          // Calculate segment position from bottom (0 = bottom segment, 11 = top segment)
          const segmentPosition = segments.length - 1 - index;
          const segmentLevel = (segmentPosition / (segments.length - 1)) * 100;
          
          return (
            <MeterSegment 
              key={index}
              active={currentLevel >= segmentLevel}
              color={segment.color}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default AudioMeter;
