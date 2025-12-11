import { useState, useRef, useCallback } from 'react';
import { AnimationMode3D } from './useVisualizerSettings';

export interface CaptureSource {
  id: string;
  stream: MediaStream;
  videoElement: HTMLVideoElement;
  name: string;
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
  transitionType?: 'fade' | 'zoom' | 'morph'; // Transition style between modes
  morphProgress?: number; // For zoom/morph transitions (0-1)
  previousAnimationMode3D?: AnimationMode3D; // For morph transitions - the mode we're transitioning from
}

export function useScreenCapture() {
  const [sources, setSources] = useState<CaptureSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const sourceCounterRef = useRef(0);

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
  }, [sources]);

  const getVideoElement = useCallback((sourceId: string) => {
    return sources.find(s => s.id === sourceId)?.videoElement ?? null;
  }, [sources]);

  // Legacy compatibility - check if any source is capturing
  const isCapturing = sources.length > 0;
  const stream = sources[0]?.stream ?? null;

  return {
    sources,
    isCapturing,
    stream, // Legacy: first stream for backward compatibility
    error,
    addSource,
    removeSource,
    stopAllCaptures,
    getVideoElement,
  };
}
