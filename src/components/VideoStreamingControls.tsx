import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  ButtonGroup,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
  Chip,
  LinearProgress,

  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Row, Col } from 'react-bootstrap';
import AudioMeter from './AudioMeter';
import { useAudioActivity } from '../contexts/AudioActivityContext';
import {
  Videocam,
  VideocamOff,
  Image as ImageIcon,
  Slideshow,
  PowerSettingsNew,
  YouTube,
  Facebook,
  Settings,
  TextFields,
  Clear,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

interface VideoStreamingControlsProps {
  onVideoSourceChange?: (source: string) => void;
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  configured: boolean;
  streaming: boolean;
}

// interface StreamStats {
//   viewers: number;
//   duration: string;
//   bitrate: string;
//   quality: string;
// }

const VideoStreamingControls: React.FC<VideoStreamingControlsProps> = ({ onVideoSourceChange }) => {
  // Audio activity context
  const { audioState, getOverallActivity, getActivityLevel } = useAudioActivity();
  
  // Video source state
  const [videoSource, setVideoSource] = useState<'camera' | 'image' | 'slideshow' | 'off'>('off');
  
  // Image/Slideshow state
  const [selectedImage, setSelectedImage] = useState('');
  const [slideshowImages, setSlideshowImages] = useState<string[]>([]);
  const [slideDuration, setSlideDuration] = useState(5);
  const [slideshowLoop, setSlideshowLoop] = useState(true);
  
  // Available social media platforms
  const availablePlatforms = [
    { id: 'youtube', name: 'YouTube', icon: <YouTube />, color: '#FF0000' },
    { id: 'twitch', name: 'Twitch', icon: <Settings />, color: '#9146FF' },
    { id: 'facebook', name: 'Facebook', icon: <Facebook />, color: '#1877F2' },
    { id: 'tiktok', name: 'TikTok', icon: <Settings />, color: '#000000' },
    { id: 'instagram', name: 'Instagram', icon: <Settings />, color: '#E4405F' },
  ];

  // User's selected platforms
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
  
  // Stream configuration
  const [streamKeys, setStreamKeys] = useState<Record<string, string>>({});
  const [streamTitles, setStreamTitles] = useState<Record<string, string>>({});
  // const [rtmpUrls, setRtmpUrls] = useState<Record<string, string>>({});
  
  // Custom RTMP streams
  const [customRtmpStreams, setCustomRtmpStreams] = useState<Array<{
    id: string;
    name: string;
    rtmpUrl: string;
    streamKey: string;
    configured: boolean;
    streaming: boolean;
  }>>([]);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  
  // Text overlay
  const [overlayText, setOverlayText] = useState('');
  const [overlayPosition, setOverlayPosition] = useState({ x: 50, y: 50 });
  const [overlayVisible, setOverlayVisible] = useState(false);
  
  // Status
  const [status, setStatus] = useState<'idle' | 'connecting' | 'streaming' | 'error'>('idle');
  // const [streamStats, setStreamStats] = useState<Record<string, StreamStats>>({});
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  
  // Audio level monitoring
  const [audioLevels, setAudioLevels] = useState({ left: 0, right: 0 });
  const [isAudioActive, setIsAudioActive] = useState(false);
  
  // Platform management dialogs
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [rtmpDialogOpen, setRtmpDialogOpen] = useState(false);
  const [editingRtmp, setEditingRtmp] = useState<{id: string, name: string, rtmpUrl: string, streamKey: string} | null>(null);

  // API call helper
  const apiCall = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_AUDIO_URL || 'http://localhost:8080'}/api/video${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('API call error:', error);
      setAlertMessage({ type: 'error', message: `API Error: ${error.message}` });
      throw error;
    }
  };

  // Video source controls
  const handleVideoSourceChange = async (source: 'camera' | 'image' | 'slideshow' | 'off') => {
    try {
      let endpoint = '';
      let body = undefined;
      
      switch (source) {
        case 'camera':
          endpoint = '/camera/on';
          break;
        case 'off':
          endpoint = '/camera/off';
          break;
        case 'image':
          endpoint = '/image';
          body = { image_path: selectedImage };
          break;
        case 'slideshow':
          endpoint = '/slideshow/start';
          body = {
            images: slideshowImages,
            duration: slideDuration,
            loop: slideshowLoop,
            transition: 'fade'
          };
          break;
      }
      
      const result = await apiCall(endpoint, 'POST', body);
      
      if (result.success) {
        setVideoSource(source);
        onVideoSourceChange?.(source);
        setAlertMessage({ type: 'success', message: `Switched to ${source} source` });
      }
    } catch (error: any) {
      setAlertMessage({ type: 'error', message: `Failed to change video source: ${error.message}` });
    }
  };

  // Social media configuration
  const handlePlatformConfig = async (platformId: string) => {
    const streamKey = streamKeys[platformId];
    const title = streamTitles[platformId] || `OneStopRadio Live on ${platformId}`;
    
    if (!streamKey) {
      setAlertMessage({ type: 'error', message: 'Please enter a stream key' });
      return;
    }
    
    try {
      const result = await apiCall(`/stream/${platformId}`, 'POST', {
        stream_key: streamKey,
        title: title
      });
      
      if (result.success) {
        setPlatforms(prev => prev.map(p => 
          p.id === platformId ? { ...p, configured: true } : p
        ));
        setAlertMessage({ type: 'success', message: `${platformId} configured successfully` });
      }
    } catch (error) {
      setAlertMessage({ type: 'error', message: `Failed to configure ${platformId}` });
    }
  };

  // Live streaming controls
  const handleStartStreaming = async () => {
    const configuredPlatforms = platforms
      .filter(p => p.configured)
      .map(p => p.id);
    
    if (configuredPlatforms.length === 0) {
      setAlertMessage({ type: 'error', message: 'Please configure at least one platform' });
      return;
    }
    
    try {
      setStatus('connecting');
      
      const result = await apiCall('/stream/start', 'POST', {
        platforms: configuredPlatforms
      });
      
      if (result.success) {
        setIsLiveStreaming(true);
        setStatus('streaming');
        setPlatforms(prev => prev.map(p => 
          configuredPlatforms.includes(p.id) ? { ...p, streaming: true } : p
        ));
        setAlertMessage({ type: 'success', message: '🎥 Live streaming started!' });
      }
    } catch (error) {
      setStatus('error');
      setAlertMessage({ type: 'error', message: 'Failed to start streaming' });
    }
  };

  const handleStopStreaming = async () => {
    try {
      const result = await apiCall('/stream/stop', 'POST');
      
      if (result.success) {
        setIsLiveStreaming(false);
        setStatus('idle');
        setPlatforms(prev => prev.map(p => ({ ...p, streaming: false })));
        setAlertMessage({ type: 'info', message: 'Live streaming stopped' });
      }
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Failed to stop streaming' });
    }
  };

  // Text overlay controls
  const handleUpdateOverlay = async () => {
    try {
      if (overlayText.trim()) {
        const result = await apiCall('/overlay/text', 'POST', {
          text: overlayText,
          x: overlayPosition.x,
          y: overlayPosition.y,
          font: 'Arial',
          font_size: 24
        });
        
        if (result.success) {
          setOverlayVisible(true);
          setAlertMessage({ type: 'success', message: 'Text overlay added' });
        }
      } else {
        const result = await apiCall('/overlay/clear', 'POST');
        
        if (result.success) {
          setOverlayVisible(false);
          setAlertMessage({ type: 'info', message: 'Text overlay removed' });
        }
      }
    } catch (error) {
      setAlertMessage({ type: 'error', message: 'Failed to update overlay' });
    }
  };

  // File upload handlers
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, upload to server and get path
      const imagePath = `/uploads/${file.name}`;
      setSelectedImage(imagePath);
    }
  };

  const handleSlideshowUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imagePaths = files.map(file => `/uploads/${file.name}`);
    setSlideshowImages(imagePaths);
  };

  // Platform management functions
  const addPlatform = (platformId: string) => {
    const availablePlatform = availablePlatforms.find(p => p.id === platformId);
    if (availablePlatform && !platforms.find(p => p.id === platformId)) {
      setPlatforms(prev => [...prev, {
        ...availablePlatform,
        configured: false,
        streaming: false
      }]);
    }
  };

  const removePlatform = (platformId: string) => {
    setPlatforms(prev => prev.filter(p => p.id !== platformId));
    setStreamKeys(prev => {
      const updated = { ...prev };
      delete updated[platformId];
      return updated;
    });
    setStreamTitles(prev => {
      const updated = { ...prev };
      delete updated[platformId];
      return updated;
    });
  };

  // RTMP management functions
  const addRtmpStream = (name: string, rtmpUrl: string, streamKey: string) => {
    const newStream = {
      id: Date.now().toString(),
      name,
      rtmpUrl,
      streamKey,
      configured: true,
      streaming: false
    };
    setCustomRtmpStreams(prev => [...prev, newStream]);
  };

  const editRtmpStream = (stream: typeof customRtmpStreams[0]) => {
    setEditingRtmp(stream);
    setRtmpDialogOpen(true);
  };

  const removeRtmpStream = (streamId: string) => {
    setCustomRtmpStreams(prev => prev.filter(s => s.id !== streamId));
  };

  const handleRtmpConfig = async (streamId: string) => {
    // Implementation for configuring RTMP stream
    setAlertMessage({ type: 'info', message: `Configuring RTMP stream: ${streamId}` });
  };

  useEffect(() => {
    // Auto-dismiss alerts after 5 seconds
    if (alertMessage) {
      const timer = setTimeout(() => setAlertMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  // Audio level monitoring based on actual audio activity
  useEffect(() => {
    let animationFrame: number;
    
    const updateAudioLevels = () => {
      const hasAudioActivity = getOverallActivity();
      const baseLevel = getActivityLevel();
      
      if (hasAudioActivity || isLiveStreaming) {
        setIsAudioActive(true);
        
        // Calculate levels without microphone contribution
        const variation = (Math.random() - 0.5) * 15; // ±7.5% variation
        
        const leftLevel = Math.max(0, Math.min(100, baseLevel + variation));
        const rightLevel = Math.max(0, Math.min(100, baseLevel + variation * 0.9)); // Slightly different for stereo effect
        
        setAudioLevels({ left: leftLevel, right: rightLevel });
      } else {
        setIsAudioActive(false);
        setAudioLevels({ left: 0, right: 0 });
      }
      
      animationFrame = requestAnimationFrame(updateAudioLevels);
    };

    animationFrame = requestAnimationFrame(updateAudioLevels);
    return () => cancelAnimationFrame(animationFrame);
  }, [audioState.channelAPlaying, audioState.channelBPlaying, isLiveStreaming, getOverallActivity, getActivityLevel]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        🎥 Video Streaming Controls
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

      <Row>
        {/* Video Source Controls */}
        <Col md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📹 Video Source
              </Typography>
              
              <ButtonGroup variant="outlined" fullWidth sx={{ mb: 2 }}>
                <Button
                  startIcon={<Videocam />}
                  variant={videoSource === 'camera' ? 'contained' : 'outlined'}
                  onClick={() => handleVideoSourceChange('camera')}
                  color={videoSource === 'camera' ? 'success' : 'primary'}
                >
                  Camera
                </Button>
                <Button
                  startIcon={<ImageIcon />}
                  variant={videoSource === 'image' ? 'contained' : 'outlined'}
                  onClick={() => handleVideoSourceChange('image')}
                  disabled={!selectedImage}
                >
                  Image
                </Button>
                <Button
                  startIcon={<Slideshow />}
                  variant={videoSource === 'slideshow' ? 'contained' : 'outlined'}
                  onClick={() => handleVideoSourceChange('slideshow')}
                  disabled={slideshowImages.length === 0}
                >
                  Slideshow
                </Button>
                <Button
                  startIcon={<VideocamOff />}
                  variant={videoSource === 'off' ? 'contained' : 'outlined'}
                  onClick={() => handleVideoSourceChange('off')}
                  color={videoSource === 'off' ? 'error' : 'primary'}
                >
                  Off
                </Button>
              </ButtonGroup>

              {/* Image Upload */}
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="image-upload"
                  type="file"
                  onChange={handleImageUpload}
                />
                <label htmlFor="image-upload">
                  <Button variant="outlined" component="span" fullWidth>
                    Upload Image
                  </Button>
                </label>
                {selectedImage && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Selected: {selectedImage}
                  </Typography>
                )}
              </Box>

              {/* Slideshow Upload */}
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="slideshow-upload"
                  type="file"
                  multiple
                  onChange={handleSlideshowUpload}
                />
                <label htmlFor="slideshow-upload">
                  <Button variant="outlined" component="span" fullWidth>
                    Upload Slideshow Images
                  </Button>
                </label>
                {slideshowImages.length > 0 && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {slideshowImages.length} images selected
                  </Typography>
                )}
              </Box>

              {/* Slideshow Settings */}
              {slideshowImages.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <TextField
                    label="Slide Duration (seconds)"
                    type="number"
                    value={slideDuration}
                    onChange={(e) => setSlideDuration(Number(e.target.value))}
                    fullWidth
                    sx={{ mb: 1 }}
                    inputProps={{ min: 1, max: 60 }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={slideshowLoop}
                        onChange={(e) => setSlideshowLoop(e.target.checked)}
                      />
                    }
                    label="Loop slideshow"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Col>

        {/* Audio Level Monitor */}
        <Col md={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
                🎵 Audio Levels
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'end', height: 120 }}>
                <AudioMeter 
                  label="L" 
                  height={100}
                  isPlaying={isAudioActive}
                  level={audioLevels.left}
                />
                <AudioMeter 
                  label="R" 
                  height={100}
                  isPlaying={isAudioActive}
                  level={audioLevels.right}
                />
              </Box>
              
              {isAudioActive && (
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  mt: 1,
                  color: 'success.main',
                  fontWeight: 'bold'
                }}>
                  🟢 ACTIVE
                </Typography>
              )}
              
              {!isAudioActive && (
                <Typography variant="caption" sx={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  mt: 1,
                  color: 'text.secondary'
                }}>
                  ⚫ SILENT
                </Typography>
              )}
            </CardContent>
          </Card>
        </Col>

        {/* Social Media Streaming */}
        <Col md={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  📡 Social Media Streaming
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setPlatformDialogOpen(true)}
                >
                  Add Platform
                </Button>
              </Box>

              {platforms.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 3, color: 'text.secondary' }}>
                  <Typography>No platforms configured</Typography>
                  <Typography variant="body2">Click "Add Platform" to get started</Typography>
                </Box>
              ) : (
                platforms.map((platform) => (
                  <Box key={platform.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {platform.icon}
                      <Typography variant="subtitle1" sx={{ ml: 1, flex: 1 }}>
                        {platform.name}
                      </Typography>
                      <Chip
                        label={platform.streaming ? 'LIVE' : platform.configured ? 'Ready' : 'Setup Required'}
                        color={platform.streaming ? 'error' : platform.configured ? 'success' : 'default'}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => removePlatform(platform.id)}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <TextField
                      label="Stream Key"
                      type="password"
                      value={streamKeys[platform.id] || ''}
                      onChange={(e) => setStreamKeys(prev => ({ ...prev, [platform.id]: e.target.value }))}
                      fullWidth
                      sx={{ mb: 1 }}
                      size="small"
                    />
                    
                    <TextField
                      label="Stream Title"
                      value={streamTitles[platform.id] || ''}
                      onChange={(e) => setStreamTitles(prev => ({ ...prev, [platform.id]: e.target.value }))}
                      fullWidth
                      sx={{ mb: 1 }}
                      size="small"
                    />
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handlePlatformConfig(platform.id)}
                      disabled={!streamKeys[platform.id] || platform.streaming}
                    >
                      Configure
                    </Button>
                  </Box>
                ))
              )}

              <Divider sx={{ my: 2 }} />
              
              {/* Custom RTMP Streams */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  🔗 Custom RTMP Streams
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<LinkIcon />}
                  onClick={() => setRtmpDialogOpen(true)}
                >
                  Add RTMP
                </Button>
              </Box>

              {customRtmpStreams.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                  <Typography variant="body2">No custom RTMP streams configured</Typography>
                </Box>
              ) : (
                customRtmpStreams.map((stream) => (
                  <Box key={stream.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LinkIcon sx={{ mr: 1 }} />
                      <Typography variant="subtitle1" sx={{ flex: 1 }}>
                        {stream.name}
                      </Typography>
                      <Chip
                        label={stream.streaming ? 'LIVE' : stream.configured ? 'Ready' : 'Setup Required'}
                        color={stream.streaming ? 'error' : stream.configured ? 'success' : 'default'}
                        size="small"
                      />
                      <IconButton
                        size="small"
                        onClick={() => editRtmpStream(stream)}
                        sx={{ ml: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => removeRtmpStream(stream.id)}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                    
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      URL: {stream.rtmpUrl}
                    </Typography>
                    
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleRtmpConfig(stream.id)}
                      disabled={!stream.rtmpUrl || !stream.streamKey || stream.streaming}
                    >
                      Configure
                    </Button>
                  </Box>
                ))
              )}

              <Divider sx={{ my: 2 }} />

              {/* Live Streaming Controls */}
              <Box sx={{ textAlign: 'center' }}>
                {status === 'connecting' && <LinearProgress sx={{ mb: 2 }} />}
                
                <Button
                  variant="contained"
                  size="large"
                  color={isLiveStreaming ? 'error' : 'primary'}
                  startIcon={<PowerSettingsNew />}
                  onClick={isLiveStreaming ? handleStopStreaming : handleStartStreaming}
                  disabled={status === 'connecting'}
                  sx={{ minWidth: 200 }}
                >
                  {isLiveStreaming ? 'Stop Stream' : 'Go Live'}
                </Button>
                
                {isLiveStreaming && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'error.main', fontWeight: 'bold' }}>
                    🔴 LIVE STREAMING
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Text Overlay Controls */}
        <Col xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📝 Text Overlay
              </Typography>
              
              <Row className="align-items-center">
                <Col xs={12} md={6}>
                  <TextField
                    label="Overlay Text"
                    value={overlayText}
                    onChange={(e) => setOverlayText(e.target.value)}
                    fullWidth
                    placeholder="Enter text to display on video..."
                  />
                </Col>
                <Col xs={6} md={2}>
                  <TextField
                    label="X Position"
                    type="number"
                    value={overlayPosition.x}
                    onChange={(e) => setOverlayPosition(prev => ({ ...prev, x: Number(e.target.value) }))}
                    fullWidth
                    inputProps={{ min: 0, max: 1920 }}
                  />
                </Col>
                <Col xs={6} md={2}>
                  <TextField
                    label="Y Position"
                    type="number"
                    value={overlayPosition.y}
                    onChange={(e) => setOverlayPosition(prev => ({ ...prev, y: Number(e.target.value) }))}
                    fullWidth
                    inputProps={{ min: 0, max: 1080 }}
                  />
                </Col>
                <Col xs={12} md={2}>
                  <Button
                    variant="contained"
                    startIcon={overlayText.trim() ? <TextFields /> : <Clear />}
                    onClick={handleUpdateOverlay}
                    fullWidth
                  >
                    {overlayText.trim() ? 'Add' : 'Clear'}
                  </Button>
                </Col>
              </Row>
              
              {overlayVisible && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Text overlay active: "{overlayText}" at position ({overlayPosition.x}, {overlayPosition.y})
                </Alert>
              )}
            </CardContent>
          </Card>
        </Col>
      </Row>

      {/* Platform Selection Dialog */}
      <Dialog open={platformDialogOpen} onClose={() => setPlatformDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Social Media Platform</DialogTitle>
        <DialogContent>
          <List>
            {availablePlatforms
              .filter(platform => !platforms.find(p => p.id === platform.id))
              .map((platform) => (
                <ListItem 
                  key={platform.id} 
                  onClick={() => {
                    addPlatform(platform.id);
                    setPlatformDialogOpen(false);
                  }}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
                >
                  <ListItemIcon sx={{ color: platform.color }}>
                    {platform.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={platform.name}
                    secondary={`Add ${platform.name} streaming`}
                  />
                </ListItem>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlatformDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* RTMP Configuration Dialog */}
      <Dialog open={rtmpDialogOpen} onClose={() => {
        setRtmpDialogOpen(false);
        setEditingRtmp(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRtmp ? 'Edit RTMP Stream' : 'Add Custom RTMP Stream'}</DialogTitle>
        <DialogContent>
          <TextField
            label="Stream Name"
            fullWidth
            margin="normal"
            defaultValue={editingRtmp?.name || ''}
            id="rtmp-name"
          />
          <TextField
            label="RTMP URL"
            fullWidth
            margin="normal"
            defaultValue={editingRtmp?.rtmpUrl || ''}
            placeholder="rtmp://live.example.com/live/"
            id="rtmp-url"
          />
          <TextField
            label="Stream Key"
            fullWidth
            margin="normal"
            defaultValue={editingRtmp?.streamKey || ''}
            placeholder="your-stream-key"
            id="rtmp-key"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRtmpDialogOpen(false);
            setEditingRtmp(null);
          }}>Cancel</Button>
          <Button 
            variant="contained"
            onClick={() => {
              const nameEl = document.getElementById('rtmp-name') as HTMLInputElement;
              const urlEl = document.getElementById('rtmp-url') as HTMLInputElement;
              const keyEl = document.getElementById('rtmp-key') as HTMLInputElement;
              
              if (nameEl?.value && urlEl?.value && keyEl?.value) {
                if (editingRtmp) {
                  // Update existing stream
                  setCustomRtmpStreams(prev => prev.map(stream =>
                    stream.id === editingRtmp.id
                      ? { ...stream, name: nameEl.value, rtmpUrl: urlEl.value, streamKey: keyEl.value }
                      : stream
                  ));
                } else {
                  // Add new stream
                  addRtmpStream(nameEl.value, urlEl.value, keyEl.value);
                }
                setRtmpDialogOpen(false);
                setEditingRtmp(null);
              }
            }}
          >
            {editingRtmp ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VideoStreamingControls;