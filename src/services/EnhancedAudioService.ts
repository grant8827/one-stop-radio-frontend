/**
 * Enhanced Audio Service for OneStopRadio
 * Interfaces with C++ backend audio system for professional audio processing
 */

export interface AudioDevice {
    id: number;
    name: string;
    maxInputChannels?: number;
    maxOutputChannels?: number;
    defaultSampleRate?: number;
}

export interface AudioLevels {
    left_peak: number;
    right_peak: number;
    left_rms: number;
    right_rms: number;
    left_db: number;
    right_db: number;
    clipping: boolean;
    timestamp: number;
}

export interface MicrophoneConfig {
    enabled: boolean;
    gain: number;
    gate_threshold: number;
    noise_suppression: boolean;
    echo_cancellation: boolean;
    auto_gain_control: boolean;
    device_id: number;
}

export interface AudioChannel {
    id: string;
    name: string;
    loaded: boolean;
    playing: boolean;
    volume: number;
    file_path?: string;
}

export interface ReverbSettings {
    enabled: boolean;
    room_size: number;
    damping: number;
    wet_level: number;
}

export interface DelaySettings {
    enabled: boolean;
    delay_time: number;
    feedback: number;
    wet_level: number;
}

class EnhancedAudioService {
    private baseUrl = 'http://localhost:8080/api';
    private levelUpdateCallbacks: ((levels: AudioLevels) => void)[] = [];
    private micLevelUpdateCallbacks: ((levels: AudioLevels) => void)[] = [];
    private isMonitoringLevels = false;
    private levelMonitorInterval?: NodeJS.Timeout;

    // ===========================
    // DEVICE MANAGEMENT
    // ===========================

    async getInputDevices(): Promise<AudioDevice[]> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/devices/input`);
            const data = await response.json();
            return data.success ? data.devices : [];
        } catch (error) {
            console.error('Failed to get input devices:', error);
            return [];
        }
    }

    async getOutputDevices(): Promise<AudioDevice[]> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/devices/output`);
            const data = await response.json();
            return data.success ? data.devices : [];
        } catch (error) {
            console.error('Failed to get output devices:', error);
            return [];
        }
    }

    // ===========================
    // MICROPHONE CONTROLS
    // ===========================

    async enableMicrophone(config: Partial<MicrophoneConfig>): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/microphone/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to enable microphone:', error);
            return false;
        }
    }

    async disableMicrophone(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/microphone/disable`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to disable microphone:', error);
            return false;
        }
    }

    async setMicrophoneGain(gain: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/microphone/gain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gain }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to set microphone gain:', error);
            return false;
        }
    }

    async getMicrophoneConfig(): Promise<MicrophoneConfig | null> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/microphone/config`);
            const data = await response.json();
            return data.success ? data.config : null;
        } catch (error) {
            console.error('Failed to get microphone config:', error);
            return null;
        }
    }

    // ===========================
    // AUDIO CHANNELS
    // ===========================

    async createAudioChannel(): Promise<string | null> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channels/create`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success ? data.channel_id : null;
        } catch (error) {
            console.error('Failed to create audio channel:', error);
            return null;
        }
    }

    async getActiveChannels(): Promise<AudioChannel[]> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channels/list`);
            const data = await response.json();
            return data.success ? data.channels : [];
        } catch (error) {
            console.error('Failed to get active channels:', error);
            return [];
        }
    }

    async loadAudioFile(channelId: string, filePath: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channel/load`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId, file_path: filePath }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to load audio file:', error);
            return false;
        }
    }

    async playChannel(channelId: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channel/play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to play channel:', error);
            return false;
        }
    }

    async pauseChannel(channelId: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channel/pause`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to pause channel:', error);
            return false;
        }
    }

    async stopChannel(channelId: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channel/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to stop channel:', error);
            return false;
        }
    }

    async setChannelVolume(channelId: string, volume: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/channel/volume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId, volume }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to set channel volume:', error);
            return false;
        }
    }

    // ===========================
    // MASTER CONTROLS
    // ===========================

    async setMasterVolume(volume: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/master/volume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ volume }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to set master volume:', error);
            return false;
        }
    }

    async setCrossfaderPosition(position: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/crossfader`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ position }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to set crossfader position:', error);
            return false;
        }
    }

    // ===========================
    // LEVEL MONITORING
    // ===========================

    async getMasterLevels(): Promise<AudioLevels | null> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/levels/master`);
            const data = await response.json();
            return data.success ? data.levels : null;
        } catch (error) {
            console.error('Failed to get master levels:', error);
            return null;
        }
    }

    async getMicrophoneLevels(): Promise<AudioLevels | null> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/levels/microphone`);
            const data = await response.json();
            return data.success ? data.levels : null;
        } catch (error) {
            console.error('Failed to get microphone levels:', error);
            return null;
        }
    }

    async getChannelLevels(channelId: string): Promise<AudioLevels | null> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/levels/channel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId }),
            });
            const data = await response.json();
            return data.success ? data.levels : null;
        } catch (error) {
            console.error('Failed to get channel levels:', error);
            return null;
        }
    }

    // Legacy endpoint for compatibility
    async getLegacyLevels(): Promise<{ left: number; right: number; microphone: number; timestamp: number } | null> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/levels`);
            const data = await response.json();
            return data.success ? data.levels : null;
        } catch (error) {
            console.error('Failed to get legacy levels:', error);
            return null;
        }
    }

    // Real-time level monitoring
    startLevelMonitoring(interval: number = 50): void {
        if (this.isMonitoringLevels) return;

        this.isMonitoringLevels = true;
        this.levelMonitorInterval = setInterval(async () => {
            // Get master levels
            const masterLevels = await this.getMasterLevels();
            if (masterLevels) {
                this.levelUpdateCallbacks.forEach(callback => callback(masterLevels));
            }

            // Get microphone levels
            const micLevels = await this.getMicrophoneLevels();
            if (micLevels) {
                this.micLevelUpdateCallbacks.forEach(callback => callback(micLevels));
            }
        }, interval);
    }

    stopLevelMonitoring(): void {
        this.isMonitoringLevels = false;
        if (this.levelMonitorInterval) {
            clearInterval(this.levelMonitorInterval);
            this.levelMonitorInterval = undefined;
        }
    }

    onMasterLevelUpdate(callback: (levels: AudioLevels) => void): void {
        this.levelUpdateCallbacks.push(callback);
    }

    onMicrophoneLevelUpdate(callback: (levels: AudioLevels) => void): void {
        this.micLevelUpdateCallbacks.push(callback);
    }

    // ===========================
    // AUDIO EFFECTS
    // ===========================

    async setReverb(settings: ReverbSettings): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/effects/reverb`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to set reverb:', error);
            return false;
        }
    }

    async setDelay(settings: DelaySettings): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/effects/delay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settings),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to set delay:', error);
            return false;
        }
    }

    // ===========================
    // ANALYSIS FEATURES
    // ===========================

    async detectBPM(channelId: string): Promise<number> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/bpm/detect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_id: channelId }),
            });
            const data = await response.json();
            return data.success ? data.bpm : 0;
        } catch (error) {
            console.error('Failed to detect BPM:', error);
            return 0;
        }
    }

    async enableBPMSync(channelA: string, channelB: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/bpm/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ channel_a: channelA, channel_b: channelB }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to enable BPM sync:', error);
            return false;
        }
    }

    async getSpectrumData(bins: number = 256): Promise<number[]> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/spectrum`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ bins }),
            });
            const data = await response.json();
            return data.success ? data.spectrum : [];
        } catch (error) {
            console.error('Failed to get spectrum data:', error);
            return [];
        }
    }

    // ===========================
    // STREAMING & RECORDING
    // ===========================

    async startStreaming(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/stream/start`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to start streaming:', error);
            return false;
        }
    }

    async stopStreaming(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/stream/stop`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to stop streaming:', error);
            return false;
        }
    }

    async startRecording(outputFile: string = 'recording.wav'): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/record/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ output_file: outputFile }),
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to start recording:', error);
            return false;
        }
    }

    async stopRecording(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/audio/record/stop`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Failed to stop recording:', error);
            return false;
        }
    }

    // ===========================
    // CLEANUP
    // ===========================

    cleanup(): void {
        this.stopLevelMonitoring();
        this.levelUpdateCallbacks = [];
        this.micLevelUpdateCallbacks = [];
    }
}

// Export singleton instance
export const enhancedAudioService = new EnhancedAudioService();
export default enhancedAudioService;