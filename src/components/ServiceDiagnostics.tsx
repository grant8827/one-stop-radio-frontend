import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'checking' | 'online' | 'offline' | 'error';
  response?: string;
  error?: string;
}

const ServiceDiagnostics: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'React Frontend', url: 'http://localhost:3000', status: 'checking' },
    { name: 'Python FastAPI Backend', url: 'http://localhost:8000/api/health/', status: 'checking' },
    { name: 'Node.js Signaling Server', url: 'http://localhost:5000/api/health', status: 'checking' },
    { name: 'C++ Media Server Mock', url: 'http://localhost:8082/api/health', status: 'checking' }
  ]);

  const [isChecking, setIsChecking] = useState(false);

  const checkServices = async () => {
    setIsChecking(true);
    const updatedServices = [...services];

    for (let i = 0; i < updatedServices.length; i++) {
      const service = updatedServices[i];
      try {
        console.log(`Checking ${service.name}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(service.url, {
          signal: controller.signal,
          method: 'GET'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const text = await response.text();
          service.status = 'online';
          service.response = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        } else {
          service.status = 'error';
          service.error = `HTTP ${response.status}`;
        }
      } catch (error: any) {
        service.status = 'offline';
        service.error = error.name === 'AbortError' ? 'Timeout' : error.message;
      }
      
      // Update state after each check
      setServices([...updatedServices]);
    }
    
    setIsChecking(false);
  };

  useEffect(() => {
    checkServices();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'checking':
        return <CircularProgress size={20} />;
      case 'online':
        return <SuccessIcon color="success" />;
      case 'offline':
        return <ErrorIcon color="error" />;
      case 'error':
        return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'error':
        return 'warning';
      default:
        return 'default';
    }
  };

  const onlineCount = services.filter(s => s.status === 'online').length;
  const totalCount = services.length;

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 3, textAlign: 'center' }}>
          🎵 OneStopRadio Service Diagnostics
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              System Status: {onlineCount}/{totalCount} Services Online
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={checkServices}
              disabled={isChecking}
            >
              Refresh
            </Button>
          </Box>

          {onlineCount === totalCount ? (
            <Alert severity="success">
              🎉 All services are running! Your OneStopRadio platform is ready.
            </Alert>
          ) : onlineCount > 0 ? (
            <Alert severity="warning">
              ⚠️ Some services are offline. The platform will work with limited functionality.
            </Alert>
          ) : (
            <Alert severity="error">
              ❌ No services are responding. Please check your backend services.
            </Alert>
          )}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Service Details
          </Typography>
          
          <List>
            {services.map((service, index) => (
              <React.Fragment key={service.name}>
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(service.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" component="span">
                          {service.name}
                        </Typography>
                        <Chip
                          label={service.status}
                          size="small"
                          color={getStatusColor(service.status) as any}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          {service.url}
                        </Typography>
                        {service.response && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'green' }}>
                            Response: {service.response}
                          </Typography>
                        )}
                        {service.error && (
                          <Typography variant="caption" sx={{ display: 'block', color: 'red' }}>
                            Error: {service.error}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < services.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            If services are showing as offline, make sure all backend servers are running.
            <br />
            The DJ interface should now load without freezing even if some services are offline.
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default ServiceDiagnostics;