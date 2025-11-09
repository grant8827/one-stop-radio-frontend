import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { Row, Col } from 'react-bootstrap';
import {
  VolumeUp,
  Mic,
  Speaker,
  GraphicEq,
  Tune,
  RestoreFromTrash,
  Refresh,
  Check,
  VolumeOff,
  MicOff
} from '@mui/icons-material';
import AudioMeter from './AudioMeter';
import { audioService } from '../services/AudioService';
import { useAudioActivity } from '../contexts/AudioActivityContext';

interface AudioSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: string;
}

interface ChannelEQSettings {
  bass: number;
  mid: number;
  treble: number;
}

interface AudioChannelSettings {
  volume: number;
  eq: ChannelEQSettings;
  enabled: boolean;
  muted: boolean;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ open, onClose }) => {
  // Device management
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('default');
  
  // Master audio settings
  const [masterVolume, setMasterVolume] = useState(80);
  const [masterMuted, setMasterMuted] = useState(false);
  const [crossfaderPosition, setCrossfaderPosition] = useState(0);
  
  // Channel settings
  const [channelASettings, setChannelASettings] = useState<AudioChannelSettings>({
    volume: 75,
    eq: { bass: 50, mid: 50, treble: 50 },
    enabled: true,
    muted: false
  });
  
  const [channelBSettings, setChannelBSettings] = useState<AudioChannelSettings>({
    volume: 75,
    eq: { bass: 50, mid: 50, treble: 50 },
    enabled: true,
    muted: false
  });
  
  // Microphone settings
  const [micSettings, setMicSettings] = useState({
    enabled: false,
    gain: 75,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: false,
    muted: false
  });
  
  // Audio quality settings
  const [audioQuality, setAudioQuality] = useState({
    sampleRate: 48000,
    bitRate: 192000,
    channels: 2,
    bufferSize: 512
  });
  
  // Real-time levels
  const [audioLevels, setAudioLevels] = useState({
    master: { left: 0, right: 0 },
    channelA: 0,
    channelB: 0,
    microphone: 0
  });
  
  const { audioState } = useAudioActivity();

  // Load audio devices on component mount
  useEffect(() => {
    loadAudioDevices();
  }, []);

  // Real-time audio level monitoring using AudioService
  useEffect(() => {
    let animationFrame: number;
    
    const updateLevels = () => {
      if (open) {
        try {
          // Get real audio levels from AudioService
          const masterLevel = audioService.getAudioLevelPercentage(); // Master output
          const channelALevel = audioService.getAudioLevelPercentage('A'); // Channel A
          const channelBLevel = audioService.getAudioLevelPercentage('B'); // Channel B  
          const microphoneLevel = audioService.getAudioLevelPercentage('microphone'); // Microphone input
          
          // For stereo master, use slight variation for L/R
          const masterLeft = masterLevel;
          const masterRight = masterLevel * 0.95 + (Math.random() * 5); // Slight L/R variation
          
          setAudioLevels({
            master: { 
              left: Math.min(Math.max(masterLeft, 0), 100), 
              right: Math.min(Math.max(masterRight, 0), 100) 
            },
            channelA: Math.min(Math.max(channelALevel, 0), 100),
            channelB: Math.min(Math.max(channelBLevel, 0), 100),
            microphone: Math.min(Math.max(microphoneLevel, 0), 100)
          });
        } catch (error) {
          // Fallback to simulated levels if AudioService is not available
          console.warn('AudioService not available, using simulated levels:', error);
          const masterLeft = audioState.masterLevel * 0.8 + Math.random() * 15;
          const masterRight = audioState.masterLevel * 0.9 + Math.random() * 15;
          const channelA = audioState.channelAPlaying ? 50 + Math.random() * 25 : Math.random() * 5;
          const channelB = audioState.channelBPlaying ? 55 + Math.random() * 20 : Math.random() * 5;
          const microphone = audioState.microphoneActive ? 35 + Math.random() * 25 : Math.random() * 3;
          
          setAudioLevels({
            master: { left: Math.min(masterLeft, 100), right: Math.min(masterRight, 100) },
            channelA: Math.min(channelA, 100),
            channelB: Math.min(channelB, 100),
            microphone: Math.min(microphone, 100)
          });
        }
      }
      
      animationFrame = requestAnimationFrame(updateLevels);
    };

    animationFrame = requestAnimationFrame(updateLevels);
    return () => cancelAnimationFrame(animationFrame);
  }, [open, audioState]);

  const loadAudioDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 4)}`,
          kind: device.kind
        }));
      
      const audioOutputs = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 4)}`,
          kind: device.kind
        }));
      
      setAudioDevices([...audioInputs, ...audioOutputs]);
    } catch (error) {
      console.error('Failed to load audio devices:', error);
    }
  };

  const handleMasterVolumeChange = (_: Event, newValue: number | number[]) => {
    const volume = newValue as number;
    setMasterVolume(volume);
    // Apply to audio service
    if (audioService) {
      // audioService.setMasterVolume(volume);
    }
  };

  const handleChannelVolumeChange = (channel: 'A' | 'B', volume: number) => {
    if (channel === 'A') {
      setChannelASettings(prev => ({ ...prev, volume }));
      audioService.setChannelVolume('A', volume);
    } else {
      setChannelBSettings(prev => ({ ...prev, volume }));
      audioService.setChannelVolume('B', volume);
    }
  };

  const handleChannelEQChange = (channel: 'A' | 'B', eq: ChannelEQSettings) => {
    if (channel === 'A') {
      setChannelASettings(prev => ({ ...prev, eq }));
      audioService.setChannelEQ('A', eq);
    } else {
      setChannelBSettings(prev => ({ ...prev, eq }));
      audioService.setChannelEQ('B', eq);
    }
  };

  const handleMicrophoneToggle = async () => {
    const newEnabled = !micSettings.enabled;
    setMicSettings(prev => ({ ...prev, enabled: newEnabled }));
    
    try {
      if (newEnabled) {
        // Request microphone permission first
        await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: micSettings.echoCancellation,
            noiseSuppression: micSettings.noiseSuppression,
            autoGainControl: micSettings.autoGainControl,
            sampleRate: 48000,
            channelCount: 1
          } 
        });
      }
      
      const success = await audioService.toggleMicrophone(newEnabled);
      if (success && newEnabled) {
        audioService.setMicrophoneGain(micSettings.gain);
        console.log('🎙️ Microphone enabled in settings panel');
      }
    } catch (error) {
      console.error('Failed to toggle microphone in settings:', error);
      setMicSettings(prev => ({ ...prev, enabled: false })); // Reset on error
    }
  };

  const handleMicGainChange = (_: Event, newValue: number | number[]) => {
    const gain = newValue as number;
    setMicSettings(prev => ({ ...prev, gain }));
    audioService.setMicrophoneGain(gain);
  };

  const resetToDefaults = () => {
    setMasterVolume(80);
    setCrossfaderPosition(0);
    setChannelASettings({
      volume: 75,
      eq: { bass: 50, mid: 50, treble: 50 },
      enabled: true,
      muted: false
    });
    setChannelBSettings({
      volume: 75,
      eq: { bass: 50, mid: 50, treble: 50 },
      enabled: true,
      muted: false
    });
    setMicSettings({
      enabled: false,
      gain: 75,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: false,
      muted: false
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          minHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderBottom: '1px solid #333',
        pb: 2
      }}>
        <Tune color="primary" />
        <Typography variant="h5">Audio & Microphone Settings</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label={audioState.channelAPlaying || audioState.channelBPlaying || audioState.microphoneActive ? '🟢 ACTIVE' : '⚫ SILENT'}
          size="small"
          sx={{
            backgroundColor: audioState.channelAPlaying || audioState.channelBPlaying || audioState.microphoneActive ? '#4caf50' : '#666',
            color: '#fff'
          }}
        />
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        <Row>
          
          {/* Master Controls */}
          <Col md={6}>
            <Card sx={{ backgroundColor: '#2a2a2a', mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Speaker color="primary" />
                  <Typography variant="h6" ml={1}>Master Controls</Typography>
                </Box>
                
                <Box mb={3}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Master Volume</Typography>
                    <IconButton size="small" onClick={() => setMasterMuted(!masterMuted)}>
                      {masterMuted ? <VolumeOff color="error" /> : <VolumeUp color="primary" />}
                    </IconButton>
                  </Box>
                  <Slider
                    value={masterMuted ? 0 : masterVolume}
                    onChange={handleMasterVolumeChange}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                    disabled={masterMuted}
                    sx={{ color: '#ff6b35' }}
                  />
                </Box>
                
                <Box mb={3}>
                  <Typography variant="body2" mb={1}>Crossfader Position</Typography>
                  <Slider
                    value={crossfaderPosition}
                    onChange={(_, value) => {
                      setCrossfaderPosition(value as number);
                      audioService.setCrossfader(value as number);
                    }}
                    min={-100}
                    max={100}
                    valueLabelDisplay="auto"
                    marks={[
                      { value: -100, label: 'A' },
                      { value: 0, label: 'CENTER' },
                      { value: 100, label: 'B' }
                    ]}
                    sx={{ color: '#ff6b35' }}
                  />
                </Box>
                
                <Box display="flex" gap={2}>
                  <AudioMeter label="L" level={audioLevels.master.left} />
                  <AudioMeter label="R" level={audioLevels.master.right} />
                </Box>
              </CardContent>
            </Card>
          </Col>

          {/* Microphone Settings */}
          <Col md={6}>
            <Card sx={{ backgroundColor: '#2a2a2a', mb: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Mic color="secondary" />
                    <Typography variant="h6" ml={1}>Microphone</Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={micSettings.enabled}
                        onChange={handleMicrophoneToggle}
                        color="secondary"
                      />
                    }
                    label={micSettings.enabled ? "Enabled" : "Disabled"}
                  />
                </Box>
                
                {micSettings.enabled && (
                  <>
                    <Box mb={2}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">Microphone Gain</Typography>
                        <IconButton size="small" onClick={() => setMicSettings(prev => ({ ...prev, muted: !prev.muted }))}>
                          {micSettings.muted ? <MicOff color="error" /> : <Mic color="secondary" />}
                        </IconButton>
                      </Box>
                      <Slider
                        value={micSettings.muted ? 0 : micSettings.gain}
                        onChange={handleMicGainChange}
                        min={0}
                        max={150}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${value}%`}
                        disabled={micSettings.muted}
                        sx={{ color: '#e91e63' }}
                      />
                    </Box>
                    
                    <Box mb={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={micSettings.noiseSuppression}
                            onChange={(e) => setMicSettings(prev => ({ ...prev, noiseSuppression: e.target.checked }))}
                            size="small"
                          />
                        }
                        label="Noise Suppression"
                      />
                    </Box>
                    
                    <Box mb={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={micSettings.echoCancellation}
                            onChange={(e) => setMicSettings(prev => ({ ...prev, echoCancellation: e.target.checked }))}
                            size="small"
                          />
                        }
                        label="Echo Cancellation"
                      />
                    </Box>
                    
                    <Box display="flex" alignItems="center" gap={2}>
                      <AudioMeter label="MIC" level={audioLevels.microphone} />
                      <Typography variant="caption" color="text.secondary">
                        {audioLevels.microphone > 5 ? '🎙️ Active' : '💤 Standby'}
                      </Typography>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Col>

          {/* Channel A Settings */}
          <Col md={6}>
            <Card sx={{ backgroundColor: '#2a2a2a' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                  <Typography variant="h6" color="#ff6b35">Channel A</Typography>
                  <Box ml={2}>
                    <AudioMeter label="A" level={audioLevels.channelA} />
                  </Box>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2" mb={1}>Volume</Typography>
                  <Slider
                    value={channelASettings.volume}
                    onChange={(_, value) => handleChannelVolumeChange('A', value as number)}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    sx={{ color: '#ff6b35' }}
                  />
                </Box>
                
                <Typography variant="body2" mb={1}>EQ Settings</Typography>
                <Box mb={1}>
                  <Typography variant="caption">Bass</Typography>
                  <Slider
                    value={channelASettings.eq.bass}
                    onChange={(_, value) => handleChannelEQChange('A', { ...channelASettings.eq, bass: value as number })}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ color: '#ff6b35' }}
                  />
                </Box>
                <Box mb={1}>
                  <Typography variant="caption">Mid</Typography>
                  <Slider
                    value={channelASettings.eq.mid}
                    onChange={(_, value) => handleChannelEQChange('A', { ...channelASettings.eq, mid: value as number })}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ color: '#ff6b35' }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption">Treble</Typography>
                  <Slider
                    value={channelASettings.eq.treble}
                    onChange={(_, value) => handleChannelEQChange('A', { ...channelASettings.eq, treble: value as number })}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ color: '#ff6b35' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Col>

          {/* Channel B Settings */}
          <Col md={6}>
            <Card sx={{ backgroundColor: '#2a2a2a' }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                  <Typography variant="h6" color="#4caf50">Channel B</Typography>
                  <Box ml={2}>
                    <AudioMeter label="B" level={audioLevels.channelB} />
                  </Box>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2" mb={1}>Volume</Typography>
                  <Slider
                    value={channelBSettings.volume}
                    onChange={(_, value) => handleChannelVolumeChange('B', value as number)}
                    min={0}
                    max={100}
                    valueLabelDisplay="auto"
                    sx={{ color: '#4caf50' }}
                  />
                </Box>
                
                <Typography variant="body2" mb={1}>EQ Settings</Typography>
                <Box mb={1}>
                  <Typography variant="caption">Bass</Typography>
                  <Slider
                    value={channelBSettings.eq.bass}
                    onChange={(_, value) => handleChannelEQChange('B', { ...channelBSettings.eq, bass: value as number })}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ color: '#4caf50' }}
                  />
                </Box>
                <Box mb={1}>
                  <Typography variant="caption">Mid</Typography>
                  <Slider
                    value={channelBSettings.eq.mid}
                    onChange={(_, value) => handleChannelEQChange('B', { ...channelBSettings.eq, mid: value as number })}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ color: '#4caf50' }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption">Treble</Typography>
                  <Slider
                    value={channelBSettings.eq.treble}
                    onChange={(_, value) => handleChannelEQChange('B', { ...channelBSettings.eq, treble: value as number })}
                    min={0}
                    max={100}
                    size="small"
                    sx={{ color: '#4caf50' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Col>
        </Row>
        
        <Row>
          {/* Audio Devices */}
          <Col xs={12}>
            <Card sx={{ backgroundColor: '#2a2a2a' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <GraphicEq color="info" />
                  <Typography variant="h6" ml={1}>Audio Devices & Quality</Typography>
                  <Box ml="auto">
                    <Tooltip title="Refresh Devices">
                      <IconButton onClick={loadAudioDevices} size="small">
                        <Refresh />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                <Row>
                  <Col md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Input Device</InputLabel>
                      <Select
                        value={selectedInputDevice}
                        onChange={(e) => setSelectedInputDevice(e.target.value)}
                        sx={{ color: '#fff' }}
                      >
                        <MenuItem value="default">Default Microphone</MenuItem>
                        {audioDevices
                          .filter(device => device.kind === 'audioinput')
                          .map(device => (
                            <MenuItem key={device.deviceId} value={device.deviceId}>
                              {device.label}
                            </MenuItem>
                          ))}
                      </Select>
                    </FormControl>
                  </Col>
                  
                  <Col md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Sample Rate</InputLabel>
                      <Select
                        value={audioQuality.sampleRate}
                        onChange={(e) => setAudioQuality(prev => ({ ...prev, sampleRate: e.target.value as number }))}
                        sx={{ color: '#fff' }}
                      >
                        <MenuItem value={44100}>44.1 kHz (CD Quality)</MenuItem>
                        <MenuItem value={48000}>48 kHz (Professional)</MenuItem>
                        <MenuItem value={96000}>96 kHz (High-Res)</MenuItem>
                      </Select>
                    </FormControl>
                  </Col>
                  
                  <Col md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Bit Rate</InputLabel>
                      <Select
                        value={audioQuality.bitRate}
                        onChange={(e) => setAudioQuality(prev => ({ ...prev, bitRate: e.target.value as number }))}
                        sx={{ color: '#fff' }}
                      >
                        <MenuItem value={128000}>128 kbps</MenuItem>
                        <MenuItem value={192000}>192 kbps</MenuItem>
                        <MenuItem value={256000}>256 kbps</MenuItem>
                        <MenuItem value={320000}>320 kbps</MenuItem>
                      </Select>
                    </FormControl>
                  </Col>
                </Row>
              </CardContent>
            </Card>
          </Col>
        </Row>
        
        {/* Status Information */}
        <Alert 
          severity="info" 
          sx={{ 
            mt: 2, 
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            border: '1px solid rgba(33, 150, 243, 0.3)'
          }}
        >
          <Typography variant="body2">
            <strong>Audio Status:</strong> {audioState.channelAPlaying && audioState.channelBPlaying ? 'Both channels active' : 
                                          audioState.channelAPlaying ? 'Channel A active' :
                                          audioState.channelBPlaying ? 'Channel B active' : 'No channels active'}
            {audioState.microphoneActive && ' | Microphone active'}
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #333' }}>
        <Button
          onClick={resetToDefaults}
          startIcon={<RestoreFromTrash />}
          color="warning"
        >
          Reset to Defaults
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          startIcon={<Check />}
          sx={{ backgroundColor: '#ff6b35' }}
        >
          Apply Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AudioSettings;