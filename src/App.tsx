import React, { useState, useEffect } from 'react';
import './App.css';
import HomePage from './components/HomePage';
import DJInterface from './components/DJInterface';
import Dashboard from './components/Dashboard';
import StreamDashboard from './components/StreamDashboard';


import AudioStreamEncoder from './components/AudioStreamEncoder';
import VideoStreamingControls from './components/VideoStreamingControls';
import AudioDeviceTestPage from './components/AudioDeviceTestPage';
import ServiceDiagnostics from './components/ServiceDiagnostics';
import Navigation from './components/Navigation';
import { AudioActivityProvider } from './contexts/AudioActivityContext';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { Container } from 'react-bootstrap';
import { audioService } from './services/AudioService';

// Debug environment variables in production
console.log('🔍 OneStopRadio Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_BASE_URL:', process.env.REACT_APP_API_BASE_URL);
console.log('REACT_APP_SIGNALING_URL:', process.env.REACT_APP_SIGNALING_URL); 
console.log('REACT_APP_AUDIO_URL:', process.env.REACT_APP_AUDIO_URL);

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'streams' | 'dedicated-stream' | 'mixer' | 'encoder' | 'video' | 'device-test' | 'diagnostics'>('dashboard');
  const [isStreaming] = useState(false);
  const [listenerCount] = useState(1247);
  const [terminology] = useState<'dj' | 'radio' | 'broadcaster'>('radio');

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('dashboard');
  };

  const handleViewChange = (view: 'dashboard' | 'streams' | 'dedicated-stream' | 'mixer' | 'encoder' | 'video' | 'device-test' | 'diagnostics') => {
    setCurrentView(view);
  };

  // Initialize AudioService when app starts
  useEffect(() => {
    const initAudioService = async () => {
      try {
        console.log('🎵 App: Initializing AudioService...');
        // Reduced timeout to prevent app-level freezing
        const initPromise = audioService.initialize();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('App AudioService initialization timeout')), 1500)
        );
        
        const success = await Promise.race([initPromise, timeoutPromise]);
        if (success) {
          console.log('✅ AudioService initialized successfully');
          // Create default channels (non-blocking)
          setTimeout(() => {
            audioService.createChannel('A');
            audioService.createChannel('B');
          }, 100);
        } else {
          console.warn('⚠️ AudioService initialization returned false, continuing...');
        }
      } catch (error) {
        console.warn('⚠️ AudioService initialization failed, app will continue with limited audio features:', error);
        // App continues to function even if audio init fails
      }
    };

    if (isLoggedIn) {
      // Initialize audio service in background to prevent UI blocking
      setTimeout(() => initAudioService(), 100);
    }
  }, [isLoggedIn]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} />;
      case 'streams':
        return <StreamDashboard />;
      case 'dedicated-stream':
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ffffff' }}>
            <h2 style={{ color: '#ffffff' }}>Dedicated Stream Manager</h2>
            <p style={{ color: '#ffffff' }}>Advanced streaming management coming soon...</p>
          </div>
        );
      case 'mixer':
        return <DJInterface />;
      case 'encoder':
        return <AudioStreamEncoder />;
      case 'video':
        return <VideoStreamingControls />;
      case 'device-test':
        return <AudioDeviceTestPage />;
      case 'diagnostics':
        return <ServiceDiagnostics />;
      default:
        return <Dashboard onViewChange={handleViewChange} />;
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="App">
        <Container>
          <HomePage onLogin={handleLogin} />
        </Container>
      </div>
    );
  }

  return (
    <div className="App">
      <AudioActivityProvider>
        <PlaylistProvider>
          <Navigation
            currentView={currentView}
            onViewChange={handleViewChange}
            isStreaming={isStreaming}
            listenerCount={listenerCount}
            terminology={terminology}
            onLogout={handleLogout}
          />
          <Container fluid>
            {renderCurrentView()}
          </Container>
        </PlaylistProvider>
      </AudioActivityProvider>
    </div>
  );
}

export default App;