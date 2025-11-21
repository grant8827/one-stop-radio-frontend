import React from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

interface TrialExpiredBlockerProps {
  onUpgrade: () => void;
}

const TrialExpiredBlocker: React.FC<TrialExpiredBlockerProps> = ({ onUpgrade }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Paper
        sx={{
          p: 6,
          maxWidth: 600,
          textAlign: 'center',
          bgcolor: '#2a2a2a',
          borderRadius: 4,
          border: '2px solid #ff6b35',
        }}
      >
        <LockIcon sx={{ fontSize: 80, color: '#ff6b35', mb: 3 }} />
        
        <Typography variant="h3" fontWeight="bold" color="#fff" gutterBottom>
          Your 30-Day Trial Has Ended
        </Typography>
        
        <Typography variant="h6" color="#999" mb={4}>
          Thank you for trying OneStopRadio! To continue using all the amazing features, 
          please choose a plan that fits your needs.
        </Typography>
        
        <Box sx={{ 
          bgcolor: '#1a1a1a', 
          p: 3, 
          borderRadius: 2, 
          mb: 4,
          border: '1px solid #444'
        }}>
          <Typography variant="body1" color="#fff" mb={2}>
            During your trial, you had access to:
          </Typography>
          <Typography variant="body2" color="#4CAF50" mb={1}>
            ✓ Full Audio Player & Mixer
          </Typography>
          <Typography variant="body2" color="#4CAF50" mb={1}>
            ✓ Unlimited Music Library & Instant Play
          </Typography>
          <Typography variant="body2" color="#4CAF50" mb={1}>
            ✓ Multi-Platform Streaming
          </Typography>
          <Typography variant="body2" color="#4CAF50" mb={1}>
            ✓ Advanced Effects & Analytics
          </Typography>
          <Typography variant="body2" color="#4CAF50">
            ✓ All Premium Features
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          size="large"
          onClick={onUpgrade}
          sx={{
            bgcolor: '#ff6b35',
            color: '#fff',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            py: 2,
            px: 6,
            borderRadius: 3,
            '&:hover': {
              bgcolor: '#e55a2e',
            },
          }}
        >
          Choose Your Plan
        </Button>
        
        <Typography variant="caption" color="#666" display="block" mt={3}>
          Plans start at just $15/month • Cancel anytime
        </Typography>
      </Paper>
    </Box>
  );
};

export default TrialExpiredBlocker;
