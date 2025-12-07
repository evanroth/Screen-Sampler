import React from 'react';
import { Settings, Monitor, Mic, Play, Square, Maximize, Minimize, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { VisualizerSettings, BackgroundStyle, TileEffect, AnimationMode } from '@/hooks/useVisualizerSettings';
import { cn } from '@/lib/utils';

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
  onResetSettings,
  hasRegions,
  regionCount,
}: ControlPanelProps) {
  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed top-4 right-4 z-50 p-3 rounded-full glass-panel",
          "hover:bg-secondary transition-all duration-200",
          isOpen && "bg-secondary"
        )}
      >
        <Settings className="w-5 h-5 text-foreground" />
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 z-40 glass-panel",
          "transform transition-transform duration-300 ease-out",
          "overflow-y-auto",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-6 pt-16 space-y-6">
          <h2 className="text-lg font-semibold text-foreground">Controls</h2>

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

          {/* Settings Sliders */}
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-foreground">Settings</h3>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Panel Scale</Label>
                <span className="text-sm text-foreground">{(settings.panelScale * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[settings.panelScale]}
                onValueChange={([v]) => onUpdateSetting('panelScale', v)}
                min={0.1}
                max={1.5}
                step={0.05}
              />
            </div>

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

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Opacity Variation</Label>
                <span className="text-sm text-foreground">{(settings.opacityVariation * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[settings.opacityVariation]}
                onValueChange={([v]) => onUpdateSetting('opacityVariation', v)}
                min={0}
                max={0.7}
                step={0.05}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-muted-foreground">Blur Intensity</Label>
                <span className="text-sm text-foreground">{(settings.blurIntensity * 100).toFixed(0)}%</span>
              </div>
              <Slider
                value={[settings.blurIntensity]}
                onValueChange={([v]) => onUpdateSetting('blurIntensity', v)}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Enable Rotation</Label>
              <Switch
                checked={settings.enableRotation}
                onCheckedChange={(v) => onUpdateSetting('enableRotation', v)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Black as Transparent</Label>
              <Switch
                checked={settings.blackAsTransparent}
                onCheckedChange={(v) => onUpdateSetting('blackAsTransparent', v)}
              />
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Dropdowns */}
          <div className="space-y-4">
            <div className="space-y-2">
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
                  <SelectItem value="blurred">Blurred Region</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Panel Effects</Label>
              <Select
                value={settings.tileEffect}
                onValueChange={(v) => onUpdateSetting('tileEffect', v as TileEffect)}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Clean)</SelectItem>
                  <SelectItem value="glow">Glow</SelectItem>
                  <SelectItem value="opacity">Varied Opacity</SelectItem>
                  <SelectItem value="blur">Blur Depth</SelectItem>
                  <SelectItem value="all">All Effects</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          <Separator className="bg-border" />

          <Button
            onClick={onResetSettings}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </>
  );
}
