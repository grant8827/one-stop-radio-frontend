import React, { useState } from 'react';
import { Box } from '@mui/material';

interface JogWheelProps {
  channelName?: string;
  size?: number;
  isPlaying?: boolean;
  bpm?: number;
  onTrackLoad?: (track: any) => void; // Callback for when a track is dropped
}

const JogWheel: React.FC<JogWheelProps> = ({ 
  channelName, 
  size = 200, 
  isPlaying = false,
  bpm = 120,
  onTrackLoad
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Slower rotation - multiply by 3 for more realistic speed
  const rotationSpeed = `${(60 / bpm) * 3}s`;

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      console.log(`🎯 JogWheel: Drop event received on ${channelName || 'unknown channel'}`);
      const trackData = e.dataTransfer.getData('application/json');
      console.log('📦 JogWheel: Raw track data:', trackData);
      
      if (trackData && onTrackLoad) {
        const track = JSON.parse(trackData);
        console.log(`🎵 JogWheel: Successfully received dropped track "${track.title}" for ${channelName}`);
        console.log('🔧 JogWheel: Calling onTrackLoad callback...');
        onTrackLoad(track);
        console.log('✅ JogWheel: onTrackLoad callback completed');
      } else {
        console.warn('⚠️ JogWheel: Missing requirements:', { 
          hasTrackData: !!trackData, 
          hasCallback: !!onTrackLoad,
          channelName: channelName || 'not set'
        });
        
        if (!trackData) {
          alert('❌ No track data received in drop event');
        } else if (!onTrackLoad) {
          alert('❌ No track loading callback configured');
        }
      }
    } catch (error) {
      console.error('❌ JogWheel: Error processing dropped track:', error);
      alert(`❌ Error processing dropped track: ${error}`);
    }
  };

  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: 'relative',
        cursor: 'pointer',
        userSelect: 'none',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s ease',
        filter: isDragOver ? 'brightness(1.3) drop-shadow(0 0 20px rgba(255,235,59,0.8))' : 'none',
        border: isDragOver ? '3px solid #ffeb3b' : 'none',
        borderRadius: '50%',
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Outer Ring - Metallic Bezel */}
      <Box
        sx={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #666, #999, #ccc, #999, #666, #333, #666)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2)',
          zIndex: 1,
        }}
      />

      {/* Main Platter */}
      <Box
        sx={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          width: `calc(100% - 16px)`,
          height: `calc(100% - 16px)`,
          borderRadius: '50%',
          background: isPlaying 
            ? 'radial-gradient(circle at 30% 30%, #2a2a2a, #1a1a1a, #0a0a0a)'
            : 'radial-gradient(circle at 30% 30%, #333, #222, #111)',
          boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.4)',
          animation: isPlaying ? `spin ${rotationSpeed} linear infinite` : 'none',
          '@keyframes spin': {
            from: { transform: 'rotate(0deg)' },
            to: { transform: 'rotate(360deg)' }
          },
          zIndex: 2,
        }}
      >
        {/* Strobe Marks - Outer Ring */}
        {Array.from({ length: 60 }, (_, i) => (
          <Box
            key={`outer-${i}`}
            sx={{
              position: 'absolute',
              top: '5px',
              left: '50%',
              width: '2px',
              height: i % 5 === 0 ? '20px' : '12px', // Longer marks every 5th
              backgroundColor: i % 5 === 0 ? '#888' : '#555',
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${i * 6}deg)`,
              borderRadius: '1px',
            }}
          />
        ))}

        {/* Strobe Marks - Inner Ring */}
        {Array.from({ length: 45 }, (_, i) => (
          <Box
            key={`inner-${i}`}
            sx={{
              position: 'absolute',
              top: '30px',
              left: '50%',
              width: '1px',
              height: '15px',
              backgroundColor: '#444',
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${i * 8}deg)`,
              borderRadius: '0.5px',
            }}
          />
        ))}

        {/* Vinyl Record Grooves */}
        {Array.from({ length: 8 }, (_, i) => (
          <Box
            key={`groove-${i}`}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: `${85 - i * 8}%`,
              height: `${85 - i * 8}%`,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          />
        ))}
      </Box>

      {/* Center Label Area */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '35%',
          height: '35%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #444, #222, #000)',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 3px rgba(255,255,255,0.2)',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
        }}
      >
        {/* Center Spindle */}
        <Box
          sx={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #666, #333, #111)',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.3)',
            border: '2px solid #555',
          }}
        />
      </Box>

      {/* Speed Indicator Dot */}
      <Box
        sx={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isPlaying ? '#00ff00' : '#666',
          boxShadow: isPlaying ? '0 0 8px #00ff00' : 'none',
          transform: 'translateX(-50%)',
          transition: 'all 0.3s ease',
          zIndex: 4,
          animation: isPlaying ? `spin ${rotationSpeed} linear infinite` : 'none',
        }}
      />

      {/* Pitch Fader Track (Small) */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '-15px',
          left: '50%',
          width: '60px',
          height: '8px',
          backgroundColor: '#222',
          borderRadius: '4px',
          transform: 'translateX(-50%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '12px',
            height: '12px',
            backgroundColor: '#555',
            borderRadius: '2px',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.2)',
            cursor: 'ew-resize',
          }}
        />
      </Box>
    </Box>
  );
};

export default JogWheel;