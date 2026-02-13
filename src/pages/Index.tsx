import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useScreenCapture, CaptureRegion } from '@/hooks/useScreenCapture';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useVisualizerSettings, ANIMATION_MODES, ANIMATION_MODES_3D, type VisualizerSettings } from '@/hooks/useVisualizerSettings';
import { useRegionRandomizer } from '@/hooks/useRegionRandomizer';
import { usePlayMode } from '@/hooks/usePlayMode';
import { useSettingsStorage, SavedRegionSettings, SavedPreset } from '@/hooks/useSettingsStorage';
import { useCustomModels } from '@/hooks/useCustomModels';
import { useRemoteModels } from '@/hooks/useRemoteModels';
import { useFavorites } from '@/hooks/useFavorites';
import { useMidi } from '@/hooks/useMidi';
import { useMidiMappings } from '@/hooks/useMidiMappings';
import { useGradientAnimation } from '@/hooks/useGradientAnimation';
import { Onboarding } from '@/components/visualizer/Onboarding';
import { ScreenPreview } from '@/components/visualizer/ScreenPreview';
import { VisualizerCanvas } from '@/components/visualizer/VisualizerCanvas';
import { VisualizerCanvas3D } from '@/components/visualizer/VisualizerCanvas3D';
import { ControlPanel } from '@/components/visualizer/ControlPanel';
import { useToast } from '@/hooks/use-toast';

type AppState = 'onboarding' | 'selecting' | 'ready' | 'visualizing';

// Keys that are global preferences — preserved when switching presets
const GLOBAL_SETTING_KEYS: (keyof VisualizerSettings)[] = [
  'muteNotifications',
  'bounceStrength',
  'movementSpeed',
  'textureQuality',
  'textureSmoothing',
  'presetTransitionFade',
  'cursorStyle',
  'midiRotationSensitivity',
];

export default function Index() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [regions, setRegions] = useState<CaptureRegion[]>([]);
  const [isRegionConfirmed, setIsRegionConfirmed] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presetSnapshotUrl, setPresetSnapshotUrl] = useState<string | null>(null);
  const [presetSnapshotVisible, setPresetSnapshotVisible] = useState(false);
  const { toast: rawToast } = useToast();
  const screenCapture = useScreenCapture();
  const audioAnalyzer = useAudioAnalyzer();
  const customModels = useCustomModels();
  const remoteModels = useRemoteModels();
  
  // Favorites for 3D models - memoize ID arrays to prevent infinite loops
  const customModelIds = useMemo(() => customModels.models.map(m => m.id), [customModels.models]);
  const remoteModelIds = useMemo(() => remoteModels.models.map(m => m.id), [remoteModels.models]);
  const favorites = useFavorites({
    customModelIds,
    remoteModelIds,
  });
  
  // Settings storage for presets and session restore
  const storage = useSettingsStorage();
  
  // Initialize settings with last session if auto-restore is enabled
  const lastSessionData = useMemo(() => {
    if (storage.autoRestore) {
      return storage.loadLastSession();
    }
    return null;
  }, []); // Only run once on mount
  
  const initialSettings = lastSessionData?.settings;
  
  const { settings, updateSetting, loadSettings, resetSettings } = useVisualizerSettings(initialSettings);

  // Mute-aware toast: suppresses non-destructive notifications when muteNotifications is on
  const toast = useCallback((props: Parameters<typeof rawToast>[0]) => {
    if (settings.muteNotifications && props.variant !== 'destructive') return;
    rawToast(props);
  }, [settings.muteNotifications, rawToast]);

  // Gradient animation for smooth color transitions
  const gradientAnimation = useGradientAnimation({
    currentSettings: settings.gradientSettings,
    onUpdate: (newGradient) => updateSetting('gradientSettings', newGradient),
  });

  // Camera rotation ref for MIDI control (passed to VisualizerCanvas3D)
  const [midiCameraAngle, setMidiCameraAngle] = useState<number | null>(null);

  // Bounce trigger handler
  const handleTriggerBounce = useCallback((regionIndex: number | 'all') => {
    const now = Date.now();
    setRegions(prev => prev.map((r, i) => {
      if (regionIndex === 'all' || i === regionIndex) {
        return { ...r, bounceTime: now };
      }
      return r;
    }));
  }, []);

  // Helper to get current model ID for favorite navigation
  const getCurrentModelId = useCallback((): string | null => {
    // First check if regions have a custom model assigned
    const customModelId = regions[0]?.customModelId;
    if (customModelId) return customModelId;
    // Otherwise return the current default animation mode
    return settings.animationMode3D;
  }, [regions, settings.animationMode3D]);

  // Jump to favorite model (next or previous), optionally for a specific region
  const handleJumpToFavorite = useCallback(async (direction: 'next' | 'previous', regionIndex?: number) => {
    if (settings.visualizerMode !== '3d') {
      toast({ title: "Favorites only work in 3D mode" });
      return;
    }
    
    // For per-region navigation, get the current model for that specific region
    const getCurrentModelForRegion = (idx: number): string | null => {
      const region = regions[idx];
      if (region?.customModelId) return region.customModelId;
      // Check if region has its own animationMode3D override
      if (region?.animationMode3D) return region.animationMode3D;
      return settings.animationMode3D;
    };
    
    const currentModelId = regionIndex !== undefined 
      ? getCurrentModelForRegion(regionIndex)
      : getCurrentModelId();
      
    const nextFavoriteId = direction === 'next' 
      ? favorites.getNextFavorite(currentModelId)
      : favorites.getPreviousFavorite(currentModelId);
    
    if (!nextFavoriteId) {
      toast({ title: "No favorites yet" });
      return;
    }
    
    const modelType = favorites.getModelType(nextFavoriteId);
    
    // Helper to apply model to specific region or all regions
    const applyModelToRegion = (idx: number, customModelId: string | undefined, animationMode3D?: string) => {
      setRegions(prev => prev.map((r, i) => {
        if (i !== idx) return r;
        if (customModelId !== undefined) {
          // Applying a custom/remote model - determine source type
          const modelSource = favorites.getModelType(customModelId) === 'custom' ? 'custom' : 'external';
          return { ...r, customModelId, animationMode3D: undefined, modelSource };
        } else if (animationMode3D) {
          // Applying a default shape to this specific region
          return { ...r, customModelId: undefined, animationMode3D: animationMode3D as any, modelSource: 'default' };
        }
        return r;
      }));
    };
    
    const applyModelGlobally = (customModelId: string | undefined) => {
      setRegions(prev => prev.map(r => ({ ...r, customModelId })));
    };
    
    if (modelType === 'default') {
      // It's a default shape
      if (regionIndex !== undefined) {
        // Per-region: set the region's animationMode3D override, don't change global setting
        applyModelToRegion(regionIndex, undefined, nextFavoriteId);
      } else {
        // Global: update the global setting and clear custom models from all regions
        updateSetting('animationMode3D', nextFavoriteId as any);
        applyModelGlobally(undefined);
      }
    } else if (modelType === 'remote') {
      // It's a remote model - need to load it first
      const geometry = await remoteModels.loadModel(nextFavoriteId);
      if (geometry) {
        if (regionIndex !== undefined) {
          applyModelToRegion(regionIndex, nextFavoriteId);
        } else {
          applyModelGlobally(nextFavoriteId);
        }
      }
    } else {
      // It's a custom model (already loaded in IndexedDB)
      if (regionIndex !== undefined) {
        applyModelToRegion(regionIndex, nextFavoriteId);
      } else {
        applyModelGlobally(nextFavoriteId);
      }
    }
  }, [settings.visualizerMode, getCurrentModelId, favorites, updateSetting, remoteModels, regions, toast]);

  // Ref for preset cycling callback (defined later, after handleLoadPreset)
  const cyclePresetRef = React.useRef<(direction: 'next' | 'previous') => void>(() => {});

  // MIDI control
  const midiMappings = useMidiMappings({
    settings,
    regions,
    onUpdateSetting: updateSetting,
    onUpdateRegion: (regionId, updates) => {
      setRegions(prev => prev.map(r => r.id === regionId ? { ...r, ...updates } : r));
    },
    onCameraRotation: setMidiCameraAngle,
    onTriggerBounce: handleTriggerBounce,
    onJumpToFavorite: handleJumpToFavorite,
    onRandomizeGradient: gradientAnimation.randomize,
    onCyclePreset: (direction) => cyclePresetRef.current(direction),
  });
  
  const midi = useMidi(midiMappings.handleMidiMessage);

  // Helper: extract saveable visual settings from regions
  const extractRegionSettings = useCallback((regs: CaptureRegion[]): SavedRegionSettings[] => {
    return regs.map(r => ({
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      sourceId: r.sourceId,
      animationMode3D: r.animationMode3D,
      animationMode2D: r.animationMode2D,
      customModelId: r.customModelId,
      modelSource: r.modelSource,
      scale3D: r.scale3D,
      position3D: r.position3D,
      scale2D: r.scale2D,
      position2D: r.position2D,
      transparentColor: r.transparentColor,
      transparentThreshold: r.transparentThreshold,
      glowEnabled: r.glowEnabled,
      glowColor: r.glowColor,
      glowAmount: r.glowAmount,
      fullscreenBackground: r.fullscreenBackground,
      randomizeEnabled: r.randomizeEnabled,
      randomizeInterval: r.randomizeInterval,
      transitionType: r.transitionType,
      visible: r.visible,
      autoRotate3D: r.autoRotate3D,
    }));
  }, []);

  // Helper: apply saved region settings onto existing regions by index
  const applyRegionSettings = useCallback((saved: SavedRegionSettings[]) => {
    // Check if saved data includes geometry (new format) by looking at first entry
    const hasGeometry = saved.length > 0 && saved[0].x !== undefined && saved[0].width !== undefined;

    setRegions(prev => {
      // Collect active source IDs for fallback validation
      const activeSourceIds = new Set(prev.map(r => r.sourceId).filter(Boolean));
      const firstSourceId = prev.length > 0 ? prev[0].sourceId : '';

      const resolveSourceId = (savedSourceId: string | undefined, fallback: string): string => {
        if (savedSourceId && activeSourceIds.has(savedSourceId)) return savedSourceId;
        return fallback;
      };

      if (!hasGeometry) {
        // Legacy presets without geometry: apply settings by index, no region count change
        return prev.map((r, i) => {
          if (i >= saved.length) return r;
          const { sourceId: savedSourceId, ...rest } = saved[i];
          return { ...r, ...rest, sourceId: resolveSourceId(savedSourceId, r.sourceId) };
        });
      }

      // New presets with geometry: reconcile region count
      return saved.map((savedSet, i) => {
        const { x, y, width, height, sourceId: savedSourceId, ...visualSettings } = savedSet;

        if (i < prev.length) {
          return {
            ...prev[i],
            x: x ?? prev[i].x,
            y: y ?? prev[i].y,
            width: width ?? prev[i].width,
            height: height ?? prev[i].height,
            sourceId: resolveSourceId(savedSourceId, prev[i].sourceId),
            ...visualSettings,
          };
        }

        // Create new region for extras saved beyond current count
        return {
          id: `region-${Date.now()}-${i}`,
          sourceId: resolveSourceId(savedSourceId, firstSourceId),
          x: x ?? 0,
          y: y ?? 0,
          width: width ?? 200,
          height: height ?? 200,
          ...visualSettings,
        } as CaptureRegion;
      });
    });
  }, []);

  // Auto-save session when settings or regions change (debounced)
  useEffect(() => {
    if (storage.autoRestore) {
      const timeout = setTimeout(() => {
        storage.saveLastSession(
          settings,
          extractRegionSettings(regions),
          midiMappings.getMappings(),
        );
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [settings, regions, storage.autoRestore, midiMappings.mappings]);

  // Restore region settings and MIDI mappings from last session once regions are created
  const sessionRestoredRef = React.useRef(false);
  useEffect(() => {
    if (sessionRestoredRef.current || !lastSessionData || regions.length === 0) return;
    sessionRestoredRef.current = true;
    if (lastSessionData.regionSettings && lastSessionData.regionSettings.length > 0) {
      applyRegionSettings(lastSessionData.regionSettings);
    }
    if (lastSessionData.midiMappings && lastSessionData.midiMappings.length > 0) {
      midiMappings.setMappingsFromPreset(lastSessionData.midiMappings);
    }
  }, [regions.length, lastSessionData]);

  // Stable refs for frequently-changing values — avoids putting them in callback/effect deps
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const regionsRef = useRef(regions);
  regionsRef.current = regions;

  // Preset handlers
  const applyPresetData = useCallback((presetData: ReturnType<typeof storage.loadPreset>) => {
    if (!presetData) return;
    // Merge incoming preset settings but preserve global preference keys
    const mergedSettings: any = { ...presetData.settings };
    const currentSettings = settingsRef.current;
    for (const key of GLOBAL_SETTING_KEYS) {
      mergedSettings[key] = currentSettings[key as keyof typeof currentSettings];
    }
    loadSettings(mergedSettings as VisualizerSettings);
    // Favorites and MIDI mappings are global — do NOT overwrite from preset
    if (presetData.regionSettings && presetData.regionSettings.length > 0) {
      applyRegionSettings(presetData.regionSettings);
    }
  }, [loadSettings, applyRegionSettings]);

  const handleLoadPreset = useCallback((id: string) => {
    const presetData = storage.loadPreset(id);
    if (!presetData) return;

    if (settings.presetTransitionFade && !presetSnapshotVisible) {
      // True crossfade: snapshot current canvas, show overlay, apply new settings, fade overlay out
      // Guard: skip if a transition is already in progress to prevent snapshot accumulation
      const canvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvasEl) {
        try {
          const dataUrl = canvasEl.toDataURL('image/png');
          setPresetSnapshotUrl(dataUrl);
          setPresetSnapshotVisible(true);
        } catch {
          // fallback: apply immediately
        }
      }
      // Apply new preset underneath the snapshot
      applyPresetData(presetData);
      toast({ title: "Lock state loaded" });
      // After two frames (so new content renders), fade the snapshot out
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPresetSnapshotVisible(false);
        });
      });
    } else {
      applyPresetData(presetData);
      toast({ title: "Lock state loaded" });
    }
  }, [storage, settings.presetTransitionFade, applyPresetData, toast]);

  const handleSavePreset = useCallback((name: string) => {
    const preset = storage.savePreset(
      name,
      settings,
      favorites.getFavorites(),
      extractRegionSettings(regions),
      midiMappings.getMappings(),
    );
    if (!preset) {
      toast({ title: 'Limit reached', description: `Maximum of 30 lock states allowed. Delete one to save a new one.`, variant: 'destructive' });
      return null as unknown as SavedPreset;
    }
    toast({ title: `Saved "${preset.name}"` });
    return preset;
  }, [storage, settings, favorites, regions, extractRegionSettings, midiMappings, toast]);

  const handleDeletePreset = useCallback((id: string) => {
    storage.deletePreset(id);
    toast({ title: "Lock state deleted" });
  }, [storage, toast]);

  const handleImportSettings = useCallback((parsed: unknown): boolean => {
    const result = storage.importAllSettings(parsed);
    if (!result) return false;
    loadSettings(result.settings);
    if (result.favorites.length > 0) {
      favorites.setFavoritesFromPreset(result.favorites);
    }
    if (result.midiMappings.length > 0) {
      midiMappings.setMappingsFromPreset(result.midiMappings);
    }
    return true;
  }, [storage, loadSettings, favorites, midiMappings]);

  // Track currently loaded preset index for cycling
  const [currentPresetIndex, setCurrentPresetIndex] = useState<number>(-1);

  // Cycle through presets (next/previous with looping)
  const handleCyclePreset = useCallback((direction: 'next' | 'previous') => {
    if (storage.presets.length === 0) {
      toast({ title: "No saved lock states" });
      return;
    }
    const total = storage.presets.length;
    let nextIndex: number;
    if (currentPresetIndex < 0) {
      nextIndex = direction === 'next' ? 0 : total - 1;
    } else {
      nextIndex = direction === 'next'
        ? (currentPresetIndex + 1) % total
        : (currentPresetIndex - 1 + total) % total;
    }
    setCurrentPresetIndex(nextIndex);
    const preset = storage.presets[nextIndex];
    handleLoadPreset(preset.id);
    toast({ title: `Lock State: ${preset.name}` });
  }, [storage.presets, currentPresetIndex, handleLoadPreset, toast]);

  // Keep ref in sync for MIDI callback
  React.useEffect(() => {
    cyclePresetRef.current = handleCyclePreset;
  }, [handleCyclePreset]);

  const handleStartCapture = useCallback(async () => {
    const source = await screenCapture.addSource();
    if (source) { 
      setAppState('selecting'); 
      toast({ title: "Screen capture started" }); 
    }
    else if (screenCapture.error) {
      toast({ title: "Capture failed", description: screenCapture.error, variant: "destructive" });
    }
  }, [screenCapture, toast]);

  const handleAddSource = useCallback(async () => {
    const source = await screenCapture.addSource();
    if (source) {
      toast({ title: `Added ${source.name}` });
    } else if (screenCapture.error) {
      toast({ title: "Capture failed", description: screenCapture.error, variant: "destructive" });
    }
  }, [screenCapture, toast]);

  const handleAddCameraSource = useCallback(async (deviceId?: string) => {
    try {
      const source = await screenCapture.addCameraSource(deviceId);
      if (source) {
        if (appState === 'onboarding') {
          setAppState('selecting');
        }
        toast({ title: `Added ${source.name}` });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access failed';
      toast({ title: "Camera access failed", description: message, variant: "destructive" });
    }
  }, [screenCapture, toast, appState]);

  const handleRemoveSource = useCallback((sourceId: string) => {
    screenCapture.removeSource(sourceId);
    // Remove regions associated with this source
    setRegions(prev => prev.filter(r => r.sourceId !== sourceId));
    
    // If no sources left, go back to onboarding
    if (screenCapture.sources.length <= 1) {
      setAppState('onboarding');
      setRegions([]);
      setIsRegionConfirmed(false);
    }
  }, [screenCapture]);

  const handleStopCapture = useCallback(() => { 
    screenCapture.stopAllCaptures(); 
    setAppState('onboarding'); 
    setRegions([]); 
    setIsRegionConfirmed(false); 
  }, [screenCapture]);
  
  const handleRegionsChange = useCallback((newRegions: CaptureRegion[]) => setRegions(newRegions), []);
  const handleUpdateRegion = useCallback((regionId: string, updates: Partial<CaptureRegion>) => {
    setRegions(prev => prev.map(r => r.id === regionId ? { ...r, ...updates } : r));
  }, []);
  const handleConfirmRegions = useCallback(() => { 
    if (regions.length > 0) { 
      setIsRegionConfirmed(true); 
      setAppState('ready'); 
      setIsControlPanelOpen(true); 
    } 
  }, [regions]);
  const handleResetRegions = useCallback(() => { setIsRegionConfirmed(false); setAppState('selecting'); }, []);
  const handleToggleMic = useCallback(async () => { if (audioAnalyzer.isActive) audioAnalyzer.stopAudio(); else await audioAnalyzer.startAudio(); }, [audioAnalyzer]);
  const handleStartVisualizer = useCallback(() => { setAppState('visualizing'); setIsControlPanelOpen(false); }, []);
  const handleStopVisualizer = useCallback(() => setAppState('ready'), []);
  const handleToggleFullscreen = useCallback(async () => { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { await document.exitFullscreen(); setIsFullscreen(false); } }, []);

  // Region randomizer hook for auto-cycling modes
  useRegionRandomizer({
    regions,
    onUpdateRegion: handleUpdateRegion,
    visualizerMode: settings.visualizerMode,
    isVisualizerActive: appState === 'visualizing',
  });

  // Play mode hook for cycling through regions
  usePlayMode({
    regions,
    onUpdateRegion: handleUpdateRegion,
    isVisualizerActive: appState === 'visualizing',
    settings: settings.playMode,
  });

  useEffect(() => { const h = () => setIsFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  // Stable refs for callbacks used inside the keyboard handler
  const handleCyclePresetRef = useRef(handleCyclePreset);
  handleCyclePresetRef.current = handleCyclePreset;
  const handleJumpToFavoriteRef = useRef(handleJumpToFavorite);
  handleJumpToFavoriteRef.current = handleJumpToFavorite;
  const updateSettingRef = useRef(updateSetting);
  updateSettingRef.current = updateSetting;
  const gradientAnimationRef = useRef(gradientAnimation);
  gradientAnimationRef.current = gradientAnimation;
  const customModelsRef = useRef(customModels.models);
  customModelsRef.current = customModels.models;
  const remoteModelsRef = useRef(remoteModels);
  remoteModelsRef.current = remoteModels;
  const appStateRef = useRef(appState);
  appStateRef.current = appState;

  useEffect(() => { 
    const h = (e: KeyboardEvent) => { 
      // Skip keyboard shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      
      const currentSettings = settingsRef.current;
      const currentRegions = regionsRef.current;
      const currentAppState = appStateRef.current;
      
      if (e.key === 'Escape' && currentAppState === 'visualizing') setIsControlPanelOpen(true);
      
      // 's' key: In 3D mode with regions, cycle next favorite for Region 1; otherwise toggle settings panel
      if (e.key === 's' || e.key === 'S') {
        if (currentRegions.length > 0 && currentSettings.visualizerMode === '3d') {
          e.preventDefault();
          handleJumpToFavoriteRef.current('next', 0);
        } else {
          e.preventDefault();
          e.stopPropagation();
          setIsControlPanelOpen(prev => !prev);
        }
      }
      
      // 'q' and 'w' cycle through saved presets (previous / next)
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handleCyclePresetRef.current('previous');
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleCyclePresetRef.current('next');
      }
      
      // 'p' key to toggle Play Mode
      if (e.key === 'p' || e.key === 'P') {
        updateSettingRef.current('playMode', { ...currentSettings.playMode, enabled: !currentSettings.playMode.enabled });
      }
      
      // 'g' key to Randomize Gradient
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        gradientAnimationRef.current.randomize();
      }
      
      // 'r' key to toggle Auto-Rotate Camera
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        updateSettingRef.current('autoRotateCamera', !currentSettings.autoRotateCamera);
      }
      
      // Spacebar to toggle Settings Panel
      if (e.key === ' ') {
        e.preventDefault();
        setIsControlPanelOpen(prev => !prev);
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        
        if (currentSettings.playMode.enabled && currentRegions.length > 0) {
          const visibleIndex = currentRegions.findIndex(r => r.visible !== false);
          const nextIndex = (visibleIndex + direction + currentRegions.length) % currentRegions.length;
          setRegions(prev => prev.map((r, i) => ({ ...r, visible: i === nextIndex })));
        } else if (customModelsRef.current.length > 1 && currentSettings.visualizerMode === '3d') {
          const currentModelId = currentRegions[0]?.customModelId;
          const modelIds = customModelsRef.current.map(m => m.id);
          
          let currentIndex = currentModelId ? modelIds.indexOf(currentModelId) : -1;
          if (currentIndex === -1) currentIndex = direction === 1 ? -1 : modelIds.length;
          
          const nextIndex = (currentIndex + direction + modelIds.length) % modelIds.length;
          const nextModelId = modelIds[nextIndex];
          
          setRegions(prev => prev.map((r, i) => i === 0 ? { ...r, customModelId: nextModelId } : r));
        } else if (currentSettings.visualizerMode === '3d') {
          setRegions(prev => prev.map((r, i) => i === 0 ? { ...r, customModelId: undefined } : r));
          const modes = ANIMATION_MODES_3D;
          const currentIndex = modes.indexOf(currentSettings.animationMode3D);
          const nextIndex = (currentIndex + direction + modes.length) % modes.length;
          updateSettingRef.current('animationMode3D', modes[nextIndex]);
        } else {
          const modes = ANIMATION_MODES;
          const currentIndex = modes.indexOf(currentSettings.animationMode);
          const nextIndex = (currentIndex + direction + modes.length) % modes.length;
          updateSettingRef.current('animationMode', modes[nextIndex]);
        }
      }
      
      // Helper function to cycle through ALL models for a specific region
      const cycleAllModelsForRegion = async (regionIndex: number, dir: 1 | -1) => {
        if (currentSettings.visualizerMode !== '3d' || currentRegions.length <= regionIndex) return;
        
        const allModelIds: string[] = [
          ...(ANIMATION_MODES_3D as unknown as string[]),
          ...remoteModelsRef.current.models.map(m => m.id),
          ...customModelsRef.current.map(m => m.id),
        ];
        
        if (allModelIds.length === 0) return;
        
        const region = currentRegions[regionIndex];
        const currentModelId = region?.customModelId || region?.animationMode3D || currentSettings.animationMode3D;
        
        let currentIndex = allModelIds.indexOf(currentModelId);
        if (currentIndex === -1) currentIndex = dir === 1 ? -1 : allModelIds.length;
        
        const nextIndex = (currentIndex + dir + allModelIds.length) % allModelIds.length;
        const nextModelId = allModelIds[nextIndex];
        
        const isDefaultShape = (ANIMATION_MODES_3D as unknown as string[]).includes(nextModelId);
        const isRemoteModel = remoteModelsRef.current.models.some(m => m.id === nextModelId);
        
        if (isDefaultShape) {
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, customModelId: undefined, animationMode3D: nextModelId as any, modelSource: 'default' } : r
          ));
        } else if (isRemoteModel) {
          const geometry = await remoteModelsRef.current.loadModel(nextModelId);
          if (geometry) {
            setRegions(prev => prev.map((r, i) => 
              i === regionIndex ? { ...r, customModelId: nextModelId, animationMode3D: undefined, modelSource: 'external' } : r
            ));
          }
        } else {
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, customModelId: nextModelId, animationMode3D: undefined, modelSource: 'custom' } : r
          ));
        }
      };
      
      // 'z' and 'x' cycle through ALL models for Region 1
      if ((e.key === 'z' || e.key === 'Z') && currentRegions.length > 0 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(0, -1);
      }
      if ((e.key === 'x' || e.key === 'X') && currentRegions.length > 0 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(0, 1);
      }
      
      // '<' and '>' cycle through ALL models for Region 2
      if ((e.key === ',' || e.key === '<') && currentRegions.length > 1 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(1, -1);
      }
      if ((e.key === '.' || e.key === '>') && currentRegions.length > 1 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(1, 1);
      }
      
      // 'a' for Region 1 previous favorite
      if ((e.key === 'a' || e.key === 'A') && currentRegions.length > 0 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        handleJumpToFavoriteRef.current('previous', 0);
      }
      
      // 'k' and 'l' cycle through FAVORITED models for Region 2
      if ((e.key === 'k' || e.key === 'K') && currentRegions.length > 1 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        handleJumpToFavoriteRef.current('previous', 1);
      }
      if ((e.key === 'l' || e.key === 'L') && currentRegions.length > 1 && currentSettings.visualizerMode === '3d') {
        e.preventDefault();
        handleJumpToFavoriteRef.current('next', 1);
      }
      
      // Number keys 1-9 toggle region visibility
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && currentRegions.length >= num) {
        const regionIndex = num - 1;
        const region = currentRegions[regionIndex];
        if (region) {
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, visible: !(r.visible ?? true) } : r
          ));
        }
      }
    }; 
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, []); // Empty deps — handler reads from refs

  // Apply cursor style globally
  useEffect(() => {
    const root = document.documentElement;
    if (settings.cursorStyle === 'dot') {
      root.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\'%3E%3Ccircle cx=\'4\' cy=\'4\' r=\'3\' fill=\'white\' stroke=\'black\' stroke-width=\'0.5\'/%3E%3C/svg%3E") 4 4, auto';
    } else if (settings.cursorStyle === 'none') {
      root.style.cursor = 'none';
    } else {
      root.style.cursor = '';
    }
    return () => { root.style.cursor = ''; };
  }, [settings.cursorStyle]);

  return (
    <div className="min-h-screen bg-background">
      {appState === 'onboarding' && <Onboarding onStartCapture={handleStartCapture} onStartCamera={handleAddCameraSource} />}
      {(appState === 'selecting' || appState === 'ready') && screenCapture.sources.length > 0 && (
        <ScreenPreview 
          sources={screenCapture.sources}
          regions={regions} 
          onRegionsChange={handleRegionsChange} 
          onConfirmRegions={handleConfirmRegions} 
          onResetRegions={handleResetRegions}
          onAddSource={handleAddSource}
          onAddCameraSource={handleAddCameraSource}
          onRemoveSource={handleRemoveSource}
          isRegionConfirmed={isRegionConfirmed}
          availableCameras={screenCapture.availableCameras}
          onRefreshCameras={screenCapture.refreshCameras}
        />
      )}
      {/* Crossfade snapshot overlay */}
      {presetSnapshotUrl && (
        <img
          src={presetSnapshotUrl}
          alt=""
          className="fixed inset-0 w-full h-full pointer-events-none"
          style={{
            zIndex: 50,
            objectFit: 'cover',
            transition: 'opacity 500ms ease-in-out',
            opacity: presetSnapshotVisible ? 1 : 0,
          }}
          onTransitionEnd={() => {
            if (!presetSnapshotVisible) {
              setPresetSnapshotUrl(null);
            }
          }}
        />
      )}
      {appState === 'visualizing' && regions.length > 0 && (
        <div className="fixed inset-0">
          {settings.visualizerMode === '3d' ? (
            <VisualizerCanvas3D 
              regions={regions} 
              settings={settings} 
              audioLevel={audioAnalyzer.audioLevel} 
              isActive={true}
              onUpdateRegion={handleUpdateRegion}
              getVideoElement={screenCapture.getVideoElement}
              getCustomGeometry={(modelId) => {
                // Check remote models first, then custom models
                if (remoteModels.isRemoteModel(modelId)) {
                  return remoteModels.getGeometry(modelId);
                }
                return customModels.getGeometry(modelId);
              }}
              midiCameraAngle={midiCameraAngle}
            />
          ) : (
            <VisualizerCanvas 
              regions={regions} 
              settings={settings} 
              audioLevel={audioAnalyzer.audioLevel} 
              isActive={true}
              getVideoElement={screenCapture.getVideoElement}
            />
          )}
        </div>
      )}
      {(appState === 'ready' || appState === 'visualizing') && (
        <ControlPanel 
          isOpen={isControlPanelOpen} 
          onToggle={() => setIsControlPanelOpen(!isControlPanelOpen)} 
          isCapturing={screenCapture.isCapturing} 
          isMicActive={audioAnalyzer.isActive} 
          isVisualizerActive={appState === 'visualizing'} 
          isFullscreen={isFullscreen} 
          settings={settings} 
          onStartCapture={handleStartCapture} 
          onStopCapture={handleStopCapture} 
          onToggleMic={handleToggleMic} 
          onStartVisualizer={handleStartVisualizer} 
          onStopVisualizer={handleStopVisualizer} 
          onToggleFullscreen={handleToggleFullscreen} 
          onReselectRegion={handleResetRegions} 
          onUpdateSetting={updateSetting} 
          onRandomizeGradient={gradientAnimation.randomize}
          onResetSettings={resetSettings}
          hasRegions={regions.length > 0}
          regionCount={regions.length}
          regions={regions}
          onUpdateRegion={handleUpdateRegion}
          presets={storage.presets}
          autoRestore={storage.autoRestore}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
          onToggleAutoRestore={storage.toggleAutoRestore}
          onExportSettings={storage.exportAllSettings}
          onImportSettings={handleImportSettings}
          currentFavorites={favorites.getFavorites()}
          currentMidiMappings={midiMappings.getMappings()}
          onClearCache={storage.clearCache}
          customModels={customModels.models}
          customModelsLoading={customModels.isLoading}
          customModelsError={customModels.error}
          onAddCustomModel={customModels.addModel}
          onDeleteCustomModel={customModels.deleteModel}
          onClearCustomModelsError={customModels.clearError}
          onSelectCustomModel={(modelId) => {
            // Apply the custom model to Region 1 only
            setRegions(prev => prev.map((r, i) => i === 0 ? { 
              ...r, 
              customModelId: modelId,
              modelSource: 'custom' as const
            } : r));
          }}
          onSelectDefaultShape={(shapeId) => {
            // Apply the default shape to Region 1 only
            setRegions(prev => prev.map((r, i) => i === 0 ? { 
              ...r, 
              animationMode3D: shapeId,
              customModelId: undefined,
              modelSource: 'default' as const
            } : r));
          }}
          remoteModels={remoteModels.models}
          remoteModelsLoading={remoteModels.isListLoading}
          remoteModelsError={remoteModels.listError}
          onSelectRemoteModel={async (modelId) => {
            const geometry = await remoteModels.loadModel(modelId);
            if (geometry) {
              // Apply the model to Region 1 only
              setRegions(prev => prev.map((r, i) => i === 0 ? { 
                ...r, 
                customModelId: modelId,
                modelSource: 'external' as const
              } : r));
            }
          }}
          onLoadRemoteModelGeometry={remoteModels.loadModel}
          getRemoteModelLoadingState={remoteModels.getLoadingState}
          midiSupported={midi.isSupported}
          midiEnabled={midi.isEnabled}
          midiDevices={midi.devices}
          midiActiveDeviceId={midi.activeDeviceId}
          midiLastMessage={midi.lastMessage}
          midiError={midi.error}
          onMidiEnable={midi.enable}
          onMidiDisable={midi.disable}
          onMidiSelectDevice={midi.selectDevice}
          midiLearnMode={midiMappings.learnMode}
          onMidiStartLearn={midiMappings.startLearn}
          onMidiCancelLearn={midiMappings.cancelLearn}
          onMidiRemoveMapping={midiMappings.removeMapping}
          onMidiClearAllMappings={midiMappings.clearAllMappings}
          getMidiMappingsForControl={midiMappings.getMappingsForControl}
          onMidiSetMappingRelative={midiMappings.setMappingRelative}
          // Favorites
          isFavorite={favorites.isFavorite}
          onToggleFavorite={favorites.toggleFavorite}
        />
      )}
    </div>
  );
}
