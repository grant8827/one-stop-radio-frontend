import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { audioService } from '../services/AudioService';

interface DiagnosticInfo {
  audioContextState: string;
  channelsCreated: string[];
  backendAvailable: boolean;
  audioMode: string;
  sampleRate?: number;
  microphoneActive: boolean;
}

const TrackChannelDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  const runDiagnostics = async () => {
    const results: string[] = [];
    
    try {
      // Test audio service initialization
      const initialized = await audioService.initialize();
      results.push(initialized ? '✅ AudioService initialized' : '❌ AudioService failed to initialize');

      // Get system status
      const status = audioService.getSystemStatus();
      
      // Test channel creation
      const channelA = audioService.createChannel('A');
      const channelB = audioService.createChannel('B');
      
      results.push(channelA ? '✅ Channel A created' : '❌ Channel A creation failed');
      results.push(channelB ? '✅ Channel B created' : '❌ Channel B creation failed');

      // Test audio context state
      const contextState = (audioService as any).audioContext?.state || 'unknown';
      results.push(`ℹ️ Audio Context State: ${contextState}`);
      
      if (contextState === 'suspended') {
        results.push('⚠️ Audio context is suspended - user interaction required');
        
        // Try to resume context
        try {
          await audioService.resumeContext();
          results.push('✅ Audio context resumed successfully');
        } catch (error) {
          results.push(`❌ Failed to resume audio context: ${error}`);
        }
      }

      // Test microphone availability
      try {
        const devices = await audioService.getAudioDevices();
        results.push(`ℹ️ Available input devices: ${devices.input.length}`);
        results.push(`ℹ️ Available output devices: ${devices.output.length}`);
      } catch (error) {
        results.push(`❌ Failed to get audio devices: ${error}`);
      }

      setDiagnostics({
        audioContextState: contextState,
        channelsCreated: [channelA ? 'A' : '', channelB ? 'B' : ''].filter(Boolean),
        backendAvailable: status.backendAvailable,
        audioMode: status.audioMode,
        sampleRate: status.sampleRate,
        microphoneActive: audioService.isMicrophoneActive()
      });

    } catch (error) {
      results.push(`❌ Diagnostic error: ${error}`);
    }
    
    setTestResults(results);
  };

  const testChannelPlayback = async (channelId: string) => {
    const results = [...testResults];
    
    try {
      // Create a simple test audio buffer (440Hz sine wave)
      const audioContext = (audioService as any).audioContext;
      if (!audioContext) {
        results.push(`❌ No audio context available for channel ${channelId} test`);
        setTestResults(results);
        return;
      }

      const sampleRate = audioContext.sampleRate;
      const duration = 2; // 2 seconds
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate 440Hz sine wave
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // Low volume
      }

      // Test directly with audio buffer (skip file loading)
      results.push(`ℹ️ Testing channel ${channelId} with generated audio buffer`);
      
      // Manually set the test buffer
      const channel = (audioService as any).channels.get(channelId);
      if (channel) {
        channel.audioBuffer = buffer;
        results.push(`✅ Channel ${channelId} buffer set successfully`);
        
        // Test playback toggle
        const playing = audioService.toggleChannelPlayback(channelId);
        results.push(playing ? `✅ Channel ${channelId} playback started` : `❌ Channel ${channelId} playback failed`);
        
        if (playing) {
          // Stop after 1 second
          setTimeout(() => {
            audioService.toggleChannelPlayback(channelId);
            const updatedResults = [...results, `✅ Channel ${channelId} playback stopped`];
            setTestResults(updatedResults);
          }, 1000);
        }
      } else {
        results.push(`❌ Channel ${channelId} not found after creation`);
      }

    } catch (error) {
      results.push(`❌ Channel ${channelId} test error: ${error}`);
    }
    
    setTestResults(results);
  };

  const fixAudioContext = async () => {
    const results = [...testResults];
    
    try {
      // Force audio context resume
      await audioService.resumeContext();
      results.push('✅ Audio context resume attempted');
      
      // Reinitialize audio service
      const success = await audioService.initialize();
      results.push(success ? '✅ AudioService reinitialized' : '❌ AudioService reinitialize failed');
      
      // Run diagnostics again
      setTimeout(() => runDiagnostics(), 500);
      
    } catch (error) {
      results.push(`❌ Fix attempt failed: ${error}`);
    }
    
    setTestResults(results);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Paper sx={{ p: 3, m: 2, backgroundColor: '#1a1a1a', color: '#ffffff' }}>
      <Typography variant="h6" gutterBottom>
        🔧 Track Channel Diagnostics
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={runDiagnostics} sx={{ mr: 1 }}>
          Run Diagnostics
        </Button>
        <Button variant="outlined" onClick={fixAudioContext} sx={{ mr: 1 }}>
          Fix Audio Context
        </Button>
        <Button variant="outlined" onClick={() => testChannelPlayback('A')} sx={{ mr: 1 }}>
          Test Channel A
        </Button>
        <Button variant="outlined" onClick={() => testChannelPlayback('B')}>
          Test Channel B
        </Button>
      </Box>

      {diagnostics && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>System Status:</Typography>
          <Typography variant="body2">Audio Context: {diagnostics.audioContextState}</Typography>
          <Typography variant="body2">Channels Created: {diagnostics.channelsCreated.join(', ') || 'None'}</Typography>
          <Typography variant="body2">Backend Available: {diagnostics.backendAvailable ? 'Yes' : 'No'}</Typography>
          <Typography variant="body2">Audio Mode: {diagnostics.audioMode}</Typography>
          <Typography variant="body2">Sample Rate: {diagnostics.sampleRate}Hz</Typography>
          <Typography variant="body2">Microphone Active: {diagnostics.microphoneActive ? 'Yes' : 'No'}</Typography>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle1" gutterBottom>Test Results:</Typography>
        {testResults.map((result, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              color: result.startsWith('✅') ? '#4caf50' :
                     result.startsWith('❌') ? '#f44336' :
                     result.startsWith('⚠️') ? '#ff9800' : '#cccccc'
            }}
          >
            {result}
          </Typography>
        ))}
      </Box>

      {diagnostics?.audioContextState === 'suspended' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Audio context is suspended. This is normal on page load. Try clicking "Fix Audio Context" or interact with any audio control to resume it.
        </Alert>
      )}
    </Paper>
  );
};

export default TrackChannelDiagnostics;