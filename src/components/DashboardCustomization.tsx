import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Tabs,
  Tab,
  Card,
  CardContent,
  IconButton,
  Chip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Palette as PaletteIcon,
  ViewModule as LayoutIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';

interface DashboardCustomizationProps {
  open: boolean;
  onClose: () => void;
  onSave: (settings: DashboardSettings) => void;
  currentSettings: DashboardSettings;
}

export interface DashboardSettings {
  theme: 'dark' | 'light' | 'auto';
  accentColor: string;
  layout: {
    statsCards: boolean;
    stationInfo: boolean;
    recentActivity: boolean;
    sessionHistory: boolean;
    quickActions: boolean;
    socialStatus: boolean;
  };
  widgets: {
    id: string;
    name: string;
    enabled: boolean;
    position: number;
    size: 'small' | 'medium' | 'large';
  }[];
  notifications: {
    listenerMilestones: boolean;
    streamStatus: boolean;
    socialConnections: boolean;
    systemAlerts: boolean;
  };
  terminology: 'dj' | 'radio' | 'broadcaster';
  refreshRate: number; // in seconds
}

const DashboardCustomization: React.FC<DashboardCustomizationProps> = ({
  open,
  onClose,
  onSave,
  currentSettings
}) => {
  const [settings, setSettings] = useState<DashboardSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState(0);
  const [accentColor, setAccentColor] = useState(currentSettings.accentColor || '#2196f3');

  const handleSave = () => {
    const finalSettings = { ...settings, accentColor };
    onSave(finalSettings);
    onClose();
  };

  const handleAccentColorChange = (color: string) => {
    setAccentColor(color);
    setSettings(prev => ({ ...prev, accentColor: color }));
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const updateLayout = (section: keyof DashboardSettings['layout'], enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [section]: enabled
      }
    }));
  };

  const updateNotifications = (type: keyof DashboardSettings['notifications'], enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: enabled
      }
    }));
  };

  const toggleWidget = (widgetId: string) => {
    setSettings(prev => ({
      ...prev,
      widgets: prev.widgets.map(widget =>
        widget.id === widgetId
          ? { ...widget, enabled: !widget.enabled }
          : widget
      )
    }));
  };

  const accentColors = [
    { name: 'Orange', value: '#ff6b35' },
    { name: 'Blue', value: '#2196f3' },
    { name: 'Green', value: '#4caf50' },
    { name: 'Purple', value: '#9c27b0' },
    { name: 'Red', value: '#f44336' },
    { name: 'Teal', value: '#009688' },
    { name: 'Pink', value: '#e91e63' }
  ];

  const terminologyOptions = [
    { value: 'dj', label: 'DJ / Disc Jockey' },
    { value: 'radio', label: 'Radio Host / Radio Station' },
    { value: 'broadcaster', label: 'Broadcaster / Host' }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#2a2a2a',
          color: '#ffffff'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ mr: 1 }} />
          Dashboard Customization
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#ffffff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: '#404040', mb: 3 }}
        >
          <Tab label="Appearance" />
          <Tab label="Layout" />
          <Tab label="Widgets" />
          <Tab label="Notifications" />
          <Tab label="Terminology" />
        </Tabs>

        {/* Appearance Tab */}
        {activeTab === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <PaletteIcon sx={{ mr: 1 }} />
              Appearance Settings
            </Typography>

            {/* Theme Selection */}
            <FormControl fullWidth margin="normal">
              <InputLabel sx={{ color: '#cccccc' }}>Theme</InputLabel>
              <Select
                value={settings.theme}
                onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as any }))}
                sx={{ color: '#ffffff' }}
              >
                <MenuItem value="dark">Dark Theme</MenuItem>
                <MenuItem value="light">Light Theme</MenuItem>
                <MenuItem value="auto">Auto (System)</MenuItem>
              </Select>
            </FormControl>

            {/* Accent Color */}
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 2 }}>
              Accent Color
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {accentColors.map((color) => (
                <Box
                  key={color.value}
                  onClick={() => handleAccentColorChange(color.value)}
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: color.value,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: accentColor === color.value ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                    boxShadow: accentColor === color.value ? '0 0 0 2px #2196f3' : 'none',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                    }
                  }}
                />
              ))}
            </Box>

            {/* Refresh Rate */}
            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Data Refresh Rate: {settings.refreshRate}s
            </Typography>
            <Slider
              value={settings.refreshRate}
              onChange={(_, value) => setSettings(prev => ({ ...prev, refreshRate: value as number }))}
              min={1}
              max={30}
              step={1}
              marks={[
                { value: 1, label: '1s' },
                { value: 5, label: '5s' },
                { value: 10, label: '10s' },
                { value: 30, label: '30s' }
              ]}
              sx={{ color: settings.accentColor }}
            />
          </Box>
        )}

        {/* Layout Tab */}
        {activeTab === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <LayoutIcon sx={{ mr: 1 }} />
              Dashboard Layout
            </Typography>

            <Typography variant="body2" sx={{ color: '#cccccc', mb: 3 }}>
              Choose which sections to display on your dashboard
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.layout.statsCards}
                    onChange={(e) => updateLayout('statsCards', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Statistics Cards"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.layout.stationInfo}
                    onChange={(e) => updateLayout('stationInfo', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Station Information"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.layout.recentActivity}
                    onChange={(e) => updateLayout('recentActivity', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Recent Activity Feed"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.layout.sessionHistory}
                    onChange={(e) => updateLayout('sessionHistory', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Session History"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.layout.quickActions}
                    onChange={(e) => updateLayout('quickActions', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Quick Actions Panel"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.layout.socialStatus}
                    onChange={(e) => updateLayout('socialStatus', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Social Media Status"
              />
            </Box>
          </Box>
        )}

        {/* Widgets Tab */}
        {activeTab === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Dashboard Widgets
            </Typography>
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 3 }}>
              Drag to reorder and toggle widgets on/off
            </Typography>

            {settings.widgets.map((widget, index) => (
              <Card
                key={widget.id}
                sx={{
                  mb: 1,
                  backgroundColor: '#333333',
                  border: `1px solid ${widget.enabled ? settings.accentColor : '#555555'}`
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                  <IconButton sx={{ color: '#cccccc', mr: 1 }}>
                    <DragIcon />
                  </IconButton>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: '#ffffff' }}>
                      {widget.name}
                    </Typography>
                    <Chip
                      label={widget.size.toUpperCase()}
                      size="small"
                      variant="outlined"
                      sx={{ color: '#cccccc', borderColor: '#cccccc' }}
                    />
                  </Box>
                  <Switch
                    checked={widget.enabled}
                    onChange={() => toggleWidget(widget.id)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: settings.accentColor } }}
                  />
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Notifications Tab */}
        {activeTab === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <NotificationsIcon sx={{ mr: 1 }} />
              Notification Settings
            </Typography>

            <Typography variant="body2" sx={{ color: '#cccccc', mb: 3 }}>
              Choose which events trigger dashboard notifications
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.listenerMilestones}
                    onChange={(e) => updateNotifications('listenerMilestones', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Listener Milestones (100, 500, 1000+ listeners)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.streamStatus}
                    onChange={(e) => updateNotifications('streamStatus', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Stream Status Changes (Go Live, End Stream)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.socialConnections}
                    onChange={(e) => updateNotifications('socialConnections', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="Social Media Connection Status"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.systemAlerts}
                    onChange={(e) => updateNotifications('systemAlerts', e.target.checked)}
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: accentColor } }}
                  />
                }
                label="System Alerts (High CPU, Connection Issues)"
              />
            </Box>
          </Box>
        )}

        {/* Terminology Tab */}
        {activeTab === 4 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Interface Terminology
            </Typography>
            <Typography variant="body2" sx={{ color: '#cccccc', mb: 3 }}>
              Choose how you want to be referred to throughout the application
            </Typography>

            <FormControl fullWidth>
              <InputLabel sx={{ color: '#cccccc' }}>Select Terminology</InputLabel>
              <Select
                value={settings.terminology}
                onChange={(e) => setSettings(prev => ({ ...prev, terminology: e.target.value as any }))}
                sx={{ color: '#ffffff' }}
              >
                {terminologyOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ mt: 3, p: 2, backgroundColor: '#333333', borderRadius: '8px' }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Preview of terminology changes:
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                • Navigation: "{settings.terminology === 'dj' ? 'DJ Interface' : settings.terminology === 'radio' ? 'Radio Controls' : 'Broadcast Controls'}"
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                • Dashboard: "{settings.terminology === 'dj' ? 'DJ Dashboard' : settings.terminology === 'radio' ? 'Radio Station Dashboard' : 'Broadcaster Dashboard'}"
              </Typography>
              <Typography variant="body2" sx={{ color: '#cccccc' }}>
                • Status: "{settings.terminology === 'dj' ? 'DJ Status' : settings.terminology === 'radio' ? 'On Air Status' : 'Broadcast Status'}"
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} sx={{ color: '#cccccc' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          sx={{
            backgroundColor: settings.accentColor,
            '&:hover': {
              backgroundColor: settings.accentColor,
              filter: 'brightness(0.9)'
            }
          }}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DashboardCustomization;