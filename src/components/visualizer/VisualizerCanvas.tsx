import React, { useRef, useEffect, useCallback } from 'react';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { VisualizerSettings } from '@/hooks/useVisualizerSettings';
import { PanelState, createPanel, updatePanel } from './Panel';

interface VisualizerCanvasProps {
  videoElement: HTMLVideoElement | null;
  regions: CaptureRegion[];
  settings: VisualizerSettings;
  audioLevel: number;
  isActive: boolean;
}

export function VisualizerCanvas({
  videoElement,
  regions,
  settings,
  audioLevel,
  isActive,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const panelsRef = useRef<PanelState[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

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
    
    // Clean up offscreen canvases for removed regions
    offscreenCanvasesRef.current.forEach((_, id) => {
      if (!newRegionIds.has(id)) {
        offscreenCanvasesRef.current.delete(id);
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
    if (!canvasRef.current || !videoElement || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    // Trail effect: instead of clearing, draw semi-transparent background
    const trailAlpha = 1 - settings.trailAmount;
    
    if (trailAlpha >= 1) {
      // No trail - clear fully
      if (settings.backgroundStyle === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'gradient') {
        const gradient = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, 0,
          canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, 'hsl(265, 80%, 10%)');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (settings.backgroundStyle === 'blurred') {
        // For blurred, use first region if available
        if (regions.length > 0) {
          const region = regions[0];
          const regionX = region.x * videoWidth;
          const regionY = region.y * videoHeight;
          const regionW = region.width * videoWidth;
          const regionH = region.height * videoHeight;
          
          ctx.filter = 'blur(30px)';
          ctx.globalAlpha = 0.3;
          ctx.drawImage(videoElement, regionX, regionY, regionW, regionH, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      // Trail effect - fade instead of clear
      ctx.fillStyle = `rgba(0, 0, 0, ${trailAlpha * 0.15})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Create region lookup
    const regionMap = new Map(regions.map(r => [r.id, r]));

    // Update and draw panels
    panelsRef.current = panelsRef.current.map(panel => {
      const region = regionMap.get(panel.regionId);
      if (!region) return panel;

      // Calculate region in pixels
      const regionX = region.x * videoWidth;
      const regionY = region.y * videoHeight;
      const regionW = region.width * videoWidth;
      const regionH = region.height * videoHeight;

      // Get or create offscreen canvas for this region
      let offscreen = offscreenCanvasesRef.current.get(region.id);
      if (!offscreen) {
        offscreen = document.createElement('canvas');
        offscreenCanvasesRef.current.set(region.id, offscreen);
      }
      
      offscreen.width = regionW;
      offscreen.height = regionH;
      
      const offCtx = offscreen.getContext('2d');
      if (!offCtx) return panel;

      // Draw the region to offscreen canvas
      offCtx.drawImage(
        videoElement,
        regionX, regionY, regionW, regionH,
        0, 0, regionW, regionH
      );

      // Calculate scaled size
      const baseWidth = canvas.width * settings.panelScale;
      const aspectRatio = regionH / regionW;
      const baseHeight = baseWidth * aspectRatio;

      // Calculate audio-reactive scale
      const phaseOffset = Math.sin(panel.phase + timestamp * 0.001) * 0.5 + 0.5;
      const audioScale = 1 + audioLevel * settings.bounceStrength * (0.8 + phaseOffset * 0.4);
      const finalWidth = baseWidth * audioScale;
      const finalHeight = baseHeight * audioScale;

      // Update panel position
      const updated = updatePanel(
        panel,
        finalWidth,
        finalHeight,
        canvas.width,
        canvas.height,
        settings.movementSpeed,
        deltaTime,
        settings.animationMode,
        timestamp
      );

      ctx.save();
      
      // Position at panel center
      ctx.translate(updated.x + finalWidth / 2, updated.y + finalHeight / 2);
      
      // Apply rotation
      if (settings.enableRotation) {
        ctx.rotate((updated.rotation * Math.PI) / 180);
      }
      
      // Apply effects based on settings
      if (settings.tileEffect === 'all' || settings.tileEffect === 'opacity') {
        ctx.globalAlpha = updated.opacity;
      }
      
      if ((settings.tileEffect === 'all' || settings.tileEffect === 'blur') && updated.blurAmount > 0) {
        ctx.filter = `blur(${updated.blurAmount}px)`;
      }
      
      if (settings.tileEffect === 'all' || settings.tileEffect === 'glow') {
        ctx.shadowColor = 'hsl(265, 80%, 60%)';
        ctx.shadowBlur = 20 + audioLevel * 30;
      }

      // Draw the panel
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
  }, [videoElement, regions, settings, audioLevel, isActive]);

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
