import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useScreenCapture, CaptureRegion } from '@/hooks/useScreenCapture';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useVisualizerSettings, ANIMATION_MODES, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';
import { useRegionRandomizer } from '@/hooks/useRegionRandomizer';
import { usePlayMode } from '@/hooks/usePlayMode';
import { useSettingsStorage } from '@/hooks/useSettingsStorage';
import { useCustomModels } from '@/hooks/useCustomModels';
import { useRemoteModels } from '@/hooks/useRemoteModels';
import { useFavorites } from '@/hooks/useFavorites';
import { useMidi } from '@/hooks/useMidi';
import { useMidiMappings } from '@/hooks/useMidiMappings';
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
  const initialSettings = useMemo(() => {
    if (storage.autoRestore) {
      const lastSession = storage.loadLastSession();
      if (lastSession) return lastSession;
    }
    return undefined;
  }, []); // Only run once on mount
  
  const { settings, updateSetting, loadSettings, resetSettings } = useVisualizerSettings(initialSettings);

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
    const applyModel = (customModelId: string | undefined) => {
      if (regionIndex !== undefined) {
        // Apply to specific region only
        const region = regions[regionIndex];
        if (region) {
          setRegions(prev => prev.map((r, i) => 
            i === regionIndex ? { ...r, customModelId } : r
          ));
        }
      } else {
        // Apply to all regions (global)
        setRegions(prev => prev.map(r => ({ ...r, customModelId })));
      }
    };
    
    if (modelType === 'default') {
      // It's a default shape - update the animation mode
      updateSetting('animationMode3D', nextFavoriteId as any);
      // Clear custom model from regions (or specific region)
      applyModel(undefined);
    } else if (modelType === 'remote') {
      // It's a remote model - need to load it first
      const geometry = await remoteModels.loadModel(nextFavoriteId);
      if (geometry) {
        applyModel(nextFavoriteId);
      }
    } else {
      // It's a custom model (already loaded in IndexedDB)
      applyModel(nextFavoriteId);
    }
  }, [settings.visualizerMode, getCurrentModelId, favorites, updateSetting, remoteModels, regions, toast]);

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
  });
  
  const midi = useMidi(midiMappings.handleMidiMessage);

  // Auto-save session when settings change (debounced)
  useEffect(() => {
    if (storage.autoRestore) {
      const timeout = setTimeout(() => {
        storage.saveLastSession(settings);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [settings, storage.autoRestore]);

  // Preset handlers
  const handleLoadPreset = useCallback((id: string) => {
    const presetData = storage.loadPreset(id);
    if (presetData) {
      loadSettings(presetData.settings);
      if (presetData.favorites) {
        favorites.setFavoritesFromPreset(presetData.favorites);
      }
      toast({ title: "Preset loaded" });
    }
  }, [storage, loadSettings, favorites, toast]);

  const handleSavePreset = useCallback((name: string) => {
    const preset = storage.savePreset(name, settings, favorites.getFavorites());
    toast({ title: `Saved "${preset.name}"` });
    return preset;
  }, [storage, settings, favorites, toast]);

  const handleDeletePreset = useCallback((id: string) => {
    storage.deletePreset(id);
    toast({ title: "Preset deleted" });
  }, [storage, toast]);

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
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        e.stopPropagation();
        setIsControlPanelOpen(prev => !prev);
      }
      
      // 'p' key to toggle Play Mode
      if (e.key === 'p' || e.key === 'P') {
        updateSetting('playMode', { ...settings.playMode, enabled: !settings.playMode.enabled });
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
      
      // < and > keys for favorite navigation
      if (e.key === ',' || e.key === '<') {
        e.preventDefault();
        handleJumpToFavorite('previous');
      }
      if (e.key === '.' || e.key === '>') {
        e.preventDefault();
        handleJumpToFavorite('next');
      }
      // 'f' key to test fade out on first region
      if ((e.key === 'f' || e.key === 'F') && regions.length > 0) {
        const startTime = performance.now();
        const duration = 2000;
        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const opacity = 1 - progress;
          setRegions(prev => prev.map((r, i) => 
            i === 0 ? { ...r, fadeOpacity: opacity } : r
          ));
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
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
  }, [appState, regions, settings, updateSetting, customModels.models, toast, handleJumpToFavorite]);

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
          customModels={customModels.models}
          customModelsLoading={customModels.isLoading}
          customModelsError={customModels.error}
          onAddCustomModel={customModels.addModel}
          onDeleteCustomModel={customModels.deleteModel}
          onClearCustomModelsError={customModels.clearError}
          remoteModels={remoteModels.models}
          remoteModelsLoading={remoteModels.isListLoading}
          remoteModelsError={remoteModels.listError}
          onSelectRemoteModel={async (modelId) => {
            const geometry = await remoteModels.loadModel(modelId);
            if (geometry) {
              // Apply the model to all regions
              setRegions(prev => prev.map(r => ({ ...r, customModelId: modelId })));
            }
          }}
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
          getMidiMappingForControl={midiMappings.getMappingForControl}
          onMidiSetMappingRelative={midiMappings.setMappingRelative}
          // Favorites
          isFavorite={favorites.isFavorite}
          onToggleFavorite={favorites.toggleFavorite}
        />
      )}
    </div>
  );
}
