import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Mic,
  MicOff,
  VolumeUp,
  RadioButtonChecked,
  RadioButtonUnchecked
} from '@mui/icons-material';
import AudioMeter from './AudioMeter';
import Fader from './Fader';
import { audioService } from '../services/AudioService';
import { useAudioActivity } from '../contexts/AudioActivityContext';

interface MicrophoneControlsProps {
  onMicrophoneChange?: (enabled: boolean) => void;
  onLevelChange?: (level: number) => void;
}

export const MicrophoneControls: React.FC<MicrophoneControlsProps> = ({
  onMicrophoneChange,
  onLevelChange
}) => {
  const [micEnabled, setMicEnabled] = useState(false);
  const [micGain, setMicGain] = useState(75);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string>('');
  const [micLevel, setMicLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { updateMicrophone, updateMasterLevel } = useAudioActivity();

  // Real-time microphone level monitoring
  useEffect(() => {
    let animationFrame: number;
    
    const updateMicLevel = () => {
      if (micEnabled && audioService) {
        // Get microphone audio levels using the improved method
        const level = audioService.getAudioLevelPercentage('microphone');
        
        setMicLevel(level);
        onLevelChange?.(level);
        
        // Update audio activity context
        const isActive = level > 5; // Consider talking if level > 5%
        updateMicrophone(isActive);
        
        // Also update master level to reflect microphone input
        if (isActive) {
          updateMasterLevel(Math.max(level * 0.8, 20)); // Boost mic contribution to master
        }
      } else {
        setMicLevel(0);
        onLevelChange?.(0);
        updateMicrophone(false);
      }
      
      animationFrame = requestAnimationFrame(updateMicLevel);
    };

    if (isMonitoring) {
      animationFrame = requestAnimationFrame(updateMicLevel);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [micEnabled, isMonitoring, onLevelChange, updateMicrophone, updateMasterLevel]);

  const toggleMicrophone = useCallback(async () => {
    if (micEnabled) {
      // Disable microphone
      setIsInitializing(true);
      const success = await audioService.toggleMicrophone(false);
      if (success) {
        setMicEnabled(false);
        setIsMonitoring(false);
        setError('');
        onMicrophoneChange?.(false);
      } else {
        setError('Failed to disable microphone');
      }
      setIsInitializing(false);
    } else {
      // Enable microphone
      setIsInitializing(true);
      setError('');
      
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: 1
          } 
        });
        
        const success = await audioService.toggleMicrophone(true);
        if (success) {
          setMicEnabled(true);
          setIsMonitoring(true);
          audioService.setMicrophoneGain(micGain);
          onMicrophoneChange?.(true);
        } else {
          setError('Failed to enable microphone in audio service');
        }
      } catch (err: any) {
        console.error('Microphone access denied:', err);
        if (err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone permissions in your browser.');
        } else if (err.name === 'NotFoundError') {
          setError('No microphone device found.');
        } else {
          setError('Failed to access microphone: ' + err.message);
        }
      }
      setIsInitializing(false);
    }
  }, [micEnabled, micGain, onMicrophoneChange]);



  const toggleMonitoring = useCallback(() => {
    setIsMonitoring(!isMonitoring);
  }, [isMonitoring]);

  return (
    <Card sx={{ minWidth: 280, maxWidth: 320 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" component="h3">
            🎙️ Microphone
          </Typography>
          <IconButton
            onClick={toggleMicrophone}
            disabled={isInitializing}
            color={micEnabled ? "primary" : "default"}
            size="large"
          >
            {micEnabled ? <Mic /> : <MicOff />}
          </IconButton>
        </Box>

        {isInitializing && (
          <Box mb={2}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" mt={1}>
              {micEnabled ? 'Disabling microphone...' : 'Initializing microphone...'}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {error}
          </Alert>
        )}

        {micEnabled && (
          <>
            {/* Microphone Gain Control */}
            <Box mb={3}>
              <Box display="flex" alignItems="center" mb={1}>
                <VolumeUp fontSize="small" />
                <Typography variant="body2" ml={1}>
                  Microphone Gain
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <Fader
                  orientation="horizontal"
                  value={micGain}
                  onChange={(value) => {
                    setMicGain(value);
                    audioService.setMicrophoneGain(value);
                  }}
                  min={0}
                  max={150}
                  label="GAIN"
                  width={180}
                  height={30}
                  color="green"
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Current: {micGain}% gain
              </Typography>
            </Box>

            {/* Microphone Level Meter */}
            <Box mb={2}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2">
                  Input Level
                </Typography>
                <Tooltip title={isMonitoring ? "Monitoring ON" : "Monitoring OFF"}>
                  <IconButton size="small" onClick={toggleMonitoring}>
                    {isMonitoring ? <RadioButtonChecked color="success" /> : <RadioButtonUnchecked />}
                  </IconButton>
                </Tooltip>
              </Box>
              
              <AudioMeter 
                label="MIC" 
                level={micLevel}
              />
              
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {micLevel > 80 ? '🔴 Too loud - reduce gain' : 
                 micLevel > 50 ? '🟢 Good level' :
                 micLevel > 5 ? '🟡 Low level' : '⚫ No signal'}
              </Typography>
            </Box>

            {/* Streaming Status */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={micEnabled && micLevel > 5}
                    disabled={true}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {micLevel > 5 ? '📡 Broadcasting' : '💤 Standby'}
                  </Typography>
                }
              />
              <Typography variant="caption" color="text.secondary" display="block">
                Microphone audio is mixed into main output and video streaming
              </Typography>
            </Box>
          </>
        )}

        {!micEnabled && (
          <Box textAlign="center" py={2}>
            <MicOff fontSize="large" color="disabled" />
            <Typography variant="body2" color="text.secondary" mt={1}>
              Click the microphone button to enable voice input for streaming
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MicrophoneControls;