import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Avatar,
  IconButton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Radio as RadioIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  PlayArrow as PlayArrowIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  CloudUpload as CloudUploadIcon,
  Videocam as VideoStreamIcon,
  Tune as TuneIcon,
  Radio as BroadcastIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitchIcon from '@mui/icons-material/Tv';

// Import our services and components
import { webSocketService } from '../services/WebSocketService';
import { apiService } from '../services/APIService';
import DashboardCustomization, { DashboardSettings } from './DashboardCustomization';
import type { ListenerStats } from '../services/WebSocketService';
import type { Station, StreamSession } from '../services/APIService';

interface DashboardStats {
  totalListeners: number;
  peakListeners: number;
  streamUptime: number;
  totalSessions: number;
  averageSessionLength: number;
  socialConnections: {
    youtube: boolean;
    twitch: boolean;
    facebook: boolean;
  };
}

interface RecentActivity {
  id: string;
  type: 'stream_start' | 'stream_end' | 'listener_peak' | 'social_connect';
  message: string;
  timestamp: Date;
  severity: 'info' | 'success' | 'warning' | 'error';
}

interface DashboardProps {
  onViewChange?: (view: 'dashboard' | 'mixer' | 'encoder' | 'video' | 'device-test') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalListeners: 0,
    peakListeners: 0,
    streamUptime: 0,
    totalSessions: 0,
    averageSessionLength: 0,
    socialConnections: {
      youtube: false,
      twitch: false,
      facebook: false
    }
  });

  const [station, setStation] = useState<Station | null>(null);
  const [recentSessions, setRecentSessions] = useState<StreamSession[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [userLogo, setUserLogo] = useState<string | null>(null);
  const [logoMenuAnchor, setLogoMenuAnchor] = useState<null | HTMLElement>(null);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState<null | HTMLElement>(null);

  // Default dashboard settings
  const [dashboardSettings, setDashboardSettings] = useState<DashboardSettings>({
    theme: 'dark',
    accentColor: '#ff6b35',
    layout: {
      statsCards: true,
      stationInfo: true,
      recentActivity: true,
      sessionHistory: true,
      quickActions: true,
      socialStatus: true
    },
    widgets: [
      { id: 'stats', name: 'Statistics Overview', enabled: true, position: 1, size: 'large' },
      { id: 'activity', name: 'Recent Activity', enabled: true, position: 2, size: 'medium' },
      { id: 'sessions', name: 'Session History', enabled: true, position: 3, size: 'medium' }
    ],
    notifications: {
      listenerMilestones: true,
      streamStatus: true,
      socialConnections: true,
      systemAlerts: true
    },
    terminology: 'radio',
    refreshRate: 5
  });

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Load station info (handle missing backend gracefully)
        try {
          const stationData = await apiService.getStation();
          setStation(stationData);
        } catch (error) {
          console.log('Backend not available - using demo station data');
          setStation({
            id: 'demo-station',
            userId: 'demo-user',
            name: 'OneStopRadio Demo',
            description: 'Demo radio station for testing',
            genre: 'Electronic',
            logo: undefined,
            coverImage: undefined,
            socialLinks: {
              youtube: undefined,
              twitch: undefined,
              facebook: undefined,
              instagram: undefined,
              twitter: undefined
            },
            settings: {
              isPublic: true,
              allowChat: true,
              autoRecord: false,
              maxBitrate: 320
            },
            stats: {
              totalListeners: 0,
              peakListeners: 0,
              totalHours: 0,
              createdAt: new Date(),
              lastStream: undefined
            }
          });
        }

        // Load recent streaming sessions (handle missing backend gracefully)
        try {
          const sessions = await apiService.getStreamHistory();
          setRecentSessions(sessions);
        } catch (error) {
          console.log('Backend not available - using demo session data');
          setRecentSessions([
            {
              id: 'demo-1',
              stationId: 'demo-station',
              startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
              endTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
              duration: 3600,
              peakListeners: 85,
              avgListeners: 67,
              recordingUrl: undefined,
              metadata: {
                title: 'Evening Mix Session',
                genre: 'Electronic',
                tracks: ['Track 1', 'Track 2', 'Track 3']
              }
            },
            {
              id: 'demo-2',
              stationId: 'demo-station',
              startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
              endTime: new Date(Date.now() - 22 * 60 * 60 * 1000),
              duration: 7200,
              peakListeners: 142,
              avgListeners: 89,
              recordingUrl: undefined,
              metadata: {
                title: 'Morning Show',
                genre: 'Talk',
                tracks: ['Morning Mix 1', 'Talk Segment', 'Music Block']
              }
            }
          ]);
        }

        // Set up real-time listener updates
        webSocketService.onListenerStats((listenerStats: ListenerStats) => {
          setStats(prev => ({
            ...prev,
            totalListeners: listenerStats.current,
            peakListeners: Math.max(prev.peakListeners, listenerStats.current)
          }));
        });

        // Mock recent activity data
        setRecentActivity([
          {
            id: '1',
            type: 'stream_start',
            message: 'Live stream started',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
            severity: 'success'
          },
          {
            id: '2',
            type: 'listener_peak',
            message: 'New listener peak: 1,247',
            timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
            severity: 'info'
          },
          {
            id: '3',
            type: 'social_connect',
            message: 'Connected to YouTube Live',
            timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
            severity: 'success'
          }
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Load saved logo on component mount
  useEffect(() => {
    const savedLogo = localStorage.getItem('userLogo');
    if (savedLogo) {
      setUserLogo(savedLogo);
    }
  }, []);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const logoData = e.target?.result as string;
        setUserLogo(logoData);
        localStorage.setItem('userLogo', logoData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setUserLogo(null);
    localStorage.removeItem('userLogo');
    setLogoMenuAnchor(null);
  };

  const handleLogoMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setLogoMenuAnchor(event.currentTarget);
  };

  const handleLogoMenuClose = () => {
    setLogoMenuAnchor(null);
  };

  const handleSettingsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsMenuClose = () => {
    setSettingsMenuAnchor(null);
  };

  const handleGoToRadioStation = () => {
    handleSettingsMenuClose();
    if (onViewChange) {
      onViewChange('mixer');
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#2196f3';
    }
  };

  const getTerminology = () => {
    switch (dashboardSettings.terminology) {
      case 'dj':
        return {
          title: 'DJ Dashboard',
          interface: 'DJ Interface',
          status: 'DJ Status',
          controls: 'DJ Controls'
        };
      case 'radio':
        return {
          title: 'Radio Station Dashboard',
          interface: 'Radio Controls',
          status: 'On Air Status',
          controls: 'Broadcast Controls'
        };
      case 'broadcaster':
        return {
          title: 'Broadcaster Dashboard',
          interface: 'Broadcast Controls',
          status: 'Broadcast Status',
          controls: 'Studio Controls'
        };
      default:
        return {
          title: 'Radio Station Dashboard',
          interface: 'Radio Controls',
          status: 'On Air Status',
          controls: 'Broadcast Controls'
        };
    }
  };

  const handleCustomizationSave = (newSettings: DashboardSettings) => {
    setDashboardSettings(newSettings);
    // Save to localStorage or API
    localStorage.setItem('dashboardSettings', JSON.stringify(newSettings));
  };

  if (isLoading) {
    return (
      <Container fluid className="dashboard">
        <Box sx={{ p: 3 }}>
          <LinearProgress />
          <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
            Loading Dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container fluid className="dashboard">
      <Box sx={{ p: 3 }}>
        
        {/* Dashboard Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" sx={{ color: '#ffffff', mb: 1, display: 'flex', alignItems: 'center' }}>
              <DashboardIcon sx={{ mr: 2 }} />
              {getTerminology().title}
            </Typography>
            <Typography variant="subtitle1" sx={{ color: '#cccccc' }}>
              Welcome back! Here's what's happening with your radio station.
            </Typography>
          </Box>
          
          {/* User Logo and Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Go to Radio Station Button */}
            <Button
              variant="contained"
              startIcon={<BroadcastIcon />}
              onClick={handleGoToRadioStation}
              sx={{
                backgroundColor: dashboardSettings.accentColor,
                color: '#ffffff',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: dashboardSettings.accentColor,
                  filter: 'brightness(1.1)'
                }
              }}
            >
              Go to Radio Station
            </Button>

            {/* Settings Menu Button */}
            <IconButton
              onClick={handleSettingsMenuOpen}
              sx={{
                color: dashboardSettings.accentColor,
                border: `1px solid ${dashboardSettings.accentColor}`,
                '&:hover': {
                  backgroundColor: `${dashboardSettings.accentColor}20`
                }
              }}
            >
              <SettingsIcon />
            </IconButton>

            {/* Settings Menu */}
            <Menu
              anchorEl={settingsMenuAnchor}
              open={Boolean(settingsMenuAnchor)}
              onClose={handleSettingsMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { setCustomizationOpen(true); handleSettingsMenuClose(); }}>
                <TuneIcon sx={{ mr: 1 }} />
                Customize Dashboard
              </MenuItem>
            </Menu>

            {/* User Logo Section */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#cccccc' }}>
                Station Logo
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={userLogo || undefined}
                  onClick={handleLogoMenuOpen}
                  sx={{
                    width: 60,
                    height: 60,
                    cursor: 'pointer',
                    border: `2px solid ${dashboardSettings.accentColor}`,
                    backgroundColor: userLogo ? 'transparent' : '#333333',
                    '&:hover': {
                      boxShadow: `0 0 0 3px ${dashboardSettings.accentColor}40`
                    }
                  }}
                >
                  {!userLogo && <PhotoCameraIcon sx={{ color: '#888888' }} />}
                </Avatar>
              </Box>
              
              {/* Logo Menu */}
              <Menu
                anchorEl={logoMenuAnchor}
                open={Boolean(logoMenuAnchor)}
                onClose={handleLogoMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
              >
                <MenuItem component="label">
                  <CloudUploadIcon sx={{ mr: 1 }} />
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                  />
                </MenuItem>
                {userLogo && (
                  <MenuItem onClick={handleRemoveLogo} sx={{ color: 'error.main' }}>
                    <DeleteIcon sx={{ mr: 1 }} />
                    Remove Logo
                  </MenuItem>
                )}
              </Menu>
            </Box>
          </Box>
        </Box>

        {/* Quick Stats Cards */}
        {dashboardSettings.layout.statsCards && (
        <Row className="mb-4">
          <Col md={3} sm={6} className="mb-3">
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                {stats.totalListeners.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                Current Listeners
              </Typography>
            </Paper>
          </Col>

          <Col md={3} sm={6} className="mb-3">
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', textAlign: 'center' }}>
              <AnalyticsIcon sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                {stats.peakListeners.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                Peak Today
              </Typography>
            </Paper>
          </Col>

          <Col md={3} sm={6} className="mb-3">
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', textAlign: 'center' }}>
              <RadioIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                {formatUptime(stats.streamUptime)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                Stream Uptime
              </Typography>
            </Paper>
          </Col>

          <Col md={3} sm={6} className="mb-3">
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', textAlign: 'center' }}>
              <NotificationsIcon sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 'bold' }}>
                {stats.totalSessions}
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                Total Sessions
              </Typography>
            </Paper>
          </Col>
        </Row>
        )}

        <Row>
          {/* Station Information */}
          <Col lg={8}>
            {dashboardSettings.layout.stationInfo && (
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                Station Information
              </Typography>
              
              {station && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar 
                    src={station.logo} 
                    sx={{ width: 80, height: 80, mr: 3 }}
                  >
                    {station.name?.charAt(0) || 'R'}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" sx={{ color: '#ffffff' }}>
                      {station.name || 'Radio Station'}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#cccccc', mb: 1 }}>
                      {station.description || 'No description available'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip label={station.genre || 'Music'} size="small" color="primary" />
                      <Chip label="English" size="small" variant="outlined" />
                    </Box>
                    <Button variant="outlined" size="small" startIcon={<EditIcon />}>
                      Edit Station
                    </Button>
                  </Box>
                </Box>
              )}

              {/* Social Media Status */}
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 2 }}>
                  Social Media Connections
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip
                    icon={<YouTubeIcon />}
                    label="YouTube"
                    color={stats.socialConnections.youtube ? 'success' : 'default'}
                    variant={stats.socialConnections.youtube ? 'filled' : 'outlined'}
                  />
                  <Chip
                    icon={<TwitchIcon />}
                    label="Twitch"
                    color={stats.socialConnections.twitch ? 'success' : 'default'}
                    variant={stats.socialConnections.twitch ? 'filled' : 'outlined'}
                  />
                  <Chip
                    icon={<FacebookIcon />}
                    label="Facebook"
                    color={stats.socialConnections.facebook ? 'success' : 'default'}
                    variant={stats.socialConnections.facebook ? 'filled' : 'outlined'}
                  />
                </Box>
              </Box>
            </Paper>
            )}

            {/* Recent Streaming Sessions */}
            {dashboardSettings.layout.sessionHistory && (
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a' }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                Recent Streaming Sessions
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: '#cccccc' }}>Date</TableCell>
                      <TableCell sx={{ color: '#cccccc' }}>Duration</TableCell>
                      <TableCell sx={{ color: '#cccccc' }}>Peak Listeners</TableCell>
                      <TableCell sx={{ color: '#cccccc' }}>Status</TableCell>
                      <TableCell sx={{ color: '#cccccc' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentSessions.length > 0 ? recentSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell sx={{ color: '#ffffff' }}>
                          {formatDate(session.startTime)}
                        </TableCell>
                        <TableCell sx={{ color: '#ffffff' }}>
                          {session.duration ? formatUptime(session.duration) : 'In Progress'}
                        </TableCell>
                        <TableCell sx={{ color: '#ffffff' }}>
                          {session.peakListeners?.toLocaleString() || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={session.endTime ? 'Completed' : 'In Progress'}
                            size="small"
                            color={!session.endTime ? 'success' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" sx={{ color: '#cccccc' }}>
                            <VisibilityIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ color: '#cccccc', textAlign: 'center' }}>
                          No recent sessions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
            )}
          </Col>

          {/* Recent Activity Sidebar */}
          <Col lg={4}>
            {dashboardSettings.layout.recentActivity && (
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                Recent Activity
              </Typography>
              
              <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
                {recentActivity.map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{
                      mb: 2,
                      p: 2,
                      borderRadius: '8px',
                      backgroundColor: '#333333',
                      borderLeft: `4px solid ${getSeverityColor(activity.severity)}`
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#ffffff', mb: 1 }}>
                      {activity.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#cccccc' }}>
                      {formatDate(activity.timestamp)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>
            )}

            {/* Quick Actions */}
            {dashboardSettings.layout.quickActions && (
            <Paper elevation={3} sx={{ p: 3, backgroundColor: '#2a2a2a' }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>
                Quick Actions
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<PlayArrowIcon />}
                  sx={{
                    bgcolor: '#4caf50',
                    '&:hover': { bgcolor: '#388e3c' }
                  }}
                >
                  Start New Stream
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<SettingsIcon />}
                  sx={{
                    color: '#ffffff',
                    borderColor: '#666666',
                    '&:hover': { borderColor: '#888888' }
                  }}
                >
                  Stream Settings
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<AnalyticsIcon />}
                  sx={{
                    color: '#ffffff',
                    borderColor: '#666666',
                    '&:hover': { borderColor: '#888888' }
                  }}
                >
                  View Analytics
                </Button>
                
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<VideoStreamIcon />}
                  onClick={() => onViewChange?.('video')}
                  sx={{
                    bgcolor: '#e91e63',
                    '&:hover': { bgcolor: '#c2185b' }
                  }}
                >
                  Video Streaming
                </Button>
              </Box>
            </Paper>
            )}
          </Col>
        </Row>
      </Box>

      {/* Dashboard Customization Dialog */}
      <DashboardCustomization
        open={customizationOpen}
        onClose={() => setCustomizationOpen(false)}
        onSave={handleCustomizationSave}
        currentSettings={dashboardSettings}
      />
    </Container>
  );
};

export default Dashboard;