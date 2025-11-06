import React, { useState, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

interface FaderProps {
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  height?: number;
  width?: number;
  color?: 'green' | 'blue' | 'red' | 'orange' | 'yellow';
  orientation?: 'vertical' | 'horizontal';
}

const Fader: React.FC<FaderProps> = ({ 
  label, 
  value = 50,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  height = 120,
  width = 30,
  color = 'green',
  orientation = 'vertical'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const faderRef = useRef<HTMLDivElement>(null);
  const startPos = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    if (orientation === 'vertical') {
      startPos.current = e.clientY;
    } else {
      startPos.current = e.clientX;
    }
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !faderRef.current) return;

    const rect = faderRef.current.getBoundingClientRect();
    let newValue;

    if (orientation === 'vertical') {
      const relativeY = e.clientY - rect.top;
      const percentage = 1 - (relativeY / rect.height); // Inverted for vertical
      newValue = min + (percentage * (max - min));
    } else {
      const relativeX = e.clientX - rect.left;
      const percentage = relativeX / rect.width;
      newValue = min + (percentage * (max - min));
    }

    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue / step) * step;

    onChange?.(newValue);
  }, [isDragging, onChange, min, max, step, orientation]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate position based on value
  const normalizedValue = (value - min) / (max - min);
  const faderPosition = orientation === 'vertical' ? 
    (1 - normalizedValue) * 100 : // Inverted for vertical
    normalizedValue * 100;

  // Color themes for different fader types
  const colorThemes = {
    green: {
      primary: '#4caf50',
      secondary: '#388e3c',
      accent: '#66bb6a',
      track: '#2e7d32',
      shadow: '#1b5e20'
    },
    blue: {
      primary: '#2196f3',
      secondary: '#1976d2',
      accent: '#42a5f5',
      track: '#1565c0',
      shadow: '#0d47a1'
    },
    red: {
      primary: '#f44336',
      secondary: '#d32f2f',
      accent: '#ef5350',
      track: '#c62828',
      shadow: '#b71c1c'
    },
    orange: {
      primary: '#ff9800',
      secondary: '#f57000',
      accent: '#ffa726',
      track: '#ef6c00',
      shadow: '#e65100'
    },
    yellow: {
      primary: '#ffeb3b',
      secondary: '#fbc02d',
      accent: '#ffee58',
      track: '#f9a825',
      shadow: '#f57f17'
    }
  };

  const theme = colorThemes[color];
  
  const isVertical = orientation === 'vertical';
  const trackLength = isVertical ? height - 40 : width - 40;
  const trackWidth = isVertical ? 8 : height - 40;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: isVertical ? 'column' : 'row',
        alignItems: 'center',
        gap: 1
      }}
    >
      {/* Label */}
      <Typography 
        variant="caption" 
        sx={{ 
          fontWeight: 'bold', 
          color: theme.primary,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          textShadow: `0 1px 2px ${theme.shadow}`,
          writingMode: isVertical ? 'initial' : 'vertical-rl',
          textAlign: 'center',
          minWidth: isVertical ? 'auto' : '1rem'
        }}
      >
        {label}
      </Typography>

      {/* Fader Track Container */}
      <Box
        ref={faderRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          position: 'relative',
          width: isVertical ? width : height,
          height: isVertical ? height : width,
          cursor: 'pointer',
          padding: isVertical ? '20px 0' : '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Fader Track */}
        <Box
          sx={{
            position: 'relative',
            width: isVertical ? trackWidth : trackLength,
            height: isVertical ? trackLength : trackWidth,
            background: `
              linear-gradient(${isVertical ? '0deg' : '90deg'}, 
                #1a1a1a 0%, 
                #2a2a2a 10%, 
                #1a1a1a 50%, 
                #2a2a2a 90%, 
                #1a1a1a 100%
              )
            `,
            border: '1px solid #444',
            borderRadius: '4px',
            boxShadow: `
              inset 0 2px 4px rgba(0,0,0,0.8),
              inset 0 -1px 2px rgba(255,255,255,0.1),
              0 1px 2px rgba(0,0,0,0.5)
            `,
            
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              background: `
                linear-gradient(${isVertical ? '0deg' : '90deg'}, 
                  #0a0a0a 0%, 
                  #1a1a1a 50%, 
                  #0a0a0a 100%
                )
              `,
              borderRadius: '2px'
            }
          }}
        >
          {/* Active track portion */}
          <Box
            sx={{
              position: 'absolute',
              background: `
                linear-gradient(${isVertical ? '0deg' : '90deg'}, 
                  ${theme.shadow} 0%, 
                  ${theme.track} 30%, 
                  ${theme.primary} 70%, 
                  ${theme.accent} 100%
                )
              `,
              borderRadius: '2px',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.3),
                0 0 4px ${theme.primary}40
              `,
              ...(isVertical ? {
                bottom: '2px',
                left: '2px',
                right: '2px',
                height: `${normalizedValue * 100}%`,
                minHeight: normalizedValue > 0 ? '4px' : '0px'
              } : {
                left: '2px',
                top: '2px',
                bottom: '2px',
                width: `${normalizedValue * 100}%`,
                minWidth: normalizedValue > 0 ? '4px' : '0px'
              })
            }}
          />

          {/* Scale markers */}
          {Array.from({ length: 11 }, (_, i) => {
            const position = (i / 10) * 100;
            const isActive = (isVertical ? (100 - position) : position) <= faderPosition;
            
            return (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  width: isVertical ? '12px' : '2px',
                  height: isVertical ? '1px' : '12px',
                  backgroundColor: isActive ? theme.accent : '#555',
                  left: isVertical ? '-6px' : `${position}%`,
                  top: isVertical ? `${position}%` : '-6px',
                  transform: isVertical ? 'none' : 'translateX(-50%)',
                  transition: 'background-color 0.2s ease',
                  opacity: 0.8
                }}
              />
            );
          })}
        </Box>

        {/* Fader Handle */}
        <Box
          sx={{
            position: 'absolute',
            width: isVertical ? width + 10 : 16,
            height: isVertical ? 16 : width + 10,
            background: `
              radial-gradient(circle at 30% 30%, #888, #444),
              conic-gradient(from 45deg, #666, #777, #666, #777, #666)
            `,
            border: '2px solid #999',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: isDragging ? 'none' : 'all 0.15s ease',
            transform: `
              ${isVertical ? `translateY(-50%)` : `translateX(-50%)`}
              ${isDragging ? 'scale(0.98)' : isHovered ? 'scale(1.02)' : 'scale(1)'}
            `,
            boxShadow: `
              0 2px 6px rgba(0,0,0,0.6),
              inset 0 1px 2px rgba(255,255,255,0.3),
              inset 0 -1px 2px rgba(0,0,0,0.8)
            `,
            zIndex: 10,
            ...(isVertical ? {
              left: '50%',
              top: `${faderPosition}%`,
              marginLeft: `-${(width + 10) / 2}px`
            } : {
              top: '50%',
              left: `${faderPosition}%`,
              marginTop: `-${(width + 10) / 2}px`
            }),

            '&::before': {
              content: '""',
              position: 'absolute',
              top: '2px',
              left: '2px',
              right: '2px',
              bottom: '2px',
              background: `
                linear-gradient(135deg, #aaa 0%, #666 50%, #444 100%)
              `,
              borderRadius: '2px'
            },

            '&::after': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: isVertical ? '60%' : '2px',
              height: isVertical ? '2px' : '60%',
              background: theme.primary,
              transform: 'translate(-50%, -50%)',
              borderRadius: '1px',
              boxShadow: `0 0 4px ${theme.primary}`
            }
          }}
        />
      </Box>

      {/* Value display */}
      <Typography 
        variant="caption" 
        sx={{ 
          color: '#ccc',
          fontSize: '0.65rem',
          fontFamily: 'monospace',
          textAlign: 'center',
          minWidth: '2rem',
          writingMode: isVertical ? 'initial' : 'vertical-rl'
        }}
      >
        {Math.round(value)}
      </Typography>
    </Box>
  );
};

export default Fader;