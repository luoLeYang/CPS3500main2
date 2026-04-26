'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';

export default function ScreenReaderControls() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [rate, setRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const isSupported = useMemo(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    []
  );

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getReadableText = () => {
    const main = document.querySelector('main');
    const text = (main?.textContent || document.body.textContent || '')
      .replace(/\s+/g, ' ')
      .trim();

    // Keep speech concise and responsive; users can replay if needed.
    return text.slice(0, 2000);
  };

  const startReading = () => {
    if (!isSupported) return;

    const synth = window.speechSynthesis;

    if (synth.speaking && synth.paused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    synth.cancel();

    const text = getReadableText();
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.lang = /[\u4e00-\u9fff]/.test(text) ? 'zh-CN' : 'en-US';

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onpause = () => setIsPaused(true);
    utterance.onresume = () => setIsPaused(false);
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const pauseReading = () => {
    if (!isSupported) return;
    if (!window.speechSynthesis.speaking) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const stopReading = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  };

  return (
    <div
      className="screen-reader-controls flex items-center gap-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg"
      role="group"
      aria-label="Screen read aloud controls"
    >
      <Volume2 size={18} aria-hidden="true" />

      <button
        onClick={startReading}
        className="sr-btn bg-white text-purple-700 hover:bg-purple-100 px-2 py-1 rounded-md transition"
        aria-label={isPaused ? 'Resume reading' : 'Start reading'}
        title={isPaused ? 'Resume reading' : 'Start reading'}
        disabled={!isSupported}
      >
        <Play size={16} aria-hidden="true" />
      </button>

      <button
        onClick={pauseReading}
        className="sr-btn bg-white text-purple-700 hover:bg-purple-100 px-2 py-1 rounded-md transition"
        aria-label="Pause reading"
        title="Pause reading"
        disabled={!isSupported || !isSpeaking || isPaused}
      >
        <Pause size={16} aria-hidden="true" />
      </button>

      <button
        onClick={stopReading}
        className="sr-btn bg-white text-purple-700 hover:bg-purple-100 px-2 py-1 rounded-md transition"
        aria-label="Stop reading"
        title="Stop reading"
        disabled={!isSupported || (!isSpeaking && !isPaused)}
      >
        <Square size={16} aria-hidden="true" />
      </button>

      <label htmlFor="speech-rate" className="sr-label text-xs">
        Speed
      </label>
      <select
        id="speech-rate"
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
        className="sr-speed text-xs text-purple-700 bg-white rounded px-1 py-1"
        aria-label="Reading speed"
        disabled={!isSupported}
      >
        <option value={0.8}>0.8x</option>
        <option value={1}>1.0x</option>
        <option value={1.2}>1.2x</option>
      </select>

      {!isSupported && <span className="text-xs text-red-100">Speech is not supported in this browser</span>}
    </div>
  );
}
