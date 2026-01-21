import { useState, useCallback, useEffect, useRef } from 'react';
import { MidiMessage } from './useMidi';
import { VisualizerSettings, AnimationMode, AnimationMode3D, ANIMATION_MODES, ANIMATION_MODES_3D } from './useVisualizerSettings';
import { CaptureRegion } from './useScreenCapture';

// Mapping types
export type MidiTargetType = 
  | 'setting' // Global setting slider/toggle
  | 'settingSelect' // Global setting select (animation mode)
  | 'regionVisibility' // Toggle region visibility
  | 'regionSetting' // Per-region slider (scale3D)
  | 'regionBounce' // Trigger single bounce on region
  | 'cameraRotation'; // Horizontal camera rotation

export interface MidiMapping {
  id: string;
  name: string; // Display name
  targetType: MidiTargetType;
  targetKey: string; // Setting key or region index
  subKey?: string; // For nested settings like playMode.interval
  
  // MIDI trigger
  messageType: 'noteon' | 'cc';
  channel: number;
  noteOrCC: number; // Note number or CC number
  
  // Value mapping for CC
  min?: number; // Setting min value
  max?: number; // Setting max value
  step?: number; // Setting step
}

interface StoredMappings {
  mappings: MidiMapping[];
  version: number;
}

const STORAGE_KEY = 'screen-sampler-midi-mappings';
const STORAGE_VERSION = 1;

// Predefined mappable controls
export interface MappableControl {
  id: string;
  name: string;
  targetType: MidiTargetType;
  targetKey: string;
  subKey?: string;
  preferredMessageType: 'noteon' | 'cc';
  min?: number;
  max?: number;
  step?: number;
  selectOptions?: string[]; // For select controls
}

export const MAPPABLE_CONTROLS: MappableControl[] = [
  // Global settings - sliders (CC)
  { id: 'panelScaleX', name: 'Panel Scale X', targetType: 'setting', targetKey: 'panelScaleX', preferredMessageType: 'cc', min: 0.1, max: 2, step: 0.05 },
  { id: 'panelScaleY', name: 'Panel Scale Y', targetType: 'setting', targetKey: 'panelScaleY', preferredMessageType: 'cc', min: 0.1, max: 2, step: 0.05 },
  { id: 'movementSpeed', name: 'Movement Speed', targetType: 'setting', targetKey: 'movementSpeed', preferredMessageType: 'cc', min: 0, max: 2, step: 0.1 },
  { id: 'bounceStrength', name: 'Bounce Strength', targetType: 'setting', targetKey: 'bounceStrength', preferredMessageType: 'cc', min: 0, max: 0.3, step: 0.01 },
  { id: 'trailAmount', name: 'Trail Amount', targetType: 'setting', targetKey: 'trailAmount', preferredMessageType: 'cc', min: 0, max: 1, step: 0.05 },
  { id: 'autoRotateCameraSpeed', name: 'Camera Rotation Speed', targetType: 'setting', targetKey: 'autoRotateCameraSpeed', preferredMessageType: 'cc', min: 0, max: 2, step: 0.1 },
  { id: 'regionSpacing3D', name: 'Region Spacing (3D)', targetType: 'setting', targetKey: 'regionSpacing3D', preferredMessageType: 'cc', min: 0.5, max: 5, step: 0.1 },
  { id: 'randomModeInterval', name: 'Random Mode Interval', targetType: 'setting', targetKey: 'randomModeInterval', preferredMessageType: 'cc', min: 1, max: 60, step: 1 },
  { id: 'playModeInterval', name: 'Play Mode Interval', targetType: 'setting', targetKey: 'playMode', subKey: 'interval', preferredMessageType: 'cc', min: 1, max: 120, step: 1 },
  
  // Camera horizontal rotation (CC - knob controls azimuthal angle)
  { id: 'cameraRotation', name: 'Camera Rotation', targetType: 'cameraRotation', targetKey: 'azimuth', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  
  // Global settings - toggles (Note On)
  { id: 'enableRotation', name: 'Enable Rotation', targetType: 'setting', targetKey: 'enableRotation', preferredMessageType: 'noteon' },
  { id: 'enableTrails', name: 'Enable Trails', targetType: 'setting', targetKey: 'enableTrails', preferredMessageType: 'noteon' },
  { id: 'autoRotateCamera', name: 'Auto Rotate Camera', targetType: 'setting', targetKey: 'autoRotateCamera', preferredMessageType: 'noteon' },
  { id: 'playModeEnabled', name: 'Play Mode', targetType: 'setting', targetKey: 'playMode', subKey: 'enabled', preferredMessageType: 'noteon' },
  
  // Animation mode selects (Note On cycles through)
  { id: 'animationMode', name: '2D Animation Mode', targetType: 'settingSelect', targetKey: 'animationMode', preferredMessageType: 'noteon', selectOptions: ANIMATION_MODES as unknown as string[] },
  { id: 'animationMode3D', name: '3D Animation Mode', targetType: 'settingSelect', targetKey: 'animationMode3D', preferredMessageType: 'noteon', selectOptions: ANIMATION_MODES_3D as unknown as string[] },
  
  // Visualizer mode toggle
  { id: 'visualizerMode', name: 'Toggle 2D/3D Mode', targetType: 'settingSelect', targetKey: 'visualizerMode', preferredMessageType: 'noteon', selectOptions: ['2d', '3d'] },
  
  // Per-region scale controls (CC - faders control individual region scale)
  { id: 'region1Scale', name: 'Region 1 Scale', targetType: 'regionSetting', targetKey: '0', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region2Scale', name: 'Region 2 Scale', targetType: 'regionSetting', targetKey: '1', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region3Scale', name: 'Region 3 Scale', targetType: 'regionSetting', targetKey: '2', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region4Scale', name: 'Region 4 Scale', targetType: 'regionSetting', targetKey: '3', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region5Scale', name: 'Region 5 Scale', targetType: 'regionSetting', targetKey: '4', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region6Scale', name: 'Region 6 Scale', targetType: 'regionSetting', targetKey: '5', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region7Scale', name: 'Region 7 Scale', targetType: 'regionSetting', targetKey: '6', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region8Scale', name: 'Region 8 Scale', targetType: 'regionSetting', targetKey: '7', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  { id: 'region9Scale', name: 'Region 9 Scale', targetType: 'regionSetting', targetKey: '8', subKey: 'scale3D', preferredMessageType: 'cc', min: 0.1, max: 3, step: 0.05 },
  
  // Per-region bounce triggers (Note On - triggers single bounce animation)
  { id: 'region1Bounce', name: 'Region 1 Bounce', targetType: 'regionBounce', targetKey: '0', preferredMessageType: 'noteon' },
  { id: 'region2Bounce', name: 'Region 2 Bounce', targetType: 'regionBounce', targetKey: '1', preferredMessageType: 'noteon' },
  { id: 'region3Bounce', name: 'Region 3 Bounce', targetType: 'regionBounce', targetKey: '2', preferredMessageType: 'noteon' },
  { id: 'region4Bounce', name: 'Region 4 Bounce', targetType: 'regionBounce', targetKey: '3', preferredMessageType: 'noteon' },
  { id: 'region5Bounce', name: 'Region 5 Bounce', targetType: 'regionBounce', targetKey: '4', preferredMessageType: 'noteon' },
  { id: 'region6Bounce', name: 'Region 6 Bounce', targetType: 'regionBounce', targetKey: '5', preferredMessageType: 'noteon' },
  { id: 'region7Bounce', name: 'Region 7 Bounce', targetType: 'regionBounce', targetKey: '6', preferredMessageType: 'noteon' },
  { id: 'region8Bounce', name: 'Region 8 Bounce', targetType: 'regionBounce', targetKey: '7', preferredMessageType: 'noteon' },
  { id: 'region9Bounce', name: 'Region 9 Bounce', targetType: 'regionBounce', targetKey: '8', preferredMessageType: 'noteon' },
  { id: 'allRegionsBounce', name: 'All Regions Bounce', targetType: 'regionBounce', targetKey: 'all', preferredMessageType: 'noteon' },
  
  // Region visibility (dynamic - generated based on region count)
  { id: 'region1', name: 'Region 1 Visibility', targetType: 'regionVisibility', targetKey: '0', preferredMessageType: 'noteon' },
  { id: 'region2', name: 'Region 2 Visibility', targetType: 'regionVisibility', targetKey: '1', preferredMessageType: 'noteon' },
  { id: 'region3', name: 'Region 3 Visibility', targetType: 'regionVisibility', targetKey: '2', preferredMessageType: 'noteon' },
  { id: 'region4', name: 'Region 4 Visibility', targetType: 'regionVisibility', targetKey: '3', preferredMessageType: 'noteon' },
  { id: 'region5', name: 'Region 5 Visibility', targetType: 'regionVisibility', targetKey: '4', preferredMessageType: 'noteon' },
  { id: 'region6', name: 'Region 6 Visibility', targetType: 'regionVisibility', targetKey: '5', preferredMessageType: 'noteon' },
  { id: 'region7', name: 'Region 7 Visibility', targetType: 'regionVisibility', targetKey: '6', preferredMessageType: 'noteon' },
  { id: 'region8', name: 'Region 8 Visibility', targetType: 'regionVisibility', targetKey: '7', preferredMessageType: 'noteon' },
  { id: 'region9', name: 'Region 9 Visibility', targetType: 'regionVisibility', targetKey: '8', preferredMessageType: 'noteon' },
];

interface UseMidiMappingsOptions {
  settings: VisualizerSettings;
  regions: CaptureRegion[];
  onUpdateSetting: <K extends keyof VisualizerSettings>(key: K, value: VisualizerSettings[K]) => void;
  onUpdateRegion: (regionId: string, updates: Partial<CaptureRegion>) => void;
  onCameraRotation?: (angle: number) => void; // Set camera azimuthal angle
  onTriggerBounce?: (regionIndex: number | 'all') => void; // Trigger bounce animation
}

export function useMidiMappings({
  settings,
  regions,
  onUpdateSetting,
  onUpdateRegion,
  onCameraRotation,
  onTriggerBounce,
}: UseMidiMappingsOptions) {
  const [mappings, setMappings] = useState<MidiMapping[]>([]);
  const [learnMode, setLearnMode] = useState<string | null>(null); // Control ID being learned
  const [lastLearnedMessage, setLastLearnedMessage] = useState<MidiMessage | null>(null);
  
  const settingsRef = useRef(settings);
  const regionsRef = useRef(regions);
  
  // Keep refs updated
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  // Load mappings from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: StoredMappings = JSON.parse(stored);
        if (data.version === STORAGE_VERSION) {
          setMappings(data.mappings);
        }
      }
    } catch (err) {
      console.error('Failed to load MIDI mappings:', err);
    }
  }, []);

  // Save mappings to localStorage
  const saveMappings = useCallback((newMappings: MidiMapping[]) => {
    setMappings(newMappings);
    try {
      const data: StoredMappings = {
        mappings: newMappings,
        version: STORAGE_VERSION,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save MIDI mappings:', err);
    }
  }, []);

  // Start learning a control
  const startLearn = useCallback((controlId: string) => {
    setLearnMode(controlId);
    setLastLearnedMessage(null);
  }, []);

  // Cancel learning
  const cancelLearn = useCallback(() => {
    setLearnMode(null);
    setLastLearnedMessage(null);
  }, []);

  // Complete learning with a MIDI message
  const completeLearn = useCallback((message: MidiMessage) => {
    if (!learnMode) return;
    
    const control = MAPPABLE_CONTROLS.find(c => c.id === learnMode);
    if (!control) {
      cancelLearn();
      return;
    }
    
    // Only accept Note On or CC for learning
    if (message.type !== 'noteon' && message.type !== 'cc') {
      return;
    }
    
    // Create new mapping
    const newMapping: MidiMapping = {
      id: crypto.randomUUID(),
      name: control.name,
      targetType: control.targetType,
      targetKey: control.targetKey,
      subKey: control.subKey,
      messageType: message.type,
      channel: message.channel,
      noteOrCC: message.type === 'cc' ? message.cc! : message.note!,
      min: control.min,
      max: control.max,
      step: control.step,
    };
    
    // Remove any existing mapping for this control
    const filtered = mappings.filter(m => 
      !(m.targetType === control.targetType && 
        m.targetKey === control.targetKey && 
        m.subKey === control.subKey)
    );
    
    saveMappings([...filtered, newMapping]);
    setLastLearnedMessage(message);
    setLearnMode(null);
  }, [learnMode, mappings, saveMappings, cancelLearn]);

  // Remove a mapping
  const removeMapping = useCallback((controlId: string) => {
    const control = MAPPABLE_CONTROLS.find(c => c.id === controlId);
    if (!control) return;
    
    const filtered = mappings.filter(m => 
      !(m.targetType === control.targetType && 
        m.targetKey === control.targetKey && 
        m.subKey === control.subKey)
    );
    saveMappings(filtered);
  }, [mappings, saveMappings]);

  // Clear all mappings
  const clearAllMappings = useCallback(() => {
    saveMappings([]);
  }, [saveMappings]);

  // Get mapping for a control
  const getMappingForControl = useCallback((controlId: string): MidiMapping | undefined => {
    const control = MAPPABLE_CONTROLS.find(c => c.id === controlId);
    if (!control) return undefined;
    
    return mappings.find(m => 
      m.targetType === control.targetType && 
      m.targetKey === control.targetKey && 
      m.subKey === control.subKey
    );
  }, [mappings]);

  // Handle incoming MIDI message
  const handleMidiMessage = useCallback((message: MidiMessage) => {
    // If in learn mode, complete the learning
    if (learnMode && (message.type === 'noteon' || message.type === 'cc')) {
      completeLearn(message);
      return;
    }
    
    // Find matching mapping
    const mapping = mappings.find(m => {
      if (m.channel !== message.channel) return false;
      if (m.messageType === 'noteon' && message.type === 'noteon') {
        return m.noteOrCC === message.note;
      }
      if (m.messageType === 'cc' && message.type === 'cc') {
        return m.noteOrCC === message.cc;
      }
      return false;
    });
    
    if (!mapping) return;
    
    const currentSettings = settingsRef.current;
    const currentRegions = regionsRef.current;
    
    // Apply the mapping
    switch (mapping.targetType) {
      case 'setting': {
        if (mapping.messageType === 'noteon') {
          // Toggle boolean settings
          if (mapping.subKey) {
            const parent = currentSettings[mapping.targetKey as keyof VisualizerSettings];
            if (typeof parent === 'object' && parent !== null) {
              const parentObj = parent as unknown as Record<string, unknown>;
              const currentValue = parentObj[mapping.subKey];
              if (typeof currentValue === 'boolean') {
                const updated = { ...parentObj, [mapping.subKey]: !currentValue };
                onUpdateSetting(
                  mapping.targetKey as keyof VisualizerSettings, 
                  updated as unknown as VisualizerSettings[keyof VisualizerSettings]
                );
              }
            }
          } else {
            const currentValue = currentSettings[mapping.targetKey as keyof VisualizerSettings];
            if (typeof currentValue === 'boolean') {
              onUpdateSetting(mapping.targetKey as keyof VisualizerSettings, !currentValue as VisualizerSettings[keyof VisualizerSettings]);
            }
          }
        } else if (mapping.messageType === 'cc' && mapping.min !== undefined && mapping.max !== undefined) {
          // Map CC value (0-127) to setting range
          const normalizedValue = message.value / 127;
          let newValue = mapping.min + normalizedValue * (mapping.max - mapping.min);
          
          // Apply step if defined
          if (mapping.step) {
            newValue = Math.round(newValue / mapping.step) * mapping.step;
          }
          
          if (mapping.subKey) {
            const parent = currentSettings[mapping.targetKey as keyof VisualizerSettings];
            if (typeof parent === 'object' && parent !== null) {
              const parentObj = parent as unknown as Record<string, unknown>;
              const updated = { ...parentObj, [mapping.subKey]: newValue };
              onUpdateSetting(
                mapping.targetKey as keyof VisualizerSettings, 
                updated as unknown as VisualizerSettings[keyof VisualizerSettings]
              );
            }
          } else {
            onUpdateSetting(mapping.targetKey as keyof VisualizerSettings, newValue as VisualizerSettings[keyof VisualizerSettings]);
          }
        }
        break;
      }
      
      case 'settingSelect': {
        const control = MAPPABLE_CONTROLS.find(c => c.targetKey === mapping.targetKey);
        if (!control?.selectOptions) break;
        
        if (mapping.messageType === 'noteon') {
          // Cycle through options
          const currentValue = currentSettings[mapping.targetKey as keyof VisualizerSettings] as string;
          const currentIndex = control.selectOptions.indexOf(currentValue);
          const nextIndex = (currentIndex + 1) % control.selectOptions.length;
          onUpdateSetting(mapping.targetKey as keyof VisualizerSettings, control.selectOptions[nextIndex] as VisualizerSettings[keyof VisualizerSettings]);
        } else if (mapping.messageType === 'cc') {
          // Map CC value to option index
          const index = Math.floor((message.value / 127) * control.selectOptions.length);
          const clampedIndex = Math.min(index, control.selectOptions.length - 1);
          onUpdateSetting(mapping.targetKey as keyof VisualizerSettings, control.selectOptions[clampedIndex] as VisualizerSettings[keyof VisualizerSettings]);
        }
        break;
      }
      
      case 'regionVisibility': {
        const regionIndex = parseInt(mapping.targetKey, 10);
        const region = currentRegions[regionIndex];
        if (region) {
          const currentVisible = region.visible ?? true;
          onUpdateRegion(region.id, { visible: !currentVisible });
        }
        break;
      }
      
      case 'regionSetting': {
        // Per-region CC control (e.g., scale3D)
        if (mapping.messageType === 'cc' && mapping.min !== undefined && mapping.max !== undefined) {
          const regionIndex = parseInt(mapping.targetKey, 10);
          const region = currentRegions[regionIndex];
          if (region && mapping.subKey) {
            const normalizedValue = message.value / 127;
            let newValue = mapping.min + normalizedValue * (mapping.max - mapping.min);
            if (mapping.step) {
              newValue = Math.round(newValue / mapping.step) * mapping.step;
            }
            onUpdateRegion(region.id, { [mapping.subKey]: newValue });
          }
        }
        break;
      }
      
      case 'regionBounce': {
        // Trigger single bounce animation
        if (onTriggerBounce) {
          if (mapping.targetKey === 'all') {
            onTriggerBounce('all');
          } else {
            const regionIndex = parseInt(mapping.targetKey, 10);
            onTriggerBounce(regionIndex);
          }
        }
        break;
      }
      
      case 'cameraRotation': {
        // Control camera horizontal rotation via CC
        if (mapping.messageType === 'cc' && onCameraRotation && mapping.min !== undefined && mapping.max !== undefined) {
          const normalizedValue = message.value / 127;
          const angle = mapping.min + normalizedValue * (mapping.max - mapping.min);
          onCameraRotation(angle);
        }
        break;
      }
    }
  }, [learnMode, mappings, completeLearn, onUpdateSetting, onUpdateRegion, onCameraRotation, onTriggerBounce]);

  return {
    mappings,
    learnMode,
    lastLearnedMessage,
    startLearn,
    cancelLearn,
    removeMapping,
    clearAllMappings,
    getMappingForControl,
    handleMidiMessage,
  };
}
