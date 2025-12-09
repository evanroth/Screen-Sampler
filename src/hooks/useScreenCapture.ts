import { useState, useRef, useCallback } from 'react';
import { AnimationMode3D } from './useVisualizerSettings';

export interface CaptureRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  animationMode3D?: AnimationMode3D;
  position3D?: { x: number; y: number; z: number };
  scale3D?: number;
  position2D?: { x: number; y: number; z: number };
  scale2D?: number;
  transparentColor?: string;
  transparentThreshold?: number;
  glowEnabled?: boolean;
  glowColor?: string;
  glowAmount?: number;
  fullscreenBackground?: boolean;
}

export function useScreenCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setStream(mediaStream);
      setIsCapturing(true);

      // Handle stream ending (user clicks "Stop sharing")
      mediaStream.getVideoTracks()[0].onended = () => {
        setIsCapturing(false);
        setStream(null);
      };

      return mediaStream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen capture';
      setError(message);
      setIsCapturing(false);
      return null;
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const attachToVideo = useCallback((video: HTMLVideoElement) => {
    videoRef.current = video;
    if (stream && video) {
      video.srcObject = stream;
    }
  }, [stream]);

  return {
    isCapturing,
    stream,
    error,
    startCapture,
    stopCapture,
    attachToVideo,
    videoRef,
  };
}
