import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

interface VUPeakMeterProps {
  leftLevel?: number;
  rightLevel?: number;
  width?: number;
  height?: number;
  orientation?: 'horizontal' | 'vertical';
  showPeakHold?: boolean;
  showLabels?: boolean;
  label?: string;
}

const VUPeakMeter: React.FC<VUPeakMeterProps> = ({
  leftLevel = 0,
  rightLevel = 0,
  width = 300,
  height = 80,
  orientation = 'horizontal',
  showPeakHold = true,
  showLabels = true,
  label = 'Master'
}) => {
  const [leftPeak, setLeftPeak] = useState(0);
  const [rightPeak, setRightPeak] = useState(0);
  const [peakHoldLeft, setPeakHoldLeft] = useState(0);
  const [peakHoldRight, setPeakHoldRight] = useState(0);

  // Peak detection and hold logic
  useEffect(() => {
    if (leftLevel > peakHoldLeft) {
      setPeakHoldLeft(leftLevel);
    }
    if (rightLevel > peakHoldRight) {
      setPeakHoldRight(rightLevel);
    }

    // Peak hold decay - gradually decrease peak hold values
    const peakDecayInterval = setInterval(() => {
      setPeakHoldLeft(prev => Math.max(0, prev - 1));
      setPeakHoldRight(prev => Math.max(0, prev - 1));
    }, 50);

    return () => clearInterval(peakDecayInterval);
  }, [leftLevel, rightLevel, peakHoldLeft, peakHoldRight]);

  // Continuous animation loop for real-time updates
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      // Update peak values with incoming levels
      setLeftPeak(leftLevel);
      setRightPeak(rightLevel);
      
      // Continue animation loop
      animationFrame = requestAnimationFrame(animate);
    };
    
    // Start animation loop
    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [leftLevel, rightLevel]);

  // Generate LED segments for the meter
  const generateLEDSegments = (level: number, peakHold: number, channelName: 'L' | 'R') => {
    const segments = [];
    const numSegments = orientation === 'horizontal' ? 20 : 16;
    const segmentWidth = orientation === 'horizontal' ? (width - 40) / numSegments : width - 20;
    const segmentHeight = orientation === 'horizontal' ? 6 : (height - 60) / numSegments;
    
    for (let i = 0; i < numSegments; i++) {
      const threshold = (i + 1) / numSegments * 100;
      const isLit = level >= threshold;
      const isPeak = showPeakHold && Math.abs(peakHold - threshold) <= (100 / numSegments);
      
      // Color coding: Green (0-35%), Yellow (35-75%), Red (75-100%) - More responsive to lower levels
      let color = '#003300'; // Dark green (off)
      let activeColor = '#00ff00'; // Bright green (on)
      
      if (threshold > 75) {
        color = '#330000'; // Dark red
        activeColor = '#ff0000'; // Bright red
      } else if (threshold > 35) {
        color = '#333300'; // Dark yellow
        activeColor = '#ffff00'; // Bright yellow
      }

      const segmentColor = isLit ? activeColor : color;
      const peakColor = isPeak ? '#ffffff' : 'transparent';

      if (orientation === 'horizontal') {
        segments.push(
          <g key={`${channelName}-${i}`}>
            {/* Main segment */}
            <rect
              x={20 + i * (segmentWidth + 1)}
              y={channelName === 'L' ? 8 : 18}
              width={segmentWidth - 1}
              height={segmentHeight}
              fill={segmentColor}
              rx="1"
            />
            {/* Peak hold indicator */}
            {isPeak && showPeakHold && (
              <rect
                x={20 + i * (segmentWidth + 1)}
                y={channelName === 'L' ? 8 : 18}
                width={segmentWidth - 1}
                height={segmentHeight}
                fill={peakColor}
                rx="1"
                opacity="0.8"
              />
            )}
            {/* Glow effect for active segments */}
            {isLit && (
              <rect
                x={20 + i * (segmentWidth + 1)}
                y={channelName === 'L' ? 8 : 18}
                width={segmentWidth - 1}
                height={segmentHeight}
                fill={activeColor}
                rx="1"
                opacity="0.3"
                filter="blur(2px)"
              />
            )}
          </g>
        );
      } else {
        // Vertical orientation (for future use)
        const yPos = height - 30 - (i + 1) * (segmentHeight + 1);
        segments.push(
          <g key={`${channelName}-${i}`}>
            <rect
              x={channelName === 'L' ? 10 : width / 2 + 5}
              y={yPos}
              width={width / 2 - 15}
              height={segmentHeight - 1}
              fill={segmentColor}
              rx="1"
            />
            {isPeak && showPeakHold && (
              <rect
                x={channelName === 'L' ? 10 : width / 2 + 5}
                y={yPos}
                width={width / 2 - 15}
                height={segmentHeight - 1}
                fill={peakColor}
                rx="1"
                opacity="0.8"
              />
            )}
          </g>
        );
      }
    }
    return segments;
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%'
    }}>
      {showLabels && label && (
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#ffffff', 
            fontWeight: 'bold',
            mb: 1,
            textAlign: 'center'
          }}
        >
          {label}
        </Typography>
      )}
      
      <Box sx={{ 
        position: 'relative',
        width: width + 'px',
        height: height + 'px',
        background: '#000000',
        borderRadius: '6px',
        border: '1px solid #444',
        overflow: 'hidden'
      }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Channel Labels */}
          {showLabels && (
            <>
              <text
                x="8"
                y="15"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
              >
                L
              </text>
              <text
                x="8"
                y="26"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
              >
                R
              </text>
            </>
          )}
          
          {/* dB Scale Markers (simplified) */}
          {[0, 25, 50, 75, 100].map((percent, index) => {
            const xPos = 20 + (percent / 100) * (width - 40);
            const dbValue = percent === 0 ? '-∞' : 
                          percent === 25 ? '-12' :
                          percent === 50 ? '-6' :
                          percent === 75 ? '-3' :
                          '0';
            return (
              <g key={index}>
                <line
                  x1={xPos}
                  y1="32"
                  x2={xPos}
                  y2="36"
                  stroke="#666"
                  strokeWidth="1"
                />
                <text
                  x={xPos}
                  y="46"
                  fill="#888"
                  fontSize="7"
                  textAnchor="middle"
                >
                  {dbValue}
                </text>
              </g>
            );
          })}
          
          {/* LED Segments for Left Channel */}
          {generateLEDSegments(leftPeak, peakHoldLeft, 'L')}
          
          {/* LED Segments for Right Channel */}
          {generateLEDSegments(rightPeak, peakHoldRight, 'R')}
          
          {/* Level percentage display */}
          <text
            x={width - 10}
            y="15"
            fill="#00ff00"
            fontSize="8"
            textAnchor="end"
            fontFamily="monospace"
          >
            {leftPeak.toFixed(0)}%
          </text>
          <text
            x={width - 10}
            y="26"
            fill="#00ff00"
            fontSize="8"
            textAnchor="end"
            fontFamily="monospace"
          >
            {rightPeak.toFixed(0)}%
          </text>
        </svg>
      </Box>
    </Box>
  );
};

export default VUPeakMeter;