import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioAnalyzer() {
  const [isActive, setIsActive] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef(0);

  const startAudio = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;

      source.connect(analyzer);
      analyzerRef.current = analyzer;

      setIsActive(true);

      // Start analyzing
      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const analyze = () => {
        if (!analyzerRef.current) return;

        analyzerRef.current.getByteFrequencyData(dataArray);

        // Calculate average level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length / 255;

        // Smooth the level
        smoothedLevelRef.current = smoothedLevelRef.current * 0.85 + average * 0.15;
        setAudioLevel(smoothedLevelRef.current);

        animationRef.current = requestAnimationFrame(analyze);
      };

      analyze();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone';
      setError(message);
      setIsActive(false);
      return false;
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyzerRef.current = null;
    setIsActive(false);
    setAudioLevel(0);
    smoothedLevelRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  return {
    isActive,
    audioLevel,
    error,
    startAudio,
    stopAudio,
  };
}
