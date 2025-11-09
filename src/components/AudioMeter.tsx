
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

// Add CSS keyframes for blink animation
const style = document.createElement('style');
style.textContent = `
  @keyframes blink {
    0% { opacity: 1; }
    100% { opacity: 0.3; }
  }
`;
document.head.appendChild(style);

// VU Peak Meter Bar Component
const VUMeterBar: React.FC<{ 
  level: number; 
  peakLevel: number; 
  height: number;
  peakHoldTime: number;
}> = ({ level, peakLevel, height, peakHoldTime }) => {
  // Calculate colors based on level
  const getBarColor = (percentage: number) => {
    if (percentage <= 60) {
      // Green zone (0-60%)
      return `linear-gradient(180deg, 
        #00ff00 0%, 
        #66ff66 50%, 
        #33ff33 100%
      )`;
    } else if (percentage <= 85) {
      // Yellow zone (60-85%)
      return `linear-gradient(180deg, 
        #ffff00 0%, 
        #ffcc00 50%, 
        #ff9900 100%
      )`;
    } else {
      // Red zone (85-100%)
      return `linear-gradient(180deg, 
        #ff0000 0%, 
        #ff3333 50%, 
        #cc0000 100%
      )`;
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
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
        borderRadius: '4px',
        border: '1px solid #444',
        overflow: 'hidden',
        boxShadow: `
          inset 0 2px 4px rgba(0,0,0,0.8),
          inset 0 -1px 2px rgba(255,255,255,0.05)
        `
      }}
    >
      {/* Background scale marks */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            repeating-linear-gradient(
              180deg,
              transparent 0%,
              transparent 8%,
              rgba(255,255,255,0.05) 9%,
              transparent 10%
            )
          `,
          zIndex: 1
        }}
      />

      {/* Level bar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${Math.min(level, 100)}%`,
          background: getBarColor(level),
          zIndex: 2,
          transition: 'height 0.05s ease',
          boxShadow: level > 85 
            ? `
              0 0 8px rgba(255, 0, 0, 0.8),
              inset 0 1px 2px rgba(255,255,255,0.3)
            `
            : level > 60
              ? `
                0 0 4px rgba(255, 255, 0, 0.6),
                inset 0 1px 2px rgba(255,255,255,0.2)
              `
              : `
                0 0 2px rgba(0, 255, 0, 0.4),
                inset 0 1px 1px rgba(255,255,255,0.1)
              `,
          '&::before': level > 70 ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)'
          } : {}
        }}
      />

      {/* Peak indicator line */}
      {peakLevel > 5 && peakHoldTime > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: `${Math.min(peakLevel, 100)}%`,
            left: 0,
            right: 0,
            height: '2px',
            background: peakLevel > 90 
              ? 'linear-gradient(90deg, transparent, #ff0000, transparent)'
              : peakLevel > 75
                ? 'linear-gradient(90deg, transparent, #ffff00, transparent)'
                : 'linear-gradient(90deg, transparent, #ffffff, transparent)',
            zIndex: 3,
            boxShadow: peakLevel > 90 
              ? '0 0 6px rgba(255, 0, 0, 1)'
              : '0 0 4px rgba(255, 255, 255, 0.8)',
            opacity: Math.max(0.3, peakHoldTime / 60),
            animation: peakLevel > 95 ? 'blink 0.5s ease-in-out infinite alternate' : 'none'
          }}
        />
      )}

      {/* Clipping indicator */}
      {level >= 98 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: '#ff0000',
            zIndex: 4,
            boxShadow: '0 0 8px rgba(255, 0, 0, 1)',
            animation: 'blink 0.2s ease-in-out infinite alternate'
          }}
        />
      )}
    </Box>
  );
};

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



  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="caption" sx={{ color: isPlaying ? '#ffeb3b' : '#cccccc', fontWeight: 'bold' }}>
        {label}
      </Typography>
      <Box sx={{ 
        width: 16, 
        height,
        position: 'relative'
      }}>
        <VUMeterBar
          level={currentLevel}
          peakLevel={peakLevel}
          height={height}
          peakHoldTime={peakHoldTime}
        />
      </Box>
    </Box>
  );
};

export default AudioMeter;
