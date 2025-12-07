import React, { useRef, useEffect } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegionSelector } from './RegionSelector';
import { CaptureRegion } from '@/hooks/useScreenCapture';

interface ScreenPreviewProps {
  stream: MediaStream;
  region: CaptureRegion | null;
  onRegionChange: (region: CaptureRegion) => void;
  onConfirmRegion: () => void;
  onResetRegion: () => void;
  isRegionConfirmed: boolean;
}

export function ScreenPreview({
  stream,
  region,
  onRegionChange,
  onConfirmRegion,
  onResetRegion,
  isRegionConfirmed,
}: ScreenPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-5xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {isRegionConfirmed ? 'Region Selected' : 'Select Capture Region'}
          </h2>
          <p className="text-muted-foreground">
            {isRegionConfirmed 
              ? 'Your region is locked. You can now start the visualizer or adjust settings.'
              : 'Drag and resize the purple box to frame the part of your screen you want to visualize.'
            }
          </p>
        </div>

        {/* Video Preview with Region Selector */}
        <div className="relative rounded-xl overflow-hidden border border-border bg-card">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
          />
          
          {!isRegionConfirmed && (
            <RegionSelector
              videoElement={videoRef.current}
              onRegionChange={onRegionChange}
              initialRegion={region || undefined}
            />
          )}

          {isRegionConfirmed && region && (
            <div
              className="absolute border-2 border-green-500 pointer-events-none"
              style={{
                left: `${region.x * 100}%`,
                top: `${region.y * 100}%`,
                width: `${region.width * 100}%`,
                height: `${region.height * 100}%`,
              }}
            >
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-background text-xs px-2 py-1 rounded">
                Locked
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {!isRegionConfirmed ? (
            <Button onClick={onConfirmRegion} size="lg" className="glow-primary">
              <Check className="w-4 h-4 mr-2" />
              Confirm Selection
            </Button>
          ) : (
            <Button onClick={onResetRegion} variant="secondary" size="lg">
              <RotateCcw className="w-4 h-4 mr-2" />
              Adjust Region
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
