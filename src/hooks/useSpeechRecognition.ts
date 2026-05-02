import { useCallback, useEffect, useRef, useState } from 'react';

type SR = any;

declare global {
  interface Window {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  }
}

export const isSpeechRecognitionSupported = () =>
  typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  start: () => void;
  stop: () => void;
}

export const useSpeechRecognition = (onResult: (transcript: string) => void): UseSpeechRecognitionResult => {
  const [supported] = useState(isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    if (!supported) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) onResult(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* ignore */ }
    };
  }, [supported, onResult]);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    try {
      recRef.current.start();
      setListening(true);
    } catch { /* ignore double-start */ }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
};
