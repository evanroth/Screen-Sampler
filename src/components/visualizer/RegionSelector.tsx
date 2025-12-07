import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CaptureRegion } from '@/hooks/useScreenCapture';

interface RegionSelectorProps {
  videoElement: HTMLVideoElement | null;
  onRegionChange: (region: CaptureRegion) => void;
  initialRegion?: CaptureRegion;
}

export function RegionSelector({ videoElement, onRegionChange, initialRegion }: RegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<CaptureRegion>(
    initialRegion || { x: 0.25, y: 0.25, width: 0.5, height: 0.5 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [regionStart, setRegionStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const getRelativePosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, action: 'drag' | string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getRelativePosition(e);
    setDragStart(pos);
    setRegionStart({ ...region });
    
    if (action === 'drag') {
      setIsDragging(true);
    } else {
      setIsResizing(action);
    }
  }, [getRelativePosition, region]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    const pos = getRelativePosition(e);
    const deltaX = pos.x - dragStart.x;
    const deltaY = pos.y - dragStart.y;

    let newRegion = { ...region };

    if (isDragging) {
      newRegion.x = Math.max(0, Math.min(1 - regionStart.width, regionStart.x + deltaX));
      newRegion.y = Math.max(0, Math.min(1 - regionStart.height, regionStart.y + deltaY));
    } else if (isResizing) {
      const minSize = 0.1;
      
      if (isResizing.includes('w')) {
        const newX = Math.max(0, regionStart.x + deltaX);
        const newWidth = regionStart.width - (newX - regionStart.x);
        if (newWidth >= minSize) {
          newRegion.x = newX;
          newRegion.width = newWidth;
        }
      }
      if (isResizing.includes('e')) {
        newRegion.width = Math.max(minSize, Math.min(1 - regionStart.x, regionStart.width + deltaX));
      }
      if (isResizing.includes('n')) {
        const newY = Math.max(0, regionStart.y + deltaY);
        const newHeight = regionStart.height - (newY - regionStart.y);
        if (newHeight >= minSize) {
          newRegion.y = newY;
          newRegion.height = newHeight;
        }
      }
      if (isResizing.includes('s')) {
        newRegion.height = Math.max(minSize, Math.min(1 - regionStart.y, regionStart.height + deltaY));
      }
    }

    setRegion(newRegion);
  }, [isDragging, isResizing, dragStart, regionStart, getRelativePosition, region]);

  const handleMouseUp = useCallback(() => {
    if (isDragging || isResizing) {
      onRegionChange(region);
    }
    setIsDragging(false);
    setIsResizing(null);
  }, [isDragging, isResizing, region, onRegionChange]);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const handleStyle = "absolute w-3 h-3 bg-primary rounded-full border-2 border-primary-foreground cursor-pointer hover:scale-125 transition-transform";

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 cursor-crosshair"
    >
      {/* Darkened overlay outside selection */}
      <div className="absolute inset-0 bg-background/60 pointer-events-none" />
      
      {/* Selected region */}
      <div
        className="absolute border-2 border-primary bg-transparent cursor-move glow-primary"
        style={{
          left: `${region.x * 100}%`,
          top: `${region.y * 100}%`,
          width: `${region.width * 100}%`,
          height: `${region.height * 100}%`,
        }}
        onMouseDown={(e) => handleMouseDown(e, 'drag')}
      >
        {/* Clear the overlay inside selection */}
        <div 
          className="absolute inset-0"
          style={{
            boxShadow: `0 0 0 9999px hsl(var(--background) / 0.6)`,
          }}
        />
        
        {/* Resize handles */}
        <div className={`${handleStyle} -top-1.5 -left-1.5`} onMouseDown={(e) => handleMouseDown(e, 'nw')} />
        <div className={`${handleStyle} -top-1.5 -right-1.5`} onMouseDown={(e) => handleMouseDown(e, 'ne')} />
        <div className={`${handleStyle} -bottom-1.5 -left-1.5`} onMouseDown={(e) => handleMouseDown(e, 'sw')} />
        <div className={`${handleStyle} -bottom-1.5 -right-1.5`} onMouseDown={(e) => handleMouseDown(e, 'se')} />
        <div className={`${handleStyle} -top-1.5 left-1/2 -translate-x-1/2`} onMouseDown={(e) => handleMouseDown(e, 'n')} />
        <div className={`${handleStyle} -bottom-1.5 left-1/2 -translate-x-1/2`} onMouseDown={(e) => handleMouseDown(e, 's')} />
        <div className={`${handleStyle} top-1/2 -left-1.5 -translate-y-1/2`} onMouseDown={(e) => handleMouseDown(e, 'w')} />
        <div className={`${handleStyle} top-1/2 -right-1.5 -translate-y-1/2`} onMouseDown={(e) => handleMouseDown(e, 'e')} />
      </div>
    </div>
  );
}
