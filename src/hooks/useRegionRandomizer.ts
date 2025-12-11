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

  const getRandomMode3D = useCallback((excludeMode?: AnimationMode3D): AnimationMode3D => {
    const availableModes = ANIMATION_MODES_3D.filter(m => m !== excludeMode);
    return availableModes[Math.floor(Math.random() * availableModes.length)];
  }, []);

  const triggerRandomChange = useCallback((region: CaptureRegion) => {
    if (!region.randomizeEnabled) return;

    // Start fade out
    onUpdateRegion(region.id, { fadeOpacity: 0 });

    // Clear any existing fade timeout for this region
    const existingTimeout = fadeTimeoutRefs.current.get(region.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // After fade out, change mode
    const fadeTimeout = setTimeout(() => {
      if (visualizerMode === '3d') {
        const currentMode = region.animationMode3D;
        const newMode = getRandomMode3D(currentMode);
        onUpdateRegion(region.id, { animationMode3D: newMode });
      }
      // For 2D mode, we also change to a random 3D mode stored in the region
      // This can be used to trigger different behaviors if needed

      // Start fade in after mode change
      setTimeout(() => {
        onUpdateRegion(region.id, { fadeOpacity: 1 });
      }, 100);
    }, 400); // 400ms fade out duration

    fadeTimeoutRefs.current.set(region.id, fadeTimeout);
  }, [visualizerMode, getRandomMode3D, onUpdateRegion]);

  // Setup intervals for each region with randomize enabled
  useEffect(() => {
    if (!isVisualizerActive) {
      // Clear all intervals when visualizer stops
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      intervalRefs.current.clear();
      fadeTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      fadeTimeoutRefs.current.clear();
      return;
    }

    regions.forEach((region) => {
      const existingInterval = intervalRefs.current.get(region.id);
      
      if (region.randomizeEnabled && region.visible !== false) {
        const intervalMs = (region.randomizeInterval || 30) * 1000;
        
        // Check if we need to create/update interval
        // We need to track the interval time to know if it changed
        if (existingInterval) {
          clearInterval(existingInterval);
        }

        // Initialize fadeOpacity to 1 if not set
        if (region.fadeOpacity === undefined) {
          onUpdateRegion(region.id, { fadeOpacity: 1 });
        }

        // Set new interval
        const newInterval = setInterval(() => {
          // Re-fetch the region to get current state
          const currentRegion = regions.find(r => r.id === region.id);
          if (currentRegion && currentRegion.randomizeEnabled) {
            triggerRandomChange(currentRegion);
          }
        }, intervalMs);

        intervalRefs.current.set(region.id, newInterval);
      } else {
        // Clear interval if randomize is disabled
        if (existingInterval) {
          clearInterval(existingInterval);
          intervalRefs.current.delete(region.id);
        }
        // Reset opacity when disabled
        if (region.fadeOpacity !== undefined && region.fadeOpacity !== 1) {
          onUpdateRegion(region.id, { fadeOpacity: 1 });
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

    return () => {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      fadeTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [regions, isVisualizerActive, triggerRandomChange, onUpdateRegion]);
}
