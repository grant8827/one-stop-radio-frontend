import React, { useState, useEffect } from 'react';
import './App.css';
import HomePage from './components/HomePage';
import DJInterface from './components/DJInterface';
import Dashboard from './components/Dashboard';
import AudioStreamEncoder from './components/AudioStreamEncoder';
import VideoStreamingControls from './components/VideoStreamingControls';
import AudioDeviceTestPage from './components/AudioDeviceTestPage';
import Navigation from './components/Navigation';
import { AudioActivityProvider } from './contexts/AudioActivityContext';
import { PlaylistProvider } from './contexts/PlaylistContext';
import { Container } from 'react-bootstrap';
import { audioService } from './services/AudioService';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'mixer' | 'encoder' | 'video' | 'device-test'>('dashboard');
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

  const handleViewChange = (view: 'dashboard' | 'mixer' | 'encoder' | 'video' | 'device-test') => {
    setCurrentView(view);
  };

  // Initialize AudioService when app starts
  useEffect(() => {
    const initAudioService = async () => {
      try {
        const success = await audioService.initialize();
        if (success) {
          console.log('🎵 AudioService initialized successfully');
          // Create default channels
          audioService.createChannel('A');
          audioService.createChannel('B');
        } else {
          console.error('❌ Failed to initialize AudioService');
        }
      } catch (error) {
        console.error('❌ AudioService initialization error:', error);
      }
    };

    if (isLoggedIn) {
      initAudioService();
    }
  }, [isLoggedIn]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} />;
      case 'mixer':
        return <DJInterface />;
      case 'encoder':
        return <AudioStreamEncoder />;
      case 'video':
        return <VideoStreamingControls />;
      case 'device-test':
        return <AudioDeviceTestPage />;
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