class StreamEncoderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isStreaming = false;
  private streamConfig: any = null;

  async startStreaming(streamInfo: any, audioSource: MediaStreamAudioSourceNode) {
    if (this.isStreaming) return;

    try {
      this.streamConfig = streamInfo;
      
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Get audio stream from the mixer/decks
      const stream = new MediaStream();
      const destination = this.audioContext.createMediaStreamDestination();
      
      // Connect audio source to destination
      audioSource.connect(destination);
      stream.addTrack(destination.stream.getAudioTracks()[0]);

      // Create media recorder for streaming
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: streamInfo.bitrate * 1000
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.sendToShoutcast(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Send data every second
      this.isStreaming = true;
      
      console.log(`🔴 Started streaming to ${streamInfo.host}:${streamInfo.port}`);
      
    } catch (error) {
      console.error('Failed to start streaming:', error);
      throw error;
    }
  }

  private async sendToShoutcast(audioData: Blob) {
    if (!this.streamConfig) return;

    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioData.arrayBuffer();
      
      // Send to Shoutcast server (simplified - in real implementation would use WebSocket or proper streaming protocol)
      fetch(`http://${this.streamConfig.host}:${this.streamConfig.port}/live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
          'Authorization': `Basic ${btoa(':' + this.streamConfig.sourcePassword)}`,
          'User-Agent': 'OneStopRadio/1.0'
        },
        body: arrayBuffer
      }).catch(err => {
        console.warn('Stream send failed:', err);
      });
      
    } catch (error) {
      console.error('Failed to send audio data:', error);
    }
  }

  stopStreaming() {
    if (this.mediaRecorder && this.isStreaming) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
      this.isStreaming = false;
      console.log('🔴 Stopped streaming');
    }
  }

  getStreamingStatus() {
    return this.isStreaming;
  }
}

export const streamEncoderService = new StreamEncoderService();