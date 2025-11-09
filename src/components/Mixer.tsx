import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Chip } from '@mui/material';
import { Container, Row, Col } from 'react-bootstrap';
import { useAudioActivity } from '../contexts/AudioActivityContext';

import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import Knob from './Knob';
import Fader from './Fader';
import MixerChannel from './MixerChannel';
import VUPeakMeter from './VUPeakMeter';
import { audioService } from '../services/AudioService';
import type { Track } from './MusicPlaylist';

interface ChannelState {
  isPlaying: boolean;
  isLooping: boolean;
  isCueEnabled: boolean;
  volume: number;
  eqHigh: number;
  eqMid: number;
  eqLow: number;
  gain: number;
  position: number;
  duration: number;
  loadedFile: string | null;
}

interface MixerProps {
  deckA?: Track | null;
  deckB?: Track | null;
}

const Mixer: React.FC<MixerProps> = ({ deckA = null, deckB = null }) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [crossfader, setCrossfader] = useState(0); // 0 = center, -100 = full A, +100 = full B
  const [masterBass, setMasterBass] = useState(50);
  const [masterMid, setMasterMid] = useState(50);
  const [masterTreble, setMasterTreble] = useState(50);
  const [micGain, setMicGain] = useState(70);
  const [masterVolume, setMasterVolume] = useState(80);
  const [talkoverActive, setTalkoverActive] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(80);

  // Audio activity context for cross-component communication
  const { updateChannelA, updateChannelB, updateMicrophone } = useAudioActivity();

  // Track channel playing states
  const [channelAState, setChannelAState] = useState<ChannelState | null>(null);
  const [channelBState, setChannelBState] = useState<ChannelState | null>(null);
  
  // Master audio levels for VU meter
  const [masterLevels, setMasterLevels] = useState({ left: 0, right: 0 });

  // Initialize audio service on component mount
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await audioService.initialize();
        // Initialize crossfader to center position
        audioService.setCrossfader(0); // 0 = center position
        console.log('✅ AudioService initialized for mixer with crossfader at center');
      } catch (error) {
        console.error('❌ Failed to initialize audio service:', error);
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
          // Get real master levels from AudioService
          const masterLevels = audioService.getMasterLevels();
          let leftLevel = masterLevels.left;
          let rightLevel = masterLevels.right;
          
          // If no master audio, check individual channels
          if (leftLevel < 5 && rightLevel < 5) {
            const channelALevels = audioService.getChannelLevels('channelA');
            const channelBLevels = audioService.getChannelLevels('channelB');
            leftLevel = Math.max(channelALevels.left, channelBLevels.left);
            rightLevel = Math.max(channelALevels.right, channelBLevels.right);
          }
          
          // Add microphone level if enabled
          if (micEnabled) {
            const micLevel = audioService.getAudioLevelPercentage('microphone');
            leftLevel = Math.max(leftLevel, micLevel);
            rightLevel = Math.max(rightLevel, micLevel);
          }
          
          setMasterLevels({ 
            left: Math.min(100, leftLevel), 
            right: Math.min(100, rightLevel) 
          });
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

  // Initialize microphone state from AudioService
  React.useEffect(() => {
    const initializeMicState = async () => {
      try {
        const { audioService } = await import('../services/AudioService');
        const isEnabled = audioService.isMicrophoneEnabled();
        const currentGain = audioService.getMicrophoneGain();
        
        if (isEnabled) {
          setMicEnabled(true);
          updateMicrophone(true);
        }
        setMicGain(currentGain);
        
        console.log(`🎤 Initialized mic state - Enabled: ${isEnabled}, Gain: ${currentGain}%`);
      } catch (error) {
        console.warn('Could not initialize microphone state:', error);
      }
    };

    initializeMicState();
  }, [updateMicrophone]);

  // Real-time VU meter updates are now handled directly in the VUPeakMeter component

  const handleMicToggle = async () => {
    const newMicEnabled = !micEnabled;
    
    try {
      const success = await audioService.toggleMicrophone(newMicEnabled);
      if (success) {
        setMicEnabled(newMicEnabled);
        updateMicrophone(newMicEnabled); // Update global audio activity
        
        if (newMicEnabled) {
          // Auto-enable talkover when microphone is turned on
          if (!talkoverActive) {
            console.log('🎤 Microphone enabled - Auto-activating talkover');
            setOriginalVolume(masterVolume); // Store current volume
            const duckedVolume = Math.round(masterVolume * 0.25);
            setMasterVolume(duckedVolume);
            handleMasterVolumeChange(duckedVolume);
            setTalkoverActive(true);
            console.log(`🎤 Talkover AUTO-ON - Volume ducked to ${duckedVolume}%`);
          }
          console.log(`🎤 Microphone enabled successfully`);
        } else {
          // Disable talkover when microphone is turned off
          if (talkoverActive) {
            setMasterVolume(originalVolume);
            handleMasterVolumeChange(originalVolume);
            setTalkoverActive(false);
            console.log(`🎤 Microphone disabled - Talkover OFF, Volume restored to ${originalVolume}%`);
          }
          console.log(`🎤 Microphone disabled successfully`);
        }
      } else {
        console.warn(`⚠️ Failed to ${newMicEnabled ? 'enable' : 'disable'} microphone - Check device permissions or availability`);
        // Show user-friendly error message
        if (newMicEnabled) {
          alert('Failed to access microphone. Please check that:\n1. Microphone permissions are granted\n2. Microphone device is available\n3. No other application is using the microphone');
        }
      }
    } catch (error) {
      console.error('❌ Error toggling microphone:', error);
      
      // Handle specific microphone permission errors
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone permissions in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          alert('No microphone device found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          alert('Microphone is already in use by another application. Please close other apps using the microphone and try again.');
        } else {
          alert(`Microphone error: ${error.message}`);
        }
      }
    }
  };

  const handleStreamToggle = () => {
    setIsStreaming(!isStreaming);
    console.log(`Streaming ${!isStreaming ? 'started' : 'stopped'}`);
  };

  const handleTalkoverToggle = () => {
    if (!micEnabled) {
      console.warn('⚠️ Cannot toggle talkover - microphone is not enabled');
      return; // Only allow talkover when mic is on
    }
    
    const newTalkoverState = !talkoverActive;
    setTalkoverActive(newTalkoverState);
    
    if (newTalkoverState) {
      // Store current volume before ducking (if not already stored)
      if (originalVolume === 0) {
        setOriginalVolume(masterVolume);
      }
      const duckedVolume = Math.round(masterVolume * 0.25);
      setMasterVolume(duckedVolume);
      handleMasterVolumeChange(duckedVolume);
      console.log(`🎤 Talkover MANUAL ON - Volume ducked to ${duckedVolume}%`);
    } else {
      // Restore original volume
      const restoreVolume = originalVolume || 75; // Default fallback volume
      setMasterVolume(restoreVolume);
      handleMasterVolumeChange(restoreVolume);
      console.log(`🎤 Talkover MANUAL OFF - Volume restored to ${restoreVolume}%`);
    }
  };

  // Handle microphone gain changes
  const handleMicGainChange = async (newGain: number) => {
    setMicGain(newGain);
    
    try {
      const { audioService } = await import('../services/AudioService');
      audioService.setMicrophoneGain(newGain);
      console.log(`🎤 Microphone gain set to ${newGain}%`);
    } catch (error) {
      console.error('❌ Error setting microphone gain:', error);
    }
  };

  // Handle master volume changes
  const handleMasterVolumeChange = async (newVolume: number) => {
    setMasterVolume(newVolume);
    
    try {
      await audioService.setMasterVolume(newVolume);
      console.log(`🔊 Master volume set to ${newVolume}%`);
    } catch (error) {
      console.error('❌ Error setting master volume:', error);
    }
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
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ color: '#ffffff' }}>
                  Microphone: {micEnabled ? 'ON' : 'OFF'}
                </Typography>
                {micEnabled && talkoverActive && (
                  <Typography variant="caption" sx={{ color: '#ffeb3b', fontSize: '0.7rem' }}>
                    Auto-Talkover Active
                  </Typography>
                )}
              </Box>
              {micEnabled && (
                <Box sx={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#ffffff' }}>Mic Gain: {micGain}%</Typography>
                  <Fader
                    orientation="horizontal"
                    value={micGain}
                    onChange={handleMicGainChange}
                    min={0}
                    max={100}
                    label=""
                    width={80}
                    height={25}
                    color="orange"
                  />
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant={talkoverActive ? 'contained' : 'outlined'}
                size="small"
                onClick={handleTalkoverToggle}
                disabled={!micEnabled}
                sx={{
                  color: talkoverActive ? '#ffffff' : '#ff9800',
                  backgroundColor: talkoverActive ? '#ff9800' : 'transparent',
                  borderColor: '#ff9800',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  padding: '6px 12px',
                  minWidth: '90px',
                  '&:hover': {
                    borderColor: '#ff9800',
                    backgroundColor: talkoverActive ? '#ff9800dd' : '#ff980020'
                  },
                  '&:disabled': {
                    borderColor: '#666666',
                    color: '#666666'
                  }
                }}
                title={!micEnabled ? 'Enable microphone first' : (talkoverActive ? 'Click to disable talkover' : 'Click to enable talkover')}
              >
                TALKOVER {talkoverActive ? 'ON' : 'OFF'}
              </Button>
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

      {/* Radio Control Layout - All in One Row with Equal Heights */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        alignItems: { xs: 'stretch', md: 'stretch' },
        height: { xs: 'auto', md: '800px' }, // Fixed height for equal sizing
        width: '100%'
      }}>
        
        {/* Channel A - Left Deck */}
        <Box sx={{ 
          flex: { xs: '0 0 auto', md: '1 1 0' },
          minHeight: { xs: '600px', md: '100%' },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <MixerChannel 
            channelId="A" 
            label="Channel A"
            track={deckA}
            onLoad={handleChannelALoad}
            onStateChange={handleChannelAChange}
          />
        </Box>

        {/* Master Controls - Center */}
        <Box sx={{ 
          flex: { xs: '0 0 auto', md: '0 0 320px' },
          minHeight: { xs: '600px', md: '100%' },
          display: 'flex', 
          flexDirection: 'column',
          p: 3,
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          boxShadow: '0 6px 25px rgba(255, 235, 59, 0.2), 0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          border: '2px solid #ffeb3b',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(145deg, rgba(255, 235, 59, 0.05) 0%, rgba(255, 235, 59, 0.02) 50%, rgba(255, 235, 59, 0.05) 100%)',
            borderRadius: '10px',
            pointerEvents: 'none'
          }
        }}>
          
          <Typography variant="h5" gutterBottom sx={{ 
            fontWeight: 'bold', 
            color: '#ffffff',
            textAlign: 'center',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            zIndex: 1
          }}>
            Master Control
          </Typography>

          {/* Master VU Peak Meter */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <VUPeakMeter
              leftLevel={masterLevels.left}
              rightLevel={masterLevels.right}
              width={260}
              height={50}
              orientation="horizontal"
              showPeakHold={true}
              showLabels={true}
              label="VU Peak Meter"
            />
          </Box>

          {/* Crossfader */}
          <Box sx={{ 
            width: '100%', 
            px: 1, 
            mb: 3,
            position: 'relative',
            zIndex: 1
          }}>
            <Typography 
              gutterBottom 
              align="center" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#ffffff',
                fontSize: '0.9rem'
              }}
            >
              Crossfader: {crossfader > 0 ? `B ${crossfader}%` : 
                crossfader < 0 ? `A ${Math.abs(crossfader)}%` : 'Center'}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              height: 60,
              width: '100%'
            }}>
              <Box sx={{
                width: 200,
                height: 45,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 50%, #2a2a2a 100%)',
                borderRadius: '25px',
                border: '2px solid #444',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.5)',
                cursor: 'pointer'
              }}>
                {/* Track groove */}
                <Box sx={{
                  width: '90%',
                  height: '6px',
                  background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                  borderRadius: '3px',
                  border: '1px solid #333',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9)',
                  position: 'relative'
                }}>
                  {/* Center notch */}
                  <Box sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '-1px',
                    width: '2px',
                    height: '8px',
                    background: '#ffeb3b',
                    transform: 'translateX(-50%)',
                    borderRadius: '1px'
                  }} />
                  
                  {/* Crossfader handle */}
                  <Box sx={{
                    position: 'absolute',
                    left: `${((crossfader + 100) / 200) * 100}%`,
                    top: '50%',
                    width: '20px',
                    height: '28px',
                    background: `
                      linear-gradient(45deg, #888 0%, #bbb 20%, #ddd 50%, #bbb 80%, #888 100%),
                      radial-gradient(circle at 30% 30%, #ccc, #666)
                    `,
                    border: '2px solid #999',
                    borderRadius: '6px',
                    transform: 'translate(-50%, -50%)',
                    cursor: 'grab',
                    boxShadow: `
                      0 2px 6px rgba(0,0,0,0.6),
                      inset 0 1px 2px rgba(255,255,255,0.4),
                      inset 0 -1px 2px rgba(0,0,0,0.6)
                    `,
                    '&:active': {
                      cursor: 'grabbing',
                      transform: 'translate(-50%, -50%) scale(0.98)'
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '3px',
                      left: '3px',
                      right: '3px',
                      bottom: '3px',
                      background: 'linear-gradient(135deg, #ddd 0%, #888 50%, #666 100%)',
                      borderRadius: '2px'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '2px',
                      height: '14px',
                      background: '#ffeb3b',
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '1px'
                    }
                  }}
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (!rect) return;
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      const x = moveEvent.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, (x - 20) / (rect.width - 40)));
                      const newValue = (percentage * 200) - 100;
                      setCrossfader(Math.round(newValue));
                      audioService.setCrossfader(Math.round(newValue));
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  />
                </Box>
                
                {/* A and B labels */}
                <Box sx={{
                  position: 'absolute',
                  left: '8px',
                  color: '#ffeb3b',
                  fontWeight: 'bold',
                  fontSize: '10px'
                }}>A</Box>
                <Box sx={{
                  position: 'absolute',
                  right: '8px',
                  color: '#ffeb3b',
                  fontWeight: 'bold',
                  fontSize: '10px'
                }}>B</Box>
              </Box>
            </Box>
          </Box>

          {/* Master EQ */}
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 'bold', 
            color: '#ffffff', 
            textAlign: 'center',
            fontSize: '1.1rem',
            position: 'relative',
            zIndex: 1
          }}>
            Master EQ
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-around', 
            width: '100%', 
            mb: 3,
            position: 'relative',
            zIndex: 1
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Knob 
                label="Bass" 
                value={masterBass}
                onChange={setMasterBass}
                color="red"
                size={50}
              />
              <Typography variant="caption" sx={{ color: '#ffffff' }}>{masterBass}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Knob 
                label="Mid" 
                value={masterMid}
                onChange={setMasterMid}
                color="orange"
                size={50}
              />
              <Typography variant="caption" sx={{ color: '#ffffff' }}>{masterMid}</Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Knob 
                label="Treble" 
                value={masterTreble}
                onChange={setMasterTreble}
                color="blue"
                size={50}
              />
              <Typography variant="caption" sx={{ color: '#ffffff' }}>{masterTreble}</Typography>
            </Box>
          </Box>

          {/* Master Volume */}
          <Box sx={{ 
            width: '100%', 
            px: 1, 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1
          }}>
            <Typography 
              gutterBottom 
              align="center" 
              sx={{ 
                fontWeight: 'bold', 
                color: '#ffffff',
                fontSize: '1rem'
              }}
            >
              Master Volume: {masterVolume}%
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              flexGrow: 1,
              alignItems: 'center',
              minHeight: 120
            }}>
              <Fader
                orientation="vertical"
                value={masterVolume}
                onChange={(value) => handleMasterVolumeChange(value)}
                min={0}
                max={100}
                label="MASTER"
                width={35}
                height={100}
                color="yellow"
              />
            </Box>
            
            {/* Volume Level Indicator */}
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#ffeb3b',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                {masterVolume}%
              </Typography>
            </Box>
          </Box>

        </Box>

        {/* Channel B - Right Deck */}
        <Box sx={{ 
          flex: { xs: '0 0 auto', md: '1 1 0' },
          minHeight: { xs: '600px', md: '100%' },
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <MixerChannel 
            channelId="B" 
            label="Channel B"
            track={deckB}
            onLoad={handleChannelBLoad}
            onStateChange={handleChannelBChange}
          />
        </Box>

      </Box>
    </Container>
  );
}

export default Mixer;