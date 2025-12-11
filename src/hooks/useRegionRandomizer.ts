import { useEffect, useRef, useCallback } from 'react';
import { CaptureRegion } from './useScreenCapture';
import { AnimationMode3D, ANIMATION_MODES_3D, VisualizerMode } from './useVisualizerSettings';

interface UseRegionRandomizerProps {
  regions: CaptureRegion[];
  onUpdateRegion: (regionId: string, updates: Partial<CaptureRegion>) => void;
  visualizerMode: VisualizerMode;
  isVisualizerActive: boolean;
}

export function useRegionRandomizer({
  regions,
  onUpdateRegion,
  visualizerMode,
  isVisualizerActive,
}: UseRegionRandomizerProps) {
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fadeTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const fadeInTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Store regions in a ref so interval callbacks can access latest state
  const regionsRef = useRef(regions);
  regionsRef.current = regions;
  
  // Store visualizerMode in ref for callbacks
  const visualizerModeRef = useRef(visualizerMode);
  visualizerModeRef.current = visualizerMode;

  const getRandomMode3D = useCallback((excludeMode?: AnimationMode3D): AnimationMode3D => {
    const availableModes = ANIMATION_MODES_3D.filter(m => m !== excludeMode);
    return availableModes[Math.floor(Math.random() * availableModes.length)];
  }, []);

  const triggerRandomChange = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    // Start fade out
    onUpdateRegion(regionId, { fadeOpacity: 0 });

    // Clear any existing fade timeouts for this region
    const existingFadeTimeout = fadeTimeoutRefs.current.get(regionId);
    if (existingFadeTimeout) {
      clearTimeout(existingFadeTimeout);
    }
    const existingFadeInTimeout = fadeInTimeoutRefs.current.get(regionId);
    if (existingFadeInTimeout) {
      clearTimeout(existingFadeInTimeout);
    }

    // After fade out, change mode
    const fadeTimeout = setTimeout(() => {
      if (visualizerModeRef.current === '3d') {
        const currentRegion = regionsRef.current.find(r => r.id === regionId);
        const currentMode = currentRegion?.animationMode3D;
        const newMode = getRandomMode3D(currentMode);
        onUpdateRegion(regionId, { animationMode3D: newMode });
      }

      // Start fade in after mode change
      const fadeInTimeout = setTimeout(() => {
        onUpdateRegion(regionId, { fadeOpacity: 1 });
        fadeInTimeoutRefs.current.delete(regionId);
      }, 100);
      
      fadeInTimeoutRefs.current.set(regionId, fadeInTimeout);
      fadeTimeoutRefs.current.delete(regionId);
    }, 400);

    fadeTimeoutRefs.current.set(regionId, fadeTimeout);
  }, [getRandomMode3D, onUpdateRegion]);

  // Setup intervals - only re-run when specific properties change
  useEffect(() => {
    if (!isVisualizerActive) {
      // Clear all intervals when visualizer stops
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      intervalRefs.current.clear();
      fadeTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      fadeTimeoutRefs.current.clear();
      fadeInTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      fadeInTimeoutRefs.current.clear();
      return;
    }

    // Track which regions need interval updates
    const currentIntervalSettings = new Map<string, { enabled: boolean; interval: number }>();
    
    regions.forEach((region) => {
      currentIntervalSettings.set(region.id, {
        enabled: region.randomizeEnabled ?? false,
        interval: region.randomizeInterval ?? 30,
      });
    });

    // Update intervals based on settings
    regions.forEach((region) => {
      const existingInterval = intervalRefs.current.get(region.id);
      
      if (region.randomizeEnabled && region.visible !== false) {
        const intervalMs = (region.randomizeInterval || 30) * 1000;
        
        // Clear existing interval to reset timing
        if (existingInterval) {
          clearInterval(existingInterval);
        }

        // Set new interval that uses ref to get latest region state
        const newInterval = setInterval(() => {
          triggerRandomChange(region.id);
        }, intervalMs);

        intervalRefs.current.set(region.id, newInterval);
      } else {
        // Clear interval if randomize is disabled
        if (existingInterval) {
          clearInterval(existingInterval);
          intervalRefs.current.delete(region.id);
        }
      }
    });

    // Cleanup intervals for removed regions
    intervalRefs.current.forEach((interval, regionId) => {
      if (!regions.find(r => r.id === regionId)) {
        clearInterval(interval);
        intervalRefs.current.delete(regionId);
      }
    });

    // Only cleanup intervals on unmount, not fade timeouts
    return () => {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
    };
  }, [
    isVisualizerActive,
    triggerRandomChange,
    // Only depend on serialized randomize settings to avoid re-running on every region update
    JSON.stringify(regions.map(r => ({ 
      id: r.id, 
      randomizeEnabled: r.randomizeEnabled, 
      randomizeInterval: r.randomizeInterval,
      visible: r.visible 
    })))
  ]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      fadeTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      fadeInTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);
}
