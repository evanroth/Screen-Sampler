import React, { useRef, useEffect, useState } from 'react';
import { Check, Plus, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegionSelector } from './RegionSelector';
import { CaptureRegion } from '@/hooks/useScreenCapture';

interface ScreenPreviewProps {
  stream: MediaStream;
  regions: CaptureRegion[];
  onRegionsChange: (regions: CaptureRegion[]) => void;
  onConfirmRegions: () => void;
  onResetRegions: () => void;
  isRegionConfirmed: boolean;
}

export function ScreenPreview({
  stream,
  regions,
  onRegionsChange,
  onConfirmRegions,
  onResetRegions,
  isRegionConfirmed,
}: ScreenPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Initialize with one region if empty
  useEffect(() => {
    if (regions.length === 0) {
      const newRegion: CaptureRegion = {
        id: crypto.randomUUID(),
        x: 0.25,
        y: 0.25,
        width: 0.5,
        height: 0.5,
      };
      onRegionsChange([newRegion]);
      setActiveRegionId(newRegion.id);
    } else if (!activeRegionId && regions.length > 0) {
      setActiveRegionId(regions[0].id);
    }
  }, [regions, activeRegionId, onRegionsChange]);

  const handleRegionChange = (updatedRegion: CaptureRegion) => {
    onRegionsChange(regions.map(r => r.id === updatedRegion.id ? updatedRegion : r));
  };

  const handleAddRegion = () => {
    const newRegion: CaptureRegion = {
      id: crypto.randomUUID(),
      x: 0.1 + Math.random() * 0.3,
      y: 0.1 + Math.random() * 0.3,
      width: 0.3,
      height: 0.3,
    };
    onRegionsChange([...regions, newRegion]);
    setActiveRegionId(newRegion.id);
  };

  const handleDeleteRegion = (id: string) => {
    if (regions.length <= 1) return; // Keep at least one region
    const newRegions = regions.filter(r => r.id !== id);
    onRegionsChange(newRegions);
    if (activeRegionId === id) {
      setActiveRegionId(newRegions[0]?.id || null);
    }
  };

  const regionColors = [
    'border-purple-500',
    'border-blue-500',
    'border-green-500',
    'border-yellow-500',
    'border-pink-500',
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {isRegionConfirmed ? 'Regions Selected' : 'Select Capture Regions'}
          </h2>
          <p className="text-muted-foreground">
            {isRegionConfirmed 
              ? `${regions.length} region${regions.length > 1 ? 's' : ''} locked. You can now start the visualizer.`
              : 'Drag and resize the boxes to select regions. Each region will appear as a floating panel.'
            }
          </p>
        </div>

        {/* Region List */}
        {!isRegionConfirmed && (
          <div className="flex flex-wrap justify-center gap-2">
            {regions.map((region, index) => (
              <div
                key={region.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 cursor-pointer transition-all ${
                  regionColors[index % regionColors.length]
                } ${activeRegionId === region.id ? 'bg-secondary' : 'bg-background'}`}
                onClick={() => setActiveRegionId(region.id)}
              >
                <span className="text-sm text-foreground">Region {index + 1}</span>
                {regions.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRegion(region.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRegion}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Region
            </Button>
          </div>
        )}

        {/* Video Preview with Region Selectors */}
        <div className="relative rounded-xl overflow-hidden border border-border bg-card">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
          />
          
          {!isRegionConfirmed && regions.map((region, index) => (
            <RegionSelector
              key={region.id}
              videoElement={videoRef.current}
              region={region}
              onRegionChange={handleRegionChange}
              isActive={activeRegionId === region.id}
              colorClass={regionColors[index % regionColors.length]}
              label={`Region ${index + 1}`}
              onClick={() => setActiveRegionId(region.id)}
            />
          ))}

          {isRegionConfirmed && regions.map((region, index) => (
            <div
              key={region.id}
              className={`absolute border-2 pointer-events-none ${regionColors[index % regionColors.length].replace('border-', 'border-')}`}
              style={{
                left: `${region.x * 100}%`,
                top: `${region.y * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            >
              <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${
                regionColors[index % regionColors.length].replace('border-', 'bg-')
              } text-background text-xs px-2 py-0.5 rounded`}>
                Region {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {!isRegionConfirmed ? (
            <Button onClick={onConfirmRegions} size="lg" className="glow-primary">
              <Check className="w-4 h-4 mr-2" />
              Confirm {regions.length} Region{regions.length > 1 ? 's' : ''}
            </Button>
          ) : (
            <Button onClick={onResetRegions} variant="secondary" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Adjust Regions
            </Button>
          )}
        </div>

        {isRegionConfirmed && (
          <p className="text-center text-sm text-muted-foreground">
            Open the settings panel (gear icon) to start the visualizer and configure effects
          </p>
        )}
      </div>
    </div>
  );
}
