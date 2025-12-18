import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CaptureRegion } from '@/hooks/useScreenCapture';

interface RegionSelectorProps {
  videoElement: HTMLVideoElement | null;
  region: CaptureRegion;
  onRegionChange: (region: CaptureRegion) => void;
  isActive: boolean;
  colorClass: string;
  label: string;
  onClick: () => void;
}

type DragType = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w';

export function RegionSelector({
  videoElement,
  region,
  onRegionChange,
  isActive,
  colorClass,
  label,
  onClick,
}: RegionSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragType, setDragType] = useState<DragType | null>(null);
  const [localRegion, setLocalRegion] = useState(region);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialRegionRef = useRef(region);
  const containerRectRef = useRef<DOMRect | null>(null);
  const isDraggingRef = useRef(false);
  const localRegionRef = useRef(localRegion);
  localRegionRef.current = localRegion;

  // Sync local region with prop when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalRegion(region);
    }
  }, [region]);

  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    const rect = containerRectRef.current || containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, type: DragType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (containerRef.current) {
      containerRectRef.current = containerRef.current.getBoundingClientRect();
    }
    
    if (!isActive) {
      onClick();
    }
    
    const startPos = getRelativePosition(e.clientX, e.clientY);
    dragStartRef.current = startPos;
    initialRegionRef.current = localRegion;
    isDraggingRef.current = true;
    setDragType(type);
  }, [getRelativePosition, localRegion, onClick, isActive]);

  useEffect(() => {
    if (!dragType) return;

    const handleMouseMove = (e: MouseEvent) => {
      const current = getRelativePosition(e.clientX, e.clientY);
      const dx = current.x - dragStartRef.current.x;
      const dy = current.y - dragStartRef.current.y;
      const initial = initialRegionRef.current;

      let newRegion = { ...initial };

      if (dragType === 'move') {
        newRegion.x = Math.max(0, Math.min(1 - initial.width, initial.x + dx));
        newRegion.y = Math.max(0, Math.min(1 - initial.height, initial.y + dy));
      } else {
        if (dragType.includes('w')) {
          const newX = initial.x + dx;
          const newWidth = initial.width - dx;
          if (newX >= 0 && newWidth >= 0.05) {
            newRegion.x = newX;
            newRegion.width = newWidth;
          }
        }
        if (dragType.includes('e')) {
          const newWidth = initial.width + dx;
          if (initial.x + newWidth <= 1 && newWidth >= 0.05) {
            newRegion.width = newWidth;
          }
        }
        if (dragType.includes('n')) {
          const newY = initial.y + dy;
          const newHeight = initial.height - dy;
          if (newY >= 0 && newHeight >= 0.05) {
            newRegion.y = newY;
            newRegion.height = newHeight;
          }
        }
        if (dragType.includes('s')) {
          const newHeight = initial.height + dy;
          if (initial.y + newHeight <= 1 && newHeight >= 0.05) {
            newRegion.height = newHeight;
          }
        }
      }

      // Update local state only during drag (no parent re-render)
      setLocalRegion(newRegion);
    };

    const handleMouseUp = () => {
      // Sync to parent only on drag end - use ref to get latest value
      onRegionChange(localRegionRef.current);
      isDraggingRef.current = false;
      setDragType(null);
      containerRectRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragType, getRelativePosition, onRegionChange]);

  const handleStyle = "absolute w-5 h-5 bg-background rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform shadow-lg";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onClick={onClick}
    >
      {/* Region Box */}
      <div
        className={`absolute border-2 ${colorClass} ${isActive ? 'ring-2 ring-white/30' : 'opacity-70'} cursor-move`}
        style={{
          left: `${localRegion.x * 100}%`,
          top: `${localRegion.y * 100}%`,
          width: `${localRegion.width * 100}%`,
          height: `${localRegion.height * 100}%`,
          willChange: dragType ? 'left, top, width, height' : 'auto',
        }}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
      >
        {/* Label */}
        <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${
          colorClass.replace('border-', 'bg-')
        } text-background text-xs px-2 py-0.5 rounded whitespace-nowrap`}>
          {label}
        </div>

        {/* Resize Handles - only show when active */}
        {isActive && (
          <>
            {/* Corners */}
            <div
              className={`${handleStyle} ${colorClass} top-0 left-0 cursor-nw-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-nw')}
            />
            <div
              className={`${handleStyle} ${colorClass} top-0 left-full cursor-ne-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-ne')}
            />
            <div
              className={`${handleStyle} ${colorClass} top-full left-0 cursor-sw-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-sw')}
            />
            <div
              className={`${handleStyle} ${colorClass} top-full left-full cursor-se-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-se')}
            />
            {/* Edges */}
            <div
              className={`${handleStyle} ${colorClass} top-0 left-1/2 cursor-n-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-n')}
            />
            <div
              className={`${handleStyle} ${colorClass} top-full left-1/2 cursor-s-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-s')}
            />
            <div
              className={`${handleStyle} ${colorClass} top-1/2 left-0 cursor-w-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-w')}
            />
            <div
              className={`${handleStyle} ${colorClass} top-1/2 left-full cursor-e-resize`}
              onMouseDown={(e) => handleMouseDown(e, 'resize-e')}
            />
          </>
        )}
      </div>
    </div>
  );
}