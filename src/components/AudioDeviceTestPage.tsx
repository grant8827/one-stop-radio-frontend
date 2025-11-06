import React, { useState } from 'react';
import { Container, Box, Typography, Button, Alert } from '@mui/material';
import { Mic as MicIcon } from '@mui/icons-material';
import AudioDeviceSettings from './AudioDeviceSettings';

/**
 * Test page for AudioDeviceSettings component
 * This is for testing device selection functionality
 */
const AudioDeviceTestPage: React.FC = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testBrowserSupport = () => {
    const results = [];
    
    // Test Web Audio API
    if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
      results.push('✅ Web Audio API supported');
    } else {
      results.push('❌ Web Audio API not supported');
    }

    // Test MediaDevices API
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      results.push('✅ MediaDevices API supported');
    } else {
      results.push('❌ MediaDevices API not supported');
    }

    // Test enumerateDevices
    if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
      results.push('✅ Device enumeration supported');
    } else {
      results.push('❌ Device enumeration not supported');
    }

    // Test MediaRecorder
    if (typeof MediaRecorder !== 'undefined') {
      results.push('✅ MediaRecorder supported');
      
      // Check codec support
      const codecs = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
      ];
      
      codecs.forEach(codec => {
        if (MediaRecorder.isTypeSupported(codec)) {
          results.push(`✅ Codec supported: ${codec}`);
        } else {
          results.push(`❌ Codec not supported: ${codec}`);
        }
      });
    } else {
      results.push('❌ MediaRecorder not supported');
    }

    setTestResults(results);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Audio Device Settings Test
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          This page is for testing the AudioDeviceSettings component and verifying 
          microphone device selection functionality.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<MicIcon />}
          onClick={() => setSettingsOpen(true)}
          sx={{ backgroundColor: '#e91e63' }}
        >
          Open Device Settings
        </Button>
        
        <Button
          variant="outlined"
          onClick={testBrowserSupport}
        >
          Test Browser Support
        </Button>
        
        <Button
          variant="text"
          onClick={() => setTestResults([])}
        >
          Clear Results
        </Button>
      </Box>

      {testResults.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Test Results:
          </Typography>
          <Box sx={{ 
            backgroundColor: '#1a1a1a', 
            p: 2, 
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            {testResults.map((result, index) => (
              <Typography 
                key={index} 
                component="div" 
                sx={{ 
                  color: result.includes('✅') ? '#4caf50' : 
                         result.includes('❌') ? '#f44336' : '#fff',
                  mb: 0.5
                }}
              >
                {result}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Testing Instructions:
        </Typography>
        <Typography variant="body2" component="div">
          1. Click "Test Browser Support" to verify your browser capabilities<br/>
          2. Click "Open Device Settings" to test the device selection dialog<br/>
          3. Try selecting different microphone devices<br/>
          4. Test microphone functionality with the "Test Microphone" button<br/>
          5. Apply settings and verify they persist
        </Typography>
      </Alert>

      <Alert severity="warning">
        <Typography variant="body2">
          <strong>Note:</strong> This test page requires microphone permissions. 
          Make sure to allow access when prompted by the browser.
        </Typography>
      </Alert>

      <AudioDeviceSettings 
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          addTestResult('Audio device settings closed');
        }}
      />
    </Container>
  );
};

export default AudioDeviceTestPage;