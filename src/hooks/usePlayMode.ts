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
  const currentIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const regionsRef = useRef(regions);
  const settingsRef = useRef(settings);
  const isInitializedRef = useRef(false);
  
  regionsRef.current = regions;
  settingsRef.current = settings;

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
    const currentSettings = settingsRef.current;
    if (currentRegions.length < 2) return;

    const currentIdx = currentIndexRef.current % currentRegions.length;
    const nextIdx = (currentIndexRef.current + 1) % currentRegions.length;
    const currentRegion = currentRegions[currentIdx];
    const nextRegion = currentRegions[nextIdx];

    if (!currentRegion || !nextRegion) return;

    cancelAnimation();

    if (currentSettings.transition === 'none') {
      // Instant switch
      onUpdateRegion(currentRegion.id, { visible: false });
      onUpdateRegion(nextRegion.id, { visible: true });
      currentIndexRef.current = nextIdx;
    } else if (currentSettings.transition === 'fade') {
      // Crossfade transition - both regions visible during transition
      const startTime = performance.now();
      
      // Set initial states before animation starts
      onUpdateRegion(currentRegion.id, { fadeOpacity: 1 });
      onUpdateRegion(nextRegion.id, { visible: true, fadeOpacity: 0 });
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        
        // Apply easing for smoother visual
        const eased = progress < 0.5
          ? 2 * progress * progress  // ease in
          : 1 - Math.pow(-2 * progress + 2, 2) / 2; // ease out
        
        // Crossfade: current fades out while next fades in simultaneously
        const outOpacity = 1 - eased;
        const inOpacity = eased;
        
        onUpdateRegion(currentRegion.id, { fadeOpacity: outOpacity });
        onUpdateRegion(nextRegion.id, { fadeOpacity: inOpacity });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Complete - hide old region, ensure new region is fully visible
          onUpdateRegion(currentRegion.id, { visible: false, fadeOpacity: undefined });
          onUpdateRegion(nextRegion.id, { fadeOpacity: undefined });
          currentIndexRef.current = nextIdx;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (currentSettings.transition === 'zoom') {
      // Zoom transition - both regions visible during transition
      const startTime = performance.now();
      
      // Make next region visible at start but at scale 0 (morphProgress 0 = scale 0)
      onUpdateRegion(nextRegion.id, { visible: true, morphProgress: 0, transitionType: 'zoom' });
      // Ensure current region has zoom transition type set
      onUpdateRegion(currentRegion.id, { morphProgress: 1, transitionType: 'zoom' });
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);
        
        // Current region: scale goes from 1 to 0 (morphProgress 1 -> 0)
        // Next region: scale goes from 0 to 1 (morphProgress 0 -> 1)
        const outProgress = 1 - progress;
        const inProgress = progress;
        
        onUpdateRegion(currentRegion.id, { morphProgress: outProgress, transitionType: 'zoom' });
        onUpdateRegion(nextRegion.id, { morphProgress: inProgress, transitionType: 'zoom' });
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Complete - hide old region, clear morph on new region
          onUpdateRegion(currentRegion.id, { visible: false, morphProgress: undefined, transitionType: undefined });
          onUpdateRegion(nextRegion.id, { morphProgress: undefined, transitionType: undefined });
          currentIndexRef.current = nextIdx;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [onUpdateRegion, cancelAnimation]);

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
    currentIndexRef.current = 0;
    isInitializedRef.current = true;
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
    isInitializedRef.current = false;
  }, [onUpdateRegion]);

  // Main effect for play mode
  useEffect(() => {
    const canRun = isVisualizerActive && settings.enabled && regions.length >= 2;

    if (!canRun) {
      clearPlayInterval();
      cancelAnimation();
      if (isInitializedRef.current) {
        // Play mode was active, now turning off - restore all regions
        restoreAllRegions();
      }
      return;
    }

    // Only initialize once when play mode starts
    if (!isInitializedRef.current) {
      initializePlayMode();
    }

    // Clear existing interval before setting new one
    clearPlayInterval();

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
    currentIndex: currentIndexRef.current,
    isActive: settings.enabled && regions.length >= 2,
  };
}
