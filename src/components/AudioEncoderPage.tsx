import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { 
  Typography, 
  Box, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import AudioEncodingDiagnostics from './AudioEncodingDiagnostics';
import { useAudioActivity } from '../contexts/AudioActivityContext';

interface StreamServerConfig {
  serverType: 'shoutcast' | 'icecast';
  host: string;
  port: string;
  username: string;
  password: string;
  mountpoint: string;
  enabled: boolean;
  bitrate: string;
  format: string;
}

const AudioEncoderPage: React.FC = () => {
  // Audio activity context
  const { getOverallActivity, getActivityLevel } = useAudioActivity();

  const [streamConfig, setStreamConfig] = useState<StreamServerConfig>({
    serverType: 'icecast',
    host: 'localhost',
    port: '8000',
    username: 'source',
    password: '',
    mountpoint: '/radio',
    enabled: false,
    bitrate: '128',
    format: 'MP3'
  });

  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);

  const handleConfigChange = (field: keyof StreamServerConfig, value: string | boolean) => {
    setStreamConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async () => {
    setConnectionStatus('connecting');
    setStatusMessage('Testing connection to streaming server...');
    
    try {
      // Simulate connection test (replace with actual implementation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      setConnectionStatus('connected');
      setStatusMessage(`Successfully connected to ${streamConfig.serverType.toUpperCase()} server at ${streamConfig.host}:${streamConfig.port}`);
    } catch (error) {
      setConnectionStatus('error');
      setStatusMessage('Failed to connect to streaming server. Please check your configuration.');
    }
  };

  const startStreaming = async () => {
    if (connectionStatus !== 'connected') {
      setStatusMessage('Please test connection first');
      return;
    }

    try {
      // TODO: Implement actual streaming start
      setStatusMessage('Starting audio stream to server...');
      console.log('Starting stream with config:', streamConfig);
    } catch (error) {
      setStatusMessage('Failed to start streaming');
    }
  };

  // Monitor audio activity from the global context
  useEffect(() => {
    let animationFrame: number;
    
    const updateAudioLevel = () => {
      // Get real audio activity from context
      const isActive = getOverallActivity();
      const level = getActivityLevel();
      
      setIsAudioActive(isActive);
      setAudioLevel(level);
      
      animationFrame = requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [getOverallActivity, getActivityLevel]);

  return (
    <Container fluid className="py-4">
      <Row>
        <Col xs={12}>
          <Box sx={{ mb: 3 }}>
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                color: '#ffffff',
                fontWeight: 'bold',
                textAlign: 'center'
              }}
            >
              Audio Encoder & Streaming Setup
            </Typography>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: '#cccccc',
                textAlign: 'center',
                mb: 3
              }}
            >
              Configure and test your audio encoding settings for high-quality streaming
            </Typography>
          </Box>
        </Col>
      </Row>

      {/* Streaming Server Configuration */}
      <Row className="mb-4">
        <Col xs={12} lg={8} className="mx-auto">
          <Paper 
            elevation={2} 
            sx={{ 
              p: 3, 
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              border: '2px solid #ffeb3b'
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ color: '#ffeb3b', fontWeight: 'bold' }}>
              🎵 Streaming Server Configuration
            </Typography>
            
            <Row>
              <Col md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#cccccc' }}>Server Type</InputLabel>
                  <Select
                    value={streamConfig.serverType}
                    onChange={(e) => handleConfigChange('serverType', e.target.value)}
                    sx={{ 
                      color: '#ffffff',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '& .MuiSvgIcon-root': { color: '#cccccc' }
                    }}
                  >
                    <MenuItem value="icecast">Icecast</MenuItem>
                    <MenuItem value="shoutcast">SHOUTcast</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Server Host"
                  value={streamConfig.host}
                  onChange={(e) => handleConfigChange('host', e.target.value)}
                  placeholder="localhost or IP address"
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': { color: '#cccccc' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                  }}
                />

                <TextField
                  fullWidth
                  label="Port"
                  value={streamConfig.port}
                  onChange={(e) => handleConfigChange('port', e.target.value)}
                  placeholder="8000"
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': { color: '#cccccc' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                  }}
                />
              </Col>

              <Col md={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={streamConfig.username}
                  onChange={(e) => handleConfigChange('username', e.target.value)}
                  placeholder="source"
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': { color: '#cccccc' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={streamConfig.password}
                  onChange={(e) => handleConfigChange('password', e.target.value)}
                  placeholder="Enter server password"
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': { color: '#cccccc' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                  }}
                />

                <TextField
                  fullWidth
                  label={streamConfig.serverType === 'icecast' ? 'Mountpoint' : 'Stream ID'}
                  value={streamConfig.mountpoint}
                  onChange={(e) => handleConfigChange('mountpoint', e.target.value)}
                  placeholder={streamConfig.serverType === 'icecast' ? '/radio' : '1'}
                  sx={{ 
                    mb: 2,
                    '& .MuiInputLabel-root': { color: '#cccccc' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' }
                  }}
                />
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#cccccc' }}>Bitrate</InputLabel>
                  <Select
                    value={streamConfig.bitrate}
                    onChange={(e) => handleConfigChange('bitrate', e.target.value)}
                    sx={{ 
                      color: '#ffffff',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '& .MuiSvgIcon-root': { color: '#cccccc' }
                    }}
                  >
                    <MenuItem value="64">64 kbps</MenuItem>
                    <MenuItem value="128">128 kbps</MenuItem>
                    <MenuItem value="192">192 kbps</MenuItem>
                    <MenuItem value="320">320 kbps</MenuItem>
                  </Select>
                </FormControl>
              </Col>

              <Col md={6}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#cccccc' }}>Format</InputLabel>
                  <Select
                    value={streamConfig.format}
                    onChange={(e) => handleConfigChange('format', e.target.value)}
                    sx={{ 
                      color: '#ffffff',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '& .MuiSvgIcon-root': { color: '#cccccc' }
                    }}
                  >
                    <MenuItem value="MP3">MP3</MenuItem>
                    <MenuItem value="OGG">OGG Vorbis</MenuItem>
                    <MenuItem value="AAC">AAC</MenuItem>
                  </Select>
                </FormControl>
              </Col>
            </Row>

            <Divider sx={{ my: 2, backgroundColor: '#555' }} />

            {/* Connection Status */}
            {connectionStatus !== 'disconnected' && (
              <Alert 
                severity={
                  connectionStatus === 'connected' ? 'success' : 
                  connectionStatus === 'error' ? 'error' : 'info'
                }
                sx={{ mb: 2 }}
              >
                {statusMessage}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={testConnection}
                disabled={connectionStatus === 'connecting'}
                sx={{
                  borderColor: '#ffeb3b',
                  color: '#ffeb3b',
                  '&:hover': {
                    borderColor: '#fff176',
                    backgroundColor: 'rgba(255, 235, 59, 0.1)'
                  }
                }}
              >
                {connectionStatus === 'connecting' ? 'Testing...' : 'Test Connection'}
              </Button>

              <Button
                variant="contained"
                onClick={startStreaming}
                disabled={connectionStatus !== 'connected'}
                sx={{
                  backgroundColor: '#4caf50',
                  '&:hover': {
                    backgroundColor: '#66bb6a'
                  },
                  '&:disabled': {
                    backgroundColor: '#666'
                  }
                }}
              >
                Start Streaming
              </Button>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={streamConfig.enabled}
                      onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#ffeb3b'
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#ffeb3b'
                        }
                      }}
                    />
                  }
                  label="Enable Auto-Connect"
                  sx={{ color: '#cccccc' }}
                />

                {/* Input Audio Meter */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#cccccc', minWidth: '60px' }}>
                    Input Level:
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    gap: '2px', 
                    alignItems: 'center',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    p: '2px',
                    backgroundColor: '#1a1a1a',
                    minWidth: '120px'
                  }}>
                    {/* Audio Level Bars */}
                    {[...Array(12)].map((_, index) => {
                      // Calculate which segments should be active based on audio level
                      const segmentThreshold = (index + 1) / 12 * 100; // Each segment represents ~8.33% of full scale
                      const isActive = audioLevel >= segmentThreshold;
                      
                      let color = '#333333'; // Default (inactive)
                      
                      if (isActive) {
                        if (index < 7) color = '#4caf50'; // Green (safe levels 0-58%)
                        else if (index < 10) color = '#ffeb3b'; // Yellow (moderate levels 58-83%)
                        else color = '#f44336'; // Red (peak levels 83-100%)
                      }
                      
                      return (
                        <Box
                          key={index}
                          sx={{
                            width: '6px',
                            height: '16px',
                            backgroundColor: color,
                            borderRadius: '1px',
                            transition: 'background-color 0.05s ease',
                            boxShadow: isActive && index >= 10 ? '0 0 4px rgba(244, 67, 54, 0.6)' : 'none' // Glow effect for peaks
                          }}
                        />
                      );
                    })}
                  </Box>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: isAudioActive ? '#4caf50' : (streamConfig.enabled ? '#ffeb3b' : '#666666'),
                      fontWeight: 'bold',
                      minWidth: '45px'
                    }}
                  >
                    {isAudioActive ? 'LIVE' : (streamConfig.enabled ? 'READY' : 'OFF')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Connection Info */}
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
              <Typography variant="caption" sx={{ color: '#cccccc', display: 'block' }}>
                Stream URL: {streamConfig.serverType}://{streamConfig.host}:{streamConfig.port}{streamConfig.mountpoint}
              </Typography>
              <Typography variant="caption" sx={{ color: '#cccccc' }}>
                Quality: {streamConfig.bitrate}kbps {streamConfig.format} • {streamConfig.serverType.toUpperCase()} Server
              </Typography>
            </Box>
          </Paper>
        </Col>
      </Row>

      <Row>
        <Col xs={12} lg={8} className="mx-auto">
          <AudioEncodingDiagnostics />
        </Col>
      </Row>

      <Row className="mt-4">
        <Col xs={12} lg={8} className="mx-auto">
          <Box 
            sx={{ 
              p: 3,
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #333'
            }}
          >
            <Typography variant="h6" sx={{ color: '#ffeb3b', mb: 2 }}>
              Streaming Server Setup Guide
            </Typography>
            
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 2 }}>
              <strong>SHOUTcast vs Icecast:</strong>
              <br />• <strong>Icecast:</strong> Open-source, supports multiple formats (MP3, OGG, AAC), multiple mountpoints
              <br />• <strong>SHOUTcast:</strong> Industry standard, MP3 focused, simple setup, wide compatibility
            </Typography>
            
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 2 }}>
              <strong>Recommended Settings:</strong>
              <br />• <strong>Bitrate:</strong> 128kbps for good quality, 320kbps for high quality
              <br />• <strong>Format:</strong> MP3 for maximum compatibility, OGG for better compression
              <br />• <strong>Port:</strong> 8000 (Icecast default), 8080 (SHOUTcast default)
            </Typography>

            <Typography variant="body2" sx={{ color: '#cccccc', mb: 2 }}>
              <strong>Server Configuration:</strong>
              <br />• Install Icecast/SHOUTcast on your server or use a hosting service
              <br />• Configure source credentials (username/password)
              <br />• Set up mountpoint (Icecast) or stream ID (SHOUTcast)
              <br />• Test connection before going live
            </Typography>

            <Typography variant="body2" sx={{ color: '#cccccc' }}>
              <strong>Audio Flow:</strong> DJ Mixer → Web Audio API → Audio Encoder → Streaming Server → Listeners
              <br />Your radio platform captures all audio sources and streams them to your configured server 
              for distribution to your audience worldwide.
            </Typography>
          </Box>
        </Col>
      </Row>
    </Container>
  );
};

export default AudioEncoderPage;