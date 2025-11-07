import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Divider,
  Chip,
  LinearProgress,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormHelperText,
} from '@mui/material';
import {
  Radio as RadioIcon,
  Stream as StreamIcon,
  CloudUpload as CloudIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  SignalCellular4Bar as SignalIcon,
} from '@mui/icons-material';

interface StreamConfig {
  protocol: 'icecast2' | 'shoutcast';
  serverHost: string;
  serverPort: number;
  mountPoint: string;
  password: string;
  username: string;
  streamName: string;
  streamDescription: string;
  streamGenre: string;
  streamUrl: string;
  codec: 'mp3' | 'ogg_vorbis' | 'ogg_opus' | 'aac';
  bitrate: number;
  sampleRate: number;
  channels: number;
  quality: number;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  connectionTimeout: number;
  publicStream: boolean;
  enableMetadata: boolean;
}

interface StreamStats {
  status: 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error';
  statusMessage: string;
  connectedTime: number;
  bytesSent: number;
  currentBitrate: number;
  peakLevelLeft: number;
  peakLevelRight: number;
  currentListeners: number;
  reconnectCount: number;
}

interface AudioStreamEncoderProps {
  onConfigChange?: (config: StreamConfig) => void;
  onStreamingChange?: (streaming: boolean) => void;
}

const AudioStreamEncoder: React.FC<AudioStreamEncoderProps> = ({
  onConfigChange,
  onStreamingChange,
}) => {
  // Stream configuration
  const [config, setConfig] = useState<StreamConfig>({
    protocol: 'icecast2',
    serverHost: 'localhost',
    serverPort: 8000,
    mountPoint: '/stream.mp3',
    password: 'hackme',
    username: 'source',
    streamName: 'OneStopRadio Live',
    streamDescription: 'Professional DJ Streaming',
    streamGenre: 'Electronic',
    streamUrl: 'https://onestopradio.com',
    codec: 'mp3',
    bitrate: 128,
    sampleRate: 44100,
    channels: 2,
    quality: 5,
    autoReconnect: true,
    reconnectDelay: 5,
    maxReconnectAttempts: -1,
    connectionTimeout: 10,
    publicStream: true,
    enableMetadata: true,
  });

  // Stream status
  const [stats, setStats] = useState<StreamStats>({
    status: 'disconnected',
    statusMessage: 'Not connected',
    connectedTime: 0,
    bytesSent: 0,
    currentBitrate: 0,
    peakLevelLeft: 0,
    peakLevelRight: 0,
    currentListeners: 0,
    reconnectCount: 0,
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);

  // Protocol-specific field configurations
  const getFieldConfig = () => {
    const base = {
      serverHost: { required: true, enabled: true },
      serverPort: { required: true, enabled: true },
      password: { required: true, enabled: true },
      streamName: { required: false, enabled: true },
      streamDescription: { required: false, enabled: true },
      streamGenre: { required: false, enabled: true },
      streamUrl: { required: false, enabled: true },
      codec: { required: true, enabled: true },
      bitrate: { required: true, enabled: true },
      sampleRate: { required: true, enabled: true },
      mountPoint: { required: false, enabled: false },
      username: { required: false, enabled: false },
      publicStream: { required: false, enabled: true },
      enableMetadata: { required: false, enabled: true },
    };

    switch (config.protocol) {
      case 'icecast2':
        return {
          ...base,
          mountPoint: { required: true, enabled: true },
          username: { required: false, enabled: false }, // Not needed for Icecast2
          publicStream: { required: false, enabled: true },
          enableMetadata: { required: false, enabled: true },
        };
      
      case 'shoutcast':
        return {
          ...base,
          mountPoint: { required: false, enabled: false }, // Not used in SHOUTcast
          username: { required: true, enabled: true }, // Required for SHOUTcast v2
          publicStream: { required: false, enabled: true },
          enableMetadata: { required: false, enabled: true },
        };
      
      default:
        return base;
    }
  };

  const fieldConfig = getFieldConfig();

  // Supported codecs by protocol
  const getSupportedCodecs = () => {
    switch (config.protocol) {
      case 'icecast2':
        return [
          { value: 'mp3', label: 'MP3' },
          { value: 'ogg_vorbis', label: 'OGG Vorbis' },
          { value: 'ogg_opus', label: 'OGG Opus' },
          { value: 'aac', label: 'AAC' },
        ];
      case 'shoutcast':
        return [
          { value: 'mp3', label: 'MP3' },
          { value: 'aac', label: 'AAC' },
        ];
      default:
        return [];
    }
  };

  // Supported bitrates by codec
  const getSupportedBitrates = () => {
    switch (config.codec) {
      case 'mp3':
        return [64, 96, 128, 160, 192, 256, 320];
      case 'ogg_vorbis':
      case 'ogg_opus':
        return [64, 96, 128, 160, 192, 256];
      case 'aac':
        return [64, 96, 128, 160, 192, 256, 320];
      default:
        return [128];
    }
  };

  // Update config and notify parent
  const updateConfig = (updates: Partial<StreamConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // API calls to C++ backend
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_AUDIO_URL || 'http://localhost:8080'}/api/audio/stream${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Stream API error:', error);
      setAlertMessage({ type: 'error', message: `API Error: ${error.message}` });
      throw error;
    }
  };

  // Stream control functions
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const result = await apiCall('/connect', 'POST', config);
      
      if (result.success) {
        setStats(prev => ({ ...prev, status: 'connected', statusMessage: 'Connected to server' }));
        setAlertMessage({ type: 'success', message: 'Connected to stream server' });
      }
    } catch (error) {
      setStats(prev => ({ ...prev, status: 'error', statusMessage: 'Connection failed' }));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const result = await apiCall('/disconnect', 'POST');
      
      if (result.success) {
        setStats(prev => ({ ...prev, status: 'disconnected', statusMessage: 'Disconnected' }));
        setAlertMessage({ type: 'info', message: 'Disconnected from stream server' });
      }
    } catch (error) {
      // Handle error
    }
  };

  const handleStartStreaming = async () => {
    try {
      const result = await apiCall('/start', 'POST');
      
      if (result.success) {
        setStats(prev => ({ ...prev, status: 'streaming', statusMessage: 'Streaming live' }));
        setAlertMessage({ type: 'success', message: '🔴 Live streaming started!' });
        onStreamingChange?.(true);
      }
    } catch (error) {
      setStats(prev => ({ ...prev, status: 'error', statusMessage: 'Failed to start streaming' }));
    }
  };

  const handleStopStreaming = async () => {
    try {
      const result = await apiCall('/stop', 'POST');
      
      if (result.success) {
        setStats(prev => ({ ...prev, status: 'connected', statusMessage: 'Streaming stopped' }));
        setAlertMessage({ type: 'info', message: 'Streaming stopped' });
        onStreamingChange?.(false);
      }
    } catch (error) {
      // Handle error
    }
  };

  // Auto-dismiss alerts
  useEffect(() => {
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Status polling
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const result = await apiCall('/status');
        if (result.success) {
          setStats(result.stats);
        }
      } catch (error) {
        // Silently handle polling errors
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (stats.status) {
      case 'connected': return 'success';
      case 'streaming': return 'error';
      case 'connecting': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (stats.status) {
      case 'connected': return <CloudIcon />;
      case 'streaming': return <RadioIcon />;
      case 'connecting': return <SignalIcon />;
      case 'error': return <InfoIcon />;
      default: return <StreamIcon />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        📡 Audio Stream Encoder
      </Typography>

      {/* Alert Messages */}
      {alertMessage && (
        <Alert 
          severity={alertMessage.type} 
          sx={{ mb: 2 }}
          onClose={() => setAlertMessage(null)}
        >
          {alertMessage.message}
        </Alert>
      )}

      {/* Stream Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip
                icon={getStatusIcon()}
                label={stats.status.toUpperCase()}
                color={getStatusColor()}
                sx={{ mr: 2 }}
              />
              <Typography variant="body1">
                {stats.statusMessage}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {stats.status === 'disconnected' && (
                <Button
                  variant="contained"
                  onClick={handleConnect}
                  disabled={isConnecting}
                  startIcon={<CloudIcon />}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </Button>
              )}
              
              {stats.status === 'connected' && (
                <>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleStartStreaming}
                    startIcon={<PlayIcon />}
                  >
                    Go Live
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </>
              )}
              
              {stats.status === 'streaming' && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleStopStreaming}
                  startIcon={<StopIcon />}
                >
                  Stop Stream
                </Button>
              )}
            </Box>
          </Box>

          {/* Connection Progress */}
          {isConnecting && <LinearProgress sx={{ mb: 2 }} />}

          {/* Stream Statistics */}
          {(stats.status === 'connected' || stats.status === 'streaming') && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={3}>
                <Typography variant="caption" color="textSecondary">Connected Time</Typography>
                <Typography variant="body2">{formatTime(stats.connectedTime)}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="caption" color="textSecondary">Data Sent</Typography>
                <Typography variant="body2">{formatBytes(stats.bytesSent)}</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="caption" color="textSecondary">Current Bitrate</Typography>
                <Typography variant="body2">{stats.currentBitrate.toFixed(1)} kbps</Typography>
              </Grid>
              <Grid size={3}>
                <Typography variant="caption" color="textSecondary">Listeners</Typography>
                <Typography variant="body2">{stats.currentListeners}</Typography>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Stream Configuration */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">🔧 Stream Configuration</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Protocol Selection */}
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Streaming Protocol</InputLabel>
                <Select
                  value={config.protocol}
                  label="Streaming Protocol"
                  onChange={(e) => updateConfig({ protocol: e.target.value as 'icecast2' | 'shoutcast' })}
                >
                  <MenuItem value="icecast2">Icecast2</MenuItem>
                  <MenuItem value="shoutcast">SHOUTcast</MenuItem>
                </Select>
                <FormHelperText>
                  {config.protocol === 'icecast2' ? 'Open-source streaming server (recommended)' : 'Nullsoft SHOUTcast server'}
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Server Configuration */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Server Host"
                value={config.serverHost}
                onChange={(e) => updateConfig({ serverHost: e.target.value })}
                fullWidth
                required={fieldConfig.serverHost?.required}
                disabled={!fieldConfig.serverHost?.enabled}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: fieldConfig.serverHost?.enabled ? 'transparent' : 'rgba(0,0,0,0.04)',
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Server Port"
                type="number"
                value={config.serverPort}
                onChange={(e) => updateConfig({ serverPort: parseInt(e.target.value) })}
                fullWidth
                required={fieldConfig.serverPort?.required}
                disabled={!fieldConfig.serverPort?.enabled}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: fieldConfig.serverPort?.enabled ? 'transparent' : 'rgba(0,0,0,0.04)',
                  }
                }}
              />
            </Grid>

            {/* Mount Point (Icecast only) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Mount Point"
                value={config.mountPoint}
                onChange={(e) => updateConfig({ mountPoint: e.target.value })}
                fullWidth
                required={fieldConfig.mountPoint?.required}
                disabled={!fieldConfig.mountPoint?.enabled}
                helperText={config.protocol === 'icecast2' ? 'e.g., /stream.mp3' : 'Not used in SHOUTcast'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: fieldConfig.mountPoint?.enabled ? 'transparent' : 'rgba(0,0,0,0.04)',
                  }
                }}
              />
            </Grid>

            {/* Username (SHOUTcast only) */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Username"
                value={config.username}
                onChange={(e) => updateConfig({ username: e.target.value })}
                fullWidth
                required={fieldConfig.username?.required}
                disabled={!fieldConfig.username?.enabled}
                helperText={config.protocol === 'shoutcast' ? 'Required for SHOUTcast v2' : 'Not needed for Icecast2'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: fieldConfig.username?.enabled ? 'transparent' : 'rgba(0,0,0,0.04)',
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Password"
                type="password"
                value={config.password}
                onChange={(e) => updateConfig({ password: e.target.value })}
                fullWidth
                required={fieldConfig.password?.required}
                disabled={!fieldConfig.password?.enabled}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: fieldConfig.password?.enabled ? 'transparent' : 'rgba(0,0,0,0.04)',
                  }
                }}
              />
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Audio Encoding */}
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Codec</InputLabel>
                <Select
                  value={config.codec}
                  label="Codec"
                  onChange={(e) => updateConfig({ codec: e.target.value as any })}
                >
                  {getSupportedCodecs().map((codec) => (
                    <MenuItem key={codec.value} value={codec.value}>
                      {codec.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Bitrate (kbps)</InputLabel>
                <Select
                  value={config.bitrate}
                  label="Bitrate (kbps)"
                  onChange={(e) => updateConfig({ bitrate: e.target.value as number })}
                >
                  {getSupportedBitrates().map((bitrate) => (
                    <MenuItem key={bitrate} value={bitrate}>
                      {bitrate}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Sample Rate (Hz)</InputLabel>
                <Select
                  value={config.sampleRate}
                  label="Sample Rate (Hz)"
                  onChange={(e) => updateConfig({ sampleRate: e.target.value as number })}
                >
                  <MenuItem value={22050}>22050</MenuItem>
                  <MenuItem value={44100}>44100</MenuItem>
                  <MenuItem value={48000}>48000</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Divider sx={{ width: '100%', my: 2 }} />

            {/* Stream Metadata */}
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Stream Name"
                value={config.streamName}
                onChange={(e) => updateConfig({ streamName: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Genre"
                value={config.streamGenre}
                onChange={(e) => updateConfig({ streamGenre: e.target.value })}
                fullWidth
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Description"
                value={config.streamDescription}
                onChange={(e) => updateConfig({ streamDescription: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                label="Stream URL"
                value={config.streamUrl}
                onChange={(e) => updateConfig({ streamUrl: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Advanced Options */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">⚙️ Advanced Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.autoReconnect}
                    onChange={(e) => updateConfig({ autoReconnect: e.target.checked })}
                  />
                }
                label="Auto Reconnect"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.publicStream}
                    onChange={(e) => updateConfig({ publicStream: e.target.checked })}
                    disabled={!fieldConfig.publicStream?.enabled}
                  />
                }
                label="Public Stream"
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Reconnect Delay (seconds)"
                type="number"
                value={config.reconnectDelay}
                onChange={(e) => updateConfig({ reconnectDelay: parseInt(e.target.value) })}
                fullWidth
                disabled={!config.autoReconnect}
                inputProps={{ min: 1, max: 60 }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Max Reconnect Attempts"
                type="number"
                value={config.maxReconnectAttempts}
                onChange={(e) => updateConfig({ maxReconnectAttempts: parseInt(e.target.value) })}
                fullWidth
                disabled={!config.autoReconnect}
                helperText="-1 for unlimited"
                inputProps={{ min: -1, max: 100 }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                label="Connection Timeout (seconds)"
                type="number"
                value={config.connectionTimeout}
                onChange={(e) => updateConfig({ connectionTimeout: parseInt(e.target.value) })}
                fullWidth
                inputProps={{ min: 5, max: 60 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default AudioStreamEncoder;