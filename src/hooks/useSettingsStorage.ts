import { useState, useEffect, useCallback } from 'react';
import { VisualizerSettings, AnimationMode, AnimationMode3D } from './useVisualizerSettings';
import { MidiMapping } from './useMidiMappings';

const PRESETS_KEY = 'screen-sampler-presets';
const LAST_SESSION_KEY = 'screen-sampler-last-session';
const AUTO_RESTORE_KEY = 'screen-sampler-auto-restore';

/**
 * Per-region visual/effect settings that can be saved and restored.
 * Excludes geometry (x, y, width, height), sourceId, and transient animation state.
 */
export interface SavedRegionSettings {
  // Region geometry (optional for backward compatibility with old presets)
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  animationMode3D?: AnimationMode3D;
  animationMode2D?: AnimationMode;
  customModelId?: string;
  modelSource?: 'default' | 'external' | 'custom';
  scale3D?: number;
  position3D?: { x: number; y: number; z: number };
  scale2D?: number;
  position2D?: { x: number; y: number; z: number };
  transparentColor?: string;
  transparentThreshold?: number;
  glowEnabled?: boolean;
  glowColor?: string;
  glowAmount?: number;
  fullscreenBackground?: boolean;
  randomizeEnabled?: boolean;
  randomizeInterval?: number;
  transitionType?: 'none' | 'fade' | 'zoom';
  visible?: boolean;
  autoRotate3D?: boolean;
}

export interface SavedPreset {
  id: string;
  name: string;
  settings: VisualizerSettings;
  favorites?: string[];
  regionSettings?: SavedRegionSettings[];
  midiMappings?: MidiMapping[];
  createdAt: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getStoredPresets(): SavedPreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as SavedPreset[];
  } catch {
    console.warn('Failed to parse stored presets');
    return [];
  }
}

function savePresetsToStorage(presets: SavedPreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save presets:', error);
  }
}

export function useSettingsStorage() {
  const [presets, setPresets] = useState<SavedPreset[]>(() => getStoredPresets());
  const [autoRestore, setAutoRestore] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(AUTO_RESTORE_KEY);
      // Default to true if no preference has been saved yet
      if (stored === null) return true;
      return stored === 'true';
    } catch {
      return true;
    }
  });

  // Sync presets state to localStorage
  useEffect(() => {
    savePresetsToStorage(presets);
  }, [presets]);

  // Sync autoRestore to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_RESTORE_KEY, autoRestore.toString());
    } catch (error) {
      console.error('Failed to save auto-restore setting:', error);
    }
  }, [autoRestore]);

  const savePreset = useCallback((
    name: string,
    settings: VisualizerSettings,
    favorites?: string[],
    regionSettings?: SavedRegionSettings[],
    midiMappings?: MidiMapping[],
  ): SavedPreset => {
    const preset: SavedPreset = {
      id: generateId(),
      name: name.trim() || 'Untitled Preset',
      settings: { ...settings },
      favorites: favorites ? [...favorites] : undefined,
      regionSettings: regionSettings ? [...regionSettings] : undefined,
      midiMappings: midiMappings ? [...midiMappings] : undefined,
      createdAt: Date.now(),
    };
    setPresets((prev) => [preset, ...prev]);
    return preset;
  }, []);

  const loadPreset = useCallback((id: string): {
    settings: VisualizerSettings;
    favorites?: string[];
    regionSettings?: SavedRegionSettings[];
    midiMappings?: MidiMapping[];
  } | null => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return null;
    return { 
      settings: { ...preset.settings },
      favorites: preset.favorites ? [...preset.favorites] : undefined,
      regionSettings: preset.regionSettings ? [...preset.regionSettings] : undefined,
      midiMappings: preset.midiMappings ? [...preset.midiMappings] : undefined,
    };
  }, [presets]);

  const deletePreset = useCallback((id: string): void => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const saveLastSession = useCallback((
    settings: VisualizerSettings,
    regionSettings?: SavedRegionSettings[],
    midiMappings?: MidiMapping[],
  ): void => {
    try {
      localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({
        settings,
        regionSettings,
        midiMappings,
      }));
    } catch (error) {
      console.error('Failed to save last session:', error);
    }
  }, []);

  const loadLastSession = useCallback((): {
    settings: Partial<VisualizerSettings>;
    regionSettings?: SavedRegionSettings[];
    midiMappings?: MidiMapping[];
  } | null => {
    try {
      const stored = localStorage.getItem(LAST_SESSION_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      // Handle legacy format (plain VisualizerSettings object without wrapper)
      if (parsed && !parsed.settings && parsed.visualizerMode !== undefined) {
        return { settings: parsed as Partial<VisualizerSettings> };
      }
      return parsed;
    } catch {
      console.warn('Failed to parse last session');
      return null;
    }
  }, []);

  const toggleAutoRestore = useCallback((enabled: boolean): void => {
    setAutoRestore(enabled);
  }, []);

  const clearCache = useCallback((): void => {
    try {
      localStorage.removeItem(PRESETS_KEY);
      localStorage.removeItem(LAST_SESSION_KEY);
      localStorage.removeItem(AUTO_RESTORE_KEY);
      localStorage.removeItem('screen-sampler-midi-mappings');
      localStorage.removeItem('screen-sampler-favorites');
      setPresets([]);
      setAutoRestore(false);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, []);

  const importPresets = useCallback((newPresets: SavedPreset[]): void => {
    setPresets(newPresets);
  }, []);

  const exportAllSettings = useCallback((
    currentSettings: VisualizerSettings,
    currentFavorites: string[],
    currentMidiMappings: MidiMapping[],
  ): void => {
    const data = {
      appName: 'Screen Sampler',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: currentSettings,
      presets,
      favorites: currentFavorites,
      midiMappings: currentMidiMappings,
      autoRestore,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `screen-sampler-${date}.ssconfig`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [presets, autoRestore]);

  const importAllSettings = useCallback((json: unknown): {
    settings: VisualizerSettings;
    favorites: string[];
    midiMappings: MidiMapping[];
  } | null => {
    if (!json || typeof json !== 'object') return null;
    const data = json as Record<string, unknown>;
    if (data.appName !== 'Screen Sampler' || typeof data.version !== 'number') return null;

    // Restore presets
    if (Array.isArray(data.presets)) {
      setPresets(data.presets as SavedPreset[]);
    }
    // Restore auto-restore preference
    if (typeof data.autoRestore === 'boolean') {
      setAutoRestore(data.autoRestore);
    }

    return {
      settings: data.settings as VisualizerSettings,
      favorites: Array.isArray(data.favorites) ? data.favorites as string[] : [],
      midiMappings: Array.isArray(data.midiMappings) ? data.midiMappings as MidiMapping[] : [],
    };
  }, []);

  return {
    presets,
    autoRestore,
    savePreset,
    loadPreset,
    deletePreset,
    saveLastSession,
    loadLastSession,
    toggleAutoRestore,
    clearCache,
    importPresets,
    exportAllSettings,
    importAllSettings,
  };
}
