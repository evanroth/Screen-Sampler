import { useEffect, useRef, useCallback } from 'react';
import { CaptureRegion } from './useScreenCapture';
import { AnimationMode, AnimationMode3D, ANIMATION_MODES, ANIMATION_MODES_3D, VisualizerMode } from './useVisualizerSettings';

interface UseRegionRandomizerProps {
  regions: CaptureRegion[];
  onUpdateRegion: (regionId: string, updates: Partial<CaptureRegion>) => void;
  visualizerMode: VisualizerMode;
  isVisualizerActive: boolean;
}

const FADE_DURATION = 400;
const ZOOM_DURATION = 800;

export function useRegionRandomizer({
  regions,
  onUpdateRegion,
  visualizerMode,
  isVisualizerActive,
}: UseRegionRandomizerProps) {
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const transitionRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const animationRefs = useRef<Map<string, number>>(new Map());
  
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

  const getRandomMode2D = useCallback((excludeMode?: AnimationMode): AnimationMode => {
    const availableModes = ANIMATION_MODES.filter(m => m !== excludeMode && m !== 'random');
    return availableModes[Math.floor(Math.random() * availableModes.length)];
  }, []);

  const clearTransitionTimeouts = useCallback((regionId: string) => {
    const existingTimeout = transitionRefs.current.get(regionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      transitionRefs.current.delete(regionId);
    }
    const existingAnimation = animationRefs.current.get(regionId);
    if (existingAnimation) {
      cancelAnimationFrame(existingAnimation);
      animationRefs.current.delete(regionId);
    }
  }, []);

  const triggerFadeTransition = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    clearTransitionTimeouts(regionId);

    // Get the new mode upfront
    let newMode3D: AnimationMode3D | undefined;
    let newMode2D: AnimationMode | undefined;
    
    if (visualizerModeRef.current === '3d') {
      const currentMode = region.animationMode3D;
      newMode3D = getRandomMode3D(currentMode);
    } else {
      const currentMode = region.animationMode2D;
      newMode2D = getRandomMode2D(currentMode);
    }

    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      
      // Fade out from 0-0.5, fade in from 0.5-1
      let opacity: number;
      if (progress < 0.5) {
        // Fade out: 1 -> 0
        opacity = 1 - (progress * 2);
      } else {
        // Fade in: 0 -> 1
        opacity = (progress - 0.5) * 2;
      }
      
      onUpdateRegion(regionId, { fadeOpacity: opacity });
      
      // At the midpoint, switch the mode
      if (progress >= 0.5) {
        const currentRegion = regionsRef.current.find(r => r.id === regionId);
        if (visualizerModeRef.current === '3d' && newMode3D) {
          if (currentRegion?.animationMode3D !== newMode3D) {
            onUpdateRegion(regionId, { animationMode3D: newMode3D });
          }
        } else if (newMode2D) {
          if (currentRegion?.animationMode2D !== newMode2D) {
            onUpdateRegion(regionId, { animationMode2D: newMode2D });
          }
        }
      }
      
      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        animationRefs.current.set(regionId, animId);
      } else {
        // Reset fade opacity when done
        onUpdateRegion(regionId, { fadeOpacity: undefined });
        animationRefs.current.delete(regionId);
      }
    };
    
    const animId = requestAnimationFrame(animate);
    animationRefs.current.set(regionId, animId);
  }, [getRandomMode3D, getRandomMode2D, onUpdateRegion, clearTransitionTimeouts]);

  const triggerZoomTransition = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    clearTransitionTimeouts(regionId);

    // Get the new mode upfront
    let newMode3D: AnimationMode3D | undefined;
    let newMode2D: AnimationMode | undefined;
    
    if (visualizerModeRef.current === '3d') {
      const currentMode = region.animationMode3D;
      newMode3D = getRandomMode3D(currentMode);
    } else {
      const currentMode = region.animationMode2D;
      newMode2D = getRandomMode2D(currentMode);
    }

    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ZOOM_DURATION, 1);
      
      // Eased progress for smoother animation
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      onUpdateRegion(regionId, { morphProgress: easedProgress });
      
      // At the midpoint, switch the mode
      if (progress >= 0.5) {
        const currentRegion = regionsRef.current.find(r => r.id === regionId);
        if (visualizerModeRef.current === '3d' && newMode3D) {
          if (currentRegion?.animationMode3D !== newMode3D) {
            onUpdateRegion(regionId, { animationMode3D: newMode3D });
          }
        } else if (newMode2D) {
          if (currentRegion?.animationMode2D !== newMode2D) {
            onUpdateRegion(regionId, { animationMode2D: newMode2D });
          }
        }
      }
      
      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        animationRefs.current.set(regionId, animId);
      } else {
        // Reset morph progress when done
        onUpdateRegion(regionId, { morphProgress: undefined });
        animationRefs.current.delete(regionId);
      }
    };
    
    const animId = requestAnimationFrame(animate);
    animationRefs.current.set(regionId, animId);
  }, [getRandomMode3D, getRandomMode2D, onUpdateRegion, clearTransitionTimeouts]);

  const triggerRandomChange = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    const transitionType = region.transitionType || 'fade';
    
    if (transitionType === 'zoom') {
      triggerZoomTransition(regionId);
    } else {
      triggerFadeTransition(regionId);
    }
  }, [triggerFadeTransition, triggerZoomTransition]);

  // Setup intervals - only re-run when specific properties change
  useEffect(() => {
    if (!isVisualizerActive) {
      // Clear all intervals and transitions when visualizer stops
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      intervalRefs.current.clear();
      transitionRefs.current.forEach((timeout) => clearTimeout(timeout));
      transitionRefs.current.clear();
      animationRefs.current.forEach((animId) => cancelAnimationFrame(animId));
      animationRefs.current.clear();
      return;
    }

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
        clearTransitionTimeouts(regionId);
      }
    });

    // Only cleanup intervals on unmount, not transitions
    return () => {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
    };
  }, [
    isVisualizerActive,
    triggerRandomChange,
    clearTransitionTimeouts,
    // Only depend on serialized randomize settings to avoid re-running on every region update
    JSON.stringify(regions.map(r => ({ 
      id: r.id, 
      randomizeEnabled: r.randomizeEnabled, 
      randomizeInterval: r.randomizeInterval,
      transitionType: r.transitionType,
      visible: r.visible 
    })))
  ]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      transitionRefs.current.forEach((timeout) => clearTimeout(timeout));
      animationRefs.current.forEach((animId) => cancelAnimationFrame(animId));
    };
  }, []);
}
