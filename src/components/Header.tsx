import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, IconButton } from '@mui/material';
import RadioIcon from '@mui/icons-material/Radio';
import MenuIcon from '@mui/icons-material/Menu';
import { Container } from 'react-bootstrap';

const Header: React.FC = () => {
  return (
    <AppBar position="static" elevation={1} sx={{ 
      background: 'linear-gradient(90deg, #1976d2 0%, #1565c0 100%)'
    }}>
      <Container>
        <Toolbar sx={{ px: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <RadioIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography 
              variant="h5" 
              component="div" 
              sx={{ 
                fontWeight: 'bold',
                letterSpacing: '0.5px'
              }}
            >
              OneStopRadio
            </Typography>
          </Box>
          
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2 }}>
            <Button color="inherit" sx={{ textTransform: 'none' }}>
              Features
            </Button>
            <Button color="inherit" sx={{ textTransform: 'none' }}>
              Pricing
            </Button>
            <Button color="inherit" sx={{ textTransform: 'none' }}>
              Support
            </Button>
            <Button 
              variant="outlined" 
              color="inherit" 
              sx={{ 
                textTransform: 'none',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Demo
            </Button>
          </Box>
          
          <IconButton
            color="inherit"
            sx={{ display: { xs: 'flex', md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;