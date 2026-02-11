import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useScreenCapture, CaptureRegion } from '@/hooks/useScreenCapture';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useVisualizerSettings, ANIMATION_MODES, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';
import { useRegionRandomizer } from '@/hooks/useRegionRandomizer';
import { usePlayMode } from '@/hooks/usePlayMode';
import { useSettingsStorage, SavedRegionSettings } from '@/hooks/useSettingsStorage';
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

export default function Index() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [regions, setRegions] = useState<CaptureRegion[]>([]);
  const [isRegionConfirmed, setIsRegionConfirmed] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [presetFadeOpacity, setPresetFadeOpacity] = useState(0); // 0 = transparent, 1 = black overlay
  const { toast } = useToast();
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
          // Applying a custom/remote model
          return { ...r, customModelId, animationMode3D: undefined };
        } else if (animationMode3D) {
          // Applying a default shape to this specific region
          return { ...r, customModelId: undefined, animationMode3D: animationMode3D as any };
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
    setRegions(prev => prev.map((r, i) => {
      if (i >= saved.length) return r;
      return { ...r, ...saved[i] };
    }));
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

  // Preset handlers
  const applyPresetData = useCallback((presetData: ReturnType<typeof storage.loadPreset>) => {
    if (!presetData) return;
    loadSettings(presetData.settings);
    if (presetData.favorites) {
      favorites.setFavoritesFromPreset(presetData.favorites);
    }
    if (presetData.regionSettings && presetData.regionSettings.length > 0) {
      applyRegionSettings(presetData.regionSettings);
    }
    if (presetData.midiMappings && presetData.midiMappings.length > 0) {
      midiMappings.setMappingsFromPreset(presetData.midiMappings);
    }
  }, [loadSettings, favorites, applyRegionSettings, midiMappings]);

  const handleLoadPreset = useCallback((id: string) => {
    const presetData = storage.loadPreset(id);
    if (!presetData) return;

    if (settings.presetTransitionFade) {
      // Fade out over 400ms, apply settings at peak, then fade back in
      setPresetFadeOpacity(1);
      const applyTimer = setTimeout(() => {
        applyPresetData(presetData);
        toast({ title: "Preset loaded" });
        // Small delay so new settings render behind the overlay before fading in
        const fadeInTimer = setTimeout(() => setPresetFadeOpacity(0), 100);
        return () => clearTimeout(fadeInTimer);
      }, 450);
      return () => clearTimeout(applyTimer);
    } else {
      applyPresetData(presetData);
      toast({ title: "Preset loaded" });
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
    toast({ title: `Saved "${preset.name}"` });
    return preset;
  }, [storage, settings, favorites, regions, extractRegionSettings, midiMappings, toast]);

  const handleDeletePreset = useCallback((id: string) => {
    storage.deletePreset(id);
    toast({ title: "Preset deleted" });
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
      toast({ title: "No saved presets" });
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
    toast({ title: `Preset: ${preset.name}` });
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
  useEffect(() => { 
    const h = (e: KeyboardEvent) => { 
      // Skip keyboard shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Escape' && appState === 'visualizing') setIsControlPanelOpen(true);
      
      // 's' key: In 3D mode with regions, cycle next favorite for Region 1; otherwise toggle settings panel
      if (e.key === 's' || e.key === 'S') {
        if (regions.length > 0 && settings.visualizerMode === '3d') {
          e.preventDefault();
          handleJumpToFavorite('next', 0); // Next favorite for Region 1
        } else {
          e.preventDefault();
          e.stopPropagation();
          setIsControlPanelOpen(prev => !prev);
        }
      }
      
      // 'q' and 'w' cycle through saved presets (previous / next)
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handleCyclePreset('previous');
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleCyclePreset('next');
      }
      
      // 'p' key to toggle Play Mode
      if (e.key === 'p' || e.key === 'P') {
        updateSetting('playMode', { ...settings.playMode, enabled: !settings.playMode.enabled });
      }
      
      // 'g' key to Randomize Gradient
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        gradientAnimation.randomize();
      }
      
      // 'r' key to toggle Auto-Rotate Camera
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        updateSetting('autoRotateCamera', !settings.autoRotateCamera);
      }
      
      // Spacebar to toggle Settings Panel
      if (e.key === ' ') {
        e.preventDefault();
        setIsControlPanelOpen(prev => !prev);
      }
      
      // Arrow keys for navigation - prevent default to stop Tabs component from capturing
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        
        if (settings.playMode.enabled && regions.length > 0) {
          // In Play Mode: cycle through regions manually
          const visibleIndex = regions.findIndex(r => r.visible !== false);
          const nextIndex = (visibleIndex + direction + regions.length) % regions.length;
          setRegions(prev => prev.map((r, i) => ({ ...r, visible: i === nextIndex })));
        } else if (customModels.models.length > 1 && settings.visualizerMode === '3d') {
          // Custom models mode: cycle through custom 3D models
          // Find which model is currently assigned to the first region (or none)
          const currentModelId = regions[0]?.customModelId;
          const modelIds = customModels.models.map(m => m.id);
          
          let currentIndex = currentModelId ? modelIds.indexOf(currentModelId) : -1;
          // If no model assigned yet or model not found, start from beginning
          if (currentIndex === -1) currentIndex = direction === 1 ? -1 : modelIds.length;
          
          const nextIndex = (currentIndex + direction + modelIds.length) % modelIds.length;
          const nextModelId = modelIds[nextIndex];
          
          // Apply the model to all regions
          setRegions(prev => prev.map(r => ({ ...r, customModelId: nextModelId })));
        } else if (settings.visualizerMode === '3d') {
          // 3D mode: cycle through 3D animations (default shapes)
          // Clear any custom model so the default shape shows
          setRegions(prev => prev.map(r => ({ ...r, customModelId: undefined })));
          const modes = ANIMATION_MODES_3D;
          const currentIndex = modes.indexOf(settings.animationMode3D);
          const nextIndex = (currentIndex + direction + modes.length) % modes.length;
          updateSetting('animationMode3D', modes[nextIndex]);
        } else {
          // 2D mode: cycle through 2D animations
          const modes = ANIMATION_MODES;
          const currentIndex = modes.indexOf(settings.animationMode);
          const nextIndex = (currentIndex + direction + modes.length) % modes.length;
          updateSetting('animationMode', modes[nextIndex]);
        }
      }
      
      // Helper function to cycle through ALL models for a specific region
      const cycleAllModelsForRegion = async (regionIndex: number, direction: 1 | -1) => {
        if (settings.visualizerMode !== '3d' || regions.length <= regionIndex) return;
        
        // Build complete ordered list: Default shapes, External models, Custom models
        const allModelIds: string[] = [
          ...(ANIMATION_MODES_3D as unknown as string[]),
          ...remoteModels.models.map(m => m.id),
          ...customModels.models.map(m => m.id),
        ];
        
        if (allModelIds.length === 0) return;
        
        // Get current model for this region
        const region = regions[regionIndex];
        const currentModelId = region?.customModelId || region?.animationMode3D || settings.animationMode3D;
        
        let currentIndex = allModelIds.indexOf(currentModelId);
        if (currentIndex === -1) currentIndex = direction === 1 ? -1 : allModelIds.length;
        
        const nextIndex = (currentIndex + direction + allModelIds.length) % allModelIds.length;
        const nextModelId = allModelIds[nextIndex];
        
        // Determine model type and apply appropriately
        const isDefaultShape = (ANIMATION_MODES_3D as unknown as string[]).includes(nextModelId);
        const isRemoteModel = remoteModels.models.some(m => m.id === nextModelId);
        
        if (isDefaultShape) {
          // Apply default shape to this region
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, customModelId: undefined, animationMode3D: nextModelId as any, modelSource: 'default' } : r
          ));
        } else if (isRemoteModel) {
          // Load and apply external model
          const geometry = await remoteModels.loadModel(nextModelId);
          if (geometry) {
            setRegions(prev => prev.map((r, i) => 
              i === regionIndex ? { ...r, customModelId: nextModelId, animationMode3D: undefined, modelSource: 'external' } : r
            ));
          }
        } else {
          // Apply custom model
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, customModelId: nextModelId, animationMode3D: undefined, modelSource: 'custom' } : r
          ));
        }
      };
      
      // 'z' and 'x' cycle through ALL models for Region 1
      if ((e.key === 'z' || e.key === 'Z') && regions.length > 0 && settings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(0, -1); // Previous
      }
      if ((e.key === 'x' || e.key === 'X') && regions.length > 0 && settings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(0, 1); // Next
      }
      
      // '<' and '>' cycle through ALL models for Region 2
      if ((e.key === ',' || e.key === '<') && regions.length > 1 && settings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(1, -1); // Previous
      }
      if ((e.key === '.' || e.key === '>') && regions.length > 1 && settings.visualizerMode === '3d') {
        e.preventDefault();
        cycleAllModelsForRegion(1, 1); // Next
      }
      
      // 'a' and 's' cycle through FAVORITED models for Region 1 (but s is settings toggle, so skip s)
      // Actually user wants a/s for Region 1 favorites, but s is settings. Let me check...
      // Wait, user said 'a' and 's' for Region 1 favorites AND 'k' and 'l' for Region 2 favorites
      // But 's' is already used for settings panel. I'll implement as requested but note the conflict.
      if ((e.key === 'a' || e.key === 'A') && regions.length > 0 && settings.visualizerMode === '3d') {
        e.preventDefault();
        handleJumpToFavorite('previous', 0); // Previous favorite for Region 1
      }
      // Note: 's' is already handled above for settings panel toggle
      
      // 'k' and 'l' cycle through FAVORITED models for Region 2
      if ((e.key === 'k' || e.key === 'K') && regions.length > 1 && settings.visualizerMode === '3d') {
        e.preventDefault();
        handleJumpToFavorite('previous', 1); // Previous favorite for Region 2
      }
      if ((e.key === 'l' || e.key === 'L') && regions.length > 1 && settings.visualizerMode === '3d') {
        e.preventDefault();
        handleJumpToFavorite('next', 1); // Next favorite for Region 2
      }
      
      // Number keys 1-9 toggle region visibility
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && regions.length >= num) {
        const regionIndex = num - 1;
        const region = regions[regionIndex];
        if (region) {
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, visible: !(r.visible ?? true) } : r
          ));
        }
      }
    }; 
    window.addEventListener('keydown', h, true); // Use capture phase to intercept before Select components
    return () => window.removeEventListener('keydown', h, true);
  }, [appState, regions, settings, updateSetting, customModels.models, remoteModels, toast, handleJumpToFavorite, gradientAnimation, handleCyclePreset]);

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
      {appState === 'visualizing' && regions.length > 0 && (
        settings.visualizerMode === '3d' ? (
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
        )
      )}
      {/* Preset transition fade overlay — always mounted for CSS transitions */}
      <div
        className="fixed inset-0 bg-background pointer-events-none z-40"
        style={{
          opacity: presetFadeOpacity,
          transition: 'opacity 400ms ease-in-out',
          visibility: presetFadeOpacity === 0 ? 'hidden' : 'visible',
        }}
      />
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
