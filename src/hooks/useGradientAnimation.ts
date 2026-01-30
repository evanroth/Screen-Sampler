import { useCallback, useRef, useEffect } from 'react';
import { GradientSettings } from './useVisualizerSettings';

// Generate a random hex color
function randomHexColor(): string {
  const hue = Math.random() * 360;
  const saturation = 60 + Math.random() * 40; // 60-100%
  const lightness = 40 + Math.random() * 30; // 40-70%
  
  // Convert HSL to hex
  const h = hue / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const g = Math.round(hue2rgb(p, q, h) * 255);
  const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Parse hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

// Lerp between two values
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Ease in-out cubic
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface UseGradientAnimationOptions {
  currentSettings: GradientSettings;
  onUpdate: (settings: GradientSettings) => void;
  duration?: number; // Animation duration in ms
}

export function useGradientAnimation({
  currentSettings,
  onUpdate,
  duration = 1500,
}: UseGradientAnimationOptions) {
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startColorsRef = useRef<GradientSettings>(currentSettings);
  const targetColorsRef = useRef<GradientSettings>(currentSettings);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const animate = useCallback((currentTime: number) => {
    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    
    const startColor1 = hexToRgb(startColorsRef.current.color1);
    const startColor2 = hexToRgb(startColorsRef.current.color2);
    const targetColor1 = hexToRgb(targetColorsRef.current.color1);
    const targetColor2 = hexToRgb(targetColorsRef.current.color2);
    
    const currentColor1 = rgbToHex(
      lerp(startColor1.r, targetColor1.r, easedProgress),
      lerp(startColor1.g, targetColor1.g, easedProgress),
      lerp(startColor1.b, targetColor1.b, easedProgress)
    );
    
    const currentColor2 = rgbToHex(
      lerp(startColor2.r, targetColor2.r, easedProgress),
      lerp(startColor2.g, targetColor2.g, easedProgress),
      lerp(startColor2.b, targetColor2.b, easedProgress)
    );
    
    onUpdate({ color1: currentColor1, color2: currentColor2 });
    
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      animationRef.current = null;
    }
  }, [duration, onUpdate]);

  const randomize = useCallback(() => {
    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Store current colors as start
    startColorsRef.current = { ...currentSettings };
    
    // Generate new random target colors
    targetColorsRef.current = {
      color1: randomHexColor(),
      color2: randomHexColor(),
    };
    
    // Start animation
    startTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);
  }, [currentSettings, animate]);

  return {
    randomize,
  };
}
