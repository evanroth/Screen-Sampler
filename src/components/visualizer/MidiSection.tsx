import React, { useState } from 'react';
import { Disc3, Trash2, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MidiDevice, MidiMessage } from '@/hooks/useMidi';
import { MidiMapping, MAPPABLE_CONTROLS } from '@/hooks/useMidiMappings';
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
  onRemoveMapping: (controlId: string) => void;
  onClearAllMappings: () => void;
  getMappingForControl: (controlId: string) => MidiMapping | undefined;
  onSetMappingRelative: (controlId: string, relative: boolean) => void;
  regionCount: number;
}

function formatMidiMessage(message: MidiMessage): string {
  if (message.type === 'noteon') {
    return `Note ${message.note} (Ch ${message.channel})`;
  } else if (message.type === 'cc') {
    return `CC ${message.cc} (Ch ${message.channel})`;
  }
  return 'Unknown';
}

function MappingRow({ 
  controlId, 
  control, 
  mapping, 
  isLearning, 
  lastMessage,
  onStartLearn, 
  onCancelLearn,
  onRemove,
  onSetRelative,
  disabled,
  showRelativeOption,
}: {
  controlId: string;
  control: typeof MAPPABLE_CONTROLS[number];
  mapping?: MidiMapping;
  isLearning: boolean;
  lastMessage: MidiMessage | null;
  onStartLearn: () => void;
  onCancelLearn: () => void;
  onRemove: () => void;
  onSetRelative?: (relative: boolean) => void;
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
          {mapping ? (
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
          ) : (
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
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartLearn}
                disabled={disabled}
                className="h-6 px-2 text-xs"
              >
                Learn
              </Button>
              {mapping && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemove}
                  disabled={disabled}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Relative checkbox for rotation controls */}
      {showRelativeOption && mapping && (
        <div className="flex items-center gap-2 mt-1 pl-1">
          <Checkbox
            id={`relative-${controlId}`}
            checked={mapping.relative ?? false}
            onCheckedChange={(checked) => onSetRelative?.(checked === true)}
            disabled={disabled}
            className="h-3 w-3"
          />
          <label 
            htmlFor={`relative-${controlId}`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            Relative
          </label>
        </div>
      )}
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
  getMappingForControl,
  onSetMappingRelative,
  regionCount,
}: MidiSectionProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
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
  
  // Filter controls based on region count
  const visibleControls = MAPPABLE_CONTROLS.filter(control => {
    if (control.targetType === 'regionVisibility') {
      const regionIndex = parseInt(control.targetKey, 10);
      return regionIndex < regionCount;
    }
    // Filter per-region settings (scale, bounce, rotation) by region count
    if (control.targetType === 'regionSetting' || control.targetType === 'regionBounce' || control.targetType === 'modelRotation') {
      if (control.targetKey === 'all') return regionCount > 0;
      const regionIndex = parseInt(control.targetKey, 10);
      return regionIndex < regionCount;
    }
    return true;
  });
  
  // Group controls by category
  const parameterControls = visibleControls.filter(c => 
    c.targetType === 'setting' && c.preferredMessageType === 'cc'
  );
  const toggleControls = visibleControls.filter(c => 
    c.targetType === 'setting' && c.preferredMessageType === 'noteon'
  );
  const modeControls = visibleControls.filter(c => c.targetType === 'settingSelect');
  const regionControls = visibleControls.filter(c => c.targetType === 'regionVisibility');
  const modelRotationControls = visibleControls.filter(c => c.targetType === 'modelRotation');
  
  const hasMappings = visibleControls.some(c => getMappingForControl(c.id));

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
              <div className="space-y-4">
                {/* Parameter Sliders */}
                {parameterControls.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Parameters (CC)</div>
                    {parameterControls.map((control) => (
                      <MappingRow
                        key={control.id}
                        controlId={control.id}
                        control={control}
                        mapping={getMappingForControl(control.id)}
                        isLearning={learnMode === control.id}
                        lastMessage={learnMode === control.id ? lastMessage : null}
                        onStartLearn={() => onStartLearn(control.id)}
                        onCancelLearn={onCancelLearn}
                        onRemove={() => onRemoveMapping(control.id)}
                        disabled={!activeDeviceId}
                      />
                    ))}
                  </div>
                )}
                
                {/* Toggles */}
                {toggleControls.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Toggles (Note)</div>
                    {toggleControls.map((control) => (
                      <MappingRow
                        key={control.id}
                        controlId={control.id}
                        control={control}
                        mapping={getMappingForControl(control.id)}
                        isLearning={learnMode === control.id}
                        lastMessage={learnMode === control.id ? lastMessage : null}
                        onStartLearn={() => onStartLearn(control.id)}
                        onCancelLearn={onCancelLearn}
                        onRemove={() => onRemoveMapping(control.id)}
                        disabled={!activeDeviceId}
                      />
                    ))}
                  </div>
                )}
                
                {/* Mode Selectors */}
                {modeControls.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Modes (Note/CC)</div>
                    {modeControls.map((control) => (
                      <MappingRow
                        key={control.id}
                        controlId={control.id}
                        control={control}
                        mapping={getMappingForControl(control.id)}
                        isLearning={learnMode === control.id}
                        lastMessage={learnMode === control.id ? lastMessage : null}
                        onStartLearn={() => onStartLearn(control.id)}
                        onCancelLearn={onCancelLearn}
                        onRemove={() => onRemoveMapping(control.id)}
                        disabled={!activeDeviceId}
                      />
                    ))}
                  </div>
                )}
                
                {/* Model Rotation */}
                {modelRotationControls.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Model Rotation (CC)</div>
                    {modelRotationControls.map((control) => (
                      <MappingRow
                        key={control.id}
                        controlId={control.id}
                        control={control}
                        mapping={getMappingForControl(control.id)}
                        isLearning={learnMode === control.id}
                        lastMessage={learnMode === control.id ? lastMessage : null}
                        onStartLearn={() => onStartLearn(control.id)}
                        onCancelLearn={onCancelLearn}
                        onRemove={() => onRemoveMapping(control.id)}
                        onSetRelative={(relative) => onSetMappingRelative(control.id, relative)}
                        disabled={!activeDeviceId}
                        showRelativeOption={true}
                      />
                    ))}
                  </div>
                )}
                
                {/* Region Visibility */}
                {regionControls.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Regions (Note)</div>
                    {regionControls.map((control) => (
                      <MappingRow
                        key={control.id}
                        controlId={control.id}
                        control={control}
                        mapping={getMappingForControl(control.id)}
                        isLearning={learnMode === control.id}
                        lastMessage={learnMode === control.id ? lastMessage : null}
                        onStartLearn={() => onStartLearn(control.id)}
                        onCancelLearn={onCancelLearn}
                        onRemove={() => onRemoveMapping(control.id)}
                        disabled={!activeDeviceId}
                      />
                    ))}
                  </div>
                )}
              </div>
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
