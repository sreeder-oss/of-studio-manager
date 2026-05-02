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
  /** Live partial transcript while listening. */
  interim: string;
  start: () => void;
  stop: () => void;
}

interface Options {
  /** Auto-stop (and fire onResult) after this many ms of silence. Default 1500. */
  silenceMs?: number;
}

/**
 * Continuous speech recognition with interim results and auto-stop on silence.
 * onResult fires once with the final concatenated transcript when listening ends.
 */
export const useSpeechRecognition = (
  onResult: (transcript: string) => void,
  options: Options = {}
): UseSpeechRecognitionResult => {
  const { silenceMs = 1500 } = options;
  const [supported] = useState(isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const silenceTimerRef = useRef<number | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!supported) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    const armSilenceTimer = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = window.setTimeout(() => {
        try { rec.stop(); } catch { /* ignore */ }
      }, silenceMs);
    };

    rec.onresult = (e: any) => {
      let interimChunk = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript ?? '';
        if (res.isFinal) finalRef.current += (finalRef.current ? ' ' : '') + t.trim();
        else interimChunk += t;
      }
      setInterim(interimChunk);
      armSilenceTimer();
    };

    rec.onspeechstart = armSilenceTimer;
    rec.onaudiostart = armSilenceTimer;

    rec.onend = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      const finalText = finalRef.current.trim();
      finalRef.current = '';
      setInterim('');
      setListening(false);
      if (finalText) onResultRef.current(finalText);
    };
    rec.onerror = () => {
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      finalRef.current = '';
      setInterim('');
      setListening(false);
    };

    recRef.current = rec;
    return () => {
      try { rec.abort(); } catch { /* ignore */ }
      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    };
  }, [supported, silenceMs]);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    finalRef.current = '';
    setInterim('');
    try {
      recRef.current.start();
      setListening(true);
    } catch { /* ignore double-start */ }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch { /* ignore */ }
  }, []);

  return { supported, listening, interim, start, stop };
};
