import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  LinearProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Mic as MicIcon,
  Speaker as SpeakerIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Headphones as HeadphonesIcon
} from '@mui/icons-material';
import { Row, Col } from 'react-bootstrap';
import AudioMeter from './AudioMeter';
import { audioService } from '../services/AudioService';

interface AudioDeviceSettingsProps {
  open: boolean;
  onClose: () => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

export const AudioDeviceSettings: React.FC<AudioDeviceSettingsProps> = ({ open, onClose }) => {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [micEnabled, setMicEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const checkPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionStatus(result.state);
      
      result.addEventListener('change', () => {
        setPermissionStatus(result.state);
      });
    } catch (error) {
      console.log('Permission API not supported');
      setPermissionStatus('unknown');
    }
  };

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Request permissions first to get proper device labels
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      
      const audioDevices: AudioDevice[] = deviceList
        .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind === 'audioinput' ? 'Microphone' : 'Speaker'} ${device.deviceId.slice(0, 4)}`,
          kind: device.kind as 'audioinput' | 'audiooutput',
          groupId: device.groupId
        }));

      setDevices(audioDevices);
      
      // Auto-select default devices if none selected
      if (!selectedMicrophone) {
        const defaultMic = audioDevices.find(d => d.kind === 'audioinput');
        if (defaultMic) {
          setSelectedMicrophone(defaultMic.deviceId);
        }
      }
      
      if (!selectedSpeakers) {
        const defaultSpeaker = audioDevices.find(d => d.kind === 'audiooutput');
        if (defaultSpeaker) {
          setSelectedSpeakers(defaultSpeaker.deviceId);
        }
      }
      
      console.log('🎵 Found audio devices:', audioDevices.length);
    } catch (err: any) {
      console.error('Failed to load devices:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow access and refresh.');
      } else {
        setError('Failed to load audio devices: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedMicrophone, selectedSpeakers]);

  // Load devices when dialog opens
  useEffect(() => {
    if (open) {
      loadDevices();
      checkPermissions();
    }
  }, [open, loadDevices]);

  // Real-time microphone monitoring
  useEffect(() => {
    let animationFrame: number;
    
    const updateMicLevel = () => {
      if (testingMic && audioService) {
        const level = audioService.getAudioLevelPercentage('microphone');
        setMicLevel(level);
        
        // Debug logging
        if (level > 0) {
          console.log('🎙️ Mic level:', level.toFixed(1) + '%');
        }
      } else {
        setMicLevel(0);
      }
      animationFrame = requestAnimationFrame(updateMicLevel);
    };

    if (testingMic) {
      console.log('🎙️ Starting microphone level monitoring');
      animationFrame = requestAnimationFrame(updateMicLevel);
    } else {
      console.log('🎙️ Stopping microphone level monitoring');
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [testingMic]);

  const testMicrophone = async () => {
    if (testingMic) {
      // Stop testing
      setTestingMic(false);
      setMicEnabled(false);
      await audioService.toggleMicrophone(false);
      return;
    }

    if (!selectedMicrophone) {
      setError('Please select a microphone first');
      return;
    }

    try {
      setTestingMic(true);
      setError('');
      
      // Test the selected microphone
      const testStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedMicrophone ? { exact: selectedMicrophone } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 48000
        }
      });
      
      // Stream created successfully, cleanup will happen in audioService
      testStream.getTracks().forEach(track => track.stop());

      // Initialize audio service if needed
      if (!audioService || !(window as any).AudioContext) {
        await audioService.initialize();
      }
      
      // Test microphone with selected device
      const success = await audioService.toggleMicrophone(true, selectedMicrophone);
      
      if (success) {
        setMicEnabled(true);
        console.log('🎙️ Microphone test started with device:', selectedMicrophone);
      } else {
        setError('Failed to initialize microphone with selected device');
        setTestingMic(false);
      }
    } catch (err: any) {
      console.error('Microphone test failed:', err);
      setTestingMic(false);
      
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied');
      } else if (err.name === 'NotFoundError') {
        setError('Selected microphone not found');
      } else if (err.name === 'OverconstrainedError') {
        setError('Selected microphone cannot be used with current settings');
      } else {
        setError('Failed to test microphone: ' + err.message);
      }
    }
  };

  const applySettings = async () => {
    try {
      setError('');
      
      // Apply the selected microphone device
      if (selectedMicrophone && micEnabled) {
        console.log('🎙️ Applying microphone device:', selectedMicrophone);
        
        // Use the AudioService to switch to the selected device
        const success = await audioService.switchMicrophoneDevice(selectedMicrophone);
        
        if (!success) {
          setError('Failed to apply microphone device settings');
          return;
        }
      }

      // Save settings to localStorage for persistence
      const audioSettings = {
        microphone: selectedMicrophone,
        speakers: selectedSpeakers,
        timestamp: Date.now()
      };
      
      localStorage.setItem('onestop_audio_settings', JSON.stringify(audioSettings));
      console.log('💾 Audio device settings saved:', audioSettings);

      // Show success and close dialog
      setTestingMic(false);
      onClose();
      
      // Notify user of successful application
      console.log('✅ Audio device settings applied successfully');
      
    } catch (error) {
      console.error('Failed to apply settings:', error);
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          setError('Selected audio device not found or disconnected');
        } else if (error.name === 'NotAllowedError') {
          setError('Audio device access denied. Please check permissions.');
        } else {
          setError(`Failed to apply audio settings: ${error.message}`);
        }
      } else {
        setError('Failed to apply audio settings');
      }
    }
  };

  const loadSavedSettings = () => {
    try {
      const saved = localStorage.getItem('onestop_audio_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setSelectedMicrophone(settings.microphone || '');
        setSelectedSpeakers(settings.speakers || '');
      }
    } catch (error) {
      console.log('No saved audio settings found');
    }
  };

  // Load saved settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSavedSettings();
    }
  }, [open]);

  const inputDevices = devices.filter(d => d.kind === 'audioinput');
  const outputDevices = devices.filter(d => d.kind === 'audiooutput');

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1a1a1a',
          color: '#ffffff',
          minHeight: '60vh'
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
        <SettingsIcon color="primary" />
        <Typography variant="h5">Audio Device Settings</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label={permissionStatus === 'granted' ? '🟢 PERMITTED' : 
                permissionStatus === 'denied' ? '🔴 DENIED' :
                permissionStatus === 'prompt' ? '🟡 PROMPT' : '❓ UNKNOWN'}
          size="small"
          sx={{
            backgroundColor: permissionStatus === 'granted' ? '#4caf50' : 
                           permissionStatus === 'denied' ? '#f44336' : '#666',
            color: '#fff'
          }}
        />
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" mt={1}>
              Loading audio devices...
            </Typography>
          </Box>
        )}

        <Row>
          {/* Microphone Settings */}
          <Col md={6}>
            <Card sx={{ backgroundColor: '#2a2a2a', mb: 2, height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <MicIcon color="secondary" />
                  <Typography variant="h6" ml={1}>Microphone Input</Typography>
                  <Box ml="auto">
                    <Tooltip title="Refresh Devices">
                      <IconButton onClick={loadDevices} size="small" disabled={isLoading}>
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#fff' }}>Select Microphone</InputLabel>
                  <Select
                    value={selectedMicrophone}
                    onChange={(e) => setSelectedMicrophone(e.target.value)}
                    sx={{ 
                      color: '#fff',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#e91e63' }
                    }}
                  >
                    <MenuItem value="">
                      <em>Default Microphone</em>
                    </MenuItem>
                    {inputDevices.map(device => (
                      <MenuItem key={device.deviceId} value={device.deviceId}>
                        <Box display="flex" alignItems="center" width="100%">
                          <MicIcon fontSize="small" sx={{ mr: 1 }} />
                          {device.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Button
                    variant={testingMic ? "contained" : "outlined"}
                    color={testingMic ? "error" : "secondary"}
                    onClick={testMicrophone}
                    startIcon={testingMic ? <ErrorIcon /> : <MicIcon />}
                    fullWidth
                  >
                    {testingMic ? 'Stop Test' : 'Test Microphone'}
                  </Button>
                </Box>

                {testingMic && (
                  <Box>
                    <Typography variant="body2" mb={1}>Microphone Level</Typography>
                    <AudioMeter label="TEST" level={micLevel} isPlaying={true} />
                    <Typography variant="caption" color="text.secondary" mt={1}>
                      {micLevel > 20 ? '🟢 Good signal' : 
                       micLevel > 5 ? '🟡 Low signal' : '🔴 No signal'}
                      {` Level: ${micLevel.toFixed(1)}%`}
                    </Typography>
                    <Box mt={1}>
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666' }}>
                        Microphone Status: {audioService.isMicrophoneActive() ? 'Active' : 'Inactive'}
                        <br />
                        Try speaking into the microphone to see level changes
                      </Typography>
                    </Box>
                  </Box>
                )}

                {!testingMic && selectedMicrophone && (
                  <Alert severity="info" sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}>
                    Click "Test Microphone" to verify this device works correctly
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Col>

          {/* Speaker/Output Settings */}
          <Col md={6}>
            <Card sx={{ backgroundColor: '#2a2a2a', mb: 2, height: '100%' }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SpeakerIcon color="primary" />
                  <Typography variant="h6" ml={1}>Audio Output</Typography>
                </Box>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ color: '#fff' }}>Select Speakers/Headphones</InputLabel>
                  <Select
                    value={selectedSpeakers}
                    onChange={(e) => setSelectedSpeakers(e.target.value)}
                    sx={{ 
                      color: '#fff',
                      '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1976d2' }
                    }}
                  >
                    <MenuItem value="">
                      <em>Default Speakers</em>
                    </MenuItem>
                    {outputDevices.map(device => (
                      <MenuItem key={device.deviceId} value={device.deviceId}>
                        <Box display="flex" alignItems="center" width="100%">
                          <HeadphonesIcon fontSize="small" sx={{ mr: 1 }} />
                          {device.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Alert severity="warning" sx={{ backgroundColor: 'rgba(255, 152, 0, 0.1)' }}>
                  <Typography variant="body2">
                    <strong>Note:</strong> Speaker selection requires additional browser permissions. 
                    Most browsers use the system default output device.
                  </Typography>
                </Alert>

                <Box mt={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={selectedSpeakers !== ''}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            setSelectedSpeakers('');
                          }
                        }}
                      />
                    }
                    label="Use specific output device"
                  />
                </Box>
              </CardContent>
            </Card>
          </Col>
        </Row>

        {/* Device Information */}
        <Card sx={{ backgroundColor: '#2a2a2a', mt: 2 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Device Information</Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Total Devices:</strong> {devices.length} 
              ({inputDevices.length} inputs, {outputDevices.length} outputs)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Selected Microphone:</strong> {
                selectedMicrophone ? 
                (inputDevices.find(d => d.deviceId === selectedMicrophone)?.label || 'Unknown') : 
                'Default'
              }
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Selected Output:</strong> {
                selectedSpeakers ? 
                (outputDevices.find(d => d.deviceId === selectedSpeakers)?.label || 'Unknown') : 
                'Default'
              }
            </Typography>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #333' }}>
        <Button onClick={loadDevices} startIcon={<RefreshIcon />} disabled={isLoading}>
          Refresh Devices
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={applySettings}
          variant="contained"
          startIcon={<CheckIcon />}
          sx={{ backgroundColor: '#e91e63' }}
        >
          Apply & Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AudioDeviceSettings;