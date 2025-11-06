import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button, Alert, LinearProgress } from '@mui/material';
import { audioService } from '../services/AudioService';

interface EncodingDiagnostics {
  isEncoding: boolean;
  codecSupport: { [key: string]: boolean };
  chunkCount: number;
  estimatedBitrate: number;
}

const AudioEncodingDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<EncodingDiagnostics | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Update diagnostics every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioService) {
        const status = audioService.getEncodingStatus();
        setDiagnostics(status);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const runEncodingTest = async () => {
    setIsTestRunning(true);
    setTestResults([]);
    
    const results: string[] = [];

    try {
      // Test 1: Initialize AudioService
      results.push('🔧 Initializing AudioService...');
      setTestResults([...results]);
      
      const initialized = await audioService.initialize();
      if (initialized) {
        results.push('✅ AudioService initialized successfully');
      } else {
        results.push('❌ Failed to initialize AudioService');
      }
      setTestResults([...results]);

      // Test 2: Check codec support
      results.push('🎵 Checking codec support...');
      setTestResults([...results]);
      
      const status = audioService.getEncodingStatus();
      const supportedCodecs = Object.entries(status.codecSupport)
        .filter(([_, supported]) => supported)
        .map(([codec, _]) => codec);
      
      if (supportedCodecs.length > 0) {
        results.push(`✅ Supported codecs: ${supportedCodecs.join(', ')}`);
      } else {
        results.push('❌ No supported codecs found');
      }
      setTestResults([...results]);

      // Test 3: Test streaming with encoding
      results.push('📡 Testing audio streaming with encoding...');
      setTestResults([...results]);
      
      const streamConfig = {
        sampleRate: 48000,
        bitRate: 128000,
        channels: 2
      };
      
      const stream = audioService.startStreaming(streamConfig);
      if (stream) {
        results.push('✅ Audio streaming started with encoding');
        
        // Wait 3 seconds then stop
        setTimeout(() => {
          audioService.stopStreaming();
          results.push('🛑 Audio streaming stopped');
          setTestResults([...results]);
        }, 3000);
      } else {
        results.push('❌ Failed to start audio streaming');
      }
      setTestResults([...results]);

      // Test 4: Audio level detection
      results.push('📊 Testing audio level detection...');
      setTestResults([...results]);
      
      const audioLevels = audioService.getAudioLevels();
      if (audioLevels) {
        results.push('✅ Audio level detection working');
      } else {
        results.push('⚠️ Audio level detection not available');
      }
      setTestResults([...results]);

    } catch (error) {
      results.push(`❌ Test failed: ${error}`);
      setTestResults([...results]);
    }

    setIsTestRunning(false);
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        border: '1px solid #ffeb3b'
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ color: '#ffeb3b' }}>
        Audio Encoding Diagnostics
      </Typography>

      {/* Real-time Status */}
      {diagnostics && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1 }}>
            Real-time Status
          </Typography>
          <Box sx={{ pl: 2 }}>
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 0.5 }}>
              Encoding Active: {diagnostics.isEncoding ? '✅ Yes' : '❌ No'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 0.5 }}>
              Chunks Encoded: {diagnostics.chunkCount}
            </Typography>
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 0.5 }}>
              Target Bitrate: {Math.round(diagnostics.estimatedBitrate / 1000)}kbps
            </Typography>
          </Box>
        </Box>
      )}

      {/* Codec Support */}
      {diagnostics && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1 }}>
            Browser Codec Support
          </Typography>
          <Box sx={{ pl: 2 }}>
            {Object.entries(diagnostics.codecSupport).map(([codec, supported]) => (
              <Typography 
                key={codec} 
                variant="body2" 
                sx={{ 
                  color: supported ? '#4caf50' : '#f44336', 
                  mb: 0.5,
                  fontFamily: 'monospace'
                }}
              >
                {supported ? '✅' : '❌'} {codec}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {/* Test Button */}
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={runEncodingTest}
          disabled={isTestRunning}
          sx={{
            backgroundColor: '#ffeb3b',
            color: '#000000',
            '&:hover': {
              backgroundColor: '#fff176'
            }
          }}
        >
          {isTestRunning ? 'Running Tests...' : 'Run Encoding Test'}
        </Button>
      </Box>

      {/* Test Progress */}
      {isTestRunning && (
        <LinearProgress 
          sx={{ 
            mb: 2, 
            backgroundColor: '#444',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#ffeb3b'
            }
          }} 
        />
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#ffffff', mb: 1 }}>
            Test Results
          </Typography>
          <Box 
            sx={{ 
              backgroundColor: '#1a1a1a', 
              borderRadius: '4px', 
              p: 2,
              maxHeight: '200px',
              overflowY: 'auto'
            }}
          >
            {testResults.map((result, index) => (
              <Typography 
                key={index}
                variant="body2" 
                sx={{ 
                  color: '#cccccc',
                  fontFamily: 'monospace',
                  mb: 0.5
                }}
              >
                {result}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {/* Warnings */}
      {diagnostics && !Object.values(diagnostics.codecSupport).some(Boolean) && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          No audio codecs are supported by this browser. Audio encoding may not work properly.
        </Alert>
      )}
    </Paper>
  );
};

export default AudioEncodingDiagnostics;