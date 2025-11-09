import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Container, Row, Col } from 'react-bootstrap';
import Waveform from './Waveform';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';

/**
 * WaveformDemo - Example component showing enhanced waveform usage
 * This demonstrates how to integrate the waveform with real playback progress
 */
const WaveformDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackLoaded, setTrackLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferProgress, setBufferProgress] = useState(0);
  const songDuration = 210; // 3.5 minutes example
  
  // Simulate track loading
  const handleLoadTrack = () => {
    setIsLoading(true);
    setTrackLoaded(false);
    
    // Simulate buffer progress
    const bufferInterval = setInterval(() => {
      setBufferProgress(prev => {
        if (prev >= 100) {
          clearInterval(bufferInterval);
          setIsLoading(false);
          setTrackLoaded(true);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };
  
  // Enhanced real-time playback simulation with dynamic buffering
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPlaying && trackLoaded) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          if (newTime >= songDuration) {
            setIsPlaying(false);
            return 0; // Loop back to start
          }
          return newTime;
        });
        
        // Simulate dynamic buffer progress while playing
        setBufferProgress(prev => {
          const currentProgress = (currentTime / songDuration) * 100;
          const targetBuffer = Math.min(100, currentProgress + 25 + Math.sin(Date.now() * 0.001) * 5);
          return Math.max(prev, targetBuffer);
        });
      }, 100); // Update every 100ms for smooth progress
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, trackLoaded, songDuration, currentTime]);
  
  const handlePlay = () => {
    if (trackLoaded) {
      setIsPlaying(true);
    }
  };
  
  const handlePause = () => {
    setIsPlaying(false);
  };
  
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  
  const handleSeek = (percentage: number) => {
    const newTime = (percentage / 100) * songDuration;
    setCurrentTime(newTime);
  };
  
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    // This callback receives real-time updates from the waveform
    console.log(`Playback progress: ${currentTime.toFixed(1)}s / ${duration}s`);
  };
  
  return (
    <Container fluid className="p-4">
      <Row>
        <Col>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" sx={{ color: '#fff', mb: 2 }}>
              Enhanced Waveform Demo
            </Typography>
            
            {/* Transport Controls */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleLoadTrack}
                disabled={isLoading}
                sx={{ 
                  background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
                  '&:hover': { background: 'linear-gradient(45deg, #43a047, #4caf50)' }
                }}
              >
                {isLoading ? 'Loading...' : 'Load Track'}
              </Button>
              
              <Button
                variant="contained"
                onClick={handlePlay}
                disabled={!trackLoaded || isPlaying}
                startIcon={<PlayArrowIcon />}
                sx={{ 
                  background: 'linear-gradient(45deg, #2196f3, #42a5f5)',
                  '&:hover': { background: 'linear-gradient(45deg, #1976d2, #2196f3)' }
                }}
              >
                Play
              </Button>
              
              <Button
                variant="contained"
                onClick={handlePause}
                disabled={!isPlaying}
                startIcon={<PauseIcon />}
                sx={{ 
                  background: 'linear-gradient(45deg, #ff9800, #ffb74d)',
                  '&:hover': { background: 'linear-gradient(45deg, #f57400, #ff9800)' }
                }}
              >
                Pause
              </Button>
              
              <Button
                variant="contained"
                onClick={handleStop}
                disabled={!trackLoaded}
                startIcon={<StopIcon />}
                sx={{ 
                  background: 'linear-gradient(45deg, #f44336, #e57373)',
                  '&:hover': { background: 'linear-gradient(45deg, #d32f2f, #f44336)' }
                }}
              >
                Stop
              </Button>
              
              <Box sx={{ ml: 3, color: '#ccc' }}>
                <Typography variant="body2">
                  Status: {isLoading ? 'Loading...' : trackLoaded ? (isPlaying ? 'Playing' : 'Ready') : 'No Track'}
                </Typography>
                <Typography variant="caption">
                  Buffer: {bufferProgress.toFixed(0)}% | Time: {currentTime.toFixed(1)}s
                </Typography>
              </Box>
            </Box>
            
            {/* Enhanced Waveform */}
            <Waveform
              height={100}
              isPlaying={isPlaying}
              trackLoaded={trackLoaded}
              isLoading={isLoading}
              bufferProgress={bufferProgress}
              songDuration={songDuration}
              currentTime={currentTime}
              songTitle="Demo Track - Enhanced Waveform"
              onSeek={handleSeek}
              onTimeUpdate={handleTimeUpdate}
            />
            
            {/* Usage Instructions */}
            <Box sx={{ mt: 3, p: 2, background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
              <Typography variant="h6" sx={{ color: '#ffeb3b', mb: 1 }}>
                Features Demonstrated:
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                • Real-time progress bar that moves smoothly with song duration
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                • Enhanced waveform visualization with realistic audio patterns
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                • Buffer progress indicator showing loading status
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                • Interactive seeking by clicking on the waveform
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                • Dynamic animations when playing with glow effects near playhead
              </Typography>
              <Typography variant="body2" sx={{ color: '#ccc' }}>
                • Professional time display with current/total time and percentage
              </Typography>
            </Box>
          </Box>
        </Col>
      </Row>
    </Container>
  );
};

export default WaveformDemo;