import { useEffect, useRef, useCallback } from 'react';
import { CaptureRegion } from './useScreenCapture';
import { AnimationMode, AnimationMode3D, ANIMATION_MODES, ANIMATION_MODES_3D, VisualizerMode } from './useVisualizerSettings';

interface UseRegionRandomizerProps {
  regions: CaptureRegion[];
  onUpdateRegion: (regionId: string, updates: Partial<CaptureRegion>) => void;
  visualizerMode: VisualizerMode;
  isVisualizerActive: boolean;
}

const FADE_DURATION = 2000;
const ZOOM_DURATION = 2000;

export function useRegionRandomizer({
  regions,
  onUpdateRegion,
  visualizerMode,
  isVisualizerActive,
}: UseRegionRandomizerProps) {
  const intervalRefs = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
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

  const cancelAnimation = useCallback((regionId: string) => {
    const existingAnimation = animationRefs.current.get(regionId);
    if (existingAnimation) {
      cancelAnimationFrame(existingAnimation);
      animationRefs.current.delete(regionId);
    }
  }, []);

  const triggerFadeTransition = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    cancelAnimation(regionId);

    // Get the new mode upfront
    let newMode3D: AnimationMode3D | undefined;
    let newMode2D: AnimationMode | undefined;
    
    if (visualizerModeRef.current === '3d') {
      newMode3D = getRandomMode3D(region.animationMode3D);
    } else {
      newMode2D = getRandomMode2D(region.animationMode2D);
    }

    // Mark transition start - this tells the canvas to freeze position
    onUpdateRegion(regionId, { 
      fadeOpacity: 1, 
      transitionType: 'fade',
      transitionFrozen: true 
    });

    const startTime = performance.now();
    let modeChanged = false;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      
      // Smooth easing for fade
      const eased = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Fade out from 0-0.5, fade in from 0.5-1
      let opacity: number;
      if (eased < 0.5) {
        opacity = 1 - (eased * 2);
      } else {
        opacity = (eased - 0.5) * 2;
      }
      
      // At the midpoint, switch the mode (only once)
      if (progress >= 0.5 && !modeChanged) {
        modeChanged = true;
        if (visualizerModeRef.current === '3d' && newMode3D) {
          onUpdateRegion(regionId, { animationMode3D: newMode3D, fadeOpacity: opacity });
        } else if (newMode2D) {
          onUpdateRegion(regionId, { animationMode2D: newMode2D, fadeOpacity: opacity });
        }
      } else {
        onUpdateRegion(regionId, { fadeOpacity: opacity });
      }
      
      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        animationRefs.current.set(regionId, animId);
      } else {
        // Reset when done
        onUpdateRegion(regionId, { 
          fadeOpacity: undefined, 
          transitionType: undefined,
          transitionFrozen: false 
        });
        animationRefs.current.delete(regionId);
      }
    };
    
    const animId = requestAnimationFrame(animate);
    animationRefs.current.set(regionId, animId);
  }, [getRandomMode3D, getRandomMode2D, onUpdateRegion, cancelAnimation]);

  const triggerZoomTransition = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    cancelAnimation(regionId);

    // Get the new mode upfront
    let newMode3D: AnimationMode3D | undefined;
    let newMode2D: AnimationMode | undefined;
    
    if (visualizerModeRef.current === '3d') {
      newMode3D = getRandomMode3D(region.animationMode3D);
    } else {
      newMode2D = getRandomMode2D(region.animationMode2D);
    }

    // Mark transition start
    onUpdateRegion(regionId, { 
      morphProgress: 0, 
      transitionType: 'zoom',
      transitionFrozen: true 
    });

    const startTime = performance.now();
    let modeChanged = false;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ZOOM_DURATION, 1);
      
      // Smooth easing
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // At the midpoint, switch the mode (only once)
      if (progress >= 0.5 && !modeChanged) {
        modeChanged = true;
        if (visualizerModeRef.current === '3d' && newMode3D) {
          onUpdateRegion(regionId, { animationMode3D: newMode3D, morphProgress: easedProgress });
        } else if (newMode2D) {
          onUpdateRegion(regionId, { animationMode2D: newMode2D, morphProgress: easedProgress });
        }
      } else {
        onUpdateRegion(regionId, { morphProgress: easedProgress });
      }
      
      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        animationRefs.current.set(regionId, animId);
      } else {
        // Reset when done
        onUpdateRegion(regionId, { 
          morphProgress: undefined, 
          transitionType: undefined,
          transitionFrozen: false 
        });
        animationRefs.current.delete(regionId);
      }
    };
    
    const animId = requestAnimationFrame(animate);
    animationRefs.current.set(regionId, animId);
  }, [getRandomMode3D, getRandomMode2D, onUpdateRegion, cancelAnimation]);

  // Simple 2D fade transition - just animates fadeOpacity
  const trigger2DFadeTransition = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    cancelAnimation(regionId);

    // Get the new mode upfront
    const newMode2D = getRandomMode2D(region.animationMode2D);

    // Start with full opacity
    onUpdateRegion(regionId, { fadeOpacity: 1 });

    const startTime = performance.now();
    let modeChanged = false;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      
      // Simple linear fade: 0->0.5 = fade out, 0.5->1 = fade in
      let opacity: number;
      if (progress < 0.5) {
        // Fade out: 1 -> 0
        opacity = 1 - (progress * 2);
      } else {
        // Fade in: 0 -> 1
        opacity = (progress - 0.5) * 2;
      }
      
      // At the midpoint (opacity = 0), switch the mode
      if (progress >= 0.5 && !modeChanged) {
        modeChanged = true;
        onUpdateRegion(regionId, { animationMode2D: newMode2D, fadeOpacity: opacity });
      } else {
        onUpdateRegion(regionId, { fadeOpacity: opacity });
      }
      
      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        animationRefs.current.set(regionId, animId);
      } else {
        // Reset when done
        onUpdateRegion(regionId, { fadeOpacity: undefined });
        animationRefs.current.delete(regionId);
      }
    };
    
    const animId = requestAnimationFrame(animate);
    animationRefs.current.set(regionId, animId);
  }, [getRandomMode2D, onUpdateRegion, cancelAnimation]);

  // Simple 2D zoom transition - just animates scale via morphProgress
  const trigger2DZoomTransition = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    cancelAnimation(regionId);

    // Get the new mode upfront
    const newMode2D = getRandomMode2D(region.animationMode2D);

    // Start zoom transition
    onUpdateRegion(regionId, { morphProgress: 0, transitionType: 'zoom' });

    const startTime = performance.now();
    let modeChanged = false;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / ZOOM_DURATION, 1);
      
      // At the midpoint (scale = 0), switch the mode
      if (progress >= 0.5 && !modeChanged) {
        modeChanged = true;
        onUpdateRegion(regionId, { animationMode2D: newMode2D, morphProgress: progress });
      } else {
        onUpdateRegion(regionId, { morphProgress: progress });
      }
      
      if (progress < 1) {
        const animId = requestAnimationFrame(animate);
        animationRefs.current.set(regionId, animId);
      } else {
        // Reset when done
        onUpdateRegion(regionId, { morphProgress: undefined, transitionType: undefined });
        animationRefs.current.delete(regionId);
      }
    };
    
    const animId = requestAnimationFrame(animate);
    animationRefs.current.set(regionId, animId);
  }, [getRandomMode2D, onUpdateRegion, cancelAnimation]);

  const triggerRandomChange = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    // Don't trigger if already in a transition
    if (region.transitionFrozen) return;

    // In 2D mode
    if (visualizerModeRef.current === '2d') {
      const transitionType = region.transitionType || 'none';
      if (transitionType === 'fade') {
        trigger2DFadeTransition(regionId);
      } else if (transitionType === 'zoom') {
        trigger2DZoomTransition(regionId);
      } else {
        // No transition - instant change
        const newMode2D = getRandomMode2D(region.animationMode2D);
        onUpdateRegion(regionId, { animationMode2D: newMode2D });
      }
      return;
    }

    // In 3D mode, use transitions
    const transitionType = region.transitionType || 'fade';
    
    if (transitionType === 'zoom') {
      triggerZoomTransition(regionId);
    } else {
      triggerFadeTransition(regionId);
    }
  }, [triggerFadeTransition, triggerZoomTransition, trigger2DFadeTransition, trigger2DZoomTransition, getRandomMode2D, onUpdateRegion]);

  // Track current interval settings to detect changes
  const intervalSettingsRef = useRef<Map<string, { interval: number; enabled: boolean }>>(new Map());

  // Setup intervals - recreate when interval value changes
  useEffect(() => {
    if (!isVisualizerActive) {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      intervalRefs.current.clear();
      animationRefs.current.forEach((animId) => cancelAnimationFrame(animId));
      animationRefs.current.clear();
      intervalSettingsRef.current.clear();
      return;
    }

    regions.forEach(region => {
      const { id: regionId, randomizeEnabled = false, randomizeInterval = 30, visible } = region;
      const storedSettings = intervalSettingsRef.current.get(regionId);
      
      const shouldBeActive = randomizeEnabled && visible !== false;
      const intervalMs = randomizeInterval * 1000;
      
      // Check if settings actually changed
      const settingsChanged = storedSettings?.interval !== randomizeInterval || 
                              storedSettings?.enabled !== shouldBeActive;
      
      if (!settingsChanged) {
        // No changes, keep existing interval
        return;
      }
      
      // Clear existing interval if present
      const existingInterval = intervalRefs.current.get(regionId);
      if (existingInterval) {
        clearInterval(existingInterval);
        intervalRefs.current.delete(regionId);
      }
      
      if (shouldBeActive) {
        // Create new interval
        const newInterval = setInterval(() => {
          triggerRandomChange(regionId);
        }, intervalMs);
        
        intervalRefs.current.set(regionId, newInterval);
      }
      
      // Store current settings
      intervalSettingsRef.current.set(regionId, { interval: randomizeInterval, enabled: shouldBeActive });
    });

    // Cleanup intervals for removed regions
    const currentRegionIds = new Set(regions.map(r => r.id));
    intervalRefs.current.forEach((interval, regionId) => {
      if (!currentRegionIds.has(regionId)) {
        clearInterval(interval);
        intervalRefs.current.delete(regionId);
        intervalSettingsRef.current.delete(regionId);
        cancelAnimation(regionId);
      }
    });

    // No cleanup on re-render - we manage intervals manually above
  }, [
    isVisualizerActive,
    triggerRandomChange,
    cancelAnimation,
    regions
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach((animId) => cancelAnimationFrame(animId));
    };
  }, []);
}
