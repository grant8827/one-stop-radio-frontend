import React, { useState } from 'react';
import { 
  TextField, 
  Button, 
  Typography, 
  Box, 
  Paper,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  Menu,
  MenuItem,
  useScrollTrigger,
  Container
} from '@mui/material';
import {
  Radio as RadioIcon,
  Mic as MicIcon,
  Videocam as VideocamIcon,
  Share as ShareIcon,
  PlayArrow as PlayIcon,
  Analytics as AnalyticsIcon,
  Verified as VerifiedIcon,
  ContentCopy as CopyIcon,
  Launch as LaunchIcon,
  Menu as MenuIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  ContactMail as ContactIcon,
  Login as LoginIcon
} from '@mui/icons-material';

const HomePage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [copyText, setCopyText] = useState('Copy URL');
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);

  // Scroll trigger for navbar background
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  });

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    handleMobileMenuClose();
  };

  // Modern radio streaming URLs
  const radioStreams = [
    { 
      name: 'OneStopRadio Live Stream', 
      url: 'https://onestopradio.stream/live',
      format: 'HLS',
      quality: '320kbps'
    },
    { 
      name: 'OneStopRadio Mobile', 
      url: 'https://onestopradio.stream/mobile',
      format: 'AAC',
      quality: '128kbps'
    },
    { 
      name: 'OneStopRadio HD', 
      url: 'https://onestopradio.stream/hd',
      format: 'FLAC',
      quality: '1411kbps'
    }
  ];

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyText('Copied!');
      setShowAlert(true);
      setTimeout(() => {
        setCopyText('Copy URL');
        setShowAlert(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const features = [
    {
      icon: <MicIcon sx={{ fontSize: 48, color: '#00D4FF' }} />,
      title: 'AI-Powered Mixing',
      description: 'Advanced audio mixing with AI-assisted beatmatching and seamless transitions',
      gradient: 'linear-gradient(135deg, #00D4FF 0%, #5928E6 100%)'
    },
    {
      icon: <VideocamIcon sx={{ fontSize: 48, color: '#FF6B9D' }} />,
      title: '4K Video Streaming',
      description: 'Ultra-HD video streaming with real-time effects and multi-camera support',
      gradient: 'linear-gradient(135deg, #FF6B9D 0%, #C850C0 100%)'
    },
    {
      icon: <ShareIcon sx={{ fontSize: 48, color: '#4ECDC4' }} />,
      title: 'Global Broadcasting',
      description: 'Reach audiences worldwide with simultaneous multi-platform streaming',
      gradient: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
    },
    {
      icon: <AnalyticsIcon sx={{ fontSize: 48, color: '#FFD93D' }} />,
      title: 'Live Analytics',
      description: 'Real-time audience insights, engagement metrics, and performance analytics',
      gradient: 'linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)'
    }
  ];

  const socialPlatforms = [
    { name: 'YouTube', color: '#FF0000', verified: true },
    { name: 'Twitch', color: '#9146FF', verified: true },
    { name: 'Facebook', color: '#1877F2', verified: true },
    { name: 'Instagram', color: '#E4405F', verified: true },
    { name: 'TikTok', color: '#000000', verified: true },
    { name: 'Spotify', color: '#1DB954', verified: true }
  ];

  return (
    <>
      <Snackbar
        open={showAlert}
        autoHideDuration={2000}
        onClose={() => setShowAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled">
          Radio URL copied to clipboard!
        </Alert>
      </Snackbar>

      {/* Modern Navigation Bar */}
      <AppBar 
        elevation={0}
        sx={{ 
          background: trigger 
            ? 'rgba(255, 255, 255, 0.95)' 
            : 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderBottom: trigger 
            ? '1px solid rgba(0, 0, 0, 0.1)' 
            : '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'all 0.3s ease-in-out',
          position: 'fixed',
          top: 0,
          zIndex: 1100
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <RadioIcon sx={{ 
              fontSize: 32, 
              color: trigger ? '#00D4FF' : 'white',
              mr: 1,
              transition: 'color 0.3s ease'
            }} />
            <Typography 
              variant="h6" 
              component="div" 
              sx={{ 
                fontWeight: 700,
                color: trigger ? '#1a1a1a' : 'white',
                fontSize: '1.5rem',
                transition: 'color 0.3s ease'
              }}
            >
              OneStopRadio
            </Typography>
          </Box>

          {/* Desktop Navigation */}
          <Box sx={{ 
            display: { xs: 'none', md: 'flex' }, 
            alignItems: 'center', 
            gap: 4 
          }}>
            <Button
              color="inherit"
              startIcon={<HomeIcon />}
              onClick={() => scrollToSection('home')}
              sx={{ 
                color: trigger ? '#1a1a1a' : 'white',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  background: trigger 
                    ? 'rgba(0, 212, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Home
            </Button>
            <Button
              color="inherit"
              startIcon={<InfoIcon />}
              onClick={() => scrollToSection('features')}
              sx={{ 
                color: trigger ? '#1a1a1a' : 'white',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  background: trigger 
                    ? 'rgba(0, 212, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Features
            </Button>
            <Button
              color="inherit"
              startIcon={<RadioIcon />}
              onClick={() => scrollToSection('streams')}
              sx={{ 
                color: trigger ? '#1a1a1a' : 'white',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  background: trigger 
                    ? 'rgba(0, 212, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Live Streams
            </Button>
            <Button
              color="inherit"
              startIcon={<ContactIcon />}
              onClick={() => scrollToSection('contact')}
              sx={{ 
                color: trigger ? '#1a1a1a' : 'white',
                fontWeight: 500,
                textTransform: 'none',
                '&:hover': {
                  background: trigger 
                    ? 'rgba(0, 212, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              Contact
            </Button>
            <Button
              variant="contained"
              startIcon={<LoginIcon />}
              onClick={onLogin}
              sx={{
                background: 'linear-gradient(135deg, #00D4FF 0%, #5928E6 100%)',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                px: 3,
                py: 1,
                borderRadius: '25px',
                boxShadow: '0 4px 15px rgba(89, 40, 230, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00B8E6 0%, #4919C7 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(89, 40, 230, 0.4)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Launch Studio
            </Button>
          </Box>

          {/* Mobile Menu Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={handleMobileMenuOpen}
              sx={{ 
                color: trigger ? '#1a1a1a' : 'white',
                '&:hover': {
                  background: trigger 
                    ? 'rgba(0, 212, 255, 0.1)' 
                    : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          sx={{
            '& .MuiPaper-root': {
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '12px',
              mt: 1,
              minWidth: 200
            }
          }}
        >
          <MenuItem onClick={() => scrollToSection('home')}>
            <HomeIcon sx={{ mr: 2, color: '#00D4FF' }} />
            Home
          </MenuItem>
          <MenuItem onClick={() => scrollToSection('features')}>
            <InfoIcon sx={{ mr: 2, color: '#00D4FF' }} />
            Features
          </MenuItem>
          <MenuItem onClick={() => scrollToSection('streams')}>
            <RadioIcon sx={{ mr: 2, color: '#00D4FF' }} />
            Live Streams
          </MenuItem>
          <MenuItem onClick={() => scrollToSection('contact')}>
            <ContactIcon sx={{ mr: 2, color: '#00D4FF' }} />
            Contact
          </MenuItem>
          <MenuItem onClick={onLogin}>
            <LoginIcon sx={{ mr: 2, color: '#5928E6' }} />
            Launch Studio
          </MenuItem>
        </Menu>
      </AppBar>

      {/* Modern Hero Section with Glassmorphism */}
      <Box 
        id="home"
        sx={{ 
          minHeight: '100vh',
          background: `
            radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(120, 219, 255, 0.3) 0%, transparent 50%),
            linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)
          `,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          pt: 10 // Add padding top for the fixed navbar
        }}>
        {/* Animated Background Elements */}
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 60%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)
          `,
          animation: 'float 6s ease-in-out infinite'
        }} />
        
        <Container sx={{ position: 'relative', zIndex: 2, pt: 8, pb: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'center', gap: 4 }}>
            <Box sx={{ flex: { xs: 'none', lg: '1 1 58%' }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {/* Modern Logo and Title */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px',
                  p: 2,
                  mr: 3,
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <RadioIcon sx={{ fontSize: 50, color: '#00D4FF' }} />
                </Box>
                <Typography variant="h1" component="h1" sx={{ 
                  fontWeight: 900, 
                  fontSize: { xs: '2.5rem', md: '4rem' },
                  background: 'linear-gradient(135deg, #fff 0%, #00D4FF 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-2px'
                }}>
                  OneStopRadio
                </Typography>
              </Box>
              
              <Typography variant="h3" component="h2" sx={{ 
                mb: 3, 
                fontWeight: 600,
                fontSize: { xs: '1.5rem', md: '2.5rem' },
                lineHeight: 1.2
              }}>
                The Future of Live Broadcasting
              </Typography>
              
              <Typography variant="h6" sx={{ 
                mb: 5, 
                opacity: 0.95, 
                lineHeight: 1.8,
                fontSize: { xs: '1rem', md: '1.25rem' },
                maxWidth: '600px'
              }}>
                Experience next-generation streaming technology with AI-powered mixing, 
                ultra-HD video, and global reach. Your audience awaits.
              </Typography>

              {/* Social Platform Chips */}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 4 }}>
                {socialPlatforms.map((platform) => (
                  <Chip 
                    key={platform.name}
                    label={platform.name}
                    icon={platform.verified ? <VerifiedIcon sx={{ fontSize: 18 }} /> : undefined}
                    variant="outlined"
                    sx={{ 
                      color: 'white',
                      borderColor: platform.color,
                      background: `${platform.color}20`,
                      backdropFilter: 'blur(10px)',
                      '&:hover': { 
                        borderColor: platform.color,
                        background: `${platform.color}40`,
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Box>

              {/* Radio Stream URLs */}
              <Box id="streams" sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  🔴 Live Radio Streams Available Now
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {radioStreams.map((stream, index) => (
                    <Paper
                      key={index}
                      elevation={0}
                      sx={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 600, color: 'white' }}>
                          {stream.name}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.8, color: 'white' }}>
                          {stream.format} • {stream.quality} • {stream.url}
                        </Typography>
                      </Box>
                      <Tooltip title={copyText}>
                        <IconButton
                          onClick={() => handleCopyUrl(stream.url)}
                          sx={{
                            color: 'white',
                            background: 'rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.2)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                    </Paper>
                  ))}
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ flex: { xs: 'none', lg: '1 1 42%' } }}>
              {/* Modern Glassmorphism Login Card */}
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 5, 
                  mt: { xs: 4, lg: 0 },
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                }}
              >
                <Box component="form" noValidate>
                  <Typography variant="h4" component="h3" sx={{ 
                    textAlign: 'center', 
                    mb: 4,
                    color: 'white',
                    fontWeight: 700
                  }}>
                    Launch Your Studio
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '12px',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                      }
                    }}
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '12px',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                      }
                    }}
                  />
                  
                  <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    sx={{ 
                      mt: 4, 
                      py: 2,
                      background: 'linear-gradient(135deg, #00D4FF 0%, #5928E6 100%)',
                      borderRadius: '12px',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 20px rgba(89, 40, 230, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #00B8E6 0%, #4919C7 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 25px rgba(89, 40, 230, 0.6)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                    onClick={onLogin}
                    startIcon={<LaunchIcon />}
                  >
                    Enter DJ Studio
                  </Button>
                  
                  <Typography variant="body2" sx={{ 
                    textAlign: 'center', 
                    mt: 3, 
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.9rem'
                  }}>
                    ✨ Free forever • No limits • Professional features included
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Modern Features Section */}
      <Box id="features" sx={{ py: 10, background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}>
        <Container>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography variant="h2" component="h2" sx={{ 
              mb: 3,
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Powered by Next-Gen Technology
            </Typography>
            <Typography variant="h6" sx={{ 
              color: 'text.secondary',
              maxWidth: '700px',
              mx: 'auto',
              fontSize: '1.2rem',
              lineHeight: 1.6
            }}>
              Revolutionary features that redefine what's possible in live broadcasting
            </Typography>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 4 }}>
            {features.map((feature, index) => (
              <Box key={index}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    background: 'white',
                    borderRadius: '20px',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': { 
                      transform: 'translateY(-8px) scale(1.02)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
                      border: '1px solid rgba(226, 232, 240, 0.4)'
                    },
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: feature.gradient
                    }}
                  />
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box sx={{ 
                      mb: 3,
                      p: 2,
                      borderRadius: '16px',
                      background: `${feature.gradient}15`,
                      display: 'inline-block'
                    }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" component="h3" sx={{ 
                      mb: 2, 
                      fontWeight: 700,
                      color: '#1e293b'
                    }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      lineHeight: 1.6
                    }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Modern CTA Section */}
      <Box 
        id="contact"
        sx={{ 
          py: 10,
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(89, 40, 230, 0.1) 0%, transparent 50%)
          `
        }} />
        
        <Container sx={{ position: 'relative', zIndex: 2 }}>
          <Box sx={{ textAlign: 'center', maxWidth: '800px', mx: 'auto' }}>
            <Typography variant="h2" component="h2" sx={{ 
              mb: 3,
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3.5rem' }
            }}>
              Ready to Transform Broadcasting?
            </Typography>
            <Typography variant="h6" sx={{ 
              mb: 6, 
              opacity: 0.9,
              fontSize: '1.3rem',
              lineHeight: 1.6
            }}>
              Join over 50,000 creators already revolutionizing live streaming with OneStopRadio
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={onLogin}
                startIcon={<PlayIcon />}
                sx={{ 
                  px: 6, 
                  py: 2.5,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #00D4FF 0%, #5928E6 100%)',
                  borderRadius: '50px',
                  textTransform: 'none',
                  boxShadow: '0 8px 30px rgba(89, 40, 230, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00B8E6 0%, #4919C7 100%)',
                    transform: 'translateY(-3px)',
                    boxShadow: '0 12px 40px rgba(89, 40, 230, 0.6)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Start Broadcasting Free
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                startIcon={<RadioIcon />}
                sx={{ 
                  px: 6, 
                  py: 2.5,
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  borderRadius: '50px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-3px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Explore Features
              </Button>
            </Box>
            
            <Typography variant="body2" sx={{ 
              mt: 4, 
              opacity: 0.7,
              fontSize: '1rem'
            }}>
              🚀 No setup fees • 💡 Unlimited creativity • 🌍 Global reach
            </Typography>
          </Box>
        </Container>
      </Box>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(2deg); }
        }
      `}</style>
    </>
  );
};

export default HomePage;