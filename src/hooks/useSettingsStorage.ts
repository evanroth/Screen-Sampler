import { useState, useEffect, useCallback } from 'react';
import { VisualizerSettings } from './useVisualizerSettings';

const PRESETS_KEY = 'screen-sampler-presets';
const LAST_SESSION_KEY = 'screen-sampler-last-session';
const AUTO_RESTORE_KEY = 'screen-sampler-auto-restore';

export interface SavedPreset {
  id: string;
  name: string;
  settings: VisualizerSettings;
  favorites?: string[]; // Favorited model IDs
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

  const savePreset = useCallback((name: string, settings: VisualizerSettings, favorites?: string[]): SavedPreset => {
    const preset: SavedPreset = {
      id: generateId(),
      name: name.trim() || 'Untitled Preset',
      settings: { ...settings },
      favorites: favorites ? [...favorites] : undefined,
      createdAt: Date.now(),
    };
    setPresets((prev) => [preset, ...prev]);
    return preset;
  }, []);

  const loadPreset = useCallback((id: string): { settings: VisualizerSettings; favorites?: string[] } | null => {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return null;
    return { 
      settings: { ...preset.settings },
      favorites: preset.favorites ? [...preset.favorites] : undefined,
    };
  }, [presets]);

  const deletePreset = useCallback((id: string): void => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const saveLastSession = useCallback((settings: VisualizerSettings): void => {
    try {
      localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save last session:', error);
    }
  }, []);

  const loadLastSession = useCallback((): Partial<VisualizerSettings> | null => {
    try {
      const stored = localStorage.getItem(LAST_SESSION_KEY);
      if (!stored) return null;
      // Return as partial - let useVisualizerSettings merge with current defaults
      return JSON.parse(stored) as Partial<VisualizerSettings>;
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
  };
}
