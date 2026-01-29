import React, { useState, useMemo } from 'react';
import { Disc3, Trash2, X, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MidiDevice, MidiMessage } from '@/hooks/useMidi';
import { MidiMapping, MAPPABLE_CONTROLS, MappableControl } from '@/hooks/useMidiMappings';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MidiSectionProps {
  isSupported: boolean;
  isEnabled: boolean;
  devices: MidiDevice[];
  activeDeviceId: string | null;
  lastMessage: MidiMessage | null;
  error: string | null;
  onEnable: () => Promise<boolean>;
  onDisable: () => void;
  onSelectDevice: (deviceId: string | null) => void;
  learnMode: string | null;
  onStartLearn: (controlId: string) => void;
  onCancelLearn: () => void;
  onRemoveMapping: (mappingId: string) => void;
  onClearAllMappings: () => void;
  getMappingsForControl: (controlId: string) => MidiMapping[];
  onSetMappingRelative: (mappingId: string, relative: boolean) => void;
  regionCount: number;
  midiRotationSensitivity: number;
  onMidiRotationSensitivityChange: (value: number) => void;
}

function formatMidiMessage(message: MidiMessage): string {
  if (message.type === 'noteon') {
    return `Note ${message.note} (Ch ${message.channel})`;
  } else if (message.type === 'cc') {
    return `CC ${message.cc} (Ch ${message.channel})`;
  }
  return 'Unknown';
}

// Single mapping item within a control (one MIDI input)
function MappingItem({
  mapping,
  onRemove,
  onSetRelative,
  disabled,
  showRelativeOption,
}: {
  mapping: MidiMapping;
  onRemove: () => void;
  onSetRelative?: (relative: boolean) => void;
  disabled?: boolean;
  showRelativeOption?: boolean;
}) {
  return (
    <div className="flex items-center justify-between bg-secondary/40 rounded px-2 py-1 text-xs">
      <div className="text-muted-foreground">
        {formatMidiMessage({ 
          type: mapping.messageType, 
          channel: mapping.channel, 
          note: mapping.messageType === 'noteon' ? mapping.noteOrCC : undefined,
          cc: mapping.messageType === 'cc' ? mapping.noteOrCC : undefined,
          value: 0,
          timestamp: 0,
        })}
      </div>
      <div className="flex items-center gap-1">
        {showRelativeOption && (
          <div className="flex items-center gap-1 mr-1">
            <Checkbox
              id={`relative-${mapping.id}`}
              checked={mapping.relative ?? false}
              onCheckedChange={(checked) => onSetRelative?.(checked === true)}
              disabled={disabled}
              className="h-3 w-3"
            />
            <label 
              htmlFor={`relative-${mapping.id}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Rel
            </label>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="h-5 w-5 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Row for a control that can have multiple MIDI inputs
function MappingRow({ 
  controlId, 
  control, 
  mappings, 
  isLearning, 
  lastMessage,
  onStartLearn, 
  onCancelLearn,
  onRemoveMapping,
  onSetRelative,
  disabled,
  showRelativeOption,
}: {
  controlId: string;
  control: MappableControl;
  mappings: MidiMapping[];
  isLearning: boolean;
  lastMessage: MidiMessage | null;
  onStartLearn: () => void;
  onCancelLearn: () => void;
  onRemoveMapping: (mappingId: string) => void;
  onSetRelative?: (mappingId: string, relative: boolean) => void;
  disabled?: boolean;
  showRelativeOption?: boolean;
}) {
  return (
    <div className={cn(
      "flex flex-col gap-1 py-2 px-2 rounded text-xs",
      isLearning ? "bg-primary/20 border border-primary" : "bg-secondary/30",
      disabled && "opacity-50"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{control.name}</div>
          {mappings.length === 0 && !isLearning && (
            <div className="text-muted-foreground italic">Not mapped</div>
          )}
        </div>
        
        <div className="flex items-center gap-1 ml-2">
          {isLearning ? (
            <>
              <div className="text-xs text-primary animate-pulse mr-1">
                {lastMessage ? 'Press again to confirm' : 'Move control...'}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelLearn}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStartLearn}
              disabled={disabled}
              className="h-6 px-2 text-xs"
              title={mappings.length > 0 ? "Add another MIDI input" : "Learn MIDI input"}
            >
              {mappings.length > 0 ? <Plus className="w-3 h-3" /> : 'Learn'}
            </Button>
          )}
        </div>
      </div>
      
      {/* List of mapped MIDI inputs */}
      {mappings.length > 0 && (
        <div className="space-y-1 mt-1">
          {mappings.map((mapping) => (
            <MappingItem
              key={mapping.id}
              mapping={mapping}
              onRemove={() => onRemoveMapping(mapping.id)}
              onSetRelative={onSetRelative ? (rel) => onSetRelative(mapping.id, rel) : undefined}
              disabled={disabled}
              showRelativeOption={showRelativeOption}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to categorize controls
function categorizeControls(controls: MappableControl[], regionCount: number) {
  const global: {
    parameters: MappableControl[];
    toggles: MappableControl[];
    modes: MappableControl[];
    camera: MappableControl[];
    allModels: MappableControl[];
    favorites: MappableControl[];
  } = {
    parameters: [],
    toggles: [],
    modes: [],
    camera: [],
    allModels: [],
    favorites: [],
  };
  
  const perRegion: Map<number, {
    visibility: MappableControl[];
    scale: MappableControl[];
    rotation: MappableControl[];
    autoRotate: MappableControl[];
    bounce: MappableControl[];
    favorites: MappableControl[];
  }> = new Map();
  
  // Initialize per-region buckets
  for (let i = 0; i < regionCount; i++) {
    perRegion.set(i, {
      visibility: [],
      scale: [],
      rotation: [],
      autoRotate: [],
      bounce: [],
      favorites: [],
    });
  }
  
  controls.forEach(control => {
    // Global settings - sliders (CC parameters)
    if (control.targetType === 'setting' && control.preferredMessageType === 'cc') {
      global.parameters.push(control);
      return;
    }
    
    // Crossfade controls go to global parameters
    if (control.targetType === 'crossfade') {
      global.parameters.push(control);
      return;
    }
    
    // Global settings - toggles (Note On)
    if (control.targetType === 'setting' && control.preferredMessageType === 'noteon') {
      global.toggles.push(control);
      return;
    }
    
    // Mode selectors
    if (control.targetType === 'settingSelect') {
      global.modes.push(control);
      return;
    }
    
    // Camera rotation
    if (control.targetType === 'cameraRotation') {
      global.camera.push(control);
      return;
    }
    
    // Favorite navigation
    if (control.targetType === 'favoriteNavigation') {
      global.favorites.push(control);
      return;
    }
    
    // "All" controls go to global
    if (control.targetKey === 'all') {
      global.allModels.push(control);
      return;
    }
    
    // Per-region controls
    const regionIndex = parseInt(control.targetKey, 10);
    if (isNaN(regionIndex) || regionIndex >= regionCount) return;
    
    const regionBucket = perRegion.get(regionIndex);
    if (!regionBucket) return;
    
    if (control.targetType === 'regionVisibility') {
      regionBucket.visibility.push(control);
    } else if (control.targetType === 'regionSetting' && control.subKey === 'scale3D') {
      regionBucket.scale.push(control);
    } else if (control.targetType === 'regionSetting' && control.subKey === 'autoRotate3D') {
      regionBucket.autoRotate.push(control);
    } else if (control.targetType === 'modelRotation') {
      regionBucket.rotation.push(control);
    } else if (control.targetType === 'regionBounce') {
      regionBucket.bounce.push(control);
    } else if (control.targetType === 'regionFavoriteNavigation') {
      regionBucket.favorites.push(control);
    }
  });
  
  return { global, perRegion };
}

interface ControlGroupProps {
  title: string;
  controls: MappableControl[];
  learnMode: string | null;
  lastMessage: MidiMessage | null;
  onStartLearn: (controlId: string) => void;
  onCancelLearn: () => void;
  onRemoveMapping: (mappingId: string) => void;
  getMappingsForControl: (controlId: string) => MidiMapping[];
  onSetMappingRelative: (mappingId: string, relative: boolean) => void;
  disabled: boolean;
  showRelativeOption?: boolean;
}

function ControlGroup({
  title,
  controls,
  learnMode,
  lastMessage,
  onStartLearn,
  onCancelLearn,
  onRemoveMapping,
  getMappingsForControl,
  onSetMappingRelative,
  disabled,
  showRelativeOption = false,
}: ControlGroupProps) {
  if (controls.length === 0) return null;
  
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground mb-2">{title}</div>
      {controls.map((control) => (
        <MappingRow
          key={control.id}
          controlId={control.id}
          control={control}
          mappings={getMappingsForControl(control.id)}
          isLearning={learnMode === control.id}
          lastMessage={learnMode === control.id ? lastMessage : null}
          onStartLearn={() => onStartLearn(control.id)}
          onCancelLearn={onCancelLearn}
          onRemoveMapping={onRemoveMapping}
          onSetRelative={onSetMappingRelative}
          disabled={disabled}
          showRelativeOption={showRelativeOption}
        />
      ))}
    </div>
  );
}

export function MidiSection({
  isSupported,
  isEnabled,
  devices,
  activeDeviceId,
  lastMessage,
  error,
  onEnable,
  onDisable,
  onSelectDevice,
  learnMode,
  onStartLearn,
  onCancelLearn,
  onRemoveMapping,
  onClearAllMappings,
  getMappingsForControl,
  onSetMappingRelative,
  regionCount,
  midiRotationSensitivity,
  onMidiRotationSensitivityChange,
}: MidiSectionProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Categorize controls into global and per-region
  const { global, perRegion } = useMemo(() => 
    categorizeControls(MAPPABLE_CONTROLS, regionCount),
    [regionCount]
  );
  
  // Count mappings per section (count total number of mappings, not just controls with mappings)
  const globalMappingCount = useMemo(() => {
    let count = 0;
    [...global.parameters, ...global.toggles, ...global.modes, ...global.camera, ...global.allModels, ...global.favorites].forEach(c => {
      count += getMappingsForControl(c.id).length;
    });
    return count;
  }, [global, getMappingsForControl]);
  
  const regionMappingCounts = useMemo(() => {
    const counts: number[] = [];
    for (let i = 0; i < regionCount; i++) {
      const bucket = perRegion.get(i);
      if (!bucket) {
        counts.push(0);
        continue;
      }
      let count = 0;
      [...bucket.visibility, ...bucket.scale, ...bucket.rotation, ...bucket.autoRotate, ...bucket.bounce, ...bucket.favorites].forEach(c => {
        count += getMappingsForControl(c.id).length;
      });
      counts.push(count);
    }
    return counts;
  }, [perRegion, regionCount, getMappingsForControl]);
  
  const hasMappings = globalMappingCount > 0 || regionMappingCounts.some(c => c > 0);
  
  if (!isSupported) {
    return (
      <div className="space-y-3">
        <Label className="text-muted-foreground font-medium flex items-center gap-2">
          <Disc3 className="w-4 h-4" />
          MIDI Control
        </Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 p-3 rounded">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>Web MIDI is not supported in this browser. Try Chrome or Edge.</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground font-medium flex items-center gap-2">
          <Disc3 className="w-4 h-4" />
          MIDI Control
        </Label>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => {
            if (checked) onEnable();
            else onDisable();
          }}
        />
      </div>
      
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}
      
      {isEnabled && (
        <>
          {/* Device Selection */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Device</span>
            <Select
              value={activeDeviceId || 'none'}
              onValueChange={(v) => onSelectDevice(v === 'none' ? null : v)}
            >
              <SelectTrigger className="bg-secondary border-border h-8">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {devices.length === 0 ? (
                  <SelectItem value="none" disabled>No devices found</SelectItem>
                ) : (
                  <>
                    <SelectItem value="none">None</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Last Message Indicator */}
          {lastMessage && (
            <div className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
              Last: {formatMidiMessage(lastMessage)} = {lastMessage.value}
            </div>
          )}
          
          <Separator className="bg-border" />
          
          {/* Mappings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">MIDI Mappings</span>
              {hasMappings && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[300px] pr-2">
              <Accordion type="multiple" defaultValue={["global"]} className="w-full">
                {/* Global Settings */}
                <AccordionItem value="global" className="border-border">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span>Global Settings</span>
                      {globalMappingCount > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {globalMappingCount}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    {/* Platter Sensitivity */}
                    <div className="bg-secondary/30 p-2 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Platter Sensitivity</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {(midiRotationSensitivity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        value={[midiRotationSensitivity]}
                        onValueChange={([v]) => onMidiRotationSensitivityChange(v)}
                        min={0}
                        max={0.1}
                        step={0.005}
                        className="w-full"
                      />
                    </div>
                    
                    <ControlGroup
                      title="Parameters (CC)"
                      controls={global.parameters}
                      learnMode={learnMode}
                      lastMessage={lastMessage}
                      onStartLearn={onStartLearn}
                      onCancelLearn={onCancelLearn}
                      onRemoveMapping={onRemoveMapping}
                      getMappingsForControl={getMappingsForControl}
                      onSetMappingRelative={onSetMappingRelative}
                      disabled={!activeDeviceId}
                    />
                    
                    <ControlGroup
                      title="Toggles (Note)"
                      controls={global.toggles}
                      learnMode={learnMode}
                      lastMessage={lastMessage}
                      onStartLearn={onStartLearn}
                      onCancelLearn={onCancelLearn}
                      onRemoveMapping={onRemoveMapping}
                      getMappingsForControl={getMappingsForControl}
                      onSetMappingRelative={onSetMappingRelative}
                      disabled={!activeDeviceId}
                    />
                    
                    <ControlGroup
                      title="Modes"
                      controls={global.modes}
                      learnMode={learnMode}
                      lastMessage={lastMessage}
                      onStartLearn={onStartLearn}
                      onCancelLearn={onCancelLearn}
                      onRemoveMapping={onRemoveMapping}
                      getMappingsForControl={getMappingsForControl}
                      onSetMappingRelative={onSetMappingRelative}
                      disabled={!activeDeviceId}
                    />
                    
                    <ControlGroup
                      title="Camera"
                      controls={global.camera}
                      learnMode={learnMode}
                      lastMessage={lastMessage}
                      onStartLearn={onStartLearn}
                      onCancelLearn={onCancelLearn}
                      onRemoveMapping={onRemoveMapping}
                      getMappingsForControl={getMappingsForControl}
                      onSetMappingRelative={onSetMappingRelative}
                      disabled={!activeDeviceId}
                      showRelativeOption
                    />
                    
                    <ControlGroup
                      title="All Models"
                      controls={global.allModels}
                      learnMode={learnMode}
                      lastMessage={lastMessage}
                      onStartLearn={onStartLearn}
                      onCancelLearn={onCancelLearn}
                      onRemoveMapping={onRemoveMapping}
                      getMappingsForControl={getMappingsForControl}
                      onSetMappingRelative={onSetMappingRelative}
                      disabled={!activeDeviceId}
                      showRelativeOption
                    />
                    
                    <ControlGroup
                      title="Favorites"
                      controls={global.favorites}
                      learnMode={learnMode}
                      lastMessage={lastMessage}
                      onStartLearn={onStartLearn}
                      onCancelLearn={onCancelLearn}
                      onRemoveMapping={onRemoveMapping}
                      getMappingsForControl={getMappingsForControl}
                      onSetMappingRelative={onSetMappingRelative}
                      disabled={!activeDeviceId}
                    />
                  </AccordionContent>
                </AccordionItem>
                
                {/* Per-Region Sections */}
                {Array.from({ length: regionCount }).map((_, i) => {
                  const bucket = perRegion.get(i);
                  if (!bucket) return null;
                  
                  const allControls = [
                    ...bucket.visibility,
                    ...bucket.scale,
                    ...bucket.rotation,
                    ...bucket.autoRotate,
                    ...bucket.bounce,
                    ...bucket.favorites,
                  ];
                  
                  if (allControls.length === 0) return null;
                  
                  return (
                    <AccordionItem key={i} value={`region-${i}`} className="border-border">
                      <AccordionTrigger className="text-sm py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <span>Region {i + 1}</span>
                          {regionMappingCounts[i] > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0">
                              {regionMappingCounts[i]}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <ControlGroup
                          title="Visibility"
                          controls={bucket.visibility}
                          learnMode={learnMode}
                          lastMessage={lastMessage}
                          onStartLearn={onStartLearn}
                          onCancelLearn={onCancelLearn}
                          onRemoveMapping={onRemoveMapping}
                          getMappingsForControl={getMappingsForControl}
                          onSetMappingRelative={onSetMappingRelative}
                          disabled={!activeDeviceId}
                        />
                        
                        <ControlGroup
                          title="Scale"
                          controls={bucket.scale}
                          learnMode={learnMode}
                          lastMessage={lastMessage}
                          onStartLearn={onStartLearn}
                          onCancelLearn={onCancelLearn}
                          onRemoveMapping={onRemoveMapping}
                          getMappingsForControl={getMappingsForControl}
                          onSetMappingRelative={onSetMappingRelative}
                          disabled={!activeDeviceId}
                        />
                        
                        <ControlGroup
                          title="Rotation"
                          controls={bucket.rotation}
                          learnMode={learnMode}
                          lastMessage={lastMessage}
                          onStartLearn={onStartLearn}
                          onCancelLearn={onCancelLearn}
                          onRemoveMapping={onRemoveMapping}
                          getMappingsForControl={getMappingsForControl}
                          onSetMappingRelative={onSetMappingRelative}
                          disabled={!activeDeviceId}
                          showRelativeOption
                        />
                        
                        <ControlGroup
                          title="Auto-Rotate"
                          controls={bucket.autoRotate}
                          learnMode={learnMode}
                          lastMessage={lastMessage}
                          onStartLearn={onStartLearn}
                          onCancelLearn={onCancelLearn}
                          onRemoveMapping={onRemoveMapping}
                          getMappingsForControl={getMappingsForControl}
                          onSetMappingRelative={onSetMappingRelative}
                          disabled={!activeDeviceId}
                        />
                        
                        <ControlGroup
                          title="Bounce"
                          controls={bucket.bounce}
                          learnMode={learnMode}
                          lastMessage={lastMessage}
                          onStartLearn={onStartLearn}
                          onCancelLearn={onCancelLearn}
                          onRemoveMapping={onRemoveMapping}
                          getMappingsForControl={getMappingsForControl}
                          onSetMappingRelative={onSetMappingRelative}
                          disabled={!activeDeviceId}
                        />
                        
                        <ControlGroup
                          title="Favorites"
                          controls={bucket.favorites}
                          learnMode={learnMode}
                          lastMessage={lastMessage}
                          onStartLearn={onStartLearn}
                          onCancelLearn={onCancelLearn}
                          onRemoveMapping={onRemoveMapping}
                          getMappingsForControl={getMappingsForControl}
                          onSetMappingRelative={onSetMappingRelative}
                          disabled={!activeDeviceId}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </ScrollArea>
          </div>
        </>
      )}
      
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Mappings</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all MIDI mappings. You'll need to re-learn each control.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              onClearAllMappings();
              setShowClearConfirm(false);
            }}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
