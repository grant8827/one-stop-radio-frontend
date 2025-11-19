import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Paper, Slider, Typography, Button, IconButton } from '@mui/material';
import { PlayArrow, Pause, ZoomIn, ZoomOut, Replay } from '@mui/icons-material';

interface WaveformPoint {
  amp: number;        // RMS amplitude
  peak: number;       // Peak amplitude  
  freq: number;       // Dominant frequency energy
  low: number;        // Low frequency energy
  mid: number;        // Mid frequency energy
  high: number;       // High frequency energy
  time: number;       // Timestamp in seconds
  sample: number;     // Sample index
}

interface WaveformMetadata {
  duration: number;
  sample_rate: number;
  channels: number;
  total_samples: number;
  global_peak: number;
  dynamic_range: number;
  file_path: string;
  file_size: number;
  window_size: number;
  hop_size: number;
  resolution: number;
  num_points: number;
}

interface WaveformData {
  metadata: WaveformMetadata;
  waveform: WaveformPoint[];
}

interface WaveformCanvasProps {
  waveformData?: WaveformData;
  width?: number;
  height?: number;
  backgroundColor?: string;
  waveformColor?: string;
  playheadColor?: string;
  bufferColor?: string;
  currentTime?: number;
  isPlaying?: boolean;
  onSeek?: (time: number) => void;
  showFrequencyBands?: boolean;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  waveformData,
  width = 800,
  height = 200,
  backgroundColor = '#1e1e1e',
  waveformColor = '#00ff41',
  playheadColor = '#ff0040',
  bufferColor = '#333333',
  currentTime = 0,
  isPlaying = false,
  onSeek,
  showFrequencyBands = true,
  zoomLevel = 1,
  onZoomChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0.8); // 80% buffered example

  // Color scheme for frequency bands
  const frequencyColors = {
    low: '#ff4444',    // Red for bass
    mid: '#44ff44',    // Green for mids  
    high: '#4444ff'    // Blue for highs
  };

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { waveform, metadata } = waveformData;
    const { duration } = metadata;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (waveform.length === 0) return;

    // Calculate visible time range based on zoom and scroll
    const visibleDuration = duration / zoomLevel;
    const startTime = scrollOffset * (duration - visibleDuration);
    const endTime = startTime + visibleDuration;

    // Find visible waveform points
    const visiblePoints = waveform.filter(point => 
      point.time >= startTime && point.time <= endTime
    );

    if (visiblePoints.length === 0) return;

    // Calculate scaling factors
    const timeScale = width / visibleDuration;
    const amplitudeScale = height / 2;
    const centerY = height / 2;

    // Draw buffer progress indicator
    if (bufferProgress > 0) {
      const bufferWidth = width * (bufferProgress * visibleDuration / duration);
      ctx.fillStyle = bufferColor;
      ctx.fillRect(0, 0, bufferWidth, height);
    }

    // Draw waveform
    ctx.beginPath();
    
    for (let i = 0; i < visiblePoints.length; i++) {
      const point = visiblePoints[i];
      const x = (point.time - startTime) * timeScale;
      
      let amplitude = point.amp;
      let color = waveformColor;

      // Color-code by frequency content if enabled
      if (showFrequencyBands) {
        const maxFreq = Math.max(point.low, point.mid, point.high);
        if (maxFreq === point.low) {
          color = frequencyColors.low;
        } else if (maxFreq === point.mid) {
          color = frequencyColors.mid;
        } else {
          color = frequencyColors.high;
        }
        
        // Use peak amplitude for visual impact
        amplitude = point.peak;
      }

      // Draw waveform bar
      const barHeight = amplitude * amplitudeScale;
      
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x - 1, centerY - barHeight, 2, barHeight * 2);
      
      // Add glow effect for peaks
      if (point.peak > 0.7) {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x - 2, centerY - barHeight * 1.2, 4, barHeight * 2.4);
      }
    }

    ctx.globalAlpha = 1.0;

    // Draw center line
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw playhead
    if (currentTime >= startTime && currentTime <= endTime) {
      const playheadX = (currentTime - startTime) * timeScale;
      
      ctx.strokeStyle = playheadColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Draw playhead circle at top
      ctx.fillStyle = playheadColor;
      ctx.beginPath();
      ctx.arc(playheadX, 10, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw time markers
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    const timeStep = Math.max(1, Math.floor(visibleDuration / 10));
    
    for (let t = Math.ceil(startTime / timeStep) * timeStep; t <= endTime; t += timeStep) {
      const x = (t - startTime) * timeScale;
      if (x >= 0 && x <= width) {
        ctx.fillText(`${t}s`, x + 2, height - 5);
        
        // Draw tick mark
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, height - 20);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

  }, [waveformData, width, height, backgroundColor, waveformColor, playheadColor, 
      bufferColor, currentTime, showFrequencyBands, zoomLevel, scrollOffset, bufferProgress]);

  // Redraw when dependencies change
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  // Handle canvas click for seeking
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waveformData || !onSeek) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    const visibleDuration = waveformData.metadata.duration / zoomLevel;
    const startTime = scrollOffset * (waveformData.metadata.duration - visibleDuration);
    const clickTime = startTime + (x / width) * visibleDuration;
    
    onSeek(Math.max(0, Math.min(clickTime, waveformData.metadata.duration)));
  }, [waveformData, zoomLevel, scrollOffset, width, onSeek]);

  // Handle mouse drag for scrolling
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !waveformData) return;

    const deltaX = event.movementX;
    const visibleDuration = waveformData.metadata.duration / zoomLevel;
    const timePerPixel = visibleDuration / width;
    const deltaTime = -deltaX * timePerPixel;
    
    setScrollOffset(prevOffset => {
      const maxScroll = 1 - (visibleDuration / waveformData.metadata.duration);
      const newOffset = prevOffset + (deltaTime / (waveformData.metadata.duration - visibleDuration));
      return Math.max(0, Math.min(newOffset, maxScroll));
    });
  }, [isDragging, waveformData, zoomLevel, width]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    if (onZoomChange) {
      onZoomChange(Math.min(zoomLevel * 2, 64));
    }
  };

  const handleZoomOut = () => {
    if (onZoomChange) {
      onZoomChange(Math.max(zoomLevel / 2, 0.25));
    }
  };

  const handleZoomReset = () => {
    if (onZoomChange) {
      onZoomChange(1);
      setScrollOffset(0);
    }
  };

  if (!waveformData) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No waveform data available
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Load an audio file to see the waveform visualization
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Control Panel */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h6">
          Audio Waveform
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleZoomOut} disabled={zoomLevel <= 0.25}>
            <ZoomOut />
          </IconButton>
          <IconButton onClick={handleZoomIn} disabled={zoomLevel >= 64}>
            <ZoomIn />
          </IconButton>
          <IconButton onClick={handleZoomReset}>
            <Replay />
          </IconButton>
        </Box>

        <Typography variant="body2" sx={{ ml: 2 }}>
          Zoom: {zoomLevel}x
        </Typography>

        <Typography variant="body2" sx={{ ml: 'auto' }}>
          Duration: {waveformData.metadata.duration.toFixed(2)}s | 
          Points: {waveformData.metadata.num_points} | 
          Peak: {waveformData.metadata.global_peak.toFixed(3)}
        </Typography>
      </Box>

      {/* Waveform Canvas */}
      <Paper 
        sx={{ 
          p: 1, 
          backgroundColor: backgroundColor,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            display: 'block',
            width: '100%',
            maxWidth: `${width}px`,
            height: `${height}px`,
            border: '1px solid #333'
          }}
        />
      </Paper>

      {/* Frequency Legend */}
      {showFrequencyBands && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: frequencyColors.low,
              borderRadius: '2px'
            }} />
            <Typography variant="caption">Low (Bass)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: frequencyColors.mid,
              borderRadius: '2px' 
            }} />
            <Typography variant="caption">Mid</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ 
              width: 16, 
              height: 16, 
              backgroundColor: frequencyColors.high,
              borderRadius: '2px'
            }} />
            <Typography variant="caption">High (Treble)</Typography>
          </Box>
        </Box>
      )}

      {/* Zoom Slider */}
      <Box sx={{ mt: 2, px: 2 }}>
        <Typography variant="body2" gutterBottom>
          Zoom Level
        </Typography>
        <Slider
          value={zoomLevel}
          onChange={(_, value) => onZoomChange && onZoomChange(value as number)}
          min={0.25}
          max={16}
          step={0.25}
          marks={[
            { value: 0.25, label: '0.25x' },
            { value: 1, label: '1x' },
            { value: 4, label: '4x' },
            { value: 16, label: '16x' }
          ]}
          valueLabelDisplay="auto"
        />
      </Box>
    </Box>
  );
};

export default WaveformCanvas;