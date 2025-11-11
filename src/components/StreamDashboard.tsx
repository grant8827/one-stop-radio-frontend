import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Modal,
  Alert,
  ProgressBar,
  Spinner,
  Toast,
  ToastContainer,
  Form,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  CardContent,
  CardActions,
  Divider
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  DataUsage as DataIcon,
  Schedule as ScheduleIcon,
  RadioButtonChecked as LiveIcon,
  RadioButtonUnchecked as OfflineIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import {
  streamService,
  StreamInfo,
  StreamStatus,
  StreamStats,
  StreamQuality,
  CreateStreamRequest
} from '../services/StreamService';

interface StreamDashboardProps {
  onViewChange?: (view: 'dashboard' | 'create' | 'edit', streamId?: string) => void;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

const StreamDashboard: React.FC<StreamDashboardProps> = ({ onViewChange }) => {
  // State Management
  const [streams, setStreams] = useState<StreamInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'streams' | 'analytics'>('overview');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<StreamInfo | null>(null);

  // Stream Creation State
  const [createForm, setCreateForm] = useState<CreateStreamRequest>({
    station_name: '',
    description: '',
    genre: '',
    quality: StreamQuality.STANDARD,
    max_listeners: 100
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Real-time monitoring
  const [monitoringIntervals, setMonitoringIntervals] = useState<Map<string, () => void>>(new Map());

  // ===== Utility Functions =====

  const addToast = useCallback((type: ToastNotification['type'], message: string, details?: string) => {
    const toast: ToastNotification = {
      id: Date.now().toString(),
      type,
      message,
      details
    };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  }, []);

  const startStreamMonitoring = useCallback((streamId: string) => {
    if (monitoringIntervals.has(streamId)) return;
    
    const cleanup = streamService.startStatusMonitoring(streamId, 5000);
    setMonitoringIntervals(prev => new Map(prev).set(streamId, cleanup));
  }, [monitoringIntervals]);

  const stopStreamMonitoring = useCallback((streamId: string) => {
    const cleanup = monitoringIntervals.get(streamId);
    if (cleanup) {
      cleanup();
      setMonitoringIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(streamId);
        return newMap;
      });
    }
  }, [monitoringIntervals]);

  // ===== Data Loading =====

  const loadStreams = useCallback(async () => {
    try {
      const userStreams = await streamService.getUserStreams();
      setStreams(userStreams);
      
      // Start monitoring active streams
      userStreams.forEach(stream => {
        if (stream.status === StreamStatus.ACTIVE) {
          startStreamMonitoring(stream.id);
        }
      });
      
    } catch (error) {
      console.error('Failed to load streams:', error);
      addToast('error', 'Failed to load streams');
    }
  }, [startStreamMonitoring, addToast]);

  const refreshStreams = useCallback(async () => {
    if (loading) return;
    
    setRefreshing(true);
    try {
      await loadStreams();
    } catch (error) {
      console.error('Failed to refresh streams:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loading, loadStreams]);

  // ===== Event Handlers =====

  const handleStreamCreated = useCallback((stream: StreamInfo) => {
    setStreams(prev => [...prev, stream]);
  }, []);

  const handleStreamUpdated = useCallback((updatedStream: StreamInfo) => {
    setStreams(prev => prev.map(s => s.id === updatedStream.id ? updatedStream : s));
  }, []);

  const handleStreamDeleted = useCallback((streamId: string) => {
    setStreams(prev => prev.filter(s => s.id !== streamId));
    stopStreamMonitoring(streamId);
  }, [stopStreamMonitoring]);

  const handleStreamActivated = useCallback((stream: StreamInfo) => {
    handleStreamUpdated(stream);
    startStreamMonitoring(stream.id);
  }, [handleStreamUpdated, startStreamMonitoring]);

  const handleStreamDeactivated = useCallback((streamId: string) => {
    stopStreamMonitoring(streamId);
    refreshStreams();
  }, [stopStreamMonitoring, refreshStreams]);

  const handleStreamStatusUpdated = useCallback(({ streamId, stats }: { streamId: string; stats: StreamStats }) => {
    setStreams(prev => prev.map(stream => 
      stream.id === streamId ? { ...stream, stats } : stream
    ));
  }, []);

  // ===== Effects =====

  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        await loadStreams();
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
        addToast('error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
    
    // Set up event listeners
    streamService.on('streamCreated', handleStreamCreated);
    streamService.on('streamUpdated', handleStreamUpdated);
    streamService.on('streamDeleted', handleStreamDeleted);
    streamService.on('streamActivated', handleStreamActivated);
    streamService.on('streamDeactivated', handleStreamDeactivated);
    streamService.on('streamStatusUpdated', handleStreamStatusUpdated);

    return () => {
      // Clean up monitoring intervals
      monitoringIntervals.forEach(cleanup => cleanup());
      
      // Remove event listeners
      streamService.off('streamCreated', handleStreamCreated);
      streamService.off('streamUpdated', handleStreamUpdated);
      streamService.off('streamDeleted', handleStreamDeleted);
      streamService.off('streamActivated', handleStreamActivated);
      streamService.off('streamDeactivated', handleStreamDeactivated);
      streamService.off('streamStatusUpdated', handleStreamStatusUpdated);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshStreams, 30000);
    return () => clearInterval(interval);
  }, [refreshStreams]);

  // ===== Stream Operations =====

  const handleActivateStream = async (stream: StreamInfo) => {
    try {
      addToast('info', `Activating stream ${stream.config.station_name}...`);
      
      const result = await streamService.activateStream(stream.id);
      
      if (result.success) {
        addToast('success', 'Stream activated successfully');
        startStreamMonitoring(stream.id);
        await refreshStreams();
      } else {
        addToast('error', `Failed to activate stream: ${result.message}`, result.error_code);
      }
    } catch (error) {
      console.error('Stream activation failed:', error);
      addToast('error', 'Failed to activate stream');
    }
  };

  const handleDeactivateStream = async (stream: StreamInfo) => {
    try {
      addToast('info', `Deactivating stream ${stream.config.station_name}...`);
      
      const result = await streamService.deactivateStream(stream.id);
      
      if (result.success) {
        addToast('success', 'Stream deactivated successfully');
        stopStreamMonitoring(stream.id);
        await refreshStreams();
      } else {
        addToast('error', `Failed to deactivate stream: ${result.message}`, result.error_code);
      }
    } catch (error) {
      console.error('Stream deactivation failed:', error);
      addToast('error', 'Failed to deactivate stream');
    }
  };

  const handleDeleteStream = async () => {
    if (!streamToDelete) return;

    try {
      const result = await streamService.deleteStream(streamToDelete.id);
      
      if (result.success) {
        addToast('success', 'Stream deleted successfully');
        stopStreamMonitoring(streamToDelete.id);
        await refreshStreams();
      } else {
        addToast('error', `Failed to delete stream: ${result.message}`, result.error_code);
      }
    } catch (error) {
      console.error('Stream deletion failed:', error);
      addToast('error', 'Failed to delete stream');
    } finally {
      setShowDeleteModal(false);
      setStreamToDelete(null);
    }
  };

  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = streamService.validateStreamConfig(createForm);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setCreateLoading(true);
    setFormErrors([]);

    try {
      const result = await streamService.createStream(createForm);
      
      if (result.success) {
        addToast('success', 'Stream created successfully');
        setShowCreateModal(false);
        resetCreateForm();
        await refreshStreams();
      } else {
        addToast('error', `Failed to create stream: ${result.message}`, result.error_code);
      }
    } catch (error) {
      console.error('Stream creation failed:', error);
      addToast('error', 'Failed to create stream');
    } finally {
      setCreateLoading(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      station_name: '',
      description: '',
      genre: '',
      quality: StreamQuality.STANDARD,
      max_listeners: 100
    });
    setFormErrors([]);
  };

  // ===== Utility Functions for Display =====

  const getStatusIcon = (status: StreamStatus) => {
    switch (status) {
      case StreamStatus.ACTIVE:
        return <LiveIcon style={{ color: '#28a745' }} />;
      case StreamStatus.READY:
        return <CheckIcon style={{ color: '#17a2b8' }} />;
      case StreamStatus.ERROR:
        return <ErrorIcon style={{ color: '#dc3545' }} />;
      case StreamStatus.PENDING:
        return <ScheduleIcon style={{ color: '#ffc107' }} />;
      default:
        return <OfflineIcon style={{ color: '#6c757d' }} />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // ===== Stats Calculation =====

  const getTotalActiveStreams = () => streams.filter(s => s.status === StreamStatus.ACTIVE).length;
  const getTotalListeners = () => streams.reduce((total, s) => total + (s.stats?.current_listeners || 0), 0);
  const getTotalBandwidth = () => streams.reduce((total, s) => total + (s.stats?.bandwidth_usage || 0), 0);
  const getTotalCost = () => streams.reduce((total, s) => total + (s.stats?.cost_current_session || 0), 0);

  // ===== Render =====

  if (loading) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <Spinner animation="border" role="status" className="mb-3" />
          <Typography variant="h6">Loading Stream Dashboard...</Typography>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-3">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                Stream Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Manage your live streaming infrastructure
              </Typography>
            </Box>
            
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                onClick={refreshStreams}
                disabled={refreshing}
              >
                {refreshing ? <Spinner size="sm" /> : <RefreshIcon />}
                {refreshing ? ' Refreshing...' : ' Refresh'}
              </Button>
              
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                <AddIcon /> Create Stream
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Progress indicator for refreshing */}
      {refreshing && <LinearProgress className="mb-3" />}

      {/* Navigation Tabs */}
      <Tabs activeKey={activeTab} onSelect={(tab) => setActiveTab(tab as any)} className="mb-4">
        <Tab eventKey="overview" title="Overview">
          {/* Overview Content */}
          <Row className="mb-4">
            {/* Stats Cards */}
            <Col md={3}>
              <Card className="text-center h-100">
                <Card.Body>
                  <LiveIcon style={{ fontSize: 40, color: '#28a745' }} />
                  <Typography variant="h4" className="mt-2">{getTotalActiveStreams()}</Typography>
                  <Typography variant="body2" color="text.secondary">Active Streams</Typography>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center h-100">
                <Card.Body>
                  <PeopleIcon style={{ fontSize: 40, color: '#17a2b8' }} />
                  <Typography variant="h4" className="mt-2">{getTotalListeners()}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Listeners</Typography>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center h-100">
                <Card.Body>
                  <DataIcon style={{ fontSize: 40, color: '#fd7e14' }} />
                  <Typography variant="h4" className="mt-2">{formatBytes(getTotalBandwidth())}</Typography>
                  <Typography variant="body2" color="text.secondary">Bandwidth Used</Typography>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3}>
              <Card className="text-center h-100">
                <Card.Body>
                  <Typography variant="h5" style={{ color: '#28a745' }}>💰</Typography>
                  <Typography variant="h4" className="mt-2">${getTotalCost().toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary">Session Cost</Typography>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Recent Activity / Quick Actions */}
          <Row>
            <Col md={8}>
              <Card>
                <Card.Header>
                  <Typography variant="h6">Recent Streams</Typography>
                </Card.Header>
                <Card.Body>
                  {streams.length === 0 ? (
                    <div className="text-center py-4">
                      <Typography variant="body1" color="text.secondary">
                        No streams created yet. Create your first stream to get started!
                      </Typography>
                      <Button
                        variant="primary"
                        className="mt-3"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <AddIcon /> Create Your First Stream
                      </Button>
                    </div>
                  ) : (
                    streams.slice(0, 5).map(stream => (
                      <div key={stream.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div className="d-flex align-items-center">
                          {getStatusIcon(stream.status)}
                          <div className="ms-3">
                            <Typography variant="body1">{stream.config.station_name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {stream.config.genre} • {stream.config.quality}kbps
                            </Typography>
                          </div>
                        </div>
                        
                        <div className="text-end">
                          <Badge bg={stream.status === StreamStatus.ACTIVE ? 'success' : 'secondary'}>
                            {stream.status}
                          </Badge>
                          {stream.stats && (
                            <Typography variant="body2" color="text.secondary" className="mt-1">
                              {stream.stats.current_listeners} listeners
                            </Typography>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col md={4}>
              <Card>
                <Card.Header>
                  <Typography variant="h6">Quick Actions</Typography>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <AddIcon /> Create New Stream
                    </Button>
                    
                    <Button
                      variant="outline-info"
                      onClick={() => setActiveTab('streams')}
                    >
                      <SettingsIcon /> Manage Streams
                    </Button>
                    
                    <Button
                      variant="outline-secondary"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <DataIcon /> View Analytics
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="streams" title={`Streams (${streams.length})`}>
          {/* Streams Management */}
          {streams.length === 0 ? (
            <div className="text-center py-5">
              <Typography variant="h6" color="text.secondary">No Streams Found</Typography>
              <Typography variant="body1" color="text.secondary" className="mb-3">
                Create your first stream to start broadcasting
              </Typography>
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                <AddIcon /> Create Stream
              </Button>
            </div>
          ) : (
            <Row>
              {streams.map(stream => (
                <Col key={stream.id} md={6} lg={4} className="mb-4">
                  <Paper elevation={2} sx={{ height: '100%' }}>
                    <CardContent>
                      {/* Stream Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="flex-grow-1">
                          <Typography variant="h6" noWrap>
                            {stream.config.station_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {stream.config.genre}
                          </Typography>
                        </div>
                        
                        <Chip
                          icon={getStatusIcon(stream.status)}
                          label={stream.status}
                          size="small"
                          style={{
                            backgroundColor: streamService.getStatusColor(stream.status) + '20',
                            color: streamService.getStatusColor(stream.status)
                          }}
                        />
                      </div>

                      {/* Stream Details */}
                      <div className="mb-3">
                        <Typography variant="body2" color="text.secondary">
                          Quality: {stream.config.quality}kbps • Max: {stream.config.max_listeners} listeners
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Mount: {stream.mount_point}
                        </Typography>
                      </div>

                      {/* Real-time Stats */}
                      {stream.stats && stream.status === StreamStatus.ACTIVE && (
                        <div className="mb-3">
                          <Divider className="mb-2" />
                          <div className="d-flex justify-content-between">
                            <Typography variant="body2">
                              👥 {stream.stats.current_listeners} / {stream.config.max_listeners}
                            </Typography>
                            <Typography variant="body2">
                              📊 {formatBytes(stream.stats.bytes_sent)}
                            </Typography>
                          </div>
                          <div className="d-flex justify-content-between">
                            <Typography variant="body2">
                              ⏱️ {formatDuration(stream.stats.uptime_seconds)}
                            </Typography>
                            <Typography variant="body2">
                              💰 ${stream.stats.cost_current_session.toFixed(2)}
                            </Typography>
                          </div>
                          
                          {/* Listener Progress Bar */}
                          <ProgressBar
                            now={(stream.stats.current_listeners / stream.config.max_listeners) * 100}
                            className="mt-2"
                            style={{ height: '0.5rem' }}
                          />
                        </div>
                      )}
                    </CardContent>

                    <CardActions>
                      <div className="d-flex justify-content-between w-100">
                        <div>
                          {stream.status === StreamStatus.READY || stream.status === StreamStatus.INACTIVE ? (
                            <Tooltip title="Activate Stream">
                              <IconButton
                                color="success"
                                onClick={() => handleActivateStream(stream)}
                                size="small"
                              >
                                <PlayIcon />
                              </IconButton>
                            </Tooltip>
                          ) : stream.status === StreamStatus.ACTIVE ? (
                            <Tooltip title="Deactivate Stream">
                              <IconButton
                                color="error"
                                onClick={() => handleDeactivateStream(stream)}
                                size="small"
                              >
                                <StopIcon />
                              </IconButton>
                            </Tooltip>
                          ) : null}

                          <Tooltip title="Stream Details">
                            <IconButton
                              onClick={() => {
                                setSelectedStream(stream);
                                setShowDetailsModal(true);
                              }}
                              size="small"
                            >
                              <SettingsIcon />
                            </IconButton>
                          </Tooltip>
                        </div>

                        <div>
                          <Tooltip title="Edit Stream">
                            <IconButton
                              onClick={() => onViewChange?.('edit', stream.id)}
                              size="small"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Stream">
                            <IconButton
                              color="error"
                              onClick={() => {
                                setStreamToDelete(stream);
                                setShowDeleteModal(true);
                              }}
                              size="small"
                              disabled={stream.status === StreamStatus.ACTIVE}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>
                    </CardActions>
                  </Paper>
                </Col>
              ))}
            </Row>
          )}
        </Tab>

        <Tab eventKey="analytics" title="Analytics">
          {/* Analytics Content - Placeholder */}
          <div className="text-center py-5">
            <Typography variant="h6" color="text.secondary">Analytics Dashboard</Typography>
            <Typography variant="body1" color="text.secondary">
              Coming soon - Stream performance analytics, listener insights, and cost optimization
            </Typography>
          </div>
        </Tab>
      </Tabs>

      {/* Create Stream Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Stream</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateStream}>
            {formErrors.length > 0 && (
              <Alert variant="danger">
                <ul className="mb-0">
                  {formErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Station Name *</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter station name"
                    value={createForm.station_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, station_name: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Genre *</Form.Label>
                  <Form.Select
                    value={createForm.genre}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, genre: e.target.value }))}
                    required
                  >
                    <option value="">Select Genre</option>
                    <option value="Rock">Rock</option>
                    <option value="Pop">Pop</option>
                    <option value="Electronic">Electronic</option>
                    <option value="Jazz">Jazz</option>
                    <option value="Classical">Classical</option>
                    <option value="Hip Hop">Hip Hop</option>
                    <option value="Talk Radio">Talk Radio</option>
                    <option value="Mixed">Mixed</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Optional description of your stream"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Audio Quality</Form.Label>
                  <Form.Select
                    value={createForm.quality.toString()}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, quality: parseInt(e.target.value) as StreamQuality }))}
                  >
                    <option value="64">64 kbps - Talk Radio</option>
                    <option value="128">128 kbps - Standard Music</option>
                    <option value="192">192 kbps - High Quality</option>
                    <option value="320">320 kbps - Premium</option>
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Max Listeners</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="10000"
                    value={createForm.max_listeners}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, max_listeners: parseInt(e.target.value) || 100 }))}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Cost Estimation */}
            <Alert variant="info">
              <Typography variant="body2">
                <strong>Estimated Cost:</strong> {' '}
                {(() => {
                  const costs = streamService.calculateEstimatedCost(createForm.quality, createForm.max_listeners, 8);
                  return `$${costs.hourly.toFixed(2)}/hour • $${costs.daily.toFixed(2)}/day (8h) • $${costs.monthly.toFixed(2)}/month`;
                })()}
              </Typography>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateStream}
            disabled={createLoading}
          >
            {createLoading ? <Spinner size="sm" /> : null}
            {createLoading ? ' Creating...' : 'Create Stream'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <WarningIcon className="me-2" />
            Are you sure you want to delete the stream "{streamToDelete?.config.station_name}"?
            This action cannot be undone.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteStream}>
            Delete Stream
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Stream Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Stream Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStream && (
            <div>
              {/* Connection Info */}
              <Typography variant="h6" className="mb-3">Connection Information</Typography>
              <Card className="mb-3">
                <Card.Body>
                  {(() => {
                    const setup = streamService.getDJSetupInstructions(selectedStream);
                    return (
                      <>
                        <Row>
                          <Col md={6}>
                            <strong>Server:</strong> {setup.server}<br />
                            <strong>Port:</strong> {setup.port}<br />
                            <strong>Mount Point:</strong> {setup.mount}
                          </Col>
                          <Col md={6}>
                            <strong>Username:</strong> {setup.username}<br />
                            <strong>Password:</strong> {setup.password}<br />
                            <strong>Format:</strong> {setup.format} @ {setup.bitrate}kbps
                          </Col>
                        </Row>
                        
                        <Divider className="my-3" />
                        
                        <Typography variant="body2" color="text.secondary">
                          <strong>Stream URL:</strong> {streamService.getStreamUrl(selectedStream)}
                        </Typography>
                      </>
                    );
                  })()}
                </Card.Body>
              </Card>

              {/* Current Statistics */}
              {selectedStream.stats && (
                <>
                  <Typography variant="h6" className="mb-3">Live Statistics</Typography>
                  <Row className="mb-3">
                    <Col md={3}>
                      <Card className="text-center">
                        <Card.Body>
                          <Typography variant="h5">{selectedStream.stats.current_listeners}</Typography>
                          <Typography variant="body2" color="text.secondary">Current Listeners</Typography>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center">
                        <Card.Body>
                          <Typography variant="h5">{selectedStream.stats.peak_listeners}</Typography>
                          <Typography variant="body2" color="text.secondary">Peak Listeners</Typography>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center">
                        <Card.Body>
                          <Typography variant="h5">{formatBytes(selectedStream.stats.bytes_sent)}</Typography>
                          <Typography variant="body2" color="text.secondary">Data Sent</Typography>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={3}>
                      <Card className="text-center">
                        <Card.Body>
                          <Typography variant="h5">${selectedStream.stats.cost_current_session.toFixed(2)}</Typography>
                          <Typography variant="body2" color="text.secondary">Session Cost</Typography>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            show={true}
            delay={5000}
            autohide
          >
            <Toast.Header>
              <strong className="me-auto">
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'warning' && '⚠️'}
                {toast.type === 'info' && 'ℹ️'}
                {' '}{toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
              </strong>
            </Toast.Header>
            <Toast.Body>
              {toast.message}
              {toast.details && (
                <div className="mt-1">
                  <small className="text-muted">{toast.details}</small>
                </div>
              )}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </Container>
  );
};

export default StreamDashboard;