import React, { useRef, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const enableWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam: ", err);
      }
    };

    enableWebcam();

    // Cleanup function to stop the stream when the component unmounts
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <Box sx={{ backgroundColor: 'black', width: '100%', aspectRatio: '16/9' }}>
      <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%' }} />
    </Box>
  );
};

export default VideoPlayer;