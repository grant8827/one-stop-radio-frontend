import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography,
  IconButton,
  Button,
  Slider,
  Paper
} from '@mui/material';

// Icons for transport controls
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import HeadsetIcon from '@mui/icons-material/Headset';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';

// Import missing components
import Waveform from './Waveform';
import JogWheel from './JogWheel';
import MusicPlaylist from './MusicPlaylist';

// Import our services
import { usePlaylist } from '../contexts/PlaylistContext';
// import { webSocketService } from '../services/WebSocketService'; // TODO: Re-enable when signaling server is ready
import { mediaServerService } from '../services/MediaServerService';
import { audioService } from '../services/AudioService';
import type { ListenerStats, StreamStatus } from '../services/WebSocketService';
import type { SocialPlatform, StreamStats } from '../services/MediaServerService';

interface DJInterfaceState {
  isStreaming: boolean;
  listenerStats: ListenerStats | null;
  streamStats: StreamStats | null;
  socialPlatforms: SocialPlatform[];
  streamStatus: StreamStatus | null;
}

const DJInterface: React.FC = () => {
  const { deckA, deckB, loadToDeck } = usePlaylist();
  
  const [state, setState] = useState<DJInterfaceState>({
    isStreaming: false,
    listenerStats: null,
    streamStats: null,
    socialPlatforms: [],
    streamStatus: null
  });

  // Audio Controls State
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(70);

  // Initialize services and set up event listeners
  useEffect(() => {
    const initializeServices = async () => {
      try {
        // TODO: Initialize WebSocket connection when signaling server is ready
        // await webSocketService.connect('station-1', 'temp-token');
        
        // TODO: Set up listener stats updates when WebSocket is available
        // webSocketService.onListenerStats((stats) => {
        //   setState(prev => ({ ...prev, listenerStats: stats }));
        // });

        // TODO: Set up stream status updates when WebSocket is available
        // webSocketService.onStreamStatus((status) => {
        //   setState(prev => ({ ...prev, streamStatus: status }));
        // });

        // Initialize media server connection
        await mediaServerService.connect();
        
        // Set up stream stats updates
        mediaServerService.onStreamStats((stats) => {
          setState(prev => ({ ...prev, streamStats: stats }));
        });

        // Initialize social platforms
        const platforms = await mediaServerService.getSocialPlatforms();
        setState(prev => ({ ...prev, socialPlatforms: platforms }));

      } catch (error) {
        console.error('Failed to initialize services:', error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      // TODO: Disconnect WebSocket when available
      // webSocketService.disconnect();
      mediaServerService.disconnect();
    };
  }, []);

  const handleGoLive = async () => {
    try {
      setState(prev => ({ ...prev, isStreaming: true }));
      
      // Start audio streaming
      const audioStream = audioService.startStreaming({
        sampleRate: 48000,
        bitRate: 128000,
        channels: 2
      });
      
      if (audioStream) {
        // Start streaming to media server
        await mediaServerService.startStream(audioStream);
        
        // TODO: Notify via WebSocket when signaling server is available
        // webSocketService.goLive({
        //   quality: 'high',
        //   bitrate: 128000
        // });

        console.log('🔴 LIVE! Broadcasting started');
      } else {
        throw new Error('Failed to create audio stream');
      }
    } catch (error) {
      console.error('Failed to go live:', error);
      setState(prev => ({ ...prev, isStreaming: false }));
    }
  };

  const handleGoOffline = async () => {
    try {
      setState(prev => ({ ...prev, isStreaming: false }));
      
      // Stop streaming
      await mediaServerService.stopStream();
      audioService.stopStreaming();
      
      // TODO: Notify via WebSocket when signaling server is available
      // webSocketService.goOffline();

      console.log('⏹️ Stopped broadcasting');
    } catch (error) {
      console.error('Failed to stop streaming:', error);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      p: 2
    }}>
      {/* Top Header Bar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        px: 2
      }}>
        <Typography variant="h5" sx={{ 
          color: '#00d4ff', 
          fontWeight: 'bold',
          fontFamily: 'monospace'
        }}>
          REACTDECK
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography variant="h3" sx={{ 
            color: '#00ff00', 
            fontFamily: 'monospace',
            fontWeight: 'bold'
          }}>
            128.00 BPM
          </Typography>
          
          <Button
            variant={state.isStreaming ? 'contained' : 'outlined'}
            color={state.isStreaming ? 'error' : 'success'}
            onClick={state.isStreaming ? handleGoOffline : handleGoLive}
            sx={{ 
              minWidth: '120px',
              fontWeight: 'bold'
            }}
          >
            {state.isStreaming ? 'STOP LIVE' : 'GO LIVE'}
          </Button>
        </Box>
      </Box>

      {/* Main DJ Interface */}
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 100px)' }}>
        
        {/* Left Deck A */}
        <Paper sx={{ 
          flex: '0 0 400px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ color: '#00d4ff', mb: 2, textAlign: 'center' }}>
            DECK A
          </Typography>
          
          {/* Waveform Display */}
          <Box sx={{ 
            height: '120px', 
            backgroundColor: '#000', 
            border: '1px solid #444',
            borderRadius: '4px',
            mb: 2,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Waveform 
              height={120}
              progress={25}
              isPlaying={false}
              trackLoaded={true}
              songTitle="Deck A - Track"
            />
          </Box>
          
          {/* Transport Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
            <IconButton sx={{ color: '#00d4ff' }}>
              <SkipPreviousIcon />
            </IconButton>
            <IconButton sx={{ color: '#00d4ff' }}>
              <PlayArrowIcon />
            </IconButton>
            <IconButton sx={{ color: '#00d4ff' }}>
              <PauseIcon />
            </IconButton>
            <IconButton sx={{ color: '#00d4ff' }}>
              <StopIcon />
            </IconButton>
            <IconButton sx={{ color: '#00d4ff' }}>
              <SkipNextIcon />
            </IconButton>
          </Box>
          
          {/* Jog Wheel */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <JogWheel 
              size={180}
              channelName="A"
              isPlaying={false}
              bpm={128}
            />
          </Box>
          
          {/* EQ and Gain Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>HIGH</Typography>
              <Slider
                orientation="vertical"
                defaultValue={50}
                sx={{ height: 80, color: '#00d4ff' }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>MID</Typography>
              <Slider
                orientation="vertical"
                defaultValue={50}
                sx={{ height: 80, color: '#00d4ff' }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>LOW</Typography>
              <Slider
                orientation="vertical"
                defaultValue={50}
                sx={{ height: 80, color: '#00d4ff' }}
              />
            </Box>
          </Box>
          
        </Paper>

        {/* Center Mixer */}
        <Paper sx={{ 
          flex: '0 0 300px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            MASTER MIXER
          </Typography>
          
          {/* Crossfader */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              CROSSFADER
            </Typography>
            <Slider
              defaultValue={50}
              sx={{ 
                width: 200, 
                color: '#ff6b35',
                '& .MuiSlider-thumb': {
                  width: 20,
                  height: 20
                }
              }}
            />
          </Box>
          
          {/* Master Volume */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography variant="caption" sx={{ color: '#888', mb: 1, display: 'block' }}>
              MASTER
            </Typography>
            <Slider
              orientation="vertical"
              defaultValue={75}
              sx={{ 
                height: 150, 
                color: '#00ff00',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16
                }
              }}
            />
            <Typography variant="caption" sx={{ color: '#00ff00', mt: 1, display: 'block' }}>
              75%
            </Typography>
          </Box>
          
          {/* Cue/Monitor */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Button 
              variant="outlined"
              startIcon={<HeadsetIcon />}
              sx={{ 
                color: '#ffffff',
                borderColor: '#555',
                mb: 1
              }}
            >
              CUE
            </Button>
          </Box>
          
          {/* Microphone */}
          <Box sx={{ textAlign: 'center' }}>
            <Button 
              variant={micActive ? 'contained' : 'outlined'}
              startIcon={<RecordVoiceOverIcon />}
              onClick={() => setMicActive(!micActive)}
              sx={{ 
                color: micActive ? '#ffffff' : '#ff4444',
                backgroundColor: micActive ? '#ff4444' : 'transparent',
                borderColor: '#ff4444',
                mb: 1
              }}
            >
              {micActive ? 'MIC ON' : 'MIC OFF'}
            </Button>
            
            <Slider
              orientation="vertical"
              value={micLevel}
              onChange={(_, value) => setMicLevel(value as number)}
              sx={{ 
                height: 80, 
                color: micActive ? '#00ff00' : '#666',
                mt: 1
              }}
              disabled={!micActive}
            />
          </Box>
        </Paper>

        {/* Right Deck B */}
        <Paper sx={{ 
          flex: '0 0 400px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          p: 2,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography variant="h6" sx={{ color: '#00ff00', mb: 2, textAlign: 'center' }}>
            DECK B
          </Typography>
          
          {/* Waveform Display */}
          <Box sx={{ 
            height: '120px', 
            backgroundColor: '#000', 
            border: '1px solid #444',
            borderRadius: '4px',
            mb: 2,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Waveform 
              height={120}
              progress={60}
              isPlaying={true}
              trackLoaded={true}
              songTitle="Deck B - Track"
            />
          </Box>
          
          {/* Transport Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
            <IconButton sx={{ color: '#00ff00' }}>
              <SkipPreviousIcon />
            </IconButton>
            <IconButton sx={{ color: '#00ff00' }}>
              <PlayArrowIcon />
            </IconButton>
            <IconButton sx={{ color: '#00ff00' }}>
              <PauseIcon />
            </IconButton>
            <IconButton sx={{ color: '#00ff00' }}>
              <StopIcon />
            </IconButton>
            <IconButton sx={{ color: '#00ff00' }}>
              <SkipNextIcon />
            </IconButton>
          </Box>
          
          {/* Jog Wheel */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <JogWheel 
              size={180}
              channelName="B"
              isPlaying={true}
              bpm={128}
            />
          </Box>
          
          {/* EQ and Gain Controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>HIGH</Typography>
              <Slider
                orientation="vertical"
                defaultValue={50}
                sx={{ height: 80, color: '#00ff00' }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>MID</Typography>
              <Slider
                orientation="vertical"
                defaultValue={50}
                sx={{ height: 80, color: '#00ff00' }}
              />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: '#888' }}>LOW</Typography>
              <Slider
                orientation="vertical"
                defaultValue={50}
                sx={{ height: 80, color: '#00ff00' }}
              />
            </Box>
          </Box>
          
        </Paper>

        {/* Right Sidebar - Library */}
        <Paper sx={{ 
          flex: '1',
          backgroundColor: '#1a1a1a',
          border: '1px solid #333',
          borderRadius: '8px',
          p: 2,
          minWidth: '300px'
        }}>
          <Typography variant="h6" sx={{ color: '#ffffff', mb: 2 }}>
            LIBRARY
          </Typography>
          
          <MusicPlaylist
            onLoadToDeck={loadToDeck}
            currentDeckA={deckA}
            currentDeckB={deckB}
          />
        </Paper>
        
      </Box>
    </Box>
  );
};

export default DJInterface;