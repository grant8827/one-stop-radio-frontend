import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Chip } from '@mui/material';
import { Container, Row, Col } from 'react-bootstrap';
import { useAudioActivity } from '../contexts/AudioActivityContext';

import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import Knob from './Knob';
import Fader from './Fader';
import MixerChannel from './MixerChannel';
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
  bpm: number;
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
  const [crossfader, setCrossfader] = useState(50);
  const [masterBass, setMasterBass] = useState(50);
  const [masterMid, setMasterMid] = useState(50);
  const [masterTreble, setMasterTreble] = useState(50);
  const [micGain, setMicGain] = useState(70);
  const [masterLevels, setMasterLevels] = useState({ left: 0, right: 0 });
  const [masterVolume, setMasterVolume] = useState(80);
  const [animationTick, setAnimationTick] = useState(0); // Force re-renders for smooth animation
  const [talkoverActive, setTalkoverActive] = useState(false);
  const [originalVolume, setOriginalVolume] = useState(80);

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

  // Continuous animation loop for VU meter when audio is playing
  useEffect(() => {
    let animationFrame: number;
    
    const animate = () => {
      if (isAnyChannelPlaying || micEnabled) {
        setAnimationTick(prev => prev + 1);
        animationFrame = requestAnimationFrame(animate);
      }
    };
    
    if (isAnyChannelPlaying || micEnabled) {
      animationFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
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

  const handleTalkoverToggle = () => {
    if (!micEnabled) return; // Only allow talkover when mic is on
    
    const newTalkoverState = !talkoverActive;
    setTalkoverActive(newTalkoverState);
    
    if (newTalkoverState) {
      // Store current volume before ducking
      setOriginalVolume(masterVolume);
      const duckedVolume = Math.round(masterVolume * 0.25);
      setMasterVolume(duckedVolume);
      handleMasterVolumeChange(duckedVolume);
      console.log(`🎤 Talkover ON - Volume ducked to ${duckedVolume}%`);
    } else {
      // Restore original volume
      setMasterVolume(originalVolume);
      handleMasterVolumeChange(originalVolume);
      console.log(`🎤 Talkover OFF - Volume restored to ${originalVolume}%`);
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
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                Microphone: {micEnabled ? 'ON' : 'OFF'}
              </Typography>
              {micEnabled && (
                <Box sx={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#ffffff' }}>Mic Gain: {micGain}%</Typography>
                  <Fader
                    orientation="horizontal"
                    value={micGain}
                    onChange={(value) => setMicGain(value)}
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
                  minWidth: '80px',
                  '&:hover': {
                    borderColor: '#ff9800',
                    backgroundColor: talkoverActive ? '#ff9800dd' : '#ff980020'
                  },
                  '&:disabled': {
                    borderColor: '#666666',
                    color: '#666666'
                  }
                }}
              >
                TALKOVER
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

      <Row className="align-items-start justify-content-center">
        {/* Channel A */}
        <Col xs={12} lg={4}>
          <MixerChannel 
            channelId="A" 
            label="Channel A"
            track={deckA}
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
              Master Control
            </Typography>



            {/* Master VU Meter - Curved Arc Style */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              mb: 3,
              p: 3,
              background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)',
              borderRadius: '16px',
              border: '3px solid #2a2a2a',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.6)'
            }}>
              {/* VU Meter Arc */}
              <Box sx={{ 
                position: 'relative', 
                width: 240, 
                height: 140,
                mb: 3,
                background: 'radial-gradient(circle at center bottom, #0f0f0f, #050505)',
                borderRadius: '120px 120px 0 0',
                border: '2px solid #333'
              }}>
                <svg width="240" height="140" viewBox="0 0 240 140">
                  {/* LED segments - curved arc array aligned with needle */}
                  {Array.from({ length: 19 }, (_, i) => {
                    const angle = (i * 120 / 18) - 150; // -130 to +20 degrees to match needle sweep
                    const radian = (angle * Math.PI) / 180;
                    const x1 = 120 + 85 * Math.cos(radian);
                    const y1 = 130 + 85 * Math.sin(radian);
                    const x2 = 120 + 100 * Math.cos(radian);
                    const y2 = 130 + 100 * Math.sin(radian);
                    
                    // Calculate if this LED should be lit based on real audio activity
                    let avgLevel = 0;
                    
                    // Get real-time audio levels when tracks are playing
                    if (isAnyChannelPlaying || micEnabled) {
                      try {
                        // Try to get actual audio levels from AudioService
                        const audioLevel = audioService.getAudioLevelPercentage();
                        const baseLevel = Math.max(audioLevel, Math.max(masterLevels.left || 0, masterLevels.right || 0));
                        
                        // Add realistic audio variation for natural movement
                        const time = animationTick * 0.1; // Use animation tick for smooth continuous updates
                        const musicVariation = Math.sin(time * 0.15) * 4 + Math.sin(time * 0.4) * 3; // Music-like fluctuation
                        const randomNoise = (Math.random() - 0.5) * 2; // Small random variations
                        
                        // Start from 0 (far left) when playing
                        avgLevel = Math.max(0, Math.min(100, baseLevel + musicVariation + randomNoise));
                      } catch (error) {
                        // Fallback to simulation if AudioService unavailable
                        const time = animationTick * 0.1;
                        const musicLevel = 10 + Math.sin(time * 0.2) * 8; // 2-18% range for realistic music
                        avgLevel = Math.max(0, Math.min(100, musicLevel));
                      }
                    } else {
                      // When nothing is playing, no LEDs should be lit
                      avgLevel = 0;
                    }
                    
                    const threshold = (i / 18) * 100;
                    const isLit = avgLevel > threshold;
                    
                    // Base color always visible - green -> yellow -> red progression
                    let baseColor, brightColor, glowColor;
                    
                    if (i <= 10) {
                      baseColor = '#003300'; // Dark green when off
                      brightColor = '#00ff00'; // Bright green when on
                      glowColor = '#00ff0080';
                    } else if (i <= 14) {
                      baseColor = '#333300'; // Dark yellow when off
                      brightColor = '#ffff00'; // Bright yellow when on
                      glowColor = '#ffff0080';
                    } else {
                      baseColor = '#330000'; // Dark red when off
                      brightColor = '#ff0000'; // Bright red when on
                      glowColor = '#ff000080';
                    }
                    
                    const currentColor = isLit ? brightColor : baseColor;
                    
                    return (
                      <g key={i}>
                        {/* LED glow effect when lit */}
                        {isLit && (
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={glowColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            filter="blur(2px)"
                          />
                        )}
                        {/* LED bar - always visible with color */}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={currentColor}
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                  
                  {/* Needle - Professional analog arc style */}
                  {(() => {
                    // Calculate audio level for needle angle
                    let avgLevel = 0;
                    
                    if (isAnyChannelPlaying || micEnabled) {
                      try {
                        const audioLevel = audioService.getAudioLevelPercentage();
                        const baseLevel = Math.max(audioLevel, Math.max(masterLevels.left || 0, masterLevels.right || 0));
                        const time = animationTick * 0.1;
                        const variation = Math.sin(time * 0.15) * 4 + Math.sin(time * 0.4) * 3;
                        // Start from 0 (far left) and add realistic audio levels
                        avgLevel = Math.max(0, Math.min(100, baseLevel + variation));
                      } catch (error) {
                        // When playing but no real audio data, start low and animate
                        const time = animationTick * 0.1;
                        const musicLevel = 10 + Math.sin(time * 0.2) * 8; // 2-18% range
                        avgLevel = Math.max(0, Math.min(100, musicLevel));
                      }
                    } else {
                      // Needle at far left when silent
                      avgLevel = 0;
                    }
                    
                    // Needle angle: starts further left when avgLevel=0, sweeps to top-right when avgLevel=100
                    const needleAngle = -150 + (avgLevel / 100) * 150; // 150° sweep from bottom-left to top-right
                    const needleRadian = (needleAngle * Math.PI) / 180;
                    
                    // Center point for needle rotation
                    const centerX = 120;
                    const centerY = 130;
                    
                    // Needle length from center
                    const needleLength = 70;
                    
                    // Calculate needle tip position
                    const needleTipX = centerX + needleLength * Math.cos(needleRadian);
                    const needleTipY = centerY + needleLength * Math.sin(needleRadian);
                    
                    return (
                      <g>
                        {/* Needle shadow */}
                        <line
                          x1={centerX + 1}
                          y1={centerY + 1}
                          x2={needleTipX + 1}
                          y2={needleTipY + 1}
                          stroke="#00000060"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        {/* Main needle */}
                        <line
                          x1={centerX}
                          y1={centerY}
                          x2={needleTipX}
                          y2={needleTipY}
                          stroke="#ff6600"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        {/* Center pivot */}
                        <circle
                          cx={centerX}
                          cy={centerY}
                          r="4"
                          fill="#333"
                          stroke="#666"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })()}
                </svg>
              </Box>
            </Box>

            {/* Crossfader */}
            <Box sx={{ 
              width: '100%', 
              px: 2, 
              my: 3
            }}>
              <Typography 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: '#ffffff' 
                }}
              >
                Crossfader: {crossfader > 0 ? `B ${crossfader}%` : 
                  crossfader < 0 ? `A ${Math.abs(crossfader)}%` : 'Center'}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                height: 80,
                width: '100%'
              }}>
                <Box sx={{
                  width: 220,
                  height: 50,
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
                    height: '8px',
                    background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
                    borderRadius: '4px',
                    border: '1px solid #333',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.9)',
                    position: 'relative'
                  }}>
                    {/* Center notch */}
                    <Box sx={{
                      position: 'absolute',
                      left: '50%',
                      top: '-2px',
                      width: '2px',
                      height: '12px',
                      background: '#ffeb3b',
                      transform: 'translateX(-50%)',
                      borderRadius: '1px'
                    }} />
                    
                    {/* Crossfader handle */}
                    <Box sx={{
                      position: 'absolute',
                      left: `${((crossfader + 100) / 200) * 100}%`,
                      top: '50%',
                      width: '24px',
                      height: '32px',
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
                        top: '4px',
                        left: '4px',
                        right: '4px',
                        bottom: '4px',
                        background: 'linear-gradient(135deg, #ddd 0%, #888 50%, #666 100%)',
                        borderRadius: '3px'
                      },
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: '2px',
                        height: '16px',
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
                    left: '10px',
                    color: '#ffeb3b',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}>A</Box>
                  <Box sx={{
                    position: 'absolute',
                    right: '10px',
                    color: '#ffeb3b',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}>B</Box>
                </Box>
              </Box>
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
                  color="red"
                  size={60}
                />
                <Typography variant="caption">{masterBass}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Knob 
                  label="Mid" 
                  value={masterMid}
                  onChange={setMasterMid}
                  color="orange"
                  size={60}
                />
                <Typography variant="caption">{masterMid}</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Knob 
                  label="Treble" 
                  value={masterTreble}
                  onChange={setMasterTreble}
                  color="blue"
                  size={60}
                />
                <Typography variant="caption">{masterTreble}</Typography>
              </Box>
            </Box>

            {/* Master Volume */}
            <Box sx={{ width: '100%', px: 2 }}>
              <Typography 
                gutterBottom 
                align="center" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: '#ffffff' 
                }}
              >
                Master Volume: {masterVolume}%
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                height: 160,
                alignItems: 'center'
              }}>
                <Fader
                  orientation="vertical"
                  value={masterVolume}
                  onChange={(value) => handleMasterVolumeChange(value)}
                  min={0}
                  max={100}
                  label="MASTER"
                  width={40}
                  height={120}
                  color="yellow"
                />
              </Box>
              
              {/* Volume Level Indicator */}
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: '#ffeb3b',
                    fontWeight: 'bold'
                  }}
                >
                  {masterVolume}%
                </Typography>
              </Box>
            </Box>

          </Box>
        </Col>

        {/* Channel B */}
        <Col xs={12} lg={4} className="mt-3 mt-lg-0">
          <MixerChannel 
            channelId="B" 
            label="Channel B"
            track={deckB}
            onLoad={handleChannelBLoad}
            onStateChange={handleChannelBChange}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default Mixer;