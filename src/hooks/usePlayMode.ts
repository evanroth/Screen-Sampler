import { useEffect, useRef, useCallback, useState } from 'react';
import { CaptureRegion } from './useScreenCapture';

export type PlayModeTransition = 'none' | 'fade' | 'zoom';

export interface PlayModeSettings {
  enabled: boolean;
  interval: number; // seconds
  transition: PlayModeTransition;
}

interface UsePlayModeProps {
  regions: CaptureRegion[];
  onUpdateRegion: (regionId: string, updates: Partial<CaptureRegion>) => void;
  isVisualizerActive: boolean;
  settings: PlayModeSettings;
}

const TRANSITION_DURATION = 2000;

export function usePlayMode({
  regions,
  onUpdateRegion,
  isVisualizerActive,
  settings,
}: UsePlayModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const regionsRef = useRef(regions);
  regionsRef.current = regions;

  const cancelAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const clearPlayInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Transition to next region with animation
  const transitionToNext = useCallback(() => {
    const currentRegions = regionsRef.current;
    if (currentRegions.length < 2) return;

    const currentIdx = currentIndex % currentRegions.length;
    const nextIdx = (currentIndex + 1) % currentRegions.length;
    const currentRegion = currentRegions[currentIdx];
    const nextRegion = currentRegions[nextIdx];

    if (!currentRegion || !nextRegion) return;

    cancelAnimation();

    if (settings.transition === 'none') {
      // Instant switch
      onUpdateRegion(currentRegion.id, { visible: false });
      onUpdateRegion(nextRegion.id, { visible: true });
      setCurrentIndex(nextIdx);
    } else if (settings.transition === 'fade') {
      // Fade transition
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        
        // Fade out current, fade in next
        let outOpacity: number;
        let inOpacity: number;
        
        if (progress < 0.5) {
          // First half: fade out current
          outOpacity = 1 - (progress * 2);
          inOpacity = 0;
        } else {
          // Second half: fade in next
          outOpacity = 0;
          inOpacity = (progress - 0.5) * 2;
        }
        
        // At midpoint, switch visibility
        if (progress >= 0.5 && progress < 0.55) {
          onUpdateRegion(currentRegion.id, { visible: false, fadeOpacity: undefined });
          onUpdateRegion(nextRegion.id, { visible: true, fadeOpacity: inOpacity });
        } else if (progress < 0.5) {
          onUpdateRegion(currentRegion.id, { fadeOpacity: outOpacity });
        } else {
          onUpdateRegion(nextRegion.id, { fadeOpacity: inOpacity });
        }
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Complete
          onUpdateRegion(nextRegion.id, { fadeOpacity: undefined });
          setCurrentIndex(nextIdx);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (settings.transition === 'zoom') {
      // Zoom transition
      const startTime = performance.now();
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        
        // At midpoint, switch visibility
        if (progress >= 0.5 && progress < 0.55) {
          onUpdateRegion(currentRegion.id, { visible: false, morphProgress: undefined });
          onUpdateRegion(nextRegion.id, { visible: true, morphProgress: progress, transitionType: 'zoom' });
        } else if (progress < 0.5) {
          onUpdateRegion(currentRegion.id, { morphProgress: progress, transitionType: 'zoom' });
        } else {
          onUpdateRegion(nextRegion.id, { morphProgress: progress, transitionType: 'zoom' });
        }
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Complete
          onUpdateRegion(nextRegion.id, { morphProgress: undefined, transitionType: undefined });
          setCurrentIndex(nextIdx);
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [currentIndex, settings.transition, onUpdateRegion, cancelAnimation]);

  // Initialize play mode - show only first region
  const initializePlayMode = useCallback(() => {
    const currentRegions = regionsRef.current;
    if (currentRegions.length < 2) return;
    
    currentRegions.forEach((region, index) => {
      onUpdateRegion(region.id, { 
        visible: index === 0,
        fadeOpacity: undefined,
        morphProgress: undefined
      });
    });
    setCurrentIndex(0);
  }, [onUpdateRegion]);

  // Restore all regions visibility when play mode ends
  const restoreAllRegions = useCallback(() => {
    const currentRegions = regionsRef.current;
    currentRegions.forEach((region) => {
      onUpdateRegion(region.id, { 
        visible: true,
        fadeOpacity: undefined,
        morphProgress: undefined
      });
    });
  }, [onUpdateRegion]);

  // Main effect for play mode
  useEffect(() => {
    const canRun = isVisualizerActive && settings.enabled && regions.length >= 2;

    if (!canRun) {
      clearPlayInterval();
      cancelAnimation();
      if (settings.enabled === false && regions.length > 0) {
        // Play mode was turned off, restore all regions
        restoreAllRegions();
      }
      return;
    }

    // Initialize when play mode starts
    initializePlayMode();

    // Set up interval
    const intervalMs = settings.interval * 1000;
    intervalRef.current = setInterval(() => {
      transitionToNext();
    }, intervalMs);

    return () => {
      clearPlayInterval();
      cancelAnimation();
    };
  }, [
    isVisualizerActive,
    settings.enabled,
    settings.interval,
    regions.length,
    initializePlayMode,
    transitionToNext,
    clearPlayInterval,
    cancelAnimation,
    restoreAllRegions
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
      clearPlayInterval();
    };
  }, [cancelAnimation, clearPlayInterval]);

  return {
    currentIndex,
    isActive: settings.enabled && regions.length >= 2,
  };
}
