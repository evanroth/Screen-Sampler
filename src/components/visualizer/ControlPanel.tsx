import { Monitor, Mic, Play, Square, Maximize, Minimize, RotateCcw, Link, Unlink, Box, Layers, ListOrdered } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisualizerSettings, BackgroundStyle, AnimationMode, AnimationMode3D, VisualizerMode, TextureQuality, PlayModeTransition } from '@/hooks/useVisualizerSettings';
import { CaptureRegion } from '@/hooks/useScreenCapture';
import { cn } from '@/lib/utils';
import { ColorPicker } from '@/components/ui/color-picker';

interface ControlPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  isCapturing: boolean;
  isMicActive: boolean;
  isVisualizerActive: boolean;
  isFullscreen: boolean;
  settings: VisualizerSettings;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onToggleMic: () => void;
  onStartVisualizer: () => void;
  onStopVisualizer: () => void;
  onToggleFullscreen: () => void;
  onReselectRegion: () => void;
  onUpdateSetting: <K extends keyof VisualizerSettings>(key: K, value: VisualizerSettings[K]) => void;
  onResetSettings: () => void;
  hasRegions: boolean;
  regionCount: number;
  regions?: CaptureRegion[];
  onUpdateRegion?: (regionId: string, updates: Partial<CaptureRegion>) => void;
}

export function ControlPanel({
  isOpen,
  onToggle: _onToggle,
  isCapturing,
  isMicActive,
  isVisualizerActive,
  isFullscreen,
  settings,
  onStartCapture,
  onStopCapture,
  onToggleMic,
  onStartVisualizer,
  onStopVisualizer,
  onToggleFullscreen,
  onReselectRegion,
  onUpdateSetting,
  onResetSettings,
  hasRegions,
  regionCount,
  regions = [],
  onUpdateRegion,
}: ControlPanelProps) {
  return (
    <>

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 z-40 glass-panel",
          "transform transition-transform duration-300 ease-out",
          "overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-5 pt-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Settings</h2>
            <span className="text-xs text-muted-foreground">Press S to close</span>
          </div>

          {/* Status Indicators */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isCapturing ? "bg-green-500" : "bg-muted-foreground"
              )} />
              <span className="text-muted-foreground">Screen Capture</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isMicActive ? "bg-green-500" : "bg-muted-foreground"
              )} />
              <span className="text-muted-foreground">Microphone</span>
            </div>
            {hasRegions && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">{regionCount} Region{regionCount > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={isCapturing ? onStopCapture : onStartCapture}
              variant={isCapturing ? "destructive" : "default"}
              className="w-full"
            >
              <Monitor className="w-4 h-4 mr-2" />
              {isCapturing ? "Stop Capture" : "Start Capture"}
            </Button>

            {isCapturing && (
              <Button
                onClick={onReselectRegion}
                variant="secondary"
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Edit Regions
              </Button>
            )}

            <Button
              onClick={onToggleMic}
              variant={isMicActive ? "destructive" : "secondary"}
              className="w-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              {isMicActive ? "Disable Mic" : "Enable Mic"}
            </Button>

            {hasRegions && (
              <Button
                onClick={isVisualizerActive ? onStopVisualizer : onStartVisualizer}
                variant={isVisualizerActive ? "destructive" : "default"}
                className="w-full glow-primary"
              >
                {isVisualizerActive ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop Visualizer
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Visualizer
                  </>
                )}
              </Button>
            )}

            <Button
              onClick={onToggleFullscreen}
              variant="outline"
              className="w-full"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-4 h-4 mr-2" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize className="w-4 h-4 mr-2" />
                  Enter Fullscreen
                </>
              )}
            </Button>
          </div>

          <Separator className="bg-border" />

          {/* Visualizer Mode - Moved to top */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Visualizer Mode</h3>
            <Tabs 
              value={settings.visualizerMode} 
              onValueChange={(v) => onUpdateSetting('visualizerMode', v as VisualizerMode)}
              className="w-full"
            >
              <TabsList
                className="grid w-full grid-cols-2"
                onKeyDownCapture={(e) => {
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    // Prevent Tabs from changing visualizer mode with arrow keys
                    e.preventDefault();
                    e.stopPropagation();
                    // Re-dispatch to window so global handler can cycle animations instead
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key }));
                  }
                }}
              >
                <TabsTrigger value="2d" className="gap-2">
                  <Layers className="w-4 h-4" />
                  2D
                </TabsTrigger>
                <TabsTrigger value="3d" className="gap-2">
                  <Box className="w-4 h-4" />
                  3D
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator className="bg-border" />

          {/* Play Mode */}
          {regionCount >= 2 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Play Mode</h3>
                  </div>
                  <Switch
                    checked={settings.playMode.enabled}
                    onCheckedChange={(checked) => 
                      onUpdateSetting('playMode', { ...settings.playMode, enabled: checked })
                    }
                  />
                </div>
                
                {regionCount < 2 && settings.playMode.enabled && (
                  <p className="text-xs text-muted-foreground">
                    Requires at least 2 regions to function.
                  </p>
                )}
                
                {settings.playMode.enabled && regionCount >= 2 && (
                  <div className="space-y-3 pl-2 border-l-2 border-border">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-muted-foreground text-xs">Interval</Label>
                        <span className="text-xs text-foreground">{settings.playMode.interval}s</span>
                      </div>
                      <Slider
                        value={[settings.playMode.interval]}
                        onValueChange={([v]) => 
                          onUpdateSetting('playMode', { ...settings.playMode, interval: v })
                        }
                        min={1}
                        max={120}
                        step={1}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs">Transition</Label>
                      <Select
                        value={settings.playMode.transition}
                        onValueChange={(v) => 
                          onUpdateSetting('playMode', { ...settings.playMode, transition: v as PlayModeTransition })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <Separator className="bg-border" />
            </>
          )}


          {/* Settings Sliders */}
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Parameters</h3>

            {/* 2D-only: Panel Scale */}
            {settings.visualizerMode === '2d' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-muted-foreground">Panel Scale</Label>
                  <button
                    onClick={() => onUpdateSetting('panelScaleLinked', !settings.panelScaleLinked)}
                    className={`p-1 rounded transition-colors ${settings.panelScaleLinked ? 'text-primary' : 'text-muted-foreground'}`}
                    title={settings.panelScaleLinked ? 'Linked (click to unlink)' : 'Unlinked (click to link)'}
                  >
                    {settings.panelScaleLinked ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Width</span>
                    <span className="text-xs text-foreground">{(settings.panelScaleX * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[settings.panelScaleX]}
                    onValueChange={([v]) => {
                      onUpdateSetting('panelScaleX', v);
                      if (settings.panelScaleLinked) {
                        onUpdateSetting('panelScaleY', v);
                      }
                    }}
                    min={0.1}
                    max={2}
                    step={0.05}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Height</span>
                    <span className="text-xs text-foreground">{(settings.panelScaleY * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[settings.panelScaleY]}
                    onValueChange={([v]) => {
                      onUpdateSetting('panelScaleY', v);
                      if (settings.panelScaleLinked) {
                        onUpdateSetting('panelScaleX', v);
                      }
                    }}
                    min={0.1}
                    max={2}
                    step={0.05}
                  />
                </div>
              </div>
            )}

            {/* 2D-only: Speed */}
            {settings.visualizerMode === '2d' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-muted-foreground">Speed</Label>
                  <span className="text-sm text-foreground">{settings.movementSpeed.toFixed(1)}</span>
                </div>
                <Slider
                  value={[settings.movementSpeed]}
                  onValueChange={([v]) => onUpdateSetting('movementSpeed', v)}
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>
            )}

            {/* Shared: Bounce */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Bounce</Label>
                <span className="text-sm text-foreground">{(settings.bounceStrength * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[settings.bounceStrength]}
                onValueChange={([v]) => onUpdateSetting('bounceStrength', v)}
                min={0}
                max={0.3}
                step={0.01}
              />
            </div>

            {/* 2D-only: Trails */}
            {settings.visualizerMode === '2d' && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Enable Trails</Label>
                  <Switch
                    checked={settings.enableTrails}
                    onCheckedChange={(v) => onUpdateSetting('enableTrails', v)}
                  />
                </div>

                {settings.enableTrails && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Trail Amount</Label>
                      <span className="text-sm text-foreground">{(settings.trailAmount * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[settings.trailAmount]}
                      onValueChange={([v]) => onUpdateSetting('trailAmount', v)}
                      min={0}
                      max={1}
                      step={0.05}
                    />
                  </div>
                )}
              </>
            )}


            {/* 2D-only: Rotation */}
            {settings.visualizerMode === '2d' && (
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">Enable Rotation</Label>
                <Switch
                  checked={settings.enableRotation}
                  onCheckedChange={(v) => onUpdateSetting('enableRotation', v)}
                />
              </div>
            )}

          </div>

          <Separator className="bg-border" />

          {/* Dropdowns */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Label className="text-muted-foreground">Background</Label>
              <Select
                value={settings.backgroundStyle}
                onValueChange={(v) => onUpdateSetting('backgroundStyle', v as BackgroundStyle)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="black">Pure Black</SelectItem>
                  <SelectItem value="white">Pure White</SelectItem>
                  <SelectItem value="solid">Solid Color</SelectItem>
                  <SelectItem value="blurred">Blurred Region</SelectItem>
                  <SelectItem value="linearGradient">Linear Gradient</SelectItem>
                  <SelectItem value="radialGradient">Radial Gradient</SelectItem>
                </SelectContent>
              </Select>

              {settings.backgroundStyle === 'solid' && (
                <ColorPicker
                  value={settings.backgroundColor}
                  onChange={(v) => onUpdateSetting('backgroundColor', v)}
                  label="Color"
                />
              )}

              {(settings.backgroundStyle === 'linearGradient' || settings.backgroundStyle === 'radialGradient') && (
                <div className="space-y-2">
                  <ColorPicker
                    value={settings.gradientSettings.color1}
                    onChange={(v) => onUpdateSetting('gradientSettings', { ...settings.gradientSettings, color1: v })}
                    label="Start"
                  />
                  <ColorPicker
                    value={settings.gradientSettings.color2}
                    onChange={(v) => onUpdateSetting('gradientSettings', { ...settings.gradientSettings, color2: v })}
                    label="End"
                  />
                </div>
              )}
            </div>



            {/* 2D Animation Mode */}
            {settings.visualizerMode === '2d' && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Animation Mode</Label>
                  <Select
                    value={settings.animationMode}
                    onValueChange={(v) => onUpdateSetting('animationMode', v as AnimationMode)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random</SelectItem>
                      <SelectItem value="still">Still</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                      <SelectItem value="verticalDrop">Vertical Drop</SelectItem>
                      <SelectItem value="horizontalSweep">Horizontal Sweep</SelectItem>
                      <SelectItem value="clockwise">Rotate Clockwise</SelectItem>
                      <SelectItem value="counterClockwise">Rotate Counter-Clockwise</SelectItem>
                      <SelectItem value="clockHand">Clock Hand</SelectItem>
                      <SelectItem value="pendulum">Pendulum</SelectItem>
                      <SelectItem value="waterfall">Waterfall</SelectItem>
                      <SelectItem value="spiral">Spiral</SelectItem>
                      <SelectItem value="orbit">Orbit</SelectItem>
                      <SelectItem value="zigzag">Zigzag</SelectItem>
                      <SelectItem value="wave">Wave</SelectItem>
                      <SelectItem value="float">Float</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.animationMode === 'random' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Change Interval</Label>
                      <span className="text-sm text-foreground">{settings.randomModeInterval}s</span>
                    </div>
                    <Slider
                      value={[settings.randomModeInterval]}
                      onValueChange={([v]) => onUpdateSetting('randomModeInterval', v)}
                      min={2}
                      max={90}
                      step={1}
                    />
                  </div>
                )}

                {/* Per-Region 2D Transform Controls */}
                {regions.length > 0 && (
                  <div className="space-y-3">
                    <Separator className="bg-border" />
                    <Label className="text-muted-foreground font-medium">Per-Region 2D Transforms</Label>
                    <p className="text-xs text-muted-foreground">
                      Adjust position and scale for each region.
                    </p>
                    {regions.map((region, index) => (
                      <div key={region.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Region {index + 1}</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Visible</span>
                            <Switch
                              checked={region.visible !== false}
                              onCheckedChange={(checked) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { visible: checked });
                                }
                              }}
                            />
                            <span className="text-xs text-muted-foreground opacity-50">({index + 1})</span>
                          </div>
                        </div>
                        
                        {/* Randomize Controls */}
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Randomize Mode</span>
                            <Switch
                              checked={!!region.randomizeEnabled}
                              onCheckedChange={(checked) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    randomizeEnabled: checked,
                                    randomizeInterval: region.randomizeInterval || 30,
                                    fadeOpacity: 1
                                  });
                                }
                              }}
                            />
                          </div>
                          {region.randomizeEnabled && (
                            <>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-xs text-muted-foreground">Interval</span>
                                  <span className="text-xs text-foreground">{region.randomizeInterval || 30}s</span>
                                </div>
                                <Slider
                                  value={[region.randomizeInterval || 30]}
                                  onValueChange={([v]) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { randomizeInterval: v });
                                    }
                                  }}
                                  min={1}
                                  max={300}
                                  step={1}
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Transition</span>
                                <Select
                                  value={region.transitionType || 'none'}
                                  onValueChange={(v) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { transitionType: v as 'none' | 'fade' | 'zoom' });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="bg-secondary border-border h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="fade">Fade</SelectItem>
                                    <SelectItem value="zoom">Zoom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Position X/Y/Z Controls */}
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-border">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Position X</span>
                              <span className="text-xs text-foreground">{(region.position2D?.x ?? 0).toFixed(0)}px</span>
                            </div>
                            <Slider
                              value={[region.position2D?.x ?? 0]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position2D: { 
                                      x: v, 
                                      y: region.position2D?.y ?? 0, 
                                      z: region.position2D?.z ?? 0 
                                    } 
                                  });
                                }
                              }}
                              min={-500}
                              max={500}
                              step={10}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Position Y</span>
                              <span className="text-xs text-foreground">{(region.position2D?.y ?? 0).toFixed(0)}px</span>
                            </div>
                            <Slider
                              value={[region.position2D?.y ?? 0]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position2D: { 
                                      x: region.position2D?.x ?? 0, 
                                      y: v, 
                                      z: region.position2D?.z ?? 0 
                                    } 
                                  });
                                }
                              }}
                              min={-500}
                              max={500}
                              step={10}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Z-Index (Layer)</span>
                              <span className="text-xs text-foreground">{(region.position2D?.z ?? 0).toFixed(0)}</span>
                            </div>
                            <Slider
                              value={[region.position2D?.z ?? 0]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position2D: { 
                                      x: region.position2D?.x ?? 0, 
                                      y: region.position2D?.y ?? 0, 
                                      z: v 
                                    } 
                                  });
                                }
                              }}
                              min={-10}
                              max={10}
                              step={1}
                            />
                          </div>
                          {/* Scale Control */}
                          <div className="space-y-1 mt-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Scale</span>
                              <span className="text-xs text-foreground">{((region.scale2D ?? 1) * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                              value={[region.scale2D ?? 1]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { scale2D: v });
                                }
                              }}
                              min={0.01}
                              max={3}
                              step={0.01}
                            />
                          </div>
                          {/* Fullscreen Background */}
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Fullscreen Background</span>
                              <Switch
                                checked={!!region.fullscreenBackground}
                                onCheckedChange={(checked) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { fullscreenBackground: checked });
                                  }
                                }}
                              />
                            </div>
                          </div>
                          {/* Transparent Color */}
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Transparent Color</span>
                              <Switch
                                checked={!!region.transparentColor}
                                onCheckedChange={(checked) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { 
                                      transparentColor: checked ? '#000000' : undefined,
                                      transparentThreshold: checked ? 30 : undefined
                                    });
                                  }
                                }}
                              />
                            </div>
                            {region.transparentColor && (
                              <>
                                <ColorPicker
                                  value={region.transparentColor}
                                  onChange={(v) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { transparentColor: v });
                                    }
                                  }}
                                  label="Color"
                                />
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Threshold</span>
                                    <span className="text-xs text-foreground">{region.transparentThreshold ?? 30}</span>
                                  </div>
                                  <Slider
                                    value={[region.transparentThreshold ?? 30]}
                                    onValueChange={([v]) => {
                                      if (onUpdateRegion) {
                                        onUpdateRegion(region.id, { transparentThreshold: v });
                                      }
                                    }}
                                    min={5}
                                    max={441}
                                    step={1}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          {/* Glow */}
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Glow</span>
                              <Switch
                                checked={!!region.glowEnabled}
                                onCheckedChange={(checked) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { 
                                      glowEnabled: checked,
                                      glowColor: checked ? '#FFFFFF' : undefined,
                                      glowAmount: checked ? 20 : undefined
                                    });
                                  }
                                }}
                              />
                            </div>
                            {region.glowEnabled && (
                              <>
                                <ColorPicker
                                  value={region.glowColor ?? '#FFFFFF'}
                                  onChange={(v) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { glowColor: v });
                                    }
                                  }}
                                  label="Color"
                                />
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Amount</span>
                                    <span className="text-xs text-foreground">{region.glowAmount ?? 20}</span>
                                  </div>
                                  <Slider
                                    value={[region.glowAmount ?? 20]}
                                    onValueChange={([v]) => {
                                      if (onUpdateRegion) {
                                        onUpdateRegion(region.id, { glowAmount: v });
                                      }
                                    }}
                                    min={5}
                                    max={100}
                                    step={5}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          {(region.position2D || region.scale2D !== undefined || region.transparentColor || region.glowEnabled || region.fullscreenBackground) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 mt-2"
                              onClick={() => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position2D: undefined, 
                                    scale2D: undefined,
                                    transparentColor: undefined,
                                    transparentThreshold: undefined,
                                    glowEnabled: undefined,
                                    glowColor: undefined,
                                    glowAmount: undefined,
                                    fullscreenBackground: undefined
                                  });
                                }
                              }}
                            >
                              Reset Transform
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 3D Animation Mode */}
            {settings.visualizerMode === '3d' && (
              <>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Default 3D Animation</Label>
                  <Select
                    value={settings.animationMode3D}
                    onValueChange={(v) => onUpdateSetting('animationMode3D', v as AnimationMode3D)}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random3D">Random</SelectItem>
                      <SelectItem value="floating3D">Floating Panels</SelectItem>
                      <SelectItem value="orbit3D">Orbit Panel</SelectItem>
                      <SelectItem value="wave3D">Wave Panel</SelectItem>
                      <SelectItem value="sphere3D">Sphere</SelectItem>
                      <SelectItem value="cube3D">Cube</SelectItem>
                      <SelectItem value="cylinder3D">Cylinder</SelectItem>
                      <SelectItem value="torus3D">Torus</SelectItem>
                      <SelectItem value="pyramid3D">Pyramid</SelectItem>
                      <SelectItem value="cone3D">Cone</SelectItem>
                      <SelectItem value="dodecahedron3D">Dodecahedron</SelectItem>
                      <SelectItem value="icosahedron3D">Icosahedron</SelectItem>
                      <SelectItem value="octahedron3D">Octahedron</SelectItem>
                      <SelectItem value="tetrahedron3D">Tetrahedron</SelectItem>
                      <SelectItem value="torusKnot3D">Torus Knot</SelectItem>
                      <SelectItem value="trefoil3D">Trefoil Knot</SelectItem>
                      <SelectItem value="cinquefoil3D">Cinquefoil Knot</SelectItem>
                      <SelectItem value="septafoil3D">Septafoil Knot</SelectItem>
                      <SelectItem value="figure8_3D">Figure-8 Knot</SelectItem>
                      <SelectItem value="granny3D">Granny Knot</SelectItem>
                      <SelectItem value="lissajous3D">Lissajous Knot</SelectItem>
                      <SelectItem value="capsule3D">Capsule</SelectItem>
                      <SelectItem value="ring3D">Ring</SelectItem>
                      <SelectItem value="mobius3D">Möbius</SelectItem>
                      <SelectItem value="greatDodecahedron3D">Great Dodecahedron</SelectItem>
                      <SelectItem value="greatIcosahedron3D">Great Icosahedron</SelectItem>
                      <SelectItem value="greatStellatedDodecahedron3D">Great Stellated Dodecahedron</SelectItem>
                      <SelectItem value="tripleTwistMobius3D">Triple Twist Möbius</SelectItem>
                      <SelectItem value="verrill3D">Verrill Surface</SelectItem>
                      <SelectItem value="doubleTrefoil3D">Double Trefoil</SelectItem>
                      <SelectItem value="schwarzP3D">Schwarz P Surface</SelectItem>
                      <SelectItem value="enneper3D">Enneper Surface</SelectItem>
                      <SelectItem value="boysSurface3D">Boy's Surface</SelectItem>
                      <SelectItem value="cliffordTorus3D">Clifford Torus</SelectItem>
                      <SelectItem value="hyperbolicParaboloid3D">Hyperbolic Paraboloid</SelectItem>
                      <SelectItem value="hyperboloidOneSheet3D">Hyperboloid</SelectItem>
                      <SelectItem value="steiner3D">Steiner Surface</SelectItem>
                      <SelectItem value="helicoid3D">Helicoid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.animationMode3D === 'random3D' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-muted-foreground">Change Interval</Label>
                      <span className="text-sm text-foreground">{settings.randomModeInterval}s</span>
                    </div>
                    <Slider
                      value={[settings.randomModeInterval]}
                      onValueChange={([v]) => onUpdateSetting('randomModeInterval', v)}
                      min={2}
                      max={90}
                      step={1}
                    />
                  </div>
                )}

                {/* Per-Region 3D Animation Controls */}
                {regions.length > 0 && (
                  <div className="space-y-3">
                    <Separator className="bg-border" />
                    <Label className="text-muted-foreground font-medium">Per-Region 3D Modes</Label>
                    <p className="text-xs text-muted-foreground">
                      Override the default mode for each region, or leave as "Default" to use the global setting.
                    </p>
                    {regions.map((region, index) => (
                      <div key={region.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Region {index + 1}</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Visible</span>
                            <Switch
                              checked={region.visible !== false}
                              onCheckedChange={(checked) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { visible: checked });
                                }
                              }}
                            />
                            <span className="text-xs text-muted-foreground opacity-50">({index + 1})</span>
                          </div>
                        </div>
                        <Select
                          value={region.animationMode3D || 'default'}
                          onValueChange={(v) => {
                            if (onUpdateRegion) {
                              onUpdateRegion(region.id, { 
                                animationMode3D: v === 'default' ? undefined : v as AnimationMode3D 
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default (Use Global)</SelectItem>
                            <SelectItem value="floating3D">Floating Panels</SelectItem>
                            <SelectItem value="orbit3D">Orbit Panel</SelectItem>
                            <SelectItem value="wave3D">Wave Panel</SelectItem>
                            <SelectItem value="sphere3D">Sphere</SelectItem>
                            <SelectItem value="cube3D">Cube</SelectItem>
                            <SelectItem value="cylinder3D">Cylinder</SelectItem>
                            <SelectItem value="torus3D">Torus</SelectItem>
                            <SelectItem value="pyramid3D">Pyramid</SelectItem>
                            <SelectItem value="cone3D">Cone</SelectItem>
                            <SelectItem value="dodecahedron3D">Dodecahedron</SelectItem>
                            <SelectItem value="icosahedron3D">Icosahedron</SelectItem>
                            <SelectItem value="octahedron3D">Octahedron</SelectItem>
                            <SelectItem value="tetrahedron3D">Tetrahedron</SelectItem>
                            <SelectItem value="torusKnot3D">Torus Knot</SelectItem>
                            <SelectItem value="trefoil3D">Trefoil Knot</SelectItem>
                            <SelectItem value="cinquefoil3D">Cinquefoil Knot</SelectItem>
                            <SelectItem value="septafoil3D">Septafoil Knot</SelectItem>
                            <SelectItem value="figure8_3D">Figure-8 Knot</SelectItem>
                            <SelectItem value="granny3D">Granny Knot</SelectItem>
                            <SelectItem value="lissajous3D">Lissajous Knot</SelectItem>
                            <SelectItem value="capsule3D">Capsule</SelectItem>
                            <SelectItem value="ring3D">Ring</SelectItem>
                            <SelectItem value="mobius3D">Möbius</SelectItem>
                            <SelectItem value="greatDodecahedron3D">Great Dodecahedron</SelectItem>
                            <SelectItem value="greatIcosahedron3D">Great Icosahedron</SelectItem>
                            <SelectItem value="greatStellatedDodecahedron3D">Great Stellated Dodecahedron</SelectItem>
                            <SelectItem value="tripleTwistMobius3D">Triple Twist Möbius</SelectItem>
                            <SelectItem value="verrill3D">Verrill Surface</SelectItem>
                            <SelectItem value="doubleTrefoil3D">Double Trefoil</SelectItem>
                            <SelectItem value="schwarzP3D">Schwarz P Surface</SelectItem>
                            <SelectItem value="enneper3D">Enneper Surface</SelectItem>
                            <SelectItem value="boysSurface3D">Boy's Surface</SelectItem>
                            <SelectItem value="cliffordTorus3D">Clifford Torus</SelectItem>
                            <SelectItem value="hyperbolicParaboloid3D">Hyperbolic Paraboloid</SelectItem>
                            <SelectItem value="hyperboloidOneSheet3D">Hyperboloid</SelectItem>
                            <SelectItem value="steiner3D">Steiner Surface</SelectItem>
                            <SelectItem value="helicoid3D">Helicoid</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Randomize Controls */}
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Randomize Mode</span>
                            <Switch
                              checked={!!region.randomizeEnabled}
                              onCheckedChange={(checked) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    randomizeEnabled: checked,
                                    randomizeInterval: region.randomizeInterval || 30,
                                    fadeOpacity: 1
                                  });
                                }
                              }}
                            />
                          </div>
                          {region.randomizeEnabled && (
                            <>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-xs text-muted-foreground">Interval</span>
                                  <span className="text-xs text-foreground">{region.randomizeInterval || 30}s</span>
                                </div>
                                <Slider
                                  value={[region.randomizeInterval || 30]}
                                  onValueChange={([v]) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { randomizeInterval: v });
                                    }
                                  }}
                                  min={1}
                                  max={300}
                                  step={1}
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground">Transition</span>
                                <Select
                                  value={region.transitionType || 'fade'}
                                  onValueChange={(v) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { transitionType: v as 'fade' | 'zoom' });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="bg-secondary border-border h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="fade">Fade</SelectItem>
                                    <SelectItem value="zoom">Zoom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {/* Position X/Y/Z Controls */}
                        <div className="mt-2 space-y-2 pl-2 border-l-2 border-border">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Position X</span>
                              <span className="text-xs text-foreground">{(region.position3D?.x ?? 0).toFixed(1)}</span>
                            </div>
                            <Slider
                              value={[region.position3D?.x ?? 0]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position3D: { 
                                      x: v, 
                                      y: region.position3D?.y ?? 0, 
                                      z: region.position3D?.z ?? 0 
                                    } 
                                  });
                                }
                              }}
                              min={-10}
                              max={10}
                              step={0.1}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Position Y</span>
                              <span className="text-xs text-foreground">{(region.position3D?.y ?? 0).toFixed(1)}</span>
                            </div>
                            <Slider
                              value={[region.position3D?.y ?? 0]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position3D: { 
                                      x: region.position3D?.x ?? 0, 
                                      y: v, 
                                      z: region.position3D?.z ?? 0 
                                    } 
                                  });
                                }
                              }}
                              min={-10}
                              max={10}
                              step={0.1}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Position Z</span>
                              <span className="text-xs text-foreground">{(region.position3D?.z ?? 0).toFixed(1)}</span>
                            </div>
                            <Slider
                              value={[region.position3D?.z ?? 0]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position3D: { 
                                      x: region.position3D?.x ?? 0, 
                                      y: region.position3D?.y ?? 0, 
                                      z: v 
                                    } 
                                  });
                                }
                              }}
                              min={-10}
                              max={10}
                              step={0.1}
                            />
                          </div>
                          {/* Scale Control */}
                          <div className="space-y-1 mt-2">
                            <div className="flex justify-between">
                              <span className="text-xs text-muted-foreground">Scale</span>
                              <span className="text-xs text-foreground">{((region.scale3D ?? 1) * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                              value={[region.scale3D ?? 1]}
                              onValueChange={([v]) => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { scale3D: v });
                                }
                              }}
                              min={0.01}
                              max={3}
                              step={0.01}
                            />
                          </div>
                          {/* Fullscreen Background */}
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Fullscreen Background</span>
                              <Switch
                                checked={!!region.fullscreenBackground}
                                onCheckedChange={(checked) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { fullscreenBackground: checked });
                                  }
                                }}
                              />
                            </div>
                          </div>
                          {/* Transparent Color */}
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Transparent Color</span>
                              <Switch
                                checked={!!region.transparentColor}
                                onCheckedChange={(checked) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { 
                                      transparentColor: checked ? '#000000' : undefined,
                                      transparentThreshold: checked ? 30 : undefined
                                    });
                                  }
                                }}
                              />
                            </div>
                            {region.transparentColor && (
                              <>
                                <ColorPicker
                                  value={region.transparentColor}
                                  onChange={(v) => {
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { transparentColor: v });
                                    }
                                  }}
                                  label="Color"
                                />
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-xs text-muted-foreground">Threshold</span>
                                    <span className="text-xs text-foreground">{region.transparentThreshold ?? 30}</span>
                                  </div>
                                  <Slider
                                    value={[region.transparentThreshold ?? 30]}
                                    onValueChange={([v]) => {
                                      if (onUpdateRegion) {
                                        onUpdateRegion(region.id, { transparentThreshold: v });
                                      }
                                    }}
                                    min={5}
                                    max={441}
                                    step={1}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          {(region.position3D || region.scale3D !== undefined || region.transparentColor || region.fullscreenBackground) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 mt-2"
                              onClick={() => {
                                if (onUpdateRegion) {
                                  onUpdateRegion(region.id, { 
                                    position3D: undefined, 
                                    scale3D: undefined,
                                    transparentColor: undefined,
                                    transparentThreshold: undefined,
                                    fullscreenBackground: undefined
                                  });
                                }
                              }}
                            >
                              Reset Transform
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="bg-border" />

                {/* Camera Auto-Rotate */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Auto-Rotate Camera</Label>
                    <Switch
                      checked={settings.autoRotateCamera}
                      onCheckedChange={(v) => onUpdateSetting('autoRotateCamera', v)}
                    />
                  </div>

                  {settings.autoRotateCamera && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-muted-foreground">Rotation Speed</Label>
                        <span className="text-xs text-foreground">{settings.autoRotateCameraSpeed.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[settings.autoRotateCameraSpeed]}
                        onValueChange={([v]) => onUpdateSetting('autoRotateCameraSpeed', v)}
                        min={0.1}
                        max={10}
                        step={0.1}
                      />
                    </div>
                  )}
                </div>

                <Separator className="bg-border" />

                {/* Texture Settings */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground font-medium">Texture Settings</Label>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Texture Quality</Label>
                    <Select
                      value={String(settings.textureQuality)}
                      onValueChange={(v) => onUpdateSetting('textureQuality', Number(v) as TextureQuality)}
                    >
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512">512px (Fast)</SelectItem>
                        <SelectItem value="1024">1024px (Balanced)</SelectItem>
                        <SelectItem value="2048">2048px (High Quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Texture Smoothing</Label>
                    <Switch
                      checked={settings.textureSmoothing}
                      onCheckedChange={(v) => onUpdateSetting('textureSmoothing', v)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings.textureSmoothing 
                      ? "Smooth scaling (bilinear filtering)" 
                      : "Crisp pixels (nearest neighbor)"}
                  </p>
                </div>

                <Separator className="bg-border" />

                {/* Region Spacing */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-xs text-muted-foreground">Region Spacing</Label>
                    <span className="text-xs text-foreground">{settings.regionSpacing3D.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[settings.regionSpacing3D]}
                    onValueChange={([v]) => onUpdateSetting('regionSpacing3D', v)}
                    min={1}
                    max={10}
                    step={0.5}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Tip: Click and drag to rotate view.
                </p>
              </>
            )}
          </div>

          <Separator className="bg-border" />

          <Button
            onClick={onResetSettings}
            variant="outline"
            className="w-full text-muted-foreground text-xs uppercase tracking-wider"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </>
  );
}
