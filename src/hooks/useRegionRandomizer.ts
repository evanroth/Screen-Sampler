import { useEffect, useRef, useCallback } from 'react';
import { CaptureRegion } from './useScreenCapture';
import { AnimationMode, AnimationMode3D, ANIMATION_MODES, ANIMATION_MODES_3D, VisualizerMode } from './useVisualizerSettings';

interface UseRegionRandomizerProps {
  regions: CaptureRegion[];
  onUpdateRegion: (regionId: string, updates: Partial<CaptureRegion>) => void;
  visualizerMode: VisualizerMode;
  isVisualizerActive: boolean;
}

const FADE_DURATION = 500;
const ZOOM_DURATION = 600;

export function useRegionRandomizer({
  regions,
  onUpdateRegion,
  visualizerMode,
  isVisualizerActive,
}: UseRegionRandomizerProps) {
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
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

  const triggerRandomChange = useCallback((regionId: string) => {
    const region = regionsRef.current.find(r => r.id === regionId);
    if (!region || !region.randomizeEnabled) return;

    // Don't trigger if already in a transition
    if (region.transitionFrozen) return;

    const transitionType = region.transitionType || 'fade';
    
    if (transitionType === 'zoom') {
      triggerZoomTransition(regionId);
    } else {
      triggerFadeTransition(regionId);
    }
  }, [triggerFadeTransition, triggerZoomTransition]);

  // Setup intervals - use stable serialized key to avoid re-running on unrelated changes
  useEffect(() => {
    if (!isVisualizerActive) {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
      intervalRefs.current.clear();
      animationRefs.current.forEach((animId) => cancelAnimationFrame(animId));
      animationRefs.current.clear();
      return;
    }

    // Create stable interval settings map
    const intervalSettings = new Map<string, { enabled: boolean; interval: number; visible: boolean }>();
    regions.forEach(r => {
      intervalSettings.set(r.id, {
        enabled: r.randomizeEnabled ?? false,
        interval: r.randomizeInterval ?? 30,
        visible: r.visible !== false
      });
    });

    // Update intervals only for regions whose settings actually changed
    intervalSettings.forEach((setting, regionId) => {
      const existingInterval = intervalRefs.current.get(regionId);
      
      if (setting.enabled && setting.visible) {
        const intervalMs = setting.interval * 1000;
        
        // Only recreate if interval doesn't exist (not on every render)
        if (!existingInterval) {
          const newInterval = setInterval(() => {
            triggerRandomChange(regionId);
          }, intervalMs);
          intervalRefs.current.set(regionId, newInterval);
        }
      } else {
        if (existingInterval) {
          clearInterval(existingInterval);
          intervalRefs.current.delete(regionId);
        }
      }
    });

    // Cleanup intervals for removed regions
    intervalRefs.current.forEach((interval, regionId) => {
      if (!intervalSettings.has(regionId)) {
        clearInterval(interval);
        intervalRefs.current.delete(regionId);
        cancelAnimation(regionId);
      }
    });

    return () => {
      intervalRefs.current.forEach((interval) => clearInterval(interval));
    };
  }, [
    isVisualizerActive,
    triggerRandomChange,
    cancelAnimation,
    // Only depend on the actual interval config, not transition state
    JSON.stringify(regions.map(r => ({ 
      id: r.id, 
      randomizeEnabled: r.randomizeEnabled, 
      randomizeInterval: r.randomizeInterval,
      visible: r.visible 
    })))
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach((animId) => cancelAnimationFrame(animId));
    };
  }, []);
}
