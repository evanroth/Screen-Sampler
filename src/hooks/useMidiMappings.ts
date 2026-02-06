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
  | 'cameraRotation' // Horizontal camera rotation
  | 'modelRotation' // Per-region model Y rotation (like horizontal mouse drag)
  | 'favoriteNavigation' // Jump to next/previous favorite model (global)
  | 'regionFavoriteNavigation' // Jump to next/previous favorite model (per-region)
  | 'crossfade' // Crossfade between Region 1 and Region 2 scales
  | 'action'; // Trigger an action (like randomize gradient)

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
  
  // Relative mode for rotation controls
  relative?: boolean; // If true, MIDI values are treated as incremental
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
  { id: 'panelScaleX', name: 'Object Scale', targetType: 'setting', targetKey: 'panelScaleX', preferredMessageType: 'cc', min: 0.1, max: 2, step: 0.05 },
  { id: 'movementSpeed', name: 'Movement Speed', targetType: 'setting', targetKey: 'movementSpeed', preferredMessageType: 'cc', min: 0, max: 2, step: 0.1 },
  { id: 'bounceStrength', name: 'Bounce Strength', targetType: 'setting', targetKey: 'bounceStrength', preferredMessageType: 'cc', min: 0, max: 0.3, step: 0.01 },
  { id: 'trailAmount', name: 'Trail Amount', targetType: 'setting', targetKey: 'trailAmount', preferredMessageType: 'cc', min: 0, max: 1, step: 0.05 },
  { id: 'autoRotateCameraSpeed', name: 'Camera Rotation Speed', targetType: 'setting', targetKey: 'autoRotateCameraSpeed', preferredMessageType: 'cc', min: 0, max: 2, step: 0.1 },
  { id: 'regionSpacing3D', name: 'Region Spacing (3D)', targetType: 'setting', targetKey: 'regionSpacing3D', preferredMessageType: 'cc', min: 0.5, max: 5, step: 0.1 },
  { id: 'randomModeInterval', name: 'Random Mode Interval', targetType: 'setting', targetKey: 'randomModeInterval', preferredMessageType: 'cc', min: 1, max: 60, step: 1 },
  { id: 'playModeInterval', name: 'Play Mode Interval', targetType: 'setting', targetKey: 'playMode', subKey: 'interval', preferredMessageType: 'cc', min: 1, max: 120, step: 1 },
  
  // Crossfade between Region 1 and Region 2 (CC)
  { id: 'crossfade12', name: 'Crossfade 1 and 2', targetType: 'crossfade', targetKey: '0-1', preferredMessageType: 'cc', min: 0, max: 127 },
  
  // Camera horizontal rotation (CC - knob controls azimuthal angle)
  { id: 'cameraRotation', name: 'Camera Rotation', targetType: 'cameraRotation', targetKey: 'azimuth', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  
  // Per-region model rotation (CC - knob controls model Y rotation, like horizontal mouse drag)
  { id: 'region1Rotation', name: 'Rotate Model 1', targetType: 'modelRotation', targetKey: '0', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region2Rotation', name: 'Rotate Model 2', targetType: 'modelRotation', targetKey: '1', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region3Rotation', name: 'Rotate Model 3', targetType: 'modelRotation', targetKey: '2', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region4Rotation', name: 'Rotate Model 4', targetType: 'modelRotation', targetKey: '3', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region5Rotation', name: 'Rotate Model 5', targetType: 'modelRotation', targetKey: '4', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region6Rotation', name: 'Rotate Model 6', targetType: 'modelRotation', targetKey: '5', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region7Rotation', name: 'Rotate Model 7', targetType: 'modelRotation', targetKey: '6', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region8Rotation', name: 'Rotate Model 8', targetType: 'modelRotation', targetKey: '7', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'region9Rotation', name: 'Rotate Model 9', targetType: 'modelRotation', targetKey: '8', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  { id: 'allModelsRotation', name: 'Rotate All Models', targetType: 'modelRotation', targetKey: 'all', preferredMessageType: 'cc', min: -Math.PI, max: Math.PI },
  
  // Global settings - toggles (Note On)
  { id: 'enableRotation', name: 'Enable Rotation', targetType: 'setting', targetKey: 'enableRotation', preferredMessageType: 'noteon' },
  { id: 'enableTrails', name: 'Enable Trails', targetType: 'setting', targetKey: 'enableTrails', preferredMessageType: 'noteon' },
  { id: 'autoRotateCamera', name: 'Auto Rotate Camera', targetType: 'setting', targetKey: 'autoRotateCamera', preferredMessageType: 'noteon' },
  { id: 'individualRotation', name: 'Individual Rotation', targetType: 'setting', targetKey: 'individualRotation', preferredMessageType: 'noteon' },
  { id: 'playModeEnabled', name: 'Play Mode', targetType: 'setting', targetKey: 'playMode', subKey: 'enabled', preferredMessageType: 'noteon' },
  { id: 'randomizeGradient', name: 'Randomize Gradient', targetType: 'action', targetKey: 'randomizeGradient', preferredMessageType: 'noteon' },
  
  // Per-region auto-rotate toggles (Note On - for individual rotation mode)
  { id: 'region1AutoRotate', name: 'Auto-Rotate Region 1', targetType: 'regionSetting', targetKey: '0', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region2AutoRotate', name: 'Auto-Rotate Region 2', targetType: 'regionSetting', targetKey: '1', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region3AutoRotate', name: 'Auto-Rotate Region 3', targetType: 'regionSetting', targetKey: '2', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region4AutoRotate', name: 'Auto-Rotate Region 4', targetType: 'regionSetting', targetKey: '3', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region5AutoRotate', name: 'Auto-Rotate Region 5', targetType: 'regionSetting', targetKey: '4', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region6AutoRotate', name: 'Auto-Rotate Region 6', targetType: 'regionSetting', targetKey: '5', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region7AutoRotate', name: 'Auto-Rotate Region 7', targetType: 'regionSetting', targetKey: '6', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region8AutoRotate', name: 'Auto-Rotate Region 8', targetType: 'regionSetting', targetKey: '7', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  { id: 'region9AutoRotate', name: 'Auto-Rotate Region 9', targetType: 'regionSetting', targetKey: '8', subKey: 'autoRotate3D', preferredMessageType: 'noteon' },
  
  // Animation mode selects (Note On cycles through)
  { id: 'animationMode', name: '2D Animation Mode', targetType: 'settingSelect', targetKey: 'animationMode', preferredMessageType: 'noteon', selectOptions: ANIMATION_MODES as unknown as string[] },
  { id: 'animationMode3D', name: '3D Animation Mode', targetType: 'settingSelect', targetKey: 'animationMode3D', preferredMessageType: 'noteon', selectOptions: ANIMATION_MODES_3D as unknown as string[] },
  
  // Visualizer mode toggle
  { id: 'visualizerMode', name: 'Toggle 2D/3D Mode', targetType: 'settingSelect', targetKey: 'visualizerMode', preferredMessageType: 'noteon', selectOptions: ['2d', '3d'] },
  
  // Per-region scale controls (CC - faders control individual region scale, 0-100%)
  { id: 'region1Scale', name: 'Region 1 Scale', targetType: 'regionSetting', targetKey: '0', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region2Scale', name: 'Region 2 Scale', targetType: 'regionSetting', targetKey: '1', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region3Scale', name: 'Region 3 Scale', targetType: 'regionSetting', targetKey: '2', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region4Scale', name: 'Region 4 Scale', targetType: 'regionSetting', targetKey: '3', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region5Scale', name: 'Region 5 Scale', targetType: 'regionSetting', targetKey: '4', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region6Scale', name: 'Region 6 Scale', targetType: 'regionSetting', targetKey: '5', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region7Scale', name: 'Region 7 Scale', targetType: 'regionSetting', targetKey: '6', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region8Scale', name: 'Region 8 Scale', targetType: 'regionSetting', targetKey: '7', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  { id: 'region9Scale', name: 'Region 9 Scale', targetType: 'regionSetting', targetKey: '8', subKey: 'scale3D', preferredMessageType: 'cc', min: 0, max: 1, step: 0.01 },
  
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
  
  // Favorite navigation - global (Note On - triggers jump to next/previous favorite for all regions)
  { id: 'jumpToNextFavorite', name: 'Jump to Next Favorite', targetType: 'favoriteNavigation', targetKey: 'next', preferredMessageType: 'noteon' },
  { id: 'jumpToPreviousFavorite', name: 'Jump to Previous Favorite', targetType: 'favoriteNavigation', targetKey: 'previous', preferredMessageType: 'noteon' },
  
  // Favorite navigation - per region (Note On - triggers jump to next/previous favorite for specific region)
  { id: 'region1NextFavorite', name: 'Region 1 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '0', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region1PrevFavorite', name: 'Region 1 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '0', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region2NextFavorite', name: 'Region 2 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '1', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region2PrevFavorite', name: 'Region 2 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '1', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region3NextFavorite', name: 'Region 3 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '2', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region3PrevFavorite', name: 'Region 3 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '2', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region4NextFavorite', name: 'Region 4 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '3', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region4PrevFavorite', name: 'Region 4 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '3', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region5NextFavorite', name: 'Region 5 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '4', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region5PrevFavorite', name: 'Region 5 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '4', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region6NextFavorite', name: 'Region 6 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '5', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region6PrevFavorite', name: 'Region 6 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '5', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region7NextFavorite', name: 'Region 7 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '6', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region7PrevFavorite', name: 'Region 7 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '6', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region8NextFavorite', name: 'Region 8 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '7', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region8PrevFavorite', name: 'Region 8 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '7', subKey: 'previous', preferredMessageType: 'noteon' },
  { id: 'region9NextFavorite', name: 'Region 9 Next Favorite', targetType: 'regionFavoriteNavigation', targetKey: '8', subKey: 'next', preferredMessageType: 'noteon' },
  { id: 'region9PrevFavorite', name: 'Region 9 Prev Favorite', targetType: 'regionFavoriteNavigation', targetKey: '8', subKey: 'previous', preferredMessageType: 'noteon' },
  
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
  onJumpToFavorite?: (direction: 'next' | 'previous', regionIndex?: number) => void; // Jump to next/previous favorite (global or per-region)
  onRandomizeGradient?: () => void; // Trigger gradient randomization
}

export function useMidiMappings({
  settings,
  regions,
  onUpdateSetting,
  onUpdateRegion,
  onCameraRotation,
  onTriggerBounce,
  onJumpToFavorite,
  onRandomizeGradient,
}: UseMidiMappingsOptions) {
  const [mappings, setMappings] = useState<MidiMapping[]>([]);
  const [learnMode, setLearnMode] = useState<string | null>(null); // Control ID being learned
  const [lastLearnedMessage, setLastLearnedMessage] = useState<MidiMessage | null>(null);
  
  // Refs to avoid stale closures in MIDI message handler.
  // Without these, rapidly arriving MIDI messages after a learn-complete can miss
  // the newly added mapping because the callback still closes over the old state.
  const mappingsRef = useRef(mappings);
  const learnModeRef = useRef(learnMode);
  
  // Track cumulative rotation for relative mode (keyed by region index or 'all')
  const cumulativeRotationRef = useRef<Record<string, number>>({});
  // Track last CC value for relative mode delta calculation
  const lastCCValueRef = useRef<Record<string, number>>({});
  
  // Track auto-rotate camera state for MIDI rotation override
  const autoRotateWasEnabledRef = useRef<boolean | null>(null); // null = not overriding
  const midiRotationTimeoutRef = useRef<number | null>(null);
  const MIDI_ROTATION_TIMEOUT = 150; // ms to wait before restoring auto-rotate

  // Track per-region auto-rotate state while MIDI model rotation is active.
  // Requirement: when Rotate Model X is receiving MIDI, temporarily toggle Auto-Rotate Region X off;
  // when MIDI stops, restore the previous value.
  const regionAutoRotateOverrideRef = useRef(
    new Map<string, { prevAutoRotate3D: boolean | undefined }>()
  );
  const regionAutoRotateTimeoutRef = useRef(new Map<string, number>());
  
  const settingsRef = useRef(settings);
  const regionsRef = useRef(regions);
  
  // Keep refs updated synchronously with state
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);
  
  useEffect(() => {
    mappingsRef.current = mappings;
  }, [mappings]);
  
  useEffect(() => {
    learnModeRef.current = learnMode;
  }, [learnMode]);

  const beginTemporaryRegionAutoRotateDisable = useCallback(
    (region: CaptureRegion) => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.individualRotation) return;

      // Store previous value (including undefined) once per active MIDI-rotation session.
      if (!regionAutoRotateOverrideRef.current.has(region.id)) {
        regionAutoRotateOverrideRef.current.set(region.id, {
          prevAutoRotate3D: region.autoRotate3D,
        });

        // If region was effectively auto-rotating (true or undefined), disable it.
        if (region.autoRotate3D !== false) {
          onUpdateRegion(region.id, { autoRotate3D: false });
        }
      }

      // Debounced restore for this region.
      const existingTimeout = regionAutoRotateTimeoutRef.current.get(region.id);
      if (existingTimeout !== undefined) {
        window.clearTimeout(existingTimeout);
      }

      const timeoutId = window.setTimeout(() => {
        const saved = regionAutoRotateOverrideRef.current.get(region.id);
        if (saved) {
          // Restore the *exact* previous value (including undefined).
          onUpdateRegion(region.id, {
            autoRotate3D: saved.prevAutoRotate3D,
            // Release MIDI override so auto-rotate can take over again.
            midiRotationY: undefined,
          });
        }

        regionAutoRotateOverrideRef.current.delete(region.id);
        regionAutoRotateTimeoutRef.current.delete(region.id);
      }, MIDI_ROTATION_TIMEOUT);

      regionAutoRotateTimeoutRef.current.set(region.id, timeoutId);
    },
    [onUpdateRegion]
  );

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
    // Sync ref immediately so MIDI messages arriving before next render see updated mappings
    mappingsRef.current = newMappings;
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
    learnModeRef.current = controlId;
    setLastLearnedMessage(null);
  }, []);

  // Cancel learning
  const cancelLearn = useCallback(() => {
    setLearnMode(null);
    learnModeRef.current = null;
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
    
    // Check if this exact MIDI signal is already mapped to this control
    const alreadyMapped = mappings.some(m => 
      m.targetType === control.targetType &&
      m.targetKey === control.targetKey &&
      m.subKey === control.subKey &&
      m.messageType === message.type &&
      m.channel === message.channel &&
      m.noteOrCC === (message.type === 'cc' ? message.cc! : message.note!)
    );
    
    if (alreadyMapped) {
      // Don't add duplicate, just close learn mode
      setLastLearnedMessage(message);
      setLearnMode(null);
      learnModeRef.current = null;
      return;
    }
    
    // Create new mapping (allow multiple mappings per control)
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
      // Most endless encoders / DJ platters send values around 64 (relative)
      // so rotation controls should default to relative mode.
      relative: control.targetType === 'modelRotation' ? true : undefined,
    };
    
    // Add new mapping without removing existing ones (supports multiple inputs per control)
    saveMappings([...mappings, newMapping]);
    setLastLearnedMessage(message);
    setLearnMode(null);
    learnModeRef.current = null;
  }, [learnMode, mappings, saveMappings, cancelLearn]);

  // Remove a specific mapping by its ID
  const removeMapping = useCallback((mappingId: string) => {
    const filtered = mappings.filter(m => m.id !== mappingId);
    saveMappings(filtered);
  }, [mappings, saveMappings]);

  // Remove all mappings for a control
  const removeAllMappingsForControl = useCallback((controlId: string) => {
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
    // Reset cumulative rotation tracking
    cumulativeRotationRef.current = {};
    lastCCValueRef.current = {};
  }, [saveMappings]);

  // Update a mapping's relative flag (by mapping ID)
  const setMappingRelative = useCallback((mappingId: string, relative: boolean) => {
    const mapping = mappings.find(m => m.id === mappingId);
    if (!mapping) return;
    
    const updatedMappings = mappings.map(m => {
      if (m.id === mappingId) {
        return { ...m, relative };
      }
      return m;
    });
    
    // Reset cumulative tracking for this control when toggling relative mode
    if (relative) {
      if (mapping.targetKey === 'all') {
        // Reset all region rotations
        cumulativeRotationRef.current = {};
      } else {
        cumulativeRotationRef.current[mapping.targetKey] = 0;
      }
      lastCCValueRef.current[mapping.targetKey] = 64; // Reset to center
    }
    
    saveMappings(updatedMappings);
  }, [mappings, saveMappings]);

  // Get all mappings for a control (supports multiple MIDI inputs)
  const getMappingsForControl = useCallback((controlId: string): MidiMapping[] => {
    const control = MAPPABLE_CONTROLS.find(c => c.id === controlId);
    if (!control) return [];
    
    return mappings.filter(m => 
      m.targetType === control.targetType && 
      m.targetKey === control.targetKey && 
      m.subKey === control.subKey
    );
  }, [mappings]);

  // Legacy: Get first mapping for a control (for backward compatibility)
  const getMappingForControl = useCallback((controlId: string): MidiMapping | undefined => {
    return getMappingsForControl(controlId)[0];
  }, [getMappingsForControl]);

  // Handle incoming MIDI message
  const handleMidiMessage = useCallback((message: MidiMessage) => {
    // Use refs to avoid stale closures - MIDI messages can arrive between
    // React renders, so state values in the closure may be outdated.
    const currentLearnMode = learnModeRef.current;
    const currentMappings = mappingsRef.current;
    
    // If in learn mode, complete the learning
    if (currentLearnMode && (message.type === 'noteon' || message.type === 'cc')) {
      completeLearn(message);
      return;
    }
    
    // Find ALL matching mappings.
    // (Important: multiple controls can intentionally share the same CC/Note;
    // previously we only applied the first match, which made other mappings appear “broken”.)
    const matchingMappings = currentMappings.filter(m => {
      if (m.channel !== message.channel) return false;
      if (m.messageType === 'noteon' && message.type === 'noteon') {
        return m.noteOrCC === message.note;
      }
      if (m.messageType === 'cc' && message.type === 'cc') {
        return m.noteOrCC === message.cc;
      }
      return false;
    });
    
    if (matchingMappings.length === 0) return;
    
    // Helpful debug signal for diagnosing “this control does nothing” reports.
    if (matchingMappings.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        `[MIDI] ${message.type.toUpperCase()} ${message.type === 'cc' ? message.cc : message.note} on Ch ${message.channel} matched ${matchingMappings.length} mappings. Applying all.`
      );
    }
    
    const currentSettings = settingsRef.current;
    const currentRegions = regionsRef.current;
    
    for (const mapping of matchingMappings) {
      // Look up the current control definition to use its min/max values.
      // This ensures that if control limits are updated, existing mappings use the new limits.
      const control = MAPPABLE_CONTROLS.find(c => 
        c.targetType === mapping.targetType && 
        c.targetKey === mapping.targetKey && 
        c.subKey === mapping.subKey
      );
      
      // Use control definition's min/max if available, otherwise fall back to stored mapping values.
      const effectiveMin = control?.min ?? mapping.min;
      const effectiveMax = control?.max ?? mapping.max;
      const effectiveStep = control?.step ?? mapping.step;
      
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
        } else if (mapping.messageType === 'cc' && effectiveMin !== undefined && effectiveMax !== undefined) {
          // Map CC value (0-127) to setting range
          const normalizedValue = message.value / 127;
          let newValue = effectiveMin + normalizedValue * (effectiveMax - effectiveMin);
          
          // Apply step if defined
          if (effectiveStep) {
            newValue = Math.round(newValue / effectiveStep) * effectiveStep;
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
        const regionIndex = parseInt(mapping.targetKey, 10);
        const region = currentRegions[regionIndex];
        if (!region || !mapping.subKey) break;
        
        if (mapping.messageType === 'noteon') {
          // Toggle boolean region settings (e.g., autoRotate3D)
          const currentValue = region[mapping.subKey as keyof CaptureRegion];
          if (typeof currentValue === 'boolean' || currentValue === undefined) {
            // Default to true for undefined booleans like autoRotate3D
            const newValue = currentValue === undefined ? false : !currentValue;
            onUpdateRegion(region.id, { [mapping.subKey]: newValue });
            
            // If enabling auto-rotate for a region, also ensure individual rotation mode is enabled
            // (but do NOT automatically toggle autoRotateCamera - that should remain independent)
            if (mapping.subKey === 'autoRotate3D' && newValue === true) {
              if (!currentSettings.individualRotation) {
                onUpdateSetting('individualRotation', true);
              }
            }
          }
        } else if (mapping.messageType === 'cc' && effectiveMin !== undefined && effectiveMax !== undefined) {
          // Per-region CC control (e.g., Region X Scale)
          // IMPORTANT: MIDI should NOT overwrite the user's Scale slider value.
          // We treat the UI `scale3D` as the per-region *max*, and MIDI writes a 0..1 factor.
          const normalizedValue = message.value / 127;
          let newValue = effectiveMin + normalizedValue * (effectiveMax - effectiveMin);
          if (effectiveStep) {
            newValue = Math.round(newValue / effectiveStep) * effectiveStep;
          }

          const updateKey = mapping.subKey === 'scale3D' ? 'midiScale3D' : mapping.subKey;
          onUpdateRegion(region.id, { [updateKey]: newValue } as Partial<CaptureRegion>);
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
        if (mapping.messageType === 'cc' && onCameraRotation && effectiveMin !== undefined && effectiveMax !== undefined) {
          const normalizedValue = message.value / 127;
          const angle = effectiveMin + normalizedValue * (effectiveMax - effectiveMin);
          onCameraRotation(angle);
        }
        break;
      }
      
      case 'modelRotation': {
        // Control per-region model Y rotation via CC (like horizontal mouse drag)
        if (mapping.messageType === 'cc') {
          const targetKey = mapping.targetKey;
          
          // Debug logging for troubleshooting
          console.log(`[MIDI ModelRotation] targetKey=${targetKey}, regions.length=${currentRegions.length}, value=${message.value}`);
          
          // Temporarily disable *camera* auto-rotate while receiving MIDI rotation data.
          // IMPORTANT: In Individual Rotation mode, autoRotateCamera is used as the master
          // clock/enable for per-region spins, so we must NOT toggle it off here.
          const shouldDisableCameraAutoRotate = currentSettings.autoRotateCamera && !currentSettings.individualRotation;
          if (autoRotateWasEnabledRef.current === null && shouldDisableCameraAutoRotate) {
            // First rotation message: store current state and disable auto-rotate
            autoRotateWasEnabledRef.current = true;
            onUpdateSetting('autoRotateCamera', false);
          }
          
          // Clear existing timeout and set a new one
          if (midiRotationTimeoutRef.current !== null) {
            window.clearTimeout(midiRotationTimeoutRef.current);
          }
          midiRotationTimeoutRef.current = window.setTimeout(() => {
            // MIDI rotation data stopped - restore auto-rotate if it was enabled
            if (autoRotateWasEnabledRef.current === true) {
              onUpdateSetting('autoRotateCamera', true);
            }
            autoRotateWasEnabledRef.current = null;
            midiRotationTimeoutRef.current = null;
          }, MIDI_ROTATION_TIMEOUT);
          
          // Back-compat: older saved mappings didn't have `relative`.
          // For rotation controls we default to relative because many encoders report ~64 (+/- a few).
          const isRelative = mapping.relative ?? true;

          if (isRelative) {
            // Relative mode for DJ platters/endless encoders:
            // CC 64 = center/no movement
            // CC > 64 (e.g., 65-70) = clockwise, speed = value - 64
            // CC < 64 (e.g., 58-63) = counter-clockwise, speed = value - 64 (negative)
            // Each incoming CC message adds its offset to the cumulative rotation
            
            const signedOffset = message.value - 64; // -64 to +63 range
            
            // Use sensitivity from settings (default 0.05 radians per CC unit offset)
            const sensitivity = currentSettings.midiRotationSensitivity ?? 0.05;
            const rotationDelta = signedOffset * sensitivity;
            
            if (targetKey === 'all') {
              // Rotate all regions
              currentRegions.forEach((region, idx) => {
                beginTemporaryRegionAutoRotateDisable(region);
                const key = idx.toString();
                const currentRotation = cumulativeRotationRef.current[key] ?? 0;
                const newRotation = currentRotation + rotationDelta;
                cumulativeRotationRef.current[key] = newRotation;
                onUpdateRegion(region.id, { midiRotationY: newRotation });
              });
            } else {
              const regionIndex = parseInt(targetKey, 10);
              const region = currentRegions[regionIndex];
              console.log(`[MIDI ModelRotation] regionIndex=${regionIndex}, region exists=${!!region}, regionId=${region?.id}`);
              if (region) {
                beginTemporaryRegionAutoRotateDisable(region);
                const currentRotation = cumulativeRotationRef.current[targetKey] ?? 0;
                const newRotation = currentRotation + rotationDelta;
                cumulativeRotationRef.current[targetKey] = newRotation;
                console.log(`[MIDI ModelRotation] Setting midiRotationY=${newRotation} on region ${region.id}`);
                onUpdateRegion(region.id, { midiRotationY: newRotation });
              } else {
                console.warn(`[MIDI ModelRotation] No region at index ${regionIndex}! Available regions: ${currentRegions.map((r, i) => `${i}:${r.id}`).join(', ')}`);
              }
            }
          } else {
            // Absolute mode: map CC value directly to angle
            // NOTE: Some older saved mappings may not have min/max; fall back to [-PI, PI].
            const min = effectiveMin ?? -Math.PI;
            const max = effectiveMax ?? Math.PI;
            const normalizedValue = message.value / 127;
            const angle = min + normalizedValue * (max - min);
            
            if (targetKey === 'all') {
              // Rotate all regions
              currentRegions.forEach(region => {
                beginTemporaryRegionAutoRotateDisable(region);
                onUpdateRegion(region.id, { midiRotationY: angle });
              });
            } else {
              const regionIndex = parseInt(targetKey, 10);
              const region = currentRegions[regionIndex];
              if (region) {
                beginTemporaryRegionAutoRotateDisable(region);
                onUpdateRegion(region.id, { midiRotationY: angle });
              }
            }
          }
        }
        break;
      }
      
      case 'favoriteNavigation': {
        // Trigger jump to next/previous favorite model (global - all regions)
        if (onJumpToFavorite) {
          onJumpToFavorite(mapping.targetKey as 'next' | 'previous');
        }
        break;
      }
      
      case 'regionFavoriteNavigation': {
        // Trigger jump to next/previous favorite model for a specific region
        if (onJumpToFavorite && mapping.subKey) {
          const regionIndex = parseInt(mapping.targetKey, 10);
          onJumpToFavorite(mapping.subKey as 'next' | 'previous', regionIndex);
        }
        break;
      }
      
      case 'crossfade': {
        // Crossfade between Region 1 and Region 2 scales
        // MIDI 0-90: Region 1 = 100%, Region 2 fades in from 0% to 100%
        // MIDI 90-127: Region 1 fades out from 100% to 0%, Region 2 = 100%
        if (mapping.messageType === 'cc') {
          const ccValue = message.value; // 0-127
          
          let region1Scale: number;
          let region2Scale: number;
          
          // Region 1: 100% from 0-90, then fades to 0% from 90-127
          if (ccValue <= 90) {
            region1Scale = 1.0;
          } else {
            // Map 90-127 to 1.0-0.0
            region1Scale = 1.0 - ((ccValue - 90) / 37);
          }
          
          // Region 2: fades in from 0% to 100% from 0-40, then 100% from 40-127
          if (ccValue >= 40) {
            region2Scale = 1.0;
          } else {
            // Map 0-40 to 0.0-1.0
            region2Scale = ccValue / 40;
          }
          
          // Clamp values
          region1Scale = Math.max(0, Math.min(1, region1Scale));
          region2Scale = Math.max(0, Math.min(1, region2Scale));
          
          // Apply to regions
          const region1 = currentRegions[0];
          const region2 = currentRegions[1];
          
          if (region1) {
            onUpdateRegion(region1.id, { midiScale3D: region1Scale });
          }
          if (region2) {
            onUpdateRegion(region2.id, { midiScale3D: region2Scale });
          }
        }
        break;
      }
      
      case 'action': {
        // Trigger actions like randomize gradient
        if (mapping.targetKey === 'randomizeGradient' && onRandomizeGradient) {
          onRandomizeGradient();
        }
        break;
      }
      }
    }
  }, [completeLearn, onUpdateSetting, onUpdateRegion, onCameraRotation, onTriggerBounce, onJumpToFavorite, onRandomizeGradient, beginTemporaryRegionAutoRotateDisable]);

  // Cleanup all pending timeouts on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (midiRotationTimeoutRef.current !== null) {
        window.clearTimeout(midiRotationTimeoutRef.current);
        midiRotationTimeoutRef.current = null;
      }
      regionAutoRotateTimeoutRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      regionAutoRotateTimeoutRef.current.clear();
      regionAutoRotateOverrideRef.current.clear();
    };
  }, []);

  return {
    mappings,
    learnMode,
    lastLearnedMessage,
    startLearn,
    cancelLearn,
    removeMapping,
    removeAllMappingsForControl,
    clearAllMappings,
    getMappingForControl,
    getMappingsForControl,
    setMappingRelative,
    handleMidiMessage,
  };
}
