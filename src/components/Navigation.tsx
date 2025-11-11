import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  MusicNote as MixerIcon,
  AccountCircle,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  AudioFile as AudioEncoderIcon,
  Videocam as VideoStreamIcon,
  Mic as MicIcon,
  BugReport as TestIcon,
  Stream as StreamIcon
} from '@mui/icons-material';
import AudioSettings from './AudioSettings';
import AudioDeviceSettings from './AudioDeviceSettings';

interface NavigationProps {
  currentView: 'dashboard' | 'streams' | 'mixer' | 'encoder' | 'video' | 'device-test' | 'diagnostics';
  onViewChange: (view: 'dashboard' | 'streams' | 'mixer' | 'encoder' | 'video' | 'device-test') => void;
  isStreaming?: boolean;
  listenerCount?: number;
  terminology?: 'dj' | 'radio' | 'broadcaster';
  onLogout?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ 
  currentView, 
  onViewChange, 
  isStreaming = false,
  listenerCount = 0,
  terminology = 'radio',
  onLogout 
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [deviceSettingsOpen, setDeviceSettingsOpen] = useState(false);

  const getTerminologyLabels = () => {
    switch (terminology) {
      case 'dj':
        return {
          dashboard: 'DJ Dashboard',
          streams: 'Stream Manager',
          interface: 'DJ Interface',
          encoder: 'Audio Encoder',
          video: 'Video Stream'
        };
      case 'radio':
        return {
          dashboard: 'Radio Dashboard',
          streams: 'Stream Manager',
          interface: 'Radio Controls',
          encoder: 'Stream Encoder',
          video: 'Video Stream'
        };
      case 'broadcaster':
        return {
          dashboard: 'Broadcaster Dashboard',
          streams: 'Stream Manager',
          interface: 'Broadcast Controls',
          encoder: 'Audio Encoder',
          video: 'Video Stream',
          deviceTest: 'Device Test'
        };
      default:
        return {
          dashboard: 'Radio Dashboard',
          streams: 'Stream Manager',
          interface: 'Radio Controls',
          encoder: 'Stream Encoder',
          video: 'Video Stream',
          deviceTest: 'Device Test'
        };
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout?.();
  };

  return (
    <AppBar 
      position="static" 
      sx={{ 
        backgroundColor: '#1a1a1a',
        borderBottom: '1px solid #333333'
      }}
    >
      <Toolbar>
        {/* Logo and Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 4 }}>
          <MixerIcon sx={{ mr: 1, color: '#ff6b35' }} />
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#ffffff' }}>
            OneStopRadio
          </Typography>
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
          <Button
            variant={currentView === 'dashboard' ? 'contained' : 'text'}
            startIcon={<DashboardIcon />}
            onClick={() => onViewChange('dashboard')}
            sx={{
              color: currentView === 'dashboard' ? '#ffffff' : '#cccccc',
              backgroundColor: currentView === 'dashboard' ? '#ff6b35' : 'transparent',
              '&:hover': {
                backgroundColor: currentView === 'dashboard' ? '#e55a2e' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {getTerminologyLabels().dashboard}
          </Button>

          <Button
            variant={currentView === 'streams' ? 'contained' : 'text'}
            startIcon={<StreamIcon />}
            onClick={() => onViewChange('streams')}
            sx={{
              color: currentView === 'streams' ? '#ffffff' : '#cccccc',
              backgroundColor: currentView === 'streams' ? '#2196f3' : 'transparent',
              '&:hover': {
                backgroundColor: currentView === 'streams' ? '#1976d2' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {getTerminologyLabels().streams}
          </Button>
          
          <Button
            variant={currentView === 'mixer' ? 'contained' : 'text'}
            startIcon={<MixerIcon />}
            onClick={() => onViewChange('mixer')}
            sx={{
              color: currentView === 'mixer' ? '#ffffff' : '#cccccc',
              backgroundColor: currentView === 'mixer' ? '#ff6b35' : 'transparent',
              '&:hover': {
                backgroundColor: currentView === 'mixer' ? '#e55a2e' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {getTerminologyLabels().interface}
          </Button>

          <Button
            variant={currentView === 'encoder' ? 'contained' : 'text'}
            startIcon={<AudioEncoderIcon />}
            onClick={() => onViewChange('encoder')}
            sx={{
              color: currentView === 'encoder' ? '#ffffff' : '#cccccc',
              backgroundColor: currentView === 'encoder' ? '#ffeb3b' : 'transparent',
              '&:hover': {
                backgroundColor: currentView === 'encoder' ? '#fff176' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {getTerminologyLabels().encoder}
          </Button>

          <Button
            variant={currentView === 'video' ? 'contained' : 'text'}
            startIcon={<VideoStreamIcon />}
            onClick={() => onViewChange('video')}
            sx={{
              color: currentView === 'video' ? '#ffffff' : '#cccccc',
              backgroundColor: currentView === 'video' ? '#e91e63' : 'transparent',
              '&:hover': {
                backgroundColor: currentView === 'video' ? '#c2185b' : 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            {getTerminologyLabels().video}
          </Button>

          {process.env.NODE_ENV === 'development' && (
            <Button
              variant={currentView === 'device-test' ? 'contained' : 'text'}
              startIcon={<TestIcon />}
              onClick={() => onViewChange('device-test')}
              sx={{
                color: currentView === 'device-test' ? '#ffffff' : '#cccccc',
                backgroundColor: currentView === 'device-test' ? '#9c27b0' : 'transparent',
                '&:hover': {
                  backgroundColor: currentView === 'device-test' ? '#7b1fa2' : 'rgba(255, 255, 255, 0.1)'
                }
              }}
            >
              {getTerminologyLabels().deviceTest}
            </Button>
          )}
        </Box>

        {/* Status Indicators */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          
          {/* Stream Status */}
          {isStreaming && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label="🔴 LIVE"
                size="small"
                sx={{
                  backgroundColor: '#ff4444',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  animation: 'pulse 2s infinite'
                }}
              />
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                {listenerCount.toLocaleString()} listeners
              </Typography>
            </Box>
          )}

          {/* Notifications */}
          <IconButton sx={{ color: '#cccccc' }}>
            <NotificationsIcon />
          </IconButton>

          {/* Audio Device Settings */}
          <IconButton 
            sx={{ 
              color: '#cccccc',
              backgroundColor: deviceSettingsOpen ? 'rgba(233, 30, 99, 0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(233, 30, 99, 0.1)'
              }
            }}
            onClick={() => setDeviceSettingsOpen(true)}
            title="Audio Device Settings"
          >
            <MicIcon />
          </IconButton>

          {/* Audio Settings */}
          <IconButton 
            sx={{ 
              color: '#cccccc',
              backgroundColor: audioSettingsOpen ? 'rgba(255, 107, 53, 0.2)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(255, 107, 53, 0.1)'
              }
            }}
            onClick={() => setAudioSettingsOpen(true)}
            title="Audio Settings"
          >
            <SettingsIcon />
          </IconButton>

          {/* User Menu */}
          <IconButton
            size="large"
            aria-label="account of current user"
            aria-controls="menu-appbar"
            aria-haspopup="true"
            onClick={handleMenu}
            sx={{ color: '#cccccc' }}
          >
            <Avatar sx={{ width: 32, height: 32, backgroundColor: '#ff6b35' }}>
              DJ
            </Avatar>
          </IconButton>
          
          <Menu
            id="menu-appbar"
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            sx={{
              '& .MuiPaper-root': {
                backgroundColor: '#2a2a2a',
                border: '1px solid #404040',
                minWidth: 200
              }
            }}
          >
            <MenuItem onClick={handleClose} sx={{ color: '#ffffff' }}>
              <AccountCircle sx={{ mr: 2 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleClose} sx={{ color: '#ffffff' }}>
              <SettingsIcon sx={{ mr: 2 }} />
              Settings
            </MenuItem>
            <Divider sx={{ backgroundColor: '#404040' }} />
            <MenuItem onClick={handleLogout} sx={{ color: '#ff6b6b' }}>
              <LogoutIcon sx={{ mr: 2 }} />
              Logout
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
        `}
      </style>
      
      {/* Audio Device Settings Dialog */}
      <AudioDeviceSettings 
        open={deviceSettingsOpen} 
        onClose={() => setDeviceSettingsOpen(false)} 
      />
      
      {/* Audio Settings Dialog */}
      <AudioSettings 
        open={audioSettingsOpen} 
        onClose={() => setAudioSettingsOpen(false)} 
      />
    </AppBar>
  );
};

export default Navigation;