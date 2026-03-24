// src/hooks/useVoice.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import { VoiceOptions, VoiceState } from '@/types/voice';

interface UseVoiceReturn {
  isPlaying: boolean;
  isPaused: boolean;
  currentText: string | null;
  queue: string[];
  volume: number;
  speed: number;
  provider: string;
  voice: string;
  play: (text: string, options?: Partial<VoiceOptions>) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  setSpeed: (speed: number) => void;
  setVoice: (voice: string) => void;
  setProvider: (provider: string) => void;
  clearQueue: () => void;
}

export function useVoice(): UseVoiceReturn {
  const [state, setState] = useState<VoiceState>({
    isPlaying: false,
    isPaused: false,
    currentText: null,
    queue: [],
    volume: 1,
    speed: 1,
    provider: 'edge',
    voice: 'female-1'
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentText: null
    }));
  }, []);

  const play = useCallback(async (text: string, options?: Partial<VoiceOptions>) => {
    if (!text) return;
    
    stop();

    try {
      setState(prev => ({ ...prev, isPlaying: true, currentText: text }));
      
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          provider: options?.provider || state.provider,
          voice: options?.voice || state.voice,
          speed: options?.speed || state.speed
        })
      });

      if (!response.ok) throw new Error('Échec de la synthèse');

      const data = await response.json();
      if (!data.audio) throw new Error('Aucun audio reçu');

      // Convert Base64 to Blob and play
      const audioData = `data:audio/${data.format};base64,${data.audio}`;
      const audio = new Audio(audioData);
      audioRef.current = audio;
      audio.volume = state.volume;
      audio.playbackRate = state.speed;

      audio.onended = () => {
        setState(prev => ({ ...prev, isPlaying: false, currentText: null }));
      };

      await audio.play();
    } catch (error) {
      console.error('Erreur TTS:', error);
      setState(prev => ({ ...prev, isPlaying: false, currentText: null }));
    }
  }, [state.provider, state.voice, state.speed, state.volume, stop]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false, isPaused: true }));
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true, isPaused: false }));
    }
  }, []);

  const clearQueue = useCallback(() => {
    // Queue logic not implemented yet
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
    if (audioRef.current) audioRef.current.volume = volume;
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, speed }));
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, []);

  const setVoice = useCallback((voice: string) => {
    setState(prev => ({ ...prev, voice }));
  }, []);

  const setProvider = useCallback((provider: string) => {
    setState(prev => ({ ...prev, provider: provider as any }));
  }, []);

  return {
    isPlaying: state.isPlaying,
    isPaused: state.isPaused,
    currentText: state.currentText,
    queue: state.queue,
    volume: state.volume,
    speed: state.speed,
    provider: state.provider,
    voice: state.voice,
    play,
    pause,
    resume,
    stop,
    setVolume,
    setSpeed,
    setVoice,
    setProvider,
    clearQueue
  };
}
 
