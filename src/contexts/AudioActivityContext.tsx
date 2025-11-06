import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AudioActivityState {
  channelAPlaying: boolean;
  channelBPlaying: boolean;
  microphoneActive: boolean;
  masterLevel: number;
}

interface AudioActivityContextType {
  audioState: AudioActivityState;
  updateChannelA: (playing: boolean) => void;
  updateChannelB: (playing: boolean) => void;
  updateMicrophone: (active: boolean) => void;
  updateMasterLevel: (level: number) => void;
  getOverallActivity: () => boolean;
  getActivityLevel: () => number;
}

const defaultState: AudioActivityState = {
  channelAPlaying: false,
  channelBPlaying: false,
  microphoneActive: false,
  masterLevel: 0
};

const AudioActivityContext = createContext<AudioActivityContextType | null>(null);

export const useAudioActivity = () => {
  const context = useContext(AudioActivityContext);
  if (!context) {
    throw new Error('useAudioActivity must be used within an AudioActivityProvider');
  }
  return context;
};

interface AudioActivityProviderProps {
  children: ReactNode;
}

export const AudioActivityProvider: React.FC<AudioActivityProviderProps> = ({ children }) => {
  const [audioState, setAudioState] = useState<AudioActivityState>(defaultState);

  const updateChannelA = (playing: boolean) => {
    setAudioState(prev => ({ ...prev, channelAPlaying: playing }));
  };

  const updateChannelB = (playing: boolean) => {
    setAudioState(prev => ({ ...prev, channelBPlaying: playing }));
  };

  const updateMicrophone = (active: boolean) => {
    setAudioState(prev => ({ ...prev, microphoneActive: active }));
  };

  const updateMasterLevel = (level: number) => {
    setAudioState(prev => ({ ...prev, masterLevel: level }));
  };

  const getOverallActivity = (): boolean => {
    return audioState.channelAPlaying || audioState.channelBPlaying || audioState.microphoneActive;
  };

  const getActivityLevel = (): number => {
    let level = 0;
    
    // Base level from playing channels
    if (audioState.channelAPlaying) level += 30;
    if (audioState.channelBPlaying) level += 30;
    if (audioState.microphoneActive) level += 20;
    
    // Add some variation to simulate real audio
    if (level > 0) {
      level += Math.random() * 30; // Add 0-30% variation
    }
    
    return Math.min(level, 100);
  };

  const contextValue: AudioActivityContextType = {
    audioState,
    updateChannelA,
    updateChannelB,
    updateMicrophone,
    updateMasterLevel,
    getOverallActivity,
    getActivityLevel
  };

  return (
    <AudioActivityContext.Provider value={contextValue}>
      {children}
    </AudioActivityContext.Provider>
  );
};

export default AudioActivityContext;