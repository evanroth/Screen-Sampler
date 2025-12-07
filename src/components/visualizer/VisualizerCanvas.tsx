import React, { useRef, useEffect, useCallback } from 'react';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { VisualizerSettings } from '@/hooks/useVisualizerSettings';
import { TileState, createTile, updateTile } from './Tile';

interface VisualizerCanvasProps {
  videoElement: HTMLVideoElement | null;
  region: CaptureRegion;
  settings: VisualizerSettings;
  audioLevel: number;
  isActive: boolean;
}

export function VisualizerCanvas({
  videoElement,
  region,
  settings,
  audioLevel,
  isActive,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tilesRef = useRef<TileState[]>([]);
  const lastTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  // Initialize tiles when count changes
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const currentCount = tilesRef.current.length;
    
    if (currentCount < settings.tileCount) {
      // Add more tiles
      for (let i = currentCount; i < settings.tileCount; i++) {
        tilesRef.current.push(createTile(i, canvas.width, canvas.height, {
          opacityVariation: settings.opacityVariation,
          blurIntensity: settings.blurIntensity,
          enableRotation: settings.enableRotation,
        }));
      }
    } else if (currentCount > settings.tileCount) {
      // Remove tiles
      tilesRef.current = tilesRef.current.slice(0, settings.tileCount);
    }
  }, [settings.tileCount, settings.opacityVariation, settings.blurIntensity, settings.enableRotation]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
      
      // Reinitialize tiles for new dimensions
      tilesRef.current = [];
      for (let i = 0; i < settings.tileCount; i++) {
        tilesRef.current.push(createTile(i, canvasRef.current.width, canvasRef.current.height, {
          opacityVariation: settings.opacityVariation,
          blurIntensity: settings.blurIntensity,
          enableRotation: settings.enableRotation,
        }));
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.tileCount, settings.opacityVariation, settings.blurIntensity, settings.enableRotation]);

  const render = useCallback((timestamp: number) => {
    if (!canvasRef.current || !videoElement || !isActive) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    // Create offscreen canvas for region capture if needed
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }
    
    const offscreen = offscreenCanvasRef.current;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    
    if (videoWidth === 0 || videoHeight === 0) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    // Calculate region in pixels
    const regionX = region.x * videoWidth;
    const regionY = region.y * videoHeight;
    const regionW = region.width * videoWidth;
    const regionH = region.height * videoHeight;

    // Set offscreen canvas size
    offscreen.width = regionW;
    offscreen.height = regionH;
    
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) {
      animationRef.current = requestAnimationFrame(render);
      return;
    }

    // Draw the region to offscreen canvas
    offCtx.drawImage(
      videoElement,
      regionX, regionY, regionW, regionH,
      0, 0, regionW, regionH
    );

    // Clear main canvas with background
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
      ctx.filter = 'blur(30px)';
      ctx.globalAlpha = 0.3;
      ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Update and draw tiles
    tilesRef.current = tilesRef.current.map(tile => {
      const updated = updateTile(
        tile,
        canvas.width,
        canvas.height,
        settings.movementSpeed,
        deltaTime
      );

      // Calculate audio-reactive scale
      const phaseOffset = Math.sin(tile.phase + timestamp * 0.001) * 0.5 + 0.5;
      const audioScale = 1 + audioLevel * settings.bounceStrength * (0.8 + phaseOffset * 0.4);
      const finalSize = updated.baseSize * audioScale;

      ctx.save();
      
      // Position at tile center
      ctx.translate(updated.x + finalSize / 2, updated.y + finalSize / 2);
      
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

      // Draw the tile
      ctx.drawImage(
        offscreen,
        -finalSize / 2,
        -finalSize / 2,
        finalSize,
        finalSize * (regionH / regionW) // Maintain aspect ratio
      );

      ctx.restore();

      return updated;
    });

    animationRef.current = requestAnimationFrame(render);
  }, [videoElement, region, settings, audioLevel, isActive]);

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
