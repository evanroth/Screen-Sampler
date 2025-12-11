import React, { useRef, useEffect, useCallback } from 'react';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { VisualizerSettings, AnimationMode, ANIMATION_MODES } from '@/hooks/useVisualizerSettings';
import { PanelState, createPanel, updatePanel } from './Panel';

interface VisualizerCanvasProps {
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  isActive: boolean;
  getVideoElement: (sourceId: string) => HTMLVideoElement | null;
}

// Store frozen panel state during transitions
interface FrozenState {
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

export function VisualizerCanvas({
  regions,
  settings,
  audioLevel,
  isActive,
  getVideoElement,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const panelsRef = useRef<PanelState[]>([]);
  const frozenStatesRef = useRef<Map<string, FrozenState>>(new Map());
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const currentRandomModeRef = useRef<AnimationMode>(ANIMATION_MODES[0]);
  const lastModeChangeRef = useRef<number>(0);

  // Initialize panels when regions change
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const existingIds = new Set(panelsRef.current.map(p => p.regionId));
    const newRegionIds = new Set(regions.map(r => r.id));
    
    // Remove panels for deleted regions
    panelsRef.current = panelsRef.current.filter(p => newRegionIds.has(p.regionId));
    
    // Add panels for new regions
    for (const region of regions) {
      if (!existingIds.has(region.id)) {
        const idx = panelsRef.current.length;
        panelsRef.current.push(createPanel(region, canvas.width, canvas.height, {
          opacityVariation: settings.opacityVariation,
          blurIntensity: settings.blurIntensity,
          enableRotation: settings.enableRotation,
        }, idx));
      }
    }
    
    // Clean up offscreen canvases and frozen states for removed regions
    offscreenCanvasesRef.current.forEach((_, id) => {
      if (!newRegionIds.has(id)) {
        offscreenCanvasesRef.current.delete(id);
        frozenStatesRef.current.delete(id);
      }
    });
  }, [regions, settings.opacityVariation, settings.blurIntensity, settings.enableRotation]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      
      // Reinitialize panels for new dimensions
      panelsRef.current = regions.map((region, idx) => 
        createPanel(region, canvasRef.current!.width, canvasRef.current!.height, {
          opacityVariation: settings.opacityVariation,
          blurIntensity: settings.blurIntensity,
          enableRotation: settings.enableRotation,
        }, idx)
      );
      initializedRef.current = true;
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [regions, settings.opacityVariation, settings.blurIntensity, settings.enableRotation]);

  const render = useCallback((timestamp: number) => {
    if (!canvasRef.current || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Determine if we should use trails
    const useTrails = settings.enableTrails && settings.trailAmount > 0;
    
    if (!useTrails) {
      // No trail - clear fully
      if (settings.backgroundStyle === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'white') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'solid') {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'linearGradient') {
        const gradient = ctx.createLinearGradient(
          canvas.width / 2, 0,
          canvas.width / 2, canvas.height
        );
        gradient.addColorStop(0, settings.gradientSettings.color1);
        gradient.addColorStop(1, settings.gradientSettings.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'radialGradient') {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
        );
        gradient.addColorStop(0, settings.gradientSettings.color1);
        gradient.addColorStop(1, settings.gradientSettings.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'blurred') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (regions.length > 0) {
          const region = regions[0];
          const videoElement = getVideoElement(region.sourceId);
          if (videoElement && videoElement.videoWidth > 0) {
            const regionX = region.x * videoElement.videoWidth;
            const regionY = region.y * videoElement.videoHeight;
            const regionW = region.width * videoElement.videoWidth;
            const regionH = region.height * videoElement.videoHeight;
            
            ctx.filter = 'blur(50px)';
            ctx.globalAlpha = 0.6;
            ctx.drawImage(videoElement, regionX, regionY, regionW, regionH, 0, 0, canvas.width, canvas.height);
            ctx.filter = 'none';
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
    } else {
      const trailAlpha = 1 - settings.trailAmount;
      ctx.fillStyle = `rgba(0, 0, 0, ${trailAlpha * 0.15})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Filter out invisible regions, create lookup and sort by z-index
    const visibleRegions = regions.filter(r => r.visible !== false);
    const regionMap = new Map(visibleRegions.map(r => [r.id, r]));
    const sortedPanels = [...panelsRef.current].filter(p => regionMap.has(p.regionId)).sort((a, b) => {
      const regionA = regionMap.get(a.regionId);
      const regionB = regionMap.get(b.regionId);
      const bgA = regionA?.fullscreenBackground ? -1000 : 0;
      const bgB = regionB?.fullscreenBackground ? -1000 : 0;
      const zA = (regionA?.position2D?.z ?? 0) + bgA;
      const zB = (regionB?.position2D?.z ?? 0) + bgB;
      return zA - zB;
    });

    // Update and draw panels
    panelsRef.current = sortedPanels.map(panel => {
      const region = regionMap.get(panel.regionId);
      if (!region) return panel;

      const videoElement = getVideoElement(region.sourceId);
      if (!videoElement) return panel;

      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) return panel;

      const regionX = region.x * videoWidth;
      const regionY = region.y * videoHeight;
      const regionW = region.width * videoWidth;
      const regionH = region.height * videoHeight;

      let offscreen = offscreenCanvasesRef.current.get(region.id);
      if (!offscreen) {
        offscreen = document.createElement('canvas');
        offscreenCanvasesRef.current.set(region.id, offscreen);
      }
      
      offscreen.width = regionW;
      offscreen.height = regionH;
      
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return panel;

      offCtx.drawImage(
        videoElement,
        regionX, regionY, regionW, regionH,
        0, 0, regionW, regionH
      );

      // Per-region transparent color
      if (region.transparentColor) {
        const imageData = offCtx.getImageData(0, 0, regionW, regionH);
        const data = imageData.data;
        const threshold = region.transparentThreshold ?? 30;
        
        const hex = region.transparentColor.replace('#', '');
        const targetR = parseInt(hex.substring(0, 2), 16);
        const targetG = parseInt(hex.substring(2, 4), 16);
        const targetB = parseInt(hex.substring(4, 6), 16);
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const distance = Math.sqrt(
            Math.pow(r - targetR, 2) + 
            Math.pow(g - targetG, 2) + 
            Math.pow(b - targetB, 2)
          );
          
          if (distance < threshold) {
            const closeness = 1 - distance / threshold;
            data[i + 3] = Math.round(data[i + 3] * (1 - closeness));
          }
        }
        
        offCtx.putImageData(imageData, 0, 0);
      }

      // Handle fullscreen background mode
      if (region.fullscreenBackground) {
        ctx.save();
        
        if (region.glowEnabled && region.glowColor) {
          ctx.shadowColor = region.glowColor;
          ctx.shadowBlur = (region.glowAmount ?? 20) + audioLevel * 30;
        }
        
        ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        return panel;
      }

      // Calculate scaled size
      const regionScale = region.scale2D ?? 1;
      const baseWidth = canvas.width * settings.panelScaleX * regionScale;
      const aspectRatio = regionH / regionW;
      const baseHeight = canvas.width * settings.panelScaleY * aspectRatio * regionScale;

      const phaseOffset = Math.sin(panel.phase + timestamp * 0.001) * 0.5 + 0.5;
      const audioScale = 1 + audioLevel * settings.bounceStrength * (0.8 + phaseOffset * 0.4);
      const finalWidth = baseWidth * audioScale;
      const finalHeight = baseHeight * audioScale;

      // Determine actual animation mode
      let activeMode: AnimationMode = region.animationMode2D || settings.animationMode;
      if (activeMode === 'random' || (!region.animationMode2D && settings.animationMode === 'random')) {
        const intervalMs = settings.randomModeInterval * 1000;
        if (timestamp - lastModeChangeRef.current >= intervalMs) {
          const randomIndex = Math.floor(Math.random() * ANIMATION_MODES.length);
          currentRandomModeRef.current = ANIMATION_MODES[randomIndex];
          lastModeChangeRef.current = timestamp;
        }
        activeMode = currentRandomModeRef.current;
      }

      // Check if region is in a transition
      const isInTransition = region.transitionFrozen === true;

      let drawX: number;
      let drawY: number;
      let drawRotation: number;
      let updated: PanelState;

      if (isInTransition) {
        // Get or create frozen state
        let frozen = frozenStatesRef.current.get(region.id);
        if (!frozen) {
          // Freeze the current position
          frozen = {
            x: panel.x,
            y: panel.y,
            rotation: panel.rotation,
            width: finalWidth,
            height: finalHeight
          };
          frozenStatesRef.current.set(region.id, frozen);
        }
        
        drawX = frozen.x;
        drawY = frozen.y;
        drawRotation = frozen.rotation;
        updated = panel; // Don't update the panel during transition
      } else {
        // Clear frozen state when transition ends
        frozenStatesRef.current.delete(region.id);
        
        // Update panel normally
        updated = updatePanel(
          panel,
          finalWidth,
          finalHeight,
          canvas.width,
          canvas.height,
          settings.movementSpeed,
          deltaTime,
          activeMode,
          timestamp
        );
        
        drawX = updated.x;
        drawY = updated.y;
        drawRotation = updated.rotation;
      }

      ctx.save();
      
      // Calculate transition effects
      let transitionOpacity = 1;
      let transitionScale = 1;
      
      if (region.fadeOpacity !== undefined) {
        transitionOpacity = region.fadeOpacity;
      }
      
      if (region.morphProgress !== undefined && region.transitionType === 'zoom') {
        // Scale goes from 1 -> 0.1 -> 1
        const distFromMid = Math.abs(region.morphProgress - 0.5) * 2;
        transitionScale = 0.1 + distFromMid * 0.9;
      }
      
      // Position at panel center with per-region offset
      const offsetX = region.position2D?.x ?? 0;
      const offsetY = region.position2D?.y ?? 0;
      ctx.translate(drawX + finalWidth / 2 + offsetX, drawY + finalHeight / 2 + offsetY);
      
      // Apply transition scale
      if (transitionScale !== 1) {
        ctx.scale(transitionScale, transitionScale);
      }
      
      // Apply rotation only when NOT in transition
      if (settings.enableRotation && !isInTransition) {
        ctx.rotate((drawRotation * Math.PI) / 180);
      }
      
      // Apply effects
      const baseOpacity = (settings.tileEffect === 'all' || settings.tileEffect === 'opacity') 
        ? updated.opacity 
        : 1;
      ctx.globalAlpha = baseOpacity * transitionOpacity;
      
      if ((settings.tileEffect === 'all' || settings.tileEffect === 'blur') && updated.blurAmount > 0) {
        ctx.filter = `blur(${updated.blurAmount}px)`;
      }
      
      if (region.glowEnabled && region.glowColor) {
        ctx.shadowColor = region.glowColor;
        ctx.shadowBlur = (region.glowAmount ?? 20) + audioLevel * 30;
      }

      ctx.drawImage(
        offscreen,
        -finalWidth / 2,
        -finalHeight / 2,
        finalWidth,
        finalHeight
      );

      ctx.restore();

      return updated;
    });

    animationRef.current = requestAnimationFrame(render);
  }, [regions, settings, audioLevel, isActive, getVideoElement]);

  useEffect(() => {
    if (isActive) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(render);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, render]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
