import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { 
  Button, 
  Typography, 
  Box, 
  Paper, 
  Chip, 
  Alert
} from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitchIcon from '@mui/icons-material/Tv';

// Import our services
import { audioService } from '../services/AudioService';
import { usePlaylist } from '../contexts/PlaylistContext';
import { webSocketService } from '../services/WebSocketService';
import { mediaServerService } from '../services/MediaServerService';
import type { ListenerStats, StreamStatus } from '../services/WebSocketService';
import type { SocialPlatform, StreamStats } from '../services/MediaServerService';

// Lazy load heavy components for faster initial render
const Mixer = lazy(() => import('./Mixer'));
const VideoPlayer = lazy(() => import('./VideoPlayer'));
const TrackChannelDiagnostics = lazy(() => import('./TrackChannelDiagnostics'));
const MusicPlaylist = lazy(() => import('./MusicPlaylist'));
const MusicLibrary = lazy(() => import('./MusicLibrary'));
const BackendStatusIndicator = lazy(() => import('./BackendStatusIndicator'));
interface DJInterfaceState {
  isStreaming: boolean;
  listenerStats: ListenerStats | null;
  streamStats: StreamStats | null;
  socialPlatforms: SocialPlatform[];
  streamStatus: StreamStatus | null;
}



const DJInterface: React.FC = () => {
  const { deckA, deckB, loadToDeck } = usePlaylist();
  
  // Create adapter function for MusicLibrary
  const handleLoadToDeck = (trackId: string) => {
    // Create a Track object from the trackId
    // In a real implementation, this would fetch the full track data
    const track = {
      id: trackId,
      title: `Track ${trackId}`,
      artist: 'Unknown Artist',
      duration: 180,
      dateAdded: new Date(),
      playCount: 0,
      bpm: 120, // Add BPM for compatibility
      genre: 'Electronic' // Add genre
    };
    
    console.log(`🎵 DJInterface: Loading track ${trackId} to Deck A`);
    
    // Load to deck A by default (you could add UI to let user choose)
    loadToDeck(track, 'A');
  };
  
  const [state, setState] = useState<DJInterfaceState>({
    isStreaming: false,
    listenerStats: null,
    streamStats: null,
    socialPlatforms: [],
    streamStatus: null
  });

  // Audio Controls State
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Initialize services and set up event listeners
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('🎵 DJInterface: Initializing services...');
        
        // Set initial mock state immediately to prevent UI blocking
        setState(prev => ({ 
          ...prev, 
          listenerStats: { current: 0, peak: 0, locations: [] },
          streamStatus: { isLive: false, viewerCount: 0, quality: 'medium', bitrate: 128 },
          streamStats: { 
            viewers: 0, 
            duration: 0, 
            uptime: 0, 
            bitrate: 128, 
            latency: 50, 
            cpuUsage: 0, 
            quality: 'good', 
            droppedFrames: 0, 
            bandwidth: 0 
          },
          socialPlatforms: []
        }));
        
        // Initialize WebSocket connection with ultra-fast timeout
        setTimeout(async () => {
          try {
            console.log('🔌 Attempting WebSocket connection...');
            const connected = await Promise.race([
              webSocketService.connect('station-1', 'temp-token'),
              new Promise((_, reject) => setTimeout(() => reject(new Error('WebSocket timeout')), 300))
            ]);
            
            if (connected) {
              console.log('✅ WebSocket connected successfully');
              // Set up listener stats updates
              webSocketService.onListenerStats((stats) => {
                setState(prev => ({ ...prev, listenerStats: stats }));
              });

              // Set up stream status updates
              webSocketService.onStreamStatus((status) => {
                setState(prev => ({ ...prev, streamStatus: status }));
              });
            }
          } catch (wsError) {
            console.warn('⚠️ WebSocket connection failed, continuing without real-time features:', wsError);
          }
        }, 50); // Minimal delay

        // Initialize media server connection with ultra-fast timeout
        setTimeout(async () => {
          try {
            console.log('🎛️ Attempting media server connection...');
            const mediaConnected = await Promise.race([
              mediaServerService.connect(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Media server timeout')), 300))
            ]);
            
            if (mediaConnected) {
              console.log('✅ Media server connected successfully');
              // Set up stream stats updates
              mediaServerService.onStreamStats((stats) => {
                setState(prev => ({ ...prev, streamStats: stats }));
              });

              // Load social platforms configuration
              const platforms = await mediaServerService.getSocialPlatforms();
              setState(prev => ({ ...prev, socialPlatforms: platforms }));
            }
          } catch (mediaError) {
            console.warn('⚠️ Media server connection failed, using mock data:', mediaError);
          }
        }, 100); // Minimal delay

        console.log('✅ DJInterface services initialization started (non-blocking)');

      } catch (error) {
        console.error('❌ Failed to initialize services:', error);
      }
    };

    initializeServices();

    // Cleanup on component unmount
    return () => {
      try {
        webSocketService.disconnect();
        mediaServerService.disconnect();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };
  }, []);

  const handleGoLive = async () => {
    try {
      if (!state.isStreaming) {
        // Initialize audio context and services
        console.log('Starting live stream with audio encoding...');
        await audioService.initialize();
        await mediaServerService.initialize();
        
        // Configure high-quality audio encoding settings
        const audioConfig = {
          sampleRate: 48000,
          bitRate: 128000, // 128kbps for radio-quality audio
          channels: 2
        };
        
        // Get DJ mix stream from AudioService
        const mixStream = audioService.startStreaming(audioConfig);
        
        // Get optional video stream for visual content
        let videoStream: MediaStream | undefined;
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: audioConfig.sampleRate,
              channelCount: audioConfig.channels
            },
            video: { 
              width: 1920, 
              height: 1080,
              frameRate: 30
            }
          });
          
          // Use video track if available
          if (mediaStream.getVideoTracks().length > 0) {
            videoStream = new MediaStream(mediaStream.getVideoTracks());
          }
          
          // Combine with audio service output
          if (mixStream && mediaStream.getAudioTracks().length > 0) {
            // Add microphone audio if needed (already handled by AudioService)
            console.log('Audio sources configured:', {
              djMix: !!mixStream,
              microphone: mediaStream.getAudioTracks().length,
              video: !!videoStream
            });
          }
        } catch (mediaError) {
          console.warn('Media access limited, using audio-only stream:', mediaError);
        }
        
        // Start streaming with encoded audio
        if (mixStream) {
          await mediaServerService.startStream(mixStream, videoStream);
          
          // Configure encoding status monitoring
          const encodingStatus = audioService.getEncodingStatus();
          console.log('Audio encoding status:', encodingStatus);
          
          // Connect to signaling for live statistics
          webSocketService.goLive({ 
            quality: videoStream ? 'HD' : 'Audio-Only',
            bitrate: audioConfig.bitRate + (videoStream ? 2500000 : 0)
          });
          
          setState(prev => ({ ...prev, isStreaming: true }));
          console.log('Live stream started with audio encoding');
        } else {
          throw new Error('Failed to create audio stream');
        }
      } else {
        // Stop streaming and encoding
        console.log('Stopping live stream...');
        await webSocketService.goOffline();
        await mediaServerService.stopStream();
        audioService.stopStreaming(); // Stop audio encoding
        
        setState(prev => ({ ...prev, isStreaming: false }));
        console.log('Live stream stopped');
      }
    } catch (error) {
      console.error('Failed to toggle streaming:', error);
      // Reset state on error
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  };

  const toggleSocialPlatform = async (platformId: string) => {
    try {
      const platform = state.socialPlatforms.find(p => p.id === platformId);
      if (platform) {
        if (platform.isActive) {
          await mediaServerService.disconnectSocialPlatform(platformId);
        } else {
          await mediaServerService.connectSocialPlatform(platformId);
        }
        
        // Refresh platforms list
        const platforms = await mediaServerService.getSocialPlatforms();
        setState(prev => ({ ...prev, socialPlatforms: platforms }));
      }
    } catch (error) {
      console.error('Failed to toggle social platform:', error);
    }
  };

  // Audio Control Handlers

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <>
      {/* Backend Status Indicator */}
      <Suspense fallback={<div>Loading...</div>}>
        <BackendStatusIndicator />
      </Suspense>
      
      <Container fluid className="dj-interface">
      <Row className="h-100">
        {/* Main Mixing Area */}
        <Col lg={8} md={7} className="main-area">
          <Paper 
            elevation={3} 
            sx={{ 
              height: '100%', 
              p: 2, 
              backgroundColor: '#1a1a1a',
              borderRadius: '12px'
            }}
          >
            <Suspense fallback={<div style={{color: '#fff', padding: '20px'}}>Loading Mixer...</div>}>
              <Mixer deckA={deckA} deckB={deckB} />
            </Suspense>
          </Paper>
        </Col>

        {/* Side Panel */}
        <Col lg={4} md={5} className="side-panel">
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Live Video Preview */}
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2, 
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                Live Video Preview
              </Typography>
              <Suspense fallback={<div style={{color: '#fff'}}>Loading Video...</div>}>
                <VideoPlayer />
              </Suspense>
            </Paper>

            {/* Stream Status */}
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2, 
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                Stream Status
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#cccccc', mb: 1 }}>
                  Listeners: {state.listenerStats?.current || 0} • Peak: {state.listenerStats?.peak || 0}
                </Typography>
                <Typography variant="body2" sx={{ color: '#cccccc', mb: 1 }}>
                  Quality: {state.streamStats?.bitrate || 320}kbps • Latency: {state.streamStats?.latency || 0}s
                </Typography>
                <Typography variant="body2" sx={{ color: '#cccccc', mb: 1 }}>
                  Uptime: {state.streamStats ? formatUptime(state.streamStats.uptime) : '0h 0m'}
                </Typography>
                
                {/* Audio Encoding Status */}
                {state.isStreaming && (
                  <Box sx={{ mt: 1, p: 1, backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
                    <Typography variant="caption" sx={{ color: '#ffeb3b', fontWeight: 'bold', display: 'block' }}>
                      Audio Encoding Active
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#cccccc' }}>
                      Codec: Opus 48kHz • Bitrate: 128kbps • Stereo
                    </Typography>
                  </Box>
                )}
              </Box>

              {state.streamStats && state.streamStats.cpuUsage > 80 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  High CPU usage: {state.streamStats.cpuUsage}%
                </Alert>
              )}

              {/* Live Control Buttons */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {!state.isStreaming && (
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGoLive}
                    sx={{
                      bgcolor: '#4caf50',
                      '&:hover': { 
                        bgcolor: '#388e3c' 
                      },
                      fontWeight: 'bold',
                      flex: 1
                    }}
                  >
                    ▶️ Go Live
                  </Button>
                )}
                
                {state.isStreaming && (
                  <>
                    <Button
                      variant="contained"
                      size="large"
                      disabled
                      sx={{
                        bgcolor: '#4caf50',
                        color: '#ffffff',
                        fontWeight: 'bold',
                        flex: 1,
                        '&:disabled': {
                          bgcolor: '#4caf50',
                          color: '#ffffff'
                        }
                      }}
                    >
                      🔴 LIVE
                    </Button>
                    
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleGoLive}
                      sx={{
                        bgcolor: '#ff4444',
                        '&:hover': { 
                          bgcolor: '#cc3333' 
                        },
                        fontWeight: 'bold',
                        flex: 1
                      }}
                    >
                      ⏹️ End Live
                    </Button>
                  </>
                )}
                
                {/* Debug/Diagnostics Button */}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  sx={{
                    borderColor: '#666666',
                    color: '#cccccc',
                    '&:hover': { 
                      borderColor: '#888888',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    minWidth: 'auto',
                    px: 2
                  }}
                >
                  🔧 Debug
                </Button>
              </Box>
            </Paper>

            {/* Social Media Streaming */}
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2, 
                backgroundColor: '#2a2a2a',
                borderRadius: '8px'
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ color: '#ffffff' }}>
                Social Streaming
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {state.socialPlatforms.map((platform) => (
                  <Box
                    key={platform.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: '6px',
                      backgroundColor: platform.isActive ? '#1e3a2e' : '#333333',
                      border: platform.isActive ? '1px solid #4caf50' : '1px solid #555555',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSocialPlatform(platform.id)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {platform.name === 'youtube' && <YouTubeIcon sx={{ color: '#ff0000', mr: 1 }} />}
                      {platform.name === 'twitch' && <TwitchIcon sx={{ color: '#9146ff', mr: 1 }} />}
                      {platform.name === 'facebook' && <FacebookIcon sx={{ color: '#1877f2', mr: 1 }} />}
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>
                        {platform.name}
                      </Typography>
                    </Box>
                    <Chip
                      label={platform.isActive ? 'Connected' : 'Offline'}
                      size="small"
                      sx={{
                        bgcolor: platform.isActive ? '#4caf50' : '#757575',
                        color: '#ffffff'
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Paper>

          </Box>
        </Col>
      </Row>


      
      {/* Music Library and Playlist Panel */}
      <Row className="mt-3">
        {/* Music Playlist - Left Side */}
        <Col lg={6} md={6} xs={12}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: '400px', 
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#ffffff', 
                p: 2, 
                borderBottom: '1px solid #333',
                backgroundColor: '#2a2a2a'
              }}
            >
              📻 Current Playlist
            </Typography>
            <Suspense fallback={<div style={{color: '#fff', padding: '20px'}}>Loading Playlist...</div>}>
              <MusicPlaylist
                onLoadToDeck={loadToDeck}
                currentDeckA={deckA}
                currentDeckB={deckB}
              />
            </Suspense>
          </Paper>
        </Col>

        {/* Music Library with Instant Play - Right Side */}
        <Col lg={6} md={6} xs={12}>
          <Paper 
            elevation={3} 
            sx={{ 
              height: '450px', 
              backgroundColor: '#1a1a1a',
              borderRadius: '12px',
              overflow: 'hidden'
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: '#ffffff', 
                p: 2, 
                borderBottom: '1px solid #333',
                backgroundColor: '#2a2a2a'
              }}
            >
              {deckA ? `🎵 Now Playing: ${deckA.title}` : '🎵 Instant Play'}
            </Typography>
            <Suspense fallback={<div style={{color: '#fff', padding: '20px'}}>Loading Music Library...</div>}>
              <MusicLibrary
                onLoadDeck={handleLoadToDeck}
                currentDeckA={deckA?.id}
                currentDeckB={deckB?.id}
                loadingDeck={null}
                showCompatibility={true}
                compatibilityBpm={deckA?.bpm || deckB?.bpm}
              />
            </Suspense>
          </Paper>
        </Col>
      </Row>

      {/* Track Channel Diagnostics Panel */}
      {showDiagnostics && (
        <Row className="mt-3">
          <Col xs={12}>
            <Suspense fallback={<div style={{color: '#fff', padding: '20px'}}>Loading Diagnostics...</div>}>
              <TrackChannelDiagnostics />
            </Suspense>
          </Col>
        </Row>
      )}
    </Container>
    </>
  );
};

export default DJInterface;