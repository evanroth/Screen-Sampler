import React, { useState, useCallback, useEffect } from 'react';
import { useScreenCapture, CaptureRegion } from '@/hooks/useScreenCapture';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useVisualizerSettings, ANIMATION_MODES, ANIMATION_MODES_3D } from '@/hooks/useVisualizerSettings';
import { useRegionRandomizer } from '@/hooks/useRegionRandomizer';
import { usePlayMode } from '@/hooks/usePlayMode';
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
  const { settings, updateSetting, resetSettings } = useVisualizerSettings();

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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Escape' && appState === 'visualizing') setIsControlPanelOpen(true);
      if (e.key === 's' || e.key === 'S') {
        setIsControlPanelOpen(prev => !prev);
      }
      
      // 'p' key to toggle Play Mode
      if (e.key === 'p' || e.key === 'P') {
        updateSetting('playMode', { ...settings.playMode, enabled: !settings.playMode.enabled });
      }
      
      // Arrow keys for navigation
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const direction = e.key === 'ArrowRight' ? 1 : -1;
        
        if (settings.playMode.enabled && regions.length > 0) {
          // In Play Mode: cycle through regions manually
          const visibleIndex = regions.findIndex(r => r.visible !== false);
          const nextIndex = (visibleIndex + direction + regions.length) % regions.length;
          setRegions(prev => prev.map((r, i) => ({ ...r, visible: i === nextIndex })));
        } else if (settings.visualizerMode === '3d') {
          // 3D mode: cycle through 3D animations
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
    window.addEventListener('keydown', h); 
    return () => window.removeEventListener('keydown', h); 
  }, [appState, regions, settings, updateSetting]);

  return (
    <div className="min-h-screen bg-background">
      {appState === 'onboarding' && <Onboarding onStartCapture={handleStartCapture} />}
      {(appState === 'selecting' || appState === 'ready') && screenCapture.sources.length > 0 && (
        <ScreenPreview 
          sources={screenCapture.sources}
          regions={regions} 
          onRegionsChange={handleRegionsChange} 
          onConfirmRegions={handleConfirmRegions} 
          onResetRegions={handleResetRegions}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
          isRegionConfirmed={isRegionConfirmed} 
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
        />
      )}
    </div>
  );
}
