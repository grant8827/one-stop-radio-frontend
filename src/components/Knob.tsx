
import React, { useState, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

interface KnobProps {
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'yellow';
}

const Knob: React.FC<KnobProps> = ({ 
  label, 
  value = 50,
  size = 60, 
  onChange,
  min = 0,
  max = 100,
  step = 1,
  color = 'blue'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const knobRef = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastY.current = e.clientY;
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaY = lastY.current - e.clientY;
    const sensitivity = 0.5;
    const changeAmount = deltaY * sensitivity;
    
    let newValue = value + changeAmount;
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue / step) * step;

    onChange?.(newValue);
    lastY.current = e.clientY;
  }, [isDragging, value, onChange, min, max, step]);

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

  // Calculate rotation angle based on value
  const normalizedValue = (value - min) / (max - min);
  const rotationAngle = (normalizedValue * 270) - 135; // -135° to +135°

  // Color themes for different knob types
  const colorThemes = {
    blue: {
      primary: '#2196f3',
      secondary: '#1976d2',
      accent: '#bbdefb',
      shadow: '#0d47a1'
    },
    green: {
      primary: '#4caf50',
      secondary: '#388e3c',
      accent: '#c8e6c9',
      shadow: '#1b5e20'
    },
    orange: {
      primary: '#ff9800',
      secondary: '#f57000',
      accent: '#ffe0b2',
      shadow: '#e65100'
    },
    red: {
      primary: '#f44336',
      secondary: '#d32f2f',
      accent: '#ffcdd2',
      shadow: '#b71c1c'
    },
    yellow: {
      primary: '#ffeb3b',
      secondary: '#fbc02d',
      accent: '#fff9c4',
      shadow: '#f57f17'
    }
  };

  const theme = colorThemes[color];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography 
        variant="caption" 
        sx={{ 
          fontWeight: 'bold', 
          color: theme.primary,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          textShadow: `0 1px 2px ${theme.shadow}`,
          mb: 0.5
        }}
      >
        {label}
      </Typography>
      
      <Box
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          position: 'relative',
          cursor: 'pointer',
          transition: isDragging ? 'none' : 'all 0.15s ease',
          transform: isDragging ? 'scale(0.98)' : isHovered ? 'scale(1.02)' : 'scale(1)',
          
          // Outer ring with depth
          background: `
            radial-gradient(circle at 30% 30%, #555, #222),
            conic-gradient(from 0deg, #333, #444, #333, #444, #333)
          `,
          border: '2px solid #666',
          boxShadow: `
            0 4px 8px rgba(0,0,0,0.6),
            inset 0 2px 4px rgba(255,255,255,0.1),
            inset 0 -2px 4px rgba(0,0,0,0.8)
          `,
          
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '8%',
            left: '8%',
            right: '8%',
            bottom: '8%',
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 25% 25%, #666, #333),
              conic-gradient(from 45deg, #444, #555, #444, #555, #444)
            `,
            boxShadow: `
              0 2px 4px rgba(0,0,0,0.8),
              inset 0 1px 2px rgba(255,255,255,0.2),
              inset 0 -1px 2px rgba(0,0,0,0.9)
            `,
          },
          
          '&::after': {
            content: '""',
            position: 'absolute',
            top: '20%',
            left: '20%',
            right: '20%',
            bottom: '20%',
            borderRadius: '50%',
            background: `
              radial-gradient(circle at 20% 20%, #777, #444)
            `,
            boxShadow: `
              inset 0 1px 3px rgba(0,0,0,0.9),
              inset 0 -1px 1px rgba(255,255,255,0.1)
            `,
          }
        }}
      >
        {/* Knob indicator pointer */}
        <Box
          sx={{
            width: 3,
            height: size * 0.35,
            background: `linear-gradient(to bottom, ${theme.accent}, ${theme.primary})`,
            position: 'absolute',
            top: size * 0.08,
            left: 'calc(50% - 1.5px)',
            borderRadius: '2px',
            transform: `rotate(${rotationAngle}deg)`,
            transformOrigin: `center ${size * 0.42}px`,
            boxShadow: `
              0 1px 2px rgba(0,0,0,0.8),
              inset 0 1px 0 rgba(255,255,255,0.5)
            `,
            zIndex: 3,
          }}
        />
        
        {/* Center cap with metallic finish */}
        <Box
          sx={{
            width: size * 0.25,
            height: size * 0.25,
            background: `
              radial-gradient(circle at 30% 30%, #999, #555),
              conic-gradient(from 0deg, #777, #888, #777, #888, #777)
            `,
            borderRadius: '50%',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            border: `1px solid ${theme.secondary}`,
            boxShadow: `
              0 1px 3px rgba(0,0,0,0.8),
              inset 0 1px 1px rgba(255,255,255,0.4),
              inset 0 -1px 1px rgba(0,0,0,0.6)
            `,
            zIndex: 4,
          }}
        />
        
        {/* Value indicator dots around the knob */}
        {Array.from({ length: 11 }, (_, i) => {
          const angle = (i * 27) - 135; // 11 dots from -135° to +135°
          const isActive = Math.abs(rotationAngle - angle) < 15;
          const dotSize = 2;
          const radius = size * 0.38;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;
          
          return (
            <Box
              key={i}
              sx={{
                width: dotSize,
                height: dotSize,
                borderRadius: '50%',
                backgroundColor: isActive ? theme.primary : '#666',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                transition: 'background-color 0.2s ease',
                boxShadow: isActive ? 
                  `0 0 4px ${theme.primary}, 0 0 2px ${theme.accent}` : 
                  '0 1px 1px rgba(0,0,0,0.5)',
                zIndex: 2,
              }}
            />
          );
        })}
      </Box>
      
      {/* Value display */}
      <Typography 
        variant="caption" 
        sx={{ 
          color: '#ccc',
          fontSize: '0.65rem',
          mt: 0.5,
          fontFamily: 'monospace',
          textAlign: 'center',
          minWidth: '2rem'
        }}
      >
        {Math.round(value)}
      </Typography>
    </Box>
  );
};

export default Knob;
