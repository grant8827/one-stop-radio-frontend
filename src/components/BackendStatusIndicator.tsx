import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, IconButton, Collapse } from '@mui/material';
import { 
  CheckCircle as OnlineIcon,
  Error as OfflineIcon, 
  Warning as ErrorIcon,
  ExpandMore as ExpandIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { backendService } from '../services/BackendIntegrationService';
import type { ServiceStatus } from '../services/BackendConfig';

/**
 * BackendStatusIndicator - Real-time backend service status display
 * Shows connection status for all three backend services with visual indicators
 */
const BackendStatusIndicator: React.FC = () => {
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Refresh service statuses
  const refreshStatuses = async () => {
    const statuses = backendService.getAllServiceStatuses();
    setServiceStatuses(statuses);
    setLastUpdate(new Date());
  };

  // Auto-refresh every 10 seconds
  useEffect(() => {
    refreshStatuses();
    const interval = setInterval(refreshStatuses, 10000);
    return () => clearInterval(interval);
  }, []);

  // Get status icon and color
  const getStatusDisplay = (status: ServiceStatus) => {
    switch (status.status) {
      case 'online':
        return { icon: <OnlineIcon />, color: 'success' as const, label: 'Online' };
      case 'offline':
        return { icon: <OfflineIcon />, color: 'default' as const, label: 'Offline' };
      case 'error':
        return { icon: <ErrorIcon />, color: 'error' as const, label: 'Error' };
      default:
        return { icon: <ErrorIcon />, color: 'warning' as const, label: 'Unknown' };
    }
  };

  // Service display names
  const getServiceDisplayName = (serviceType: string) => {
    switch (serviceType) {
      case 'SIGNALING': return 'Node.js Signaling';
      case 'API': return 'Python FastAPI';
      case 'MEDIA': return 'C++ Media Server';
      default: return serviceType;
    }
  };

  const onlineServices = serviceStatuses.filter(s => s.status === 'online').length;
  const totalServices = serviceStatuses.length;

  return (
    <Box sx={{ 
      position: 'fixed', 
      top: 16, 
      right: 16, 
      zIndex: 1000,
      bgcolor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 2,
      p: 1,
      border: '1px solid #ffeb3b'
    }}>
      {/* Compact Status Display */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={onlineServices === totalServices ? <OnlineIcon /> : <ErrorIcon />}
          label={`${onlineServices}/${totalServices} Online`}
          color={onlineServices === totalServices ? 'success' : 'warning'}
          size="small"
          onClick={() => setExpanded(!expanded)}
        />
        <IconButton 
          size="small" 
          onClick={refreshStatuses}
          sx={{ color: '#ffeb3b' }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
        <IconButton 
          size="small" 
          onClick={() => setExpanded(!expanded)}
          sx={{ 
            color: '#ffeb3b',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s'
          }}
        >
          <ExpandIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Detailed Status Display */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #333' }}>
          <Typography variant="caption" sx={{ color: '#ffeb3b', fontWeight: 'bold', mb: 1, display: 'block' }}>
            Backend Services Status
          </Typography>
          
          {serviceStatuses.map((status) => {
            const display = getStatusDisplay(status);
            return (
              <Box key={status.service} sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                mb: 0.5,
                p: 0.5,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 1
              }}>
                <Typography variant="caption" sx={{ color: '#ffffff', minWidth: 120 }}>
                  {getServiceDisplayName(status.service)}
                </Typography>
                <Chip
                  icon={display.icon}
                  label={display.label}
                  color={display.color}
                  size="small"
                  variant="outlined"
                />
              </Box>
            );
          })}
          
          <Typography variant="caption" sx={{ 
            color: '#999', 
            display: 'block', 
            textAlign: 'center',
            mt: 1,
            pt: 1,
            borderTop: '1px solid #333'
          }}>
            Last check: {lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

export default BackendStatusIndicator;