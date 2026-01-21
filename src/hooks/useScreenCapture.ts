import { useState, useRef, useCallback, useEffect } from 'react';
import { AnimationMode, AnimationMode3D } from './useVisualizerSettings';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export type SourceType = 'screen' | 'camera';

export interface CaptureSource {
  id: string;
  stream: MediaStream;
  videoElement: HTMLVideoElement;
  name: string;
  type: SourceType;
}

export interface CaptureRegion {
  id: string;
  sourceId: string; // Which capture source this region belongs to
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean; // Whether the region is visible (default true)
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
  randomizeEnabled?: boolean; // Enable random mode cycling
  randomizeInterval?: number; // Interval in seconds (1-300)
  fadeOpacity?: number; // For fade transitions (0-1)
  transitionType?: 'none' | 'fade' | 'zoom'; // Transition style between modes
  morphProgress?: number; // For zoom transitions (0-1)
  animationMode2D?: AnimationMode; // Per-region 2D animation mode
  transitionFrozen?: boolean; // True when position should be frozen during transition
  customModelId?: string; // ID of custom 3D model to use instead of built-in shapes
}

export function useScreenCapture() {
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sourceCounterRef = useRef(0);
  const cameraCounterRef = useRef(0);

  // Enumerate available cameras
  const refreshCameras = useCallback(async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => stream.getTracks().forEach(track => track.stop()));
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
        }));
      setAvailableCameras(cameras);
      return cameras;
    } catch (err) {
      console.error('Failed to enumerate cameras:', err);
      return [];
    }
  }, []);

  const addSource = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const sourceId = crypto.randomUUID();
      sourceCounterRef.current += 1;
      
      // Create video element for this source
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = mediaStream;
      await video.play();

      const trackSettings = mediaStream.getVideoTracks()[0]?.getSettings();
      const displayName = `Source ${sourceCounterRef.current}`;

      const newSource: CaptureSource = {
        id: sourceId,
        stream: mediaStream,
        videoElement: video,
        name: displayName,
        type: 'screen',
      };

      // Handle stream ending (user clicks "Stop sharing")
      mediaStream.getVideoTracks()[0].onended = () => {
        setSources(prev => prev.filter(s => s.id !== sourceId));
      };

      setSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen capture';
      setError(message);
      return null;
    }
  }, []);

  const addCameraSource = useCallback(async (deviceId?: string) => {
    try {
      setError(null);
      console.log('Requesting camera access...', deviceId ? `Device: ${deviceId}` : 'Default camera');
      
      const videoConstraints: MediaTrackConstraints = deviceId 
        ? { deviceId: { exact: deviceId } }
        : { facingMode: 'user' };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });

      console.log('Camera access granted');
      
      const sourceId = crypto.randomUUID();
      cameraCounterRef.current += 1;
      
      // Create video element for this source
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = mediaStream;
      await video.play();

      // Get camera label from the track
      const track = mediaStream.getVideoTracks()[0];
      const cameraLabel = track?.label || `Camera ${cameraCounterRef.current}`;
      const displayName = cameraLabel.length > 30 
        ? cameraLabel.substring(0, 27) + '...' 
        : cameraLabel;

      const newSource: CaptureSource = {
        id: sourceId,
        stream: mediaStream,
        videoElement: video,
        name: displayName,
        type: 'camera',
      };

      // Handle stream ending
      mediaStream.getVideoTracks()[0].onended = () => {
        setSources(prev => prev.filter(s => s.id !== sourceId));
      };

      setSources(prev => [...prev, newSource]);
      return newSource;
    } catch (err) {
      console.error('Camera access failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
      throw err; // Re-throw so caller can handle it
    }
  }, []);

  const removeSource = useCallback((sourceId: string) => {
    setSources(prev => {
      const source = prev.find(s => s.id === sourceId);
      if (source) {
        source.stream.getTracks().forEach(track => track.stop());
      }
      return prev.filter(s => s.id !== sourceId);
    });
  }, []);

  const stopAllCaptures = useCallback(() => {
    sources.forEach(source => {
      source.stream.getTracks().forEach(track => track.stop());
    });
    setSources([]);
    sourceCounterRef.current = 0;
    cameraCounterRef.current = 0;
  }, [sources]);

  const getVideoElement = useCallback((sourceId: string) => {
    return sources.find(s => s.id === sourceId)?.videoElement ?? null;
  }, [sources]);

  // Legacy compatibility - check if any source is capturing
  const isCapturing = sources.length > 0;
  const stream = sources[0]?.stream ?? null;

  return {
    sources,
    availableCameras,
    isCapturing,
    stream, // Legacy: first stream for backward compatibility
    error,
    addSource,
    addCameraSource,
    refreshCameras,
    removeSource,
    stopAllCaptures,
    getVideoElement,
  };
}
