import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Paper,
  Chip
} from '@mui/material';
import {
  Radio as RadioIcon,
  Mic as MicIcon,
  Videocam as VideocamIcon,
  Share as ShareIcon,
  PlayArrow as PlayIcon,
  Equalizer as EqualizerIcon
} from '@mui/icons-material';

const HomePage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const features = [
    {
      icon: <MicIcon sx={{ fontSize: 40, color: '#1976d2' }} />,
      title: 'Live Audio Mixing',
      description: 'Professional-grade audio mixing with dual channels, EQ controls, and crossfader'
    },
    {
      icon: <VideocamIcon sx={{ fontSize: 40, color: '#d32f2f' }} />,
      title: 'Video Streaming',
      description: 'Stream live video alongside your audio to engage your audience visually'
    },
    {
      icon: <ShareIcon sx={{ fontSize: 40, color: '#388e3c' }} />,
      title: 'Multi-Platform Broadcasting',
      description: 'Stream simultaneously to YouTube, Twitch, Facebook, and more platforms'
    },
    {
      icon: <EqualizerIcon sx={{ fontSize: 40, color: '#f57c00' }} />,
      title: 'Real-time Analytics',
      description: 'Monitor listener counts, chat messages, and stream quality in real-time'
    }
  ];

  const socialPlatforms = ['YouTube', 'Twitch', 'Facebook', 'Instagram', 'TikTok'];

  return (
    <>
      {/* Hero Section */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        color: 'white',
        py: 8,
        mb: 6
      }}>
        <Container>
          <Row>
            <Col md={8} className="d-flex flex-column justify-content-center">
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RadioIcon sx={{ fontSize: 60, mr: 2 }} />
                <Typography variant="h1" component="h1" sx={{ 
                  fontWeight: 'bold', 
                  fontSize: { xs: '2.5rem', md: '3.5rem' }
                }}>
                  OneStopRadio
                </Typography>
              </Box>
              <Typography variant="h4" component="h2" sx={{ mb: 3, fontWeight: 300 }}>
                Your Complete Live DJ & Streaming Platform
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9, lineHeight: 1.6 }}>
                Transform your passion into professional broadcasts. Mix audio, stream video, 
                and connect with audiences across multiple platforms - all from your browser.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {socialPlatforms.map((platform) => (
                  <Chip 
                    key={platform}
                    label={platform}
                    variant="outlined"
                    sx={{ 
                      color: 'white', 
                      borderColor: 'rgba(255,255,255,0.5)',
                      '&:hover': { borderColor: 'white' }
                    }}
                  />
                ))}
              </Box>
            </Col>
            <Col md={4}>
              <Paper elevation={6} sx={{ p: 4, mt: { xs: 4, md: 0 } }}>
                <Box component="form" noValidate>
                  <Typography variant="h5" component="h3" sx={{ 
                    textAlign: 'center', 
                    mb: 3,
                    color: 'primary.main',
                    fontWeight: 'bold'
                  }}>
                    Start Broadcasting Today
                  </Typography>
                  <TextField
                    label="Email Address"
                    type="email"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <TextField
                    label="Password"
                    type="password"
                    variant="outlined"
                    fullWidth
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    sx={{ mt: 3, py: 1.5 }}
                    onClick={onLogin}
                    startIcon={<PlayIcon />}
                  >
                    Launch DJ Studio
                  </Button>
                  <Typography variant="body2" sx={{ 
                    textAlign: 'center', 
                    mt: 2, 
                    color: 'text.secondary' 
                  }}>
                    Free to start • No credit card required
                  </Typography>
                </Box>
              </Paper>
            </Col>
          </Row>
        </Container>
      </Box>

      {/* Features Section */}
      <Container className="mb-5">
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" sx={{ 
            mb: 2,
            fontWeight: 'bold',
            color: 'primary.main'
          }}>
            Everything You Need to Go Live
          </Typography>
          <Typography variant="h6" sx={{ 
            color: 'text.secondary',
            maxWidth: '600px',
            mx: 'auto'
          }}>
            Professional broadcasting tools designed for creators, DJs, and live streamers
          </Typography>
        </Box>
        
        <Row>
          {features.map((feature, index) => (
            <Col xs={12} sm={6} md={3} key={index} className="mb-4">
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  height: '100%',
                  transition: 'transform 0.2s',
                  '&:hover': { 
                    transform: 'translateY(-4px)',
                    elevation: 4
                  }
                }}
              >
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" component="h3" sx={{ mb: 2, fontWeight: 'bold' }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </Paper>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Call to Action Section */}
      <Box sx={{ 
        bgcolor: 'grey.50', 
        py: 8 
      }}>
        <Container>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" component="h2" sx={{ 
              mb: 2,
              fontWeight: 'bold',
              color: 'primary.main'
            }}>
              Ready to Start Your Radio Journey?
            </Typography>
            <Typography variant="h6" sx={{ 
              mb: 4, 
              color: 'text.secondary',
              maxWidth: '500px',
              mx: 'auto'
            }}>
              Join thousands of creators already broadcasting with OneStopRadio
            </Typography>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={onLogin}
              startIcon={<RadioIcon />}
              sx={{ 
                px: 4, 
                py: 2,
                fontSize: '1.1rem'
              }}
            >
              Get Started Free
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default HomePage;