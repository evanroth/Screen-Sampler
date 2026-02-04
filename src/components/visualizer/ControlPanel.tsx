import React from 'react';
import { Settings, Monitor, Mic, Play, Square, Maximize, Minimize, RotateCcw, Link, Unlink, Box, Layers, ListOrdered, Star, Shuffle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VisualizerSettings, BackgroundStyle, TileEffect, AnimationMode, AnimationMode3D, VisualizerMode, TextureQuality, GradientSettings, PlayModeTransition, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';
import { CaptureRegion, ModelSource } from '@/hooks/useScreenCapture';
import { cn } from '@/lib/utils';
import { ColorPicker } from '@/components/ui/color-picker';
import { PresetsSection } from './PresetsSection';
import { ModelLibrarySection } from './ModelLibrarySection';
import { MidiSection } from './MidiSection';
import { SavedPreset } from '@/hooks/useSettingsStorage';
import { CustomModel } from '@/hooks/useCustomModels';
import { RemoteModel, RemoteModelLoadingState } from '@/hooks/useRemoteModels';
import { MidiDevice, MidiMessage } from '@/hooks/useMidi';
import { MidiMapping } from '@/hooks/useMidiMappings';

// Display names for model sources
const MODEL_SOURCE_NAMES: Record<ModelSource, string> = {
  'default': 'Default 3D Shapes',
  'external': 'External 3D Models',
  'custom': 'Custom 3D Models',
};

// Display names for default 3D shapes (for the per-region dropdown)
const SHAPE_DISPLAY_NAMES: Record<string, string> = {
  'floating3D': 'Floating Panels',
  'orbit3D': 'Orbit Panel',
  'carousel3D': 'Carousel',
  'helix3D': 'Helix',
  'explode3D': 'Explode',
  'wave3D': 'Wave Panel',
  'sphere3D': 'Sphere',
  'cube3D': 'Cube',
  'cylinder3D': 'Cylinder',
  'torus3D': 'Torus',
  'pyramid3D': 'Pyramid',
  'cone3D': 'Cone',
  'dodecahedron3D': 'Dodecahedron',
  'icosahedron3D': 'Icosahedron',
  'octahedron3D': 'Octahedron',
  'tetrahedron3D': 'Tetrahedron',
  'torusKnot3D': 'Torus Knot',
  'trefoil3D': 'Trefoil Knot',
  'cinquefoil3D': 'Cinquefoil Knot',
  'septafoil3D': 'Septafoil Knot',
  'figure8_3D': 'Figure-8 Knot',
  'granny3D': 'Granny Knot',
  'lissajous3D': 'Lissajous Knot',
  'capsule3D': 'Capsule',
  'ring3D': 'Ring',
  'mobius3D': 'Möbius',
  'tetrakisHexahedron3D': 'Tetrakis Hexahedron',
  'greatDodecahedron3D': 'Great Dodecahedron',
  'greatIcosahedron3D': 'Great Icosahedron',
  'smallStellatedDodecahedron3D': 'Small Stellated Dodecahedron',
  'greatStellatedDodecahedron3D': 'Great Stellated Dodecahedron',
  'tripleTwistMobius3D': 'Triple Twist Möbius',
  'verrill3D': 'Verrill Surface',
  'doubleTrefoil3D': 'Double Trefoil',
  'schwarzP3D': 'Schwarz P Surface',
  'enneper3D': 'Enneper Surface',
  'boysSurface3D': "Boy's Surface",
  'cliffordTorus3D': 'Clifford Torus',
  'hyperbolicParaboloid3D': 'Hyperbolic Paraboloid',
  'hyperboloidOneSheet3D': 'Hyperboloid',
  'steiner3D': 'Steiner Surface',
  'helicoid3D': 'Helicoid',
};

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
  onRandomizeGradient?: () => void;
  onResetSettings: () => void;
  hasRegions: boolean;
  regionCount: number;
  regions?: CaptureRegion[];
  onUpdateRegion?: (regionId: string, updates: Partial<CaptureRegion>) => void;
  // Presets
  presets: SavedPreset[];
  autoRestore: boolean;
  onSavePreset: (name: string) => SavedPreset;
  onLoadPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
  onToggleAutoRestore: (enabled: boolean) => void;
  onClearCache: () => void;
  // Custom 3D Models
  customModels: CustomModel[];
  customModelsLoading: boolean;
  customModelsError: string | null;
  onAddCustomModel: (file: File) => Promise<CustomModel | null>;
  onDeleteCustomModel: (modelId: string) => void;
  onClearCustomModelsError: () => void;
  onSelectCustomModel?: (modelId: string) => void;
  onSelectDefaultShape?: (shapeId: AnimationMode3D) => void;
  // Remote (external) 3D Models
  remoteModels?: RemoteModel[];
  remoteModelsLoading?: boolean;
  remoteModelsError?: string | null;
  onSelectRemoteModel?: (modelId: string) => void;
  getRemoteModelLoadingState?: (modelId: string) => RemoteModelLoadingState;
  // MIDI
  midiSupported: boolean;
  midiEnabled: boolean;
  midiDevices: MidiDevice[];
  midiActiveDeviceId: string | null;
  midiLastMessage: MidiMessage | null;
  midiError: string | null;
  onMidiEnable: () => Promise<boolean>;
  onMidiDisable: () => void;
  onMidiSelectDevice: (deviceId: string | null) => void;
  midiLearnMode: string | null;
  onMidiStartLearn: (controlId: string) => void;
  onMidiCancelLearn: () => void;
  onMidiRemoveMapping: (mappingId: string) => void;
  onMidiClearAllMappings: () => void;
  getMidiMappingsForControl: (controlId: string) => MidiMapping[];
  onMidiSetMappingRelative: (mappingId: string, relative: boolean) => void;
  // Favorites
  isFavorite: (modelId: string) => boolean;
  onToggleFavorite: (modelId: string) => void;
}

export function ControlPanel({
  isOpen,
  onToggle,
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
  onRandomizeGradient,
  presets,
  autoRestore,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  onToggleAutoRestore,
  onClearCache,
  onResetSettings,
  hasRegions,
  regionCount,
  regions = [],
  onUpdateRegion,
  customModels,
  customModelsLoading,
  customModelsError,
  onAddCustomModel,
  onDeleteCustomModel,
  onClearCustomModelsError,
  onSelectCustomModel,
  onSelectDefaultShape,
  remoteModels,
  remoteModelsLoading,
  remoteModelsError,
  onSelectRemoteModel,
  getRemoteModelLoadingState,
  midiSupported,
  midiEnabled,
  midiDevices,
  midiActiveDeviceId,
  midiLastMessage,
  midiError,
  onMidiEnable,
  onMidiDisable,
  onMidiSelectDevice,
  midiLearnMode,
  onMidiStartLearn,
  onMidiCancelLearn,
  onMidiRemoveMapping,
  onMidiClearAllMappings,
  getMidiMappingsForControl,
  onMidiSetMappingRelative,
  isFavorite,
  onToggleFavorite,
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
                <div className="space-y-3">
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
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={onRandomizeGradient}
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Randomize Gradient
                  </Button>
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
                  <Label className="text-muted-foreground">Default 3D Shape</Label>
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
                  
                  {/* Favorite toggle for current default shape */}
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(settings.animationMode3D)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Star 
                      className={`w-3 h-3 ${isFavorite(settings.animationMode3D) ? 'text-yellow-500 fill-yellow-500' : ''}`}
                    />
                    {isFavorite(settings.animationMode3D) ? 'Remove from favorites' : 'Add to favorites'}
                  </button>
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
                        {/* 3D Model Source + Model Selector */}
                        <div className="space-y-2 mt-2">
                          <span className="text-xs text-muted-foreground font-medium">3D Model</span>
                          
                          {/* Source Dropdown */}
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Source</span>
                            <Select
                              value={region.modelSource || 'default'}
                              onValueChange={(v) => {
                                if (onUpdateRegion) {
                                  const newSource = v as ModelSource;
                                  // When changing source, clear the model selection
                                  onUpdateRegion(region.id, { 
                                    modelSource: newSource,
                                    customModelId: undefined,
                                    animationMode3D: newSource === 'default' ? settings.animationMode3D : undefined
                                  });
                                }
                              }}
                            >
                              <SelectTrigger className="bg-secondary border-border h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">{MODEL_SOURCE_NAMES['default']}</SelectItem>
                                {(remoteModels?.length ?? 0) > 0 && (
                                  <SelectItem value="external">{MODEL_SOURCE_NAMES['external']}</SelectItem>
                                )}
                                {customModels.length > 0 && (
                                  <SelectItem value="custom">{MODEL_SOURCE_NAMES['custom']}</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Model Dropdown - changes based on source */}
                          <div className="space-y-1">
                            <span className="text-xs text-muted-foreground">Model</span>
                            {/* Default Shapes */}
                            {(region.modelSource === 'default' || !region.modelSource) && (
                              <Select
                                value={region.animationMode3D || settings.animationMode3D}
                                onValueChange={(v) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { 
                                      animationMode3D: v as AnimationMode3D,
                                      customModelId: undefined,
                                      modelSource: 'default'
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-secondary border-border h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ANIMATION_MODES_3D.map((shapeId) => (
                                    <SelectItem key={shapeId} value={shapeId}>
                                      {SHAPE_DISPLAY_NAMES[shapeId] || shapeId}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            {/* External Models */}
                            {region.modelSource === 'external' && (
                              <Select
                                value={region.customModelId || 'none'}
                                onValueChange={(v) => {
                                  if (v !== 'none' && onSelectRemoteModel) {
                                    // Load the model first, then the handler will update regions
                                    // But we need to update THIS region specifically
                                    onSelectRemoteModel(v);
                                    // Also update this specific region
                                    if (onUpdateRegion) {
                                      onUpdateRegion(region.id, { 
                                        customModelId: v,
                                        modelSource: 'external'
                                      });
                                    }
                                  } else if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { 
                                      customModelId: undefined,
                                      modelSource: 'external'
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-secondary border-border h-8">
                                  <SelectValue placeholder="Select a model..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {remoteModels?.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      {model.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                            
                            {/* Custom Models */}
                            {region.modelSource === 'custom' && (
                              <Select
                                value={region.customModelId || 'none'}
                                onValueChange={(v) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { 
                                      customModelId: v === 'none' ? undefined : v,
                                      modelSource: 'custom'
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="bg-secondary border-border h-8">
                                  <SelectValue placeholder="Select a model..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {customModels.map((model) => (
                                    <SelectItem key={model.id} value={model.id}>
                                      {model.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
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

                {/* Center Camera */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Center Camera</Label>
                    <Switch
                      checked={settings.centerCamera}
                      onCheckedChange={(v) => onUpdateSetting('centerCamera', v)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings.centerCamera 
                      ? "Camera auto-centers on models" 
                      : "Full manual camera control (Shift+drag)"}
                  </p>
                </div>

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
                        <Label className="text-xs text-muted-foreground">Camera Speed</Label>
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

                {/* Individual Rotation - Now Independent */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Individual Rotation</Label>
                    <Switch
                      checked={settings.individualRotation}
                      onCheckedChange={(v) => onUpdateSetting('individualRotation', v)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {settings.individualRotation 
                      ? "Each model rotates around its own center" 
                      : "Models stay fixed, camera orbits"}
                  </p>

                  {settings.individualRotation && (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <Label className="text-xs text-muted-foreground">Rotation Speed</Label>
                          <span className="text-xs text-foreground">{settings.individualRotationSpeed.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[settings.individualRotationSpeed]}
                          onValueChange={([v]) => onUpdateSetting('individualRotationSpeed', v)}
                          min={0.1}
                          max={10}
                          step={0.1}
                        />
                      </div>
                      
                      {/* Per-region auto-rotate toggles */}
                      {regions.length > 0 && (
                        <div className="space-y-2 pl-2 border-l-2 border-border mt-2">
                          {regions.map((region, index) => (
                            <div key={region.id} className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">
                                Auto-Rotate Region {index + 1}
                              </Label>
                              <Switch
                                checked={region.autoRotate3D !== false}
                                onCheckedChange={(checked) => {
                                  if (onUpdateRegion) {
                                    onUpdateRegion(region.id, { autoRotate3D: checked });
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
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

                <Separator className="bg-border" />

                {/* Model Library */}
                <ModelLibrarySection
                  models={customModels}
                  isLoading={customModelsLoading}
                  error={customModelsError}
                  onAddModel={onAddCustomModel}
                  onDeleteModel={onDeleteCustomModel}
                  onClearError={onClearCustomModelsError}
                  onSelectDefaultShape={onSelectDefaultShape}
                  onSelectCustomModel={onSelectCustomModel}
                  remoteModels={remoteModels}
                  remoteModelsLoading={remoteModelsLoading}
                  remoteModelsError={remoteModelsError}
                  onSelectRemoteModel={onSelectRemoteModel}
                  getRemoteModelLoadingState={getRemoteModelLoadingState}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                />

                <p className="text-xs text-muted-foreground">
                  Tip: Click and drag to rotate view.
                </p>
              </>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Presets Section */}
          <PresetsSection
            presets={presets}
            autoRestore={autoRestore}
            onSavePreset={onSavePreset}
            onLoadPreset={onLoadPreset}
            onDeletePreset={onDeletePreset}
            onToggleAutoRestore={onToggleAutoRestore}
          />

          <Separator className="bg-border" />

          {/* MIDI Control */}
          <MidiSection
            isSupported={midiSupported}
            isEnabled={midiEnabled}
            devices={midiDevices}
            activeDeviceId={midiActiveDeviceId}
            lastMessage={midiLastMessage}
            error={midiError}
            onEnable={onMidiEnable}
            onDisable={onMidiDisable}
            onSelectDevice={onMidiSelectDevice}
            learnMode={midiLearnMode}
            onStartLearn={onMidiStartLearn}
            onCancelLearn={onMidiCancelLearn}
            onRemoveMapping={onMidiRemoveMapping}
            onClearAllMappings={onMidiClearAllMappings}
            getMappingsForControl={getMidiMappingsForControl}
            onSetMappingRelative={onMidiSetMappingRelative}
            regionCount={regionCount}
            midiRotationSensitivity={settings.midiRotationSensitivity}
            onMidiRotationSensitivityChange={(v) => onUpdateSetting('midiRotationSensitivity', v)}
          />

          <Separator className="bg-border" />

          <div className="flex gap-2">
            <Button
              onClick={onResetSettings}
              variant="outline"
              className="flex-1 text-muted-foreground text-xs uppercase tracking-wider"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={onClearCache}
              variant="outline"
              className="text-muted-foreground text-xs"
              title="Clear all cached data including presets, MIDI mappings, and favorites"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <Separator className="bg-border" />

          {/* Keyboard Shortcuts Reference */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Keyboard Shortcuts</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toggle Settings Panel</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">Return</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toggle Play Mode</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">P</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Randomize Gradient</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Auto-Rotate Camera</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">R</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cycle Animations</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">← →</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region 1: All Models</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">Z X</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region 2: All Models</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">&lt; &gt;</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region 1: Favorites</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">A S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Region 2: Favorites</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">K L</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toggle Region 1-9</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-foreground font-mono">1-9</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
