import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useScreenCapture, CaptureRegion } from '@/hooks/useScreenCapture';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { useVisualizerSettings } from '@/hooks/useVisualizerSettings';
import { Onboarding } from '@/components/visualizer/Onboarding';
import { ScreenPreview } from '@/components/visualizer/ScreenPreview';
import { VisualizerCanvas } from '@/components/visualizer/VisualizerCanvas';
import { ControlPanel } from '@/components/visualizer/ControlPanel';
import { useToast } from '@/hooks/use-toast';

type AppState = 'onboarding' | 'selecting' | 'ready' | 'visualizing';

export default function Index() {
  const [appState, setAppState] = useState<AppState>('onboarding');
  const [region, setRegion] = useState<CaptureRegion | null>(null);
  const [isRegionConfirmed, setIsRegionConfirmed] = useState(false);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { toast } = useToast();
  const screenCapture = useScreenCapture();
  const audioAnalyzer = useAudioAnalyzer();
  const { settings, updateSetting, resetSettings } = useVisualizerSettings();

  useEffect(() => {
    if (screenCapture.stream) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = screenCapture.stream;
      video.play().catch(console.error);
      videoRef.current = video;
    } else {
      videoRef.current = null;
    }
  }, [screenCapture.stream]);

  const handleStartCapture = useCallback(async () => {
    const stream = await screenCapture.startCapture();
    if (stream) { setAppState('selecting'); toast({ title: "Screen capture started" }); }
    else if (screenCapture.error) toast({ title: "Capture failed", description: screenCapture.error, variant: "destructive" });
  }, [screenCapture, toast]);

  const handleStopCapture = useCallback(() => { screenCapture.stopCapture(); setAppState('onboarding'); setRegion(null); setIsRegionConfirmed(false); }, [screenCapture]);
  const handleRegionChange = useCallback((r: CaptureRegion) => setRegion(r), []);
  const handleConfirmRegion = useCallback(() => { if (region) { setIsRegionConfirmed(true); setAppState('ready'); setIsControlPanelOpen(true); } }, [region]);
  const handleResetRegion = useCallback(() => { setIsRegionConfirmed(false); setAppState('selecting'); }, []);
  const handleToggleMic = useCallback(async () => { if (audioAnalyzer.isActive) audioAnalyzer.stopAudio(); else await audioAnalyzer.startAudio(); }, [audioAnalyzer]);
  const handleStartVisualizer = useCallback(() => { setAppState('visualizing'); setIsControlPanelOpen(false); }, []);
  const handleStopVisualizer = useCallback(() => setAppState('ready'), []);
  const handleToggleFullscreen = useCallback(async () => { if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); setIsFullscreen(true); } else { await document.exitFullscreen(); setIsFullscreen(false); } }, []);

  useEffect(() => { const h = () => setIsFullscreen(!!document.fullscreenElement); document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && appState === 'visualizing') setIsControlPanelOpen(true); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [appState]);

  return (
    <div className="min-h-screen bg-background">
      {appState === 'onboarding' && <Onboarding onStartCapture={handleStartCapture} />}
      {(appState === 'selecting' || appState === 'ready') && screenCapture.stream && <ScreenPreview stream={screenCapture.stream} region={region} onRegionChange={handleRegionChange} onConfirmRegion={handleConfirmRegion} onResetRegion={handleResetRegion} isRegionConfirmed={isRegionConfirmed} />}
      {appState === 'visualizing' && region && <VisualizerCanvas videoElement={videoRef.current} region={region} settings={settings} audioLevel={audioAnalyzer.audioLevel} isActive={true} />}
      {(appState === 'ready' || appState === 'visualizing') && <ControlPanel isOpen={isControlPanelOpen} onToggle={() => setIsControlPanelOpen(!isControlPanelOpen)} isCapturing={screenCapture.isCapturing} isMicActive={audioAnalyzer.isActive} isVisualizerActive={appState === 'visualizing'} isFullscreen={isFullscreen} settings={settings} onStartCapture={handleStartCapture} onStopCapture={handleStopCapture} onToggleMic={handleToggleMic} onStartVisualizer={handleStartVisualizer} onStopVisualizer={handleStopVisualizer} onToggleFullscreen={handleToggleFullscreen} onReselectRegion={handleResetRegion} onUpdateSetting={updateSetting} onResetSettings={resetSettings} hasRegion={!!region} />}
    </div>
  );
}
