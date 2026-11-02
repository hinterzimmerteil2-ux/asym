'use client';
import { useEffect, useState } from 'react';
import { useSettings, setSettings, getSettings } from '../lib/settings';

const WINDOW_MS = 3000;
const LOW_FPS = 28;
const STRIKES = 2;

export default function AutoQuality() {
  const { auto } = useSettings();
  const [note, setNote] = useState(false);
  useEffect(() => {
    if (!auto) return undefined;
    let raf;
    let frames = 0;
    let start = performance.now();
    let last = start;
    let strikes = 0;
    const loop = (now) => {
      if (now - last > 1000 || document.hidden) {
        frames = 0;
        start = now;
        strikes = 0;
      } else {
        frames += 1;
        if (now - start >= WINDOW_MS) {
          const fps = (frames * 1000) / (now - start);
          strikes = fps < LOW_FPS ? strikes + 1 : 0;
          frames = 0;
          start = now;
          const q = getSettings().quality;
          if (strikes >= STRIKES && q > 0.1) {
            strikes = 0;
            setSettings({ quality: Math.max(0.1, Math.round((q - 0.2) * 10) / 10) });
            setNote(true);
          }
        }
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [auto]);
  useEffect(() => {
    if (!note) return undefined;
    const t = setTimeout(() => setNote(false), 4000);
    return () => clearTimeout(t);
  }, [note]);
  if (!note) return null;
  return <div style={{ position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)', zIndex: 45, background: 'rgba(0,0,0,0.75)', color: '#f2d154', fontSize: 12, padding: '6px 12px', borderRadius: 6 }}>Calidad bajada automáticamente por rendimiento</div>;
}
