import React, { useState, useEffect } from 'react';
import { Box, Typography, Slider, Button, IconButton, Chip } from '@mui/material';
import { Container, Row, Col } from 'react-bootstrap';
import { useAudioActivity } from '../contexts/AudioActivityContext';

import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import Knob from './Knob';
import AudioMeter from './AudioMeter';
import MixerChannel from './MixerChannel';
import { audioService } from '../services/AudioService';

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  file?: File;
}

interface ChannelState {
  isPlaying: boolean;
  isLooping: boolean;
  isCueEnabled: boolean;
  volume: number;
  eqHigh: number;
  eqMid: number;
  eqLow: number;
  gain: number;
  bpm: number;
  position: number;
  duration: number;
  loadedFile: string | null;
}

interface MixerProps {
  deckA?: MusicTrack | null;
  deckB?: MusicTrack | null;
}

const Mixer: React.FC<MixerProps> = ({ deckA = null, deckB = null }) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [crossfader, setCrossfader] = useState(0);
  const [masterBass, setMasterBass] = useState(50);
  const [masterMid, setMasterMid] = useState(50);
  const [masterTreble, setMasterTreble] = useState(50);
  const [micGain, setMicGain] = useState(70);
  const [masterLevels, setMasterLevels] = useState({ left: 0, right: 0 });

  // Audio activity context for cross-component communication
  const { updateChannelA, updateChannelB, updateMicrophone } = useAudioActivity();

  // Track channel playing states
  const [channelAState, setChannelAState] = useState<ChannelState | null>(null);
  const [channelBState, setChannelBState] = useState<ChannelState | null>(null);

  // Initialize audio service on component mount
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await audioService.initialize();
        console.log('✅ AudioService initialized for mixer');
      } catch (error) {
        console.error('❌ Failed to initialize AudioService:', error);
      }
    };
    
    initializeAudio();
  }, []);

  // Channel state handlers
  const handleChannelAChange = (state: ChannelState) => {
    setChannelAState(state);
    updateChannelA(state.isPlaying); // Update global audio activity
    console.log('Channel A State:', state);
  };

  const handleChannelBChange = (state: ChannelState) => {
    setChannelBState(state);
    updateChannelB(state.isPlaying); // Update global audio activity
    console.log('Channel B State:', state);
  };

  // Determine if any channel is playing for master meters
  const isAnyChannelPlaying = channelAState?.isPlaying || channelBState?.isPlaying;

  // Update master audio levels in real-time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAnyChannelPlaying || micEnabled) {
      interval = setInterval(() => {
        try {
          // Get master audio levels from AudioService
          let masterLevel = audioService.getAudioLevelPercentage();
          
          // If microphone is active, combine with mic level
          if (micEnabled) {
            const micLevel = audioService.getAudioLevelPercentage('microphone');
            masterLevel = Math.max(masterLevel, micLevel);
          }
          
          // Simulate stereo levels (in real implementation, would get separate L/R)
          const leftLevel = masterLevel;
          const rightLevel = masterLevel * (0.9 + Math.random() * 0.2); // Slight variation
          
          setMasterLevels({ left: leftLevel, right: rightLevel });
        } catch (error) {
          console.warn('Error getting master audio levels:', error);
          setMasterLevels({ left: 0, right: 0 });
        }
      }, 50); // Update every 50ms for smooth meter animation
    } else {
      setMasterLevels({ left: 0, right: 0 });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnyChannelPlaying, micEnabled]);

  const handleMicToggle = async () => {
    const newMicEnabled = !micEnabled;
    setMicEnabled(newMicEnabled);
    updateMicrophone(newMicEnabled); // Update global audio activity
    
    try {
      const success = await audioService.toggleMicrophone(newMicEnabled);
      if (success) {
        console.log(`🎤 Microphone ${newMicEnabled ? 'enabled' : 'disabled'} successfully`);
      } else {
        console.warn(`⚠️ Failed to ${newMicEnabled ? 'enable' : 'disable'} microphone`);
        setMicEnabled(!newMicEnabled); // Revert state on failure
      }
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      setMicEnabled(!newMicEnabled); // Revert state on error
    }
  };

  const handleStreamToggle = () => {
    setIsStreaming(!isStreaming);
    console.log(`Streaming ${!isStreaming ? 'started' : 'stopped'}`);
  };

  // Handle file loading for channels
  const handleChannelALoad = (file: File) => {
    console.log('Loading file to Channel A:', file.name);
    // The MixerChannel will handle the actual loading via AudioService
  };

  const handleChannelBLoad = (file: File) => {
    console.log('Loading file to Channel B:', file.name);
    // The MixerChannel will handle the actual loading via AudioService
  };

  return (
    <Container fluid>
      {/* Streaming Controls */}
      <Row className="mb-3">
        <Col>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            p: 2,
            bgcolor: '#2a2a2a',
            borderRadius: '8px',
            border: '1px solid #ffeb3b'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton 
                color={micEnabled ? 'warning' : 'default'}
                onClick={handleMicToggle}
                sx={{ 
                  bgcolor: micEnabled ? '#ffeb3b' : 'grey.300',
                  color: micEnabled ? 'black' : 'grey.600'
                }}
              >
                {micEnabled ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Microphone: {micEnabled ? 'ON' : 'OFF'}
              </Typography>
              {micEnabled && (
                <Box sx={{ minWidth: 120 }}>
                  <Typography variant="caption" sx={{ color: '#ffffff' }}>Mic Gain: {micGain}%</Typography>
                  <Slider 
                    value={micGain}
                    onChange={(_, value) => setMicGain(value as number)}
                    size="small"
                  />
                </Box>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip 
                label={isStreaming ? 'LIVE' : 'OFFLINE'}
                color={isStreaming ? 'error' : 'default'}
                variant={isStreaming ? 'filled' : 'outlined'}
              />
              <Button
                variant={isStreaming ? 'outlined' : 'contained'}
                color={isStreaming ? 'error' : 'success'}
                onClick={handleStreamToggle}
              >
                {isStreaming ? 'Stop Stream' : 'Go Live'}
              </Button>
            </Box>
          </Box>
        </Col>
      </Row>

      <Row className="align-items-start justify-content-center">
        {/* Channel A */}
        <Col xs={12} lg={4}>
          <MixerChannel 
            channelId="A" 
            label="Channel A"
            onLoad={handleChannelALoad}
            onStateChange={handleChannelAChange}
          />
        </Col>

        {/* Center Column - Master Controls */}
        <Col xs={12} lg={4} className="mt-3 mt-lg-0">
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            p: 3,
            border: '2px solid #ffeb3b',
            borderRadius: '8px',
            backgroundColor: '#2a2a2a'
          }}>
            
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: '#ffffff' }}>
              Master Section
            </Typography>

            {/* Master Audio Meters */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
              <AudioMeter 
                label="L" 
                isPlaying={isAnyChannelPlaying || micEnabled} 
                level={masterLevels.left}
              />
              <AudioMeter 
                label="R" 
                isPlaying={isAnyChannelPlaying || micEnabled} 
                level={masterLevels.right}
              />
            </Box>

            {/* Crossfader */}
            <Box sx={{ width: '100%', px: 2, my: 3 }}>
              <Typography gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
                Crossfader: {crossfader > 0 ? `B ${crossfader}%` : crossfader < 0 ? `A ${Math.abs(crossfader)}%` : 'Center'}
              </Typography>
              <Slider 
                value={crossfader}
                onChange={(_, value) => {
                  const newValue = value as number;
                  setCrossfader(newValue);
                  audioService.setCrossfader(newValue);
                }}
                min={-100} 
                max={100} 
                aria-label="Crossfader"
                sx={{ 
                  height: 8,
                  color: '#ffeb3b',
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#ffeb3b'
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#ffeb3b'
                  },
                  '& .MuiSlider-markLabel': {
                    color: '#ffffff'
                  }
                }}
                marks={[
                  { value: -100, label: 'A' },
                  { value: 0, label: 'Center' },
                  { value: 100, label: 'B' }
                ]}
              />
            </Box>

            {/* Master EQ */}
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#ffffff' }}>
              Master EQ
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', width: '100%', mb: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Knob 
                  label="Bass" 
                  value={masterBass}
                  onChange={setMasterBass}
                />
                <Typography variant="caption">{masterBass}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Knob 
                  label="Mid" 
                  value={masterMid}
                  onChange={setMasterMid}
                />
                <Typography variant="caption">{masterMid}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Knob 
                  label="Treble" 
                  value={masterTreble}
                  onChange={setMasterTreble}
                />
                <Typography variant="caption">{masterTreble}</Typography>
              </Box>
            </Box>

            {/* Master Volume */}
            <Box sx={{ width: '100%', px: 2 }}>
              <Typography gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
                Master Volume
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                height: 120,
                alignItems: 'center'
              }}>
                <Slider 
                  orientation="vertical"
                  defaultValue={80}
                  aria-label="Master Volume"
                  sx={{ 
                    height: 100,
                    color: '#ffeb3b',
                    '& .MuiSlider-thumb': {
                      backgroundColor: '#ffeb3b'
                    },
                    '& .MuiSlider-track': {
                      backgroundColor: '#ffeb3b'
                    }
                  }}
                />
              </Box>
            </Box>

          </Box>
        </Col>

        {/* Channel B */}
        <Col xs={12} lg={4} className="mt-3 mt-lg-0">
          <MixerChannel 
            channelId="B" 
            label="Channel B"
            onLoad={handleChannelBLoad}
            onStateChange={handleChannelBChange}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default Mixer;