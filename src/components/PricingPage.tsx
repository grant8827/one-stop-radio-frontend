import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Chip,
  IconButton
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface PricingPageProps {
  open: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ open, onClose, onGetStarted }) => {
  const [isYearly, setIsYearly] = useState(false);
  
  const features = [
    'AI-Powered Audio Mixing & Beatmatching',
    '4K Ultra-HD Video Streaming',
    'Multi-Platform Broadcasting (YouTube, Twitch, Facebook, etc.)',
    'Real-Time Analytics & Audience Insights',
    'Professional DJ Controls & Effects',
    'Unlimited Streaming Hours',
    'Cloud Storage for Music Library',
    'Live Chat Integration',
    'Custom Branding & Overlays',
    'Mobile App Access',
    'Priority Customer Support',
    'Advanced Audio Processing (EQ, Compressor, Limiter)',
    'Multi-Camera Support',
    'Recording & Replay Features',
    'Automated Playlist Management'
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 50%, #f093fb 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ 
            color: 'white',
            fontWeight: 800,
            fontSize: { xs: '2rem', md: '2.5rem' }
          }}>
            Simple Pricing
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Typography variant="h6" sx={{ 
          color: 'rgba(255, 255, 255, 0.9)',
          mb: 4,
          textAlign: 'center'
        }}>
          One plan, all features included. No hidden fees, no limits.
        </Typography>

        {/* Toggle Switch */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6 }}>
          <Box sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '50px',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}>
            <Typography sx={{ color: 'white', fontWeight: 600 }}>
              Monthly
            </Typography>
            <Switch
              checked={isYearly}
              onChange={(e) => setIsYearly(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: '#FFD700'
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#FFD700'
                }
              }}
            />
            <Typography sx={{ color: 'white', fontWeight: 600 }}>
              Yearly
            </Typography>
            {isYearly && (
              <Chip
                label="SAVE $90"
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)',
                  color: 'black',
                  fontWeight: 700
                }}
              />
            )}
          </Box>
        </Box>

        {/* Single Pricing Card */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Card sx={{
            width: '100%',
            maxWidth: 500,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: isYearly ? '2px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '24px',
            color: 'white'
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                  {isYearly ? 'Yearly Plan' : 'Monthly Plan'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
                  <Typography variant="h2" sx={{ fontWeight: 800 }}>
                    ${isYearly ? '450' : '45'}
                  </Typography>
                  <Typography variant="h6" sx={{ ml: 1, opacity: 0.8 }}>
                    /{isYearly ? 'year' : 'month'}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
                  {isYearly ? '$37.50/month - Save 17%' : 'Billed monthly'}
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={onGetStarted}
                sx={{
                  mb: 3,
                  py: 1.5,
                  background: isYearly 
                    ? 'linear-gradient(135deg, #FFD700 0%, #FFA000 100%)'
                    : 'linear-gradient(135deg, #2196F3 0%, #FF4444 100%)',
                  color: isYearly ? 'black' : 'white',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none'
                }}
              >
                Start Free Trial
              </Button>

              <List dense>
                {features.map((feature, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText 
                      primary={feature}
                      primaryTypographyProps={{ 
                        fontSize: '0.9rem',
                        color: 'white'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="body1" sx={{ color: 'white', mb: 1 }}>
            🎉 Start with a 30-day free trial
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            No credit card required • Cancel anytime • Full access to all features
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default PricingPage;