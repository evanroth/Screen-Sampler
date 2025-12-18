import { useRef, useEffect, useState } from 'react';
import { Check, Plus, Trash2, RotateCcw, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RegionSelector } from './RegionSelector';
import { CaptureRegion, CaptureSource } from '@/hooks/useScreenCapture';

interface ScreenPreviewProps {
  sources: CaptureSource[];
  regions: CaptureRegion[];
  onRegionsChange: (regions: CaptureRegion[]) => void;
  onConfirmRegions: () => void;
  onResetRegions: () => void;
  onAddSource: () => void;
  onRemoveSource: (sourceId: string) => void;
  isRegionConfirmed: boolean;
}

export function ScreenPreview({
  sources,
  regions,
  onRegionsChange,
  onConfirmRegions,
  onResetRegions,
  onAddSource,
  onRemoveSource,
  isRegionConfirmed,
}: ScreenPreviewProps) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);

  // Set active source when sources change
  useEffect(() => {
    if (sources.length > 0 && !activeSourceId) {
      setActiveSourceId(sources[0].id);
    } else if (sources.length > 0 && !sources.find(s => s.id === activeSourceId)) {
      setActiveSourceId(sources[0].id);
    }
  }, [sources, activeSourceId]);

  // Initialize with one region per source if empty
  useEffect(() => {
    if (sources.length > 0 && regions.length === 0) {
      const newRegion: CaptureRegion = {
        id: crypto.randomUUID(),
        sourceId: sources[0].id,
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
  }, [sources, regions, activeRegionId, onRegionsChange]);

  const handleRegionChange = (updatedRegion: CaptureRegion) => {
    onRegionsChange(regions.map(r => r.id === updatedRegion.id ? updatedRegion : r));
  };

  const handleAddRegion = (sourceId: string) => {
    const newRegion: CaptureRegion = {
      id: crypto.randomUUID(),
      sourceId,
      x: 0.1 + Math.random() * 0.3,
      y: 0.1 + Math.random() * 0.3,
      width: 0.3,
      height: 0.3,
    };
    onRegionsChange([...regions, newRegion]);
    setActiveRegionId(newRegion.id);
  };

  const handleDeleteRegion = (id: string) => {
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
    'border-cyan-500',
    'border-orange-500',
    'border-red-500',
  ];

  const getRegionColor = (index: number) => regionColors[index % regionColors.length];

  // Get regions for a specific source
  const getRegionsForSource = (sourceId: string) => regions.filter(r => r.sourceId === sourceId);

  // Get global index of region for coloring
  const getGlobalRegionIndex = (regionId: string) => regions.findIndex(r => r.id === regionId);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-8 overflow-auto">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {isRegionConfirmed ? 'Regions Selected' : 'Select Capture Regions'}
          </h2>
          <p className="text-muted-foreground">
            {isRegionConfirmed 
              ? `${regions.length} region${regions.length > 1 ? 's' : ''} from ${sources.length} source${sources.length > 1 ? 's' : ''} locked. You can now start the visualizer.`
              : 'Add capture sources and select regions from each. Each region will appear as a floating panel.'
            }
          </p>
        </div>

        {/* Source tabs and Add Source button */}
        {!isRegionConfirmed && (
          <div className="flex flex-wrap justify-center gap-2 items-center">
            {sources.map((source) => (
              <div
                key={source.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                  activeSourceId === source.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border bg-card hover:border-primary/50'
                }`}
                onClick={() => setActiveSourceId(source.id)}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-sm font-medium">{source.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({getRegionsForSource(source.id).length} region{getRegionsForSource(source.id).length !== 1 ? 's' : ''})
                </span>
                {sources.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveSource(source.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={onAddSource}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Source
            </Button>
          </div>
        )}

        {/* Region List for active source */}
        {!isRegionConfirmed && activeSourceId && (
          <div className="flex flex-wrap justify-center gap-2">
            {getRegionsForSource(activeSourceId).map((region) => {
              const globalIndex = getGlobalRegionIndex(region.id);
              return (
                <div
                  key={region.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 cursor-pointer transition-all ${
                    getRegionColor(globalIndex)
                  } ${activeRegionId === region.id ? 'bg-secondary' : 'bg-background'}`}
                  onClick={() => setActiveRegionId(region.id)}
                >
                  <span className="text-sm text-foreground">Region {globalIndex + 1}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRegion(region.id);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddRegion(activeSourceId)}
              className="rounded-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Region
            </Button>
          </div>
        )}

        {/* Video Previews - show active source large, others as thumbnails */}
        {sources.map((source) => {
          const isActive = source.id === activeSourceId;
          const sourceRegions = getRegionsForSource(source.id);
          
          if (isRegionConfirmed && !isActive) {
            // In confirmed mode, show all sources
          }
          
          return (
            <div 
              key={source.id}
              className={`transition-all ${
                !isRegionConfirmed && !isActive ? 'hidden' : ''
              }`}
            >
              {/* Source label */}
              {isRegionConfirmed && sources.length > 1 && (
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  {source.name}
                </div>
              )}
              
              <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                <video
                  ref={(el) => {
                    if (el) {
                      videoRefs.current.set(source.id, el);
                      el.srcObject = source.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                />
                
                {!isRegionConfirmed && sourceRegions.map((region) => {
                  const globalIndex = getGlobalRegionIndex(region.id);
                  return (
                    <RegionSelector
                      key={region.id}
                      videoElement={videoRefs.current.get(source.id) ?? null}
                      region={region}
                      onRegionChange={handleRegionChange}
                      isActive={activeRegionId === region.id}
                      colorClass={getRegionColor(globalIndex)}
                      label={`Region ${globalIndex + 1}`}
                      onClick={() => setActiveRegionId(region.id)}
                    />
                  );
                })}

                {isRegionConfirmed && sourceRegions.map((region) => {
                  const globalIndex = getGlobalRegionIndex(region.id);
                  return (
                    <div
                      key={region.id}
                      className={`absolute border-2 pointer-events-none ${getRegionColor(globalIndex)}`}
                      style={{
                        left: `${region.x * 100}%`,
                        top: `${region.y * 100}%`,
                        width: `${region.width * 100}%`,
                        height: `${region.height * 100}%`,
                      }}
                    >
                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${
                        getRegionColor(globalIndex).replace('border-', 'bg-')
                      } text-background text-xs px-2 py-0.5 rounded`}>
                        Region {globalIndex + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {!isRegionConfirmed ? (
            <Button 
              onClick={onConfirmRegions} 
              size="lg" 
              className="glow-primary"
              disabled={regions.length === 0}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm {regions.length} Region{regions.length !== 1 ? 's' : ''}
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
