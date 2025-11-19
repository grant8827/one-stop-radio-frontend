import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Button,
  Typography,
  LinearProgress,
  Alert,
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload,
  PlayArrow,
  Pause,
  Stop,
  VolumeUp
} from '@mui/icons-material';
import WaveformCanvas from './WaveformCanvas';

interface WaveformData {
  metadata: {
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
  };
  waveform: Array<{
    amp: number;
    peak: number;
    freq: number;
    low: number;
    mid: number;
    high: number;
    time: number;
    sample: number;
  }>;
}

const AudioWaveformPlayer: React.FC = () => {
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showFrequencyBands, setShowFrequencyBands] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Web Audio API
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update current time during playback
  useEffect(() => {
    let animationFrame: number;
    
    if (isPlaying && audioContextRef.current) {
      const updateTime = () => {
        if (audioContextRef.current && isPlaying) {
          const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
          setCurrentTime(pauseTimeRef.current + elapsed);
          animationFrame = requestAnimationFrame(updateTime);
        }
      };
      updateTime();
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying]);

  // Load waveform data from JSON file
  const loadWaveformData = async (file: File): Promise<WaveformData | null> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as WaveformData;
      
      // Validate data structure
      if (!data.metadata || !data.waveform || !Array.isArray(data.waveform)) {
        throw new Error('Invalid waveform data structure');
      }
      
      return data;
    } catch (error) {
      console.error('Error loading waveform data:', error);
      return null;
    }
  };

  // Load and decode audio file
  const loadAudioFile = async (file: File): Promise<AudioBuffer | null> => {
    if (!audioContextRef.current) return null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Error decoding audio file:', error);
      return null;
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setError(null);
    stopPlayback();

    try {
      // Look for both audio file and corresponding waveform JSON
      const audioFile = Array.from(files).find(f => 
        f.type.startsWith('audio/') || /\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)
      );
      
      const waveformFile = Array.from(files).find(f => 
        f.name.endsWith('.waveform.json') || f.type === 'application/json'
      );

      if (!audioFile && !waveformFile) {
        throw new Error('Please select an audio file or waveform JSON file');
      }

      // Load audio file if present
      if (audioFile) {
        const buffer = await loadAudioFile(audioFile);
        setAudioBuffer(buffer);
      }

      // Load waveform data if present
      if (waveformFile) {
        const waveform = await loadWaveformData(waveformFile);
        if (waveform) {
          setWaveformData(waveform);
        } else {
          throw new Error('Failed to load waveform data');
        }
      } else if (audioFile) {
        // If we only have audio file, show message about generating waveform
        setError('Waveform data not found. Use the C++ analyzer to generate waveform data first.');
      }

    } catch (error) {
      console.error('Error loading files:', error);
      setError(error instanceof Error ? error.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  // Start audio playback
  const startPlayback = useCallback(() => {
    if (!audioBuffer || !audioContextRef.current || !gainNodeRef.current) {
      setError('No audio loaded or Web Audio not available');
      return;
    }

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    // Create new source node
    sourceNodeRef.current = audioContextRef.current.createBufferSource();
    sourceNodeRef.current.buffer = audioBuffer;
    sourceNodeRef.current.connect(gainNodeRef.current);

    // Start playback from current position
    const offset = pauseTimeRef.current;
    sourceNodeRef.current.start(0, offset);
    
    startTimeRef.current = audioContextRef.current.currentTime - offset;
    setIsPlaying(true);

    // Handle playback end
    sourceNodeRef.current.onended = () => {
      if (pauseTimeRef.current + (audioContextRef.current!.currentTime - startTimeRef.current) >= audioBuffer.duration) {
        // Reached end of file
        pauseTimeRef.current = 0;
        setCurrentTime(0);
        setIsPlaying(false);
      }
    };
  }, [audioBuffer]);

  // Pause audio playback
  const pausePlayback = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      sourceNodeRef.current.stop();
      pauseTimeRef.current += audioContextRef.current.currentTime - startTimeRef.current;
      setIsPlaying(false);
    }
  }, []);

  // Stop audio playback
  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // Handle seeking
  const handleSeek = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    
    if (isPlaying) {
      pausePlayback();
    }
    
    pauseTimeRef.current = Math.max(0, Math.min(time, audioBuffer?.duration || 0));
    setCurrentTime(pauseTimeRef.current);
    
    if (wasPlaying) {
      // Restart playback from new position
      setTimeout(() => startPlayback(), 50);
    }
  }, [isPlaying, audioBuffer, pausePlayback, startPlayback]);

  // Generate sample waveform data for testing
  const generateSampleWaveform = () => {
    const duration = 30; // 30 seconds
    const sampleRate = 44100;
    const numPoints = 1000;
    const resolution = duration / numPoints;

    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const time = i * resolution;
      const amp = Math.random() * 0.8 * (1 - Math.abs(time - duration/2) / (duration/2));
      const peak = amp * (1 + Math.random() * 0.3);
      
      points.push({
        amp,
        peak,
        freq: Math.random(),
        low: Math.random() * 0.4,
        mid: Math.random() * 0.4,
        high: Math.random() * 0.4,
        time,
        sample: i * (sampleRate * resolution)
      });
    }

    const sampleData: WaveformData = {
      metadata: {
        duration,
        sample_rate: sampleRate,
        channels: 2,
        total_samples: sampleRate * duration,
        global_peak: Math.max(...points.map(p => p.peak)),
        dynamic_range: 45.2,
        file_path: "sample_audio.wav",
        file_size: 5242880,
        window_size: 2048,
        hop_size: 512,
        resolution,
        num_points: numPoints
      },
      waveform: points
    };

    setWaveformData(sampleData);
    setError(null);
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Audio Waveform Analyzer & Player
        </Typography>
        
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Load audio files and their corresponding waveform data generated by the C++ analyzer.
        </Typography>

        {/* File Upload Section */}
        <Box sx={{ mb: 3 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              Load Audio & Waveform
            </Button>
            
            <Button
              variant="outlined"
              onClick={generateSampleWaveform}
              disabled={isLoading}
            >
              Load Sample Data
            </Button>
            
            {isLoading && <CircularProgress size={24} />}
          </Box>
          
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
            Select both an audio file and its corresponding .waveform.json file, or just the JSON for visualization only.
          </Typography>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Audio Controls */}
        {(audioBuffer || waveformData) && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
              {audioBuffer && (
                <>
                  <Button
                    variant="contained"
                    startIcon={isPlaying ? <Pause /> : <PlayArrow />}
                    onClick={isPlaying ? pausePlayback : startPlayback}
                    disabled={!audioBuffer}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Stop />}
                    onClick={stopPlayback}
                    disabled={!isPlaying && currentTime === 0}
                  >
                    Stop
                  </Button>
                </>
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={showFrequencyBands}
                    onChange={(e) => setShowFrequencyBands(e.target.checked)}
                  />
                }
                label="Show Frequency Bands"
              />
            </Box>

            {audioBuffer && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Time: {currentTime.toFixed(2)}s / {audioBuffer.duration.toFixed(2)}s
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(currentTime / audioBuffer.duration) * 100}
                  sx={{ mt: 1 }}
                />
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Waveform Visualization */}
      {waveformData && (
        <Paper sx={{ p: 2 }}>
          <WaveformCanvas
            waveformData={waveformData}
            width={1100}
            height={300}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={handleSeek}
            showFrequencyBands={showFrequencyBands}
            zoomLevel={zoomLevel}
            onZoomChange={setZoomLevel}
          />
          
          {/* Waveform Metadata */}
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Analysis Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">File</Typography>
                <Typography variant="body1">{waveformData.metadata.file_path.split('/').pop()}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Duration</Typography>
                <Typography variant="body1">{waveformData.metadata.duration.toFixed(2)}s</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Sample Rate</Typography>
                <Typography variant="body1">{waveformData.metadata.sample_rate.toLocaleString()} Hz</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Channels</Typography>
                <Typography variant="body1">{waveformData.metadata.channels}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Global Peak</Typography>
                <Typography variant="body1">{waveformData.metadata.global_peak.toFixed(3)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Dynamic Range</Typography>
                <Typography variant="body1">{waveformData.metadata.dynamic_range.toFixed(1)} dB</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}
      
      {!waveformData && !isLoading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <VolumeUp sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Audio Loaded
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Upload an audio file and its waveform data to get started, or try the sample data.
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AudioWaveformPlayer;